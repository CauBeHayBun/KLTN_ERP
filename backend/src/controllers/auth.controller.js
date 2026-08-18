const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { sendWelcomeEmail } = require('../services/emailService');

const loginCustomer = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { email: loginIdentifier }
    });

    if (!customer) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, customer.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: customer.customerId, email: customer.email, role: 'CUSTOMER', tier: customer.tier },
      process.env.JWT_SECRET || 'kltn_erp_linh_kien_may_tinh_ai_secret_key_2026',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: customer.customerId,
        name: customer.name,
        email: customer.email,
        tier: customer.tier,
        loyaltyPoints: customer.loyaltyPoints,
        phone: customer.phone,
        address: customer.address,
        city: customer.city
      }
    });
  } catch (err) {
    next(err);
  }
};

const registerCustomer = async (req, res, next) => {
  try {
    const { email, password, name, phone, address, city } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Email, mật khẩu và họ tên là bắt buộc' });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email }
    });

    if (existingCustomer) {
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng bởi tài khoản khác' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const customerId = `CUST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCustomer = await prisma.customer.create({
      data: {
        customerId,
        email,
        passwordHash,
        name,
        phone: phone || null,
        address: address || null,
        city: city || null,
        loyaltyPoints: 0,
        tier: 'BRONZE'
      }
    });

    const token = jwt.sign(
      { id: newCustomer.customerId, email: newCustomer.email, role: 'CUSTOMER', tier: newCustomer.tier },
      process.env.JWT_SECRET || 'kltn_erp_linh_kien_may_tinh_ai_secret_key_2026',
      { expiresIn: '7d' }
    );

    // Gửi email chào mừng thành viên mới qua Gmail SMTP (bất đồng bộ - trả về HTTP response ngay)
    setImmediate(() => {
      sendWelcomeEmail({
        toEmail: newCustomer.email,
        customerName: newCustomer.name
      }).catch(mailErr => {
        console.warn('[Auth] Error sending welcome email on registration:', mailErr.message);
      });
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newCustomer.customerId,
        name: newCustomer.name,
        email: newCustomer.email,
        tier: newCustomer.tier,
        loyaltyPoints: newCustomer.loyaltyPoints,
        phone: newCustomer.phone,
        address: newCustomer.address,
        city: newCustomer.city
      }
    });
  } catch (err) {
    next(err);
  }
};


const loginEmployee = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    let user = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { employeeCode: loginIdentifier }
        ]
      }
    });

    let role = user ? user.role : null;
    let tokenPayload = null;
    let isSupplier = false;

    if (!user) {
      // Check if it is a Supplier
      const supplier = await prisma.supplier.findFirst({
        where: {
          OR: [
            { email: loginIdentifier },
            { code: loginIdentifier }
          ]
        }
      });
      if (supplier) {
        user = supplier;
        role = 'SUPPLIER';
        isSupplier = true;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (isSupplier) {
      tokenPayload = { id: user.code, code: user.code, email: user.email, role: 'SUPPLIER', department: 'SUPPLY' };
    } else {
      tokenPayload = { id: user.id, code: user.employeeCode, email: user.email, role: user.role, department: user.department };
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'kltn_erp_linh_kien_may_tinh_ai_secret_key_2026',
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: isSupplier ? user.code : user.id,
        code: isSupplier ? user.code : user.employeeCode,
        name: isSupplier ? user.name : user.fullName,
        email: user.email,
        department: isSupplier ? 'SUPPLY' : user.department,
        role: role
      }
    });
  } catch (err) {
    next(err);
  }
};



const updateProfile = async (req, res, next) => {
  try {
    const { id, name, email, phone, address, city, gender, role } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (role === 'CUSTOMER' || id.toString().startsWith('CUST-')) {
      const updatedCustomer = await prisma.customer.update({
        where: { customerId: id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email ? { email } : {}),
          ...(phone !== undefined ? { phone: phone || null } : {}),
          ...(address !== undefined ? { address: address || null } : {}),
          ...(city !== undefined ? { city: city || null } : {}),
          ...(gender !== undefined ? { gender: gender || null } : {})
        }
      });
      return res.json({
        success: true,
        user: {
          id: updatedCustomer.customerId,
          name: updatedCustomer.name,
          email: updatedCustomer.email,
          tier: updatedCustomer.tier,
          loyaltyPoints: updatedCustomer.loyaltyPoints,
          phone: updatedCustomer.phone,
          address: updatedCustomer.address,
          city: updatedCustomer.city,
          gender: updatedCustomer.gender,
          role: 'CUSTOMER'
        }
      });
    } else {
      const employeeId = parseInt(id);
      const updatedEmployee = await prisma.employee.update({
        where: { id: employeeId },
        data: {
          fullName: name
        }
      });
      return res.json({
        success: true,
        user: {
          id: updatedEmployee.id,
          code: updatedEmployee.employeeCode,
          name: updatedEmployee.fullName,
          email: updatedEmployee.email,
          department: updatedEmployee.department,
          role: updatedEmployee.role
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { loginCustomer, loginEmployee, registerCustomer, updateProfile };
