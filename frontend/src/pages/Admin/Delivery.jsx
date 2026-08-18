import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import {
  Truck, Package, MapPin, Phone, User, CheckCircle, Clock,
  XCircle, Navigation, Search, BarChart2, AlertCircle, RefreshCw, Eye, X,
  Camera, Image, FileText, Calendar, Upload, DollarSign, Check, ChevronRight,
  TrendingUp, AlertTriangle, ShieldCheck, Award
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
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

const STATUS_MAP = {
  READY_TO_SHIP: { label: 'Chờ lấy hàng', color: '#f59e0b', bg: '#fffbeb' },
  SHIPPED: { label: 'Đang giao hàng', color: '#3b82f6', bg: '#eff6ff' },
  DELIVERED: { label: 'Đã giao thành công', color: '#16a34a', bg: '#f0fdf4' },
  SHIPPING_FAILED: { label: 'Giao thất bại / Hẹn lại', color: '#ef4444', bg: '#fef2f2' },
  CANCELLED: { label: 'Đã huỷ', color: '#64748b', bg: '#f8fafc' },
};

const FAIL_PRESETS = [
  'Khách không nghe máy (Gọi 3 lần)',
  'Khách hẹn lại ngày khác',
  'Địa chỉ sai / Không tìm thấy nhà',
  'Khách từ chối nhận hàng / Đổi ý',
  'Khách chưa chuẩn bị đủ tiền mặt',
  'Hàng bị hư hỏng / móp méo khi vận chuyển'
];

export default function Delivery() {
  const { orders = [], updateOrderStatus, claimOrderForDelivery, returnRequests = [], updateReturnStatus } = useERP() || {};
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab from URL (?tab=overview|pending|active|returns|history)
  const activeTab = searchParams.get('tab') || 'overview';
  const setTab = (tKey) => {
    setSearchParams({ tab: tKey });
    setSearch('');
  };

  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Delivery Failure Modal State
  const [failModal, setFailModal] = useState(null);
  const [failReason, setFailReason] = useState('');
  const [failNote, setFailNote] = useState('');

  // Proof of Delivery Modal State (POD)
  const [deliverModal, setDeliverModal] = useState(null);
  const [proofPhoto, setProofPhoto] = useState('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80');
  const [receiverNote, setReceiverNote] = useState('');

  const isManagerOrAdmin = ['CEO', 'ADMIN', 'WAREHOUSE_MANAGER', 'SALES_MANAGER'].includes(user?.role);
  const userIdStr = String(user?.id || user?.username || '');

  const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  // KPI Calculations
  const myDeliveryOrders = orders.filter(o => 
    o && ['READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'SHIPPING_FAILED'].includes(o.status)
  );

  const readyCount = myDeliveryOrders.filter(o => o.status === 'READY_TO_SHIP').length;
  const activeCount = myDeliveryOrders.filter(o => 
    o.status === 'SHIPPED' && (isManagerOrAdmin || !o.assignedShipperId || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username)
  ).length;
  const doneCount = myDeliveryOrders.filter(o => 
    o.status === 'DELIVERED' && (isManagerOrAdmin || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username)
  ).length;
  const failedCount = myDeliveryOrders.filter(o => 
    o.status === 'SHIPPING_FAILED' && (isManagerOrAdmin || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username)
  ).length;

  const totalCodCollected = myDeliveryOrders
    .filter(o => o.status === 'DELIVERED' && (isManagerOrAdmin || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username))
    .reduce((sum, o) => sum + (o.paymentMethod === 'COD' || !o.paymentMethod ? (parseFloat(o.totalAmount || o.total || 0)) : 0), 0);

  const pendingReturns = returnRequests.filter(r => ['RETURN_APPROVED', 'RETURNING_TO_WAREHOUSE'].includes(r.status));

  const stats = [
    { label: 'Đơn Chờ Nhận Giao', value: `${readyCount} đơn hàng`, change: 'Sẵn sàng lấy tại kho', icon: <Package size={20} />, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Đang Giao Trên Đường', value: `${activeCount} chuyến giao`, change: 'Shipper đang phụ trách', icon: <Truck size={20} />, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Giao Thành Công Hôm Nay', value: `${doneCount} đơn`, change: 'Đã ký nhận & nộp COD', icon: <CheckCircle size={20} />, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Giao Thất Bại / Hẹn Lại', value: `${failedCount} đơn`, change: 'Cần liên hệ hẹn lại ngày', icon: <XCircle size={20} />, color: failedCount > 0 ? '#ef4444' : '#64748b', bg: '#fef2f2' },
    { label: 'Tiền Mặt Thu Hộ (COD)', value: fmt(totalCodCollected), change: 'Tổng tiền cần đối soát kế toán', icon: <DollarSign size={20} />, color: '#0ea5e9', bg: '#f0f9ff' },
    { label: 'Đơn Thu Hồi Đổi Trả (RMA)', value: `${pendingReturns.length} đơn`, change: 'Cần đến nhà khách lấy về kho', icon: <RefreshCw size={20} />, color: '#8b5cf6', bg: '#f5f3ff' }
  ];

  // Chart 1: Delivery Success Ratio Doughnut
  const deliveryRatioData = {
    labels: ['Giao Thành Công', 'Đang Giao', 'Chờ Lấy', 'Thất Bại'],
    datasets: [
      {
        data: [doneCount || 15, activeCount || 4, readyCount || 6, failedCount || 1],
        backgroundColor: ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444']
      }
    ]
  };

  // Chart 2: Daily COD Collection Bar
  const dailyCodData = {
    labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'],
    datasets: [
      {
        label: 'Doanh Số COD Thu Hộ (Triệu VNĐ)',
        data: [18.5, 24.2, 16.0, 32.8, 28.5, 45.0, 22.0],
        backgroundColor: '#2563eb'
      }
    ]
  };

  // Tab Filtering Orders
  const filteredOrders = useMemo(() => {
    return myDeliveryOrders.filter(o => {
      const q = search.toLowerCase();
      const matchSearch = !search || 
        o.orderId?.toLowerCase().includes(q) || 
        o.customerName?.toLowerCase().includes(q) || 
        o.phone?.includes(q) || 
        o.shippingAddress?.toLowerCase().includes(q);

      const isAssignedToMe = !o.assignedShipperId || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username || isManagerOrAdmin;
      const isMyActiveOrder = String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username || isManagerOrAdmin;

      if (activeTab === 'pending') return matchSearch && o.status === 'READY_TO_SHIP' && isAssignedToMe;
      if (activeTab === 'active') return matchSearch && o.status === 'SHIPPED' && isMyActiveOrder;
      if (activeTab === 'history') return matchSearch && ['DELIVERED', 'SHIPPING_FAILED'].includes(o.status) && isMyActiveOrder;
      return matchSearch;
    });
  }, [myDeliveryOrders, search, activeTab, userIdStr, isManagerOrAdmin, user]);

  const handleClaimOrder = (orderId) => {
    if (typeof claimOrderForDelivery === 'function') {
      claimOrderForDelivery(orderId, user);
      alert(`🚚 Đã nhận đơn hàng #${orderId}! Đơn đã được chuyển sang tab "Đang Giao & Minh Chứng".`);
    } else {
      updateOrderStatus(orderId, 'SHIPPED');
      alert(`🚚 Đã nhận đơn hàng #${orderId}!`);
    }
  };

  const handleConfirmDelivered = () => {
    if (!deliverModal) return;
    updateOrderStatus(deliverModal.orderId || deliverModal.id, 'DELIVERED', {
      proofPhoto,
      receiverNote: receiverNote || 'Đã nhận hàng đầy đủ nguyên vẹn',
      deliveredAt: new Date().toISOString()
    });
    setDeliverModal(null);
    setReceiverNote('');
    alert('✅ Giao hàng thành công! Đã lưu ảnh minh chứng POD và ghi nhận thu COD.');
  };

  const handleFailDelivery = () => {
    if (!failModal || !failReason) {
      alert('Vui lòng chọn lý do giao hàng thất bại!');
      return;
    }
    updateOrderStatus(failModal.orderId || failModal.id, 'SHIPPING_FAILED', {
      failReason,
      failNote
    });
    setFailModal(null);
    setFailReason('');
    setFailNote('');
    alert('⚠️ Đã cập nhật trạng thái Giao Thất Bại / Hẹn Lại Ngày Khác.');
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={24} style={{ color: '#2563eb' }} />
            {activeTab === 'overview' && 'Tổng Quan Giao Vận & Điều Phối (Delivery Dashboard)'}
            {activeTab === 'pending' && 'Đơn Hàng Sẵn Sàng Giao (Chờ Nhận Đơn Tại Kho)'}
            {activeTab === 'active' && 'Đang Giao & Xác Nhận Minh Chứng (Proof of Delivery - POD)'}
            {activeTab === 'returns' && 'Thu Hồi Hàng Đổi Trả Tại Nhà Khách (RMA Pickup)'}
            {activeTab === 'history' && 'Lịch Sử Giao Hàng & Bảng Kê Thu Hộ (COD Ledger)'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
            Điều phối shipper, xác nhận giao hàng bằng ảnh minh chứng POD và đối soát tiền mặt COD
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (TỔNG QUAN GIAO VẬN) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div>
          {/* 6 Balanced KPI Cards (2 Rows x 3 Columns) */}
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
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', height: '320px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Tỷ Lệ Hoàn Thành Giao Hàng
              </h3>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut
                  data={deliveryRatioData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
                  }}
                />
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', height: '320px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Thu Hộ Tiền Mặt (COD) Trong Tuần
              </h3>
              <div style={{ flex: 1, position: 'relative' }}>
                <Bar
                  data={dailyCodData}
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
          </div>

          {/* Quick Tasks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0' }}>
                Đơn Hàng Gần Vị Trí Cần Nhận Giao
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {orders.filter(o => o.status === 'READY_TO_SHIP').slice(0, 3).map((o, oIdx) => (
                  <div key={o.id || oIdx} style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>#{o.orderId || o.id} — {o.customerName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>📍 {o.shippingAddress || 'Quận 1, TP. Hồ Chí Minh'}</span>
                    </div>
                    <button
                      onClick={() => handleClaimOrder(o.orderId || o.id)}
                      style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Nhận Giao
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0' }}>
                Yêu Cầu Thu Hồi RMA Cần Lấy
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pendingReturns.slice(0, 3).map((r, rIdx) => (
                  <div key={r.id || rIdx} style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>#RMA-{r.id} — {r.customerName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>📞 {r.phone}</span>
                    </div>
                    <button
                      onClick={() => setTab('returns')}
                      style={{ backgroundColor: '#8b5cf6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Xem Địa Chỉ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING (ĐƠN CHỜ LẤY TẠI KHO) */}
      {/* ========================================================================= */}
      {activeTab === 'pending' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Danh Sách Đơn Hàng Đã Đóng Gói — Sẵn Sàng Giao ({filteredOrders.length})
            </h3>
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="Tìm mã đơn, khách hàng, địa chỉ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Mã Đơn</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Khách Hàng & SĐT</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Địa Chỉ Giao Hàng</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Tiền Thu COD</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord, oIdx) => (
                  <tr key={ord.id || oIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#2563eb' }}>#{ord.orderId || ord.id}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>{ord.customerName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{ord.phone}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>📍 {ord.shippingAddress || 'Quận 1, TP. Hồ Chí Minh'}</td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {fmt(ord.totalAmount || ord.total)}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleClaimOrder(ord.orderId || ord.id)}
                        style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Truck size={13} /> Nhận Đơn Này
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACTIVE (ĐANG GIAO & MINH CHỨNG POD) */}
      {/* ========================================================================= */}
      {activeTab === 'active' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
            Đơn Hàng Bạn Đang Phụ Trách Giao Trên Đường ({filteredOrders.length})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
            {filteredOrders.map((ord, oIdx) => (
              <div key={ord.id || oIdx} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563eb' }}>#{ord.orderId || ord.id}</span>
                  <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                    ĐANG GIAO
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', color: '#475569', marginBottom: '1rem' }}>
                  <div><strong>Khách:</strong> {ord.customerName}</div>
                  <div><strong>SĐT:</strong> <a href={`tel:${ord.phone}`} style={{ color: '#2563eb', fontWeight: 700 }}>{ord.phone}</a></div>
                  <div><strong>Địa chỉ:</strong> 📍 {ord.shippingAddress || 'TP. Hồ Chí Minh'}</div>
                  <div style={{ marginTop: '0.25rem', padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#15803d', fontWeight: 800 }}>
                    Thu tiền mặt COD: {fmt(ord.totalAmount || ord.total)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setDeliverModal(ord)}
                    style={{ flex: 1, backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <CheckCircle size={15} /> Giao Thành Công (POD)
                  </button>
                  <button
                    onClick={() => setFailModal(ord)}
                    style={{ backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Báo Lỗi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RETURNS (THU HỒI ĐỔI TRẢ RMA) */}
      {/* ========================================================================= */}
      {activeTab === 'returns' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={18} style={{ color: '#8b5cf6' }} />
            <span>Thu Hồi Hàng Đổi Trả Tại Nhà Khách (RMA Pickup)</span>
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
            Shipper đến tận địa chỉ khách hàng lấy lại sản phẩm lỗi và bàn giao về kho để QC kiểm định
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Mã RMA</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Khách Hàng & SĐT</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Địa Chỉ Lấy Hàng</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Lý Do Đổi Trả</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác Shipper</th>
                </tr>
              </thead>
              <tbody>
                {pendingReturns.map((ret, rIdx) => (
                  <tr key={ret.id || rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#8b5cf6' }}>#RMA-{ret.id}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>{ret.customerName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{ret.phone}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>📍 {ret.address || 'Quận 7, TP. Hồ Chí Minh'}</td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>{ret.reason || 'Lỗi không nhận RAM'}</td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          updateReturnStatus(ret.id, 'RETURNING_TO_WAREHOUSE', `Shipper ${user?.fullname || user?.username} đã lấy hàng`);
                          alert('✅ Đã xác nhận nhận hàng thu hồi từ khách! Đang vận chuyển về kho.');
                        }}
                        style={{ backgroundColor: '#8b5cf6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.85rem', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ✓ Đã Lấy Hàng Về Kho
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HISTORY (LỊCH SỬ & ĐỐI SOÁT COD) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Lịch Sử Giao Hàng & Bảng Kê Đối Soát COD
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
                Tổng tiền mặt COD đã thu hộ cần nộp lại cho Kế toán: <strong style={{ color: '#16a34a' }}>{fmt(totalCodCollected)}</strong>
              </p>
            </div>
            <button
              onClick={() => alert('📤 Đã xuất bảng kê nộp tiền COD cho Phòng Kế Toán!')}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Nộp Tiền & Đối Soát COD
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Mã Đơn</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Khách Hàng</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Tiền COD</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Trạng Thái Giao</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Ghi Chú Minh Chứng POD</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord, oIdx) => (
                  <tr key={ord.id || oIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#2563eb' }}>#{ord.orderId || ord.id}</td>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>{ord.customerName}</td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmt(ord.totalAmount || ord.total)}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: `${STATUS_MAP[ord.status]?.color || '#64748b'}15`, color: STATUS_MAP[ord.status]?.color || '#64748b' }}>
                        {STATUS_MAP[ord.status]?.label || ord.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.75rem' }}>
                      {ord.receiverNote || ord.failReason || 'Đã giao thành công'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: MINH CHỨNG GIAO HÀNG POD ================= */}
      {deliverModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '480px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Xác Nhận Giao Hàng (POD) #{deliverModal.orderId || deliverModal.id}</h3>
              <button onClick={() => setDeliverModal(null)} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#15803d' }}>
                <strong>Tiền mặt thu hộ COD: {fmt(deliverModal.totalAmount || deliverModal.total)}</strong>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Ảnh minh chứng giao hàng (POD):</label>
                <img src={proofPhoto} alt="POD" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Ghi chú người nhận:</label>
                <input
                  type="text"
                  placeholder="Khách đã ký nhận nguyên vẹn niêm phong..."
                  value={receiverNote}
                  onChange={e => setReceiverNote(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setDeliverModal(null)}
                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelivered}
                  style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  ✓ Hoàn Tất Giao Hàng
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: BÁO GIAO THẤT BẠI ================= */}
      {failModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '480px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>Báo Giao Thất Bại #{failModal.orderId || failModal.id}</h3>
              <button onClick={() => setFailModal(null)} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Lý do không giao được *</label>
                <select
                  value={failReason}
                  onChange={e => setFailReason(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  <option value="">-- Chọn lý do --</option>
                  {FAIL_PRESETS.map((p, pIdx) => <option key={pIdx} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Ghi chú chi tiết:</label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Khách hẹn giao lại sau 17h chiều mai..."
                  value={failNote}
                  onChange={e => setFailNote(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFailModal(null)}
                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleFailDelivery}
                  style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Xác Nhận Hẹn Lại
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
