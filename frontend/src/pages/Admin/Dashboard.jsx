import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useERP } from '../../context/ERPContext';
import { api } from '../../services/api';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement,
  LineElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { DollarSign, ShoppingBag, AlertTriangle, Users, TrendingUp, Truck, Wrench, Bell, Check, ArrowRight, Eye, X, Package, Calendar } from 'lucide-react';
import OrderDetailModal from '../../components/OrderDetailModal';

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

const isDateInFilter = (dateVal, period, customStart, customEnd) => {
  if (period === 'ALL') return true;
  const d = parseDateVal(dateVal);
  if (!d) return true;

  const now = new Date();
  
  const toYMD = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const itemYMD = toYMD(d);
  const todayYMD = toYMD(now);

  if (period === 'TODAY') {
    return itemYMD === todayYMD;
  }

  if (period === 'THIS_WEEK') {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return d >= monday && d <= sunday;
  }

  if (period === 'THIS_MONTH') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  if (period === 'THIS_QUARTER') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const itemQuarter = Math.floor(d.getMonth() / 3);
    return itemQuarter === currentQuarter && d.getFullYear() === now.getFullYear();
  }

  if (period === 'THIS_YEAR') {
    return d.getFullYear() === now.getFullYear();
  }

  if (period === 'CUSTOM') {
    if (customStart && itemYMD < customStart) return false;
    if (customEnd && itemYMD > customEnd) return false;
    return true;
  }

  return true;
};

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { isCEO, isAdmin } = useAuth();
  const { orders, inventory, employees, purchaseOrders, approvePO, assemblyJobs = [], payrolls = [], approvePayrollByCEO, leaveRequests = [], approveLeaveRequest, rejectLeaveRequest } = useERP();

  const [quotedOrders, setQuotedOrders] = useState([]);
  const [loadingQuoted, setLoadingQuoted] = useState(false);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);
  const [selectedDetailPO, setSelectedDetailPO] = useState(null);
  const [showKPIDetailModal, setShowKPIDetailModal] = useState(false);
  const [dateFilterPeriod, setDateFilterPeriod] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchQuotedOrders = async () => {
    setLoadingQuoted(true);
    try {
      const res = await api.get('/purchasing/orders');
      if (res && res.success) {
        setQuotedOrders((res.data || []).filter(po => po.status === 'QUOTED'));
      }
    } catch (e) {
      console.warn('Dashboard PO fetch error:', e);
    }
    setLoadingQuoted(false);
  };

  useEffect(() => {
    fetchQuotedOrders();
  }, []);

  const handleApproveQuotedPO = async (poId, poNumber) => {
    if (!window.confirm(`Duyệt báo giá đơn hàng ${poNumber}? Đơn hàng sẽ trở thành PO chính thức và phát hành phiếu nhận kho.`)) return;
    try {
      const res = await api.patch(`/purchasing/orders/${poId}/status`, { status: 'PO' });
      if (res && res.success) {
        alert(`✅ Đã duyệt báo giá cho đơn hàng ${poNumber} thành công! Đã chuyển sang trạng thái PO & tự động phát hành phiếu nhập kho.`);
        fetchQuotedOrders();
      }
    } catch (e) {
      alert('Lỗi duyệt PO: ' + e.message);
    }
  };

  // Filtered Datasets for Dashboard Tables & Charts
  const filteredOrders = orders.filter(o => isDateInFilter(o.date || o.createdAt, dateFilterPeriod, customStartDate, customEndDate));
  const filteredQuotedOrders = quotedOrders.filter(po => isDateInFilter(po.createdAt || po.date, dateFilterPeriod, customStartDate, customEndDate));
  const filteredAssemblyJobs = (assemblyJobs || []).filter(j => isDateInFilter(j.createdAt || j.date, dateFilterPeriod, customStartDate, customEndDate));

  const totalRevenueVal = filteredOrders.reduce((sum, item) => sum + item.totalAmount, 0);
  const lowStockCount = inventory.filter(item => item.stock <= item.threshold).length;
  const readyToShipCount = filteredOrders.filter(o => o.status === 'READY_TO_SHIP').length;
  const assemblingJobsCount = filteredAssemblyJobs.filter(j => j.status === 'ASSEMBLING').length;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // KPI Stats data
  const stats = [
    { label: 'Tổng doanh thu', value: formatPrice(totalRevenueVal), change: 'Tính từ tất cả giao dịch', icon: <DollarSign size={22} />, color: 'var(--success)' },
    { label: 'Đơn hàng sổ cái', value: filteredOrders.length.toString(), change: 'Cả trực tuyến & tại quầy', icon: <ShoppingBag size={22} />, color: 'var(--secondary)' },
    { label: 'Cảnh báo tồn kho thấp', value: `${lowStockCount} linh kiện`, change: 'Yêu cầu lập phiếu GRN NCC', icon: <AlertTriangle size={22} />, color: 'var(--warning)' },
    { label: 'Nhân sự hoạt động', value: `${employees.length} thành viên`, change: 'Chấm công hoàn chỉnh', icon: <Users size={22} />, color: 'var(--accent)' },
    { label: 'Đơn chờ xuất kho', value: `${readyToShipCount} đơn`, change: 'Chờ Warehouse bàn giao', icon: <Truck size={22} />, color: '#10b981' },
    { label: 'Đang lắp ráp (QA)', value: `${assemblingJobsCount} bộ PC`, change: 'Kỹ thuật viên đang xử lý', icon: <Wrench size={22} />, color: '#0ea5e9' }
  ];

  // Dynamic Sales Trend calculation (by date)
  const salesByDate = {};
  const reversedOrders = [...filteredOrders].reverse();
  reversedOrders.forEach(order => {
    const d = order.date;
    salesByDate[d] = (salesByDate[d] || 0) + order.totalAmount;
  });

  const rawLabels = Object.keys(salesByDate);
  const rawData = Object.values(salesByDate).map(val => val / 1000000); // Convert to Million VND

  // Ensure default points if not enough dates exist
  const salesLabels = rawLabels.length >= 3 ? rawLabels : ['15/06', '16/06', '17/06', '18/06', '19/06'];
  const salesValues = rawData.length >= 3 ? rawData : [18.49, 8.39, 24.49, 1.39, 3.25];

  // Sales Trend Chart Data
  const salesData = {
    labels: salesLabels,
    datasets: [
      {
        label: 'Doanh thu (Triệu VNĐ)',
        data: salesValues,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Dynamic Category distribution calculation with Vietnamese translation
  const CATEGORY_MAP_VN = {
    'CPU': 'Vi Xử Lý (CPU)',
    'MAINBOARD': 'Bo Mạch Chủ',
    'RAM': 'Bộ Nhớ RAM',
    'VGA': 'Card Đồ Họa (VGA)',
    'STORAGE': 'Ổ Cứng Lưu Trữ',
    'PSU': 'Nguồn Máy Tính (PSU)',
    'CASE': 'Vỏ Máy Tính (Case)',
    'COOLER': 'Tản Nhiệt PC',
    'MONITOR': 'Màn Hình',
    'KEYBOARD': 'Bàn Phím',
    'MOUSE': 'Chuột Máy Tính',
    'OTHER': 'Linh Kiện Khác'
  };

  const categoryCounts = {};
  filteredOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const rawCat = (item.category || 'OTHER').toUpperCase();
        const catVN = CATEGORY_MAP_VN[rawCat] || rawCat;
        categoryCounts[catVN] = (categoryCounts[catVN] || 0) + (item.quantity || 1);
      });
    }
  });

  const rawCatLabels = Object.keys(categoryCounts);
  const rawCatValues = Object.values(categoryCounts);

  const categoryLabels = rawCatLabels.length > 0 
    ? rawCatLabels 
    : ['Card Đồ Họa (VGA)', 'Vi Xử Lý (CPU)', 'Bo Mạch Chủ', 'Bộ Nhớ RAM', 'Linh Kiện Khác'];
  const categoryValues = rawCatValues.length > 0 ? rawCatValues : [3, 2, 1, 1, 1];

  // Category Distribution Data
  const categoryData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryValues,
        backgroundColor: [
          '#d946ef', // Magenta
          '#6366f1', // Indigo
          '#0ea5e9', // Sky Blue
          '#10b981', // Emerald
          '#f59e0b', // Amber
          '#64748b'  // Slate Muted
        ],
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter' }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#94a3b8' }
      }
    }
  };

  return (
    <div style={{ padding: '1.25rem 1.5rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header with Integrated Date Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 16px rgba(15,23,42,0.04)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-title)', color: '#0f172a', margin: 0 }}>Bảng Điều Hành Ban Giám Đốc</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
            Báo cáo thống kê hiệu năng vận hành và tình hình doanh thu thời gian thực.
          </p>
        </div>

        {/* Date Filter Bar UI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 800, fontSize: '0.825rem', backgroundColor: '#eff6ff', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <Calendar size={16} />
            <span>Bộ Lọc Thời Gian:</span>
          </div>

          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'TODAY', label: 'Hôm nay' },
              { key: 'THIS_WEEK', label: 'Tuần này' },
              { key: 'THIS_MONTH', label: 'Tháng này' },
              { key: 'THIS_QUARTER', label: 'Quý này' },
              { key: 'THIS_YEAR', label: 'Năm nay' },
              { key: 'CUSTOM', label: 'Tùy chọn' }
            ].map(p => {
              const active = dateFilterPeriod === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setDateFilterPeriod(p.key)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: active ? 800 : 600,
                    borderRadius: '8px',
                    border: active ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: active ? '#2563eb' : '#ffffff',
                    color: active ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {dateFilterPeriod === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', color: '#0f172a' }}
              />
              <span style={{ color: '#64748b', fontWeight: 700 }}>-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', color: '#0f172a' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* CEO Notification Banner for QUOTED POs */}
      {quotedOrders.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.35rem',
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1px solid #fde68a',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.12)',
          flexWrap: 'wrap', gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '42px', height: '42px', backgroundColor: '#f59e0b',
              borderRadius: '10px', color: '#ffffff', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              <Bell size={22} style={{ animation: 'pulse 2s infinite' }} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#92400e', margin: 0, letterSpacing: '0.3px' }}>
                🔔 CẦN CEO DUYỆT BÁO GIÁ MUA HÀNG
              </h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#b45309', lineHeight: 1.4 }}>
                Có <strong style={{ color: '#78350f', fontSize: '0.95rem', fontWeight: 900 }}>{quotedOrders.length} đơn hàng</strong> từ Nhà Cung Cấp đã gửi báo giá chi tiết, đang chờ Ban Giám Đốc duyệt!
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/purchasing')}
            className="btn shadow-glow hover-scale"
            style={{
              padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 800,
              borderRadius: '10px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            Vào Mua Hàng Duyệt Ngay <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* CEO Notification Banner for PAYROLL Approval */}
      {payrolls.length > 0 && payrolls[0]?.status === 'SUBMITTED_TO_CEO' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.35rem',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
          flexWrap: 'wrap', gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '42px', height: '42px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }}>
                💵 CẦN CEO PHÊ DUYỆT BẢNG LƯƠNG NHÂN SỰ THÁNG NÀY
              </h4>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#ecfdf5' }}>
                Bộ phận HR đã lập & gửi bảng lương tháng này cho <strong style={{ color: '#fef08a', fontSize: '0.92rem' }}>{payrolls.length} nhân viên</strong> (Tổng quỹ lương: <strong style={{ color: '#fef08a', fontSize: '0.95rem' }}>{formatPrice(payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0))}</strong>). Đang chờ CEO phê duyệt!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Xác nhận PHÊ DUYỆT bảng lương tháng này của doanh nghiệp? Hệ thống sẽ chuyển lệnh chi lương sang cho bộ phận Kế toán.')) {
                approvePayrollByCEO();
              }
            }}
            className="btn shadow-glow"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 900, borderRadius: '10px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#ffffff', color: '#047857', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >
            <Check size={18} /> Phê Duyệt Ngay Bảng Lương
          </button>
        </div>
      )}



      {/* KPI Cards Grid - Balanced 3 Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {stats.map((stat, i) => (
          <div key={i} className="card-glass" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.15rem 1.35rem',
            borderLeft: `5px solid ${stat.color}`,
            borderRadius: '14px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 15px rgba(15,23,42,0.04)'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
                {stat.label}
              </span>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>{stat.value}</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: stat.color === 'var(--warning)' ? '#d97706' : '#64748b' }}>
                {stat.change}
              </span>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: `${stat.color}15`,
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
        alignItems: 'stretch'
      }}>
        {/* Sales Trend Chart */}
        <div className="card-glass" style={{ padding: '1.5rem', height: '380px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--secondary)' }} />
              Xu Hướng Doanh Số
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đơn vị: Triệu VNĐ</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Line data={salesData} options={chartOptions} />
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="card-glass" style={{ padding: '1.5rem', height: '380px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Tỉ Trọng Linh Kiện Bán Chạy</h3>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut data={categoryData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    color: '#94a3b8',
                    boxWidth: 12,
                    font: { size: 10 }
                  }
                }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Row 2: Duyệt Yêu Cầu Nhập Hàng / Báo Giá NCC (CEO) */}
      <div className="card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={18} style={{ color: '#818cf8' }} />
            Duyệt Báo Giá Mua Hàng (CEO Approval)
          </h3>
          {filteredQuotedOrders.length > 0 && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '0.2rem 0.6rem', borderRadius: '10px' }}>
              {filteredQuotedOrders.length} đơn chờ duyệt
            </span>
          )}
        </div>
        <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto', flex: 1 }}>
          {filteredQuotedOrders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Không có đơn báo giá NCC nào trong khoảng thời gian đã chọn.
            </div>
          ) : (
            <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Mã Đơn</th>
                  <th>Nhà Cung Cấp</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>SL Linh Kiện</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Tổng Báo Giá</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotedOrders.map(po => {
                  const totalQty = po.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || 1;
                  return (
                    <tr key={po.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setSelectedDetailPO(po)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontWeight: 700,
                            color: '#2563eb',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '0.85rem'
                          }}
                          title="Bấm để xem chi tiết báo giá NCC"
                        >
                          {po.poNumber || `PO-${po.id}`}
                        </button>
                      </td>
                      <td>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', margin: 0 }}>{po.supplier?.name || po.supplierCode}</p>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>{totalQty} cái</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>{formatPrice(po.totalAmount)}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => setSelectedDetailPO(po)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer'
                            }}
                            title="Xem chi tiết báo giá NCC"
                          >
                            <Eye size={13} /> Xem Chi Tiết
                          </button>
                          {(isCEO || isAdmin) && (
                            <button
                              onClick={() => handleApproveQuotedPO(po.id, po.poNumber || po.id)}
                              className="btn btn-primary shadow-glow"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', backgroundColor: '#22c55e', border: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', cursor: 'pointer' }}
                            >
                              <Check size={13} /> Duyệt PO
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Row 3: Thống Kê KPI & Hoa Hồng Nhân Sự (Full-width row) */}
      <div className="card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--accent)' }} />
            Thống Kê KPI & Hoa Hồng Nhân Sự
          </h3>
          <button
            onClick={() => setShowKPIDetailModal(true)}
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#2563eb',
              border: '1px solid rgba(37,99,235,0.3)',
              backgroundColor: 'rgba(37,99,235,0.06)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            title="Xem chi tiết bảng lương & KPI nhân sự"
          >
            <Eye size={14} /> Xem Chi Tiết
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Sales performance */}
          <div style={{
            padding: '1.15rem',
            border: '1px solid #cbd5e1',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <strong style={{ color: '#0f172a', fontSize: '0.925rem', fontWeight: 800 }}>Trần Thị B (Bộ Phận Bán Hàng)</strong>
              <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>KPI BÁN HÀNG</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span>Doanh số chốt được:</span>
              <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.9rem' }}>{formatPrice(totalRevenueVal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', marginTop: '0.35rem' }}>
              <span>Hoa hồng tích lũy (1%):</span>
              <strong style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.9rem' }}>{formatPrice(totalRevenueVal * 0.01)}</strong>
            </div>
          </div>

          {/* Assembly performance */}
          {(() => {
            const completedJobsCount = assemblyJobs.filter(j => j.status === 'COMPLETED').length;
            const assemblyBonus = completedJobsCount * 150000;
            return (
              <div style={{
                padding: '1.15rem',
                border: '1px solid #cbd5e1',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.925rem', fontWeight: 800 }}>Phạm Văn D (Bộ Phận Lắp Ráp)</strong>
                  <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>KPI LẮP RÁP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                  <span>Số máy ráp hoàn chỉnh:</span>
                  <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.9rem' }}>{completedJobsCount} bộ PC</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', marginTop: '0.35rem' }}>
                  <span>Thưởng lắp ráp (150K/máy):</span>
                  <strong style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.9rem' }}>{formatPrice(assemblyBonus)}</strong>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Row 4: Đơn hàng cần xử lý (CONFIRMED / READY_TO_SHIP / SHIPPED) */}
      <div className="card-glass" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Truck size={18} style={{ color: 'var(--success)' }} />
          Đơn Hàng Trong Luồng Xuất Kho & Giao Hàng
        </h3>
        <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
          {filteredOrders.filter(o => ['CONFIRMED', 'READY_TO_SHIP', 'SHIPPED'].includes(o.status)).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Không có đơn hàng nào trong luồng xuất kho hoặc đang giao trong khoảng thời gian đã chọn.
            </div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>Khách Hàng</th>
                  <th>Số Điện Thoại</th>
                  <th>Tổng Tiền</th>
                  <th>Ngày Đặt</th>
                  <th>Trạng Thái</th>
                  <th style={{ textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.filter(o => ['CONFIRMED', 'READY_TO_SHIP', 'SHIPPED'].includes(o.status)).map(o => (
                  <tr key={o.orderId} style={{ cursor: 'pointer' }} onClick={() => setSelectedDetailOrder(o)}>
                    <td>
                      <strong 
                        style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {o.orderId}
                      </strong>
                    </td>
                    <td>{o.customerName}</td>
                    <td>{o.phone || 'N/A'}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatPrice(o.totalAmount)}</td>
                    <td>{o.date}</td>
                    <td>
                      {o.status === 'CONFIRMED' && <span className="badge" style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>Chờ Xuất Kho</span>}
                      {o.status === 'READY_TO_SHIP' && <span className="badge badge-success" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Chờ Shipper Lấy</span>}
                      {o.status === 'SHIPPED' && <span className="badge" style={{ backgroundColor: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>Đang Giao Hàng</span>}
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedDetailOrder(o)}
                        className="btn"
                        style={{
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(37,99,235,0.1)',
                          color: '#2563eb',
                          border: '1px solid rgba(37,99,235,0.25)',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={13} /> Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CEO Payroll Approval Panel */}
      {payrolls.length > 0 && (
        <div className="card-glass" style={{ padding: '1.5rem', marginTop: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', margin: 0 }}>
                <DollarSign size={18} style={{ color: 'var(--success)' }} />
                Phê Duyệt Bảng Lương Nhân Sự Tháng Này
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
                Bảng lương do bộ phận Nhân sự (HR) lập và gửi trình CEO phê duyệt trước khi Kế toán chi tiền.
              </p>
            </div>

            {payrolls[0]?.status === 'SUBMITTED_TO_CEO' ? (
              <button
                onClick={() => {
                  if (window.confirm('Xác nhận PHÊ DUYỆT bảng lương tháng này của doanh nghiệp? Hệ thống sẽ chuyển lệnh chi lương sang cho bộ phận Kế toán.')) {
                    approvePayrollByCEO();
                  }
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.5rem 1rem' }}
              >
                ✓ Phê Duyệt Bảng Lương
              </button>
            ) : (
              <span className="badge badge-success" style={{ padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
                {payrolls[0]?.status === 'APPROVED_BY_CEO' ? 'Đã phê duyệt (Chờ Kế toán chi)' : 'Đã thanh toán hoàn tất'}
              </span>
            )}
          </div>

          <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Nhân Viên / Vai Trò</th>
                  <th style={{ textAlign: 'center' }}>Công thực tế</th>
                  <th style={{ textAlign: 'right' }}>Lương Cơ Bản</th>
                  <th style={{ textAlign: 'right' }}>Tổng Thưởng</th>
                  <th style={{ textAlign: 'right' }}>Tổng Khấu Trừ</th>
                  <th style={{ textAlign: 'right', color: 'var(--success)' }}>Thực Nhận</th>
                  <th style={{ textAlign: 'center' }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map(p => {
                  const empName = p.name || p.empName || `Nhân viên #${p.empId}`;
                  const daysDisplay = `${p.presentDays || 26}/26 ngày`;
                  const bonusVal = (p.salesCommission || 0) + (p.assemblyBonus || 0) + (p.extraBonus || 0) + (p.bonus || 0);

                  const insuranceVal = p.insuranceDeduction !== undefined ? p.insuranceDeduction : Math.round((p.baseSalary || 0) * 0.105);
                  const fineVal = insuranceVal + (p.latePenalty || 0) + (p.extraDeduction || 0) + (p.lateFine || 0);

                  return (
                    <tr key={p.empId}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{empName}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.role}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}>{daysDisplay}</td>
                      <td style={{ textAlign: 'right' }}>{formatPrice(p.baseSalary)}</td>
                      <td style={{ textAlign: 'right', color: bonusVal > 0 ? 'var(--success)' : 'var(--text-secondary)' }}>{bonusVal > 0 ? `+${formatPrice(bonusVal)}` : '—'}</td>
                      <td style={{ textAlign: 'right', color: fineVal > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{fineVal > 0 ? `-${formatPrice(fineVal)}` : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>{formatPrice(p.netSalary)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {p.status === 'SUBMITTED_TO_CEO' && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>CHỜ DUYỆT</span>}
                        {p.status === 'APPROVED_BY_CEO' && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>ĐÃ DUYỆT</span>}
                        {p.status === 'PAID' && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>ĐÃ CHI TRẢ</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CEO Leave Request Approval Panel */}
      {leaveRequests.filter(r => r.status === 'PENDING').length > 0 && (
        <div className="card-glass" style={{ padding: '1.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', margin: 0 }}>
                <Users size={18} style={{ color: '#10b981' }} />
                Phê Duyệt Đơn Nghỉ Phép Nhân Sự
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
                Có {leaveRequests.filter(r => r.status === 'PENDING').length} đơn đang chờ phê duyệt.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {leaveRequests.filter(r => r.status === 'PENDING').map(req => (
              <div key={req.id} style={{ padding: '1rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{req.empName || `Nhân viên #${req.employeeId}`}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.role || req.type}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Từ: {req.startDate} → {req.endDate}</span>
                  {req.reason && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Lý do: {req.reason}</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => { if (window.confirm(`Phê duyệt đơn nghỉ phép của nhân viên?`)) approveLeaveRequest(req.id); }}
                    className="btn btn-primary"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                    ✓ Duyệt
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Từ chối đơn nghỉ phép này?`)) rejectLeaveRequest(req.id); }}
                    className="btn"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                    ✗ Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Detail Modal Popup */}
      <OrderDetailModal 
        order={selectedDetailOrder} 
        onClose={() => setSelectedDetailOrder(null)} 
      />

      {/* CEO Quoted PO Detail Modal */}
      {selectedDetailPO && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }} onClick={() => setSelectedDetailPO(null)}>
          <div style={{
            width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
            padding: '1.75rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
            borderRadius: '16px', boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.3rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>
                    Chi Tiết Báo Giá NCC: {selectedDetailPO.poNumber || `PO-${selectedDetailPO.id}`}
                  </h2>
                  <span style={{ fontSize: '0.725rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: 800 }}>
                    CHỜ CEO DUYỆT BÁO GIÁ
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Nhà Cung Cấp: <strong style={{ color: '#0f172a' }}>{selectedDetailPO.supplier?.name || selectedDetailPO.supplierCode || 'N/A'}</strong>
                </span>
              </div>
              <button onClick={() => setSelectedDetailPO(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            {/* Supplier Info Card */}
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>
                  Tên Nhà Cung Cấp
                </div>
                <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                  {selectedDetailPO.supplier?.name || selectedDetailPO.supplierCode || 'N/A'}
                </strong>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>
                  Thông Tin Liên Hệ / Email
                </div>
                <strong style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.95rem' }}>
                  {selectedDetailPO.supplier?.phone || selectedDetailPO.supplier?.email || 'Đối tác phân phối chính hãng'}
                </strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>
                  Địa Chỉ Nhà Cung Cấp
                </div>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>
                  {selectedDetailPO.supplier?.address || 'Hệ thống đối tác phân phối thiết bị công nghệ'}
                </span>
              </div>
            </div>

            {/* Quoted Products Table */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={16}/> Danh Sách Linh Kiện Báo Giá ({(selectedDetailPO.items || []).length})
              </h4>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1', fontWeight: 700 }}>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>Linh Kiện / Sản Phẩm</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', width: '80px' }}>Số Lượng</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', width: '130px' }}>Đơn Giá Báo</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', width: '140px' }}>Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDetailPO.items && selectedDetailPO.items.length > 0) ? (
                      selectedDetailPO.items.map((item, idx) => {
                        const price = parseFloat(item.unitPrice || item.price || 0);
                        const qty = parseInt(item.quantity || 1);
                        const subtotal = price * qty;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.65rem 0.85rem', color: '#0f172a', fontWeight: 700 }}>
                              <div>{item.productName || item.name || `Sản phẩm #${item.productId || idx}`}</div>
                              {item.category && <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Danh mục: {item.category}</span>}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>x{qty}</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#475569' }}>{formatPrice(price)}</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{formatPrice(subtotal)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                          Chi tiết các linh kiện cấu thành theo báo giá PO
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Summary */}
            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '1rem' }}>Tổng Giá Trị Báo Giá PO:</span>
              <strong style={{ color: '#16a34a', fontSize: '1.35rem', fontWeight: 800 }}>{formatPrice(selectedDetailPO.totalAmount)}</strong>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              {(isCEO || isAdmin) && (
                <button
                  onClick={async () => {
                    await handleApproveQuotedPO(selectedDetailPO.id, selectedDetailPO.poNumber || selectedDetailPO.id);
                    setSelectedDetailPO(null);
                  }}
                  className="btn shadow-glow"
                  style={{
                    padding: '0.55rem 1.35rem', fontSize: '0.85rem', fontWeight: 800,
                    backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}
                >
                  <Check size={16} /> Phê Duyệt Báo Giá Này
                </button>
              )}
              <button
                onClick={() => setSelectedDetailPO(null)}
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CEO Staff KPI & Commission Detail Modal */}
      {showKPIDetailModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }} onClick={() => setShowKPIDetailModal(false)}>
          <div style={{
            width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto',
            padding: '1.75rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
            borderRadius: '16px', boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} style={{ color: '#2563eb' }} />
                  Báo Cáo Chi Tiết KPI & Thưởng Doanh Số Nhân Sự
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  Tổng hợp hiệu năng và tiền thưởng hoa hồng tích lũy theo thời gian thực
                </span>
              </div>
              <button onClick={() => setShowKPIDetailModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Hoa Hồng Sales (1%)</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#15803d', margin: '0.25rem 0 0' }}>
                  {formatPrice(totalRevenueVal * 0.01)}
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#166534' }}>Từ tổng doanh số: {formatPrice(totalRevenueVal)}</span>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Thưởng Lắp Ráp PC (150K/máy)</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8', margin: '0.25rem 0 0' }}>
                  {formatPrice(filteredAssemblyJobs.filter(j => j.status === 'COMPLETED').length * 150000)}
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#1e40af' }}>{filteredAssemblyJobs.filter(j => j.status === 'COMPLETED').length} bộ PC hoàn tất nghiệm thu</span>
              </div>
            </div>

            {/* Staff List Breakdown Table */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16}/> Danh Sách Bảng Lương & Thưởng KPI Chi Tiết
              </h4>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1', fontWeight: 700 }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Nhân Viên / Vai Trò</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Chỉ Số KPI Đạt Được</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Đơn Giá / Tỷ Lệ</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Thưởng Tích Lũy</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#0f172a' }}>Trần Thị B</strong><br />
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>SALES</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        Doanh số chốt thành công:<br />
                        <strong style={{ color: '#0f172a' }}>{formatPrice(totalRevenueVal)}</strong>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569', whiteSpace: 'nowrap' }}>1% Doanh số</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap' }}>
                        +{formatPrice(totalRevenueVal * 0.01)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#0f172a' }}>Phạm Văn D</strong><br />
                        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>ASSEMBLY</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        Lắp ráp hoàn chỉnh: <strong>{filteredAssemblyJobs.filter(j => j.status === 'COMPLETED').length} bộ PC</strong>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>150.000đ / máy</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap' }}>
                        +{formatPrice(filteredAssemblyJobs.filter(j => j.status === 'COMPLETED').length * 150000)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.875rem' }}>Lê Văn C</strong>
                        <span className="badge badge-secondary" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>WAREHOUSE</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                        Xuất nhập kho đúng hạn 100%
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>KPI Kho xuất sắc</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap' }}>
                        +500.000 đ
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.875rem' }}>Nguyễn Kế Toán</strong>
                        <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>ACCOUNTANT</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                        Đánh giá sổ sách kế toán VAS chuẩn
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>Kế toán trưởng</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap' }}>
                        +500.000 đ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setShowKPIDetailModal(false);
                  navigate('/admin/hr');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.825rem', color: '#2563eb', fontWeight: 700 }}
              >
                Vào Quản Lý Nhân Sự & Lương →
              </button>
              <button
                onClick={() => setShowKPIDetailModal(false)}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

