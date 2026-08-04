const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Data file paths
const DATA_DIR = path.join(__dirname, '..', '..', 'scraper', 'data');
const PRODUCTS_JSON = path.join(DATA_DIR, 'products_clean.json');
const SUPPLIERS_JSON = path.join(DATA_DIR, 'suppliers.json');
const CUSTOMERS_JSON = path.join(DATA_DIR, 'customers.json');
const ORDERS_JSON = path.join(DATA_DIR, 'orders.json');

async function cleanDatabase() {
  console.log('Cleaning database...');
  // Reverse topological order
  await prisma.payroll.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.assemblyLog.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.bomItem.deleteMany();
  await prisma.bom.deleteMany();
  await prisma.employee.deleteMany();
  
  await prisma.goodsReceipt.deleteMany();
  await prisma.vendorPayment.deleteMany();
  await prisma.vendorBill.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplierEvaluation.deleteMany();
  await prisma.supplierContact.deleteMany();
  await prisma.supplier.deleteMany();
  
  await prisma.stockMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.warehouseLocation.deleteMany();
  await prisma.warehouse.deleteMany();
  
  await prisma.orderPayment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  
  await prisma.customerAddress.deleteMany();
  await prisma.customerSegment.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.customer.deleteMany();
  
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  console.log('Database cleaned.');
}

async function main() {
  if (!fs.existsSync(PRODUCTS_JSON)) {
    console.error('Error: Clean JSON files not found. Run scraper first.');
    process.exit(1);
  }

  // Load inputs
  const productsRaw = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf-8'));
  const suppliers = JSON.parse(fs.readFileSync(SUPPLIERS_JSON, 'utf-8'));
  const customers = JSON.parse(fs.readFileSync(CUSTOMERS_JSON, 'utf-8'));
  const orders = JSON.parse(fs.readFileSync(ORDERS_JSON, 'utf-8'));

  // Filter products to ensure unique product_id, handle, and sku
  const products = [];
  const seenProductIds = new Set();
  const seenHandles = new Set();
  const seenSkus = new Set();
  for (const p of productsRaw) {
    if (seenProductIds.has(p.product_id)) continue;
    if (p.handle && seenHandles.has(p.handle)) continue;
    if (p.sku && seenSkus.has(p.sku)) continue;

    seenProductIds.add(p.product_id);
    if (p.handle) seenHandles.add(p.handle);
    if (p.sku) seenSkus.add(p.sku);
    products.push(p);
  }

  // 3-tier risk management stock strategy allocation:
  // 1,000 SAFE (stock >= 15), 250 WARNING (1 <= stock <= 5), rest OUT_OF_STOCK (stock = 0)
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (i < 1000) {
      p.allocated_stock = 15 + ((i * 7 + 13) % 86);
    } else if (i < 1250) {
      p.allocated_stock = 1 + (i % 5);
    } else {
      p.allocated_stock = 0;
    }
  }

  // Clean
  await cleanDatabase();

  // 1. Categories
  console.log('Seeding Categories...');
  const categoryMap = new Map();
  let catId = 1;
  for (const p of products) {
    const slug = p.category_slug || 'uncategorized';
    const name = p.category_name || 'Khác';
    if (!categoryMap.has(slug)) {
      try {
        const cat = await prisma.category.create({
          data: {
            id: catId,
            name: name,
            slug: slug
          }
        });
        categoryMap.set(slug, cat.id);
        catId++;
      } catch (err) {
        console.error(`Error creating category ${slug}:`, err.message);
      }
    }
  }
  // Reset sequence
  await prisma.$executeRawUnsafe(`SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 1));`);

  // 2. Brands
  console.log('Seeding Brands...');
  const brandMap = new Map();
  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
  for (let i = 0; i < uniqueBrands.length; i++) {
    const bName = uniqueBrands[i];
    const brand = await prisma.brand.create({
      data: {
        id: i + 1,
        name: bName
      }
    });
    brandMap.set(bName, brand.id);
  }
  await prisma.$executeRawUnsafe(`SELECT setval('brands_id_seq', COALESCE((SELECT MAX(id) FROM brands), 1));`);

  // 3. Products & Images
  console.log('Seeding Products & Images...');
  for (const p of products) {
    const catId = categoryMap.get(p.category_slug);
    const bId = brandMap.get(p.brand);

    await prisma.product.create({
      data: {
        productId: p.product_id,
        gearvnId: p.gearvn_id,
        sku: p.sku || null,
        handle: p.handle,
        url: p.url,
        name: p.name,
        categoryId: catId,
        brandId: bId,
        productType: p.product_type || null,
        descriptionText: p.description_text || null,
        price: p.price,
        originalPrice: p.original_price,
        discountPercent: p.discount_percent,
        currency: p.currency || 'VND',
        available: true,
        stockQuantity: p.allocated_stock,
        primaryImage: p.primary_image,
        imageCount: p.image_count || 0,
        warranty: p.warranty || null,
        specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : (p.specs || {}),
        filters: typeof p.filters === 'string' ? JSON.parse(p.filters) : (p.filters || {}),
        status: 'ACTIVE',
        publishedAt: p.published_at ? new Date(p.published_at) : null
      }
    });

    const imgUrls = (p.image_urls || '').split('|').filter(Boolean);
    for (let idx = 0; idx < imgUrls.length; idx++) {
      await prisma.productImage.create({
        data: {
          productId: p.product_id,
          url: imgUrls[idx].trim(),
          isPrimary: idx === 0,
          sortOrder: idx
        }
      });
    }
  }

  // 4. Suppliers
  console.log('Seeding Suppliers...');
  for (const s of suppliers) {
    await prisma.supplier.create({
      data: {
        code: s.code,
        name: s.name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        paymentTerms: s.payment_terms || 'NET 30',
        leadTimeDays: s.lead_time_days || 7,
        status: 'ACTIVE',
        createdAt: new Date(s.created_at)
      }
    });

    await prisma.supplierContact.create({
      data: {
        supplierCode: s.code,
        name: `Đại Diện - ${s.name.replace('Công ty ', '').replace('Cổ phần ', '')}`,
        role: 'Sales Executive',
        phone: s.phone,
        email: s.email
      }
    });
  }

  // Add a default Supplier for quick login demo
  const pwHash = "$2a$10$IyfWpe/v6d3OiOESKMx74eJNfiLnHx0T2oPH.isjyKrGgqXVHFRSG"; // password "123456"
  await prisma.supplier.create({
    data: {
      code: 'supplier',
      name: 'Nhà Cung Cấp ABC',
      email: 'supplier@kltn-erp.vn',
      phone: '0987654321',
      address: '789 Đường Láng, Đống Đa, Hà Nội',
      paymentTerms: 'NET 30',
      leadTimeDays: 5,
      status: 'ACTIVE',
      passwordHash: pwHash,
      createdAt: new Date()
    }
  });

  await prisma.supplierContact.create({
    data: {
      supplierCode: 'supplier',
      name: 'Nguyễn Văn Cung cấp',
      role: 'Sales Manager',
      phone: '0987654321',
      email: 'supplier@kltn-erp.vn'
    }
  });

  // 5. Customers & Addresses
  console.log('Seeding Customers...');
  for (const c of customers) {
    // mock password "123456"
    const pwHash = "$2a$10$IyfWpe/v6d3OiOESKMx74eJNfiLnHx0T2oPH.isjyKrGgqXVHFRSG";
    await prisma.customer.create({
      data: {
        customerId: c.customer_id,
        email: c.email,
        passwordHash: pwHash,
        name: c.name,
        gender: c.gender,
        phone: c.phone || null,
        address: c.address || null,
        city: c.city || null,
        loyaltyPoints: 0,
        tier: c.tier,
        status: 'ACTIVE',
        createdAt: new Date(c.created_at)
      }
    });

    await prisma.customerAddress.create({
      data: {
        customerId: c.customer_id,
        recipientName: c.name,
        recipientPhone: c.phone,
        addressLine: c.address,
        city: c.city,
        isDefault: true
      }
    });
  }

  // Add a default B2B customer for quick login demo
  await prisma.customer.create({
    data: {
      customerId: 'customer_b2b',
      email: 'customer_b2b@kltn-erp.vn',
      passwordHash: "$2b$12$e/zQ.gE4rBfP5yZ9C7gC1uIeK8H5QGf9RrnqV6G3l2N7Jz7J2X6rG",
      name: 'Khách Doanh Nghiệp B2B',
      gender: 'MALE',
      phone: '0123456789',
      address: 'Phường Bến Nghé, Quận 1, TP. HCM',
      city: 'Hồ Chí Minh',
      loyaltyPoints: 0,
      tier: 'B2B',
      status: 'ACTIVE',
      createdAt: new Date()
    }
  });

  await prisma.customerAddress.create({
    data: {
      customerId: 'customer_b2b',
      recipientName: 'Khách Doanh Nghiệp B2B',
      recipientPhone: '0123456789',
      addressLine: 'Phường Bến Nghé, Quận 1, TP. HCM',
      city: 'Hồ Chí Minh',
      isDefault: true
    }
  });

  // 6. Employees (HRM)
  console.log('Seeding Employees...');
  const employeesData = [
    { id: 1, code: 'EMP-0001', name: 'Nguyễn Văn Trưởng', email: 'truong.nv@kltn-erp.vn', dept: 'Tech', role: 'MANAGER', salary: 25000000 },
    { id: 2, code: 'EMP-0002', name: 'Trần Thị Huệ', email: 'hue.tt@kltn-erp.vn', dept: 'Sales', role: 'STAFF', salary: 12000000 },
    { id: 3, code: 'EMP-0003', name: 'Phạm Văn Minh', email: 'minh.pv@kltn-erp.vn', dept: 'Warehouse', role: 'STAFF', salary: 10000000 },
    { id: 4, code: 'EMP-0004', name: 'Lê Văn Hùng', email: 'hung.lv@kltn-erp.vn', dept: 'Assembly', role: 'STAFF', salary: 11000000 },
    { id: 5, code: 'EMP-0005', name: 'Hoàng Văn Tuấn', email: 'tuan.hv@kltn-erp.vn', dept: 'HRM', role: 'MANAGER', salary: 18000000 },
    // Demo accounts for thesis presentation
    { id: 6, code: 'ceo', name: 'Nguyễn Văn A (CEO)', email: 'ceo@kltn-erp.vn', dept: 'Management', role: 'CEO', salary: 50000000 },
    { id: 7, code: 'admin', name: 'Quản Trị Viên', email: 'admin@kltn-erp.vn', dept: 'IT', role: 'ADMIN', salary: 30000000 },
    { id: 8, code: 'sales_manager', name: 'Quản Lý Bán Hàng', email: 'sales_manager@kltn-erp.vn', dept: 'Sales', role: 'SALES_MANAGER', salary: 20000000 },
    { id: 9, code: 'sales', name: 'Trần Thị B (Bán Hàng)', email: 'sales@kltn-erp.vn', dept: 'Sales', role: 'SALES', salary: 12000000 },
    { id: 10, code: 'warehouse_manager', name: 'Quản Lý Kho', email: 'warehouse_manager@kltn-erp.vn', dept: 'Warehouse', role: 'WAREHOUSE_MANAGER', salary: 20000000 },
    { id: 11, code: 'warehouse', name: 'Lê Văn C (Thủ Kho)', email: 'warehouse@kltn-erp.vn', dept: 'Warehouse', role: 'WAREHOUSE', salary: 10000000 },
    { id: 12, code: 'purchasing', name: 'Nhân Viên Mua Hàng', email: 'purchasing@kltn-erp.vn', dept: 'Purchasing', role: 'PURCHASING', salary: 12000000 },
    { id: 13, code: 'assembly', name: 'Phạm Văn D (Kỹ Thuật)', email: 'assembly@kltn-erp.vn', dept: 'Assembly', role: 'ASSEMBLY', salary: 11000000 },
    { id: 14, code: 'hr', name: 'Nguyễn Nhân Sự (HR)', email: 'hr@kltn-erp.vn', dept: 'HRM', role: 'HR', salary: 18000000 },
    { id: 15, code: 'accounting', name: 'Trần Kế Toán (Kế Toán)', email: 'accounting@kltn-erp.vn', dept: 'Finance', role: 'ACCOUNTANT', salary: 18000000 }
  ];
  for (const emp of employeesData) {
    await prisma.employee.create({
      data: {
        id: emp.id,
        employeeCode: emp.code,
        fullName: emp.name,
        email: emp.email,
        passwordHash: pwHash,
        department: emp.dept,
        role: emp.role,
        baseSalary: emp.salary,
        status: 'ACTIVE'
      }
    });
  }
  await prisma.$executeRawUnsafe(`SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));`);

  // 7. Orders & Items
  console.log('Seeding Orders, Payments & Reviews...');
  let bomId = 1;
  let woId = 1;
  for (const o of orders) {
    o.items = o.items.filter(item => seenProductIds.has(item.product_id));
    if (o.items.length === 0) continue;

    const isPcBuild = o.items.length >= 5 && o.items.some(i => i.category_name === 'CPU - Bộ vi xử lý');

    const createdOrder = await prisma.order.create({
      data: {
        orderId: o.order_id,
        customerId: o.customer_id,
        subtotal: o.subtotal,
        discount: o.discount,
        shippingFee: o.shipping_fee,
        totalAmount: o.total_amount,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        status: o.status,
        notes: o.notes || null,
        shippingAddress: o.address,
        shippingCity: o.city,
        createdAt: new Date(o.created_at),
        confirmedAt: o.confirmed_at ? new Date(o.confirmed_at) : null,
        shippedAt: o.shipped_at ? new Date(o.shipped_at) : null,
        deliveredAt: o.delivered_at ? new Date(o.delivered_at) : null,
        cancelledAt: o.cancelled_at ? new Date(o.cancelled_at) : null
      }
    });

    // Order status histories
    await prisma.orderStatusHistory.create({
      data: {
        orderId: o.order_id,
        status: 'PENDING',
        note: 'Khởi tạo đơn hàng từ giỏ hàng',
        changedBy: 'Khách hàng',
        timestamp: new Date(o.created_at)
      }
    });
    if (o.confirmed_at) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: o.order_id,
          status: 'CONFIRMED',
          note: 'Đã xác nhận đơn hàng',
          changedBy: 'Nhân viên bán hàng',
          timestamp: new Date(o.confirmed_at)
        }
      });
    }
    if (o.shipped_at) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: o.order_id,
          status: 'SHIPPED',
          note: 'Đã xuất kho bàn giao giao vận',
          changedBy: 'Thủ kho',
          timestamp: new Date(o.shipped_at)
        }
      });
    }
    if (o.delivered_at) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: o.order_id,
          status: 'DELIVERED',
          note: 'Giao hàng thành công',
          changedBy: 'Shipper',
          timestamp: new Date(o.delivered_at)
        }
      });
    }
    if (o.cancelled_at) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: o.order_id,
          status: 'CANCELLED',
          note: 'Khách yêu cầu hủy đơn',
          changedBy: 'Hệ thống',
          timestamp: new Date(o.cancelled_at)
        }
      });
    }

    // Items, payments, reviews
    for (const item of o.items) {
      await prisma.orderItem.create({
        data: {
          orderItemId: item.order_item_id,
          orderId: o.order_id,
          productId: item.product_id,
          sku: item.sku || null,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          originalPrice: item.original_price,
          totalPrice: item.total_price
        }
      });

      const parsedRating = parseInt(item.rating);
      if (item.rating !== undefined && item.rating !== '' && !isNaN(parsedRating)) {
        await prisma.productReview.create({
          data: {
            productId: item.product_id,
            customerId: o.customer_id,
            rating: parsedRating,
            comment: item.review || null,
            createdAt: o.delivered_at ? new Date(o.delivered_at) : new Date(o.created_at)
          }
        });
      }
    }

    const payStatus = o.payment_status === 'PAID' ? 'SUCCESS' : (o.payment_status === 'CANCELLED' ? 'FAILED' : 'PENDING');
    const txId = o.payment_method !== 'COD' ? `TX-${o.order_id.split('-')?.[2] || 'GEN'}-${Math.floor(1000 + Math.random()*9000)}` : null;
    await prisma.orderPayment.create({
      data: {
        orderId: o.order_id,
        method: o.payment_method,
        amount: o.total_amount,
        transactionId: txId,
        status: payStatus,
        createdAt: new Date(o.created_at)
      }
    });

    // 8. BOM & Assembly
    if (isPcBuild) {
      const cpuName = o.items.find(i => i.category_name === 'CPU - Bộ vi xử lý')?.name || 'Linh Kiện';
      const bom = await prisma.bom.create({
        data: {
          id: bomId,
          name: `Cấu hình PC lắp ráp theo đơn ${o.order_id} - ${cpuName.substring(0, 40)}`,
          description: 'Định mức linh kiện lắp ráp ráp PC tùy chọn của khách hàng',
          version: '1.0',
          isActive: true
        }
      });

      for (const item of o.items) {
        await prisma.bomItem.create({
          data: {
            bomId: bom.id,
            productId: item.product_id,
            quantity: item.quantity
          }
        });
      }

      const woStatus = o.status === 'DELIVERED' ? 'COMPLETED' : (o.status === 'PENDING' ? 'PENDING' : 'ASSEMBLING');
      const started = o.confirmed_at || o.created_at;
      const completed = o.shipped_at || o.delivered_at;

      await prisma.workOrder.create({
        data: {
          id: woId,
          orderId: o.order_id,
          employeeId: 4, // Lê Văn Hùng
          bomId: bom.id,
          status: woStatus,
          startedAt: new Date(started),
          completedAt: completed ? new Date(completed) : null,
          createdAt: new Date(o.created_at)
        }
      });

      // Logs
      await prisma.assemblyLog.create({
        data: {
          workOrderId: woId,
          stepName: 'Nhận yêu cầu lắp ráp',
          status: 'SUCCESS',
          note: 'Đã tiếp nhận linh kiện từ kho hàng',
          timestamp: new Date(started)
        }
      });
      if (['ASSEMBLING', 'COMPLETED'].includes(woStatus)) {
        await prisma.assemblyLog.create({
          data: {
            workOrderId: woId,
            stepName: 'Lắp ráp cơ khí',
            status: 'SUCCESS',
            note: 'Đã lắp CPU, RAM, Mainboard và nguồn vào vỏ case',
            timestamp: new Date(started)
          }
        });
      }
      if (woStatus === 'COMPLETED') {
        await prisma.assemblyLog.create({
          data: {
            workOrderId: woId,
            stepName: 'Kiểm thử & Benchmarking',
            status: 'SUCCESS',
            note: 'Nhiệt độ ổn định, cài hệ điều hành thành công',
            timestamp: new Date(completed)
          }
        });
      }

      bomId++;
      woId++;
    }
  }
  await prisma.$executeRawUnsafe(`SELECT setval('boms_id_seq', COALESCE((SELECT MAX(id) FROM boms), 1));`);
  await prisma.$executeRawUnsafe(`SELECT setval('work_orders_id_seq', COALESCE((SELECT MAX(id) FROM work_orders), 1));`);
  await prisma.$executeRawUnsafe(`SELECT setval('assembly_logs_id_seq', COALESCE((SELECT MAX(id) FROM assembly_logs), 1));`);

  // 9. Warehouses & Stock
  console.log('Seeding Warehouses & Stock...');
  await prisma.warehouse.create({ data: { id: 1, name: 'Kho Tổng TP.Hồ Chí Minh', address: '175 Nguyễn Thị Minh Khai, Quận 1, TP. HCM', isActive: true } });
  await prisma.warehouse.create({ data: { id: 2, name: 'Kho Chi Nhánh Hà Nội', address: '33 Phố Thái Hà, Quận Đống Đa, Hà Nội', isActive: true } });
  await prisma.$executeRawUnsafe(`SELECT setval('warehouses_id_seq', COALESCE((SELECT MAX(id) FROM warehouses), 1));`);

  await prisma.warehouseLocation.create({ data: { id: 1, warehouseId: 1, zone: 'ZONE-A', shelf: 'SHELF-01', bin: 'BIN-01', capacity: 200 } });
  await prisma.warehouseLocation.create({ data: { id: 2, warehouseId: 1, zone: 'ZONE-A', shelf: 'SHELF-01', bin: 'BIN-02', capacity: 200 } });
  await prisma.warehouseLocation.create({ data: { id: 3, warehouseId: 2, zone: 'ZONE-B', shelf: 'SHELF-01', bin: 'BIN-01', capacity: 200 } });
  await prisma.$executeRawUnsafe(`SELECT setval('warehouse_locations_id_seq', COALESCE((SELECT MAX(id) FROM warehouse_locations), 1));`);

  for (const p of products) {
    const stockTotal = p.allocated_stock;
    const stockWh1 = Math.floor(stockTotal * 0.7);
    const stockWh2 = stockTotal - stockWh1;

    await prisma.inventory.create({
      data: {
        productId: p.product_id,
        warehouseId: 1,
        locationId: 1,
        quantityOnHand: stockWh1,
        quantityReserved: 0,
        reorderPoint: 5
      }
    });

    await prisma.inventory.create({
      data: {
        productId: p.product_id,
        warehouseId: 2,
        locationId: 3,
        quantityOnHand: stockWh2,
        quantityReserved: 0,
        reorderPoint: 5
      }
    });
  }

  // 9.5 Purchase Orders (POs, RFQs, Goods Receipts, Vendor Bills)
  console.log('Seeding Purchase Orders, RFQs & Goods Receipts...');
  const poStatuses = ['RFQ', 'QUOTED', 'APPROVED', 'PO', 'DONE', 'DONE', 'DONE', 'CANCELLED'];
  const poProdPool = products.filter(p => p.allocated_stock <= 5);
  const supplierCodesList = suppliers.map(s => s.code).concat(['supplier']);

  for (let i = 0; i < 16; i++) {
    const supCode = supplierCodesList[i % supplierCodesList.length];
    const status = poStatuses[i % poStatuses.length];
    const poNumber = `PO-202606-${1000 + i}`;
    
    const poItemsCount = 2 + (i % 3);
    const itemSlice = poProdPool.slice((i * 3) % poProdPool.length, ((i * 3) % poProdPool.length) + poItemsCount);

    let poTotal = 0;
    const itemsData = itemSlice.map(p => {
      const qty = 10 + ((i * 5) % 40);
      const unitCost = Math.round(Number(p.price || 500000) * 0.75);
      const totalCost = qty * unitCost;
      poTotal += totalCost;
      return {
        productId: p.product_id,
        quantity: qty,
        unitCost: unitCost,
        totalCost: totalCost
      };
    });

    const poDate = new Date(2026, 5, 1 + (i % 15));
    const createdPo = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierCode: supCode,
        status,
        totalAmount: poTotal,
        expectedDeliveryDate: new Date(2026, 5, 10 + (i % 15)),
        createdBy: 'purchasing@kltn-erp.vn',
        createdAt: poDate,
        items: {
          create: itemsData
        }
      }
    });

    if (status === 'DONE') {
      await prisma.goodsReceipt.create({
        data: {
          receiptNumber: `GRN-202606-${1000 + i}`,
          poId: createdPo.id,
          receivedWarehouseId: 1,
          receivedBy: 'warehouse@kltn-erp.vn',
          receivedDate: new Date(2026, 5, 8 + (i % 15)),
          status: 'DONE',
          note: 'Nhập kho thành công theo đơn PO'
        }
      });

      const vb = await prisma.vendorBill.create({
        data: {
          billNumber: `BILL-202606-${1000 + i}`,
          poId: createdPo.id,
          supplierCode: supCode,
          status: 'PAID',
          amountTotal: poTotal,
          amountPaid: poTotal,
          amountDue: 0,
          billDate: new Date(2026, 5, 8 + (i % 15)),
          dueDate: new Date(2026, 6, 8 + (i % 15))
        }
      });

      await prisma.vendorPayment.create({
        data: {
          billId: vb.id,
          amount: poTotal,
          paymentDate: new Date(2026, 5, 10 + (i % 15)),
          paymentMethod: 'BANK_TRANSFER',
          reference: `BANK-REF-${10000 + i}`
        }
      });
    }
  }

  // 10. Attendances & Payrolls
  console.log('Seeding Attendances & Payrolls...');
  const today = new Date(2026, 5, 19); // 19th June 2026
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const curDate = new Date(today);
    curDate.setDate(today.getDate() - dayOffset);
    
    // skip Sundays
    if (curDate.getDay() === 0) continue;

    for (const emp of employeesData) {
      const checkIn = Math.random() > 0.9 ? '08:15' : '08:00';
      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date: curDate,
          checkIn,
          checkOut: '17:30',
          overtimeHours: 0,
          status: 'PRESENT'
        }
      });
    }
  }

  const periods = ['Tháng 03/2026', 'Tháng 04/2026', 'Tháng 05/2026'];
  for (const prd of periods) {
    for (const emp of employeesData) {
      const allowance = Math.floor(emp.salary * 0.05);
      const bonus = Math.random() > 0.7 ? Math.floor(emp.salary * 0.1) : 0;
      const deduction = Math.floor(emp.salary * 0.02);
      const net = emp.salary + allowance + bonus - deduction;

      const [month, year] = prd.replace('Tháng ', '').split('/');
      const dateStr = `${year}-${month}-05`;
      await prisma.payroll.create({
        data: {
          employeeId: emp.id,
          period: prd,
          baseSalary: emp.salary,
          allowances: allowance,
          bonuses: bonus,
          deductions: deduction,
          netSalary: net,
          status: 'PAID',
          paidAt: new Date(dateStr)
        }
      });
    }
  }

  console.log('\n==================================================');
  console.log('  SUCCESSFULLY SEEDED DATABASE USING PRISMA CLIENT!');
  console.log('==================================================\n');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
