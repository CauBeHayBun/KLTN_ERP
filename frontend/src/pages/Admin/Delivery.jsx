import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import {
  Truck, Package, MapPin, Phone, User, CheckCircle, Clock,
  XCircle, Navigation, Search, BarChart2, AlertCircle, RefreshCw,
  Camera, Image, Upload, FileCheck, Eye, Check, X, ShieldCheck
} from 'lucide-react';

const STATUS_MAP = {
  READY_TO_SHIP: { label: 'Chờ lấy hàng', color: '#f59e0b', badge: 'badge-warning' },
  SHIPPED: { label: 'Đang giao', color: '#6366f1', badge: 'badge-info' },
  DELIVERED: { label: 'Đã giao', color: '#10b981', badge: 'badge-success' },
  SHIPPING_FAILED: { label: 'Giao thất bại', color: '#ef4444', badge: 'badge-danger' },
  CANCELLED: { label: 'Đã huỷ', color: '#ef4444', badge: 'badge-danger' },
};

export default function Delivery() {
  const { orders, updateOrderStatus } = useERP();
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  
  // Modals state
  const [failModal, setFailModal] = useState(null);
  const [failReason, setFailReason] = useState('');
  
  const [deliverModal, setDeliverModal] = useState(null);
  const [proofImage, setProofImage] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [viewProofModal, setViewProofModal] = useState(null);
  const [statsTimeRange, setStatsTimeRange] = useState('ALL'); // 'TODAY', 'WEEK', 'MONTH', 'ALL'

  // Time Range Filter for Delivered Statistics
  const getDeliveredOrdersByTime = () => {
    const now = new Date();
    return (orders || []).filter(o => {
      if (!o || o.status !== 'DELIVERED') return false;
      if (statsTimeRange === 'ALL') return true;

      let oDate;
      const dateStr = o.deliveredAtTime || o.deliveredDate || o.date;
      if (dateStr) {
        if (typeof dateStr === 'string' && dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length >= 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2].split(' ')[0]);
            oDate = new Date(year, month, day);
          } else {
            oDate = new Date(dateStr);
          }
        } else {
          oDate = new Date(dateStr);
        }
      }

      if (!oDate || isNaN(oDate.getTime())) return true;

      if (statsTimeRange === 'TODAY') {
        return oDate.toDateString() === now.toDateString();
      }
      if (statsTimeRange === 'WEEK') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return oDate >= weekAgo && oDate <= now;
      }
      if (statsTimeRange === 'MONTH') {
        return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const filteredDeliveredOrders = getDeliveredOrdersByTime();
  const timeBasedDoneCount = filteredDeliveredOrders.length;
  const timeBasedTotalValue = filteredDeliveredOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);

  const myOrders = orders.filter(o => ['READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'SHIPPING_FAILED'].includes(o.status));

  const readyCount = (orders || []).filter(o => o && o.status === 'READY_TO_SHIP').length;
  const activeCount = (orders || []).filter(o => o && o.status === 'SHIPPED').length;
  const failedCount = (orders || []).filter(o => o && o.status === 'SHIPPING_FAILED').length;
  const doneCount = (orders || []).filter(o => o && o.status === 'DELIVERED').length;

  const filteredOrders = myOrders.filter(o => {
    const matchSearch = !search || o.orderId?.toLowerCase().includes(search.toLowerCase())
      || o.customerName?.toLowerCase().includes(search.toLowerCase())
      || o.phone?.includes(search);
    if (tab === 'pending') return matchSearch && o.status === 'READY_TO_SHIP';
    if (tab === 'active') return matchSearch && o.status === 'SHIPPED';
    if (tab === 'failed') return matchSearch && o.status === 'SHIPPING_FAILED';
    if (tab === 'done') return matchSearch && o.status === 'DELIVERED';
    return matchSearch;
  });

  const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  const kpis = [
    { label: 'Chờ lấy hàng', value: readyCount, icon: <Package size={20}/>, color: '#f59e0b' },
    { label: 'Đang giao', value: activeCount, icon: <Truck size={20}/>, color: '#6366f1' },
    { label: 'Giao thất bại', value: failedCount, icon: <XCircle size={20}/>, color: '#ef4444' },
    { label: statsTimeRange === 'TODAY' ? 'Đã giao (Hôm nay)' : statsTimeRange === 'WEEK' ? 'Đã giao (7 ngày)' : statsTimeRange === 'MONTH' ? 'Đã giao (Tháng này)' : 'Đã giao (Tất cả)', value: `${timeBasedDoneCount} đơn`, icon: <CheckCircle size={20}/>, color: '#10b981' },
    { label: 'Giá trị đã giao', value: fmt(timeBasedTotalValue), icon: <BarChart2 size={20}/>, color: '#0ea5e9', wide: true },
  ];

  const handlePickup = (orderId) => {
    updateOrderStatus(orderId, 'SHIPPED', `Đã lấy hàng và đang giao – NV: ${user?.fullname || user?.name || 'Giao hàng'}`);
    alert(`✅ Đã nhận đơn ${orderId}. Chuyển sang đang giao hàng.`);
  };

  // Open Deliver Confirmation Modal with Proof Requirement
  const handleOpenDeliverModal = (order) => {
    setDeliverModal(order);
    setReceiverName(order.customerName || '');
    setDeliveryNote('Khách hàng đã nhận nguyên vẹn và kiểm tra hàng đầy đủ.');
    setProofImage('');
  };

  // Handle Real File Upload
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProofImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Confirm Deliver Action
  const handleConfirmDeliver = () => {
    if (!proofImage) {
      alert('Vui lòng tải ảnh minh chứng hoặc chụp ảnh giao hàng thành công!');
      return;
    }
    if (!receiverName.trim()) {
      alert('Vui lòng nhập tên người nhận thực tế!');
      return;
    }

    const orderId = deliverModal.orderId;
    const timestampStr = new Date().toLocaleString('vi-VN');

    updateOrderStatus(
      orderId, 
      'DELIVERED', 
      `Đã giao cho ${receiverName.trim()} – NV: ${user?.fullname || 'Shipper'}`,
      {
        proofImage,
        receiverName: receiverName.trim(),
        deliveryNote: deliveryNote.trim(),
        deliveredAtTime: timestampStr
      }
    );

    setDeliverModal(null);
    setProofImage('');
    setReceiverName('');
    setDeliveryNote('');
    alert(`✅ Đơn ${orderId} đã lưu minh chứng giao hàng & cập nhật trạng thái ĐÃ GIAO HÀNG thành công!`);
  };

  const handleFail = (orderId) => {
    setFailReason('');
    setFailModal({ orderId });
  };

  const handleConfirmFail = () => {
    if (!failReason.trim()) {
      alert('Vui lòng nhập lý do giao thất bại!');
      return;
    }
    const { orderId } = failModal;
    updateOrderStatus(orderId, 'SHIPPING_FAILED', 'Giao thất bại: ' + failReason.trim());
    setFailModal(null);
    setFailReason('');
    alert('Đã ghi nhận giao thất bại cho đơn ' + orderId);
  };

  const FAIL_PRESETS = ['Khách không nghe máy', 'Không có người nhận', 'Địa chỉ sai / không tìm thấy', 'Khách từ chối nhận hàng', 'Hàng bị hư hỏng khi vận chuyển'];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── 1. MODAL: PROOF OF DELIVERY CONFIRMATION (DELIVER MODAL) ── */}
      {deliverModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ padding: '1.75rem', width: '100%', maxWidth: '580px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '10px' }}>
                  <Camera size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Xác Nhận Giao Hàng & Tải Minh Chứng
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700 }}>Mã đơn hàng: #{deliverModal.orderId}</span>
                </div>
              </div>
              <button onClick={() => setDeliverModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Customer Info Card */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Khách nhận đặt hàng:</span>
                <strong style={{ color: '#0f172a' }}>{deliverModal.customerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Địa chỉ giao hàng:</span>
                <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right', maxWidth: '65%' }}>{deliverModal.shippingAddress || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tổng thu COD:</span>
                <strong style={{ color: '#16a34a', fontSize: '0.95rem' }}>{fmt(deliverModal.totalAmount)}</strong>
              </div>
            </div>

            {/* Proof Image Upload Box */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                📷 Ảnh Minh Chứng Giao Hàng Thành Công <span style={{ color: '#dc2626' }}>*</span>
              </label>

              {/* Upload Input */}
              {!proofImage ? (
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', backgroundColor: '#fafafa', position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    title="Chọn hoặc chụp ảnh minh chứng"
                  />
                  <Upload size={28} style={{ color: '#2563eb', marginBottom: '0.4rem' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#2563eb' }}>
                    Bấm để Chọn Ảnh từ thiết bị hoặc Chụp Ảnh thực tế
                  </p>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Hỗ trợ JPG, PNG, WEBP</span>
                </div>
              ) : (
                <div style={{ marginTop: '0.5rem', position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src={proofImage} alt="Minh chứng giao hàng" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle size={15} /> Đã tải tệp ảnh minh chứng
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Ảnh đã chọn sẵn sàng đính kèm</span>
                  </div>
                  <button
                    onClick={() => setProofImage('')}
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Xóa / Đổi ảnh
                  </button>
                </div>
              )}
            </div>

            {/* Receiver Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                Họ & Tên Người Nhận Thực Tế <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={e => setReceiverName(e.target.value)}
                placeholder="Nhập tên người nhận (Ví dụ: Ngô Thanh Hà - Chính chủ)"
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Delivery Note */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                Ghi Chú Giao Hàng
              </label>
              <textarea
                value={deliveryNote}
                onChange={e => setDeliveryNote(e.target.value)}
                placeholder="Ghi chú thêm về tình trạng kiện hàng..."
                rows={2}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setDeliverModal(null)} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                Hủy
              </button>
              <button
                onClick={handleConfirmDeliver}
                disabled={!proofImage || !receiverName.trim()}
                style={{
                  flex: 2, padding: '0.65rem', borderRadius: '10px', border: 'none',
                  backgroundColor: proofImage && receiverName.trim() ? '#16a34a' : '#94a3b8',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', cursor: proofImage && receiverName.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  boxShadow: proofImage && receiverName.trim() ? '0 4px 12px rgba(22, 163, 74, 0.3)' : 'none'
                }}
              >
                <CheckCircle size={16} /> Xác Nhận Giao Thành Công
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 2. MODAL: VIEW PROOF OF DELIVERY (VIEW PROOF MODAL) ── */}
      {viewProofModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ padding: '1.5rem', width: '100%', maxWidth: '600px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={22} style={{ color: '#16a34a' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Minh Chứng Giao Hàng Đơn #{viewProofModal.orderId}
                </h3>
              </div>
              <button onClick={() => setViewProofModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Proof Image Box */}
            <div style={{ marginBottom: '1rem', borderRadius: '12px', overflow: 'hidden', border: '2px solid #16a34a', backgroundColor: '#0f172a' }}>
              {viewProofModal.proofImage ? (
                <img src={viewProofModal.proofImage} alt="Ảnh minh chứng giao hàng" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain' }} />
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  <Image size={40} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                  <p style={{ margin: 0 }}>Đơn hàng này chưa đính kèm tệp ảnh minh chứng.</p>
                </div>
              )}
            </div>

            {/* Proof Metadata */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Người nhận thực tế:</span>
                <strong style={{ color: '#0f172a' }}>{viewProofModal.receiverName || viewProofModal.customerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Thời gian giao xong:</span>
                <strong style={{ color: '#16a34a' }}>{viewProofModal.deliveredAtTime || viewProofModal.date || 'Đã đối soát'}</strong>
              </div>
              {viewProofModal.deliveryNote && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                  <span>Ghi chú của Shipper:</span>
                  <span style={{ color: '#0f172a', fontWeight: 600, fontStyle: 'italic', textAlign: 'right' }}>"{viewProofModal.deliveryNote}"</span>
                </div>
              )}
            </div>

            <button onClick={() => setViewProofModal(null)} style={{ width: '100%', marginTop: '1rem', padding: '0.6rem', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}>
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      )}

      {/* ── 3. MODAL: FAIL REASON ── */}
      {failModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-glass" style={{ padding: '2rem', width: '100%', maxWidth: '440px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <XCircle size={20}/> Ghi nhận giao thất bại
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              Đơn <strong style={{ color: '#0f172a' }}>{failModal.orderId}</strong> — Chọn hoặc nhập lý do:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {FAIL_PRESETS.map(preset => (
                <button key={preset} onClick={() => setFailReason(preset)}
                  style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', borderRadius: '20px', cursor: 'pointer', background: failReason === preset ? '#fee2e2' : '#ffffff', border: failReason === preset ? '1px solid #ef4444' : '1px solid #cbd5e1', color: failReason === preset ? '#dc2626' : '#475569', fontWeight: failReason === preset ? 700 : 500, transition: 'all 0.15s' }}
                >{preset}</button>
              ))}
            </div>
            <textarea
              value={failReason}
              onChange={e => setFailReason(e.target.value)}
              placeholder="Hoặc nhập lý do khác..."
              rows={3}
              style={{ width: '100%', resize: 'vertical', padding: '0.625rem 0.75rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setFailModal(null)} style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
              <button onClick={handleConfirmFail} style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                <XCircle size={14} /> Xác nhận thất bại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Time Range Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Truck size={28} style={{ color: '#2563eb' }} />
            Giao Hàng & Vận Chuyển
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.875rem', margin: 0 }}>
            Quản lý lộ trình giao hàng, xác nhận giao thành công, tải minh chứng & thống kê hiệu năng.
          </p>
        </div>

        {/* Time Range Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', padding: '0 0.5rem' }}>Thống kê theo:</span>
          {[
            { id: 'TODAY', label: 'Hôm nay' },
            { id: 'WEEK', label: '7 ngày qua' },
            { id: 'MONTH', label: 'Tháng này' },
            { id: 'ALL', label: 'Tất cả' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setStatsTimeRange(t.id)}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: statsTimeRange === t.id ? 800 : 600,
                color: statsTimeRange === t.id ? '#2563eb' : '#64748b',
                backgroundColor: statsTimeRange === t.id ? '#ffffff' : 'transparent',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: statsTimeRange === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpis.map((k, i) => (
          <div key={i} className="card-glass" style={{ padding: '1.25rem', borderLeft: `4px solid ${k.color}`, display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ color: k.color, backgroundColor: `${k.color}15`, padding: '0.625rem', borderRadius: '8px' }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: k.wide ? '1rem' : '1.75rem', fontWeight: 800, color: '#0f172a' }}>{k.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: Tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem' }}>
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
                borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
                transition: 'all 0.2s'
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '320px', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, tên KH, SĐT..." className="input-field"
            style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem 0.5rem 2.5rem' }} />
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="card-glass" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
          <Truck size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ fontWeight: 600 }}>Không có đơn hàng nào trong danh sách này</p>
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
                    <strong style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>{order.orderId}</strong>
                    <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.725rem', fontWeight: 800,
                      backgroundColor: `${statusInfo.color}15`, color: statusInfo.color, border: `1px solid ${statusInfo.color}40` }}>
                      {statusInfo.label}
                    </span>
                  </div>

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
                </div>

                {/* Footer Wrapper (Pushed to bottom of card with marginTop: auto) */}
                <div style={{ marginTop: 'auto', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* Amount */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{order.date}</span>
                    <strong style={{ color: '#16a34a', fontSize: '1rem', fontWeight: 800 }}>{fmt(order.totalAmount)}</strong>
                  </div>

                  {order.lastNote && (
                    <div style={{ fontSize: '0.75rem', color: '#be123c', fontStyle: 'italic', fontWeight: 600, padding: '5px 8px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px' }}>
                      {order.lastNote}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.35rem', flexDirection: 'column' }}>
                    {order.status === 'READY_TO_SHIP' && (
                      <button onClick={() => handlePickup(order.orderId)} style={{ width: '100%', fontSize: '0.825rem', padding: '0.55rem', borderRadius: '8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Truck size={15} style={{ marginRight: '4px' }}/> Nhận Giao Đơn Hàng
                      </button>
                    )}
                    {order.status === 'SHIPPING_FAILED' && (
                      <button onClick={() => handlePickup(order.orderId)} style={{ width: '100%', fontSize: '0.825rem', padding: '0.55rem', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={15} style={{ marginRight: '4px' }}/> Thử Giao Lại
                      </button>
                    )}
                    {order.status === 'SHIPPED' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenDeliverModal(order)}
                          style={{ flex: 1, fontSize: '0.825rem', padding: '0.55rem', borderRadius: '8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(37,99,235,0.2)' }}
                        >
                          <CheckCircle size={15} /> Xác Nhận Đã Giao
                        </button>
                        <button onClick={() => handleFail(order.orderId)} style={{ fontSize: '0.825rem', padding: '0.55rem 0.85rem', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <XCircle size={15} style={{ marginRight: '4px' }}/> Thất Bại
                        </button>
                      </div>
                    )}
                    {order.status === 'DELIVERED' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', color: '#16a34a', fontSize: '0.825rem', fontWeight: 800 }}>
                          <CheckCircle size={15}/> Giao thành công cho {order.receiverName || order.customerName}
                        </div>
                        <button
                          onClick={() => setViewProofModal(order)}
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                        >
                          <Eye size={13} /> Xem Minh Chứng Giao Hàng
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
