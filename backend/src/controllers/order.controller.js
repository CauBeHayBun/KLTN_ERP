const prisma = require('../config/database');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../services/emailService');

/**
 * 1. KHÁCH HÀNG TẠO ĐƠN HÀNG MỚI (Storefront Checkout - M_KHDH)
 */
const createOrder = async (req, res, next) => {
  try {
    const customerId = req.user.id; // Lấy từ authMiddleware JWT
    const { items, paymentMethod, shippingAddress, shippingCity, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng không được để trống' });
    }

    // Thực hiện giao dịch cơ sở dữ liệu (Database Transaction)
    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let discount = 0;
      const orderItemsData = [];
      let hasShortage = false;
      const shortageItems = [];

      for (const cartItem of items) {
        const targetProdId = String(cartItem.productId);
        const prod = await tx.product.findUnique({
          where: { productId: targetProdId }
        });

        if (!prod) {
          throw new Error(`Không tìm thấy sản phẩm với mã: ${cartItem.productId}`);
        }

        const qty = parseInt(cartItem.quantity);
        const itemPrice = parseFloat(prod.price);
        const itemOrigPrice = parseFloat(prod.originalPrice || prod.price);

        const itemSubtotal = itemPrice * qty;
        const itemDiscount = (itemOrigPrice - itemPrice) * qty;

        subtotal += itemSubtotal;
        discount += itemDiscount > 0 ? itemDiscount : 0;

        // Kiểm tra tồn kho sản phẩm
        if (prod.stockQuantity < qty) {
          hasShortage = true;
          shortageItems.push(prod.name);
        }

        const randSuffix = Math.floor(Math.random() * 1000);
        orderItemsData.push({
          orderItemId: `ORI-${Date.now()}-${randSuffix}`,
          productId: prod.productId,
          sku: prod.sku,
          name: prod.name,
          quantity: qty,
          price: itemPrice,
          originalPrice: itemOrigPrice,
          totalPrice: itemSubtotal
        });
      }

      // Tính toán chiết khấu hạng thành viên
      const customer = await tx.customer.findUnique({
        where: { customerId }
      });

      let tierDiscountPercent = 0;
      if (customer && customer.tier) {
        const tier = customer.tier.toUpperCase();
        if (tier === 'SILVER') tierDiscountPercent = 0.02;
        else if (tier === 'GOLD') tierDiscountPercent = 0.05;
        else if (tier === 'PLATINUM') tierDiscountPercent = 0.10;
      }

      const memberDiscount = Math.round(subtotal * tierDiscountPercent);
      const discountedSubtotal = subtotal - memberDiscount;

      // Phí vận chuyển: Miễn phí cho đơn >= 5.000.000 VNĐ
      const shippingFee = discountedSubtotal >= 5000000 ? 0 : 30000;
      const totalAmount = discountedSubtotal + shippingFee;

      // Sinh mã đơn hàng dạng ORD-YYMMDD-XXXX
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randCode = Math.floor(1000 + Math.random() * 9000);
      const ordCode = req.body.orderId || `ORD-${dateStr}-${randCode}`;

      // Xác định trạng thái ban đầu dựa vào phương thức thanh toán & tồn kho
      let initialStatus = 'PENDING';
      if (['BANK_TRANSFER', 'ONLINE_GATEWAY'].includes(paymentMethod) && req.body.isPaid !== true) {
        initialStatus = 'WAITING_PAYMENT';
      } else if (hasShortage) {
        initialStatus = 'AWAITING_STOCK';
      } else {
        initialStatus = 'CONFIRMED';
      }

      // Tạo đơn hàng trên DB
      const newOrder = await tx.order.create({
        data: {
          orderId: ordCode,
          customerId,
          subtotal,
          discount: discount + memberDiscount,
          shippingFee,
          totalAmount,
          paymentMethod,
          paymentStatus: initialStatus === 'WAITING_PAYMENT' ? 'PENDING' : 'PAID',
          shippingAddress: shippingAddress || 'Chưa cung cấp',
          shippingCity: shippingCity || 'TP. Hồ Chí Minh',
          notes,
          status: initialStatus,
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: true
        }
      });

      // Nếu đơn đủ hàng & được tự động duyệt CONFIRMED -> Trừ tồn kho & ghi log xuất kho
      if (initialStatus === 'CONFIRMED') {
        for (const cartItem of items) {
          const itemProdId = String(cartItem.productId);
          const qty = parseInt(cartItem.quantity);

          // 1. Trừ số lượng sản phẩm (Product stockQuantity)
          await tx.product.update({
            where: { productId: itemProdId },
            data: {
              stockQuantity: {
                decrement: qty
              }
            }
          });

          // 2. Trừ tồn kho vật lý tại kho chính (Warehouse 1)
          const inventory = await tx.inventory.findFirst({
            where: {
              productId: itemProdId,
              warehouseId: 1
            }
          });

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantityOnHand: {
                  decrement: qty
                }
              }
            });
          }

          // 3. Ghi nhật ký biến động kho (StockMovement OUT)
          await tx.stockMovement.create({
            data: {
              productId: itemProdId,
              fromWarehouseId: 1,
              type: 'OUT',
              quantity: qty,
              referenceId: ordCode,
              note: `Xuất kho tự động cho Đơn Hàng ${ordCode}`
            }
          });
        }
      }

      // Tích lũy điểm thành viên (10.000 VNĐ = 1 điểm)
      const pointsEarned = Math.floor(parseFloat(totalAmount) / 10000);
      const updatedCustomer = await tx.customer.update({
        where: { customerId },
        data: {
          loyaltyPoints: {
            increment: pointsEarned
          }
        }
      });

      // Tự động nâng hạng thành viên nếu đủ điểm
      let nextTier = 'BRONZE';
      const totalPoints = updatedCustomer.loyaltyPoints;
      if (totalPoints >= 10000) nextTier = 'PLATINUM';
      else if (totalPoints >= 5000) nextTier = 'GOLD';
      else if (totalPoints >= 1000) nextTier = 'SILVER';

      if (nextTier !== updatedCustomer.tier) {
        await tx.customer.update({
          where: { customerId },
          data: { tier: nextTier }
        });
      }

      // Ghi nhật ký lịch sử trạng thái đơn hàng (OrderStatusHistory) bằng Tiếng Việt
      let historyNote = '';
      if (initialStatus === 'WAITING_PAYMENT') {
        historyNote = 'Đơn hàng vừa được khởi tạo, đang chờ khách hàng hoàn tất thanh toán chuyển khoản/online.';
      } else if (initialStatus === 'AWAITING_STOCK') {
        historyNote = `Hệ thống tạm giữ đơn hàng (Chờ nhập hàng: Thiếu tồn kho cho sản phẩm: ${shortageItems.join(', ')}).`;
      } else if (initialStatus === 'CONFIRMED') {
        historyNote = `Tự động duyệt thành công (Đủ tồn kho). Trừ kho tự động & tích lũy +${pointsEarned} điểm thành viên.`;
      } else {
        historyNote = `Đơn hàng khởi tạo thành công ở trạng thái PENDING. Tích lũy +${pointsEarned} điểm thành viên.`;
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: ordCode,
          status: initialStatus,
          note: historyNote,
          changedBy: 'Hệ thống'
        }
      });

      return newOrder;
    });

    // Gửi email xác nhận đơn hàng cho khách hàng
    const customer = await prisma.customer.findUnique({ where: { customerId: req.user.id } });
    if (customer?.email) {
      sendOrderConfirmationEmail({
        toEmail: customer.email,
        customerName: customer.name,
        orderId: order.orderId,
        items: order.items,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        shippingAddress: order.shippingAddress
      }).catch(err => console.warn('[Email] Lỗi gửi email xác nhận:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công!',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. LẤY DANH SÁCH ĐƠN HÀNG CỦA KHÁCH HÀNG
 */
const getCustomerOrders = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        items: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (Dành cho Nhân viên Sale / Kho / Delivery / Admin)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const changedBy = req.user?.email || req.user?.name || req.user?.code || 'Nhân viên';

    const VALID_STATUSES = [
      'WAITING_PAYMENT',
      'PENDING',
      'CONFIRMED',
      'PACKED',
      'PROCESSING',
      'AWAITING_STOCK',
      'READY_TO_SHIP',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'FAILED_DELIVERY',
      'RETURN_REQUESTED',
      'RETURNING',
      'RETURNED',
      'REFUNDED'
    ];

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ' });
    }

    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { orderId: id },
        include: { items: true }
      });

      if (!existingOrder) {
        throw new Error('Không tìm thấy đơn hàng trong hệ thống');
      }

      // Xử lý trừ kho khi chuyển sang trạng thái đã duyệt (CONFIRMED / PACKED / PROCESSING / READY_TO_SHIP)
      const isApprovedStatus = ['CONFIRMED', 'PACKED', 'PROCESSING', 'READY_TO_SHIP'].includes(status);
      const isPriorPending = ['PENDING', 'AWAITING_STOCK', 'WAITING_PAYMENT'].includes(existingOrder.status);

      if (isApprovedStatus && isPriorPending) {
        const existingMovement = await tx.stockMovement.findFirst({
          where: {
            referenceId: id,
            type: 'OUT'
          }
        });

        if (!existingMovement) {
          for (const item of existingOrder.items) {
            // Trừ số lượng tồn sản phẩm
            await tx.product.update({
              where: { productId: item.productId },
              data: {
                stockQuantity: {
                  decrement: item.quantity
                }
              }
            });

            // Trừ tồn kho vật lý tại kho chính (Warehouse 1)
            const inventory = await tx.inventory.findFirst({
              where: {
                productId: item.productId,
                warehouseId: 1
              }
            });

            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantityOnHand: {
                    decrement: item.quantity
                  }
                }
              });
            }

            // Ghi log xuất kho
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                fromWarehouseId: 1,
                type: 'OUT',
                quantity: item.quantity,
                referenceId: id,
                note: `Xuất kho khi duyệt Đơn Hàng ${id}`
              }
            });
          }
        }
      }

      // Xử lý hoàn kho khi đơn bị HỦY (CANCELLED) hoặc GIAO THẤT BẠI (FAILED_DELIVERY)
      if (['CANCELLED', 'FAILED_DELIVERY'].includes(status)) {
        const existingOutMovement = await tx.stockMovement.findFirst({
          where: {
            referenceId: id,
            type: 'OUT'
          }
        });

        const existingInMovement = await tx.stockMovement.findFirst({
          where: {
            referenceId: id,
            type: 'IN',
            note: {
              contains: 'Hoàn kho'
            }
          }
        });

        if (existingOutMovement && !existingInMovement) {
          for (const item of existingOrder.items) {
            // Cộng trả số lượng tồn sản phẩm
            await tx.product.update({
              where: { productId: item.productId },
              data: {
                stockQuantity: {
                  increment: item.quantity
                }
              }
            });

            // Cộng trả tồn kho vật lý tại Kho 1
            const inventory = await tx.inventory.findFirst({
              where: {
                productId: item.productId,
                warehouseId: 1
              }
            });

            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantityOnHand: {
                    increment: item.quantity
                  }
                }
              });
            }

            // Ghi nhật ký nhập hoàn kho
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                toWarehouseId: 1,
                type: 'IN',
                quantity: item.quantity,
                referenceId: id,
                note: `Hoàn kho tự động cho Đơn Hàng ${id} (${status === 'CANCELLED' ? 'Đã Hủy' : 'Giao Thất Bại'})`
              }
            });
          }
        }
      }

      // Cập nhật trạng thái đơn hàng
      const updatedOrder = await tx.order.update({
        where: { orderId: id },
        data: {
          status,
          ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
          ...(status === 'SHIPPED' ? { shippedAt: new Date() } : {}),
          ...(status === 'CONFIRMED' ? { confirmedAt: new Date() } : {}),
          ...(status === 'CANCELLED' ? { cancelledAt: new Date() } : {})
        }
      });

      // Ghi nhật ký lịch sử trạng thái
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          note: note || `Cập nhật trạng thái sang ${status} bởi ${changedBy}`,
          changedBy
        }
      });

      return updatedOrder;
    });

    // Gửi email cập nhật trạng thái cho khách hàng
    const updatedOrderFull = await prisma.order.findUnique({
      where: { orderId: id },
      include: { customer: true, items: true }
    });
    if (updatedOrderFull?.customer?.email) {
      sendOrderStatusUpdateEmail({
        toEmail: updatedOrderFull.customer.email,
        customerName: updatedOrderFull.customer.name,
        orderId: id,
        status,
        note: note || null,
        items: updatedOrderFull.items,
        totalAmount: updatedOrderFull.totalAmount,
        proofPhoto: req.body.proofPhoto || req.body.proofUrl || null,
        receiverNote: req.body.receiverNote || null
      }).catch(err => console.warn('[Email] Lỗi gửi email cập nhật trạng thái:', err.message));
    }

    res.json({
      success: true,
      message: `Cập nhật trạng thái đơn hàng thành ${status} thành công`,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. KHÁCH HÀNG TẠO YÊU CẦU ĐỔI / TRẢ / HOÀN TIỀN (M_DHBH)
 */
const createReturnRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;
    const { reason, returnType, shippingBackMethod } = req.body;

    const order = await prisma.order.findFirst({
      where: { orderId: id, customerId }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (!['DELIVERED', 'COMPLETED', 'SHIPPED'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Chỉ được tạo yêu cầu đổi trả cho đơn hàng đã nhận/giao thành công' });
    }

    // Cập nhật trạng thái đơn sang RETURN_REQUESTED
    await prisma.order.update({
      where: { orderId: id },
      data: { status: 'RETURN_REQUESTED' }
    });

    const loaiYeuCauText = returnType === 'EXCHANGE' ? 'Đổi sản phẩm' : 'Hoàn tiền';
    const phuongThucGuiText = shippingBackMethod === 'POST' ? 'Tự gửi Bưu điện' : 'Shipper đến lấy';

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: 'RETURN_REQUESTED',
        note: `Khách hàng gửi yêu cầu ${loaiYeuCauText} (${phuongThucGuiText}). Lý do: ${reason || 'Không ghi'}`,
        changedBy: 'Khách hàng'
      }
    });

    res.json({
      success: true,
      message: 'Yêu cầu đổi/trả đã được gửi thành công. Nhân viên CSKH sẽ liên hệ hỗ trợ trong vòng 24 giờ.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. CSKH DUYỆT YÊU CẦU ĐỔI TRẢ (M_DHBH)
 */
const approveReturnRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const changedBy = req.user?.email || req.user?.name || 'CSKH';

    const order = await prisma.order.findUnique({ where: { orderId: id } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    await prisma.order.update({
      where: { orderId: id },
      data: { status: 'RETURNING' }
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: 'RETURNING',
        note: note || `CSKH đã duyệt yêu cầu đổi trả. Chờ thu hồi hàng về kho. (Duyệt bởi ${changedBy})`,
        changedBy
      }
    });

    res.json({
      success: true,
      message: 'Đã duyệt yêu cầu đổi trả. Đơn hàng chuyển sang trạng thái đang thu hồi (RETURNING).'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. CSKH TỪ CHỐI YÊU CẦU ĐỔI TRẢ (M_DHBH)
 */
const rejectReturnRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const changedBy = req.user?.email || req.user?.name || 'CSKH';

    const order = await prisma.order.findUnique({ where: { orderId: id } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    // Trả trạng thái đơn về DELIVERED
    await prisma.order.update({
      where: { orderId: id },
      data: { status: 'DELIVERED' }
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: 'DELIVERED',
        note: `CSKH từ chối yêu cầu đổi trả. Lý do: ${reason || 'Không đủ điều kiện bảo hành/đổi trả'}. (Xử lý bởi ${changedBy})`,
        changedBy
      }
    });

    res.json({
      success: true,
      message: 'Đã từ chối yêu cầu đổi trả. Đơn hàng quay về trạng thái Đã giao hàng (DELIVERED).'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. KHO XÁC NHẬN NHẬN HÀNG HOÀN TRẢ & KIỂM ĐỊNH TỒN KHO (M_DHBH)
 */
const confirmReturnWarehouse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isSellable, note } = req.body; // isSellable = true (hàng lành nhập kho bán lẻ), false (hàng lỗi nhập kho RMA)
    const changedBy = req.user?.email || req.user?.name || 'Nhân viên Kho';

    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { orderId: id },
        include: { items: true }
      });

      if (!existingOrder) {
        throw new Error('Không tìm thấy đơn hàng');
      }

      // Nếu sản phẩm còn nguyên tem / lành 100% -> Nhập lại Kho bán lẻ chính
      if (isSellable !== false) {
        for (const item of existingOrder.items) {
          await tx.product.update({
            where: { productId: item.productId },
            data: { stockQuantity: { increment: item.quantity } }
          });

          const inventory = await tx.inventory.findFirst({
            where: { productId: item.productId, warehouseId: 1 }
          });

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantityOnHand: { increment: item.quantity } }
            });
          }

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              toWarehouseId: 1,
              type: 'IN',
              quantity: item.quantity,
              referenceId: id,
              note: `Nhập lại kho bán lẻ từ Đơn Hoàn Trả ${id}`
            }
          });
        }
      } else {
        // Hàng bị lỗi/hỏng -> Nhập log kho cách ly / RMA
        for (const item of existingOrder.items) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              fromWarehouseId: 1,
              type: 'IN',
              quantity: item.quantity,
              referenceId: id,
              note: `Nhập Kho Cách Ly / Hàng Lỗi RMA từ Đơn Hoàn Trả ${id}`
            }
          });
        }
      }

      const updatedOrder = await tx.order.update({
        where: { orderId: id },
        data: { status: 'RETURNED' }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'RETURNED',
          note: note || `Kho xác nhận đã nhận hàng hoàn. Phân loại: ${isSellable !== false ? 'Hàng nguyên tem (Cộng tồn bán lẻ)' : 'Hàng lỗi/hỏng (Nhập kho RMA)'}. (Xử lý bởi ${changedBy})`,
          changedBy
        }
      });

      return updatedOrder;
    });

    res.json({
      success: true,
      message: 'Kho đã xác nhận nhận hàng hoàn trả và cập nhật tồn kho thành công',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. KẾ TOÁN XỬ LÝ HOÀN TIỀN / HOÀN TẤT ĐỔI TRẢ (M_DHBH)
 */
const processRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { refundMethod, refundAmount, note } = req.body;
    const changedBy = req.user?.email || req.user?.name || 'Kế toán';

    const order = await prisma.order.findUnique({
      where: { orderId: id }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const updatedOrder = await prisma.order.update({
      where: { orderId: id },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED'
      }
    });

    const amountFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(refundAmount || order.totalAmount);

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: 'REFUNDED',
        note: note || `Kế toán đã hoàn tất hoàn tiền (${amountFormatted}) qua ${refundMethod || 'Chuyển khoản'}. Ghi nhận CHI sổ cái. (Xử lý bởi ${changedBy})`,
        changedBy
      }
    });

    res.json({
      success: true,
      message: 'Xử lý hoàn tiền thành công! Đơn hàng chuyển sang trạng thái REFUNDED.',
      data: updatedOrder
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 9. LẤY DANH SÁCH YÊU CẦU ĐỔI TRẢ (Dành cho CSKH / Kho / Kế toán)
 */
const getReturnRequests = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['RETURN_REQUESTED', 'RETURNING', 'RETURNED', 'REFUNDED']
        }
      },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        items: true,
        statusHistory: { orderBy: { timestamp: 'desc' } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 10. KHÁCH HÀNG CẬP NHẬT THÔNG TIN ĐƠN HÀNG KHI ĐANG PENDING (M_DHBH)
 */
const updateOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;
    const { customerName, phone, shippingAddress, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { orderId: id },
      include: { customer: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (order.customerId !== customerId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa đơn hàng này' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể chỉnh sửa thông tin khi đơn hàng đang ở trạng thái Chờ xác nhận (PENDING)' });
    }

    // Update Customer profile if name or phone changed
    if ((customerName && customerName !== order.customer?.name) || (phone && phone !== order.customer?.phone)) {
      await prisma.customer.update({
        where: { customerId },
        data: {
          name: customerName || order.customer?.name,
          phone: phone || order.customer?.phone
        }
      });
    }

    // Update Order details
    const updatedOrder = await prisma.order.update({
      where: { orderId: id },
      data: {
        shippingAddress: shippingAddress || order.shippingAddress,
        notes: notes !== undefined ? notes : order.notes
      },
      include: { customer: true, items: true, statusHistory: { orderBy: { timestamp: 'desc' } } }
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: order.status,
        note: 'Khách hàng tự cập nhật thông tin giao hàng (SĐT/Địa chỉ/Ghi chú)',
        changedBy: 'Khách hàng'
      }
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin giao hàng thành công',
      data: updatedOrder
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getCustomerOrders,
  updateOrderStatus,
  createReturnRequest,
  approveReturnRequest,
  rejectReturnRequest,
  confirmReturnWarehouse,
  processRefund,
  getReturnRequests,
  updateOrderDetails
};
