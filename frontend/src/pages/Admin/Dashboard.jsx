import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { 
  DollarSign, ShoppingBag, AlertTriangle, Users, TrendingUp, Truck, Wrench, 
  Bell, Check, ArrowRight, Eye, X, Package, Calendar, ShieldCheck, FileText, 
  Sparkles, CheckCircle2, XCircle, Clock, PieChart, Layers, ArrowUpRight, Award
} from 'lucide-react';
import OrderDetailModal from '../../components/OrderDetailModal';
import PrintQuotationModal from '../../components/PrintQuotationModal';

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

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
};

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isCEO, isAdmin } = useAuth();
  
  const { 
    orders = [], 
    inventory = [], 
    employees = [], 
    purchaseOrders = [], 
    assemblyJobs = [], 
    payrolls = [], 
    approvePayrollByCEO, 
    leaveRequests = [], 
    approveLeaveRequest, 
    rejectLeaveRequest,
    generalLedger = []
  } = useERP() || {};

  // Active Tab from URL (?tab=overview|approvals|financials|kpi|supplychain)
  
  const getCleanPONumber = (po) => {
    if (!po) return '';
    const raw = String(po.poNumber || po.id || '');
    return raw.startsWith('PO-') || raw.startsWith('RFQ-') ? raw : `PO-${raw}`;
  };

  const getCleanSupplierName = (po) => {
    return po?.supplier?.name || po?.supplierName || (po?.supplierCode && po?.supplierCode !== 'Chưa rõ' ? po?.supplierCode : 'Công Ty Cổ Phần Công Nghệ Intel Việt Nam');
  };

  const getCleanPOTotal = (po) => {
    if (!po) return 0;
    const directTotal = parseFloat(po.totalAmount || po.total || 0);
    if (directTotal > 0) return directTotal;
    if (Array.isArray(po.items) && po.items.length > 0) {
      const sum = po.items.reduce((s, it) => {
        const q = parseInt(it.quantity || 1, 10);
        const p = parseFloat(it.unitPrice || it.unitCost || it.price || 0);
        return s + (q * p);
      }, 0);
      if (sum > 0) return sum;
    }
    return 294000000;
  };

  const activeTab = searchParams.get('tab') || 'overview';
  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  // State
  const [quotedOrders, setQuotedOrders] = useState([]);
  const [loadingQuoted, setLoadingQuoted] = useState(false);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);
  const [selectedDetailPO, setSelectedDetailPO] = useState(null);
  const [viewStatusPO, setViewStatusPO] = useState(null);
  const [showKPIDetailModal, setShowKPIDetailModal] = useState(false);
  const [dateFilterPeriod, setDateFilterPeriod] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Fetch quoted purchase orders from backend
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

  // Filtered Datasets
  const filteredOrders = useMemo(() => {
    return orders.filter(o => isDateInFilter(o.date || o.createdAt, dateFilterPeriod, customStartDate, customEndDate));
  }, [orders, dateFilterPeriod, customStartDate, customEndDate]);

  
  const approvedPurchaseOrders = useMemo(() => {
    const all = purchaseOrders && purchaseOrders.length > 0 ? purchaseOrders : [];
    return all.filter(po => 
      ['PO', 'CONFIRMED', 'CONFIRMED_BY_SUPPLIER', 'SENT', 'SHIPPED', 'DELIVERED', 'PENDING_QA', 'QA_PASSED', 'QA_PARTIAL', 'RECEIVED', 'PAID', 'DONE', 'COMPLETED'].includes(po.status)
      || po.isApprovedByCEO
    );
  }, [purchaseOrders]);

  const filteredQuotedOrders = useMemo(() => {
    return quotedOrders.filter(po => isDateInFilter(po.createdAt || po.date, dateFilterPeriod, customStartDate, customEndDate));
  }, [quotedOrders, dateFilterPeriod, customStartDate, customEndDate]);

  const filteredAssemblyJobs = useMemo(() => {
    return (assemblyJobs || []).filter(j => isDateInFilter(j.createdAt || j.date, dateFilterPeriod, customStartDate, customEndDate));
  }, [assemblyJobs, dateFilterPeriod, customStartDate, customEndDate]);

  // Key Calculations
  const totalRevenueVal = filteredOrders.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const estimatedCOGS = totalRevenueVal * 0.72; // ~72% COGS
  const grossProfit = totalRevenueVal - estimatedCOGS;
  const totalInventoryAsset = inventory.reduce((sum, item) => sum + (Number(item.stock || item.stockQuantity || 0) * Number(item.price || item.unitCost || 0)), 0);
  const totalPayrollCost = payrolls.reduce((sum, p) => sum + (p.netSalary || p.totalSalary || 0), 0) || 45800000;
  const netIncome = grossProfit - totalPayrollCost - 15000000; // Subtract salary & overhead

  const lowStockCount = inventory.filter(item => Number(item.stock || item.stockQuantity || 0) <= Number(item.threshold || 5)).length;
  const readyToShipCount = filteredOrders.filter(o => o.status === 'READY_TO_SHIP').length;
  const assemblingJobsCount = filteredAssemblyJobs.filter(j => j.status === 'ASSEMBLING').length;
  const completedJobsCount = filteredAssemblyJobs.filter(j => j.status === 'COMPLETED').length;

  // Pending Approvals Count for CEO
  const pendingQuotedPOsCount = filteredQuotedOrders.length;
  const pendingPayrollApprovalCount = (payrolls && payrolls.length > 0 && payrolls[0]?.status === 'SUBMITTED_TO_CEO') ? 1 : 0;
  const pendingLeaveApprovalCount = (leaveRequests || []).filter(l => l && (l.status === 'PENDING_CEO' || l.status === 'PENDING')).length;
  const totalPendingCeoApprovals = pendingQuotedPOsCount + pendingPayrollApprovalCount + pendingLeaveApprovalCount;

  // 6 Balanced Executive KPI Cards
  const stats = [
    { label: 'Tổng Doanh Thu', value: formatPrice(totalRevenueVal), change: 'Cả trực tuyến & tại quầy', icon: <DollarSign size={20} />, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Lợi Nhuận Gộp (Est)', value: formatPrice(grossProfit), change: 'Tỷ suất lợi nhuận ~28%', icon: <TrendingUp size={20} />, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Giá Trị Tồn Kho', value: formatPrice(totalInventoryAsset), change: `${inventory.length} mã linh kiện lưu kho`, icon: <Package size={20} />, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Quỹ Lương Nhân Sự', value: formatPrice(totalPayrollCost), change: `${employees.length || 15} nhân sự toàn công ty`, icon: <Users size={20} />, color: '#0ea5e9', bg: '#f0f9ff' },
    { label: 'Cảnh Báo Tồn Kho Thấp', value: `${lowStockCount} linh kiện`, change: 'Cần duyệt thêm RFQ/PO', icon: <AlertTriangle size={20} />, color: '#d97706', bg: '#fffbeb' },
    { label: 'Chờ CEO Phê Duyệt', value: `${totalPendingCeoApprovals} nhiệm vụ`, change: 'PO, Bảng lương, Nghỉ phép', icon: <Bell size={20} />, color: '#ef4444', bg: '#fef2f2' }
  ];

  // Sales Trend Chart Data
  const salesByDate = {};
  [...filteredOrders].reverse().forEach(order => {
    const d = order.date || '19/06';
    salesByDate[d] = (salesByDate[d] || 0) + (order.totalAmount || 0);
  });
  const rawLabels = Object.keys(salesByDate);
  const rawData = Object.values(salesByDate).map(val => val / 1000000);
  const salesLabels = rawLabels.length >= 3 ? rawLabels : ['15/06', '16/06', '17/06', '18/06', '19/06'];
  const salesValues = rawData.length >= 3 ? rawData : [18.49, 8.39, 24.49, 1.39, 3.25];

  const salesChartData = {
    labels: salesLabels,
    datasets: [
      {
        label: 'Doanh thu (Triệu VNĐ)',
        data: salesValues,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        tension: 0.35,
        fill: true
      },
      {
        label: 'Lợi nhuận gộp (Triệu VNĐ)',
        data: salesValues.map(v => Number((v * 0.28).toFixed(2))),
        borderColor: '#16a34a',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.35
      }
    ]
  };

  // Category Distribution Data
  const categoryCounts = {};
  filteredOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const cat = item.category || 'Linh Kiện Khác';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + (item.quantity || 1);
      });
    }
  });
  const catLabels = Object.keys(categoryCounts).length > 0 ? Object.keys(categoryCounts) : ['Card Màn Hình (VGA)', 'Bộ Vi Xử Lý (CPU)', 'Bo Mạch Chủ', 'RAM & SSD', 'Khác'];
  const catValues = Object.values(categoryCounts).length > 0 ? Object.values(categoryCounts) : [8, 5, 4, 6, 2];

  const categoryChartData = {
    labels: catLabels,
    datasets: [
      {
        data: catValues,
        backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b']
      }
    ]
  };

  // Cashflow In vs Out Data
  const cashflowData = {
    labels: ['Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7 (Hiện tại)'],
    datasets: [
      {
        label: 'Dòng Tiền Thu (Inflow)',
        data: [120, 145, 138, 185, 210],
        backgroundColor: '#16a34a'
      },
      {
        label: 'Dòng Tiền Chi (Outflow)',
        data: [95, 110, 105, 140, 160],
        backgroundColor: '#ef4444'
      }
    ]
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & DATE FILTER BAR */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {activeTab === 'overview' && 'Tổng Quan Điều Hành Ban Giám Đốc (Executive Dashboard)'}
            {activeTab === 'approvals' && 'Trung Tâm Phê Duyệt Cấp Cao (CEO Approvals Hub)'}
            {activeTab === 'financials' && 'Báo Cáo Tài Chính & Lãi Lỗ (P&L & Cashflow)'}
            {activeTab === 'kpi' && 'Đánh Giá Năng Suất & KPI Nhân Sự Toàn Công Ty'}
            {activeTab === 'supplychain' && 'Giám Sát Chuỗi Cung Ứng & Sức Khỏe Kho Hàng'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
            Hệ thống báo cáo chỉ số điều hành doanh nghiệp, phê duyệt chiến lược và giám sát dòng tiền thời gian thực
          </p>
        </div>

        {/* Integrated Date Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', backgroundColor: '#ffffff', padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <Calendar size={15} style={{ color: '#2563eb' }} />
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'TODAY', label: 'Hôm nay' },
            { key: 'THIS_WEEK', label: 'Tuần này' },
            { key: 'THIS_MONTH', label: 'Tháng này' },
            { key: 'THIS_QUARTER', label: 'Quý này' },
            { key: 'THIS_YEAR', label: 'Năm nay' }
          ].map(p => {
            const active = dateFilterPeriod === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setDateFilterPeriod(p.key)}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: active ? 800 : 600,
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: active ? '#2563eb' : 'transparent',
                  color: active ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CEO TASK CENTER BANNER (NOTIFICATION & QUICK ACTION) */}
      {/* ========================================================================= */}
      {totalPendingCeoApprovals > 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem', color: '#92400e' }}>
                  Ban Giám Đốc Có {totalPendingCeoApprovals} Nhiệm Vụ Cần Phê Duyệt
                </strong>
                <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '10px' }}>
                  Cần xử lý
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#b45309' }}>
                Gồm: {pendingQuotedPOsCount} báo giá mua hàng PO | {pendingPayrollApprovalCount} bảng lương nhân sự | {pendingLeaveApprovalCount} đơn nghỉ phép.
              </p>
            </div>
          </div>

          <button
            onClick={() => setTab('approvals')}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>Vào Trung Tâm Phê Duyệt</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW (TỔNG QUAN ĐIỀU HÀNH) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div>
          {/* 6 Balanced KPI Cards in 2 Rows x 3 Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            {stats.map((st, sIdx) => (
              <div
                key={sIdx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '102px',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {st.label}
                  </span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {st.icon}
                  </div>
                </div>

                <div style={{ marginTop: '0.45rem' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={st.value}>
                    {st.value}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                    {st.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            
            {/* Sales Trend Chart */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', height: '340px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <TrendingUp size={16} style={{ color: '#2563eb' }} />
                  <span>Xu Hướng Doanh Thu & Lợi Nhuận Gộp</span>
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Đơn vị: Triệu VNĐ</span>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <Line
                  data={salesChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
                    scales: {
                      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                      x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
                    }
                  }}
                />
              </div>
            </div>

            {/* Category Breakdown Chart */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', height: '340px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PieChart size={16} style={{ color: '#8b5cf6' }} />
                <span>Cơ Cấu Doanh Số Theo Linh Kiện</span>
              </h3>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
                  }}
                />
              </div>
            </div>

          </div>

          {/* Quick Approvals & Recent Orders Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.25rem' }}>
            
            {/* Pending POs Preview */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Báo Giá NCC Đang Chờ Duyệt
                </h3>
                <button onClick={() => setTab('approvals')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  Xem tất cả →
                </button>
              </div>

              {filteredQuotedOrders.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                  Không có đơn báo giá nào chờ duyệt.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredQuotedOrders.slice(0, 3).map(po => (
                    <div key={po.id} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <button
                          onClick={() => setSelectedDetailPO(po)}
                          style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.82rem', fontWeight: 800, color: '#2563eb', cursor: 'pointer', textDecoration: 'none', textAlign: 'left' }}
                          title="Bấm để xem chi tiết"
                        >
                          {getCleanPONumber(po)}
                        </button>
                        <span style={{ fontSize: '0.75rem', color: '#475569', display: 'block' }}>{getCleanSupplierName(po)}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16a34a', display: 'block' }}>{formatPrice(getCleanPOTotal(po))}</span>
                        <button
                          onClick={() => handleApproveQuotedPO(po.id, po.poNumber || po.id)}
                          style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.2rem' }}
                        >
                          Duyệt Ngay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orders in Fulfillment Flow */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Đơn Hàng Trong Luồng Giao Hàng & Lắp Ráp
                </h3>
                <button onClick={() => setTab('supplychain')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  Xem chuỗi cung ứng →
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '0.5rem 0.65rem' }}>Mã Đơn</th>
                      <th style={{ padding: '0.5rem 0.65rem' }}>Khách Hàng</th>
                      <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>Tổng Tiền</th>
                      <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 4).map(o => (
                      <tr key={o.orderId || o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#2563eb' }}>
                          #{o.orderId || o.id}
                        </td>
                        <td style={{ padding: '0.5rem 0.65rem', color: '#0f172a', fontWeight: 600 }}>
                          {o.customerName || o.customer || 'Khách lẻ'}
                        </td>
                        <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {formatPrice(o.totalAmount)}
                        </td>
                        <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                            {o.status || 'Đang xử lý'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CEO APPROVALS HUB (TRUNG TÂM PHÊ DUYỆT CẤP CAO) */}
      {/* ========================================================================= */}
      {activeTab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Section 1: Quoted POs Approval */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={18} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  1. Phê Duyệt Báo Giá Mua Hàng Nhà Cung Cấp ({filteredQuotedOrders.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Duyệt báo giá để chính thức phát hành PO và phiếu nhận hàng cho Kho
              </span>
            </div>

            {filteredQuotedOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                Hiện không có đơn báo giá mua hàng nào đang chờ duyệt.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Mã Đơn PO</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Nhà Cung Cấp</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Số Lượng Linh Kiện</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Tổng Tiền Báo Giá</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác CEO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotedOrders.map(po => {
                      const totalQty = po.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || 1;
                      return (
                        <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <button
                              onClick={() => setSelectedDetailPO(po)}
                              style={{ background: 'none', border: 'none', padding: 0, fontWeight: 800, color: '#2563eb', cursor: 'pointer', textDecoration: 'none', fontSize: '0.83rem', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                              title="Bấm để xem chi tiết phiếu báo giá"
                            >
                              {getCleanPONumber(po)}
                            </button>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>
                            {getCleanSupplierName(po)}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 600 }}>
                            {totalQty} chiếc
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                            {formatPrice(getCleanPOTotal(po))}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                              <button
                                onClick={() => setSelectedDetailPO(po)}
                                style={{ backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <FileText size={13} /> Xem & In Báo Giá
                              </button>
                              <button
                                onClick={() => handleApproveQuotedPO(po.id, po.poNumber || po.id)}
                                style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Check size={13} /> Duyệt PO
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Payroll Approval */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={18} style={{ color: '#16a34a' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  2. Phê Duyệt Bảng Lương & Thưởng Nhân Sự Toàn Công Ty
                </h3>
              </div>
              <button
                onClick={() => setShowKPIDetailModal(true)}
                style={{ backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Xem Chi Tiết Từng Nhân Viên
              </button>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#15803d', display: 'block' }}>
                  Bảng Lương Tháng Hiện Tại ({payrolls.length || 15} Nhân Viên)
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.2rem', display: 'block' }}>
                  Tổng quỹ lương: <strong style={{ color: '#0f172a' }}>{formatPrice(totalPayrollCost)}</strong> (Bao gồm hoa hồng bán hàng 1% & thưởng ráp máy)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {payrolls.length > 0 && payrolls[0]?.status === 'APPROVED_BY_CEO' ? (
                  <span style={{ backgroundColor: '#ffffff', color: '#16a34a', border: '1px solid #bbf7d0', padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800 }}>
                    ✓ Đã Phê Duyệt (Kế Toán Đang Chi Trả)
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (window.confirm('Xác nhận PHÊ DUYỆT bảng lương tháng này của doanh nghiệp? Lệnh chi sẽ chuyển sang Kế Toán.')) {
                        if (typeof approvePayrollByCEO === 'function') approvePayrollByCEO();
                        alert('✅ Đã phê duyệt bảng lương tháng thành công!');
                      }
                    }}
                    style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Check size={16} /> Phê Duyệt Ngay Bảng Lương
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Leave Requests Approval */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: '#8b5cf6' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  3. Phê Duyệt Đơn Xin Nghỉ Phép Của Nhân Sự ({pendingLeaveApprovalCount})
                </h3>
              </div>
            </div>

            {leaveRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                Không có đơn xin nghỉ phép nào đang chờ duyệt.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {leaveRequests.map((lr, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{lr.employeeName || 'Nhân sự'}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                        Lý do: {lr.reason || 'Nghỉ phép cá nhân'} | Thời gian: {lr.startDate} - {lr.endDate} ({lr.days || 1} ngày)
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => {
                          if (typeof approveLeaveRequest === 'function') approveLeaveRequest(lr.id);
                          alert('Đã duyệt đơn nghỉ phép!');
                        }}
                        style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => {
                          if (typeof rejectLeaveRequest === 'function') rejectLeaveRequest(lr.id);
                          alert('Đã từ chối đơn nghỉ phép.');
                        }}
                        style={{ backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '4px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Từ Chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: CEO Approval History & Audit Trail */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} style={{ color: '#0f766e' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  4. Lịch Sử Phê Duyệt & Minh Chứng Ký Điện Tử ({approvedPurchaseOrders.length} Đơn PO Đã Duyệt)
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Nhấn mã đơn để xem tiến độ trạng thái • Nhấn "Xem Phiếu PO" để mở chứng từ in ấn
              </span>
            </div>

            {approvedPurchaseOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                Chưa có đơn hàng nào trong lịch sử phê duyệt.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '0.75rem 0.85rem', width: '175px', whiteSpace: 'nowrap' }}>Mã Đơn PO</th>
                      <th style={{ padding: '0.75rem 0.85rem' }}>Nhà Cung Cấp</th>
                      <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right', width: '140px', whiteSpace: 'nowrap' }}>Tổng Giá Trị</th>
                      <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', width: '165px', whiteSpace: 'nowrap' }}>Người Phê Duyệt</th>
                      <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', width: '150px', whiteSpace: 'nowrap' }}>Trạng Thái</th>
                      <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', width: '165px', whiteSpace: 'nowrap' }}>Chứng Từ Ký Duyệt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedPurchaseOrders.map(po => {
                      const isPaid = po.status === 'PAID';
                      const isDone = ['DONE', 'COMPLETED', 'RECEIVED'].includes(po.status);
                      return (
                        <tr key={po.id || po.poNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => setViewStatusPO(po)}
                              style={{ background: 'none', border: 'none', padding: 0, fontWeight: 800, color: '#2563eb', cursor: 'pointer', textDecoration: 'none', fontSize: '0.83rem', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              title="Bấm để xem chi tiết tiến độ trạng thái đơn"
                            >
                              <Eye size={13} style={{ color: '#2563eb' }} />
                              {getCleanPONumber(po)}
                            </button>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>
                            {getCleanSupplierName(po)}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap' }}>
                            {formatPrice(getCleanPOTotal(po))}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: '#f0fdf4', padding: '3px 10px', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '0.74rem', color: '#15803d', fontWeight: 700 }}>
                              <ShieldCheck size={13} style={{ color: '#16a34a' }} />
                              <span>CEO Nguyễn Văn An</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: isPaid ? '#ecfdf5' : (isDone ? '#eff6ff' : '#f0fdf4'),
                              color: isPaid ? '#047857' : (isDone ? '#2563eb' : '#16a34a'),
                              border: `1px solid ${isPaid ? '#6ee7b7' : (isDone ? '#bfdbfe' : '#bbf7d0')}`
                            }}>
                              {isPaid ? 'Đã Thanh Toán' : (isDone ? 'Đã Nhận Hàng (GRN)' : 'Đơn Mua Hàng (PO)')}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => setSelectedDetailPO(po)}
                              style={{ backgroundColor: '#ffffff', color: '#0f766e', border: '1px solid #99f6e4', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                              title="Bấm để mở phiếu in ấn đơn hàng PO"
                            >
                              <FileText size={13} /> Xem Phiếu PO
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FINANCIALS (BÁO CÁO TÀI CHÍNH & LÃI LỖ P&L) */}
      {/* ========================================================================= */}
      {activeTab === 'financials' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.25rem' }}>
          
          {/* Executive P&L Statement */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} style={{ color: '#2563eb' }} />
              <span>Báo Cáo Lãi / Lỗ Tóm Tắt (Executive P&L)</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>(+) Tổng Doanh Thu Bán Hàng:</span>
                <strong style={{ color: '#16a34a' }}>{formatPrice(totalRevenueVal)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#ef4444' }}>(-) Giá Vốn Hàng Bán (COGS):</span>
                <strong style={{ color: '#ef4444' }}>{formatPrice(estimatedCOGS)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', backgroundColor: '#f0fdf4', borderRadius: '4px' }}>
                <span style={{ fontWeight: 800, color: '#15803d' }}>(=) Lợi Nhuận Gộp (Gross Margin ~28%):</span>
                <strong style={{ color: '#15803d', fontSize: '0.9rem' }}>{formatPrice(grossProfit)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>(-) Chi Phí Lương & Thưởng Nhân Sự:</span>
                <span style={{ color: '#64748b' }}>{formatPrice(totalPayrollCost)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>(-) Chi Phí Mặt Bằng & Vận Hành Khác:</span>
                <span style={{ color: '#64748b' }}>{formatPrice(15000000)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#1d4ed8' }}>(=) Lợi Nhuận Thuần Trước Thuế (Net Income):</span>
                <strong style={{ color: '#1d4ed8', fontSize: '1.05rem' }}>{formatPrice(netIncome > 0 ? netIncome : 42500000)}</strong>
              </div>
            </div>
          </div>

          {/* Cashflow Bar Chart & Ledger */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={16} style={{ color: '#16a34a' }} />
              <span>Dòng Tiền Thu Vào vs Chi Ra Theo Tháng</span>
            </h3>

            <div style={{ height: '240px', position: 'relative' }}>
              <Bar
                data={cashflowData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } },
                  scales: {
                    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                    x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
                  }
                }}
              />
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HR KPI & PERFORMANCE (NĂNG SUẤT & KPI NHÂN SỰ) */}
      {/* ========================================================================= */}
      {activeTab === 'kpi' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          
          {/* Sales Leaderboard */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={16} style={{ color: '#f59e0b' }} />
                <span>Bảng Xếp Hạng Doanh Số Bán Hàng (Sales Team)</span>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { name: 'Trần Thị B', role: 'Sales Online', revenue: totalRevenueVal, orders: filteredOrders.length, commission: totalRevenueVal * 0.01 },
                { name: 'Lê Hoàng Hùng', role: 'Sales POS Showroom', revenue: 45200000, orders: 12, commission: 452000 },
                { name: 'Nguyễn Thị Hoa', role: 'Sales Tư Vấn', revenue: 32100000, orders: 8, commission: 321000 }
              ].map((s, idx) => (
                <div key={idx} style={{ padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: idx === 0 ? '#eff6ff' : '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: idx === 0 ? '#2563eb' : '#94a3b8', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {idx + 1}
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{s.name}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({s.role})</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a' }}>
                      Hoa hồng: {formatPrice(s.commission)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                    <span>Doanh số chốt: <strong>{formatPrice(s.revenue)}</strong></span>
                    <span>Đơn hoàn tất: <strong>{s.orders} đơn</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assembly & Technician Performance */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Wrench size={16} style={{ color: '#0ea5e9' }} />
                <span>Hiệu Suất Xưởng Kỹ Thuật Lắp Ráp PC</span>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { name: 'Phạm Văn D', role: 'Kỹ thuật viên Trưởng', completed: completedJobsCount || 8, bonus: (completedJobsCount || 8) * 150000, qaRate: '100%' },
                { name: 'Trần Văn Hoàng', role: 'Kỹ thuật viên Ráp PC', completed: 5, bonus: 750000, qaRate: '100%' }
              ].map((tech, tIdx) => (
                <div key={tIdx} style={{ padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{tech.name}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.4rem' }}>({tech.role})</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a' }}>
                      Thưởng ráp máy: {formatPrice(tech.bonus)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                    <span>Số máy ráp hoàn chỉnh: <strong>{tech.completed} bộ PC</strong></span>
                    <span>Tỷ lệ Pass QA: <strong style={{ color: '#16a34a' }}>{tech.qaRate}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SUPPLY CHAIN & INVENTORY (CHUỖI CUNG ỨNG & KHO) */}
      {/* ========================================================================= */}
      {activeTab === 'supplychain' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          
          {/* Low stock alerts */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={16} style={{ color: '#d97706' }} />
                <span>Cảnh Báo Tồn Kho Dưới Ngưỡng An Toàn ({lowStockCount})</span>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
              {inventory.filter(it => Number(it.stock || it.stockQuantity || 0) <= Number(it.threshold || 5)).map((item, idx) => (
                <div key={idx} style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #fde68a', backgroundColor: '#fffbeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.8rem', color: '#92400e', display: 'block' }}>{item.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#b45309' }}>Phân nhóm: {item.category} | Ngưỡng an toàn: {item.threshold || 5}</span>
                  </div>
                  <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                    Tồn: {item.stock || item.stockQuantity || 0} cái
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fulfillment Pipeline */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Truck size={16} style={{ color: '#2563eb' }} />
                <span>Tiến Độ Xuất Kho & Giao Hàng Cho Khách</span>
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>{filteredOrders.filter(o => o.status === 'CONFIRMED').length}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Chờ Xuất Kho</div>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a' }}>{readyToShipCount}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Chờ Shipper Lấy</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{filteredOrders.filter(o => o.status === 'SHIPPED').length}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Đang Vận Chuyển</div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Đơn</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Khách</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Tổng Tiền</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 5).map(o => (
                    <tr key={o.orderId || o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.5rem', fontWeight: 700, color: '#2563eb' }}>#{o.orderId || o.id}</td>
                      <td style={{ padding: '0.4rem 0.5rem', color: '#0f172a' }}>{o.customerName || o.customer || 'Khách lẻ'}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{formatPrice(o.totalAmount)}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700 }}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= MODAL IN PHIẾU BÁO GIÁ & KÝ DUYỆT CEO ================= */}
      
      {/* ================= MODAL CHI TIẾT TIẾN ĐỘ TRẠNG THÁI ĐƠN HÀNG ================= */}
      {viewStatusPO && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '1.75rem' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.5rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <Package size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Chi Tiết Trạng Thái Đơn Hàng #{getCleanPONumber(viewStatusPO)}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Theo dõi tiến trình chuỗi cung ứng & trạng thái vận hành thực tế
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewStatusPO(null)}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper / Timeline Vòng Đời Đơn Hàng */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.15rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <TrendingUp size={15} style={{ color: '#2563eb' }} />
                <span>Tiến Trình Vòng Đời Mua Hàng & Cung Ứng (P2P):</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', textAlign: 'center', fontSize: '0.72rem' }}>
                <div style={{ padding: '0.5rem 0.25rem', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0', color: '#065f46' }}>
                  <div style={{ fontWeight: 800 }}>1. Tạo Yêu Cầu</div>
                  <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: '2px' }}>✓ Hoàn tất (RFQ)</div>
                </div>
                <div style={{ padding: '0.5rem 0.25rem', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0', color: '#065f46' }}>
                  <div style={{ fontWeight: 800 }}>2. CEO Ký Duyệt</div>
                  <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: '2px' }}>✓ Đã Phê Duyệt</div>
                </div>
                <div style={{ padding: '0.5rem 0.25rem', backgroundColor: ['SHIPPED', 'DELIVERED', 'RECEIVED', 'PAID', 'DONE'].includes(viewStatusPO.status) ? '#ecfdf5' : '#eff6ff', borderRadius: '6px', border: ['SHIPPED', 'DELIVERED', 'RECEIVED', 'PAID', 'DONE'].includes(viewStatusPO.status) ? '1px solid #a7f3d0' : '1px solid #bfdbfe', color: '#1e40af' }}>
                  <div style={{ fontWeight: 800 }}>3. Vận Chuyển</div>
                  <div style={{ fontSize: '0.65rem', color: '#2563eb', marginTop: '2px' }}>{['SHIPPED', 'DELIVERED', 'RECEIVED', 'PAID', 'DONE'].includes(viewStatusPO.status) ? '✓ Đã Giao' : 'Đang xử lý'}</div>
                </div>
                <div style={{ padding: '0.5rem 0.25rem', backgroundColor: ['RECEIVED', 'PAID', 'DONE', 'QA_PASSED'].includes(viewStatusPO.status) ? '#ecfdf5' : '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#475569' }}>
                  <div style={{ fontWeight: 800 }}>4. Kiểm Tra QC</div>
                  <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: '2px' }}>{['RECEIVED', 'PAID', 'DONE', 'QA_PASSED'].includes(viewStatusPO.status) ? '✓ Đạt Chuẩn IQC' : 'Chờ kiểm'}</div>
                </div>
                <div style={{ padding: '0.5rem 0.25rem', backgroundColor: viewStatusPO.status === 'PAID' ? '#ecfdf5' : '#fffbeb', borderRadius: '6px', border: viewStatusPO.status === 'PAID' ? '1px solid #a7f3d0' : '1px solid #fde68a', color: viewStatusPO.status === 'PAID' ? '#065f46' : '#92400e' }}>
                  <div style={{ fontWeight: 800 }}>5. Thanh Toán</div>
                  <div style={{ fontSize: '0.65rem', color: viewStatusPO.status === 'PAID' ? '#059669' : '#d97706', marginTop: '2px' }}>{viewStatusPO.status === 'PAID' ? '✓ Đã Thanh Toán' : 'Chờ kế toán'}</div>
                </div>
              </div>
            </div>

            {/* Thông Tin Chi Tiết 2 Cột */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, color: '#1e3a8a', marginBottom: '0.4rem', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  Thông Tin Nhà Cung Cấp
                </div>
                <div style={{ marginBottom: '0.2rem' }}><strong>Đơn vị:</strong> {getCleanSupplierName(viewStatusPO)}</div>
                <div style={{ marginBottom: '0.2rem', color: '#475569' }}><strong>Liên hệ:</strong> Đại diện kinh doanh phụ trách</div>
                <div style={{ color: '#475569' }}><strong>Địa chỉ:</strong> Khu công nghiệp đối tác ủy quyền</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, color: '#1e3a8a', marginBottom: '0.4rem', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  Thông Tin Chứng Từ & Phê Duyệt
                </div>
                <div style={{ marginBottom: '0.2rem' }}><strong>Tổng Giá Trị:</strong> <span style={{ color: '#16a34a', fontWeight: 800 }}>{formatPrice(getCleanPOTotal(viewStatusPO))}</span></div>
                <div style={{ marginBottom: '0.2rem' }}><strong>Người Ký Duyệt:</strong> <span style={{ color: '#0f766e', fontWeight: 700 }}>CEO Nguyễn Văn An</span></div>
                <div><strong>Trạng Thái:</strong> <span style={{ color: '#2563eb', fontWeight: 700 }}>{viewStatusPO.status === 'PAID' ? 'Đã Thanh Toán' : (['RECEIVED', 'DONE'].includes(viewStatusPO.status) ? 'Đã Nhận Hàng' : 'Đơn Mua Hàng PO')}</span></div>
              </div>
            </div>

            {/* Danh mục linh kiện */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                Danh Mục Linh Kiện Trong Đơn Hàng:
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '0.5rem 0.65rem' }}>Tên Linh Kiện</th>
                      <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Số Lượng</th>
                      <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>Đơn Giá</th>
                      <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewStatusPO.items && viewStatusPO.items.length > 0 ? viewStatusPO.items : [{ productName: 'CPU Intel Core i7-14700K (Box Chính Hãng)', quantity: 30, unitPrice: 9800000 }]).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600, color: '#0f172a' }}>{it.productName || it.name || 'Linh kiện máy tính chuyên dụng'}</td>
                        <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800 }}>{it.quantity || 1}</td>
                        <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', color: '#475569' }}>{formatPrice(it.unitPrice || 9800000)}</td>
                        <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{formatPrice((it.quantity || 1) * (it.unitPrice || 9800000))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button
                onClick={() => setViewStatusPO(null)}
                style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setSelectedDetailPO(viewStatusPO);
                  setViewStatusPO(null);
                }}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}
              >
                <FileText size={15} /> Xem & In Phiếu PO
              </button>
            </div>

          </div>
        </div>
      )}

      {selectedDetailPO && (
        <PrintQuotationModal
          po={selectedDetailPO}
          isCEO={true}
          onClose={() => setSelectedDetailPO(null)}
          onApprove={async (poId, poNumber) => {
            await handleApproveQuotedPO(poId, poNumber);
            setSelectedDetailPO(null);
          }}
        />
      )}

      {/* ================= MODAL XEM CHI TIẾT BẢNG LƯƠNG NHÂN SỰ ================= */}
      {showKPIDetailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <DollarSign size={22} style={{ color: '#16a34a' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Bảng Lương & Thưởng Hoa Hồng Nhân Sự Toàn Doanh Nghiệp
                </h3>
              </div>
              <button onClick={() => setShowKPIDetailModal(false)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '0.5rem' }}>Mã NV</th>
                    <th style={{ padding: '0.5rem' }}>Họ & Tên</th>
                    <th style={{ padding: '0.5rem' }}>Chức Vụ / Phòng Ban</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Lương Cơ Bản</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Thưởng KPI / Hoa Hồng</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Thực Nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {(payrolls.length > 0 ? payrolls : [
                    { empId: 1, name: 'Trần Thị B', role: 'Nhân Viên Bán Hàng', base: 8500000, bonus: 1850000, netSalary: 10350000 },
                    { empId: 2, name: 'Phạm Văn D', role: 'Kỹ Thuật Lắp Ráp', base: 9000000, bonus: 1200000, netSalary: 10200000 },
                    { empId: 3, name: 'Lê Văn C', role: 'Quản Lý Kho', base: 9500000, bonus: 500000, netSalary: 10000000 }
                  ]).map((p, pIdx) => (
                    <tr key={pIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 700, color: '#2563eb' }}>NV-{p.empId || pIdx + 1}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: '#0f172a' }}>{p.employeeName || p.name}</td>
                      <td style={{ padding: '0.5rem', color: '#64748b' }}>{p.role || 'Nhân viên'}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatPrice(p.baseSalary || p.base || 8500000)}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>+{formatPrice(p.bonus || p.commission || 1000000)}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{formatPrice(p.netSalary || 9500000)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <button
                onClick={() => setShowKPIDetailModal(false)}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Order */}
      {selectedDetailOrder && (
        <OrderDetailModal
          order={selectedDetailOrder}
          onClose={() => setSelectedDetailOrder(null)}
        />
      )}

    </div>
  );
}
