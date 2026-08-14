import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import {
  Truck, Package, MapPin, Phone, User, CheckCircle, Clock,
  XCircle, Navigation, Search, BarChart2, AlertCircle, RefreshCw, Eye, X,
  Camera, Image, FileText, Calendar, Upload
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

const STATUS_MAP = {
  READY_TO_SHIP: { label: 'Chờ lấy hàng', color: '#f59e0b', badge: 'badge-warning' },
  SHIPPED: { label: 'Đang giao', color: '#6366f1', badge: 'badge-info' },
  DELIVERED: { label: 'Đã giao', color: '#10b981', badge: 'badge-success' },
  SHIPPING_FAILED: { label: 'Giao thất bại', color: '#ef4444', badge: 'badge-danger' },
  CANCELLED: { label: 'Đã huỷ', color: '#ef4444', badge: 'badge-danger' },
};

const FAIL_PRESETS = [
  'Khách không nghe máy (Gọi 3 lần)',
  'Khách hẹn lại ngày khác',
  'Địa chỉ sai / Không tìm thấy nhà',
  'Khách từ chối nhận hàng / Đổi ý',
  'Khách chưa chuẩn bị đủ tiền mặt',
  'Hàng bị hư hỏng / móp méo khi vận chuyển'
];

const PROOF_PHOTO_PRESETS = [
  { id: 1, name: 'Minh chứng mặc định 1', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80' },
  { id: 2, name: 'Minh chứng mặc định 2', url: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=600&auto=format&fit=crop&q=80' }
];

export default function Delivery() {
  const { orders, updateOrderStatus, claimOrderForDelivery } = useERP();
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Date Range Filter States
  const [deliveryStartDate, setDeliveryStartDate] = useState('');
  const [deliveryEndDate, setDeliveryEndDate] = useState('');

  // Delivery Failure Modal State
  const [failModal, setFailModal] = useState(null);
  const [failReason, setFailReason] = useState('');
  const [failNote, setFailNote] = useState('');

  // Proof of Delivery Modal State
  const [deliverModal, setDeliverModal] = useState(null);
  const [proofPhoto, setProofPhoto] = useState('');
  const [receiverNote, setReceiverNote] = useState('');

  const isManagerOrAdmin = ['CEO', 'ADMIN', 'WAREHOUSE_MANAGER', 'SALES_MANAGER'].includes(user?.role);
  const userIdStr = String(user?.id || user?.username || '');

  const dateFilteredMyOrders = (orders || []).filter(o => 
    o && ['READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'SHIPPING_FAILED'].includes(o.status) &&
    isDateInRange(o.deliveredDate || o.date || o.createdAt, deliveryStartDate, deliveryEndDate)
  );

  const readyCount = dateFilteredMyOrders.filter(o => 
    o.status === 'READY_TO_SHIP' && 
    (isManagerOrAdmin || !o.assignedShipperId || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username)
  ).length;

  const activeCount = dateFilteredMyOrders.filter(o => 
    o.status === 'SHIPPED' && 
    (isManagerOrAdmin || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username)
  ).length;

  const failedCount = dateFilteredMyOrders.filter(o => 
    o.status === 'SHIPPING_FAILED' && 
    (isManagerOrAdmin || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username)
  ).length;

  const doneCount = dateFilteredMyOrders.filter(o => 
    o.status === 'DELIVERED' && 
    (isManagerOrAdmin || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username)
  ).length;

  const filteredOrders = dateFilteredMyOrders.filter(o => {
    const matchSearch = !search || o.orderId?.toLowerCase().includes(search.toLowerCase())
      || o.customerName?.toLowerCase().includes(search.toLowerCase())
      || o.phone?.includes(search);
    
    // Shipper ownership check
    const isAssignedToMe = !o.assignedShipperId || String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username || isManagerOrAdmin;
    const isMyActiveOrder = String(o.assignedShipperId) === userIdStr || o.assignedShipperId === user?.username || isManagerOrAdmin;

    if (tab === 'pending') return matchSearch && o.status === 'READY_TO_SHIP' && isAssignedToMe;
    if (tab === 'active') return matchSearch && o.status === 'SHIPPED' && isMyActiveOrder;
    if (tab === 'failed') return matchSearch && o.status === 'SHIPPING_FAILED' && isMyActiveOrder;
    if (tab === 'done') return matchSearch && o.status === 'DELIVERED' && isMyActiveOrder;
    return matchSearch && isAssignedToMe;
  });

  const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const handlePickup = (orderId) => {
    if (typeof claimOrderForDelivery === 'function') {
      const res = claimOrderForDelivery(orderId, user);
      if (res.success) {
        alert(res.message);
      } else {
        alert(res.message);
      }
    } else {
      updateOrderStatus(orderId, 'SHIPPED', `Đã lấy hàng và đang giao – NV: ${user?.fullname || user?.name || 'Giao hàng'}`);
      alert(`✅ Đã nhận đơn ${orderId}. Chuyển sang trạng thái đang giao hàng.`);
    }
  };

  const handleOpenDeliverModal = (orderId) => {
    setProofPhoto('');
    setReceiverNote('Khách hàng đã nhận đủ hàng và thanh toán đầy đủ.');
    setDeliverModal({ orderId });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Dung lượng ảnh tối đa là 5MB!');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setProofPhoto(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmDeliver = () => {
    if (!receiverNote.trim() && !proofPhoto) {
      alert('Vui lòng tải ảnh minh chứng hoặc nhập ghi chú người nhận hàng!');
      return;
    }
    const { orderId } = deliverModal;
    const nowStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const noteText = `Đã giao thành công lúc ${nowStr} – NV: ${user?.fullname || user?.name || 'Giao hàng'}. Ghi chú: ${receiverNote.trim()}`;
    
    updateOrderStatus(orderId, 'DELIVERED', noteText, {
      proofPhoto: proofPhoto || PROOF_PHOTO_PRESETS[0].url,
      receiverNote: receiverNote.trim(),
      deliveredDate: new Date().toLocaleDateString('vi-VN'),
      deliveredTime: nowStr
    });

    setDeliverModal(null);
    setProofPhoto('');
    setReceiverNote('');
    alert(`🎉 ✅ Đơn hàng ${orderId} đã được xác nhận Giao Thành Công với đầy đủ ảnh minh chứng!`);
  };

  const handleOpenFailModal = (orderId) => {
    setFailReason(FAIL_PRESETS[0]);
    setFailNote('');
    setFailModal({ orderId });
  };

  const handleConfirmFail = () => {
    const finalReason = failReason.trim() + (failNote.trim() ? ` (${failNote.trim()})` : '');
    if (!finalReason) {
      alert('Vui lòng chọn hoặc nhập lý do giao thất bại!');
      return;
    }
    const { orderId } = failModal;
    const nowStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    updateOrderStatus(orderId, 'SHIPPING_FAILED', `Giao thất bại: ${finalReason}`, {
      failureReason: finalReason,
      failureDate: new Date().toLocaleDateString('vi-VN'),
      failureTime: nowStr
    });

    setFailModal(null);
    setFailReason('');
    setFailNote('');
    alert(`⚠️ Đã ghi nhận lý do giao thất bại cho đơn hàng ${orderId}`);
  };

  // KPIs
  const todayStr = new Date().toLocaleDateString('vi-VN');
  const doneTodayCount = dateFilteredMyOrders.filter(o => o.status === 'DELIVERED' && (o.deliveredDate === todayStr || o.date === todayStr)).length;
  const totalValue = dateFilteredMyOrders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + (o.totalAmount || 0), 0);

  const kpis = [
    { label: 'Chờ lấy hàng', value: readyCount, icon: <Package size={20}/>, color: '#f59e0b' },
    { label: 'Đang giao', value: activeCount, icon: <Truck size={20}/>, color: '#6366f1' },
    { label: 'Giao thất bại', value: failedCount, icon: <XCircle size={20}/>, color: '#ef4444' },
    { label: 'Đã giao (hệ thống)', value: doneCount, icon: <CheckCircle size={20}/>, color: '#10b981' },
    { label: 'Tổng giá trị đã giao', value: fmt(totalValue), icon: <BarChart2 size={20}/>, color: '#0ea5e9', wide: true },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── MODAL 1: BẢNG MINH CHỨNG GIAO HÀNG THÀNH CÔNG (POD) ── */}
      {deliverModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ padding: '1.75rem', width: '100%', maxWidth: '520px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 800 }}>
                <Camera size={22}/> Minh Chứng Giao Hàng Thành Công
              </h3>
              <button onClick={() => setDeliverModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
              Đơn hàng: <strong style={{ color: '#2563eb', fontSize: '0.95rem' }}>{deliverModal.orderId}</strong> — Vui lòng cập nhật ảnh chụp & ghi chú bàn giao:
            </p>

            {/* Khung Tải Ảnh Từ Máy */}
            <div style={{ marginBottom: '1.15rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <Upload size={16} style={{ color: '#2563eb' }} />
                1. Tải ảnh chụp minh chứng thực tế từ máy:
              </label>

              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.25rem 1rem',
                backgroundColor: proofPhoto ? '#f0fdf4' : '#f8fafc',
                border: proofPhoto ? '2px dashed #16a34a' : '2px dashed #cbd5e1',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  backgroundColor: proofPhoto ? '#dcfce7' : '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '0.5rem', color: proofPhoto ? '#16a34a' : '#2563eb'
                }}>
                  {proofPhoto ? <CheckCircle size={24} /> : <Camera size={24} />}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: proofPhoto ? '#15803d' : '#0f172a' }}>
                  {proofPhoto ? '✅ Đã chọn ảnh minh chứng!' : 'Bấm vào đây để tải ảnh hoặc chụp hình'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                  (Tải ảnh từ Điện thoại / Máy tính — Tối đa 5MB)
                </span>
              </label>

              {/* Preview Thumbnail */}
              {proofPhoto && (
                <div style={{ marginTop: '0.75rem', padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #bbf7d0', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Image size={14} /> Xem trước ảnh minh chứng đã tải:
                  </div>
                  <img src={proofPhoto} alt="Minh chứng giao hàng" style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain', border: '1px solid #cbd5e1' }} />
                  <button
                    onClick={() => setProofPhoto('')}
                    style={{ marginTop: '6px', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✕ Xóa ảnh này để chọn ảnh khác
                  </button>
                </div>
              )}
            </div>

            {/* Ghi chú nhận hàng */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                2. Ghi chú xác nhận / Tên người ký nhận:
              </label>
              <textarea
                value={receiverNote}
                onChange={e => setReceiverNote(e.target.value)}
                placeholder="Nhập tên người nhận thay, hoặc ghi chú kiểm tra tiền..."
                rows={2}
                style={{ width: '100%', resize: 'vertical', padding: '0.5rem 0.65rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setDeliverModal(null)} className="btn" style={{ flex: 1, padding: '0.6rem', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 700, borderRadius: '8px', cursor: 'pointer' }}>
                Hủy
              </button>
              <button onClick={handleConfirmDeliver} className="btn" style={{ flex: 1.5, padding: '0.6rem', background: '#16a34a', color: '#ffffff', fontWeight: 800, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <CheckCircle size={16}/> Xác Nhận Giao Thành Công
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: BẢNG GHI NHẬN GIAO HÀNG THẤT BẠI ── */}
      {failModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ padding: '1.75rem', width: '100%', maxWidth: '480px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 800 }}>
                <XCircle size={22}/> Ghi Nhận Giao Thất Bại
              </h3>
              <button onClick={() => setFailModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
              Đơn hàng <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{failModal.orderId}</strong> — Vui lòng chọn hoặc nhập lý do chi tiết:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {FAIL_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setFailReason(preset)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: failReason === preset ? 700 : 500,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: failReason === preset ? '#fef2f2' : '#f8fafc',
                    border: failReason === preset ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    color: failReason === preset ? '#dc2626' : '#475569',
                    transition: 'all 0.15s'
                  }}
                >
                  • {preset}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                Chi tiết / Ghi chú bổ sung:
              </label>
              <textarea
                value={failNote}
                onChange={e => setFailNote(e.target.value)}
                placeholder="Ví dụ: Gọi 3 cuộc lúc 10h, 14h, 16h không ai nhấc máy..."
                rows={2}
                style={{ width: '100%', resize: 'vertical', padding: '0.5rem 0.65rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setFailModal(null)} className="btn" style={{ flex: 1, padding: '0.6rem', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 700, borderRadius: '8px', cursor: 'pointer' }}>
                Hủy
              </button>
              <button onClick={handleConfirmFail} className="btn" style={{ flex: 1.5, padding: '0.6rem', background: '#ef4444', color: '#ffffff', fontWeight: 800, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <XCircle size={16}/> Xác Nhận Thất Bại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <Truck size={28} style={{ color: '#6366f1' }} />
          Giao Hàng & Vận Chuyển
        </h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Quản lý lộ trình vận chuyển, lưu vết minh chứng giao hàng và xử lý sự cố.
        </p>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map((k, i) => (
          <div key={i} className="card-glass" style={{ padding: '1.25rem', borderLeft: `4px solid ${k.color}`, display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <div style={{ color: k.color, backgroundColor: `${k.color}15`, padding: '0.625rem', borderRadius: '8px' }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: k.wide ? '1.1rem' : '1.75rem', fontWeight: 800, color: '#0f172a' }}>{k.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TOOLBAR: ROW 1 (TABS & SEARCH) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { key: 'pending', label: `Chờ lấy hàng (${readyCount})` },
            { key: 'active', label: `Đang giao (${activeCount})` },
            { key: 'failed', label: `Giao thất bại (${failedCount})` },
            { key: 'done', label: `Đã giao (${doneCount})` },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); }}
              style={{
                padding: '0.625rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 700,
                color: tab === t.key ? '#2563eb' : '#64748b',
                borderBottom: tab === t.key ? '2.5px solid #2563eb' : '2.5px solid transparent',
                transition: 'all 0.2s'
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '320px', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, tên KH, SĐT..." className="input-field"
            style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.5rem 0.85rem 0.5rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem' }} />
        </div>
      </div>

      {/* ── TOOLBAR: ROW 2 (DATE RANGE FILTER SUB-BAR) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', padding: '0.45rem 0.85rem', backgroundColor: (deliveryStartDate || deliveryEndDate) ? '#eff6ff' : '#ffffff', border: (deliveryStartDate || deliveryEndDate) ? '1px solid #bfdbfe' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem' }}>
        <span style={{ color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <Calendar size={14} style={{ color: '#2563eb' }} />
          Lọc Theo Ngày Tạo / Giao Hàng:
        </span>
        <span style={{ color: '#64748b', fontWeight: 600 }}>Từ:</span>
        <input
          type="date"
          value={deliveryStartDate}
          onChange={(e) => setDeliveryStartDate(e.target.value)}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.2rem 0.45rem',
            fontSize: '0.78rem',
            color: '#0f172a',
            backgroundColor: '#ffffff',
            outline: 'none'
          }}
        />
        <span style={{ color: '#64748b', fontWeight: 600 }}>Đến:</span>
        <input
          type="date"
          value={deliveryEndDate}
          onChange={(e) => setDeliveryEndDate(e.target.value)}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.2rem 0.45rem',
            fontSize: '0.78rem',
            color: '#0f172a',
            backgroundColor: '#ffffff',
            outline: 'none'
          }}
        />
        {(deliveryStartDate || deliveryEndDate) && (
          <button
            onClick={() => {
              setDeliveryStartDate('');
              setDeliveryEndDate('');
            }}
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#ef4444',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '6px',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
              marginLeft: '0.2rem',
              whiteSpace: 'nowrap'
            }}
            title="Xóa khoảng thời gian"
          >
            ✕ Xóa Lọc Ngày
          </button>
        )}
      </div>

      {/* ── ORDERS GRID ── */}
      {filteredOrders.length === 0 ? (
        <div className="card-glass" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
          <Truck size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Không tìm thấy đơn hàng nào trong khoảng thời gian hoặc điều kiện lọc này.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
          {filteredOrders.map(order => {
            const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#64748b' };
            return (
              <div key={order.orderId} style={{
                padding: '1.25rem', display: 'flex', flexDirection: 'column',
                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px',
                borderLeft: `5px solid ${statusInfo.color}`, boxShadow: '0 4px 15px rgba(15,23,42,0.06)',
                height: '100%'
              }}>
                {/* Upper Body Content Wrapper */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Order header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#2563eb',
                        fontSize: '1rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                      title="Bấm để xem chi tiết đơn hàng"
                    >
                      <Eye size={15} />
                      {order.orderId}
                    </button>
                    <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.725rem', fontWeight: 800,
                      backgroundColor: `${statusInfo.color}15`, color: statusInfo.color, border: `1px solid ${statusInfo.color}40` }}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {order.assignedShipperName && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '6px', width: 'fit-content', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Truck size={12} /> Giao bởi: {order.assignedShipperName}
                    </div>
                  )}

                  {/* Customer info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                      <User size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                      <strong style={{ fontWeight: 700 }}>{order.customerName || 'Khách hàng'}</strong>
                    </div>
                    {order.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                        <Phone size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                        <a href={`tel:${order.phone}`} style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>{order.phone}</a>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#334155' }}>
                      <MapPin size={14} style={{ color: '#64748b', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontWeight: 500 }}>{order.shippingAddress || 'Địa chỉ không xác định'}</span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div style={{ padding: '0.625rem 0.75rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.76rem', color: '#475569', minHeight: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {(order.items || []).slice(0, 2).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#0f172a' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{item.name || item.productId}</span>
                        <span style={{ color: '#64748b' }}>x{item.quantity}</span>
                      </div>
                    ))}
                    {(order.items || []).length > 2 && <span style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.7rem' }}>+{order.items.length - 2} sản phẩm khác</span>}
                  </div>

                  {/* ── POD / FAILURE PROOF SECTION ── */}
                  {order.status === 'DELIVERED' && (
                    <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.76rem' }}>
                      <div style={{ color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                        <CheckCircle size={14}/> Minh Chứng Giao Thành Công:
                      </div>
                      <div style={{ color: '#15803d', fontWeight: 600 }}>
                        {order.receiverNote || 'Khách đã ký nhận & thanh toán đủ.'}
                      </div>
                      {order.proofPhoto && (
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img src={order.proofPhoto} alt="Minh chứng" style={{ width: '64px', height: '42px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #86efac' }} />
                          <span style={{ fontSize: '0.7rem', color: '#16a34a', fontStyle: 'italic', fontWeight: 600 }}>📷 Đã đính kèm minh chứng</span>
                        </div>
                      )}
                    </div>
                  )}

                  {order.status === 'SHIPPING_FAILED' && (
                    <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.76rem' }}>
                      <div style={{ color: '#dc2626', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <XCircle size={14}/> Lý Do Giao Thất Bại:
                      </div>
                      <div style={{ color: '#991b1b', fontWeight: 700 }}>
                        {order.failureReason || order.lastNote || 'Không liên lạc được khách hàng.'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Wrapper */}
                <div style={{ marginTop: 'auto', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* Amount */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{order.date}</span>
                    <strong style={{ color: '#16a34a', fontSize: '1rem', fontWeight: 800 }}>{fmt(order.totalAmount)}</strong>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.35rem' }}>
                    {order.status === 'READY_TO_SHIP' && (
                      <button onClick={() => handlePickup(order.orderId)} className="btn btn-primary" style={{ flex: 1, fontSize: '0.825rem', padding: '0.55rem', borderRadius: '8px', backgroundColor: '#16a34a', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Truck size={15} style={{ marginRight: '4px' }}/> Nhận Giao
                      </button>
                    )}
                    {order.status === 'SHIPPING_FAILED' && (
                      <button onClick={() => handlePickup(order.orderId)} style={{ flex: 1, fontSize: '0.825rem', padding: '0.55rem', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={15} style={{ marginRight: '4px' }}/> Thử Giao Lại
                      </button>
                    )}
                    {order.status === 'SHIPPED' && (<>
                      <button onClick={() => handleOpenDeliverModal(order.orderId)} className="btn btn-primary" style={{ flex: 1, fontSize: '0.825rem', padding: '0.55rem', borderRadius: '8px', backgroundColor: '#2563eb', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={15} style={{ marginRight: '4px' }}/> Đã Giao
                      </button>
                      <button onClick={() => handleOpenFailModal(order.orderId)} style={{ fontSize: '0.825rem', padding: '0.55rem 0.85rem', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <XCircle size={15} style={{ marginRight: '4px' }}/> Thất Bại
                      </button>
                    </>)}
                    {order.status === 'DELIVERED' && (
                      <div style={{ flex: 1, padding: '0.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', color: '#16a34a', fontSize: '0.825rem', fontWeight: 800 }}>
                        <CheckCircle size={15}/> Đã giao thành công
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL 3: CHI TIẾT ĐƠN HÀNG (SELECTED ORDER) ── */}
      {selectedOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }} onClick={() => setSelectedOrder(null)}>
          <div style={{
            width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto',
            padding: '1.75rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
            borderRadius: '16px', boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>
                  Chi Tiết Đơn Hàng Vận Chuyển: {selectedOrder.orderId}
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  Ngày tạo: {selectedOrder.date || 'N/A'} | Loại: {selectedOrder.type || 'ONLINE'}
                </span>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            {/* Receiver Info */}
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <User size={14}/> Khách Hàng
                </div>
                <strong style={{ color: '#0f172a', fontWeight: 800 }}>{selectedOrder.customerName || 'Khách hàng'}</strong>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <Phone size={14}/> Điện Thoại
                </div>
                <a href={`tel:${selectedOrder.phone}`} style={{ color: '#2563eb', fontWeight: 800, textDecoration: 'none' }}>{selectedOrder.phone || 'N/A'}</a>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <MapPin size={14}/> Địa Chỉ Giao Hàng
                </div>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedOrder.shippingAddress || 'N/A'}</span>
              </div>
            </div>

            {/* POD or Failure Detail Box */}
            {selectedOrder.status === 'DELIVERED' && (
              <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.88rem', color: '#15803d', fontWeight: 800, margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={18}/> Minh Chứng Giao Hàng Thành Công
                </h4>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                  📝 <strong>Ghi chú bàn giao:</strong> {selectedOrder.receiverNote || selectedOrder.lastNote || 'Đã bàn giao và thu tiền mặt đầy đủ.'}
                </p>
                {selectedOrder.proofPhoto && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginBottom: '4px' }}>📷 Ảnh Chụp Minh Chứng:</div>
                    <img src={selectedOrder.proofPhoto} alt="Minh chứng giao hàng" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '10px', border: '1.5px solid #86efac' }} />
                  </div>
                )}
              </div>
            )}

            {selectedOrder.status === 'SHIPPING_FAILED' && (
              <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.88rem', color: '#dc2626', fontWeight: 800, margin: '0 0 0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle size={18}/> Chi Tiết Lý Do Giao Thất Bại
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b', fontWeight: 700 }}>
                  ⚠️ <strong>Lý do ghi nhận:</strong> {selectedOrder.failureReason || selectedOrder.lastNote || 'Khách không nghe máy / hẹn lại ngày khác'}
                </p>
              </div>
            )}

            {/* Items */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={16}/> Danh Sách Hàng Cần Giao ({(selectedOrder.items || []).length})
              </h4>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1', fontWeight: 700 }}>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>Sản Phẩm</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', width: '70px' }}>Số Lượng</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', width: '120px' }}>Đơn Giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#0f172a', fontWeight: 700 }}>
                          {item.name || item.productName || item.productId}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>x{item.quantity || 1}</td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{fmt(item.price || item.unitPrice || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total */}
            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>Tổng Tiền Thu Khách:</span>
              <strong style={{ color: '#16a34a', fontSize: '1.3rem', fontWeight: 800 }}>{fmt(selectedOrder.totalAmount)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedOrder(null)} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
