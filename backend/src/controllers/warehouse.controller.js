const prisma = require('../config/database');

// GET /api/v1/warehouse/receipts
// Lấy danh sách phiếu nhận hàng (GoodsReceipt) kèm thông tin PO, items, product
const getReceipts = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const receipts = await prisma.goodsReceipt.findMany({
      where,
      include: {
        po: {
          include: {
            supplier: true,
            items: {
              include: {
                product: {
                  select: {
                    productId: true,
                    name: true,
                    sku: true,
                    price: true,
                    stockQuantity: true,
                    primaryImage: true
                  }
                }
              }
            }
          }
        },
        warehouse: true
      },
      orderBy: { id: 'desc' }
    });

    res.json({ success: true, data: receipts });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/warehouse/receipts/:id
const getReceiptById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id: parseInt(id) },
      include: {
        po: {
          include: {
            supplier: true,
            items: {
              include: {
                product: {
                  select: {
                    productId: true,
                    name: true,
                    sku: true,
                    price: true,
                    stockQuantity: true,
                    primaryImage: true
                  }
                }
              }
            }
          }
        },
        warehouse: true
      }
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: `Receipt not found: ${id}` });
    }

    res.json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/warehouse/receipts/:id/validate
// Xác nhận nhập kho - cập nhật Inventory, StockMovement, Product.stockQuantity
const validateReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const receivedBy = req.user ? req.user.email || req.user.code || 'Warehouse Staff' : 'Warehouse Staff';

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.findUnique({
        where: { id: parseInt(id) },
        include: { po: { include: { items: true, supplier: true } } }
      });
      if (!receipt) throw new Error(`Receipt not found: ${id}`);
      if (receipt.status === 'DONE') throw new Error('Receipt is already validated.');

      const po = receipt.po;

      // Increment inventory for each item in PO
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
              locationId: 1,
              quantityOnHand: item.quantity,
              quantityReserved: 0,
              reorderPoint: 5
            }
          });
        }

        // Create stock movement record
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            toWarehouseId: receipt.receivedWarehouseId,
            type: 'IN',
            quantity: item.quantity,
            referenceId: receipt.receiptNumber || receipt.id.toString(),
            note: `Nhập kho từ Phiếu Nhận Hàng ${receipt.receiptNumber} (PO: ${po.poNumber})`,
            createdBy: receivedBy
          }
        });

        // Update product stock quantity
        await tx.product.update({
          where: { productId: item.productId },
          data: { stockQuantity: { increment: item.quantity } }
        });
      }

      // Update receipt status to DONE
      const updated = await tx.goodsReceipt.update({
        where: { id: receipt.id },
        data: {
          status: 'DONE',
          receivedBy,
          receivedDate: new Date()
        },
        include: {
          po: {
            include: {
              supplier: true,
              items: { include: { product: true } }
            }
          },
          warehouse: true
        }
      });

      // Check if all receipts and bills for this PO are completed → update PO status to DONE
      const allReceipts = await tx.goodsReceipt.findMany({ where: { poId: po.id } });
      const allBills = await tx.vendorBill.findMany({ where: { poId: po.id } });

      const receiptsDone = allReceipts.length > 0 && allReceipts.every(r => r.status === 'DONE');
      const billsPaid = allBills.length > 0 && allBills.every(b => b.status === 'PAID');

      if (receiptsDone && billsPaid) {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: 'DONE' }
        });
      }

      return updated;
    });

    res.json({
      success: true,
      message: 'Xác nhận nhập kho thành công!',
      data: updatedReceipt
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/warehouse/stock-movements
const getStockMovements = async (req, res, next) => {
  try {
    const { limit = 50, type } = req.query;
    const where = {};
    if (type && type !== 'ALL') {
      where.type = type;
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            productId: true,
            name: true,
            sku: true
          }
        },
        toWarehouse: { select: { id: true, name: true } },
        fromWarehouse: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({ success: true, data: movements });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/warehouse/inventory
const getInventory = async (req, res, next) => {
  try {
    const inventoryData = await prisma.inventory.findMany({
      include: {
        product: {
          select: {
            productId: true,
            name: true,
            sku: true,
            price: true,
            stockQuantity: true,
            primaryImage: true
          }
        },
        warehouse: { select: { id: true, name: true } },
        location: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ success: true, data: inventoryData });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReceipts,
  getReceiptById,
  validateReceipt,
  getStockMovements,
  getInventory
};
