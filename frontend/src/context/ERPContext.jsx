import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { api } from '../services/api';

const ERPContext = createContext(null);

export const useERP = () => useContext(ERPContext);

// Initial mock transactions for CEO dashboard trend
const INITIAL_ORDERS = [
  { orderId: 'ORD-101', customerName: 'Lê Hoàng Hùng', phone: '0901234567', shippingAddress: '12 Đường Lê Duẩn, Quận 1, TP.HCM', totalAmount: 18490000, date: '15/06/2026', status: 'DELIVERED', type: 'ONLINE', items: [
    { productId: 1, name: 'Intel Core i5-13400F', price: 4890000, quantity: 1, category: 'CPU' },
    { productId: 3, name: 'ASUS ROG STRIX B760-F Gaming WiFi', price: 5490000, quantity: 1, category: 'MAINBOARD' },
    { productId: 8, name: 'MSI GeForce RTX 4060 Ventus 2X 8GB OC', price: 8390000, quantity: 1, category: 'VGA' }
  ]},
  { orderId: 'ORD-102', customerName: 'Nguyễn Thị Hoa', phone: '0987654321', shippingAddress: 'Bán tại cửa hàng (POS)', totalAmount: 8390000, date: '16/06/2026', status: 'DELIVERED', type: 'POS', items: [
    { productId: 8, name: 'MSI GeForce RTX 4060 Ventus 2X 8GB OC', price: 8390000, quantity: 1, category: 'VGA' }
  ]},
  { orderId: 'ORD-103', customerName: 'Trần Minh Nam', phone: '0912345678', shippingAddress: '88 Đường Nguyễn Trãi, Quận 5, TP.HCM', totalAmount: 24490000, date: '17/06/2026', status: 'DELIVERED', type: 'ONLINE', items: [
    { productId: 7, name: 'ASUS ROG Strix RTX 4070 Super 12GB OC', price: 21990000, quantity: 1, category: 'VGA' },
    { productId: 12, name: 'NZXT H5 Flow Black', price: 2390000, quantity: 1, category: 'CASE' }
  ]},
  { orderId: 'ORD-104', customerName: 'Phạm Hồng Thái', phone: '0955555555', shippingAddress: 'Bán tại cửa hàng (POS)', totalAmount: 1390000, date: '18/06/2026', status: 'DELIVERED', type: 'POS', items: [
    { productId: 10, name: 'MSI MAG A650BN 650W 80 Plus Bronze', price: 1390000, quantity: 1, category: 'PSU' }
  ]},
  { orderId: 'ORD-105', customerName: 'Vũ Quốc Trung', phone: '0966666666', shippingAddress: '34 Đường Võ Văn Tần, Quận 3, TP.HCM', totalAmount: 3250000, date: '19/06/2026', status: 'PROCESSING', type: 'ONLINE', items: [
    { productId: 5, name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz', price: 3250000, quantity: 1, category: 'RAM' }
  ]},
  { orderId: 'ORD-106', customerName: 'Đặng Văn Minh', phone: '0977889900', shippingAddress: '456 Đường Nguyễn Thị Minh Khai, Quận 3, TP.HCM', totalAmount: 15890000, date: new Date().toLocaleDateString('vi-VN'), status: 'READY_TO_SHIP', type: 'ONLINE', items: [
    { productId: 1, name: 'Intel Core i5-13400F', price: 4890000, quantity: 1, category: 'CPU' },
    { productId: 8, name: 'MSI GeForce RTX 4060 Ventus 2X 8GB OC', price: 8390000, quantity: 1, category: 'VGA' }
  ]},
  { orderId: 'ORD-107', customerName: 'Ngô Thanh Hà', phone: '0933221100', shippingAddress: '123 Đường Lê Lợi, Quận 1, TP.HCM', totalAmount: 21990000, date: new Date().toLocaleDateString('vi-VN'), status: 'SHIPPED', type: 'ONLINE', lastNote: 'Shipper đang di chuyển tới địa chỉ nhận hàng', items: [
    { productId: 7, name: 'ASUS ROG Strix RTX 4070 Super 12GB OC', price: 21990000, quantity: 1, category: 'VGA' }
  ]},
  { orderId: 'ORD-108', customerName: 'Bùi Hoàng Long', phone: '0911445566', shippingAddress: '789 Đường Cách Mạng Tháng 8, Quận 10, TP.HCM', totalAmount: 9880000, date: new Date().toLocaleDateString('vi-VN'), status: 'SHIPPING_FAILED', type: 'ONLINE', lastNote: 'Giao thất bại: Khách hàng bận họp không nghe máy, hẹn giao lại ca chiều', items: [
    { productId: 3, name: 'ASUS ROG STRIX B760-F Gaming WiFi', price: 5490000, quantity: 1, category: 'MAINBOARD' },
    { productId: 5, name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz', price: 3250000, quantity: 1, category: 'RAM' }
  ]},
  { orderId: 'ORD-109', customerName: 'Khách Doanh Nghiệp ABC', phone: '0122222222', shippingAddress: '100 Đường Nguyễn Huệ, Quận 1, TP.HCM', totalAmount: 1390000, date: new Date().toLocaleDateString('vi-VN'), status: 'CONFIRMED', type: 'ONLINE', items: [
    { productId: 10, name: 'MSI MAG A650BN 650W 80 Plus Bronze', price: 1390000, quantity: 1, category: 'PSU' }
  ]}
];

// Initial mock employees
const INITIAL_EMPLOYEES = [
  { id: 1, fullname: 'Nguyễn Văn A', username: 'ceo', role: 'CEO', salary: 50000000, attendance: 'PRESENT', salaryPaid: false },
  { id: 2, fullname: 'Trần Thị B', username: 'sales', role: 'SALES', salary: 15000000, attendance: 'PRESENT', salaryPaid: false },
  { id: 3, fullname: 'Lê Văn C', username: 'warehouse', role: 'WAREHOUSE', salary: 12000000, attendance: 'ABSENT', salaryPaid: false },
  { id: 4, fullname: 'Phạm Văn D', username: 'assembly', role: 'ASSEMBLY', salary: 14000000, attendance: 'PRESENT', salaryPaid: false },
  { id: 5, fullname: 'Nguyễn Nhân Sự', username: 'hr', role: 'HR', salary: 16000000, attendance: 'PRESENT', salaryPaid: false },
  { id: 6, fullname: 'Trần Kế Toán', username: 'accounting', role: 'ACCOUNTANT', salary: 18000000, attendance: 'PRESENT', salaryPaid: false }
];

// Initial Assembly Jobs
const INITIAL_JOBS = [
  {
    id: 'JOB-901',
    orderId: 'ORD-105',
    customer: 'Vũ Quốc Trung',
    date: '19/06/2026',
    status: 'ASSEMBLING',
    components: [
      { category: 'CPU', name: 'Intel Core i5-13400F' },
      { category: 'MAINBOARD', name: 'ASUS ROG STRIX B760-F Gaming WiFi' },
      { category: 'RAM', name: 'Corsair Vengeance RGB 32GB' },
      { category: 'VGA', name: 'MSI GeForce RTX 4060 Ventus 2X 8GB OC' },
      { category: 'PSU', name: 'Corsair RM750e 750W 80 Plus Gold' }
    ],
    checklist: { biosPost: true, osInstall: true, stressTest: true, qcSeal: true }
  }
];

// Initial mock general ledger
const INITIAL_LEDGER = [
  { id: 'TXN-101', type: 'INCOME', amount: 18490000, date: '15/06/2026', description: 'Thu tiền đơn hàng bán lẻ ORD-101 (ONLINE)' },
  { id: 'TXN-102', type: 'EXPENSE', amount: 12000000, date: '15/06/2026', description: 'Chi trả lương nhân viên Lê Văn C' },
  { id: 'TXN-103', type: 'INCOME', amount: 8390000, date: '16/06/2026', description: 'Thu tiền đơn hàng bán lẻ ORD-102 (POS)' },
  { id: 'TXN-104', type: 'EXPENSE', amount: 18500000, date: '16/06/2026', description: 'Chi phí mua hàng: 10x MSI PRO H610M-E từ NCC MSI' },
  { id: 'TXN-105', type: 'INCOME', amount: 24490000, date: '17/06/2026', description: 'Thu tiền đơn hàng bán lẻ ORD-103 (ONLINE)' }
];

const INITIAL_POS = [
  {
    id: 'PO-260808-3458',
    poNumber: 'PO-260808-3458',
    supplierCode: 's1',
    supplier: { code: 's1', name: 'Samsung Vina Electronics Co., Ltd' },
    createdBy: 'purchasing@kltn-erp.vn',
    expectedDeliveryDate: '2026-08-18',
    totalAmount: 9524810,
    status: 'PO',
    items: [
      { productId: '1', productName: 'Intel Core i5-13400F', quantity: 10, unitCost: 4150000 },
      { productId: '8', productName: 'MSI GeForce RTX 4060 Ventus 2X 8GB OC', quantity: 5, unitCost: 7400000 }
    ]
  },
  {
    id: 'PO-2026-0003',
    poNumber: 'PO-2026-0003',
    supplierCode: 's2',
    supplier: { code: 's2', name: 'Mai Hoàng Distribution' },
    createdBy: 'purchasing@kltn-erp.vn',
    expectedDeliveryDate: '2026-08-20',
    totalAmount: 202500000,
    status: 'QUOTED',
    items: [
      { productId: '4', productName: 'RAM Corsair Vengeance RGB 32GB DDR5', quantity: 25, unitCost: 2100000 },
      { productId: '5', productName: 'VGA ASUS ROG Strix RTX 4070 Super', quantity: 12, unitCost: 12500000 }
    ]
  },
  {
    id: 'RFQ-2026-0001',
    poNumber: 'RFQ-2026-0001',
    supplierCode: 's1',
    supplier: { code: 's1', name: 'Samsung Vina Electronics Co., Ltd' },
    createdBy: 'purchasing@kltn-erp.vn',
    expectedDeliveryDate: '2026-08-25',
    totalAmount: 97500000,
    status: 'RFQ',
    items: [
      { productId: '1', productName: 'Intel Core i5-13400F', quantity: 20, unitCost: 1500000 },
      { productId: '2', productName: 'Mainboard ASUS TUF Gaming B760-PLUS', quantity: 15, unitCost: 4500000 }
    ]
  }
];

const INITIAL_ATTENDANCE_LOGS = (() => {
  const dates = ['24/06/2026', '25/06/2026', '26/06/2026', '27/06/2026', '28/06/2026'];
  const logs = [];
  // Loop employee IDs 1 to 15
  for (let empId = 1; empId <= 15; empId++) {
    dates.forEach((d, idx) => {
      const val = (empId * 7 + idx * 3) % 10;
      let status = 'PRESENT';
      if (val === 1) status = 'LATE';
      else if (val === 2) status = 'ABSENT';
      
      logs.push({
        id: `ATT-SEED-${empId}-${d.replace(/\//g, '-')}`,
        empId,
        date: d,
        status
      });
    });
  }
  return logs;
})();

const INITIAL_SERIALS = [
  ...Array.from({ length: 30 }).flatMap((_, i) => [
    { serial: `SN-MOCK-${i + 1}-A`, productId: i + 1, status: 'AVAILABLE' },
    { serial: `SN-MOCK-${i + 1}-B`, productId: i + 1, status: 'AVAILABLE' },
    { serial: `SN-MOCK-${i + 1}-C`, productId: i + 1, status: 'AVAILABLE' },
  ])
];

export const ERPProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [assemblyJobs, setAssemblyJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customNotifs, setCustomNotifs] = useState(() => {
    try {
      const raw = localStorage.getItem('erp_system_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const sendSystemNotification = (notifData) => {
    const newNotif = {
      id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      targetRoles: notifData.targetRoles || ['PURCHASING', 'CEO', 'ADMIN'],
      title: notifData.title || 'Thông báo hệ thống',
      message: notifData.message || '',
      link: notifData.link || '/admin/purchasing',
      navState: notifData.navState || {},
      type: notifData.type || 'RFQ_ALERT',
      itemData: notifData.itemData || null,
      read: false
    };

    setCustomNotifs(prev => {
      const updated = [newNotif, ...prev];
      try {
        localStorage.setItem('erp_system_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    window.dispatchEvent(new Event('erp-notification-sent'));
    return newNotif;
  };

  // Sync loyalty points for existing completed/delivered/active orders
  const syncExistingPoints = (currentOrders) => {
    try {
      const mockRegList = JSON.parse(localStorage.getItem('mock_registered_customers') || '{}');
      
      let changed = false;
      const pointsByPhone = {};

      currentOrders.forEach(ord => {
        if (ord.status !== 'CANCELLED' && ord.phone) {
          const cleanP = ord.phone.replace(/[^0-9]/g, '');
          if (cleanP) {
            const pts = Math.floor(parseFloat(ord.totalAmount) / 10000);
            pointsByPhone[cleanP] = (pointsByPhone[cleanP] || 0) + pts;
          }
        }
      });

      if (Object.keys(mockRegList).length > 0) {
        Object.keys(mockRegList).forEach(emailKey => {
          const cust = mockRegList[emailKey].user;
          const cleanP = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
          if (cleanP) {
            const expectedPoints = pointsByPhone[cleanP] || 0;
            if (cust.loyaltyPoints !== expectedPoints) {
              cust.loyaltyPoints = expectedPoints;
              
              // Upgrade tier
              let nextTier = 'BRONZE';
              if (expectedPoints >= 30000) nextTier = 'DIAMOND';
              else if (expectedPoints >= 15000) nextTier = 'PLATINUM';
              else if (expectedPoints >= 5000) nextTier = 'GOLD';
              else if (expectedPoints >= 1000) nextTier = 'SILVER';
              
              cust.tier = nextTier;
              changed = true;
            }
          }
        });

        if (changed) {
          localStorage.setItem('mock_registered_customers', JSON.stringify(mockRegList));
        }
      }

      // Also sync currently logged-in user if their points/tier changed (even if not in mockRegList)
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          const cleanP = parsedUser.phone ? parsedUser.phone.replace(/[^0-9]/g, '') : '';
          if (cleanP) {
            const expectedPoints = pointsByPhone[cleanP] || 0;
            let nextTier = 'BRONZE';
            if (expectedPoints >= 30000) nextTier = 'DIAMOND';
            else if (expectedPoints >= 15000) nextTier = 'PLATINUM';
            else if (expectedPoints >= 5000) nextTier = 'GOLD';
            else if (expectedPoints >= 1000) nextTier = 'SILVER';

            if (parsedUser.loyaltyPoints !== expectedPoints || parsedUser.tier !== nextTier) {
              const nextUser = { ...parsedUser, loyaltyPoints: expectedPoints, tier: nextTier };
              localStorage.setItem('user', JSON.stringify(nextUser));
              window.dispatchEvent(new Event('auth-change'));
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    } catch (e) {
      console.error("Failed to sync existing loyalty points:", e);
    }
  };

  // Load products list from API fallback
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const prodData = await api.get('/products');
        const prodList = Array.isArray(prodData) ? prodData : (prodData?.data || []);
        setProducts(prodList);
        
        // Reset legacy cached inventory once to load newly reallocated stock dataset (v14)
        if (!localStorage.getItem('erp_inv_v14_synced')) {
          localStorage.removeItem('erp_inventory');
          ['v7','v8','v9','v10','v11','v12','v13'].forEach(v => localStorage.removeItem(`erp_inv_${v}_synced`));
          localStorage.setItem('erp_inv_v14_synced', 'true');
        }

        let storedInventory = [];
        try {
          const raw = localStorage.getItem('erp_inventory');
          if (raw) storedInventory = JSON.parse(raw);
        } catch (e) {}

        // Realistic retail store: 2-8 units per SKU on average
        const CATEGORY_DEFAULT_STOCK = {
          'CPU': 4, 'VGA': 3, 'MAINBOARD': 4, 'RAM': 6, 'STORAGE': 5,
          'PSU': 4, 'CASE': 3, 'COOLER': 4, 'MONITOR': 3, 'KEYBOARD': 5, 'MOUSE': 6
        };
        const MAX_STOCK_PER_SKU = 15; // cap unrealistically high backend values

        const syncedInventory = prodList.map(p => {
          const pId = p.id || p.productId;
          const invItem = storedInventory.find(i => String(i.id) === String(pId)) || {};
          
          // available=false = hidden from storefront, NOT discontinued
          // Only truly discontinued if status='DISCONTINUED' or discontinued=true
          const isDiscontinued = p.status === 'DISCONTINUED' || 
                                 p.discontinued === true || 
                                 invItem.status === 'DISCONTINUED';

          // Use category.slug (reliable ASCII from DB) as primary key for normalization
          const catSlug = (typeof p.category === 'object' ? p.category?.slug : null) || '';
          const catName = (typeof p.category === 'object' ? p.category?.name : p.category) || invItem.category || 'STORAGE';
          
          // Slug-based mapping (most reliable - always ASCII)
          const SLUG_TO_CODE = {
            'cpu': 'CPU', 'processor': 'CPU',
            'vga': 'VGA', 'gpu': 'VGA', 'graphics-card': 'VGA', 'card-man-hinh': 'VGA',
            'mainboard': 'MAINBOARD', 'motherboard': 'MAINBOARD', 'main': 'MAINBOARD',
            'ram': 'RAM', 'memory': 'RAM',
            'storage': 'STORAGE', 'hdd': 'STORAGE', 'ssd': 'STORAGE', 'o-cung': 'STORAGE',
            'psu': 'PSU', 'power-supply': 'PSU', 'nguon': 'PSU',
            'case': 'CASE', 'chassis': 'CASE', 'thung-may': 'CASE',
            'cooler': 'COOLER', 'tan-nhiet': 'COOLER', 'cooling': 'COOLER',
            'monitor': 'MONITOR', 'man-hinh': 'MONITOR', 'screen': 'MONITOR',
            'keyboard': 'KEYBOARD', 'ban-phim': 'KEYBOARD',
            'mouse': 'MOUSE', 'chuot': 'MOUSE'
          };
          // Name-based fallback mapping
          const CAT_NORMALIZE = {
            'CPU': 'CPU', 'PROCESSOR': 'CPU',
            'VGA': 'VGA', 'GPU': 'VGA', 'CARD MAN HINH': 'VGA',
            'MAINBOARD': 'MAINBOARD', 'MOTHERBOARD': 'MAINBOARD',
            'RAM': 'RAM', 'MEMORY': 'RAM',
            'STORAGE': 'STORAGE', 'HDD': 'STORAGE', 'SSD': 'STORAGE',
            'PSU': 'PSU', 'POWER SUPPLY': 'PSU',
            'CASE': 'CASE', 'CHASSIS': 'CASE',
            'COOLER': 'COOLER', 'FAN': 'COOLER', 'COOLING': 'COOLER',
            'MONITOR': 'MONITOR', 'SCREEN': 'MONITOR', 'DISPLAY': 'MONITOR',
            'KEYBOARD': 'KEYBOARD', 'BAN PHIM': 'KEYBOARD',
            'MOUSE': 'MOUSE', 'CHUOT': 'MOUSE'
          };
          
          // Determine catKey: slug first → name fallback
          let catKey;
          if (catSlug) {
            catKey = SLUG_TO_CODE[catSlug.toLowerCase()] || SLUG_TO_CODE[catSlug.toLowerCase().replace(/[^a-z-]/g, '')] || catSlug.toUpperCase();
          } else {
            // Strip Vietnamese diacritics for matching
            const catNameNorm = catName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
            catKey = CAT_NORMALIZE[catNameNorm] || CAT_NORMALIZE[catName.toUpperCase().trim()] || catName.toUpperCase().trim();
          }
          
          const defaultStockForCat = CATEGORY_DEFAULT_STOCK[catKey] || 15;

          const rawStock = p.stockQuantity !== undefined 
            ? p.stockQuantity 
            : (p.stock_quantity !== undefined ? p.stock_quantity : (invItem.stock !== undefined ? invItem.stock : undefined));

          // Calculate realistic stock with proper distribution (in stock, low stock, out of stock)
          let realStock;
          if (rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock))) {
            realStock = Math.min(Math.max(0, Number(rawStock)), MAX_STOCK_PER_SKU);
          } else {
            // Seed distributed stock levels if undefined
            const numId = Number(String(pId).replace(/\D/g, '')) || 1;
            const mod = numId % 10;
            if (mod === 0) {
              realStock = 0; // Hết hàng (Out of stock)
            } else if (mod <= 2) {
              realStock = 2 + (numId % 3); // 2-4: Cảnh báo tồn (<= threshold 5)
            } else {
              realStock = 6 + (numId % 8); // 6-13: Còn hàng an toàn (> threshold 5)
            }
          }

          // Try multiple price field names from backend
          const CATEGORY_DEFAULT_PRICE = {
            'CPU': 8500000, 'VGA': 12000000, 'MAINBOARD': 4500000, 'RAM': 1500000,
            'STORAGE': 1800000, 'PSU': 1200000, 'CASE': 1500000, 'COOLER': 800000,
            'MONITOR': 6500000, 'KEYBOARD': 1200000, 'MOUSE': 500000
          };
          const rawPrice = parseFloat(p.price) || parseFloat(p.listPrice) || parseFloat(p.salePrice) || parseFloat(p.basePrice) || parseFloat(p.retailPrice) || parseFloat(p.unitPrice) || 0;
          const realPrice = rawPrice > 0 ? rawPrice : (invItem.price && invItem.price > 0 ? invItem.price : (CATEGORY_DEFAULT_PRICE[catKey] || 0));

          return {
            id: pId || invItem.id,
            name: p.name || invItem.name,
            category: catKey,
            stock: realStock,
            threshold: Number(invItem.threshold || 5),
            supplier: (typeof p.brand === 'object' ? p.brand?.name : p.brand) || invItem.supplier || 'Nhà phân phối',
            location: invItem.location || 'Chưa xếp kệ',
            price: realPrice,
            available: !isDiscontinued,
            status: isDiscontinued ? 'DISCONTINUED' : 'ACTIVE'
          };
        });

        localStorage.setItem('erp_inventory', JSON.stringify(syncedInventory));
        setInventory(syncedInventory);
      } catch (err) {
        console.error('Failed fetching products in ERPContext:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    // Load orders
    let loadedOrders = [];
    const storedOrders = localStorage.getItem('erp_orders');
    if (storedOrders) {
      try {
        const parsed = JSON.parse(storedOrders);
        loadedOrders = parsed.map(ord => {
          if (!ord.items || !Array.isArray(ord.items) || ord.items.length === 0) {
            const initMatch = INITIAL_ORDERS.find(i => i.orderId === ord.orderId);
            if (initMatch && initMatch.items) {
              return { ...ord, items: initMatch.items };
            }
          }
          return ord;
        });
      } catch (e) {
        loadedOrders = INITIAL_ORDERS;
      }
      localStorage.setItem('erp_orders', JSON.stringify(loadedOrders));
      setOrders(loadedOrders);
    } else {
      loadedOrders = INITIAL_ORDERS;
      localStorage.setItem('erp_orders', JSON.stringify(INITIAL_ORDERS));
      setOrders(INITIAL_ORDERS);
    }
    syncExistingPoints(loadedOrders);

    // Load assembly jobs
    const storedJobs = localStorage.getItem('erp_jobs');
    if (storedJobs) {
      setAssemblyJobs(JSON.parse(storedJobs));
    } else {
      localStorage.setItem('erp_jobs', JSON.stringify(INITIAL_JOBS));
      setAssemblyJobs(INITIAL_JOBS);
    }

    // Load employees
    const storedEmployees = localStorage.getItem('erp_employees');
    if (storedEmployees) {
      setEmployees(JSON.parse(storedEmployees));
    } else {
      localStorage.setItem('erp_employees', JSON.stringify(INITIAL_EMPLOYEES));
      setEmployees(INITIAL_EMPLOYEES);
    }

    // Load ledger
    const storedLedger = localStorage.getItem('erp_ledger');
    if (storedLedger) {
      setLedger(JSON.parse(storedLedger));
    } else {
      localStorage.setItem('erp_ledger', JSON.stringify(INITIAL_LEDGER));
      setLedger(INITIAL_LEDGER);
    }

    // Load POs
    const storedPOs = localStorage.getItem('erp_pos');
    if (storedPOs) {
      setPurchaseOrders(JSON.parse(storedPOs));
    } else {
      localStorage.setItem('erp_pos', JSON.stringify(INITIAL_POS));
      setPurchaseOrders(INITIAL_POS);
    }

    // Load Serials
    const storedSerials = localStorage.getItem('erp_serials');
    if (storedSerials && !storedSerials.includes('SN-I5-839201')) {
      setSerialNumbers(JSON.parse(storedSerials));
    } else {
      localStorage.setItem('erp_serials', JSON.stringify(INITIAL_SERIALS));
      setSerialNumbers(INITIAL_SERIALS);
    }

    // Load Attendance Logs
    const storedLogs = localStorage.getItem('erp_attendance_logs');
    if (storedLogs) {
      setAttendanceLogs(JSON.parse(storedLogs));
    } else {
      localStorage.setItem('erp_attendance_logs', JSON.stringify(INITIAL_ATTENDANCE_LOGS));
      setAttendanceLogs(INITIAL_ATTENDANCE_LOGS);
    }

    // Load Leave Requests
    const storedLeaves = localStorage.getItem('erp_leave_requests');
    if (storedLeaves) {
      setLeaveRequests(JSON.parse(storedLeaves));
    } else {
      const initialLeaves = [
        { id: 1, empName: 'Lê Văn C', role: 'WAREHOUSE', reason: 'Nghỉ khám sức khỏe định kỳ', startDate: '29/06/2026', endDate: '29/06/2026', status: 'PENDING' },
        { id: 2, empName: 'Phạm Văn D', role: 'ASSEMBLY', reason: 'Nghỉ giải quyết việc gia đình', startDate: '30/06/2026', endDate: '01/07/2026', status: 'PENDING' },
        { id: 3, empName: 'Trần Thị B', role: 'SALES', reason: 'Nghỉ phép ốm', startDate: '24/06/2026', endDate: '25/06/2026', status: 'APPROVED' }
      ];
      localStorage.setItem('erp_leave_requests', JSON.stringify(initialLeaves));
      setLeaveRequests(initialLeaves);
    }

    // Load Payrolls
    const storedPayrolls = localStorage.getItem('erp_payrolls');
    if (storedPayrolls) {
      setPayrolls(JSON.parse(storedPayrolls));
    } else {
      setPayrolls([]);
    }

    // Load Return Requests
    const storedReturns = localStorage.getItem('erp_return_requests');
    if (storedReturns) {
      setReturnRequests(JSON.parse(storedReturns));
    } else {
      const initReturns = [
        { id: 'RET-001', orderId: 'ORD-101', customerName: 'Lê Hoàng Hùng', phone: '0901234567', type: 'EXCHANGE', reason: 'Sản phẩm bị lỗi màn hình', status: 'PENDING', date: '20/06/2026' },
        { id: 'RET-002', orderId: 'ORD-102', customerName: 'Nguyễn Thị Hoa', phone: '0987654321', type: 'REFUND', reason: 'Không đúng sản phẩm đặt', status: 'PROCESSING', date: '21/06/2026' }
      ];
      localStorage.setItem('erp_return_requests', JSON.stringify(initReturns));
      setReturnRequests(initReturns);
    }

    // Load Complaints
    const storedComplaints = localStorage.getItem('erp_complaints');
    if (storedComplaints) {
      setComplaints(JSON.parse(storedComplaints));
    } else {
      const initComplaints = [
        { id: 'TKT-001', customerName: 'Trần Minh Nam', phone: '0912345678', email: 'nam@email.com', subject: 'Giao hàng chậm trễ', description: 'Đơn ORD-103 đặt 3 ngày vẫn chưa được giao', priority: 'HIGH', status: 'OPEN', assignedTo: null, date: '20/06/2026' },
        { id: 'TKT-002', customerName: 'Phạm Hồng Thái', phone: '0955555555', email: 'thai@email.com', subject: 'Sản phẩm không đúng mô tả', description: 'PSU ghi 650W nhưng thực tế chỉ đạt 550W', priority: 'MEDIUM', status: 'IN_PROGRESS', assignedTo: 'NV CSKH', date: '21/06/2026' }
      ];
      localStorage.setItem('erp_complaints', JSON.stringify(initComplaints));
      setComplaints(initComplaints);
    }
  }, []);

  // Save changes helper
  const saveState = (key, data, setter) => {
    localStorage.setItem(key, JSON.stringify(data));
    setter(data);
  };

  // 1. Order placements & Stock Deductions
  // 1. Order placements & Stock Deductions
  const processCheckout = (customerName, phone, items, type = 'ONLINE', customTotal = null, shippingAddress = '', paymentMethod = 'COD', customerEmail = '') => {
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const newOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const totalAmount = customTotal !== null ? customTotal : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let orderStatus = 'PENDING';
    
    if (type === 'POS') {
      orderStatus = 'DELIVERED';
      // Deduct stock immediately for POS
      const updatedInventory = inventory.map(invItem => {
        const matchInOrder = items.find(oItem => String(oItem.productId) === String(invItem.id));
        if (matchInOrder) {
          const nextStock = Math.max(0, invItem.stock - matchInOrder.quantity);
          return { ...invItem, stock: nextStock };
        }
        return invItem;
      });
      saveState('erp_inventory', updatedInventory, setInventory);

      // Record Financial Transaction (INCOME) immediately
      const newTxId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      const newTx = {
        id: newTxId,
        type: 'INCOME',
        amount: totalAmount,
        date: dateStr,
        description: `Thu tiền đơn hàng POS lẻ ${newOrderId}`
      };
      const nextLedger = [newTx, ...ledger];
      saveState('erp_ledger', nextLedger, setLedger);

      // POS Assembly Job if contains custom bundle
      const hasBundle = items.some(item => item.selectedSpec?.pc_build_bundle);
      if (hasBundle) {
        const bundleItems = items.map(item => ({
          category: item.category || 'COMPONENT',
          name: item.name || item.product?.name || 'Linh Kiện Máy Tính'
        }));
        const newJob = {
          id: `JOB-${Math.floor(900 + Math.random() * 99)}`,
          orderId: newOrderId,
          customer: customerName,
          date: dateStr,
          status: 'PENDING',
          components: bundleItems,
          checklist: { socketCheck: false, thermalPaste: false, cableRouting: false, biosBoot: false, stressTest: false }
        };
        const nextJobs = [newJob, ...assemblyJobs];
        saveState('erp_jobs', nextJobs, setAssemblyJobs);
      }
    }

    // Determine target email
    let userEmail = customerEmail;
    if (!userEmail) {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) userEmail = JSON.parse(storedUser).email || '';
      } catch (e) {}
    }

    const newOrder = {
      orderId: newOrderId,
      customerName,
      phone,
      email: userEmail,
      shippingAddress: shippingAddress || (type === 'POS' ? 'Bán tại cửa hàng (POS)' : 'Địa chỉ giao hàng mặc định'),
      totalAmount,
      date: dateStr,
      status: orderStatus,
      type,
      items,
      createdAtTime: Date.now() // Record creation timestamp for ONLINE order auto-approvals
    };
    
    const nextOrders = [newOrder, ...orders];
    saveState('erp_orders', nextOrders, setOrders);
    syncExistingPoints(nextOrders);

    // Backend order.controller.js handles sendOrderConfirmationEmail automatically upon order creation

    // Sync online checkout to backend database if customer logged in
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser && type === 'ONLINE') {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === 'CUSTOMER') {
          api.post('/orders', {
            orderId: newOrderId,
            items: items.map(it => ({ productId: it.productId, quantity: it.quantity })),
            paymentMethod: paymentMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'COD',
            shippingAddress: shippingAddress || 'Hồ Chí Minh',
            shippingCity: 'Hồ Chí Minh',
            notes: 'Đặt hàng online (Đồng bộ)'
          }).then(() => {
            console.log(`[CSDL] ✅ Đã tạo đơn ${newOrderId} trên backend & gửi email xác nhận.`);
          }).catch(err => {
            console.warn('[CSDL] ❌ Lỗi đồng bộ đơn hàng lên backend:', err.message);
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    return newOrderId;
  };

  const approvePO = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    const updatedPOs = purchaseOrders.map(p => {
      if (p.id === poId) {
        return { ...p, status: 'APPROVED' };
      }
      return p;
    });
    saveState('erp_pos', updatedPOs, setPurchaseOrders);

    // Ghi nhận chi phí dự kiến vào sổ cái
    if (po) {
      const dateStr = new Date().toLocaleDateString('vi-VN');
      const estimatedCost = (po.quantity || 0) * (po.unitPrice || po.unitCost || 0);
      const newTx = {
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'EXPENSE_PROJECTED',
        amount: estimatedCost,
        date: dateStr,
        description: `Duyệt PO ${po.id || po.poNumber || ''}: ${po.productName || po.supplierCode || ''} — Chi phí dự kiến`
      };
      const nextLedger = [newTx, ...ledger];
      saveState('erp_ledger', nextLedger, setLedger);
    }
  };

  // Thêm PO mới (dùng cho Purchasing khi offline)
  const addPurchaseOrder = (poData) => {
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const newPO = {
      id: poData.id || `PO-${Math.floor(100 + Math.random() * 900)}-${Date.now()}`,
      poNumber: poData.poNumber || `PO-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`,
      supplierCode: poData.supplierCode || '',
      supplier: poData.supplier || { name: poData.supplierName || poData.supplierCode || 'Nhà cung cấp' },
      items: poData.items || [],
      status: poData.status || 'DRAFT',
      totalAmount: poData.totalAmount || 0,
      createdAt: poData.createdAt || new Date().toISOString(),
      createdBy: poData.createdBy || 'Staff',
      expectedDeliveryDate: poData.expectedDeliveryDate || null,
      // Backward compat fields
      productId: poData.productId || null,
      productName: poData.productName || (poData.items && poData.items[0]?.name) || '',
      quantity: poData.quantity || (poData.items && poData.items.reduce((s,i) => s + (i.quantity||0), 0)) || 0,
      unitPrice: poData.unitPrice || poData.unitCost || 0,
      date: dateStr
    };
    const nextPOs = [newPO, ...purchaseOrders];
    saveState('erp_pos', nextPOs, setPurchaseOrders);
    return newPO;
  };

  // Cập nhật trạng thái PO (dùng cho Purchasing & Supplier Portal khi offline/mock)
  const updatePurchaseOrderStatus = (poId, newStatus, extraData = null) => {
    const extraObj = typeof extraData === 'object' && extraData !== null ? extraData : (typeof extraData === 'string' ? { cancelReason: extraData, note: extraData } : {});
    let updated = false;
    const updatedPOs = purchaseOrders.map(po => {
      if (po.id === poId || po.poNumber === poId || String(po.id) === String(poId)) {
        updated = true;
        return { 
          ...po, 
          status: newStatus,
          ...extraObj,
          ...(extraObj.expectedDeliveryDate ? { expectedDeliveryDate: extraObj.expectedDeliveryDate } : {}),
          ...(extraObj.supplierNote ? { supplierNote: extraObj.supplierNote, note: extraObj.supplierNote } : {})
        };
      }
      return po;
    });
    // Do not overwrite persistent orders when this context has not loaded the
    // target PO yet; SupplierPortal writes the authoritative record itself.
    if (updated) saveState('erp_pos', updatedPOs, setPurchaseOrders);
  };

  // 2. Warehouse GRN imports
  const processGRN = (productId, quantity, supplierName, unitPrice, poId = null) => {
    const item = inventory.find(i => i.id === productId);
    const nextPrice = unitPrice || item?.price || 0;
    const cost = nextPrice * quantity;
    const dateStr = new Date().toLocaleDateString('vi-VN');

    // A. Update PO status if poId is provided
    if (poId) {
      const updatedPOs = purchaseOrders.map(po => {
        if (po.id === poId) {
          return { ...po, status: 'RECEIVED' };
        }
        return po;
      });
      saveState('erp_pos', updatedPOs, setPurchaseOrders);
    }

    // B. Generate Serial Numbers for the imported stock
    const newSerials = [];
    for (let i = 0; i < quantity; i++) {
      const categoryPrefix = (item?.category || 'COMP').substring(0, 3).toUpperCase();
      const randNum = Math.floor(100000 + Math.random() * 900000);
      newSerials.push({
        serial: `SN-${categoryPrefix}-${randNum}`,
        productId,
        status: 'AVAILABLE'
      });
    }
    const updatedSerials = [...serialNumbers, ...newSerials];
    saveState('erp_serials', updatedSerials, setSerialNumbers);

    // C. Increase Inventory Stock
    let updatedInventory = inventory.map(invItem => {
      if (invItem.id === productId) {
        return {
          ...invItem,
          stock: invItem.stock + quantity,
          supplier: supplierName,
          price: nextPrice
        };
      }
      return invItem;
    });

    // D. Financial entry (EXPENSE)
    const newTxId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx = {
      id: newTxId,
      type: 'EXPENSE',
      amount: cost,
      date: dateStr,
      description: `Chi phí mua hàng: Nhập kho ${quantity}x ${item?.name || 'Linh kiện'} từ NCC ${supplierName} (PO: ${poId || 'Nhập lẻ'})`
    };
    const nextLedger = [newTx, ...ledger];
    saveState('erp_ledger', nextLedger, setLedger);

    // E. Resolve AWAITING_STOCK orders
    let updatedOrders = [...orders];
    let nextJobs = [...assemblyJobs];

    let inventoryMap = updatedInventory.reduce((acc, inv) => {
      acc[inv.id] = inv.stock;
      return acc;
    }, {});

    updatedOrders = updatedOrders.map(order => {
      if (order.status === 'AWAITING_STOCK') {
        let canFulfill = true;
        order.items.forEach(orderItem => {
          const availableStock = inventoryMap[orderItem.productId] || 0;
          if (availableStock < orderItem.quantity) {
            canFulfill = false;
          }
        });

        if (canFulfill) {
          order.items.forEach(orderItem => {
            inventoryMap[orderItem.productId] -= orderItem.quantity;
          });

          const hasBundle = order.items.some(item => item.selectedSpec?.pc_build_bundle);
          if (hasBundle) {
            const bundleItems = order.items.map(item => ({
              category: item.category || 'COMPONENT',
              name: item.name || item.product?.name || 'Linh Kiện Máy Tính'
            }));

            const jobExists = nextJobs.some(j => j.orderId === order.orderId);
            if (!jobExists) {
              nextJobs.push({
                id: `JOB-${Math.floor(900 + Math.random() * 99)}`,
                orderId: order.orderId,
                customer: order.customerName,
                date: dateStr,
                status: 'PENDING',
                components: bundleItems,
                checklist: { socketCheck: false, thermalPaste: false, cableRouting: false, biosBoot: false, stressTest: false }
              });
            }
          }

          return { ...order, status: 'PROCESSING' };
        }
      }
      return order;
    });

    updatedInventory = updatedInventory.map(inv => ({
      ...inv,
      stock: inventoryMap[inv.id] !== undefined ? inventoryMap[inv.id] : inv.stock
    }));

    saveState('erp_inventory', updatedInventory, setInventory);
    saveState('erp_orders', updatedOrders, setOrders);
    syncExistingPoints(updatedOrders);
    saveState('erp_jobs', nextJobs, setAssemblyJobs);

    // Send email notification on status change
    const targetOrder = orders.find(o => o.orderId === orderId);
    if (targetOrder) {
      const emailToUse = targetOrder.email || targetOrder.customerEmail || user?.email || 'nguyenhoangmy7772004@gmail.com';
      api.post('/orders/email-notify', {
        type: 'STATUS_UPDATE',
        toEmail: emailToUse,
        customerName: targetOrder.customerName || user?.fullname || 'Khách hàng',
        orderId: targetOrder.orderId,
        status: newStatus,
        note: note || '',
        items: targetOrder.items,
        totalAmount: targetOrder.totalAmount
      }).then(() => {
        console.log(`[EmailService] ✅ Đã gửi email thông báo trạng thái ${newStatus} tới ${emailToUse}`);
      }).catch(err => console.warn('[EmailService] Order status email error:', err.message));
    }
  };

  // 3. Assembly Line progress tracking
  const updateAssemblyJob = (jobId, status, checklist, componentSerials = null) => {
    const updatedJobs = assemblyJobs.map(job => {
      if (job.id === jobId) {
        return { 
          ...job, 
          status, 
          checklist, 
          componentSerials: componentSerials || job.componentSerials || {}
        };
      }
      return job;
    });
    saveState('erp_jobs', updatedJobs, setAssemblyJobs);

    if (componentSerials) {
      const serialValues = Object.values(componentSerials);
      const updatedSerials = serialNumbers.map(sn => {
        if (serialValues.includes(sn.serial)) {
          return { ...sn, status: 'USED' };
        }
        return sn;
      });
      saveState('erp_serials', updatedSerials, setSerialNumbers);
    }

    if (status === 'COMPLETED') {
      const job = assemblyJobs.find(j => j.id === jobId);
      if (job && job.orderId) {
        // Assembly hoàn thành → đơn chuyển sang CONFIRMED để Quản lý Kho xác nhận xuất kho
        const updatedOrders = orders.map(o => {
          if (o.orderId === job.orderId) {
            return { ...o, status: 'CONFIRMED' };
          }
          return o;
        });
        saveState('erp_orders', updatedOrders, setOrders);
        syncExistingPoints(updatedOrders);
      }
    }
  };

  // Warehouse xác nhận xuất kho → DELIVERED
  const deliverOrder = (orderId) => {
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const updatedOrders = orders.map(o => {
      if (o.orderId === orderId) {
        return { ...o, status: 'DELIVERED', deliveredDate: dateStr };
      }
      return o;
    });
    saveState('erp_orders', updatedOrders, setOrders);
    syncExistingPoints(updatedOrders);

    // Sync delivery state to backend CSDL PostgreSQL
    const token = localStorage.getItem('token');
    if (token) {
      api.patch(`/orders/${orderId}/status`, {
        status: 'DELIVERED',
        note: 'Đã giao hàng thành công (Đồng bộ)'
      }).then(() => {
        console.log(`[CSDL] Đã cập nhật đơn ${orderId} thành công trên backend sang DELIVERED.`);
      }).catch(err => {
        console.warn(`[CSDL] Không thể cập nhật trạng thái đơn ${orderId} trên backend database:`, err.message);
      });
    }

    // Ghi nhận xuất kho vào sổ cái (ghi chú giao hàng)
    const ord = updatedOrders.find(o => o.orderId === orderId);
    if (ord) {
      const newTx = {
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'SHIPPING',
        amount: 0,
        date: dateStr,
        description: `Xuất kho & giao hàng thành công đơn ${orderId} cho KH ${ord.customerName || ''}`
      };
      const nextLedger = [newTx, ...ledger];
      saveState('erp_ledger', nextLedger, setLedger);

      // Gửi email thông báo Giao hàng thành công trực tiếp tới hòm thư khách hàng
      const emailToUse = ord.email || ord.customerEmail || user?.email || 'nguyenhoangmy7772004@gmail.com';
      api.post('/orders/email-notify', {
        type: 'STATUS_UPDATE',
        toEmail: emailToUse,
        customerName: ord.customerName || user?.fullname || 'Khách hàng',
        orderId: ord.orderId,
        status: 'DELIVERED',
        note: 'Đã xuất kho và giao hàng thành công tới khách hàng',
        items: ord.items || [],
        totalAmount: ord.totalAmount || 0,
        proofPhoto: ord.proofPhoto || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
        receiverNote: 'Khách hàng đã nhận đủ hàng và kiểm tra đầy đủ.',
        deliveredTime: new Date().toLocaleString('vi-VN')
      }).then(() => {
        console.log(`[EmailService] ✅ Đã gửi email giao hàng thành công đơn ${orderId} tới ${emailToUse}`);
      }).catch(err => {
        console.warn('[EmailService] ❌ Lỗi gửi email giao hàng thành công:', err.message);
      });
    }
  };

  // Khách hàng tự cập nhật thông tin đơn hàng PENDING
  const updateOrderDetails = (orderId, details) => {
    const updatedOrders = orders.map(o => {
      if (o.orderId === orderId && o.status === 'PENDING') {
        return {
          ...o,
          customerName: details.customerName || o.customerName,
          phone: details.phone || o.phone,
          shippingAddress: details.shippingAddress || o.shippingAddress,
          lastNote: details.notes !== undefined ? details.notes : o.lastNote
        };
      }
      return o;
    });

    saveState('erp_orders', updatedOrders, setOrders);

    // Gửi API lên backend để đồng bộ CSDL
    const token = localStorage.getItem('token');
    if (token && !token.startsWith('mock-')) {
      api.patch(`/orders/${orderId}/details`, details).then(() => {
        console.log(`[CSDL] Đã đồng bộ thông tin đơn hàng ${orderId} xuống DB.`);
      }).catch(err => console.error('[CSDL] Lỗi cập nhật đơn hàng:', err.message));
    }
  };

  // Sales Manager/CEO/Delivery cập nhật trạng thái đơn hàng thủ công
  const updateOrderStatus = (orderId, newStatus, note = null, extraData = {}) => {
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const targetOrder = orders.find(o => o.orderId === orderId);
    if (!targetOrder) return;

    let nextInventory = [...inventory];
    let nextLedger = [...ledger];
    let nextJobs = [...assemblyJobs];
    let inventoryChanged = false;
    let ledgerChanged = false;
    let jobsChanged = false;

    const isApprovedTransition = ['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'].includes(newStatus) && ['PENDING', 'AWAITING_STOCK'].includes(targetOrder.status);
    const isCancelledTransition = newStatus === 'CANCELLED' && ['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'DELIVERED', 'SHIPPED'].includes(targetOrder.status);

    if (isApprovedTransition) {
      // Check stock
      let hasShortage = false;
      targetOrder.items?.forEach(item => {
        const invItem = nextInventory.find(inv => inv.id === item.productId);
        if (!invItem || invItem.stock < item.quantity) {
          hasShortage = true;
        }
      });

      if (hasShortage) {
        alert('Không đủ tồn kho để duyệt đơn hàng này. Trạng thái chuyển thành Chờ hàng (AWAITING_STOCK).');
        newStatus = 'AWAITING_STOCK';
      } else {
        inventoryChanged = true;
        // Deduct stock
        nextInventory = nextInventory.map(invItem => {
          const match = targetOrder.items?.find(item => String(item.productId) === String(invItem.id));
          if (match) {
            return { ...invItem, stock: Math.max(0, invItem.stock - match.quantity) };
          }
          return invItem;
        });

        // Record INCOME
        ledgerChanged = true;
        const newTxId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
        const newTx = {
          id: newTxId,
          type: 'INCOME',
          amount: targetOrder.totalAmount,
          date: dateStr,
          description: `Thu tiền đơn hàng bán lẻ ${orderId} (Duyệt thủ công)`
        };
        nextLedger = [newTx, ...nextLedger];

        // Launch Assembly job if custom PC bundle
        const hasBundle = targetOrder.items?.some(item => item.selectedSpec?.pc_build_bundle);
        if (hasBundle) {
          const jobExists = nextJobs.some(j => j.orderId === orderId);
          if (!jobExists) {
            jobsChanged = true;
            const bundleItems = targetOrder.items.map(item => ({
              category: item.category || 'COMPONENT',
              name: item.name || 'Linh Kiện Máy Tính'
            }));
            const newJob = {
              id: `JOB-${Math.floor(900 + Math.random() * 99)}`,
              orderId,
              customer: targetOrder.customerName,
              date: dateStr,
              status: 'PENDING',
              components: bundleItems,
              checklist: { socketCheck: false, thermalPaste: false, cableRouting: false, biosBoot: false, stressTest: false }
            };
            nextJobs = [newJob, ...nextJobs];
          }
        }
      }
    }

    if (isCancelledTransition || newStatus === 'CANCELLED') {
      inventoryChanged = true;
      // Restore stock
      nextInventory = nextInventory.map(invItem => {
        const match = targetOrder.items?.find(item => String(item.productId) === String(invItem.id));
        if (match) {
          return { ...invItem, stock: invItem.stock + match.quantity };
        }
        return invItem;
      });

      // Update Assembly job to CANCELLED as well
      const jobMatch = nextJobs.find(j => j.orderId === orderId);
      if (jobMatch) {
        jobsChanged = true;
        nextJobs = nextJobs.map(j => j.orderId === orderId ? { ...j, status: 'CANCELLED' } : j);
      }
    }

    if (newStatus === 'PACKED' && extraData.selectedSerials) {
      const updatedSerials = serialNumbers.map(sn => {
        if (extraData.selectedSerials.includes(sn.serial)) {
          return { ...sn, status: 'USED', orderId: orderId };
        }
        return sn;
      });
      saveState('erp_serials', updatedSerials, setSerialNumbers);
    }

    if (inventoryChanged) {
      saveState('erp_inventory', nextInventory, setInventory);
    }
    if (ledgerChanged) {
      saveState('erp_ledger', nextLedger, setLedger);
    }
    if (jobsChanged) {
      saveState('erp_jobs', nextJobs, setAssemblyJobs);
    }

    const updatedOrders = orders.map(o => {
      if (o.orderId === orderId) {
        return { 
          ...o, 
          status: newStatus,
          ...(note ? { lastNote: note } : {}),
          ...extraData
        };
      }
      return o;
    });
    saveState('erp_orders', updatedOrders, setOrders);
    syncExistingPoints(updatedOrders);

    // Bắn thông báo Hệ thống cho Bộ phận Kho (Warehouse) nếu đơn hàng liên quan đến Kho
    if (newStatus === 'CONFIRMED' && !isCancelledTransition) {
      sendSystemNotification({
        targetRoles: ['WAREHOUSE_MANAGER', 'ADMIN', 'CEO'],
        title: `📦 Đơn hàng #${orderId} cần xuất kho`,
        message: `Đơn hàng #${orderId} vừa được duyệt. Vui lòng chuẩn bị hàng để xuất kho.`,
        link: '/admin/warehouse',
        type: 'ORDER_ALERT'
      });
    } else if (newStatus === 'AWAITING_STOCK') {
      sendSystemNotification({
        targetRoles: ['WAREHOUSE_MANAGER', 'ADMIN', 'CEO'],
        title: `⚠️ Đơn hàng #${orderId} thiếu linh kiện`,
        message: `Đơn hàng #${orderId} đang chờ linh kiện nhập kho. Vui lòng kiểm tra và lên kế hoạch nhập hàng.`,
        link: '/admin/warehouse',
        type: 'STOCK_ALERT'
      });
    } else if (newStatus === 'CANCELLED' && ['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'PACKED', 'AWAITING_STOCK'].includes(targetOrder.status)) {
       sendSystemNotification({
        targetRoles: ['WAREHOUSE_MANAGER', 'ADMIN', 'CEO'],
        title: `❌ Hủy đơn hàng #${orderId}`,
        message: `Đơn hàng #${orderId} vừa bị hủy. Vui lòng ngừng xuất kho hoặc thu hồi lại linh kiện.`,
        link: '/admin/warehouse',
        type: 'ORDER_ALERT'
      });
    }

    // Gửi email cập nhật trạng thái thực tế qua backend /orders/email-notify
    const targetOrderWithEmail = updatedOrders.find(o => o.orderId === orderId);
    const customerEmailForNotif = targetOrderWithEmail?.email || targetOrderWithEmail?.customerEmail || user?.email || 'nguyenhoangmy7772004@gmail.com';
    const orderItemsToPass = (targetOrderWithEmail?.items && targetOrderWithEmail.items.length > 0)
      ? targetOrderWithEmail.items
      : (targetOrder?.items || []);

    if (customerEmailForNotif) {
      // Chuẩn bị proofPhoto: hỗ trợ truyền base64 lên backend để convert thành CID inline attachment trong email
      let safeProofPhoto = extraData.proofPhoto || targetOrderWithEmail?.proofPhoto || null;
      if (safeProofPhoto && safeProofPhoto.startsWith('data:') && safeProofPhoto.length > 8000000) {
        // Base64 quá lớn (>8MB), dùng placeholder cho email template
        safeProofPhoto = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80';
      }

      // Giảm kích thước items payload - chỉ giữ thông tin cần thiết cho email
      const safeItems = (orderItemsToPass || []).map(item => ({
        name: item.name || item.productName || item.title || 'Linh kiện máy tính',
        quantity: item.quantity || item.qty || 1,
        price: item.price || item.unitPrice || item.totalPrice || 0,
        category: item.category || ''
      }));

      api.post('/orders/email-notify', {
        type: 'STATUS_UPDATE',
        toEmail: customerEmailForNotif,
        customerName: targetOrderWithEmail?.customerName || user?.fullname || 'Khách hàng',
        orderId,
        status: newStatus,
        note: note || null,
        items: safeItems,
        totalAmount: targetOrderWithEmail?.totalAmount || targetOrder?.totalAmount || 0,
        proofPhoto: safeProofPhoto,
        receiverNote: extraData.receiverNote || null,
        deliveredTime: extraData.deliveredTime || null
      }).then(() => {
        console.log(`[EmailService] ✅ Đã gửi email cập nhật trạng thái ${newStatus} tới ${customerEmailForNotif}`);
      }).catch(err => {
        console.warn('[EmailService] ❌ Lỗi gửi email cập nhật trạng thái:', err.message);
      });

      const STATUS_LABELS_VN = {
        'PENDING': 'Chờ Xử Lý', 'WAITING_PAYMENT': 'Chờ Thanh Toán', 'CONFIRMED': 'Đã Xác Nhận',
        'PACKED': 'Đã Đóng Gói', 'PROCESSING': 'Đang Xử Lý', 'AWAITING_STOCK': 'Chờ Nhập Hàng',
        'READY_TO_SHIP': 'Sẵn Sàng Giao', 'SHIPPED': 'Đang Vận Chuyển', 'DELIVERED': 'Đã Giao Hàng',
        'COMPLETED': 'Hoàn Tất', 'CANCELLED': 'Đã Hủy', 'FAILED_DELIVERY': 'Giao Thất Bại',
        'RETURN_REQUESTED': 'Yêu Cầu Hoàn Trả', 'RETURNING': 'Đang Thu Hồi',
        'RETURNED': 'Đã Nhận Hoàn', 'REFUNDED': 'Đã Hoàn Tiền'
      };
      const emailLog = {
        id: `MAIL-${Date.now()}`,
        type: 'STATUS_UPDATE',
        toEmail: customerEmailForNotif,
        customerName: targetOrderWithEmail?.customerName || '',
        orderId,
        status: newStatus,
        statusVN: STATUS_LABELS_VN[newStatus] || newStatus,
        subject: `[Aether ERP] Cập nhật trạng thái đơn hàng #${orderId}: ${STATUS_LABELS_VN[newStatus] || newStatus}`,
        note: note || null,
        sentAt: new Date().toISOString()
      };
      try {
        const existingLogs = JSON.parse(localStorage.getItem('erp_email_logs') || '[]');
        existingLogs.unshift(emailLog);
        if (existingLogs.length > 50) existingLogs.length = 50;
        localStorage.setItem('erp_email_logs', JSON.stringify(existingLogs));
        console.log(`[EmailService] Đã log email cập nhật trạng thái cho ${customerEmailForNotif} (#${orderId} → ${newStatus})`);
      } catch (e) {}
    }

    // Sync status change to backend CSDL PostgreSQL
    const token = localStorage.getItem('token');
    if (token) {
      api.patch(`/orders/${orderId}/status`, {
        status: newStatus,
        note: note || `Cập nhật trạng thái đơn sang ${newStatus}`
      }).then(() => {
        console.log(`[CSDL] Đã đồng bộ cập nhật trạng thái đơn ${orderId} thành công.`);
      }).catch(err => {
        console.warn(`[CSDL] Không tìm thấy đơn ${orderId} trên backend database, bỏ qua:`, err.message);
      });
    }

    // Ghi sổ cái nếu giao hàng thành công
    if (newStatus === 'DELIVERED') {
      const ord = updatedOrders.find(o => o.orderId === orderId);
      if (ord) {
        const newTx = {
          id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          type: 'SHIPPING',
          amount: 0,
          date: dateStr,
          description: `Giao hàng xác nhận bởi Sales/Manager/Delivery: đơn ${orderId}${note ? ` (${note})` : ''}`
        };
        const nextLedger = [newTx, ...ledger];
        saveState('erp_ledger', nextLedger, setLedger);
      }
    }
  };

  // ──── Atomic Delivery Claiming & Deduplication ────
  const claimOrderForDelivery = (orderId, shipperUser) => {
    let currentOrders = [];
    try {
      currentOrders = JSON.parse(localStorage.getItem('erp_orders') || '[]');
    } catch (_) {
      currentOrders = orders;
    }

    const targetOrder = currentOrders.find(o => o.orderId === orderId || String(o.id) === String(orderId));
    if (!targetOrder) {
      return { success: false, message: `Không tìm thấy đơn hàng ${orderId} trong hệ thống!` };
    }

    const shipperId = shipperUser?.id || shipperUser?.username || 'SHIPPER';
    const shipperName = shipperUser?.fullname || shipperUser?.name || shipperUser?.username || 'Giao Hàng';

    // Anti-duplication check: If already assigned to another shipper, reject claim
    if (targetOrder.assignedShipperId && String(targetOrder.assignedShipperId) !== String(shipperId)) {
      return {
        success: false,
        message: `⚠️ Đơn hàng ${orderId} đã được Shipper "${targetOrder.assignedShipperName || targetOrder.assignedShipperId}" nhận trước đó!`
      };
    }

    const nowStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const noteText = `Đã lấy hàng & đang vận chuyển giao – Shipper: ${shipperName} (${nowStr})`;

    updateOrderStatus(orderId, 'SHIPPED', noteText, {
      assignedShipperId: shipperId,
      assignedShipperName: shipperName,
      assignedAt: new Date().toISOString(),
      assignmentMethod: 'SELF_CLAIM'
    });

    return { success: true, message: `✅ Đã nhận đơn hàng ${orderId} thành công!` };
  };

  const assignShipperToOrder = (orderId, shipperUser) => {
    const shipperId = shipperUser?.id || shipperUser?.username || null;
    const shipperName = shipperUser?.fullname || shipperUser?.name || shipperUser?.username || null;
    const nowStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const noteText = shipperName
      ? `Đã xuất kho – Phân công cho ${shipperName} giao hàng`
      : `Đã xuất kho – Chờ bên giao hàng nhận đơn`;

    updateOrderStatus(orderId, 'READY_TO_SHIP', noteText, {
      assignedShipperId: shipperId,
      assignedShipperName: shipperName,
      assignedAt: shipperId ? new Date().toISOString() : null,
      assignmentMethod: shipperId ? 'MANUAL_ASSIGN' : null
    });
  };

  // Assembly tạo job lắp ráp thủ công
  const createAssemblyJob = (orderId, customerName, components) => {
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const finalOrderId = orderId || `MANUAL-${Date.now()}`;
    const jobExists = assemblyJobs.some(j => j.orderId === finalOrderId);
    if (jobExists) return null;

    const newJob = {
      id: `JOB-${Math.floor(900 + Math.random() * 99)}`,
      orderId: finalOrderId,
      customer: customerName || 'Khách hàng',
      date: dateStr,
      status: 'PENDING',
      components: components || [],
      checklist: { socketCheck: false, thermalPaste: false, cableRouting: false, biosBoot: false, stressTest: false }
    };

    // Kiểm tra xem đơn hàng đã tồn tại trong danh sách orders chưa
    const existingOrder = orders.find(o => o.orderId === finalOrderId);
    if (!existingOrder) {
      const orderItems = (components || []).map(comp => {
        const invItem = inventory.find(inv => inv.name === comp.name);
        return {
          productId: invItem ? invItem.id : Math.floor(Math.random() * 1000),
          name: comp.name,
          price: invItem ? invItem.price : 0,
          quantity: 1,
          category: comp.category
        };
      });
      const totalAmount = orderItems.reduce((sum, item) => sum + item.price, 0);
      const newOrder = {
        orderId: finalOrderId,
        customerName: customerName || 'Khách hàng',
        phone: '0901234567', // SĐT mặc định cho đơn tạo thủ công
        totalAmount,
        date: dateStr,
        status: 'PROCESSING',
        type: 'POS',
        items: orderItems
      };
      
      // Cập nhật stock của các linh kiện trong inventory
      const updatedInventory = inventory.map(invItem => {
        const match = orderItems.find(item => String(item.productId) === String(invItem.id));
        if (match) {
          return { ...invItem, stock: Math.max(0, invItem.stock - 1) };
        }
        return invItem;
      });

      saveState('erp_inventory', updatedInventory, setInventory);
      const nextOrders = [newOrder, ...orders];
      saveState('erp_orders', nextOrders, setOrders);
      syncExistingPoints(nextOrders);
    }

    const nextJobs = [newJob, ...assemblyJobs];
    saveState('erp_jobs', nextJobs, setAssemblyJobs);
    return newJob;
  };

  // Accountant thanh toán NCC (PO RECEIVED → PAID)
  const paySupplierPO = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId || p.poNumber === poId);
    if (!po) return;
    const dateStr = new Date().toLocaleDateString('vi-VN');

    const updatedPOs = purchaseOrders.map(p => {
      if (p.id === poId || p.poNumber === poId) {
        return { ...p, status: 'PAID' };
      }
      return p;
    });
    saveState('erp_pos', updatedPOs, setPurchaseOrders);

    // Ghi EXPENSE thực vào sổ cái
    const realCost = po.totalAmount || (po.quantity || 0) * (po.unitPrice || po.unitCost || 0);
    const newTx = {
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'EXPENSE',
      amount: realCost,
      date: dateStr,
      description: `Thanh toán NCC: ${po.supplier?.name || po.supplierCode || ''} — ${po.poNumber || po.id}`
    };
    const nextLedger = [newTx, ...ledger];
    saveState('erp_ledger', nextLedger, setLedger);
  };

  // 4. Employee Attendance logs (HR)
  const updateAttendanceLog = (empId, dateStr, status) => {
    const existingIndex = attendanceLogs.findIndex(log => log.empId === empId && log.date === dateStr);
    let nextLogs = [];
    if (existingIndex !== -1) {
      nextLogs = attendanceLogs.map((log, index) => 
        index === existingIndex ? { ...log, status } : log
      );
    } else {
      const newLog = {
        id: `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        empId,
        date: dateStr,
        status
      };
      nextLogs = [newLog, ...attendanceLogs];
    }
    saveState('erp_attendance_logs', nextLogs, setAttendanceLogs);

    // Also update today's status on employee for backward compatibility
    const todayStr = new Date().toLocaleDateString('vi-VN');
    if (dateStr === todayStr) {
      const updatedEmployees = employees.map(emp => {
        if (emp.id === empId) {
          return { ...emp, attendance: status };
        }
        return emp;
      });
      saveState('erp_employees', updatedEmployees, setEmployees);
    }
  };

  const updateAttendance = (empId, status) => {
    const todayStr = new Date().toLocaleDateString('vi-VN');
    updateAttendanceLog(empId, todayStr, status);
  };

  // 5. HR Employee Registration
  const addEmployee = (fullname, username, role, salary) => {
    const newEmpId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
    const newEmp = {
      id: newEmpId,
      fullname,
      username,
      role,
      salary: parseInt(salary),
      attendance: 'PRESENT',
      salaryPaid: false
    };
    const nextEmployees = [...employees, newEmp];
    saveState('erp_employees', nextEmployees, setEmployees);

    // Sync vào mock_erp_employees để nhân viên mới có thể đăng nhập
    try {
      const mockEmpList = JSON.parse(localStorage.getItem('mock_erp_employees') || '{}');
      const lowerUser = username.toLowerCase();
      mockEmpList[lowerUser] = {
        token: `mock-token-${lowerUser}-${Date.now()}`,
        user: {
          id: newEmpId,
          username: lowerUser,
          fullname,
          role,
          salary: parseInt(salary)
        },
        password: '123456'
      };
      localStorage.setItem('mock_erp_employees', JSON.stringify(mockEmpList));
    } catch (e) {
      console.error('Failed to sync new employee auth:', e);
    }

    return newEmp;
  };

  const updateEmployee = (id, updatedFields) => {
    const nextEmployees = employees.map(emp => emp.id === id ? { ...emp, ...updatedFields } : emp);
    saveState('erp_employees', nextEmployees, setEmployees);

    // Sync into mock_erp_employees
    try {
      const target = employees.find(e => e.id === id);
      if (target && target.username) {
        const mockEmpList = JSON.parse(localStorage.getItem('mock_erp_employees') || '{}');
        const lowerUser = target.username.toLowerCase();
        if (mockEmpList[lowerUser]) {
          mockEmpList[lowerUser].user = { ...mockEmpList[lowerUser].user, ...updatedFields };
          localStorage.setItem('mock_erp_employees', JSON.stringify(mockEmpList));
        }
      }
    } catch (e) { console.error('Failed to sync employee update:', e); }
  };

  const deleteEmployee = (id) => {
    const nextEmployees = employees.filter(emp => emp.id !== id);
    saveState('erp_employees', nextEmployees, setEmployees);
  };

  // 5.5. HR Leave Request approvals
  const approveLeaveRequest = (id) => {
    const nextLeaves = leaveRequests.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r);
    saveState('erp_leave_requests', nextLeaves, setLeaveRequests);
  };

  const rejectLeaveRequest = (id) => {
    const nextLeaves = leaveRequests.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r);
    saveState('erp_leave_requests', nextLeaves, setLeaveRequests);
  };

  // 6. Payroll disbursements (HR & CEO & Accounting workflow)
  const submitPayrolls = (payrollList) => {
    const nextPayrolls = payrollList.map(p => ({ ...p, status: 'SUBMITTED_TO_CEO' }));
    saveState('erp_payrolls', nextPayrolls, setPayrolls);
    alert('✅ Đã khóa bảng tính công và gửi bảng lương thành công tới CEO để chờ phê duyệt!');
  };

  const approvePayrollByCEO = () => {
    const nextPayrolls = payrolls.map(p => ({ ...p, status: 'APPROVED_BY_CEO' }));
    saveState('erp_payrolls', nextPayrolls, setPayrolls);
    alert('✅ CEO đã phê duyệt bảng lương tháng này thành công! Đã gửi lệnh chi cho Kế toán giải ngân.');
  };

  const disbursePayroll = (empId) => {
    const payrollItem = payrolls.find(p => p.empId === empId);
    if (!payrollItem) return;

    if (payrollItem.status !== 'APPROVED_BY_CEO' && payrollItem.status !== 'SUBMITTED_TO_ACCOUNTING') {
      alert('⚠️ Bảng lương chưa được phê duyệt bởi CEO. Không thể chi lương!');
      return;
    }

    const dateStr = new Date().toLocaleDateString('vi-VN');
    const empName = payrollItem.name || payrollItem.empName || `Nhân viên #${payrollItem.empId}`;

    // 1. Record Expense in Ledger safely
    const newTxId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx = {
      id: newTxId,
      type: 'EXPENSE',
      amount: payrollItem.netSalary,
      date: dateStr,
      description: `Chi trả lương thực nhận nhân viên ${empName} (Công hưởng lương: ${payrollItem.presentDays || 26}/26 ngày)`
    };
    const nextLedger = [newTx, ...ledger];
    saveState('erp_ledger', nextLedger, setLedger);

    // 2. Mark employee as paid in general employees list
    const updatedEmployees = employees.map(e => {
      if (e.id === empId) {
        return { ...e, salaryPaid: true };
      }
      return e;
    });
    saveState('erp_employees', updatedEmployees, setEmployees);

    // 3. Mark payroll record as PAID
    const nextPayrolls = payrolls.map(p => {
      if (p.empId === empId) {
        return { ...p, status: 'PAID', disbursedDate: dateStr };
      }
      return p;
    });
    saveState('erp_payrolls', nextPayrolls, setPayrolls);

    alert(`💸 Đã giải ngân thành công ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payrollItem.netSalary)} cho nhân viên ${empName}!`);
  };

  const disburseAllPayrolls = () => {
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const eligiblePayrolls = payrolls.filter(p => p.status === 'APPROVED_BY_CEO' || p.status === 'SUBMITTED_TO_ACCOUNTING');
    if (eligiblePayrolls.length === 0) {
      alert('⚠️ Không có bảng lương nào đang chờ giải ngân!');
      return;
    }

    const newTxs = eligiblePayrolls.map(p => {
      const empName = p.name || p.empName || `Nhân viên #${p.empId}`;
      return {
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'EXPENSE',
        amount: p.netSalary,
        date: dateStr,
        description: `Chi trả lương thực nhận nhân viên ${empName} (Công hưởng lương: ${p.presentDays || 26}/26 ngày)`
      };
    });

    const nextLedger = [...newTxs, ...ledger];
    saveState('erp_ledger', nextLedger, setLedger);

    const eligibleIds = eligiblePayrolls.map(p => p.empId);
    const nextPayrolls = payrolls.map(p => {
      if (eligibleIds.includes(p.empId)) {
        return { ...p, status: 'PAID', disbursedDate: dateStr };
      }
      return p;
    });
    saveState('erp_payrolls', nextPayrolls, setPayrolls);

    alert(`✅ Kế toán đã giải ngân chi trả lương thành công cho ${eligiblePayrolls.length} nhân viên!`);
  };

  // Legacy fallback processPayroll
  const processPayroll = (empId, amount) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const dateStr = new Date().toLocaleDateString('vi-VN');

    const newTxId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx = {
      id: newTxId,
      type: 'EXPENSE',
      amount,
      date: dateStr,
      description: `Chi trả lương dự phòng nhân viên ${emp.fullname} (#${emp.id})`
    };
    const nextLedger = [newTx, ...ledger];
    saveState('erp_ledger', nextLedger, setLedger);

    const updatedEmployees = employees.map(e => {
      if (e.id === empId) {
        return { ...e, salaryPaid: true };
      }
      return e;
    });
    saveState('erp_employees', updatedEmployees, setEmployees);

    alert(`💸 Đã thanh toán lương cơ bản dự phòng ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)} cho nhân viên ${emp.fullname}!`);
  };

  // 7. Reset Payroll Cycle
  const resetPayrollCycle = () => {
    const updatedEmployees = employees.map(e => ({ ...e, salaryPaid: false }));
    saveState('erp_employees', updatedEmployees, setEmployees);
    saveState('erp_payrolls', [], setPayrolls);
    alert('🔄 Đã bắt đầu một chu kỳ lương mới! Trạng thái chi trả và bảng lương của toàn bộ nhân sự đã được reset.');
  };

  // 7.5. Add Manual Ledger Entry
  const addLedgerEntry = (type, amount, description, date) => {
    const dateStr = date || new Date().toLocaleDateString('vi-VN');
    const newTxId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx = {
      id: newTxId,
      type: type.toUpperCase(), // 'INCOME' or 'EXPENSE'
      amount: parseFloat(amount) || 0,
      date: dateStr,
      description
    };
    const nextLedger = [newTx, ...ledger];
    saveState('erp_ledger', nextLedger, setLedger);
    return newTx;
  };

  // 8. Update Product Threshold (Warehouse Manager)
  const updateThreshold = (productId, newThreshold) => {
    const updatedInventory = inventory.map(item => {
      if (item.id === productId) {
        return { ...item, threshold: parseInt(newThreshold) || 0 };
      }
      return item;
    });
    saveState('erp_inventory', updatedInventory, setInventory);
  };

  // 9. Update Bin Location (Warehouse Staff)
  const updateLocation = (productId, newLocation) => {
    const updatedInventory = inventory.map(item => {
      if (item.id === productId) {
        return { ...item, location: newLocation };
      }
      return item;
    });
    saveState('erp_inventory', updatedInventory, setInventory);
  };

  // 9.5. Product Catalog CRUD (Warehouse / Admin)
  const addProduct = (productData) => {
    const newId = inventory.length > 0 ? Math.max(...inventory.map(i => i.id || 0)) + 1 : 101;
    const newItem = {
      id: newId,
      name: productData.name,
      category: productData.category || 'COMPONENT',
      stock: parseInt(productData.stock) || 0,
      threshold: parseInt(productData.threshold) || 5,
      supplier: productData.supplier || 'Nhà phân phối',
      price: parseFloat(productData.price) || 0,
      location: productData.location || 'A-01-01'
    };
    const nextInventory = [newItem, ...inventory];
    saveState('erp_inventory', nextInventory, setInventory);

    // Sync new product to backend
    const token = localStorage.getItem('token');
    if (token) {
      api.post('/products/admin', {
        name: newItem.name,
        category: newItem.category,
        stockQuantity: newItem.stock,
        price: newItem.price,
        supplier: newItem.supplier
      }).then(() => {
        console.log(`[CSDL] Đã thêm linh kiện "${newItem.name}" lên backend thành công.`);
      }).catch(err => {
        console.warn('[CSDL] Không thể đồng bộ linh kiện mới lên backend:', err.message);
      });
    }

    return newItem;
  };

  const updateProduct = (id, updatedFields) => {
    const nextInventory = inventory.map(item => item.id === id ? { ...item, ...updatedFields } : item);
    saveState('erp_inventory', nextInventory, setInventory);

    // Sync product update to backend PostgreSQL CSDL
    const payload = {
      ...updatedFields,
      stockQuantity: updatedFields.stock !== undefined ? parseInt(updatedFields.stock, 10) : undefined
    };

    api.put(`/products/admin/${id}`, payload).then((res) => {
      console.log(`[CSDL] Đã lưu cập nhật linh kiện ID ${id} vào CSDL PostgreSQL thành công:`, res);
    }).catch(err => {
      console.warn(`[CSDL] Không thể đồng bộ cập nhật linh kiện ${id} vào CSDL:`, err.message);
    });
  };

  const deleteProduct = (id) => {
    const nextInventory = inventory.filter(item => item.id !== id);
    saveState('erp_inventory', nextInventory, setInventory);

    // Sync product deletion to backend
    const token = localStorage.getItem('token');
    if (token) {
      api.delete(`/products/admin/${id}`).then(() => {
        console.log(`[CSDL] Đã xóa linh kiện ID ${id} khỏi backend thành công.`);
      }).catch(err => {
        console.warn(`[CSDL] Không thể đồng bộ xóa linh kiện ${id}:`, err.message);
      });
    }
  };

  // 10. Return Request management
  const addReturnRequest = (data) => {
    const newReq = {
      id: `RET-${Date.now()}`,
      ...data,
      status: 'PENDING',
      date: new Date().toLocaleDateString('vi-VN')
    };
    const next = [newReq, ...returnRequests];
    saveState('erp_return_requests', next, setReturnRequests);

    // Sync return request to backend database
    const token = localStorage.getItem('token');
    if (token && data.orderId) {
      api.post(`/orders/${data.orderId}/return`, {
        reason: data.reason || 'Yêu cầu đổi trả',
        description: data.description || '',
        returnType: data.returnType || 'REFUND'
      }).then(() => {
        console.log(`[CSDL] Đã tạo yêu cầu đổi trả cho đơn ${data.orderId} thành công.`);
      }).catch(err => {
        console.warn('[CSDL] Lỗi đồng bộ yêu cầu đổi trả:', err.message);
      });
    }

    return newReq;
  };

  const updateReturnStatus = (id, status, resolution = '') => {
    // 1. Update return request status
    const returnReq = returnRequests.find(r => r.id === id);
    if (!returnReq) return;

    const next = returnRequests.map(r => r.id === id ? { ...r, status, resolution: resolution || r.resolution } : r);
    saveState('erp_return_requests', next, setReturnRequests);

    const orderId = returnReq.orderId;
    const ord = orders.find(o => o.orderId === orderId);

    // 2. Logic based on new RMA status
    if (status === 'QC_PASSED') {
      // Khi kho duyệt QC Pass
      if (ord && ord.status !== 'RETURNED') {
        // A. Cập nhật trạng thái đơn gốc thành RETURNED
        const updatedOrders = orders.map(o => {
          if (o.orderId === orderId) {
            return { ...o, status: 'RETURNED', lastNote: `Đổi trả hàng (QC Passed): ${resolution || 'Hợp lệ'}` };
          }
          return o;
        });
        
        // B. Nếu là Đổi hàng (EXCHANGE) -> Tạo đơn hàng mới 0đ
        if (returnReq.type === 'EXCHANGE' || returnReq.returnType === 'EXCHANGE') {
          const newOrderId = `EX-${Date.now().toString().slice(-6)}`;
          const exchangeOrder = {
            ...ord,
            orderId: newOrderId,
            status: 'PENDING',
            totalAmount: 0, // Đổi hàng không tốn tiền
            type: 'ONLINE', // Hoặc để y như cũ
            date: new Date().toLocaleDateString('vi-VN'),
            lastNote: `Đơn hàng đổi trả cho đơn gốc #${orderId}`,
            originalOrderId: orderId
          };
          updatedOrders.unshift(exchangeOrder);
        }
        
        saveState('erp_orders', updatedOrders, setOrders);
        syncExistingPoints(updatedOrders);

        // Sync RETURNED order status to backend
        const token = localStorage.getItem('token');
        if (token) {
          api.patch(`/orders/${orderId}/status`, {
            status: 'RETURNED',
            note: `Kho duyệt trả hàng: QC Passed`
          }).catch(() => {});
        }

        // C. Restore Inventory Stock (Warehouse Manager)
        const updatedInventory = inventory.map(invItem => {
          const matchInOrder = ord.items?.find(oItem => String(oItem.productId) === String(invItem.id));
          if (matchInOrder) {
            return { ...invItem, stock: invItem.stock + matchInOrder.quantity };
          }
          return invItem;
        });
        saveState('erp_inventory', updatedInventory, setInventory);
      }
    } else if (status === 'REFUND_COMPLETED') {
      // Kế toán hoàn tiền
      const dateStr = new Date().toLocaleDateString('vi-VN');
      const newTx = {
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'EXPENSE',
        amount: ord ? ord.totalAmount : 0,
        date: dateStr,
        description: `Hoàn tiền trả hàng đơn ${orderId} cho KH ${ord ? ord.customerName : ''}`
      };
      const nextLedger = [newTx, ...ledger];
      saveState('erp_ledger', nextLedger, setLedger);
    }
  };

  const processRefund = (orderIdOrReqId, refundMethod, note) => {
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const targetOrder = orders.find(o => o.orderId === orderIdOrReqId);

    const refundAmount = targetOrder ? targetOrder.totalAmount : 0;
    const newTx = {
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'EXPENSE',
      amount: refundAmount,
      date: dateStr,
      description: `Chi hoàn tiền khách hàng cho đơn hàng ${orderIdOrReqId} (${refundMethod || 'Chuyển khoản'})`
    };

    const nextLedger = [newTx, ...ledger];
    saveState('erp_ledger', nextLedger, setLedger);

    updateReturnStatus(orderIdOrReqId, 'REFUNDED', note || `Kế toán xác nhận đã hoàn tiền qua ${refundMethod || 'Chuyển khoản'}`);
  };

  // 11. Complaint (Ticket) management (CSKH)
  const addComplaint = (data) => {
    const newTicket = {
      id: `TKT-${Date.now()}`,
      ...data,
      status: 'OPEN',
      date: new Date().toLocaleDateString('vi-VN')
    };
    const next = [newTicket, ...complaints];
    saveState('erp_complaints', next, setComplaints);
    return newTicket;
  };

  const updateComplaintStatus = (id, status, assignedTo = null, resolution = '') => {
    const next = complaints.map(c => c.id === id ? { ...c, status, assignedTo: assignedTo || c.assignedTo, resolution } : c);
    saveState('erp_complaints', next, setComplaints);
  };

  // Ref to hold latest state for background timer without triggering effect re-subscriptions
  const stateRef = useRef({ orders, inventory, ledger, assemblyJobs });
  useEffect(() => {
    stateRef.current = { orders, inventory, ledger, assemblyJobs };
  }, [orders, inventory, ledger, assemblyJobs]);

  // Background interval check to auto-approve pending orders after 5 hours
  useEffect(() => {
    const checkPendingOrders = () => {
      const { orders: currentOrders, inventory: currentInventory, ledger: currentLedger, assemblyJobs: currentJobs } = stateRef.current;
      let orderChanged = false;
      let inventoryChanged = false;
      let ledgerChanged = false;
      let jobsChanged = false;

      let nextInventory = [...currentInventory];
      let nextLedger = [...currentLedger];
      let nextJobs = [...currentJobs];

      const updatedOrders = currentOrders.map(o => {
        // Process both PENDING (after 5h) and AWAITING_STOCK (re-check when stock comes in)
        const isPendingExpired = o.status === 'PENDING' && o.createdAtTime &&
          (Date.now() - o.createdAtTime) >= 5 * 60 * 60 * 1000;
        const isAwaitingStock = o.status === 'AWAITING_STOCK';

        if (isPendingExpired || isAwaitingStock) {
          // Check stock:
          let hasShortage = false;
          o.items?.forEach(item => {
            const invItem = nextInventory.find(inv =>
              String(inv.id) === String(item.productId) ||
              (inv.name && item.name && inv.name.trim().toLowerCase() === item.name.trim().toLowerCase())
            );
            if (invItem && invItem.stock < item.quantity) {
              hasShortage = true;
            }
          });

          if (!hasShortage) {
            orderChanged = true;
            inventoryChanged = true;
            // Deduct stock only for items found in local inventory
            nextInventory = nextInventory.map(invItem => {
              const match = o.items?.find(item =>
                String(item.productId) === String(invItem.id) ||
                (invItem.name && item.name && invItem.name.trim().toLowerCase() === item.name.trim().toLowerCase())
              );
              if (match) {
                return { ...invItem, stock: Math.max(0, invItem.stock - match.quantity) };
              }
              return invItem;
            });

            // Record INCOME transaction (only once – skip if AWAITING_STOCK re-confirming)
            if (!isAwaitingStock) {
              ledgerChanged = true;
              const dateStr = new Date().toLocaleDateString('vi-VN');
              const newTx = {
                id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
                type: 'INCOME',
                amount: o.totalAmount,
                date: dateStr,
                description: `Thu tiền đơn hàng bán lẻ ${o.orderId} (Hệ thống tự động duyệt sau 5h)`
              };
              nextLedger = [newTx, ...nextLedger];
            }

            // Launch assembly job if PC custom bundle
            const hasBundle = o.items?.some(item => item.selectedSpec?.pc_build_bundle);
            if (hasBundle) {
              const jobExists = nextJobs.some(j => j.orderId === o.orderId);
              if (!jobExists) {
                jobsChanged = true;
                const dateStr = new Date().toLocaleDateString('vi-VN');
                const bundleItems = o.items.map(item => ({
                  category: item.category || 'COMPONENT',
                  name: item.name || 'Linh Kiện Máy Tính'
                }));
                const newJob = {
                  id: `JOB-${Math.floor(900 + Math.random() * 99)}`,
                  orderId: o.orderId,
                  customer: o.customerName,
                  date: dateStr,
                  status: 'PENDING',
                  components: bundleItems,
                  checklist: { socketCheck: false, thermalPaste: false, cableRouting: false, biosBoot: false, stressTest: false }
                };
                nextJobs = [newJob, ...nextJobs];
              }
            }

            return { ...o, status: 'CONFIRMED', lastNote: 'Hệ thống tự động duyệt (Đủ tồn kho).' };
          } else {
            // Only transition PENDING → AWAITING_STOCK
            if (o.status === 'PENDING') {
              orderChanged = true;
              return { ...o, status: 'AWAITING_STOCK', lastNote: 'Hệ thống tự động chuyển Chờ hàng sau 5 tiếng chờ (Thiếu tồn kho).' };
            }
          }
        }
        return o;
      });

      if (orderChanged) {
        saveState('erp_orders', updatedOrders, setOrders);

        // Sync status to backend PostgreSQL
        const token = localStorage.getItem('token');
        if (token) {
          updatedOrders.forEach(o => {
            const oldOrder = currentOrders.find(old => old.orderId === o.orderId);
            if (oldOrder && oldOrder.status === 'PENDING' && o.status !== 'PENDING') {
              api.patch(`/orders/${o.orderId}/status`, {
                status: o.status,
                note: o.lastNote || 'Hệ thống tự động cập nhật sau 5 giờ'
              }).then(() => {
                console.log(`[CSDL] Tự động đồng bộ trạng thái đơn ${o.orderId} thành công.`);
              }).catch(err => {
                console.warn(`[CSDL] Lỗi hoặc không tìm thấy đơn ${o.orderId} trên backend database:`, err.message);
              });
            }
          });
        }
      }
      if (inventoryChanged) {
        saveState('erp_inventory', nextInventory, setInventory);
      }
      if (ledgerChanged) {
        saveState('erp_ledger', nextLedger, setLedger);
      }
      if (jobsChanged) {
        saveState('erp_jobs', nextJobs, setAssemblyJobs);
      }
    };

    checkPendingOrders();

    const interval = setInterval(checkPendingOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ERPContext.Provider value={{
      products,
      inventory,
      orders,
      assemblyJobs,
      employees,
      ledger,
      purchaseOrders,
      serialNumbers,
      attendanceLogs,
      leaveRequests,
      payrolls,
      returnRequests,
      complaints,
      loading,
      // System Notifications
      customNotifs,
      sendSystemNotification,
      // Order operations
      processCheckout,
      updateOrderDetails,
      updateOrderStatus,
      deliverOrder,
      claimOrderForDelivery,
      assignShipperToOrder,
      // Purchasing operations
      processGRN,
      approvePO,
      addPurchaseOrder,
      updatePurchaseOrderStatus,
      paySupplierPO,
      // Assembly operations
      updateAssemblyJob,
      createAssemblyJob,
      // HR operations
      updateAttendance,
      updateAttendanceLog,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      approveLeaveRequest,
      rejectLeaveRequest,
      submitPayrolls,
      approvePayrollByCEO,
      // Accounting operations
      processPayroll,
      disbursePayroll,
      disburseAllPayrolls,
      resetPayrollCycle,
      addLedgerEntry,
      // Warehouse operations
      updateThreshold,
      updateLocation,
      addProduct,
      updateProduct,
      deleteProduct,
      setInventory,
      // CSKH & Return operations
      addReturnRequest,
      updateReturnStatus,
      processRefund,
      addComplaint,
      updateComplaintStatus
    }}>
      {children}
    </ERPContext.Provider>
  );
};
