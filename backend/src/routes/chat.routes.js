const express = require('express');
const router = express.Router();
const { handleChat, getCskhSessions, sendCskhCustomerMessage, sendCskhStaffMessage } = require('../controllers/chat.controller');

// @route   POST /api/v1/chat
router.post('/', handleChat);

// CSKH Realtime Sync Endpoints
router.get('/cskh/sessions', getCskhSessions);
router.post('/cskh/send', sendCskhCustomerMessage);
router.post('/cskh/reply', sendCskhStaffMessage);

module.exports = router;
