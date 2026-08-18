import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import { SUPPLIER_DEMO_ACCOUNTS } from '../config/supplierDemoAccounts';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Mock credentials for thesis presentation / standalone testing fallback
const MOCK_USERS = {
  'ceo': { token: 'mock-token-ceo', user: { username: 'ceo', role: 'CEO', fullname: 'Nguyễn Văn A (CEO)', id: 1 } },
  'sales': { token: 'mock-token-sales', user: { username: 'sales', role: 'SALES', fullname: 'Trần Thị B (Bán Hàng)', id: 2 } },
  'warehouse': { token: 'mock-token-warehouse', user: { username: 'warehouse', role: 'WAREHOUSE', fullname: 'Lê Văn C (Thủ Kho)', id: 3 } },
  'assembly': { token: 'mock-token-assembly', user: { username: 'assembly', role: 'ASSEMBLY', fullname: 'Phạm Văn D (Kỹ Thuật)', id: 4 } },
  'hr': { token: 'mock-token-hr', user: { username: 'hr', role: 'HR', fullname: 'Nguyễn Nhân Sự (HR)', id: 5 } },
  'accounting': { token: 'mock-token-accounting', user: { username: 'accounting', role: 'ACCOUNTANT', fullname: 'Trần Kế Toán (Kế Toán)', id: 6 } },
  'customer': { token: 'mock-token-customer', user: { username: 'customer', role: 'CUSTOMER', fullname: 'Nguyễn Khách Hàng', id: 7, phone: '0901234567' } },
  'admin': { token: 'mock-token-admin', user: { username: 'admin', role: 'ADMIN', fullname: 'Quản Trị Viên', id: 8 } },
  'sales_manager': { token: 'mock-token-sm', user: { username: 'sales_manager', role: 'SALES_MANAGER', fullname: 'Quản Lý Bán Hàng', id: 9 } },
  'warehouse_manager': { token: 'mock-token-wm', user: { username: 'warehouse_manager', role: 'WAREHOUSE_MANAGER', fullname: 'Quản Lý Kho', id: 10 } },
  'purchasing': { token: 'mock-token-purchasing', user: { username: 'purchasing', role: 'PURCHASING', fullname: 'Nhân Viên Mua Hàng', id: 11 } },
  'supplier': { token: 'mock-token-supplier', user: { username: 'supplier', role: 'SUPPLIER', fullname: 'Nhà Cung Cấp ABC', code: 'supplier', id: 12 } },
  'cskh': { token: 'mock-token-cskh', user: { username: 'cskh', role: 'CSKH', fullname: 'Nguyễn CSKH (Chăm Sóc KH)', id: 14 } },
  'delivery': { token: 'mock-token-delivery', user: { username: 'delivery', role: 'DELIVERY', fullname: 'Trần Giao Hàng (Shipper 1)', id: 15 } },
  'delivery2': { token: 'mock-token-delivery2', user: { username: 'delivery2', role: 'DELIVERY', fullname: 'Nguyễn Văn Shipper (Shipper 2)', id: 17 } },
  'qc': { token: 'mock-token-qc', user: { username: 'qc', role: 'QC', fullname: 'Nguyễn Văn QC (Kiểm Soát Chất Lượng)', id: 16 } }
};

SUPPLIER_DEMO_ACCOUNTS.forEach(({ role, label }) => {
  const key = role.toLowerCase();
  MOCK_USERS[key] = {
    token: `mock-token-${key}`,
    user: { username: role, role: 'SUPPLIER', fullname: label.replace('NCC — ', ''), name: label.replace('NCC — ', ''), code: role, id: role }
  };
});

const calculateCustomerLoyaltyInfo = (userObj) => {
  if (!userObj) return null;
  try {
    const storedOrders = JSON.parse(localStorage.getItem('erp_orders') || '[]');
    const userPhoneDigits = userObj.phone ? String(userObj.phone).replace(/\D/g, '') : '';
    const userEmail = userObj.email ? String(userObj.email).toLowerCase() : '';
    
    const customerOrders = storedOrders.filter(ord => {
      if (ord.status === 'CANCELLED') return false;
      const ordPhoneDigits = ord.phone ? String(ord.phone).replace(/\D/g, '') : '';
      const ordEmail = ord.email ? String(ord.email).toLowerCase() : '';
      return (userPhoneDigits && ordPhoneDigits && ordPhoneDigits === userPhoneDigits) || 
             (userEmail && ordEmail && ordEmail === userEmail);
    });
    
    let totalPoints = 0;
    customerOrders.forEach(ord => {
      totalPoints += Math.floor(parseFloat(ord.totalAmount || 0) / 10000);
    });
    
    let calculatedTier = 'BRONZE';
    if (totalPoints >= 30000) calculatedTier = 'DIAMOND';
    else if (totalPoints >= 15000) calculatedTier = 'PLATINUM';
    else if (totalPoints >= 5000) calculatedTier = 'GOLD';
    else if (totalPoints >= 1000) calculatedTier = 'SILVER';

    const finalPoints = Math.max(userObj.loyaltyPoints || 0, totalPoints);
    let finalTier = calculatedTier;
    if (userObj.tier && !['BRONZE', 'B2B'].includes(userObj.tier.toUpperCase())) {
      finalTier = userObj.tier;
    }

    return {
      ...userObj,
      loyaltyPoints: finalPoints,
      tier: finalTier
    };
  } catch (e) {
    return userObj;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load auth info from local storage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && !parsed.role) {
          parsed.role = 'CUSTOMER';
        }
        const enriched = calculateCustomerLoyaltyInfo(parsed);
        localStorage.setItem('user', JSON.stringify(enriched));
        setUser(enriched);
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);

    // Sync state if localStorage changes in other tabs or through api interceptor
    const handleAuthChange = () => {
      const u = localStorage.getItem('user');
      if (u) {
        const parsed = JSON.parse(u);
        setUser(calculateCustomerLoyaltyInfo(parsed));
      } else {
        setUser(null);
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      // 1. First attempt to sign in using backend API
      const lowerUser = username.toLowerCase();
      const isEmployee = 
        ['ceo', 'admin', 'sales_manager', 'sales', 'warehouse_manager', 'warehouse', 'purchasing', 'supplier', 'assembly', 'hr', 'accounting', 'cskh', 'delivery'].includes(lowerUser) ||
        lowerUser.startsWith('sup-') ||
        lowerUser.endsWith('@kltn-erp.vn') || 
        lowerUser.startsWith('emp-');
      
      const loginEndpoint = isEmployee ? '/auth/employee/login' : '/auth/login';

      try {
        const response = await api.post(loginEndpoint, { email: username, username, password });
        if (response && response.token && response.user) {
          const userObj = {
            ...response.user,
            role: response.user.role || (isEmployee ? 'EMPLOYEE' : 'CUSTOMER')
          };
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(userObj));
          setUser(userObj);
          setLoading(false);
          return userObj;
        }
      } catch (apiError) {
        console.warn('Backend server connection failed, trying mock fallback credentials:', apiError.message);
      }

      // 2. Mock fallback login (registered customers in localStorage)
      const mockRegList = JSON.parse(localStorage.getItem('mock_registered_customers') || '{}');
      if (mockRegList[lowerUser] && mockRegList[lowerUser].password === password) {
        const mockData = mockRegList[lowerUser];
        localStorage.setItem('token', mockData.token);
        localStorage.setItem('user', JSON.stringify(mockData.user));
        setUser(mockData.user);
        setLoading(false);
        return mockData.user;
      }

      // 2.5. Check employees created by HR module (mock_erp_employees)
      const mockEmpList = JSON.parse(localStorage.getItem('mock_erp_employees') || '{}');
      if (mockEmpList[lowerUser] && mockEmpList[lowerUser].password === password) {
        const mockData = mockEmpList[lowerUser];
        localStorage.setItem('token', mockData.token);
        localStorage.setItem('user', JSON.stringify(mockData.user));
        setUser(mockData.user);
        setLoading(false);
        return mockData.user;
      }

      // 3. Mock default credentials
      if (MOCK_USERS[lowerUser] && password === '123456') {
        const mockData = MOCK_USERS[lowerUser];
        // Merge any saved profile updates from previous sessions
        const savedOverrides = JSON.parse(localStorage.getItem(`mock_profile_overrides_${lowerUser}`) || '{}');
        const mergedUser = calculateCustomerLoyaltyInfo({ ...mockData.user, ...savedOverrides });
        localStorage.setItem('token', mockData.token);
        localStorage.setItem('user', JSON.stringify(mergedUser));
        setUser(mergedUser);
        setLoading(false);
        return mergedUser;
      }

      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      let registeredUser = null;
      // 1. First attempt to register using backend API
      try {
        const response = await api.post('/auth/register', userData);
        if (response && response.token && response.user) {
          const userObj = {
            ...response.user,
            role: 'CUSTOMER'
          };
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(userObj));
          setUser(userObj);
          registeredUser = userObj;
        }
      } catch (apiError) {
        console.warn('Backend registration failed, running client-side mock registration:', apiError.message);
      }

      // 2. Client-side mock registration fallback
      if (!registeredUser) {
        const { email, password, name, phone, address, city } = userData;
        if (!email || !password || !name) {
          throw new Error('Họ tên, email và mật khẩu là bắt buộc');
        }

        const mockRegList = JSON.parse(localStorage.getItem('mock_registered_customers') || '{}');
        const lowerEmail = email.toLowerCase();
        if (mockRegList[lowerEmail] || MOCK_USERS[lowerEmail]) {
          throw new Error('Email đã được sử dụng bởi tài khoản khác');
        }

        const newMockUser = {
          token: `mock-token-${Date.now()}`,
          user: {
            id: `CUST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            name,
            email: lowerEmail,
            role: 'CUSTOMER',
            tier: 'BRONZE',
            loyaltyPoints: 0,
            phone: phone || '',
            address: address || '',
            city: city || ''
          },
          password
        };

        mockRegList[lowerEmail] = newMockUser;
        localStorage.setItem('mock_registered_customers', JSON.stringify(mockRegList));

        // Log in automatically
        localStorage.setItem('token', newMockUser.token);
        localStorage.setItem('user', JSON.stringify(newMockUser.user));
        setUser(newMockUser.user);
        registeredUser = newMockUser.user;
      }

      // Note: Welcome Email is sent by Backend auth.controller.js upon registration

      setLoading(false);
      return registeredUser;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const updateUser = async (updatedFields) => {
    setLoading(true);
    try {
      // 1. Attempt to update profile using backend API
      try {
        const response = await api.put('/auth/profile', { 
          id: user.id, 
          role: user.role,
          ...updatedFields 
        });
        if (response && response.success && response.user) {
          const updatedUserObj = { ...user, ...response.user };
          localStorage.setItem('user', JSON.stringify(updatedUserObj));
          setUser(updatedUserObj);
          setLoading(false);
          return updatedUserObj;
        }
      } catch (apiError) {
        console.warn('Backend profile update offline/failed, running local fallback update:', apiError.message);
      }

      // 2. Client-side fallback update (Mock Users / LocalStorage)
      const updatedUserObj = { ...user, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updatedUserObj));
      
      const mockRegList = JSON.parse(localStorage.getItem('mock_registered_customers') || '{}');
      const lowerEmail = user.email ? user.email.toLowerCase() : '';
      if (lowerEmail && mockRegList[lowerEmail]) {
        mockRegList[lowerEmail].user = { ...mockRegList[lowerEmail].user, ...updatedFields };
        localStorage.setItem('mock_registered_customers', JSON.stringify(mockRegList));
      }

      // Also save overrides keyed by username (for MOCK_USERS static accounts)
      const username = user.username || user.name?.toLowerCase().replace(/\s+/g, '_') || '';
      if (username) {
        const existingOverrides = JSON.parse(localStorage.getItem(`mock_profile_overrides_${username}`) || '{}');
        const newOverrides = { ...existingOverrides, ...updatedFields };
        localStorage.setItem(`mock_profile_overrides_${username}`, JSON.stringify(newOverrides));
      }

      setUser(updatedUserObj);
      setLoading(false);
      return updatedUserObj;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasPermission = (permissionKey) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    try {
      const matrix = JSON.parse(localStorage.getItem('erp_rbac_matrix') || '[]');
      const roleItem = matrix.find(r => r.role === user.role || (['QC', 'QA', 'QUALITY_CONTROL'].includes(user.role) && r.role.includes('QC')));
      if (roleItem && typeof roleItem[permissionKey] !== 'undefined') {
        return Boolean(roleItem[permissionKey]);
      }
    } catch (e) {
      // fallback
    }
    return true;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    hasPermission,
    isAuthenticated: !!user,
    isCEO: user?.role === 'CEO',
    isSales: user?.role === 'SALES',
    isSalesManager: user?.role === 'SALES_MANAGER',
    isWarehouse: user?.role === 'WAREHOUSE',
    isWarehouseManager: user?.role === 'WAREHOUSE_MANAGER',
    isAssembly: user?.role === 'ASSEMBLY',
    isHR: user?.role === 'HR',
    isAccountant: user?.role === 'ACCOUNTANT',
    isPurchasing: user?.role === 'PURCHASING',
    isAdmin: user?.role === 'ADMIN',
    isSupplier: user?.role === 'SUPPLIER',
    isCustomer: user?.role === 'CUSTOMER' || !user,
    isCskh: user?.role === 'CSKH',
    isDelivery: user?.role === 'DELIVERY',
    isQC: ['QC', 'QA', 'QUALITY_CONTROL'].includes(user?.role)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
