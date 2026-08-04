import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useERP } from '../../context/ERPContext';
import { api } from '../../services/api';
import { 
  PackageOpen, Clock, FileText, CheckCircle, LogOut, AlertCircle, 
  Eye, X, Check, Building, Calendar, Package, DollarSign, XCircle, Truck, CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SupplierPortal() {
  const { user, logout } = useAuth();
  const { purchaseOrders = [], updatePurchaseOrderStatus } = useERP();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // State for price input when confirming RFQ
  const [priceInputs, setPriceInputs] = useState({}); // { itemId: unitCost }
  
  // State for Rejection Modal with Reason
  const [cancelModalPO, setCancelModalPO] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    let apiSuccess = false;
    try {
      const res = await api.get('/purchasing/orders');
      if (res && res.success) {
        const apiPOs = res.data || [];
        const contextPOs = purchaseOrders.filter(po =>
          !apiPOs.some(ap => ap.poNumber === po.poNumber || String(ap.id) === String(po.id))
        );
        setOrders([...apiPOs, ...contextPOs]);
        apiSuccess = true;
      }
    } catch (e) {
      console.warn('SupplierPortal API offline, using ERPContext fallback:', e);
    }
    if (!apiSuccess) {
      setOrders(purchaseOrders);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [purchaseOrders]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatPrice = (price) => {
    const num = Number(price);
    if (isNaN(num) || num === null || num === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Filter POs for this supplier using flexible status and supplier matching
  const myPOs = orders.filter(po => {
    const isStatusMatch = ['RFQ', 'RFQ_SENT', 'QUOTED', 'PO', 'DONE', 'CANCELLED', 'SENT'].includes(po?.status);
    
    const uCode = (user?.code || '').toLowerCase();
    const uName = (user?.fullname || user?.username || '').toLowerCase();
    const poSupCode = (po?.supplierCode || '').toLowerCase();
    const poSupName = (po?.supplier?.name || po?.supplierName || '').toLowerCase();

    // Match if user is standard supplier fallback OR codes/names match
    const isSupplierMatch = 
      !user?.code || 
      user?.code === 'supplier' || 
      user?.role === 'SUPPLIER' ||
      poSupCode === uCode || 
      (poSupName && uCode && poSupName.includes(uCode)) || 
      (poSupCode && uCode && poSupCode.includes(uCode)) ||
      (uName && poSupName && poSupName.includes(uName));

    return isStatusMatch && isSupplierMatch;
  });

  // POs waiting for supplier to quote prices and confirm
  const pendingConfirmPOs = myPOs.filter(po => po?.status === 'RFQ' || po?.status === 'RFQ_SENT' || po?.status === 'SENT');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RFQ':
      case 'RFQ_SENT':
      case 'SENT':
        return <span className="badge badge-warning">Chờ Báo Giá</span>;
      case 'QUOTED':
        return <span className="badge badge-info" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Đã Báo Giá (Chờ CEO Duyệt)</span>;
      case 'PO':
        return <span className="badge badge-success" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Đã Duyệt (PO)</span>;
      case 'DONE':
        return <span className="badge badge-success" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>Hoàn Tất</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Đã Từ Chối / Hủy</span>;
      default:
        return <span className="badge badge-secondary">{status || 'N/A'}</span>;
    }
  };

  // Supplier confirms RFQ → sends prices → becomes QUOTED (Awaiting CEO approval)
  const handleConfirmPO = async (po) => {
    // Validate that supplier has entered prices for all items
    const items = po.items || [];
    const missingPrices = items.filter(item => {
      const price = priceInputs[item.id];
      return !price || parseFloat(price) <= 0;
    });

    if (items.length > 0 && missingPrices.length > 0) {
      alert('Vui lòng nhập đơn giá cho tất cả sản phẩm trước khi xác nhận.');
      return;
    }

    const poId = po.id || po.poNumber;
    
    if (!window.confirm(`Gửi báo giá đơn hàng ${po.poNumber} cho CEO / Phòng Mua Hàng duyệt?`)) {
      return;
    }

    setSubmitting(true);
    try {
      // Send prices along with status update QUOTED
      const itemPrices = items.map(item => ({
        itemId: item.id,
        unitCost: parseFloat(priceInputs[item.id]) || 0
      }));

      const res = await api.patch(`/purchasing/orders/${poId}/status`, { 
        status: 'QUOTED',
        itemPrices: itemPrices
      });
      
      if (res && res.success) {
        await fetchData();
        if (selectedPO && (selectedPO.id === poId || selectedPO.poNumber === poId)) {
          setSelectedPO(null);
        }
        setPriceInputs({});
        alert(`✅ Đã gửi báo giá cho đơn hàng ${po.poNumber} thành công! Vui lòng chờ CEO / Ban Giám Đốc duyệt.`);
      }
    } catch (e) {
      console.warn('API update failed:', e);
      // Fallback to context
      updatePurchaseOrderStatus(poId, 'QUOTED');
      alert(`✅ Đã gửi báo giá cho đơn hàng ${po.poNumber}.`);
    }
    setSubmitting(false);
  };

  const handleConfirmReject = async (poId, reason) => {
    const finalReason = reason.trim() || 'Nhà cung cấp từ chối đáp ứng đơn hàng này.';
    setSubmitting(true);
    try {
      const res = await api.patch(`/purchasing/orders/${poId}/status`, { status: 'CANCELLED', reason: finalReason });
      if (res && res.success) {
        await fetchData();
      }
    } catch (e) {
      console.warn('API update status failed:', e);
      updatePurchaseOrderStatus(poId, 'CANCELLED', finalReason);
    }

    if (selectedPO && (selectedPO.id === poId || selectedPO.poNumber === poId)) {
      setSelectedPO(prev => ({ ...prev, status: 'CANCELLED', cancelReason: finalReason }));
    }

    setCancelModalPO(null);
    setCancelReason('');
    alert(`❌ Đã từ chối đơn hàng PO ${poId}. Lý do: "${finalReason}"`);
    setSubmitting(false);
  };

  // Initialize price inputs when selecting a PO
  const handleSelectPO = (po) => {
    setSelectedPO(po);
    if (po.status === 'RFQ_SENT' && po.items) {
      const initialPrices = {};
      po.items.forEach(item => {
        initialPrices[item.id] = item.unitCost || '';
      });
      setPriceInputs(initialPrices);
    }
  };

  // Calculate total from supplier-entered prices
  const getQuotedTotal = (po) => {
    if (!po.items) return 0;
    return po.items.reduce((sum, item) => {
      const price = parseFloat(priceInputs[item.id]) || 0;
      return sum + (price * (item.quantity || 1));
    }, 0);
  };

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'finance'
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Financial calculations for supplier
  const earnedRevenue = myPOs
    .filter(po => po.status === 'DONE')
    .reduce((sum, po) => sum + (parseFloat(po.totalAmount) || 0), 0);

  const pendingRevenue = myPOs
    .filter(po => ['PO', 'QUOTED'].includes(po.status))
    .reduce((sum, po) => sum + (parseFloat(po.totalAmount) || 0), 0);

  const fulfilledCount = myPOs.filter(po => ['PO', 'DONE'].includes(po.status)).length;

  const totalQuotedVal = myPOs
    .filter(po => ['QUOTED', 'PO', 'DONE'].includes(po.status))
    .reduce((sum, po) => sum + (parseFloat(po.totalAmount) || 0), 0);

  const filteredMyPOs = myPOs.filter(po => {
    if (statusFilter === 'ALL') return true;
    return po.status === statusFilter;
  });

  return (
    <div style={{ padding: '1.25rem 1.5rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Cổng Nhà Cung Cấp (Supplier Portal)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Đối tác: <strong style={{ color: 'var(--primary)' }}>{user?.fullname || 'Nhà Cung Cấp'}</strong></p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.85rem', borderRadius: '8px' }}>
          <LogOut size={16} />
          Đăng Xuất
        </button>
      </div>

      {/* Financial & Order KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card-glass hover-scale" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))', borderRadius: '10px', color: 'var(--success)', flexShrink: 0 }}>
            <DollarSign size={22} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Doanh Thu Đã Thu (DONE)</p>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.1rem', marginBottom: 0, color: 'var(--success)' }}>{formatPrice(earnedRevenue)}</h3>
          </div>
        </div>

        <div className="card-glass hover-scale" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))', borderRadius: '10px', color: '#fbbf24', flexShrink: 0 }}>
            <CreditCard size={22} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Doanh Thu Chờ Thanh Toán</p>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.1rem', marginBottom: 0, color: '#fbbf24' }}>{formatPrice(pendingRevenue)}</h3>
          </div>
        </div>

        <div className="card-glass hover-scale" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))', borderRadius: '10px', color: '#818cf8', flexShrink: 0 }}>
            <Truck size={22} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Đơn Hàng Đã Cung Cấp</p>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.1rem', marginBottom: 0, color: '#0f172a' }}>{fulfilledCount} đơn</h3>
          </div>
        </div>

        <div className="card-glass hover-scale" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.3)' }}>
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05))', borderRadius: '10px', color: '#c084fc', flexShrink: 0 }}>
            <FileText size={22} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Tổng Giá Trị Đã Báo Giá</p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.1rem', marginBottom: 0, color: '#c084fc' }}>{formatPrice(totalQuotedVal)}</h3>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '0.5rem 1.15rem', fontSize: '0.85rem', fontWeight: 700,
            borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', border: 'none',
            backgroundColor: activeTab === 'orders' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'orders' ? '#fff' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}
        >
          <PackageOpen size={16} /> Quản Lý Yêu Cầu & Báo Giá
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          style={{
            padding: '0.5rem 1.15rem', fontSize: '0.85rem', fontWeight: 700,
            borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', border: 'none',
            backgroundColor: activeTab === 'finance' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'finance' ? '#fff' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}
        >
          <DollarSign size={16} /> Báo Cáo Doanh Thu & Tài Chính
        </button>
      </div>

      {/* TAB 1: ORDERS & QUOTES MANAGEMENT */}
      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left Column: Pending Actions (RFQ_SENT) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card-glass" style={{ padding: '1.25rem', background: 'linear-gradient(145deg, rgba(99,102,241,0.1) 0%, rgba(217,70,239,0.05) 100%)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PackageOpen size={18} color="var(--primary)" />
                YCBG Chờ Xử Lý
              </h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {pendingConfirmPOs.length.toString().padStart(2, '0')}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem', margin: '0.4rem 0 0' }}>Phòng mua hàng gửi yêu cầu báo giá, vui lòng nhập giá và xác nhận.</p>
            </div>

            {/* Pending Confirmations list */}
            <div className="card-glass" style={{ padding: '1.25rem', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
                Cần Báo Giá Ngay
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '350px', overflowY: 'auto' }}>
                {pendingConfirmPOs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1.25rem 0' }}>
                    Không có yêu cầu báo giá nào cần xử lý.
                  </div>
                ) : (
                  pendingConfirmPOs.map(po => {
                    const itemCount = po.items?.length || 1;
                    const totalQty = po.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || po.quantity || 1;
                    const itemNames = po.items?.map(i => i.product?.name || i.name).filter(Boolean).join(', ') || po.productName || 'Linh kiện';
                    return (
                      <div key={po.id || po.poNumber} style={{ padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.82rem' }}>
                          <strong style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>{po.poNumber || po.id}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{po.createdAt ? new Date(po.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#0f172a', marginBottom: '0.5rem', fontWeight: 600 }}>
                          {itemNames} ({totalQty} sản phẩm{itemCount > 1 ? ` • ${itemCount} loại` : ''})
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa báo giá</span>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <button
                              onClick={() => handleSelectPO(po)}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <DollarSign size={12} /> Báo Giá
                            </button>
                            <button
                              onClick={() => { setCancelModalPO(po); setCancelReason(''); }}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}
                            >
                              <X size={12} /> Từ Chối
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Order History with Filters */}
          <div className="card-glass" style={{ padding: '1.25rem', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} color="var(--success)" />
                Lịch Sử Báo Giá & Đơn Hàng
              </h3>
              
              {/* Filter chips */}
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)', padding: '0.2rem', borderRadius: '8px' }}>
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'RFQ_SENT', label: 'Chờ Báo Giá' },
                  { id: 'QUOTED', label: 'Chờ CEO Duyệt' },
                  { id: 'PO', label: 'Đã Duyệt (PO)' },
                  { id: 'DONE', label: 'Hoàn Tất' },
                  { id: 'CANCELLED', label: 'Đã Hủy' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    style={{
                      padding: '0.25rem 0.6rem', fontSize: '0.73rem', fontWeight: 600,
                      borderRadius: '6px', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                      backgroundColor: statusFilter === f.id ? 'var(--primary)' : 'transparent',
                      color: statusFilter === f.id ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto' }}>
              {filteredMyPOs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2.5rem 0' }}>
                  Không tìm thấy thông tin đơn hàng nào phù hợp.
                </div>
              ) : (
                filteredMyPOs.map((po) => {
                  const itemCount = po.items?.length || 1;
                  const totalQty = po.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || po.quantity || 1;
                  const itemNames = po.items?.map(i => i.product?.name || i.name).filter(Boolean).join(', ') || po.productName || 'Linh kiện';
                  const poTotal = po.totalAmount || 0;
                  return (
                    <div key={po.id || po.poNumber} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.85rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-glass)',
                      transition: 'background-color 0.2s'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h4 style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.9rem', margin: 0 }}>{po.poNumber || po.id}</h4>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#0f172a', marginTop: '0.25rem', fontWeight: 600 }}>
                          {itemNames} ({totalQty} sản phẩm{itemCount > 1 ? ` • ${itemCount} loại` : ''})
                        </div>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.2rem', margin: '0.2rem 0 0' }}>Ngày tạo: {po.createdAt ? new Date(po.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</p>
                        {po.cancelReason && (
                          <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.15rem', fontStyle: 'italic' }}>
                            Lý do từ chối: {po.cancelReason}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                        <div>
                          {getStatusBadge(po.status)}
                        </div>
                        {poTotal > 0 && (
                          <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.88rem', margin: 0 }}>{formatPrice(poTotal)}</p>
                        )}
                        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.1rem' }}>
                          <button
                            onClick={() => handleSelectPO(po)}
                            style={{
                              background: 'rgba(99,102,241,0.15)',
                              border: '1px solid rgba(99,102,241,0.3)',
                              color: '#818cf8',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.73rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Eye size={12} /> Chi tiết
                          </button>
                          {po.status === 'RFQ_SENT' && (
                            <button
                              onClick={() => { setCancelModalPO(po); setCancelReason(''); }}
                              style={{
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid var(--danger)',
                                color: 'var(--danger)',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '0.73rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <X size={12} /> Từ chối
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
        </div>
      )}

      {/* TAB 2: FINANCIAL REVENUE REPORT & LEDGER */}
      {activeTab === 'finance' && (
        <div className="card-glass" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={20} color="var(--success)" />
              Báo Cáo Doanh Thu & Dòng Tiền Thanh Toán ERP
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Cập nhật trực tiếp theo thời gian thực từ Phân hệ Kế Toán ERP
            </span>
          </div>

          <div className="table-container" style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Mã Đơn Hàng</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Linh Kiện Cung Cấp</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Tổng Số Lượng</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Doanh Thu (VNĐ)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Dòng Tiền Thanh Toán ERP</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {myPOs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      Chưa có lịch sử giao dịch phát sinh doanh thu.
                    </td>
                  </tr>
                ) : (
                  myPOs.map(po => {
                    const totalQty = po.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || po.quantity || 1;
                    const itemNames = po.items?.map(i => `${i.product?.name || i.name} (x${i.quantity})`).join(', ') || po.productName || 'Linh kiện';
                    const poTotal = po.totalAmount || 0;

                    return (
                      <tr key={po.id || po.poNumber} className="hover-row">
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#818cf8', fontSize: '0.85rem' }}>
                          {po.poNumber || `PO-${po.id}`}
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                            {po.createdAt ? new Date(po.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#0f172a', fontWeight: 600, maxWidth: '300px' }}>
                          {itemNames}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                          {totalQty} cái
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: poTotal > 0 ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                          {poTotal > 0 ? formatPrice(poTotal) : 'Chưa báo giá'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {po.status === 'DONE' ? (
                            <span className="badge badge-success" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '0.35rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                              ✅ Đã Thanh Toán 100%
                            </span>
                          ) : po.status === 'PO' ? (
                            <span className="badge badge-warning" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '0.35rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                              🚚 Đang Cung Cấp - Chờ Thanh Toán
                            </span>
                          ) : po.status === 'QUOTED' ? (
                            <span className="badge badge-info" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '0.35rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                              ⏳ Chờ CEO Duyệt Báo Giá
                            </span>
                          ) : po.status === 'RFQ_SENT' ? (
                            <span className="badge badge-secondary" style={{ padding: '0.35rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                              Chờ Nhập Báo Giá
                            </span>
                          ) : (
                            <span className="badge badge-danger" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.35rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                              Đã Hủy Đơn
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleSelectPO(po)}
                            style={{
                              background: 'rgba(99,102,241,0.15)',
                              border: '1px solid rgba(99,102,241,0.3)',
                              color: '#818cf8',
                              borderRadius: '6px',
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={12} /> Xem Chi Tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL — with price input for RFQ_SENT */}
      {selectedPO && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }} onClick={() => setSelectedPO(null)}>
          <div className="card-glass" style={{
            width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto',
            padding: '2rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>
                  {selectedPO.status === 'RFQ_SENT' ? 'Nhập Báo Giá' : 'Chi Tiết Đơn Hàng'}: <span style={{ color: 'var(--primary)' }}>{selectedPO.poNumber || selectedPO.id}</span>
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Ngày đặt hàng: {selectedPO.createdAt ? new Date(selectedPO.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {getStatusBadge(selectedPO.status)}
                <button onClick={() => setSelectedPO(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* RFQ_SENT: Instructions for supplier */}
            {selectedPO.status === 'RFQ_SENT' && (
              <div style={{ padding: '1rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <div style={{ color: '#b45309', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>Phòng Mua Hàng yêu cầu báo giá</div>
                  <div style={{ color: '#475569', fontSize: '0.85rem' }}>
                    Vui lòng nhập <strong>đơn giá</strong> cho từng sản phẩm bên dưới, rồi bấm <strong>"Gửi Báo Giá Cho CEO Duyệt"</strong> để tiến hành báo giá.
                  </div>
                </div>
              </div>
            )}

            {/* Organizations Info Card */}
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <Building size={13}/> Đơn Vị Phát Hành
                </div>
                <strong style={{ color: '#0f172a' }}>Hệ Thống ERP AETHERPC</strong>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Phòng Mua Hàng</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <Building size={13}/> Nhà Cung Cấp
                </div>
                <strong style={{ color: 'var(--primary)' }}>{selectedPO.supplier?.name || user?.fullname || 'Nhà Cung Cấp'}</strong>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Mã NCC: {selectedPO.supplierCode || user?.code || 'N/A'}</div>
              </div>
            </div>

            {/* Items Table — with price input if RFQ_SENT */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <Package size={15}/> Danh Sách Sản Phẩm Yêu Cầu
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tên Sản Phẩm</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', width: '80px' }}>Số Lượng</th>
                      {(selectedPO.status === 'RFQ_SENT' || selectedPO.status === 'PO' || selectedPO.status === 'DONE') && (
                        <>
                          <th style={{ padding: '0.75rem', textAlign: 'right', width: '160px' }}>
                            {selectedPO.status === 'RFQ_SENT' ? 'Đơn Giá (Nhập báo giá)' : 'Đơn Giá'}
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', width: '130px' }}>Thành Tiền</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPO.items && selectedPO.items.length > 0 ? (
                      selectedPO.items.map((item, idx) => {
                        const itemQty = item.quantity || 1;
                        const currentPrice = priceInputs[item.id] || '';
                        const lineTotal = (parseFloat(currentPrice) || 0) * itemQty;
                        const savedCost = item.unitCost || item.unitPrice || 0;
                        const savedTotal = item.totalCost || (savedCost * itemQty);
                        
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem', color: '#0f172a' }}>
                              <div style={{ fontWeight: 600 }}>{item.product?.name || item.name || 'Linh kiện'}</div>
                              {item.product?.category && <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.product.category}</span>}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>x{itemQty}</td>
                            {selectedPO.status === 'RFQ_SENT' && (
                              <>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Nhập giá..."
                                    value={currentPrice}
                                    onChange={(e) => setPriceInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    className="form-input"
                                    style={{ 
                                      width: '100%', 
                                      textAlign: 'right', 
                                      fontSize: '0.85rem', 
                                      padding: '0.4rem 0.6rem',
                                      borderColor: currentPrice ? 'var(--success)' : '#cbd5e1',
                                      backgroundColor: currentPrice ? '#f0fdf4' : '#ffffff',
                                      color: '#0f172a'
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: lineTotal > 0 ? 'var(--success)' : '#94a3b8' }}>
                                  {lineTotal > 0 ? formatPrice(lineTotal) : '—'}
                                </td>
                              </>
                            )}
                            {(selectedPO.status === 'PO' || selectedPO.status === 'DONE') && (
                              <>
                                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#475569' }}>{formatPrice(savedCost)}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{formatPrice(savedTotal)}</td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                          Không có dữ liệu sản phẩm.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total summary */}
            {selectedPO.status === 'RFQ_SENT' && (
              <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: 700 }}>
                  <span style={{ color: '#0f172a' }}>Tổng Báo Giá:</span>
                  <span style={{ color: 'var(--success)', fontSize: '1.3rem' }}>
                    {getQuotedTotal(selectedPO) > 0 ? formatPrice(getQuotedTotal(selectedPO)) : '— (Vui lòng nhập giá)'}
                  </span>
                </div>
              </div>
            )}

            {(selectedPO.status === 'PO' || selectedPO.status === 'DONE') && selectedPO.totalAmount > 0 && (
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: 700 }}>
                  <span style={{ color: '#0f172a' }}>Tổng Giá Trị Đơn Hàng:</span>
                  <span style={{ color: 'var(--success)', fontSize: '1.3rem' }}>{formatPrice(selectedPO.totalAmount)}</span>
                </div>
              </div>
            )}

            {selectedPO.cancelReason && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#dc2626' }}>
                ⚠️ Lý do từ chối: <strong>{selectedPO.cancelReason}</strong>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              {selectedPO.status === 'RFQ_SENT' && (
                <>
                  <button
                    onClick={() => { setCancelModalPO(selectedPO); setCancelReason(''); }}
                    style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', backgroundColor: '#fef2f2', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                    disabled={submitting}
                  >
                    <X size={15} /> Từ Chối
                  </button>
                  <button
                    onClick={() => handleConfirmPO(selectedPO)}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', backgroundColor: 'var(--success)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                    disabled={submitting || getQuotedTotal(selectedPO) <= 0}
                  >
                    <Check size={15} /> Gửi Báo Giá Cho CEO Duyệt
                  </button>
                </>
              )}
              <button onClick={() => setSelectedPO(null)} className="btn btn-secondary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', borderRadius: '8px' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION / CANCEL MODAL WITH REASON */}
      {cancelModalPO && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem'
        }} onClick={() => setCancelModalPO(null)}>
          <div className="card-glass" style={{
            width: '100%', maxWidth: '520px', padding: '1.5rem', backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--danger)', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <XCircle size={20} />
                Từ Chối YCBG #{cancelModalPO.poNumber || cancelModalPO.id}
              </h3>
              <button onClick={() => setCancelModalPO(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
              Vui lòng chọn hoặc nhập lý do từ chối cho Phòng Mua Hàng:
            </p>

            {/* Quick Reason Chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[
                'Tạm hết hàng trong kho',
                'Giá linh kiện biến động',
                'Không đủ số lượng yêu cầu',
                'Thời gian giao quá gấp',
                'Ngưng sản xuất mẫu này'
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setCancelReason(chip)}
                  style={{
                    padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px',
                    backgroundColor: cancelReason === chip ? '#fee2e2' : '#f8fafc',
                    border: '1px solid', borderColor: cancelReason === chip ? 'var(--danger)' : '#cbd5e1',
                    color: cancelReason === chip ? '#dc2626' : '#475569',
                    fontWeight: cancelReason === chip ? 700 : 500,
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Custom Reason Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.4rem' }}>
                Ghi chú lý do chi tiết:
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Nhập lý do cụ thể..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 0.75rem', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setCancelModalPO(null)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                Hủy Bỏ
              </button>
              <button
                onClick={() => handleConfirmReject(cancelModalPO.id || cancelModalPO.poNumber, cancelReason)}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: 'var(--danger)', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                disabled={submitting}
              >
                <X size={14} /> Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
