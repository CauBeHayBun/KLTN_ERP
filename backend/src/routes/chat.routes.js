const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/chat.controller');

// @route   POST /api/v1/chat
// @desc    Post a message to AI assistant
router.post('/', handleChat);

module.exports = router;
