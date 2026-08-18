const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided, authorization denied' });
      }

      const token = authHeader.split(' ')[1];

      // Support development / internal mock tokens
      if (token && token.startsWith('mock-token-')) {
        let role = 'WAREHOUSE_MANAGER';
        if (token.includes('ceo')) role = 'CEO';
        else if (token.includes('admin')) role = 'ADMIN';
        else if (token.includes('hr')) role = 'HR';
        else if (token.includes('accountant') || token.includes('accounting')) role = 'ACCOUNTANT';
        else if (token.includes('sales')) role = 'SALES';
        else if (token.includes('assembly')) role = 'ASSEMBLY';
        else if (token.includes('warehouse')) role = 'WAREHOUSE_MANAGER';

        req.user = { id: 999, role, username: 'erp_user' };
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kltn_erp_linh_kien_may_tinh_ai_secret_key_2026');
      req.user = decoded;

      // Role check
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
      }

      next();
    } catch (err) {
      // Fallback for demo mode
      req.user = { id: 999, role: 'WAREHOUSE_MANAGER', username: 'admin' };
      return next();
    }
  };
};

module.exports = { authMiddleware };
