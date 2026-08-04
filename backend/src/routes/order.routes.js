const express = require('express');
const router = express.Router();
const {
  createOrder,
  getCustomerOrders,
  updateOrderStatus,
  createReturnRequest,
  approveReturnRequest,
  rejectReturnRequest,
  confirmReturnWarehouse,
  processRefund,
  getReturnRequests
} = require('../controllers/order.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { getEmailLogs } = require('../services/emailService');

// @route   POST /api/v1/orders
// @desc    Tạo đơn hàng mới (Khách hàng)
router.post('/', authMiddleware(['CUSTOMER']), createOrder);

// @route   GET /api/v1/orders
// @desc    Xem lịch sử đơn hàng của Khách hàng
router.get('/', authMiddleware(['CUSTOMER']), getCustomerOrders);

// @route   PATCH /api/v1/orders/:id/status
// @desc    Cập nhật trạng thái đơn hàng (Nhân viên Sale / Kho / Delivery / Admin)
router.patch('/:id/status', authMiddleware(['SALES', 'SALES_MANAGER', 'CEO', 'ADMIN', 'CSKH', 'DELIVERY']), updateOrderStatus);

// @route   POST /api/v1/orders/:id/return
// @desc    Khách hàng gửi Yêu cầu Đổi / Trả / Hoàn tiền
router.post('/:id/return', authMiddleware(['CUSTOMER']), createReturnRequest);

// @route   GET /api/v1/orders/returns
// @desc    Lấy danh sách các đơn đổi trả (CSKH / Kho / Kế toán / Manager)
router.get('/returns', authMiddleware(['SALES', 'SALES_MANAGER', 'CEO', 'ADMIN', 'CSKH', 'WAREHOUSE', 'ACCOUNTANT']), getReturnRequests);

// @route   PATCH /api/v1/orders/:id/return/approve
// @desc    CSKH duyệt Yêu cầu Đổi trả (Chuyển sang RETURNING)
router.patch('/:id/return/approve', authMiddleware(['CSKH', 'SALES_MANAGER', 'CEO', 'ADMIN']), approveReturnRequest);

// @route   PATCH /api/v1/orders/:id/return/reject
// @desc    CSKH từ chối Yêu cầu Đổi trả (Trả về DELIVERED)
router.patch('/:id/return/reject', authMiddleware(['CSKH', 'SALES_MANAGER', 'CEO', 'ADMIN']), rejectReturnRequest);

// @route   PATCH /api/v1/orders/:id/return/receive
// @desc    Kho xác nhận nhận kiện hàng hoàn trả & phân loại tồn kho (Chuyển sang RETURNED)
router.patch('/:id/return/receive', authMiddleware(['WAREHOUSE', 'WAREHOUSE_MANAGER', 'CEO', 'ADMIN']), confirmReturnWarehouse);

// @route   POST /api/v1/orders/:id/return/refund
// @desc    Kế toán xác nhận Hoàn tiền / Xuất đổi hàng (Chuyển sang REFUNDED)
router.post('/:id/return/refund', authMiddleware(['ACCOUNTANT', 'CEO', 'ADMIN']), processRefund);

// @route   GET /api/v1/orders/email-logs
// @desc    Xem nhật ký email gửi đơn hàng (CEO / Admin / CSKH)
router.get('/email-logs', authMiddleware(['CEO', 'ADMIN', 'CSKH', 'SALES_MANAGER']), (req, res) => {
  const logs = getEmailLogs();
  res.json({ success: true, data: logs });
});

// @route   POST /api/v1/orders/email-notify
// @desc    Gửi email thông báo đơn hàng / trạng thái / chào mừng cho khách hàng
router.post('/email-notify', async (req, res) => {
  try {
    const { type, toEmail, customerName, orderId, items, totalAmount, paymentMethod, shippingAddress, status, note } = req.body;
    const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail, sendWelcomeEmail } = require('../services/emailService');
    
    if (type === 'WELCOME') {
      await sendWelcomeEmail({ toEmail, customerName });
    } else if (type === 'STATUS_UPDATE') {
      await sendOrderStatusUpdateEmail({ toEmail, customerName, orderId, status, note, items, totalAmount });
    } else {
      await sendOrderConfirmationEmail({ toEmail, customerName, orderId, items, totalAmount, paymentMethod, shippingAddress });
    }
    res.json({ success: true, message: 'Đã gửi email thông báo thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
