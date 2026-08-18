const express = require('express');
const router = express.Router();
const { loginCustomer, loginEmployee, registerCustomer, updateProfile, changePassword } = require('../controllers/auth.controller');

// @route   POST /api/v1/auth/login
// @desc    Customer login portal
router.post('/login', loginCustomer);

// @route   POST /api/v1/auth/register
// @desc    Customer registration
router.post('/register', registerCustomer);

// @route   POST /api/v1/auth/employee/login
// @desc    Employee ERP login portal
router.post('/employee/login', loginEmployee);

// @route   PUT /api/v1/auth/profile
// @desc    Update user profile
router.put('/profile', updateProfile);

// @route   PUT /api/v1/auth/change-password
// @desc    Change user password
router.put('/change-password', changePassword);

module.exports = router;
