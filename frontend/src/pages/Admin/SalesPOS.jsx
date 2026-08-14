import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, Printer, FileText,
  BarChart2, DollarSign, Users, Award, ClipboardList, TrendingUp, Truck, X, Check,
  Eye, MapPin, Phone, User, Package, Calendar
} from 'lucide-react';

const parseDateVal = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const isDateInRange = (dateVal, startDate, endDate) => {
  if (!startDate && !endDate) return true;
  const d = parseDateVal(dateVal);
  if (!d) return true;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const itemYMD = `${yyyy}-${mm}-${dd}`;

  if (startDate && itemYMD < startDate) return false;
  if (endDate && itemYMD > endDate) return false;
  return true;
};

export default function SalesPOS() {
  const { inventory, processCheckout, orders = [], ledger = [], updateOrderStatus } = useERP();
  const { user, isCEO } = useAuth();
  const products = inventory || [];
  
  const isManager = ['SALES_MANAGER', 'CEO', 'ADMIN'].includes(user?.role);
  const canViewDashboard = ['SALES', 'SALES_MANAGER', 'CEO', 'ADMIN'].includes(user?.role);
  const [viewMode, setViewMode] = useState(isManager ? 'dashboard' : 'pos');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [posCart, setPosCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const filteredProducts = products.filter(p => {
    const name = p.name ? p.name.toLowerCase() : '';
    const category = p.category ? p.category.toLowerCase() : '';
    const term = searchTerm ? searchTerm.toLowerCase().trim() : '';
    return name.includes(term) || category.includes(term);
  });

  const addToCart = (product) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (id, change) => {
    setPosCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = item.quantity + change;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setPosCart(prev => prev.filter(item => item.product.id !== id));
  };

  const calculateTotal = () => {
    return posCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCheckout = () => {
    if (posCart.length === 0) return;
    
    const itemsForERP = posCart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      category: item.product.category,
      name: item.product.name,
      selectedSpec: item.selectedSpec
    }));

    // Call ERP process checkout to update inventory
    const orderId = processCheckout(customerName || 'Khách vãng lai', customerPhone || 'Không cung cấp', itemsForERP, 'POS');

    const finalReceipt = {
      orderId,
      customerName: customerName || 'Khách vãng lai',
      customerPhone: customerPhone || 'Không cung cấp',
      items: [...posCart],
      total: calculateTotal(),
      cashier: user?.fullname || 'Nhân viên quầy 01',
      time: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN')
    };
    
    setReceipt(finalReceipt);
    setCheckoutComplete(true);
    setPosCart([]);
    setCustomerName('');
    setCustomerPhone('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-warning" style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', fontWeight: 700 }}>Chờ Duyệt</span>;
      case 'WAITING_PAYMENT':
        return <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: 700 }}>Chờ Thanh Toán</span>;
      case 'DELIVERED':
        return <span className="badge badge-success" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Đã Giao</span>;
      case 'PROCESSING':
        return <span className="badge badge-info" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700 }}>Đang Xử Lý</span>;
      case 'AWAITING_STOCK':
        return <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: 700 }}>Chờ Linh Kiện</span>;
      case 'CONFIRMED':
        return <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700 }}>Đã Xác Nhận</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700 }}>Đã Hủy</span>;
      case 'READY_TO_SHIP':
        return <span className="badge badge-success" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Đã Xuất Kho</span>;
      case 'SHIPPED':
        return <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700 }}>Đang Giao</span>;
      case 'SHIPPING_FAILED':
        return <span className="badge badge-danger" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700 }}>Giao Thất Bại</span>;
      case 'RETURNING_TO_WAREHOUSE':
        return <span className="badge badge-warning" style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', fontWeight: 700 }}>Đang Trả Về Kho</span>;
      case 'RETURNING':
        return <span className="badge badge-warning" style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', fontWeight: 700 }}>Đang Trả Hàng</span>;
      case 'RETURNED':
        return <span className="badge badge-info" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Đã Hoàn Hàng</span>;
      case 'SENT':
        return <span className="badge badge-info" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700 }}>Đã Gửi NCC</span>;
      case 'RECEIVED':
        return <span className="badge badge-success" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Đã Nhận Hàng</span>;
      case 'COMPLETED':
      case 'DONE':
        return <span className="badge badge-success" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Hoàn Tất</span>;
      default:
        return <span className="badge badge-secondary" style={{ fontWeight: 700 }}>{status}</span>;
    }
  };

  // Managers/CEO Metrics
  const activeOrders = orders.filter(o => o.status !== 'CANCELLED');
  const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const categorySales = activeOrders.reduce((acc, ord) => {
    (ord.items || []).forEach(item => {
      const cat = item.category || 'Khác';
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      acc[cat] = (acc[cat] || 0) + itemTotal;
    });
    return acc;
  }, {});

  const filteredOrders = orders.filter(o => {
    const cust = (o.customerName || '').toLowerCase();
    const phone = (o.phone || '');
    const id = (o.orderId || '').toLowerCase();
    const term = orderSearch.toLowerCase().trim();
    const matchSearch = cust.includes(term) || phone.includes(term) || id.includes(term);
    const matchStatus = orderStatusFilter === 'ALL'
      ? true
      : orderStatusFilter === 'PENDING' || orderStatusFilter === 'PROCESSING'
        ? (o.status === 'PENDING' || o.status === 'PROCESSING' || o.status === 'WAITING_PAYMENT')
        : o.status === orderStatusFilter;
    const matchDate = isDateInRange(o.date || o.createdAt, orderStartDate, orderEndDate);
    return matchSearch && matchStatus && matchDate;
  });

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING': return 'Chờ Duyệt';
      case 'WAITING_PAYMENT': return 'Chờ Thanh Toán';
      case 'CONFIRMED': return 'Đã Xác Nhận';
      case 'PACKED': return 'Đã Đóng Gói';
      case 'READY_TO_SHIP': return 'Chờ Shipper Lấy';
      case 'SHIPPED': return 'Đang Giao';
      case 'DELIVERED': return 'Đã Giao';
      case 'PROCESSING': return 'Đang Xử Lý';
      case 'AWAITING_STOCK': return 'Chờ Linh Kiện';
      case 'CANCELLED': return 'Đã Hủy';
      case 'SHIPPING_FAILED': return 'Giao Thất Bại';
      case 'COMPLETED':
      case 'DONE': return 'Hoàn Tất';
      default: return status;
    }
  };

  const handlePrintReport = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('vi-VN');

    const productCounts = {};
    activeOrders.forEach(ord => {
      (ord.items || []).forEach(item => {
        const n = item.name || 'San pham';
        productCounts[n] = (productCounts[n] || 0) + (item.quantity || 1);
      });
    });
    const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const totalAllCat = Object.values(categorySales).reduce((a, b) => a + b, 0) || 1;
    const uniqueCustomers = new Set(activeOrders.map(o => o.phone).filter(Boolean)).size;
    const avgOrder = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

    const catRowsHtml = Object.entries(categorySales)
      .sort((a, b) => b[1] - a[1])
      .map(([c, t]) => {
        const pct = Math.round((t / totalAllCat) * 100);
        return '<tr><td>' + c + '</td><td>' + formatPrice(t) + '</td><td>' + pct + '%</td></tr>';
      }).join('');

    const orderRowsHtml = filteredOrders.map(o =>
      '<tr><td><b>' + o.orderId + '</b></td><td>' + (o.customerName || '') + (o.phone ? ' / ' + o.phone : '') +
      '</td><td>' + formatPrice(o.totalAmount) + '</td><td>' + (o.date || '') + '</td><td>' + getStatusText(o.status) + '</td></tr>'
    ).join('');

    const topRowsHtml = topProducts.map(([n, q], i) =>
      '<tr><td>' + (i + 1) + '</td><td>' + n + '</td><td><b>' + q + '</b></td></tr>'
    ).join('');

    const css = [
      '* { box-sizing: border-box; margin: 0; padding: 0; }',
      'body { font-family: "Inter", -apple-system, sans-serif; font-size: 14px; color: #1e293b; padding: 16px 20px; }',
      '.hd { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #4f46e5; padding-bottom: 10px; margin-bottom: 12px; }',
      '.hd h1 { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: 0.5px; }',
      '.hd p { font-size: 11px; color: #64748b; margin-top: 3px; }',
      '.ri { text-align: right; }',
      '.ri h2 { font-size: 13px; font-weight: 700; color: #1e293b; }',
      '.ri p { font-size: 11px; color: #64748b; margin-top: 2px; }',
      '.kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }',
      '.kc { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }',
      '.kc .lb { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }',
      '.kc .vl { font-size: 16px; font-weight: 800; margin: 3px 0 2px; }',
      '.kc .sb { font-size: 10px; color: #94a3b8; }',
      '.g .vl { color: #059669; } .b .vl { color: #2563eb; } .i .vl { color: #4f46e5; }',
      '.sec { margin-bottom: 10px; }',
      '.st { font-size: 12px; font-weight: 700; color: #1e293b; border-left: 3px solid #4f46e5; padding-left: 6px; margin-bottom: 6px; }',
      'table { width: 100%; border-collapse: collapse; font-size: 12px; }',
      'thead tr { background: #f1f5f9; }',
      'th { padding: 6px 8px; text-align: left; font-weight: 700; color: #475569; border-bottom: 1.5px solid #e2e8f0; }',
      'td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; line-height: 1.4; }',
      'tbody tr:last-child td { border-bottom: none; }',
      '.tc { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; page-break-inside: avoid; break-inside: avoid; }',
      '.ft { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }',
      '.ft p { font-size: 10px; color: #94a3b8; }',
      '.sig { text-align: center; }',
      '.sig .ln { width: 120px; border-top: 1px solid #334155; margin: 28px auto 3px; }',
      '.sig p { font-size: 11px; color: #475569; font-weight: 600; }',
      '@media print { body { padding: 0; } @page { size: A4 portrait; margin: 8mm 10mm; } }'
    ].join(' ');

    const bodyHtml = [
      '<div class="hd">',
      '  <div><h1>AETHERPC ERP</h1><p>He thong Quan ly Ban linh kien may tinh</p></div>',
      '  <div class="ri"><h2>BAO CAO DOANH SO BAN HANG</h2><p>' + dateStr + ' &mdash; ' + timeStr + '</p>',
      '  <p style="color:#4f46e5;font-weight:600">Nguoi lap: ' + (user?.fullname || user?.username || 'Quan ly') + '</p></div>',
      '</div>',
      '<div class="kpi">',
      '  <div class="kc g"><div class="lb">Doanh Thu Thuan</div><div class="vl">' + formatPrice(totalRevenue) + '</div><div class="sb">Chua tinh don da huy</div></div>',
      '  <div class="kc b"><div class="lb">Tong Don Hang</div><div class="vl">' + activeOrders.length + ' don</div><div class="sb">Da loai bo don huy</div></div>',
      '  <div class="kc i"><div class="lb">Gia Tri TB / Don</div><div class="vl">' + formatPrice(avgOrder) + '</div><div class="sb">Tinh tren moi don</div></div>',
      '  <div class="kc"><div class="lb">Khach Hang</div><div class="vl">' + uniqueCustomers + ' khach</div><div class="sb">So dt duy nhat</div></div>',
      '</div>',
      '<div class="sec"><div class="st">Danh Sach Don Hang</div>',
      '<table><thead><tr><th style="width:16%">Ma Don</th><th style="width:35%">Khach Hang</th><th style="width:20%">Tong Tien</th><th style="width:14%">Ngay</th><th style="width:15%">Trang Thai</th></tr></thead>',
      '<tbody>' + (orderRowsHtml || '<tr><td colspan="5" style="text-align:center;color:#999">Khong co don hang</td></tr>') + '</tbody></table></div>',
      '<div class="tc">',
      '  <div class="sec"><div class="st">Phan Phoi Doanh So Danh Muc</div>',
      '  <table><thead><tr><th>Danh Muc</th><th>Doanh Thu</th><th>Ty Le</th></tr></thead>',
      '  <tbody>' + (catRowsHtml || '<tr><td colspan="3" style="text-align:center;color:#999">Chua co du lieu</td></tr>') + '</tbody></table></div>',
      '  <div class="sec"><div class="st">Linh Kien Ban Chay Nhat (Top 7)</div>',
      '  <table><thead><tr><th style="width:8%">#</th><th>San Pham</th><th style="width:15%">SL</th></tr></thead>',
      '  <tbody>' + (topRowsHtml || '<tr><td colspan="3" style="text-align:center;color:#999">Chua co du lieu</td></tr>') + '</tbody></table></div>',
      '</div>',
      '<div class="ft">',
      '  <p>Bao cao duoc tao tu dong boi AETHERPC ERP &mdash; ' + timeStr + ' ' + dateStr + '</p>',
      '  <div class="sig"><div class="ln"></div><p>Ky xac nhan</p></div>',
      '</div>'
    ].join('\n');

    const fullHtml = '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/><title>Bao Cao Doanh So</title><style>' + css + '</style></head><body>' + bodyHtml + '</body></html>';

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflowX: 'hidden', boxSizing: 'border-box', minWidth: 0 }}>
      {viewMode === 'dashboard' ? (
        /* DASHBOARD VIEW MODE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-title)' }}>Báo Cáo & Quản Lý Doanh Số</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Theo dõi kết quả bán hàng, doanh thu và quản lý danh sách đơn hàng ERP.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                onClick={handlePrintReport}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.1rem', fontSize: '0.875rem' }}
              >
                <FileText size={16} />
                In Báo Cáo
              </button>
              {!isCEO && (
                <button 
                  onClick={() => setViewMode('pos')} 
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.1rem', fontSize: '0.875rem' }}
                >
                  <ShoppingCart size={16} />
                  Vào Quầy Bán Hàng
                </button>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card-glass" style={{ borderLeft: '4px solid var(--primary)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Doanh Thu Thuần</h4>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)', margin: '0.2rem 0 0' }}>{formatPrice(totalRevenue)}</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Chưa tính đơn đã hủy</span>
              </div>
            </div>

            <div className="card-glass" style={{ borderLeft: '4px solid var(--info)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Tổng Đơn Hàng</h4>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0 0' }}>{activeOrders.length} đơn</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Đã loại bỏ đơn hủy</span>
              </div>
            </div>

            <div className="card-glass" style={{ borderLeft: '4px solid var(--accent)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Giá Trị TB/Đơn</h4>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0 0' }}>
                  {formatPrice(activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0)}
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tính trên mỗi đơn hàng</span>
              </div>
            </div>

            <div className="card-glass" style={{ borderLeft: '4px solid var(--warning)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Khách Hàng</h4>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0 0' }}>
                  {new Set(activeOrders.map(o => o.phone).filter(Boolean)).size} khách
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Số điện thoại duy nhất</span>
              </div>
            </div>
          </div>

          {/* Section 2: Full-Width Sổ Đăng Ký Đơn Hàng Card */}
          <div className="card-glass" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'nowrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>
                <ClipboardList size={18} style={{ color: 'var(--primary)' }} />
                Sổ Đăng Ký Đơn Hàng
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', flexShrink: 0 }}>
                {/* Custom Date Range Picker */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: (orderStartDate || orderEndDate) ? '#eff6ff' : '#ffffff',
                  border: (orderStartDate || orderEndDate) ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.8rem'
                }}>
                  <span style={{ color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} style={{ color: '#2563eb' }} />
                    Từ:
                  </span>
                  <input
                    type="date"
                    value={orderStartDate}
                    onChange={(e) => setOrderStartDate(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.78rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  />
                  <span style={{ color: '#64748b', fontWeight: 700 }}>Đến:</span>
                  <input
                    type="date"
                    value={orderEndDate}
                    onChange={(e) => setOrderEndDate(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.78rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  />
                  {(orderStartDate || orderEndDate) && (
                    <button
                      onClick={() => {
                        setOrderStartDate('');
                        setOrderEndDate('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0 0.2rem'
                      }}
                      title="Xóa khoảng thời gian"
                    >
                      ✕ Xóa
                    </button>
                  )}
                </div>

                {/* Search Box */}
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Tìm mã đơn, tên KH, SĐT..." 
                    style={{ paddingLeft: '2.2rem', paddingRight: '0.5rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.8rem', width: '100%' }}
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Filter tabs by status */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'PENDING', label: 'Chờ duyệt / Đang xử lý' },
                { key: 'CONFIRMED', label: 'Đã xác nhận' },
                { key: 'AWAITING_STOCK', label: 'Chờ linh kiện' },
                { key: 'READY_TO_SHIP', label: 'Chờ shipper' },
                { key: 'SHIPPED', label: 'Đang giao' },
                { key: 'SHIPPING_FAILED', label: 'Giao thất bại' },
                { key: 'DELIVERED', label: 'Đã giao' },
                { key: 'CANCELLED', label: 'Đã hủy' }
              ].map(tab => {
                const dateFilteredOrders = orders.filter(o => isDateInRange(o.date || o.createdAt, orderStartDate, orderEndDate));
                const count = tab.key === 'ALL'
                  ? dateFilteredOrders.length
                  : tab.key === 'PENDING'
                    ? dateFilteredOrders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING' || o.status === 'WAITING_PAYMENT').length
                    : dateFilteredOrders.filter(o => o.status === tab.key).length;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setOrderStatusFilter(tab.key)}
                    style={{
                      padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                      backgroundColor: orderStatusFilter === tab.key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid', borderColor: orderStatusFilter === tab.key ? 'var(--primary)' : 'var(--border-glass)',
                      borderRadius: 'var(--radius-sm)', color: orderStatusFilter === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.25rem'
                    }}
                  >
                    {tab.label}
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1px 6px', fontSize: '0.65rem' }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', maxHeight: '440px', minHeight: '380px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, width: '140px' }}>Mã Đơn</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, width: '220px' }}>Khách Hàng</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, width: '140px' }}>Tổng Tiền</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, width: '110px' }}>Ngày Đặt</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600, width: '140px' }}>Trạng Thái</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 600 }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Không tìm thấy đơn hàng phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(ord => (
                      <tr key={ord.orderId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem' }}>{ord.orderId}</div>
                          <span style={{ fontSize: '0.65rem', backgroundColor: ord.type === 'POS' ? 'rgba(59,130,246,0.15)' : 'rgba(99,102,241,0.15)', color: ord.type === 'POS' ? 'var(--info)' : 'var(--primary)', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>{ord.type || 'ONLINE'}</span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>
                          <div style={{ color: '#0f172a', fontWeight: 700 }}>{ord.customerName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{ord.phone}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>
                          <strong style={{ color: 'var(--success)', fontSize: '0.85rem' }}>{formatPrice(ord.totalAmount)}</strong>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ord.date}</td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>{getStatusBadge(ord.status)}</td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'nowrap' }}>
                            <button
                              onClick={() => setSelectedDetailOrder(ord)}
                              title="Xem chi tiết đơn hàng"
                              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: '4px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                            >
                              <Eye size={13} /> Chi tiết
                            </button>

                            {/* Phê duyệt đơn hàng mới (PENDING / PROCESSING) → CONFIRMED */}
                            {(ord.status === 'PROCESSING' || ord.status === 'PENDING') && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Xác nhận PHÊ DUYỆT đơn hàng ${ord.orderId} để chuyển sang bộ phận kho?`)) {
                                    updateOrderStatus(ord.orderId, 'CONFIRMED');
                                    alert(`✅ Đã phê duyệt đơn ${ord.orderId}! Đơn hàng hiện đã ở trạng thái xác nhận.`);
                                  }
                                }}
                                title="Phê duyệt đơn hàng"
                                style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: '4px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                              >
                                <Check size={13} /> Duyệt
                              </button>
                            )}

                            {/* Hủy đơn */}
                            {(ord.status === 'PENDING' || ord.status === 'PROCESSING' || ord.status === 'AWAITING_STOCK') && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Hủy đơn hàng ${ord.orderId}? Hành động này không thể hoàn tác.`)) {
                                    updateOrderStatus(ord.orderId, 'CANCELLED');
                                  }
                                }}
                                title="Hủy đơn hàng"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}
                              >
                                <X size={13} /> Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: 2-Column Grid for Analytics (Doanh Số Danh Mục & Linh Kiện Bán Chạy) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* Left Analytics: Category Sales */}
            <div className="card-glass" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                <BarChart2 size={16} style={{ color: 'var(--primary)' }} />
                Phân Phối Doanh Số Danh Mục
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {Object.keys(categorySales).length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>
                    Chưa có dữ liệu doanh số
                  </div>
                ) : (
                  Object.entries(categorySales)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, total]) => {
                      const totalAllCat = Object.values(categorySales).reduce((a, b) => a + b, 0) || 1;
                      const percent = Math.round((total / totalAllCat) * 100);
                      return (
                        <div key={cat}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 600 }}>{cat}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{formatPrice(total)} ({percent}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Right Analytics: Best-Selling Components */}
            <div className="card-glass" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                <Award size={16} style={{ color: 'var(--warning)' }} />
                Linh Kiện Bán Chạy Nhất
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                {(() => {
                  const productCounts = {};
                  activeOrders.forEach(ord => {
                    (ord.items || []).forEach(item => {
                      const prodName = item.name || 'Sản phẩm ẩn';
                      productCounts[prodName] = (productCounts[prodName] || 0) + (item.quantity || 1);
                    });
                  });
                  const topProducts = Object.entries(productCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                  if (topProducts.length === 0) {
                    return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>Chưa có dữ liệu sản phẩm</div>;
                  }

                  return topProducts.map(([name, qty]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.6rem 0.75rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <span style={{ color: '#0f172a', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</span>
                      <span className="badge badge-success" style={{ fontSize: '0.725rem', fontWeight: 800, flexShrink: 0, padding: '3px 8px' }}>{qty} CHIẾC</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* POS VIEW MODE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-title)' }}>Quầy Bán Hàng POS</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Giao dịch trực tiếp tại quầy và ghi nhận doanh thu tức thời.
              </p>
            </div>
            {canViewDashboard && (
              <button 
                onClick={() => setViewMode('dashboard')} 
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
              >
                <BarChart2 size={18} />
                Quản Lý Đơn & Báo Cáo
              </button>
            )}
          </div>

      <div style={{ display: 'grid', gridTemplateColumns: '4fr 3fr', gap: '1.5rem', alignItems: 'stretch' }}>
        {/* Left column: Products Selection */}
        <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Quét mã vạch hoặc tìm nhanh linh kiện..."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {filteredProducts.map((p, idx) => (
              <div key={`${p.id}-${idx}`} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.01)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{p.category}</span>
                    {p.stock > 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tồn: {p.stock}</span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>ĐẶT TRƯỚC (Hết kho)</span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '0.9rem', color: '#ffffff', marginTop: '0.25rem' }}>{p.name}</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '0.9rem' }}>
                    {formatPrice(p.price)}
                  </span>
                  <button onClick={() => addToCart(p)} className="btn btn-primary" style={{ padding: '0.4rem', borderRadius: '4px' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Current POS Order */}
        <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', maxHeight: '75vh' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={18} />
            Đơn Hóa Đơn Hiện Tại
          </h3>

          {/* Cart list in POS */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', paddingRight: '0.25rem' }}>
            {posCart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Hóa đơn trống. Vui lòng thêm linh kiện bên trái.
              </div>
            ) : (
              posCart.map(item => (
                <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, color: '#ffffff' }}>
                      {item.product.name}
                      {item.quantity > item.product.stock && (
                        <span style={{ 
                          marginLeft: '0.5rem', 
                          fontSize: '0.7rem', 
                          color: 'var(--warning)', 
                          padding: '1px 6px', 
                          backgroundColor: 'rgba(245,158,11,0.1)', 
                          borderRadius: '4px', 
                          border: '1px solid rgba(245,158,11,0.2)',
                          display: 'inline-block',
                          whiteSpace: 'nowrap'
                        }}>
                          Chờ nhập ({item.quantity - item.product.stock})
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatPrice(item.product.price)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 1rem' }}>
                    <button onClick={() => updateQty(item.product.id, -1)} style={{ background: 'none', border: '1px solid var(--border-glass)', color: '#fff', width: '22px', height: '22px', cursor: 'pointer' }}>-</button>
                    <span style={{ fontWeight: 'bold' }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} style={{ background: 'none', border: '1px solid var(--border-glass)', color: '#fff', width: '22px', height: '22px', cursor: 'pointer' }}>+</button>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '90px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', marginLeft: '0.75rem', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cashier input details */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Tên khách hàng..."
                className="form-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ padding: '0.5rem' }}
              />
              <input
                type="text"
                placeholder="Số điện thoại..."
                className="form-input"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ padding: '0.5rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-glass)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tổng tiền thanh toán:</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--success)' }}>{formatPrice(calculateTotal())}</strong>
            </div>

            <button
              onClick={handleCheckout}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
              disabled={posCart.length === 0}
            >
              Thanh Toán & In Hóa Đơn
            </button>
          </div>
        </div>
      </div>

      {/* POS Receipt Modal */}
      {checkoutComplete && receipt && (
        <div style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card-glass" style={{
            width: '380px',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            padding: '2rem',
            borderRadius: '0',
            fontFamily: 'monospace'
          }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ color: '#0f172a', fontSize: '1.25rem' }}>HÓA ĐƠN BÁN LẺ</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>AETHERPC TECHNOLOGY SHOP</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Số: {receipt.orderId}</p>
            </div>

            <div style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
              <p>Khách hàng: {receipt.customerName}</p>
              <p>SĐT: {receipt.customerPhone}</p>
              <p>Thời gian: {receipt.time}</p>
              <p>Thu ngân: {receipt.cashier}</p>
            </div>

            <div style={{ borderBottom: '1px dashed #cbd5e1', borderTop: '1px dashed #cbd5e1', padding: '0.5rem 0', marginBottom: '1rem', fontSize: '0.75rem' }}>
              {receipt.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>{item.product.name.substring(0, 20)}.. x{item.quantity}</span>
                  <span>{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              <span>TỔNG CỘNG:</span>
              <span>{formatPrice(receipt.total)}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { setCheckoutComplete(false); setReceipt(null); }}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', backgroundColor: '#0f172a' }}
              >
                Hoàn tất giao dịch
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* ORDER DETAIL MODAL */}
      {selectedDetailOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }} onClick={() => setSelectedDetailOrder(null)}>
          <div style={{
            width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto',
            padding: '1.75rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
            borderRadius: '16px', boxShadow: '0 25px 60px rgba(15, 23, 42, 0.18)'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0, fontWeight: 800, letterSpacing: '-0.01em' }}>
                    Chi Tiết Đơn: {selectedDetailOrder.orderId}
                  </h2>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: selectedDetailOrder.type === 'POS' ? '#eff6ff' : '#f0fdf4', color: selectedDetailOrder.type === 'POS' ? '#2563eb' : '#16a34a', border: selectedDetailOrder.type === 'POS' ? '1px solid #bfdbfe' : '1px solid #bbf7d0', fontWeight: 700 }}>
                    {selectedDetailOrder.type || 'ONLINE'}
                  </span>
                </div>
                <span style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '2px', display: 'block' }}>Ngày tạo đơn: {selectedDetailOrder.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {getStatusBadge(selectedDetailOrder.status)}
                <button onClick={() => setSelectedDetailOrder(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Customer Info Card */}
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <User size={13}/> Khách Hàng
                </div>
                <strong style={{ color: '#0f172a', fontWeight: 800 }}>{selectedDetailOrder.customerName || 'N/A'}</strong>
              </div>
              <div>
                <div style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <Phone size={13}/> Số Điện Thoại
                </div>
                <strong style={{ color: '#2563eb', fontWeight: 800 }}>{selectedDetailOrder.phone || 'N/A'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <MapPin size={13}/> Địa Chỉ Giao Hàng
                </div>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedDetailOrder.shippingAddress || 'Không cung cấp'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Package size={14}/> Danh Sách Sản Phẩm ({(selectedDetailOrder.items || []).length})
              </h4>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1', fontWeight: 700 }}>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Sản Phẩm</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', width: '60px' }}>SL</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '110px' }}>Đơn Giá</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '110px' }}>Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDetailOrder.items || []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.6rem 0.75rem', color: '#0f172a', fontWeight: 700 }}>
                          <div>{item.name || item.productId}</div>
                          {item.category && <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{item.category}</span>}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>x{item.quantity}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#475569' }}>{formatPrice(item.price)}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{formatPrice((item.price || 0) * (item.quantity || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment & Total summary */}
            <div style={{ padding: '0.875rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 800 }}>
                <span style={{ color: '#0f172a' }}>Tổng Thanh Toán:</span>
                <span style={{ color: '#16a34a', fontSize: '1.25rem', fontWeight: 800 }}>{formatPrice(selectedDetailOrder.totalAmount)}</span>
              </div>
              {selectedDetailOrder.lastNote && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#be123c', fontStyle: 'italic', fontWeight: 600 }}>
                  Ghi chú lịch sử: {selectedDetailOrder.lastNote}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              {selectedDetailOrder.status === 'PROCESSING' && (
                <button
                  onClick={() => {
                    if (window.confirm(`Phê duyệt đơn hàng ${selectedDetailOrder.orderId}?`)) {
                      updateOrderStatus(selectedDetailOrder.orderId, 'CONFIRMED');
                      setSelectedDetailOrder(prev => ({ ...prev, status: 'CONFIRMED' }));
                      alert(`✅ Đã phê duyệt đơn hàng ${selectedDetailOrder.orderId}!`);
                    }
                  }}
                  className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: '#16a34a', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '8px' }}>
                  <Check size={14} /> Duyệt Đơn
                </button>
              )}
              <button onClick={() => setSelectedDetailOrder(null)} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
