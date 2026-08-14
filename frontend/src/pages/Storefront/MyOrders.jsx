import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { Search, Package, Clock, ShieldCheck, CheckCircle2, ChevronRight, HelpCircle, RefreshCw, X, AlertCircle, Sparkles, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MyOrders() {
  const { orders, assemblyJobs, returnRequests, addReturnRequest, updateOrderStatus, addComplaint, complaints } = useERP();
  const { user } = useAuth();
  const [phoneQuery, setPhoneQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  
  // Return Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnForm, setReturnForm] = useState({ reason: '', type: 'EXCHANGE', evidenceUrl: '' });
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [returnTargetOrder, setReturnTargetOrder] = useState(null);

  // Complaint / Ticket Modal State
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ orderId: '', title: '', description: '', priority: 'HIGH' });
  const [complaintSuccess, setComplaintSuccess] = useState(false);
  const [viewTicketDetail, setViewTicketDetail] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('complaint') === 'true' || params.get('support') === 'true') {
      setShowComplaintModal(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.phone) setPhoneQuery(user.phone);
      else if (user.email) setPhoneQuery(user.email);
      setSearched(true);
    }
  }, [user]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!phoneQuery.trim()) return;
    setSearched(true);
  };

  const cleanPhone = (p) => p ? String(p).replace(/\D/g, '') : '';

  const userPhoneDigits = user?.phone ? cleanPhone(user.phone) : '';
  const userEmailClean = user?.email ? user.email.trim().toLowerCase() : '';
  const userNameClean = user?.name ? user.name.trim().toLowerCase() : '';

  const matchedOrders = orders.filter(order => {
    const orderPhoneDigits = cleanPhone(order.phone || order.customerPhone || '');
    const orderEmailClean = (order.email || order.customerEmail || '').trim().toLowerCase();
    const orderNameClean = (order.customerName || order.name || '').trim().toLowerCase();
    const orderUserId = order.userId || order.customerId;

    // Strict account check: Does this order belong to the logged-in user?
    const isUserOrder = Boolean(
      (userPhoneDigits && orderPhoneDigits && orderPhoneDigits === userPhoneDigits) ||
      (userEmailClean && orderEmailClean && orderEmailClean === userEmailClean) ||
      (user?.id && orderUserId && String(orderUserId) === String(user.id)) ||
      (userNameClean && orderNameClean && orderNameClean === userNameClean)
    );

    if (user) {
      const queryClean = phoneQuery.trim().toLowerCase();
      const queryDigits = cleanPhone(phoneQuery);

      // If search input is default or matches user's phone/email, return all user's orders
      if (!queryClean || queryDigits === userPhoneDigits || queryClean === userEmailClean) {
        return isUserOrder;
      }

      // If user typed a search query, search strictly within their own orders
      return isUserOrder && (
        (queryDigits && orderPhoneDigits.includes(queryDigits)) ||
        (queryClean && orderEmailClean.includes(queryClean)) ||
        (queryClean && order.orderId?.toLowerCase().includes(queryClean)) ||
        (queryClean && orderNameClean.includes(queryClean))
      );
    }

    // Guest search mode (Not logged in):
    if (!searched || !phoneQuery.trim()) return false;
    const queryClean = phoneQuery.trim().toLowerCase();
    const queryDigits = cleanPhone(phoneQuery);

    return (
      (queryDigits && orderPhoneDigits.includes(queryDigits)) ||
      (queryClean && orderEmailClean.includes(queryClean)) ||
      (queryClean && order.orderId?.toLowerCase().includes(queryClean))
    );
  });

  const userComplaints = (complaints || []).filter(c => {
    // 1. Match by order ID in matched orders list
    if (c.orderId && matchedOrders.some(mo => mo.orderId === c.orderId)) {
      return true;
    }

    // 2. Match by logged-in user details
    if (user) {
      const uPhone = userPhoneDigits;
      const uEmail = userEmailClean;
      const uName = userNameClean;

      const cPhone = cleanPhone(c.phone);
      const cEmail = (c.email || '').trim().toLowerCase();
      const cName = (c.customerName || '').trim().toLowerCase();

      if (uPhone && cPhone && uPhone === cPhone) return true;
      if (uEmail && cEmail && uEmail === cEmail) return true;
      if (uName && cName && (cName.includes(uName) || uName.includes(cName))) return true;
    }

    // 3. Match by guest search query
    if (searched && phoneQuery.trim()) {
      const queryClean = phoneQuery.trim().toLowerCase();
      const queryDigits = cleanPhone(phoneQuery);
      const cPhone = cleanPhone(c.phone);
      const cEmail = (c.email || '').trim().toLowerCase();
      const cName = (c.customerName || '').trim().toLowerCase();
      const cId = (c.id || '').toLowerCase();

      if (queryDigits && cPhone && cPhone.includes(queryDigits)) return true;
      if (queryClean && cEmail && cEmail.includes(queryClean)) return true;
      if (queryClean && cName && cName.includes(queryClean)) return true;
      if (queryClean && cId && cId.includes(queryClean)) return true;
    }

    return false;
  });

  useEffect(() => {
    if (matchedOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(matchedOrders[0].orderId);
    }
  }, [matchedOrders, selectedOrderId]);

  const selectedOrder = orders.find(o => o.orderId === selectedOrderId) || matchedOrders[0];

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const getOrderStatusLabel = (status) => {
    switch (status) {
      case 'PENDING':
        return { text: 'Chờ xác nhận', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' };
      case 'AWAITING_STOCK':
        return { text: 'Chờ hàng về', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' };
      case 'CONFIRMED':
      case 'PROCESSING':
      case 'PACKED':
        return { text: 'Chờ lấy hàng', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)' };
      case 'READY_TO_SHIP':
        return { text: 'Chờ giao hàng', color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)' };
      case 'SHIPPED':
        return { text: 'Đang giao hàng', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' };
      case 'SHIPPING_FAILED':
        return { text: 'Giao thất bại', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
      case 'DELIVERED':
        return { text: 'Đã giao', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' };
      case 'RETURN_REQUESTED':
      case 'RETURNING':
      case 'RETURNED':
      case 'REFUNDED':
        return { text: 'Trả hàng', color: '#ec4899', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.3)' };
      case 'CANCELLED':
        return { text: 'Đã hủy', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
      default:
        return { text: 'Đang xử lý', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' };
    }
  };

  const handleReturnSubmit = () => {
    if (!returnForm.reason.trim()) { alert('Vui lòng nhập lý do đổi trả'); return; }
    if (returnTargetOrder) {
      addReturnRequest({
        orderId: returnTargetOrder.orderId,
        customerName: returnTargetOrder.customerName,
        phone: returnTargetOrder.phone,
        type: returnForm.type,
        reason: returnForm.reason,
        evidenceUrl: returnForm.evidenceUrl
      });
      setShowReturnModal(false);
      setReturnForm({ reason: '', type: 'EXCHANGE', evidenceUrl: '' });
      setReturnSuccess(true);
      setTimeout(() => setReturnSuccess(false), 5000);
    }
  };

  const handleComplaintSubmit = () => {
    if (!complaintForm.title.trim() || !complaintForm.description.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung khiếu nại.');
      return;
    }
    addComplaint({
      customerName: user?.fullname || selectedOrder?.customerName || 'Khách Hàng',
      phone: user?.phone || selectedOrder?.phone || '0901234567',
      email: user?.email || selectedOrder?.email || 'khachhang@email.com',
      orderId: complaintForm.orderId || selectedOrder?.orderId || '',
      title: complaintForm.title,
      description: complaintForm.description,
      priority: complaintForm.priority || 'HIGH',
      evidenceUrl: complaintForm.evidenceUrl || ''
    });

    setShowComplaintModal(false);
    setComplaintForm({ orderId: '', title: '', description: '', priority: 'HIGH', evidenceUrl: '' });
    setComplaintSuccess(true);
    setTimeout(() => setComplaintSuccess(false), 6000);
  };

  const getStatusProgress = (status) => {
    // Standard flow: Chờ xác nhận -> Chờ lấy hàng -> Chờ giao hàng -> Đang giao hàng -> Đã giao
    if (status === 'AWAITING_STOCK') {
      const awaitingSteps = ['Chờ xác nhận', 'Chờ hàng về kho', 'Chờ lấy hàng', 'Chờ giao hàng', 'Đang giao hàng', 'Đã giao'];
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', width: '100%', padding: '0.5rem 0' }}>
          {awaitingSteps.map((stepName, idx) => {
            const isCompleted = idx < 1;
            const isActive = idx === 1;
            return (
              <React.Fragment key={stepName}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1, flex: idx < awaitingSteps.length - 1 ? 1 : 'none' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: isCompleted ? 'var(--success)' : isActive ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.05)',
                    border: isCompleted ? '2px solid var(--success)' : isActive ? '2px solid #f97316' : '2px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isCompleted ? '#fff' : isActive ? '#f97316' : 'var(--text-muted)',
                    fontSize: '0.7rem', fontWeight: 'bold', flexShrink: 0
                  }}>
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: isActive ? '#f97316' : isCompleted ? 'var(--success)' : 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: isActive ? 700 : 400 }}>{stepName}</span>
                </div>
                {idx < awaitingSteps.length - 1 && (
                  <div style={{ flex: 1, height: '2px', backgroundColor: isCompleted ? 'var(--success)' : 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: '22px', minWidth: '20px' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    const steps = ['Chờ xác nhận', 'Chờ lấy hàng', 'Chờ giao hàng', 'Đang giao hàng', 'Đã giao'];
    
    let activeIdx = 0;
    if (status === 'PENDING') {
      activeIdx = 0;
    } else if (['CONFIRMED', 'PROCESSING', 'PACKED'].includes(status)) {
      activeIdx = 1;
    } else if (status === 'READY_TO_SHIP') {
      activeIdx = 2;
    } else if (['SHIPPED', 'SHIPPING_FAILED'].includes(status)) {
      activeIdx = 3;
    } else if (['DELIVERED', 'COMPLETED'].includes(status)) {
      activeIdx = 4;
    }

    if (status === 'CANCELLED') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '1rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>✓</div>
            <span>Đặt hàng</span>
          </div>
          <div style={{ width: '80px', height: '2px', backgroundColor: '#ef4444' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.2)', border: '1.5px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>✕</div>
            <strong style={{ fontSize: '0.85rem' }}>Đã hủy đơn</strong>
          </div>
        </div>
      );
    }

    if (['RETURN_REQUESTED', 'RETURNING', 'RETURNED', 'REFUNDED'].includes(status)) {
      const returnSteps = ['Chờ xác nhận', 'Chờ lấy hàng', 'Chờ giao hàng', 'Đang giao hàng', 'Đã giao', 'Trả hàng'];
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', width: '100%', padding: '0.5rem 0' }}>
          {returnSteps.map((stepName, idx) => {
            const isCompleted = idx < 5;
            const isActive = idx === 5;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <div style={{ 
                    flex: 1, 
                    height: '2px', 
                    backgroundColor: isCompleted ? '#2563eb' : '#e2e8f0',
                    margin: '0 0.25rem'
                  }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '55px' }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    backgroundColor: isCompleted ? '#2563eb' : isActive ? '#fff7ed' : '#f1f5f9',
                    border: isActive ? '1.5px solid #f97316' : isCompleted ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: isCompleted ? '#ffffff' : isActive ? '#f97316' : '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    boxShadow: isActive ? '0 0 8px rgba(249,115,22,0.3)' : 'none'
                  }}>
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    color: isCompleted ? '#0f172a' : isActive ? '#f97316' : '#64748b',
                    marginTop: '0.35rem',
                    textAlign: 'center',
                    fontWeight: isActive || isCompleted ? 'bold' : 'normal'
                  }}>
                    {stepName}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', width: '100%', padding: '0.5rem 0' }}>
        {steps.map((stepName, idx) => {
          const isDone = idx < activeIdx || (idx === activeIdx && (status === 'DELIVERED' || status === 'COMPLETED'));
          const isActive = idx === activeIdx && !isDone;
          const isLineActive = idx <= activeIdx;
          return (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <div style={{ 
                  flex: 1, 
                  height: '2.5px', 
                  backgroundColor: isLineActive ? '#2563eb' : '#e2e8f0',
                  margin: '0 0.25rem'
                }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  backgroundColor: isDone ? '#2563eb' : isActive ? '#eff6ff' : '#f1f5f9',
                  border: isDone ? '2px solid #2563eb' : isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: isDone ? '#ffffff' : isActive ? '#2563eb' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  boxShadow: isDone || isActive ? '0 0 10px rgba(37,99,235,0.3)' : 'none'
                }}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <span style={{ 
                  fontSize: '0.72rem', 
                  color: isDone ? '#2563eb' : isActive ? '#2563eb' : '#64748b',
                  marginTop: '0.4rem',
                  textAlign: 'center',
                  fontWeight: isDone || isActive ? 'bold' : '500'
                }}>
                  {stepName}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container" style={{ padding: '3rem 1.5rem 5rem 1.5rem', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontFamily: 'var(--font-title)',
          color: '#0f172a',
          fontWeight: 800,
          marginBottom: '0.5rem'
        }}>
          Tra Cứu Tiến Độ Đơn Hàng
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Nhập số điện thoại mua hàng để theo dõi chi tiết hóa đơn và trạng thái vận chuyển của đơn hàng.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {userComplaints.length > 0 ? (
            <>
              <button
                onClick={() => {
                  const el = document.getElementById('complaintHistorySection');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn hover-scale"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', backgroundColor: '#2563eb', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.88rem', padding: '0.6rem 1.35rem', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', cursor: 'pointer' }}
              >
                <HelpCircle size={18} /> Theo Dõi Lịch Sử Khiếu Nại ({userComplaints.length})
              </button>

              <button
                onClick={() => {
                  setComplaintForm({ orderId: selectedOrder?.orderId || '', title: '', description: '', priority: 'HIGH', evidenceUrl: '' });
                  setShowComplaintModal(true);
                }}
                className="btn hover-scale"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', backgroundColor: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.88rem', padding: '0.6rem 1.35rem', boxShadow: '0 4px 14px rgba(239,68,68,0.3)', cursor: 'pointer' }}
              >
                <AlertCircle size={18} /> Gửi Ticket Khiếu Nại Mới
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setComplaintForm({ orderId: selectedOrder?.orderId || '', title: '', description: '', priority: 'HIGH', evidenceUrl: '' });
                setShowComplaintModal(true);
              }}
              className="btn hover-scale"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', backgroundColor: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.88rem', padding: '0.6rem 1.35rem', boxShadow: '0 4px 14px rgba(239,68,68,0.3)', cursor: 'pointer' }}
            >
              <AlertCircle size={18} /> Gửi Ticket Khiếu Nại & Hỗ Trợ
            </button>
          )}
        </div>
      </div>

      {complaintSuccess && (
        <div style={{ maxWidth: '600px', margin: '0 auto 1.5rem', padding: '1rem 1.25rem', backgroundColor: '#ecfdf5', border: '1.5px solid #10b981', borderRadius: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(16,185,129,0.15)' }}>
          <CheckCircle2 size={22} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>🎉 Đã gửi Ticket Khiếu nại & Hỗ trợ thành công! Bộ phận CSKH AetherPC sẽ tiếp nhận và liên hệ bạn trong thời gian sớm nhất.</span>
        </div>
      )}

      {/* Search Input Bar / Member Auto-load Info */}
      {user && user.phone ? null : (
        <div className="card-glass" style={{ maxWidth: '600px', margin: '0 auto 2.5rem auto', padding: '1.5rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="tel"
                className="form-input"
                placeholder="Nhập số điện thoại đặt hàng (Ví dụ: 0966666666)..."
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
              Tra Cứu
            </button>
          </form>
        </div>
      )}

      {searched && matchedOrders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Không tìm thấy đơn hàng nào liên kết với số điện thoại này trên hệ thống local ERP.</p>
        </div>
      )}

      {matchedOrders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Left Column: Orders List */}
          <div className="card-glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={16} />
              Đơn Hàng Đã Tìm Thấy ({matchedOrders.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {matchedOrders.map(order => (
                <div
                  key={order.orderId}
                  onClick={() => setSelectedOrderId(order.orderId)}
                  style={{
                    padding: '1rem',
                    border: selectedOrderId === order.orderId ? '1.5px solid var(--primary)' : '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: selectedOrderId === order.orderId ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{order.orderId}</strong>
                    {(() => {
                      const badge = getOrderStatusLabel(order.status);
                      return (
                        <span 
                          style={{ 
                            fontSize: '0.65rem', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            color: badge.color, 
                            backgroundColor: badge.bg, 
                            border: `1px solid ${badge.border}` 
                          }}
                        >
                          {badge.text}
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ngày: {order.date}</span>
                    <strong style={{ color: 'var(--success)' }}>{formatPrice(order.totalAmount)}</strong>
                  </div>
                </div>
              ))}
            </div>

          {/* Return success banner */}
          {returnSuccess && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.875rem' }}>
              <CheckCircle2 size={16}/> Yêu cầu đổi trả đã được gửi! CSKH sẽ liên hệ bạn trong 24h.
            </div>
          )}
        </div>

          {/* Right Column: Detail Order Status */}
          {selectedOrder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Order Info */}
              <div className="card-glass" style={{ padding: '1.25rem 1.5rem' }}>
                {(() => {
                  let orderItems = selectedOrder.items;
                  if (typeof orderItems === 'string') {
                    try { orderItems = JSON.parse(orderItems); } catch(e) { orderItems = []; }
                  }
                  if (!Array.isArray(orderItems) || orderItems.length === 0) {
                    orderItems = selectedOrder.products || [
                      { productId: 1, name: 'Intel Core i5-13400F', price: 4890000, quantity: 1, category: 'CPU' },
                      { productId: 3, name: 'ASUS ROG STRIX B760-F Gaming WiFi', price: 5490000, quantity: 1, category: 'MAINBOARD' },
                      { productId: 8, name: 'MSI GeForce RTX 4060 Ventus 2X 8GB OC', price: 8390000, quantity: 1, category: 'VGA' }
                    ];
                  }
                  const hasItems = orderItems.length > 0;
                  return (
                    <>
                      <div style={{
                        display: 'flex',
                        justify: 'space-between',
                        borderBottom: hasItems ? '1px solid #e2e8f0' : 'none',
                        paddingBottom: hasItems ? '1rem' : 0,
                        marginBottom: hasItems ? '1rem' : 0,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0 }}>Chi Tiết Đơn Hàng: {selectedOrder.orderId}</h3>
                            
                            {/* Cancel Order Button – only PENDING can be cancelled by customer */}
                            {selectedOrder.status === 'PENDING' && (
                              <button 
                                onClick={() => {
                                  updateOrderStatus(selectedOrder.orderId, 'CANCELLED', 'Hủy bởi Khách hàng');
                                  alert('Đã hủy đơn hàng thành công!');
                                }}
                                className="btn" 
                                style={{ 
                                  padding: '0.25rem 0.625rem', 
                                  fontSize: '0.75rem', 
                                  background: 'rgba(239,68,68,0.1)', 
                                  color: '#ef4444', 
                                  border: '1px solid rgba(239,68,68,0.25)', 
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center', 
                                  gap: '0.25rem' 
                                }}
                              >
                                <X size={12}/> Hủy đơn
                              </button>
                            )}

                            {/* Demo Helper Button */}
                            {['PENDING'].includes(selectedOrder.status) && (
                              <button 
                                onClick={() => {
                                  // Directly simulate 5h+ age and trigger auto-approval flow
                                  const stored = localStorage.getItem('erp_orders');
                                  if (stored) {
                                    const parsed = JSON.parse(stored);
                                    const updated = parsed.map(o => {
                                      if (o.orderId === selectedOrder.orderId) {
                                        return { ...o, createdAtTime: Date.now() - 5.1 * 60 * 60 * 1000 };
                                      }
                                      return o;
                                    });
                                    localStorage.setItem('erp_orders', JSON.stringify(updated));
                                    // Reload page so ERPContext scheduler picks up new createdAtTime
                                    setTimeout(() => window.location.reload(), 100);
                                  }
                                }}
                                className="btn" 
                                style={{ 
                                  padding: '0.25rem 0.625rem', 
                                  fontSize: '0.75rem', 
                                  background: 'rgba(59,130,246,0.1)', 
                                  color: '#3b82f6', 
                                  border: '1px solid rgba(59,130,246,0.25)', 
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center', 
                                  gap: '0.25rem' 
                                }}
                              >
                                <Sparkles size={12}/> 🧪 Tua nhanh 5h
                              </button>
                            )}
                          </div>
                          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
                            Khách hàng: <strong style={{ color: '#0f172a' }}>{selectedOrder.customerName}</strong> | Ngày mua: {selectedOrder.date}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hình thức: {selectedOrder.type}</span>
                          <h4 style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.25rem', marginTop: '0.25rem', marginBottom: 0 }}>
                            {formatPrice(selectedOrder.totalAmount)}
                          </h4>
                        </div>
                      </div>

                      {hasItems && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {orderItems.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.875rem', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                                <span className="badge badge-info" style={{ fontSize: '0.68rem', marginRight: '0.6rem', flexShrink: 0, fontWeight: 700 }}>{item.category || 'LINH KIỆN'}</span>
                                <Link to={`/product/${item.productId}`} style={{ textDecoration: 'none', color: '#0f172a', minWidth: 0 }}>
                                  <strong style={{ cursor: 'pointer', transition: 'color 0.2s', display: 'block', wordBreak: 'break-word', color: '#1e293b' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#1e293b'}
                                  >
                                    {item.name}
                                  </strong>
                                </Link>
                              </div>
                              <span style={{ color: '#2563eb', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 800 }}>x{item.quantity || 1} - {formatPrice(item.price)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Return Request Section */}
              {['DELIVERED', 'SHIPPED'].includes(selectedOrder.status) && (() => {
                const existingReturn = returnRequests?.find(r => r.orderId === selectedOrder.orderId);

                // No return request yet — show button
                if (!existingReturn) {
                  return (
                    <div style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertCircle size={15} style={{ color: '#ef4444' }}/> Yêu Cầu Đổi Trả / Hoàn Tiền
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                          Trong vòng 7 ngày kể từ ngày giao hàng. CSKH xử lý trong 1-3 ngày làm việc.
                        </p>
                      </div>
                      <button onClick={() => { setReturnTargetOrder(selectedOrder); setShowReturnModal(true); }}
                        className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                        <RefreshCw size={14}/> Gửi Yêu Cầu Đổi Trả
                      </button>
                    </div>
                  );
                }

                // Return request exists — show detailed status card
                const statusConfig = {
                  PENDING:    { label: 'Chờ xử lý', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
                  PROCESSING: { label: 'Đang xử lý', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' },
                  RETURNING:  { label: 'Đang thu hồi', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
                  RETURNED:   { label: 'Kho đã nhận', color: '#ec4899', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.25)' },
                  APPROVED:   { label: 'Đã phê duyệt', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
                  REJECTED:   { label: 'Bị từ chối', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
                  COMPLETED:  { label: 'Hoàn tất', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
                  REFUNDED:   { label: 'Đã hoàn tiền', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' }
                };
                const sc = statusConfig[existingReturn?.status] || statusConfig.PENDING;
                const typeLabel = existingReturn.type === 'REFUND' ? 'Hoàn tiền' : 'Đổi hàng';
                return (
                  <div style={{ padding: '1.25rem 1.5rem', backgroundColor: sc.bg, border: '1px solid ' + sc.border, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        <RefreshCw size={15} style={{ color: sc.color }}/> Yêu Cầu Đổi Trả / Hoàn Tiền
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '20px', backgroundColor: sc.bg, border: '1px solid ' + sc.border, color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem', fontSize: '0.8rem', color: '#334155' }}>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Mã yêu cầu:</span> <strong style={{ color: '#0f172a' }}>{existingReturn.id}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Loại:</span> <strong style={{ color: sc.color, fontWeight: 800 }}>{typeLabel}</strong></div>
                      <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontWeight: 600 }}>Lý do:</span> <strong style={{ color: '#0f172a' }}>{existingReturn.reason}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Ngày gửi:</span> <strong style={{ color: '#0f172a' }}>{existingReturn.date}</strong></div>
                      {existingReturn.evidenceUrl && (
                        <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                          <span style={{ color: '#64748b', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Ảnh minh chứng:</span>
                          <img src={existingReturn.evidenceUrl} alt="Ảnh minh chứng" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => window.open(existingReturn.evidenceUrl, '_blank')} />
                        </div>
                      )}
                      {existingReturn.resolution && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontWeight: 600 }}>Ghi chú CSKH:</span> <strong style={{ color: sc.color, fontWeight: 800 }}>{existingReturn.resolution}</strong></div>}
                    </div>
                  </div>
                );
              })()}

              {/* Order Status Progress Bar */}
              <div className="card-glass" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                  <Clock size={18} color="#2563eb" />
                  Tiến Độ Đơn Hàng
                </h3>
                {getStatusProgress(selectedOrder.status)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lịch Sử Khiếu Nại & Ticket Hỗ Trợ Khách Hàng */}
      <div id="complaintHistorySection" className="card-glass" style={{ padding: '1.75rem', marginTop: '2.5rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <HelpCircle size={22} color="#ef4444" />
            Lịch Sử Khiếu Nại & Yêu Cầu Hỗ Trợ ({userComplaints.length})
          </h3>
          {userComplaints.length > 0 && (
            <button
              onClick={() => {
                setComplaintForm({ orderId: selectedOrder?.orderId || '', title: '', description: '', priority: 'HIGH', evidenceUrl: '' });
                setShowComplaintModal(true);
              }}
              className="btn btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', borderRadius: '8px', backgroundColor: '#ef4444', border: 'none', fontWeight: 700 }}
            >
              ➕ Gửi Ticket Mới
            </button>
          )}
        </div>

        {userComplaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.92rem', color: '#475569', fontWeight: 500 }}>
              Bạn chưa có phiếu khiếu nại hoặc ticket hỗ trợ nào trên hệ thống.
            </p>
            <button
              onClick={() => {
                setComplaintForm({ orderId: selectedOrder?.orderId || '', title: '', description: '', priority: 'HIGH', evidenceUrl: '' });
                setShowComplaintModal(true);
              }}
              className="btn btn-primary"
              style={{ borderRadius: '10px', fontSize: '0.82rem', padding: '0.5rem 1.25rem', backgroundColor: '#ef4444', border: 'none', fontWeight: 700 }}
            >
              <AlertCircle size={16} style={{ marginRight: '0.4rem' }} /> Gửi Ticket Khiếu Nại Ngay
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {userComplaints.map(tkt => (
              <div key={tkt.id} style={{ padding: '1.1rem 1.25rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.6rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <strong style={{ color: '#2563eb', fontSize: '0.88rem' }}>{tkt.id}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', backgroundColor: tkt.status === 'RESOLVED' ? '#dcfce7' : tkt.status === 'IN_PROGRESS' ? '#fef3c7' : '#fee2e2', color: tkt.status === 'RESOLVED' ? '#166534' : tkt.status === 'IN_PROGRESS' ? '#92400e' : '#991b1b' }}>
                      {tkt.status === 'RESOLVED' ? '✓ Đã giải quyết' : tkt.status === 'IN_PROGRESS' ? '⏳ Đang xử lý' : '🔴 Mới gửi'}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 0.3rem 0', fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                    {tkt.subject || tkt.title}
                  </h4>
                  {tkt.orderId && <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.4rem' }}>Đơn hàng liên quan: <strong style={{ color: '#0f172a' }}>{tkt.orderId}</strong></div>}

                  <p style={{ fontSize: '0.82rem', color: '#334155', margin: '0 0 0.6rem 0', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {tkt.description}
                  </p>
                </div>

                <div>
                  {tkt.resolution ? (
                    <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      ✓ CSKH Phản hồi ({tkt.assignedTo || 'Bộ phận CSKH'}): {tkt.resolution}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#92400e', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                      ⏳ Đang chờ CSKH xử lý phản hồi...
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{tkt.date}</span>
                    <button
                      onClick={() => setViewTicketDetail(tkt)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', borderRadius: '6px', fontWeight: 700, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    >
                      <Eye size={13} /> Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Yêu cầu đổi trả */}
      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 9999999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4.5rem 1rem 1.5rem 1rem', overflowY: 'auto' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '520px', padding: '2rem', maxHeight: 'calc(100vh - 6rem)', overflowY: 'auto', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Gửi Yêu Cầu Đổi Trả / Hoàn Tiền</h3>
              <button onClick={() => setShowReturnModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20}/></button>
            </div>
            {returnTargetOrder && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.875rem' }}>
                <strong>Đơn hàng:</strong> {returnTargetOrder.orderId} &nbsp;|&nbsp; <strong>KH:</strong> {returnTargetOrder.customerName}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Loại yêu cầu *</label>
                <select value={returnForm.type} onChange={e => setReturnForm(p => ({ ...p, type: e.target.value }))} className="form-input" style={{ width: '100%' }}>
                  <option value="EXCHANGE">Đổi hàng (Exchange)</option>
                  <option value="REFUND">Hoàn tiền (Refund)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Lý do đổi trả *</label>
                {/* Preset reason chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  {['Sản phẩm bị lỗi / hư hỏng', 'Không đúng mô tả', 'Giao sai sản phẩm', 'Chất lượng không đạt', 'Đổi ý muốn trả hàng'].map(p => (
                    <button key={p} type="button" onClick={() => setReturnForm(prev => ({ ...prev, reason: p }))}
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.7rem', borderRadius: '20px', cursor: 'pointer', border: returnForm.reason === p ? '1px solid #ef4444' : '1px solid var(--border-glass)', background: returnForm.reason === p ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)', color: returnForm.reason === p ? '#ef4444' : 'var(--text-secondary)', transition: 'all 0.15s' }}
                    >{p}</button>
                  ))}
                </div>
                <textarea value={returnForm.reason} onChange={e => setReturnForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Hoặc mô tả chi tiết lý do..." className="form-input" rows={3}
                  style={{ width: '100%', resize: 'vertical' }} />
              </div>

              {/* Upload Ảnh Minh Chứng */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Ảnh minh chứng sản phẩm lỗi / hỏng</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="file" accept="image/*" id="returnEvidenceInput" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setReturnForm(p => ({ ...p, evidenceUrl: reader.result }));
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <button type="button" onClick={() => document.getElementById('returnEvidenceInput')?.click()}
                    className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                    📷 Chọn ảnh từ máy
                  </button>
                  <input type="text" value={returnForm.evidenceUrl || ''} onChange={e => setReturnForm(p => ({ ...p, evidenceUrl: e.target.value }))}
                    placeholder="Hoặc nhập URL ảnh minh chứng..." className="form-input" style={{ flex: 1, fontSize: '0.75rem' }} />
                </div>
                
                {/* Sample preset evidence images */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ảnh mẫu demo:</span>
                  {[
                    { label: 'Vỏ móp/lỗi', url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400' },
                    { label: 'Lỗi phần cứng', url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400' }
                  ].map(s => (
                    <button key={s.label} type="button" onClick={() => setReturnForm(p => ({ ...p, evidenceUrl: s.url }))}
                      style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.03)', color: '#818cf8', cursor: 'pointer' }}>
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Evidence Image Preview */}
                {returnForm.evidenceUrl && (
                  <div style={{ marginTop: '0.75rem', position: 'relative', display: 'inline-block' }}>
                    <img src={returnForm.evidenceUrl} alt="Minh chứng" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #6366f1' }} />
                    <button type="button" onClick={() => setReturnForm(p => ({ ...p, evidenceUrl: '' }))}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✕</button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.625rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                Chính sách đổi trả: trong vòng 7 ngày kể từ ngày nhận hàng. CSKH xử lý trong 1–3 ngày làm việc.
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowReturnModal(false)} className="btn btn-secondary">Hủy</button>
                <button onClick={handleReturnSubmit} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <RefreshCw size={14}/> Gửi Yêu Cầu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gửi Ticket Khiếu Nại & Hỗ Trợ */}
      {showComplaintModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 9999999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4.5rem 1rem 1.5rem 1rem', overflowY: 'auto' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '540px', padding: '1.75rem 2rem', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', color: '#0f172a', maxHeight: 'calc(100vh - 6rem)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={20} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Gửi Ticket Khiếu Nại & Hỗ Trợ</h3>
              </div>
              <button onClick={() => setShowComplaintModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: '#334155' }}>Mã Đơn Hàng Liên Quan (Nếu có)</label>
                <select
                  value={complaintForm.orderId}
                  onChange={e => setComplaintForm(p => ({ ...p, orderId: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%', borderRadius: '10px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Chọn đơn hàng liên quan (Không bắt buộc) --</option>
                  {matchedOrders.map(o => (
                    <option key={o.orderId} value={o.orderId}>{o.orderId} - {formatPrice(o.totalAmount)} ({o.date})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: '#334155' }}>Vấn đề khiếu nại / Tiêu đề *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  {['Giao hàng chậm trễ', 'Sản phẩm không đúng mô tả', 'Lỗi linh kiện / Hỏng hóc', 'Lỗi thanh toán / Chưa nhận quà', 'Thái độ nhân viên chưa tốt'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setComplaintForm(p => ({ ...p, title: chip }))}
                      style={{
                        padding: '0.25rem 0.65rem', fontSize: '0.72rem', borderRadius: '20px', cursor: 'pointer',
                        border: complaintForm.title === chip ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        backgroundColor: complaintForm.title === chip ? '#fef2f2' : '#f8fafc',
                        color: complaintForm.title === chip ? '#ef4444' : '#475569', fontWeight: 700
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={complaintForm.title}
                  onChange={e => setComplaintForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Hoặc nhập tiêu đề khiếu nại..."
                  className="form-input"
                  style={{ width: '100%', borderRadius: '10px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: '#334155' }}>Chi tiết nội dung sự cố *</label>
                <textarea
                  value={complaintForm.description}
                  onChange={e => setComplaintForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Mô tả chi tiết sự cố bạn gặp phải để bộ phận CSKH xử lý nhanh nhất..."
                  className="form-input"
                  rows={4}
                  style={{ width: '100%', borderRadius: '10px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', resize: 'vertical' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: '#334155' }}>Mức độ ưu tiên</label>
                <select
                  value={complaintForm.priority}
                  onChange={e => setComplaintForm(p => ({ ...p, priority: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%', borderRadius: '10px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                >
                  <option value="HIGH">🔴 Khẩn cấp (Cần hỗ trợ ngay trong 30 phút)</option>
                  <option value="MEDIUM">🟡 Trung bình (Xử lý trong ngày)</option>
                  <option value="LOW">🟢 Thấp (Tư vấn bình thường)</option>
                </select>
              </div>

              {/* Ảnh minh chứng sự cố (nếu có) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: '#334155' }}>Ảnh / Minh chứng đính kèm (Không bắt buộc)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="file" accept="image/*" id="complaintEvidenceInput" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setComplaintForm(p => ({ ...p, evidenceUrl: reader.result }));
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <button type="button" onClick={() => document.getElementById('complaintEvidenceInput')?.click()}
                    className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
                    📷 Chọn ảnh từ máy
                  </button>
                  <input type="text" value={complaintForm.evidenceUrl || ''} onChange={e => setComplaintForm(p => ({ ...p, evidenceUrl: e.target.value }))}
                    placeholder="Hoặc dán URL ảnh minh chứng..." className="form-input" style={{ flex: 1, fontSize: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>

                {/* Evidence Image Preview */}
                {complaintForm.evidenceUrl && (
                  <div style={{ marginTop: '0.5rem', position: 'relative', display: 'inline-block' }}>
                    <img src={complaintForm.evidenceUrl} alt="Minh chứng" style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #ef4444' }} />
                    <button type="button" onClick={() => setComplaintForm(p => ({ ...p, evidenceUrl: '' }))}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>✕</button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                💡 Sau khi gửi ticket, Bộ phận CSKH AetherPC sẽ nhận được thông tin ngay lập tức trên hệ thống và xử lý hỗ trợ cho bạn.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowComplaintModal(false)} className="btn btn-secondary" style={{ borderRadius: '10px' }}>Hủy</button>
                <button type="button" onClick={handleComplaintSubmit} className="btn btn-primary" style={{ borderRadius: '10px', backgroundColor: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem' }}>
                  <AlertCircle size={16}/> Gửi Khiếu Nại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem Chi Tiết Ticket Dành Cho Khách Hàng */}
      {viewTicketDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 9999999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4.5rem 1rem 1.5rem 1rem', overflowY: 'auto' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '560px', padding: '1.75rem 2rem', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', color: '#0f172a', maxHeight: 'calc(100vh - 6rem)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>{viewTicketDetail.id}</strong>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', backgroundColor: viewTicketDetail.status === 'RESOLVED' ? '#dcfce7' : viewTicketDetail.status === 'IN_PROGRESS' ? '#fef3c7' : '#fee2e2', color: viewTicketDetail.status === 'RESOLVED' ? '#166534' : viewTicketDetail.status === 'IN_PROGRESS' ? '#92400e' : '#991b1b' }}>
                  {viewTicketDetail.status === 'RESOLVED' ? '✓ Đã giải quyết' : viewTicketDetail.status === 'IN_PROGRESS' ? '⏳ Đang xử lý' : '🔴 Mới tiếp nhận'}
                </span>
              </div>
              <button onClick={() => setViewTicketDetail(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Vấn đề khiếu nại</div>
                <h4 style={{ margin: '0.2rem 0 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>{viewTicketDetail.subject || viewTicketDetail.title}</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div><span style={{ color: '#64748b', fontWeight: 600 }}>Mã đơn liên quan:</span> <strong style={{ color: '#2563eb' }}>{viewTicketDetail.orderId || 'Không có'}</strong></div>
                <div><span style={{ color: '#64748b', fontWeight: 600 }}>Ngày gửi:</span> <strong style={{ color: '#0f172a' }}>{viewTicketDetail.date}</strong></div>
                <div><span style={{ color: '#64748b', fontWeight: 600 }}>Người gửi:</span> <strong style={{ color: '#0f172a' }}>{viewTicketDetail.customerName}</strong></div>
                <div><span style={{ color: '#64748b', fontWeight: 600 }}>NV Phụ trách:</span> <strong style={{ color: '#7c3aed' }}>{viewTicketDetail.assignedTo || 'Bộ phận CSKH'}</strong></div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: '0.3rem' }}>Nội dung bạn gửi:</div>
                <div style={{ padding: '0.85rem', backgroundColor: '#f1f5f9', borderRadius: '10px', color: '#1e293b', borderLeft: '4px solid #ef4444', lineHeight: 1.5 }}>
                  {viewTicketDetail.description}
                </div>
              </div>

              {viewTicketDetail.evidenceUrl && (
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: '0.3rem' }}>📷 Ảnh / Minh chứng đính kèm:</div>
                  <img src={viewTicketDetail.evidenceUrl} alt="Minh chứng sự cố"
                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    onClick={() => window.open(viewTicketDetail.evidenceUrl, '_blank')}
                  />
                </div>
              )}

              {viewTicketDetail.resolution ? (
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 800, marginBottom: '0.3rem' }}>✓ Kết quả / Hướng giải quyết từ CSKH:</div>
                  <div style={{ padding: '0.85rem', backgroundColor: '#f0fdf4', borderRadius: '10px', color: '#166534', borderLeft: '4px solid #16a34a', fontWeight: 600, lineHeight: 1.5 }}>
                    {viewTicketDetail.resolution}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '0.75rem 0.85rem', backgroundColor: '#fef3c7', borderRadius: '10px', color: '#92400e', fontSize: '0.8rem', fontWeight: 600, borderLeft: '4px solid #f59e0b' }}>
                  ⏳ Yêu cầu của bạn đã được chuyển tới bộ phận Chăm sóc khách hàng và sẽ được xử lý sớm nhất.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => setViewTicketDetail(null)} className="btn btn-secondary" style={{ borderRadius: '10px', padding: '0.5rem 1.25rem' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
