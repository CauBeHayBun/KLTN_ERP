const prisma = require('../config/database');

// GET /api/v1/purchasing/suppliers
const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/purchasing/products
const getPurchasingProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        productId: true,
        name: true,
        sku: true,
        price: true
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/purchasing/orders
const getPurchaseOrders = async (req, res, next) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        },
        receipts: true,
        bills: {
          include: {
            payments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/purchasing/orders
const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplierCode, expectedDeliveryDate, items } = req.body;
    const createdBy = req.user ? req.user.email || req.user.code || 'Staff' : 'Staff';

    if (!supplierCode || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier and items are required' });
    }

    const newPO = await prisma.$transaction(async (tx) => {
      // 1. Check if supplier exists
      const supplier = await tx.supplier.findUnique({
        where: { code: supplierCode }
      });
      if (!supplier) {
        throw new Error(`Supplier not found: ${supplierCode}`);
      }

      // 2. Generate poNumber (PO-YYYYMMDD-XXXX)
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randCode = Math.floor(1000 + Math.random() * 9000);
      const poNumber = `PO-${dateStr}-${randCode}`;

      // 3. Process items and calculate total amount
      let totalAmount = 0;
      const itemsData = [];

      for (const item of items) {
        const targetProdId = String(item.productId || '');
        let prod = await tx.product.findUnique({
          where: { productId: targetProdId }
        });
        if (!prod) {
          prod = await tx.product.findFirst({
            where: {
              OR: [
                { productId: targetProdId },
                { sku: targetProdId },
                { id: isNaN(Number(item.productId)) ? -1 : Number(item.productId) }
              ]
            }
          });
        }
        if (!prod) {
          throw new Error(`Không tìm thấy sản phẩm trong CSDL với mã: ${item.productId}`);
        }

        const quantity = parseInt(item.quantity);
        const unitCost = item.unitCost ? parseFloat(item.unitCost) : 0; // RFQ: NCC sẽ nhập giá sau
        const totalCost = unitCost * quantity;

        totalAmount += totalCost;

        itemsData.push({
          productId: prod.productId,
          quantity,
          unitCost,
          totalCost
        });
      }

      // 4. Create the purchase order (Standard Odoo starts with RFQ)
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierCode,
          status: 'RFQ',
          totalAmount,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          createdBy,
          items: {
            create: itemsData
          }
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      return po;
    });

    res.status(201).json({
      success: true,
      message: 'Purchase Order created successfully (RFQ)',
      data: newPO
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/purchasing/orders/:id/status
const updatePurchaseOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, itemPrices, reason } = req.body;

    const validStatuses = ['RFQ', 'RFQ_SENT', 'QUOTED', 'PO', 'DONE', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updatedPO = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: parseInt(id) },
        include: { items: true }
      });

      if (!po) {
        throw new Error(`Purchase Order not found: ${id}`);
      }

      // Check restriction: ONLY CEO (or ADMIN) can approve QUOTED -> PO
      if (status === 'PO' && po.status === 'QUOTED') {
        const userRole = req.user?.role;
        if (userRole !== 'CEO' && userRole !== 'ADMIN') {
          throw new Error('Chỉ CEO (Ban Giám Đốc) mới có quyền duyệt báo giá mua hàng.');
        }
      }

      // If supplier is quoting prices (RFQ_SENT → QUOTED) or confirming (→ PO), update item prices first
      if (['QUOTED', 'PO'].includes(status) && itemPrices && itemPrices.length > 0) {
        let newTotal = 0;
        for (const priceInfo of itemPrices) {
          const item = po.items.find(i => i.id === priceInfo.itemId);
          if (item && priceInfo.unitCost > 0) {
            const totalCost = parseFloat(priceInfo.unitCost) * item.quantity;
            await tx.purchaseOrderItem.update({
              where: { id: item.id },
              data: {
                unitCost: parseFloat(priceInfo.unitCost),
                totalCost: totalCost
              }
            });
            newTotal += totalCost;
          }
        }

        // Update total amount on the PO
        if (newTotal > 0) {
          await tx.purchaseOrder.update({
            where: { id: parseInt(id) },
            data: { totalAmount: newTotal }
          });
        }
      }

      const updateData = { status };
      if (reason || status === 'CANCELLED') {
        updateData.cancelReason = reason || null;
      }

      const updated = await tx.purchaseOrder.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          supplier: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // If status changes to PO (Approved by CEO / Confirm PO), automatically generate a GoodsReceipt in READY state
      if (status === 'PO' && po.status !== 'PO') {
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randCode = Math.floor(100 + Math.random() * 900);
        const receiptNumber = `WH/IN/${dateStr}/${randCode}`;

        await tx.goodsReceipt.create({
          data: {
            receiptNumber,
            poId: updated.id,
            receivedWarehouseId: 1, // Default warehouse
            status: 'READY',
            note: `Tự động tạo từ Đơn Mua Hàng ${updated.poNumber}`
          }
        });
      }

      return updated;
    });

    res.json({
      success: true,
      message: `Status updated to ${status} successfully`,
      data: updatedPO
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/purchasing/orders/:id/bills
const createVendorBill = async (req, res, next) => {
  try {
    const { id } = req.params; // poId

    const bill = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: parseInt(id) },
        include: { supplier: true }
      });
      if (!po) throw new Error(`Purchase Order not found: ${id}`);
      if (po.status === 'RFQ' || po.status === 'RFQ_SENT') {
        throw new Error('Cannot create bill for unconfirmed PO.');
      }

      // Generate billNumber
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const billNumber = `BILL/${dateStr}/${Math.floor(1000 + Math.random() * 9000)}`;

      const newBill = await tx.vendorBill.create({
        data: {
          poId: po.id,
          supplierCode: po.supplierCode,
          billNumber,
          status: 'POSTED',
          amountTotal: po.totalAmount,
          amountDue: po.totalAmount,
          amountPaid: 0,
          billDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      });
      return newBill;
    });

    res.status(201).json({ success: true, message: 'Vendor Bill created successfully', data: bill });
  } catch (err) {
    next(err);
  }
};

// Helper function to check if PO is fully completed (all receipts DONE and all bills PAID)
const checkAndUpdatePoCompletion = async (tx, poId) => {
  const allReceipts = await tx.goodsReceipt.findMany({ where: { poId } });
  const allBills = await tx.vendorBill.findMany({ where: { poId } });

  const receiptsDone = allReceipts.length > 0 && allReceipts.every(r => r.status === 'DONE');
  const billsPaid = allBills.length > 0 && allBills.every(b => b.status === 'PAID');

  if (receiptsDone && billsPaid) {
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'DONE' }
    });
    return true;
  }
  return false;
};

// POST /api/v1/purchasing/bills/:billId/payments
const registerPayment = async (req, res, next) => {
  try {
    const { billId } = req.params;
    const { paymentMethod, amount } = req.body;

    const payment = await prisma.$transaction(async (tx) => {
      const bill = await tx.vendorBill.findUnique({
        where: { id: parseInt(billId) }
      });
      if (!bill) throw new Error(`Vendor Bill not found: ${billId}`);
      if (bill.status === 'PAID') throw new Error('Bill is already fully paid.');

      const payAmount = amount ? parseFloat(amount) : parseFloat(bill.amountDue);

      const newPayment = await tx.vendorPayment.create({
        data: {
          billId: bill.id,
          amount: payAmount,
          paymentMethod: paymentMethod || 'Bank Transfer',
        }
      });

      const newAmountPaid = parseFloat(bill.amountPaid) + payAmount;
      const newAmountDue = parseFloat(bill.amountTotal) - newAmountPaid;

      await tx.vendorBill.update({
        where: { id: bill.id },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newAmountDue <= 0 ? 'PAID' : 'POSTED'
        }
      });

      // Check if PO is completed
      await checkAndUpdatePoCompletion(tx, bill.poId);

      return newPayment;
    });

    res.status(201).json({ success: true, message: 'Payment registered successfully', data: payment });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/purchasing/receipts/:receiptId/validate
const validateReceipt = async (req, res, next) => {
  try {
    const { receiptId } = req.params;
    const receivedBy = req.user ? req.user.email || req.user.code || 'Warehouse Staff' : 'Warehouse Staff';

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.findUnique({
        where: { id: parseInt(receiptId) },
        include: { po: { include: { items: true } } }
      });
      if (!receipt) throw new Error(`Receipt not found: ${receiptId}`);
      if (receipt.status === 'DONE') throw new Error('Receipt is already validated.');

      const po = receipt.po;

      // Increment inventory
      for (const item of po.items) {
        const inventory = await tx.inventory.findFirst({
          where: { productId: item.productId, warehouseId: receipt.receivedWarehouseId }
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantityOnHand: { increment: item.quantity } }
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              warehouseId: receipt.receivedWarehouseId,
              locationId: 1, // default
              quantityOnHand: item.quantity,
              quantityReserved: 0,
              reorderPoint: 5
            }
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            toWarehouseId: receipt.receivedWarehouseId,
            type: 'IN',
            quantity: item.quantity,
            referenceId: receipt.receiptNumber || receipt.id.toString(),
            note: `Nhập kho từ Phiếu Nhận Hàng ${receipt.receiptNumber}`
          }
        });

        await tx.product.update({
          where: { productId: item.productId },
          data: { stockQuantity: { increment: item.quantity } }
        });
      }

      // Update receipt status
      const updated = await tx.goodsReceipt.update({
        where: { id: receipt.id },
        data: {
          status: 'DONE',
          receivedBy,
          receivedDate: new Date()
        }
      });

      // Check if PO is completed
      await checkAndUpdatePoCompletion(tx, po.id);

      return updated;
    });

    res.json({ success: true, message: 'Goods receipt validated successfully', data: updatedReceipt });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSuppliers,
  getPurchasingProducts,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  createVendorBill,
  registerPayment,
  validateReceipt
};
