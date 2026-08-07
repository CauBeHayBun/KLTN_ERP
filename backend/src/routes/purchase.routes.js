const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  getSuppliers,
  getPurchasingProducts,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  createVendorBill,
  registerPayment,
  validateReceipt
} = require('../controllers/purchase.controller');

// @route   GET /api/v1/purchasing/suppliers
router.get('/suppliers', authMiddleware(), getSuppliers);

// @route   GET /api/v1/purchasing/products
router.get('/products', authMiddleware(), getPurchasingProducts);

// @route   GET /api/v1/purchasing/orders
router.get('/orders', authMiddleware(), getPurchaseOrders);

// @route   POST /api/v1/purchasing/orders
router.post('/orders', authMiddleware(['PURCHASING', 'CEO', 'ADMIN']), createPurchaseOrder);

// @route   PATCH /api/v1/purchasing/orders/:id/status
router.patch('/orders/:id/status', authMiddleware(['PURCHASING', 'CEO', 'ADMIN', 'ACCOUNTANT', 'SUPPLIER']), updatePurchaseOrderStatus);

// @route   POST /api/v1/purchasing/orders/:id/bills
router.post('/orders/:id/bills', authMiddleware(['ACCOUNTANT', 'CEO', 'ADMIN']), createVendorBill);

// @route   POST /api/v1/purchasing/bills/:billId/payments
router.post('/bills/:billId/payments', authMiddleware(['ACCOUNTANT', 'CEO', 'ADMIN']), registerPayment);

// @route   POST /api/v1/purchasing/receipts/:receiptId/validate
router.post('/receipts/:receiptId/validate', authMiddleware(['WAREHOUSE', 'WAREHOUSE_MANAGER', 'CEO', 'ADMIN']), validateReceipt);

module.exports = router;
