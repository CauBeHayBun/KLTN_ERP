import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useERP } from '../../context/ERPContext';
import { api } from '../../services/api';
import ActorNotificationBar from '../../components/ActorNotificationBar';
import { 
  Package, Search, Plus, DollarSign, Eye, 
  Trash2, Calendar, ShoppingBag, Check, X, Send, 
  AlertCircle, RefreshCw, User, ShoppingCart, ArrowRight, Truck, FileText, CreditCard, Bell,
  BarChart2, Award, Zap, TrendingDown
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

export default function Purchasing() {
  const location = useLocation();
  const { user, isPurchasing, isCEO, isAccountant, isWarehouse, isWarehouseManager, isAdmin } = useAuth();
  const erpContext = useERP() || {};
  
  // Data State
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Loading & Action State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [poStartDate, setPoStartDate] = useState('');
  const [poEndDate, setPoEndDate] = useState('');
  
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null); // for viewing details
  const [viewMode, setViewMode] = useState('PO'); // 'PO', 'RECEIPT', 'BILL'
  const [selectedGroupKey, setSelectedGroupKey] = useState(null); // key of the rfq-group to compare

  // Build groups of RFQs that share the same set of product IDs (same batch from multi-supplier RFQ)
  const rfqGroups = (() => {
    const comparableOrders = orders.filter(po => ['RFQ', 'RFQ_SENT', 'QUOTED'].includes(po.status));
    const groups = {};
    for (const po of comparableOrders) {
      const productIds = (po.items || [])
        .map(it => String(it.productId || it.product?.id || ''))
        .filter(Boolean)
        .sort()
        .join(',');
      if (!productIds) continue;
      if (!groups[productIds]) groups[productIds] = [];
      groups[productIds].push(po);
    }
    // Only return groups with >= 2 entries (can compare)
    return Object.entries(groups)
      .filter(([, list]) => list.length >= 2)
      .map(([key, list]) => ({ key, list }));
  })();


  
  // Create PO Form State
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedSuppliersList, setSelectedSuppliersList] = useState(['', '']);
  const [isMultiSupplierRFQ, setIsMultiSupplierRFQ] = useState(false);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poItems, setPoItems] = useState([]);
  
  // Add item form state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState('');
  const searchComboboxRef = useRef(null);
  const lastHandledRfqKeyRef = useRef(null);

  const handleOpenCreateModal = () => {
    setSelectedSupplier('');
    setSelectedSuppliersList(['', '']);
    setIsMultiSupplierRFQ(false);
    setExpectedDeliveryDate('');
    setPoItems([]);
    try { window.history.replaceState({}, document.title); } catch (_) {}
    setShowCreateModal(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchComboboxRef.current && !searchComboboxRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProductsForModal = products.filter(p => {
    if (!productSearchQuery.trim()) return true;
    const q = productSearchQuery.toLowerCase();
    return (p.name && p.name.toLowerCase().includes(q)) || 
           (p.sku && p.sku.toLowerCase().includes(q)) || 
           (p.category && p.category.toLowerCase().includes(q));
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        api.get('/purchasing/orders'),
        api.get('/purchasing/suppliers'),
        api.get('/purchasing/products')
      ]);

      let finalOrders = [];
      if (ordersRes?.success && Array.isArray(ordersRes.data) && ordersRes.data.length > 0) {
        finalOrders = ordersRes.data;
      } else {
        try { finalOrders = JSON.parse(localStorage.getItem('erp_pos') || '[]'); } catch (_) {}
        if (!finalOrders || finalOrders.length === 0) {
          finalOrders = erpContext.purchaseOrders || [];
        }
      }
      setOrders(finalOrders);

      let finalSuppliers = [];
      if (suppliersRes?.success && Array.isArray(suppliersRes.data) && suppliersRes.data.length > 0) {
        finalSuppliers = suppliersRes.data;
      } else {
        finalSuppliers = erpContext.suppliers || [
          { code: 's1', name: 'Samsung Vina Electronics' },
          { code: 's2', name: 'Mai Hoàng Distribution' },
          { code: 's3', name: 'Intel Vietnam' }
        ];
      }
      setSuppliers(finalSuppliers);

      let finalProducts = [];
      if (productsRes?.success && Array.isArray(productsRes.data) && productsRes.data.length > 0) {
        finalProducts = productsRes.data;
      } else {
        finalProducts = erpContext.products || [];
      }
      setProducts(finalProducts);
    } catch (err) {
      console.warn('API error:', err.message);
      let fallbackOrders = [];
      try { fallbackOrders = JSON.parse(localStorage.getItem('erp_pos') || '[]'); } catch (_) {}
      if (!fallbackOrders || fallbackOrders.length === 0) {
        fallbackOrders = erpContext.purchaseOrders || [];
      }
      if (fallbackOrders.length > 0) {
        setOrders(fallbackOrders);
      } else {
        setError('Lỗi kết nối tới server.');
      }

      if (erpContext.suppliers?.length > 0) setSuppliers(erpContext.suppliers);
      if (erpContext.products?.length > 0) setProducts(erpContext.products);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Chưa rõ';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
  };

  const handleOpenRFQForProduct = (prod, customQty) => {
    setShowCreateModal(true);
    if (prod) {
      const prodId = String(prod.productId || prod.id || '');
      setProductSearchQuery(prod.name || '');
      setSelectedProduct(prodId || '');

      const parsedCustomQty = Number(customQty || prod.requestedQty || prod.quantity || prod.alertQty);
      const recQty = (parsedCustomQty && !isNaN(parsedCustomQty) && parsedCustomQty > 0)
        ? parsedCustomQty
        : Math.max((prod.threshold || 5) * 2 - (Number(prod.stock) || 0), 5);
      
      setQuantity(recQty);
      setUnitCost('');
      
      setPoItems([{
        productId: prodId,
        name: prod.name,
        productName: prod.name,
        quantity: recQty,
        unitCost: 0,
        totalCost: 0
      }]);

      if (prod.supplier && suppliers.length > 0) {
        const matchedSup = suppliers.find(s => s.name?.toLowerCase().includes(prod.supplier.toLowerCase()));
        if (matchedSup) setSelectedSupplier(matchedSup.code);
      }
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      setUnitCost('');
    }
  }, [selectedProduct]);

  // Auto-open RFQ Modal when navigating from Notification/ActorBar
  useEffect(() => {
    if (location.state?.createRFQ && location.state?.product) {
      const rfqKey = location.state.timestamp || `${location.state.product.productId || location.state.product.id}_${location.key}`;
      if (lastHandledRfqKeyRef.current !== rfqKey) {
        lastHandledRfqKeyRef.current = rfqKey;
        const targetQty = location.state.quantity || location.state.product?.requestedQty;
        handleOpenRFQForProduct(location.state.product, targetQty);
        try { window.history.replaceState({}, document.title); } catch (_) {}
      }
    }
  }, [location.state, location.key]);

  useEffect(() => {
    const handlePrefillRFQEvent = (e) => {
      const prod = e.detail?.product || e.detail?.itemData || e.detail;
      const targetQty = e.detail?.quantity || e.detail?.requestedQty || prod?.requestedQty || prod?.quantity;
      if (prod) {
        handleOpenRFQForProduct(prod, targetQty);
        try { window.history.replaceState({}, document.title); } catch (_) {}
      }
    };

    window.addEventListener('open-rfq-prefill-modal', handlePrefillRFQEvent);

    return () => {
      window.removeEventListener('open-rfq-prefill-modal', handlePrefillRFQEvent);
    };
  }, []);

  const handleAddItem = () => {
    if (!selectedProduct) return;
    const prod = products.find(p => p.productId === selectedProduct);
    if (!prod) return;
    if (poItems.some(item => item.productId === selectedProduct)) {
      alert('Sản phẩm này đã được thêm vào danh sách.');
      return;
    }
    const qty = parseInt(quantity) || 1;
    const cost = 0;
    
    setPoItems([...poItems, {
      productId: String(prod.productId || prod.id || ''),
      name: prod.name,
      productName: prod.name,
      sku: prod.sku,
      quantity: qty,
      unitCost: cost,
      totalCost: cost * qty
    }]);

    setSelectedProduct('');
    setProductSearchQuery('');
    setShowSuggestions(false);
    setQuantity(1);
    setUnitCost('');
  };

  const handleRemoveItem = (productId) => setPoItems(poItems.filter(item => item.productId !== productId));

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!isMultiSupplierRFQ && !selectedSupplier) { alert('Vui lòng chọn Nhà cung cấp.'); return; }
    if (poItems.length === 0) { alert('Vui lòng thêm ít nhất một sản phẩm.'); return; }

    setSubmitting(true);
    try {
      // If multi-supplier RFQ is checked, use the dynamically selected suppliers list
      let targetSuppliers = [];
      if (isMultiSupplierRFQ) {
        targetSuppliers = selectedSuppliersList.filter(Boolean);
        targetSuppliers = Array.from(new Set(targetSuppliers));
        if (targetSuppliers.length === 0) {
          alert('Vui lòng chọn ít nhất một Nhà cung cấp.');
          setSubmitting(false);
          return;
        }
      } else {
        if (!selectedSupplier) { alert('Vui lòng chọn Nhà cung cấp.'); setSubmitting(false); return; }
        targetSuppliers = [selectedSupplier];
      }

      let createdCount = 0;
      for (const supCode of targetSuppliers) {
        const payload = {
          supplierCode: supCode,
          expectedDeliveryDate: expectedDeliveryDate || null,
          items: poItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: 0
          }))
        };
        const res = await api.post('/purchasing/orders', payload);
        if (res?.success) createdCount++;
      }

      setShowCreateModal(false);
      setSelectedSupplier('');
      setExpectedDeliveryDate('');
      setPoItems([]);
      try { window.history.replaceState({}, document.title); } catch (_) {}
      fetchData();
      alert(`🎉 Đã khởi tạo đồng thời ${createdCount} Yêu Cầu Báo Giá (RFQ) gửi tới các Nhà Cung Cấp đối tác để so sánh đơn giá tối ưu!`);
    } catch (err) {
      alert('Lỗi khi tạo PO: ' + err.message);
    }
    setSubmitting(false);
  };

  const handleSelectOptimalSupplier = async (winningPo, competingPos) => {
    if (!winningPo) return;
    setSubmitting(true);
    try {
      // 1. Target status for winning PO: PO if CEO/Admin, or QUOTED if needing CEO approval
      const targetStatus = (isCEO || isAdmin) ? 'PO' : 'QUOTED';
      await api.patch(`/purchasing/orders/${winningPo.id}/status`, { status: targetStatus });
      
      // 2. Cancel competing/losing RFQs
      const losingPos = (competingPos || []).filter(p => p.id !== winningPo.id && ['RFQ', 'RFQ_SENT', 'QUOTED'].includes(p.status));
      for (const losingPo of losingPos) {
        await api.patch(`/purchasing/orders/${losingPo.id}/status`, { status: 'CANCELLED' });
      }

      alert(`✅ Đã phê duyệt Báo giá tối ưu nhất từ ${winningPo.supplier?.name || winningPo.supplierCode}!\n\n` + 
            `• Đơn được chọn: ${winningPo.poNumber} (${formatCurrency(winningPo.totalAmount)})\n` +
            `• Các báo giá của NCC khác đã chuyển trạng thái HỦY BỎ để đảm bảo minh bạch tài chính.`);
      
      setShowCompareModal(false);
      await fetchData();
    } catch (err) {
      alert('Lỗi khi chọn báo giá: ' + err.message);
    }
    setSubmitting(false);
  };

  // Gửi báo giá đồng loạt cho tất cả RFQ trong nhóm (chuyển RFQ -> RFQ_SENT)
  const handleBulkSendGroup = async (groupList) => {
    const toSend = groupList.filter(po => po.status === 'RFQ');
    if (toSend.length === 0) {
      alert('Tất cả phiếu trong nhóm này đã được gửi rồi.');
      return;
    }
    if (!window.confirm(`Xác nhận gửi Yêu Cầu Báo Giá đồng thời tới ${toSend.length} Nhà Cung Cấp?`)) return;
    setSubmitting(true);
    try {
      let sentCount = 0;
      for (const po of toSend) {
        const res = await api.patch(`/purchasing/orders/${po.id}/status`, { status: 'RFQ_SENT' });
        if (res?.success) sentCount++;
      }
      alert(`📤 Đã gửi Yêu Cầu Báo Giá thành công tới ${sentCount} Nhà Cung Cấp!\nCác NCC sẽ phản hồi báo giá sớm.`);
      await fetchData();
    } catch (err) {
      alert('Lỗi khi gửi: ' + err.message);
    }
    setSubmitting(false);
  };

  const handleUpdateStatus = async (poId, newStatus) => {
    setSubmitting(true);
    try {
      const res = await api.patch(`/purchasing/orders/${poId}/status`, { status: newStatus });
      if (res?.success) {
        alert(`Đơn hàng đã được chuyển trạng thái sang: ${getStatusText(newStatus)}`);
        await fetchData();
        if (selectedPO) {
          const currentOrder = await api.get('/purchasing/orders');
          const found = currentOrder.data.find(o => o.id === poId);
          if (found) setSelectedPO(found);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
    setSubmitting(false);
  };

  const handleCreateBill = async (poId) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/purchasing/orders/${poId}/bills`, {});
      if (res?.success) {
        alert('Tạo Hóa Đơn thành công!');
        await fetchData();
        if (selectedPO) {
          const currentOrder = await api.get('/purchasing/orders');
          const found = currentOrder.data.find(o => o.id === poId);
          if (found) setSelectedPO(found);
        }
      }
    } catch (err) {
      alert('Lỗi tạo hóa đơn: ' + err.message);
    }
    setSubmitting(false);
  };

  const handleRegisterPayment = async (billId, amount) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/purchasing/bills/${billId}/payments`, { amount, paymentMethod: 'Bank Transfer' });
      if (res?.success) {
        alert('Ghi nhận Thanh Toán thành công!');
        await fetchData();
        if (selectedPO) {
          const currentOrder = await api.get('/purchasing/orders');
          const found = currentOrder.data.find(o => o.id === selectedPO.id);
          if (found) setSelectedPO(found);
        }
      }
    } catch (err) {
      alert('Lỗi thanh toán: ' + err.message);
    }
    setSubmitting(false);
  };

  const handleValidateReceipt = async (receiptId) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/purchasing/receipts/${receiptId}/validate`, {});
      if (res?.success) {
        alert('Xác nhận Phiếu Nhập Kho thành công!');
        await fetchData();
        if (selectedPO) {
          const currentOrder = await api.get('/purchasing/orders');
          const found = currentOrder.data.find(o => o.id === selectedPO.id);
          if (found) setSelectedPO(found);
        }
      }
    } catch (err) {
      alert('Lỗi nhập kho: ' + err.message);
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RFQ': return 'badge-secondary';
      case 'RFQ_SENT': return 'badge-warning';
      case 'QUOTED': return 'badge-info';
      case 'PO': return 'badge-primary';
      case 'SENT': return 'badge-info';
      case 'RECEIVED': return 'badge-success';
      case 'COMPLETED': return 'badge-success';
      case 'DONE': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      case 'RETURNING_TO_WAREHOUSE': return 'badge-warning';
      case 'RETURNING': return 'badge-warning';
      case 'RETURNED': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'RFQ': return 'Yêu Cầu Báo Giá (RFQ)';
      case 'RFQ_SENT': return 'Đã gửi YCBG (Chờ NCC)';
      case 'QUOTED': return 'Đã báo giá (Chờ CEO duyệt)';
      case 'PO': return 'Đơn Mua Hàng (PO)';
      case 'SENT': return 'Đã Gửi NCC';
      case 'RECEIVED': return 'Đã Nhận Hàng';
      case 'COMPLETED': return 'Hoàn Tất';
      case 'DONE': return 'Hoàn Tất';
      case 'CANCELLED': return 'Đã Hủy';
      case 'RETURNING_TO_WAREHOUSE': return 'Đang Trả Về Kho';
      case 'RETURNING': return 'Đang Trả Hàng';
      case 'RETURNED': return 'Đã Hoàn Hàng';
      case 'PROCESSING': return 'Đang Xử Lý';
      case 'CONFIRMED': return 'Đã Xác Nhận';
      case 'DELIVERED': return 'Đã Giao Hàng';
      case 'READY_TO_SHIP': return 'Đã Xuất Kho';
      case 'SHIPPED': return 'Đang Giao Hàng';
      case 'SHIPPING_FAILED': return 'Giao Thất Bại';
      case 'AWAITING_STOCK': return 'Chờ Linh Kiện';
      default: return status || 'Chưa rõ';
    }
  };

  const filteredOrders = orders
    .filter(po => {
      const matchesSearch = (po.poNumber || po.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) || 
        (po.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (po.supplierCode || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
      const matchesDate = isDateInRange(po.createdAt || po.date || po.issueDate, poStartDate, poEndDate);
      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      const dA = new Date(a.createdAt || a.date || a.issueDate || 0);
      const dB = new Date(b.createdAt || b.date || b.issueDate || 0);
      if (dB.getTime() !== dA.getTime()) return dB.getTime() - dA.getTime();
      return String(b.poNumber || b.id || '').localeCompare(String(a.poNumber || a.id || ''), 'vi', { numeric: true });
    });

  const activeOrders = orders.filter(po => ['PO', 'DONE'].includes(po.status));
  const totalSpent = activeOrders.reduce((sum, po) => sum + parseFloat(po.totalAmount || 0), 0);
  const rfqCount = orders.filter(po => po.status === 'RFQ').length;

  return (
    <div style={{ padding: '1.25rem 1.5rem 2.5rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem', letterSpacing: '-0.02em' }}>
            Mua Hàng (Purchasing)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Quản lý chuỗi cung ứng, từ Báo giá (RFQ) đến Đơn mua hàng (PO)</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={fetchData} className="btn btn-secondary hover-glow" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px' }} title="Tải lại dữ liệu">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Tải lại</span>
          </button>
          
          {(isPurchasing || isCEO || isAdmin) && (
            <>
              <button 
                onClick={() => setShowCompareModal(true)} 
                className="btn btn-secondary shadow-glow hover-scale" 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.85rem', 
                  padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1.5px solid #2563eb', 
                  color: '#2563eb', backgroundColor: '#eff6ff' 
                }}
              >
                <BarChart2 size={16} />
                <span>So Sánh Báo Giá NCC</span>
              </button>

              <button onClick={handleOpenCreateModal} className="btn btn-primary shadow-glow hover-scale" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem', padding: '0.45rem 1.1rem', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <Plus size={16} />
                <span>Tạo Yêu Cầu Báo Giá (RFQ)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      <ActorNotificationBar />

      {/* CEO Approval Notification Banner - Styled like Top Task Banner */}
      {(() => {
        const quotedOrders = orders.filter(po => po.status === 'QUOTED');
        if (quotedOrders.length === 0) return null;
        return (
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Bell size={18} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Thông Báo Duyệt Báo Giá NCC (Dành cho CEO / Admin)
                  </h4>
                  <span style={{
                    backgroundColor: '#eff6ff', color: '#2563eb',
                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
                    border: '1px solid #bfdbfe'
                  }}>
                    {quotedOrders.length} Báo Giá Mới
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#475569' }}>
                  Có <strong style={{ color: '#2563eb', fontSize: '0.88rem' }}>{quotedOrders.length} đơn hàng</strong> từ Nhà Cung Cấp đã gửi báo giá chi tiết, đang chờ CEO / Ban Giám Đốc duyệt!
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('QUOTED')}
              className="btn hover-scale"
              style={{
                padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '10px',
                whiteSpace: 'nowrap', backgroundColor: '#6366f1', color: '#ffffff', border: 'none',
                boxShadow: '0 2px 6px rgba(99,102,241,0.25)', cursor: 'pointer'
              }}
            >
              Xem & Duyệt Báo Giá Ngay →
            </button>
          </div>
        );
      })()}

      {/* Stats Cards Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card-glass hover-scale" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', borderRadius: '10px', color: '#2563eb', flexShrink: 0 }}>
            <Package size={20} />
          </div>
          <div>
            <p style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Tất cả Đơn hàng</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.1rem', marginBottom: 0, color: '#0f172a' }}>{orders.length}</h3>
          </div>
        </div>

        {/* Card: Chờ CEO Duyệt Báo Giá */}
        {(() => {
          const qCount = orders.filter(po => po.status === 'QUOTED').length;
          return (
            <div 
              onClick={() => setStatusFilter('QUOTED')}
              className="card-glass hover-scale" 
              style={{ 
                padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px', 
                border: qCount > 0 ? '1px solid #2563eb' : '1px solid #cbd5e1',
                boxShadow: qCount > 0 ? '0 4px 15px rgba(37, 99, 235, 0.15)' : 'none',
                backgroundColor: qCount > 0 ? '#eff6ff' : '#ffffff',
                cursor: 'pointer' 
              }}
            >
              <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: qCount > 0 ? '#dbeafe' : '#fef3c7', borderRadius: '10px', color: qCount > 0 ? '#2563eb' : '#d97706', flexShrink: 0 }}>
                <Bell size={20} />
              </div>
              <div>
                <p style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Chờ CEO Duyệt</p>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.1rem', marginBottom: 0, color: qCount > 0 ? '#2563eb' : '#0f172a' }}>
                  {qCount}
                </h3>
              </div>
            </div>
          );
        })()}

        <div className="card-glass hover-scale" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', borderRadius: '10px', color: '#d97706', flexShrink: 0 }}>
            <Calendar size={20} />
          </div>
          <div>
            <p style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Yêu Cầu Báo Giá (RFQ)</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.1rem', marginBottom: 0, color: '#0f172a' }}>{rfqCount}</h3>
          </div>
        </div>

        <div className="card-glass hover-scale" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))', borderRadius: '10px', color: '#34d399', flexShrink: 0 }}>
            <DollarSign size={20} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Tổng Chi Phí (PO)</p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '0.1rem', marginBottom: 0 }}>
              {formatCurrency(totalSpent)}
            </h3>
          </div>
        </div>
      </div>

      {/* Filters and List view */}
      <div className="card-glass" style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
        {/* Row 1: Search Input & Status Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Tìm kiếm PO, Nhà cung cấp..." className="form-input" style={{ paddingLeft: '2.4rem', fontSize: '0.82rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: '8px' }}>
            {['ALL', 'RFQ', 'RFQ_SENT', 'QUOTED', 'PO', 'DONE', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.35rem 0.75rem', fontSize: '0.76rem', fontWeight: 600,
                  backgroundColor: statusFilter === st ? 'var(--primary)' : 'transparent',
                  borderRadius: '6px', color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.2s', border: 'none', whiteSpace: 'nowrap'
                }}
              >
                {st === 'ALL' ? 'Tất cả' : getStatusText(st)}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Dedicated Date Range Filter Sub-Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', padding: '0.45rem 0.85rem', backgroundColor: (poStartDate || poEndDate) ? '#eff6ff' : '#ffffff', border: (poStartDate || poEndDate) ? '1px solid #bfdbfe' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem' }}>
          <span style={{ color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Calendar size={14} style={{ color: '#2563eb' }} />
            Lọc Theo Ngày Khởi Tạo:
          </span>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Từ:</span>
          <input
            type="date"
            value={poStartDate}
            onChange={(e) => setPoStartDate(e.target.value)}
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
            value={poEndDate}
            onChange={(e) => setPoEndDate(e.target.value)}
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
          {(poStartDate || poEndDate) && (
            <button
              onClick={() => {
                setPoStartDate('');
                setPoEndDate('');
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

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem' }}>
            <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Đang tải dữ liệu...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
            <ShoppingBag size={56} style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
            <p style={{ fontSize: '1.1rem' }}>Không tìm thấy dữ liệu.</p>
          </div>
        ) : (
          <>
          {/* RFQ Group compare hint banner */}
          {rfqGroups.length > 0 && (() => {
            // Count groups that still have unsent RFQs
            const groupsWithUnsent = rfqGroups.filter(g => g.list.some(p => p.status === 'RFQ'));
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                marginBottom: '0.85rem', padding: '0.65rem 1rem',
                backgroundColor: '#eff6ff', border: '1.5px solid #bfdbfe',
                borderRadius: '10px', flexWrap: 'wrap'
              }}>
                <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                  <BarChart2 size={15} />
                  Có <strong>{rfqGroups.length}</strong> nhóm YCBG
                  {groupsWithUnsent.length > 0 && (
                    <span style={{ color: '#f59e0b', marginLeft: '0.4rem' }}>
                      — <strong>{groupsWithUnsent.reduce((s, g) => s + g.list.filter(p => p.status === 'RFQ').length, 0)}</strong> phiếu chưa gửi NCC
                    </span>
                  )}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {groupsWithUnsent.length > 0 && (
                    <button
                      onClick={() => {
                        const allUnsent = groupsWithUnsent.flatMap(g => g.list.filter(p => p.status === 'RFQ'));
                        handleBulkSendGroup(allUnsent);
                      }}
                      disabled={submitting}
                      style={{
                        backgroundColor: '#d97706', color: '#fff', border: 'none',
                        borderRadius: '8px', padding: '0.35rem 0.85rem', fontWeight: 700,
                        fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                      }}
                    >
                      <Send size={14} /> Gửi Tất Cả YCBG
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedGroupKey(rfqGroups[0].key); setShowCompareModal(true); }}
                    style={{
                      backgroundColor: '#2563eb', color: '#fff', border: 'none',
                      borderRadius: '8px', padding: '0.35rem 0.85rem', fontWeight: 700,
                      fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                    }}
                  >
                    <BarChart2 size={14} /> Mở Bảng So Sánh
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="table-container" style={{ overflowX: 'auto', minHeight: '380px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Tham chiếu</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Nhà Cung Cấp</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Người Yêu Cầu</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Dự Kiến Nhận</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Tổng Tiền</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Trạng Thái</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>So Sánh</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((po) => {
                  // Find which group this PO belongs to (if any)
                  const belongsToGroup = rfqGroups.find(g => g.list.some(p => p.id === po.id));
                  return (
                    <tr
                      key={po.id}
                      style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                      className="hover-row"
                    >
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 700, color: '#818cf8', textAlign: 'left', fontSize: '0.85rem' }}
                        onClick={() => { setSelectedPO(po); setViewMode('PO'); }}>
                        {po.poNumber}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 600, textAlign: 'left', fontSize: '0.85rem' }}
                        onClick={() => { setSelectedPO(po); setViewMode('PO'); }}>
                        {po.supplier?.name || po.supplierCode}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', color: 'var(--text-secondary)', textAlign: 'left', fontSize: '0.82rem' }}
                        onClick={() => { setSelectedPO(po); setViewMode('PO'); }}>
                        {po.createdBy || 'N/A'}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', color: 'var(--text-secondary)', textAlign: 'left', fontSize: '0.82rem' }}
                        onClick={() => { setSelectedPO(po); setViewMode('PO'); }}>
                        {formatDate(po.expectedDeliveryDate)}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 700, textAlign: 'left', fontSize: '0.88rem' }}
                        onClick={() => { setSelectedPO(po); setViewMode('PO'); }}>
                        {['RFQ', 'RFQ_SENT'].includes(po.status) ? (
                          <span style={{ color: '#d97706', fontStyle: 'italic', fontWeight: 600 }}>Chờ NCC báo giá</span>
                        ) : (
                          formatCurrency(po.totalAmount)
                        )}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', textAlign: 'left' }}
                        onClick={() => { setSelectedPO(po); setViewMode('PO'); }}>
                        <span className={`badge ${getStatusBadge(po.status)}`} style={{ padding: '0.3rem 0.65rem', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {getStatusText(po.status)}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {belongsToGroup ? (
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {belongsToGroup.list.some(p => p.status === 'RFQ') && (
                              <button
                                onClick={() => handleBulkSendGroup(belongsToGroup.list)}
                                disabled={submitting}
                                title={`Gửi YCBG tới tất cả ${belongsToGroup.list.filter(p => p.status === 'RFQ').length} NCC trong nhóm`}
                                style={{
                                  backgroundColor: '#fef3c7', color: '#b45309',
                                  border: '1.5px solid #fcd34d', borderRadius: '8px',
                                  padding: '0.28rem 0.55rem', fontSize: '0.72rem',
                                  fontWeight: 700, cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                                }}
                              >
                                <Send size={11} /> Gửi ({belongsToGroup.list.filter(p => p.status === 'RFQ').length})
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedGroupKey(belongsToGroup.key); setShowCompareModal(true); }}
                              title={`So sánh nhóm ${belongsToGroup.list.length} NCC cùng sản phẩm`}
                              style={{
                                backgroundColor: '#eff6ff', color: '#2563eb',
                                border: '1.5px solid #2563eb', borderRadius: '8px',
                                padding: '0.28rem 0.55rem', fontSize: '0.72rem',
                                fontWeight: 700, cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                              }}
                            >
                              <BarChart2 size={11} /> So sánh ({belongsToGroup.list.length})
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* ================= MODAL TẠO YCBG (RFQ) ================= */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#dbeafe', borderRadius: '12px', color: '#2563eb' }}>
                  <ShoppingCart size={24} />
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Yêu Cầu Báo Giá (RFQ)</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePO}>
              {/* Multi-Supplier RFQ Toggle */}
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BarChart2 size={20} style={{ color: '#2563eb' }} />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#1e40af', display: 'block' }}>Gửi Yêu Cầu Báo Giá Đồng Thời Cho Các Nhà Cung Cấp</strong>
                    <span style={{ fontSize: '0.78rem', color: '#3b82f6' }}>Tự động tạo các đơn RFQ phân tách cho từng đối tác để so sánh giá và chọn phương án rẻ nhất</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={isMultiSupplierRFQ} 
                  onChange={(e) => setIsMultiSupplierRFQ(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }} 
                />
              </div>

              {isMultiSupplierRFQ ? (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#1e40af', margin: 0 }}>
                      🎯 Chọn Các Nhà Cung Cấp Để Gửi Yêu Cầu Báo Giá So Sánh:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextUnselected = suppliers.find(s => !selectedSuppliersList.includes(s.code))?.code || suppliers[0]?.code || '';
                        setSelectedSuppliersList([...selectedSuppliersList, nextUnselected]);
                      }}
                      className="btn hover-scale"
                      style={{
                        padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 700,
                        borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.35rem',
                        backgroundColor: '#eff6ff', border: '1.5px solid #2563eb', color: '#2563eb', cursor: 'pointer'
                      }}
                    >
                      <Plus size={15} /> <span>+ Thêm NCC ({selectedSuppliersList.length})</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(selectedSuppliersList.length, 3)}, 1fr)`, gap: '1rem' }}>
                    {selectedSuppliersList.map((supCode, idx) => (
                      <div key={idx} className="form-group" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', margin: 0 }}>
                            NCC #{idx + 1} {idx === 0 ? '(Chính)' : '(So sánh)'}
                          </label>
                          {selectedSuppliersList.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = selectedSuppliersList.filter((_, i) => i !== idx);
                                setSelectedSuppliersList(updated);
                              }}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                              title="Xóa NCC này"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <select
                          className="form-input"
                          value={supCode}
                          onChange={(e) => {
                            const updated = [...selectedSuppliersList];
                            updated[idx] = e.target.value;
                            setSelectedSuppliersList(updated);
                          }}
                          required
                          style={{ borderRadius: '10px', backgroundColor: '#ffffff', color: '#0f172a' }}
                        >
                          <option value="">-- Chọn NCC #{idx + 1} --</option>
                          {suppliers.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nhà Cung Cấp</label>
                    <select className="form-input" value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} required style={{ borderRadius: '10px', backgroundColor: '#ffffff', color: '#0f172a' }}>
                      <option value="">-- Chọn Nhà Cung Cấp --</option>
                      {suppliers.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày Giao Hàng Dự Kiến</label>
                    <input type="date" className="form-input" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} style={{ borderRadius: '10px', backgroundColor: '#ffffff', color: '#0f172a' }} />
                  </div>
                </div>
              )}

              {isMultiSupplierRFQ && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Ngày Giao Hàng Dự Kiến</label>
                  <input type="date" className="form-input" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} style={{ borderRadius: '10px', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
              )}

              <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb' }}>
                  <Plus size={18} /> Thêm Sản Phẩm
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '4fr 2fr auto', gap: '1rem', alignItems: 'end' }}>
                  <div ref={searchComboboxRef} className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                    <label className="form-label">Sản Phẩm</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Tìm kiếm linh kiện..."
                      value={productSearchQuery}
                      onChange={(e) => { setProductSearchQuery(e.target.value); setShowSuggestions(true); setSelectedProduct(''); }}
                      onFocus={() => setShowSuggestions(true)}
                      style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                    />
                    {showSuggestions && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#ffffff', border: '1px solid #2563eb', borderRadius: '8px', zIndex: 100, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                        {filteredProductsForModal.map(p => (
                          <div key={p.productId} onClick={() => { setSelectedProduct(p.productId); setProductSearchQuery(p.name); setUnitCost(0); setShowSuggestions(false); }} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}>
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Số Lượng</label>
                    <input type="number" min="1" className="form-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ backgroundColor: '#ffffff', color: '#0f172a' }} />
                  </div>
                  <button type="button" onClick={handleAddItem} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '10px' }}>Thêm</button>
                </div>
              </div>

              {poItems.length > 0 && (
                <div className="table-container" style={{ marginBottom: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <table className="erp-table">
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ textAlign: 'left' }}>Sản phẩm</th>
                        <th style={{ textAlign: 'left' }}>Số lượng</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((item) => (
                        <tr key={item.productId}>
                          <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>{item.productName || item.name}</td>
                          <td style={{ textAlign: 'left', color: '#0f172a', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ textAlign: 'center' }}><button type="button" onClick={() => handleRemoveItem(item.productId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ borderRadius: '10px' }}>Hủy</button>
                <button type="submit" className="btn btn-primary shadow-glow" disabled={submitting || poItems.length === 0} style={{ borderRadius: '10px' }}>Lưu (RFQ)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CHI TIẾT ODOO-STYLE ================= */}
      {selectedPO && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '1100px', maxHeight: '92vh', overflowY: 'auto', padding: '0', borderRadius: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 30px 60px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Toolbar Top */}
            <div style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {/* Row 1: Action Buttons + Close + Pipeline */}
              <div style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Left: Action Buttons */}
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {selectedPO.status === 'RFQ' && (
                    <button onClick={() => handleUpdateStatus(selectedPO.id, 'RFQ_SENT')} className="btn btn-primary shadow-glow" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem' }}>
                      <Send size={15} /> Gửi Báo Giá
                    </button>
                  )}
                  {selectedPO.status === 'RFQ_SENT' && (
                    <button onClick={() => { alert('📧 Đã gửi nhắc nhở tới Nhà Cung Cấp. Vui lòng chờ NCC xác nhận báo giá trên Cổng NCC.'); }} className="btn btn-secondary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', borderColor: '#d97706', color: '#b45309' }}>
                      <Send size={15} /> Nhắc NCC Báo Giá
                    </button>
                  )}
                  {selectedPO.status === 'QUOTED' && (isCEO || isAdmin) && (
                    <button onClick={() => handleUpdateStatus(selectedPO.id, 'PO')} className="btn btn-success shadow-glow" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', backgroundColor: '#22c55e', border: 'none' }}>
                      <Check size={15} /> CEO Duyệt Báo Giá & Tạo PO
                    </button>
                  )}
                  {selectedPO.status === 'QUOTED' && !isCEO && !isAdmin && (
                    <span style={{ fontSize: '0.8rem', color: '#b45309', fontStyle: 'italic', padding: '0.4rem 0.8rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      🔒 Đang chờ Ban Giám Đốc (CEO) duyệt báo giá
                    </span>
                  )}
                  {['PO', 'DONE'].includes(selectedPO.status) && (isCEO || isAccountant || isAdmin) && (
                    <button onClick={() => handleCreateBill(selectedPO.id)} className="btn btn-primary shadow-glow" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem' }}>
                      <CreditCard size={15} /> Tạo Hóa Đơn
                    </button>
                  )}
                  {['PO', 'DONE'].includes(selectedPO.status) && (
                    <button className="btn btn-secondary" disabled style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', opacity: 0.4 }}>
                      Khóa
                    </button>
                  )}
                  {['RFQ', 'RFQ_SENT', 'QUOTED'].includes(selectedPO.status) && (
                    <button onClick={() => handleUpdateStatus(selectedPO.id, 'CANCELLED')} className="btn btn-secondary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem' }}>
                      <X size={15} /> Hủy Bỏ
                    </button>
                  )}
                </div>

                {/* Right: Pipeline Stepper + Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Pipeline Stepper (7 Steps matching Warehouse GRN Stepper) */}
                  {(() => {
                    const pipelineSteps = [
                      { key: 'RFQ', label: '1. YCBG (RFQ)' },
                      { key: 'RFQ_SENT', label: '2. Đã Gửi YCBG' },
                      { key: 'QUOTED', label: '3. Đã Báo Giá' },
                      { key: 'PO', label: '4. Đơn PO' },
                      { key: 'QC', label: '5. Kiểm Định QC' },
                      { key: 'READY', label: '6. Chờ Nhập Kho' },
                      { key: 'DONE', label: '7. Đã Nhập Kho' }
                    ];

                    const stepsList = ['RFQ', 'RFQ_SENT', 'QUOTED', 'PO', 'QC', 'READY', 'DONE'];

                    let qaLog = null;
                    try {
                      const qaLogs = JSON.parse(localStorage.getItem('erp_qa_inspection_logs') || '[]');
                      const poNum = selectedPO.poNumber || selectedPO.id;
                      qaLog = qaLogs.find(l => l.poNumber === poNum || String(l.poNumber) === String(selectedPO.id));
                    } catch (e) {}

                    const poStatus = qaLog?.status || selectedPO.status;
                    let currentKey = 'PO';

                    if (['RECEIVED', 'DONE', 'COMPLETED'].includes(poStatus) || selectedPO.warehouseStatus === 'RECEIVED') {
                      currentKey = 'DONE';
                    } else if (['QA_PASSED', 'QA_PARTIAL'].includes(poStatus)) {
                      currentKey = 'READY';
                    } else if (['PENDING_QA', 'QA_REJECTED', 'SHIPPED', 'DELIVERED'].includes(poStatus) || qaLog) {
                      currentKey = 'QC';
                    } else if (['RFQ', 'RFQ_SENT', 'QUOTED', 'PO', 'CONFIRMED_BY_SUPPLIER', 'APPROVED'].includes(poStatus)) {
                      if (['CONFIRMED_BY_SUPPLIER', 'APPROVED', 'PO'].includes(poStatus)) currentKey = 'PO';
                      else currentKey = poStatus;
                    }

                    const currentIdx = stepsList.indexOf(currentKey);

                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        gap: '0.25rem',
                        backgroundColor: '#ffffff',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 6px rgba(15,23,42,0.03)'
                      }}>
                        {pipelineSteps.map((step, idx, arr) => {
                          const isActive = idx === currentIdx;
                          const isPassed = idx < currentIdx && selectedPO.status !== 'CANCELLED';

                          let activeBg = '#2563eb';
                          let activeShadow = '0 0 10px rgba(37, 99, 235, 0.4)';
                          if (step.key === 'DONE') {
                            activeBg = '#16a34a';
                            activeShadow = '0 0 10px rgba(22, 163, 74, 0.4)';
                          } else if (step.key === 'READY') {
                            activeBg = '#0284c7';
                            activeShadow = '0 0 10px rgba(2, 132, 199, 0.4)';
                          } else if (step.key === 'QC') {
                            activeBg = '#d97706';
                            activeShadow = '0 0 10px rgba(217, 119, 6, 0.4)';
                          }

                          return (
                            <React.Fragment key={step.key}>
                              <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                                padding: '0.35rem 0.55rem',
                                fontSize: '0.73rem', fontWeight: isActive ? 800 : (isPassed ? 700 : 500),
                                background: isActive ? activeBg : (isPassed ? '#eff6ff' : '#f8fafc'),
                                color: isActive ? '#ffffff' : (isPassed ? '#1d4ed8' : '#94a3b8'),
                                borderRadius: '16px',
                                border: isActive ? `1.5px solid ${activeBg}` : (isPassed ? '1px solid #bfdbfe' : '1px solid #e2e8f0'),
                                boxShadow: isActive ? activeShadow : 'none',
                                transition: 'all 0.25s ease',
                                whiteSpace: 'nowrap'
                              }}>
                                {isPassed && <Check size={12} style={{ flexShrink: 0 }} />}
                                {step.label}
                              </div>
                              {idx < arr.length - 1 && (
                                <div style={{
                                  width: '12px', height: '2px',
                                  background: isPassed ? '#93c5fd' : '#e2e8f0',
                                  borderRadius: '1px', flexShrink: 0
                                }} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Close Button */}
                  <button onClick={() => setSelectedPO(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.45rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 2rem', gap: '1rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div className="smart-button" onClick={() => setViewMode('PO')} style={{ border: viewMode === 'PO' ? '1px solid var(--primary)' : '1px solid #cbd5e1', backgroundColor: viewMode === 'PO' ? '#eff6ff' : '#f8fafc' }}>
                <ShoppingCart size={20} color="#2563eb" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(() => {
                    const itemsCount = selectedPO.items?.length || 0;
                    const totalQty = selectedPO.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || 0;
                    return (
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                        {totalQty} sản phẩm {itemsCount > 1 ? `(${itemsCount} loại)` : ''}
                      </strong>
                    );
                  })()}
                </div>
              </div>
              {selectedPO.receipts && selectedPO.receipts.length > 0 && (
                <div className="smart-button" onClick={() => setViewMode('RECEIPT')} style={{ border: viewMode === 'RECEIPT' ? '1px solid var(--primary)' : '1px solid #cbd5e1', backgroundColor: viewMode === 'RECEIPT' ? '#f0fdf4' : '#f8fafc' }}>
                  <Truck size={20} color="#16a34a" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nhận Hàng</span>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{selectedPO.receipts.length} Phiếu</strong>
                  </div>
                </div>
              )}
              {selectedPO.bills && selectedPO.bills.length > 0 && (
                <div className="smart-button" onClick={() => setViewMode('BILL')} style={{ border: viewMode === 'BILL' ? '1px solid var(--primary)' : '1px solid #cbd5e1', backgroundColor: viewMode === 'BILL' ? '#fef3c7' : '#f8fafc' }}>
                  <FileText size={20} color="#d97706" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hóa Đơn Vendor</span>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{selectedPO.bills.length} Hóa đơn</strong>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', backgroundColor: '#ffffff' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#0f172a' }}>{selectedPO.poNumber}</h2>
                
                {/* Form Info Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Nhà Cung Cấp</label>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>{selectedPO.supplier?.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>Mã: {selectedPO.supplierCode}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Ngày Dự Kiến Giao</label>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>{formatDate(selectedPO.expectedDeliveryDate)}</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Tabs Content */}
              {viewMode === 'PO' && (
                <div className="table-container" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ textAlign: 'left', padding: '1rem', color: '#475569' }}>Mã SP</th>
                        <th style={{ textAlign: 'left', padding: '1rem', color: '#475569' }}>Sản Phẩm</th>
                        <th style={{ textAlign: 'center', padding: '1rem', color: '#475569' }}>Số Lượng</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#475569' }}>Đơn Giá</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#475569' }}>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items?.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ textAlign: 'left', padding: '1rem', color: '#64748b' }}>{item.product?.productId || item.productId}</td>
                          <td style={{ fontWeight: 600, textAlign: 'left', padding: '1rem', color: '#0f172a' }}>{item.product?.name}</td>
                          <td style={{ textAlign: 'center', padding: '1rem', color: '#0f172a', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', padding: '1rem', color: '#475569' }}>
                            {['RFQ', 'RFQ_SENT'].includes(selectedPO.status) && (!item.unitCost || Number(item.unitCost) === 0)
                              ? <span style={{ color: '#d97706', fontStyle: 'italic' }}>Chờ báo giá</span>
                              : formatCurrency(item.unitCost)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)', padding: '1rem' }}>
                            {['RFQ', 'RFQ_SENT'].includes(selectedPO.status) && (!item.totalCost || Number(item.totalCost) === 0)
                              ? <span style={{ color: '#d97706', fontStyle: 'italic' }}>Chờ báo giá</span>
                              : formatCurrency(item.totalCost)}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 800, padding: '1rem', color: '#0f172a' }}>TỔNG CỘNG:</td>
                        <td style={{ textAlign: 'right', fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', padding: '1rem' }}>
                          {['RFQ', 'RFQ_SENT'].includes(selectedPO.status) && (!selectedPO.totalAmount || Number(selectedPO.totalAmount) === 0)
                            ? <span style={{ color: '#d97706', fontStyle: 'italic', fontSize: '1rem' }}>Chờ NCC báo giá</span>
                            : formatCurrency(selectedPO.totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {viewMode === 'RECEIPT' && selectedPO.receipts?.map(rc => (
                <div key={rc.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--success)' }}>{rc.receiptNumber || `Phiếu Nhận #${rc.id}`}</h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Trạng thái: <span style={{ color: rc.status === 'DONE' ? 'var(--success)' : '#d97706', fontWeight: 600 }}>{rc.status}</span></p>
                    </div>
                    {rc.status === 'READY' && (
                      <button onClick={() => handleValidateReceipt(rc.id)} className="btn btn-success" disabled={submitting}>Xác nhận Nhập Kho</button>
                    )}
                  </div>
                </div>
              ))}

              {viewMode === 'BILL' && selectedPO.bills?.map(bill => (
                <div key={bill.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#d97706' }}>Hóa đơn: {bill.billNumber}</h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Trạng thái: <span style={{ color: bill.status === 'PAID' ? 'var(--success)' : 'var(--primary)', fontWeight: 600 }}>{bill.status}</span></p>
                    </div>
                    {bill.status !== 'PAID' && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="number" id={`pay_amt_${bill.id}`} defaultValue={bill.amountDue} className="form-input" style={{ width: '150px', backgroundColor: '#ffffff', color: '#0f172a' }} />
                        <button onClick={() => {
                          const amt = document.getElementById(`pay_amt_${bill.id}`).value;
                          handleRegisterPayment(bill.id, amt);
                        }} className="btn btn-primary" disabled={submitting}>Thanh toán</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div><span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng Tiền:</span> <br/><strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{formatCurrency(bill.amountTotal)}</strong></div>
                    <div><span style={{ fontSize: '0.8rem', color: '#64748b' }}>Đã Trả:</span> <br/><strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>{formatCurrency(bill.amountPaid)}</strong></div>
                    <div><span style={{ fontSize: '0.8rem', color: '#64748b' }}>Còn Nợ:</span> <br/><strong style={{ fontSize: '1.1rem', color: 'var(--danger)' }}>{formatCurrency(bill.amountDue)}</strong></div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL SO SÁNH BÁO GIÁ 3 NHÀ CUNG CẤP (PRICE MATRIX) ================= */}
      {showCompareModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050, padding: '1.5rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '1200px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #cbd5e1', boxShadow: '0 30px 60px rgba(0,0,0,0.15)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <div style={{ padding: '0.6rem', backgroundColor: '#eff6ff', borderRadius: '12px', color: '#2563eb', display: 'flex', alignItems: 'center' }}>
                    <BarChart2 size={24} />
                  </div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Ma Trận So Sánh Báo Giá Nhà Cung Cấp
                  </h2>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                  Đối sánh đơn giá, thời gian giao hàng và tự động đề xuất phương án mua hàng tối ưu chi phí nhất.
                </p>
              </div>

              <button onClick={() => setShowCompareModal(false)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>

            {/* ---- Group-based RFQ Comparison ---- */}
            {(() => {
              // Use the selected group, or default to first group
              const activeGroup = rfqGroups.find(g => g.key === selectedGroupKey) || rfqGroups[0];
              const displayPos = activeGroup ? activeGroup.list : [];

              return (
                <div>
                  {/* Group Selector Panel */}
                  <div style={{
                    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <BarChart2 size={15} style={{ color: '#2563eb' }} />
                        Chọn nhóm YCBG để so sánh
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Mỗi nhóm gồm các đơn gửi tới nhiều NCC với <strong>cùng sản phẩm</strong>
                      </span>
                    </div>
                    {rfqGroups.length === 0 ? (
                      <p style={{ color: '#f59e0b', fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                        ⚠️ Chưa có nhóm YCBG nào đủ điều kiện so sánh (cần ít nhất 2 NCC cùng sản phẩm trong trạng thái RFQ/Đã Báo Giá).
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                        {rfqGroups.map((grp, gIdx) => {
                          const isActive = grp.key === (activeGroup?.key);
                          const firstPo = grp.list[0];
                          const productNames = (firstPo?.items || [])
                            .map(it => it.product?.name || it.productName || it.name || '')
                            .filter(Boolean)
                            .slice(0, 2)
                            .join(', ');
                          return (
                            <button
                              key={grp.key}
                              onClick={() => setSelectedGroupKey(grp.key)}
                              style={{
                                padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 600,
                                borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s',
                                backgroundColor: isActive ? '#2563eb' : '#ffffff',
                                color: isActive ? '#ffffff' : '#334155',
                                border: isActive ? '2px solid #1d4ed8' : '1.5px solid #cbd5e1',
                                boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                textAlign: 'left'
                              }}
                            >
                              {isActive && <Check size={12} />}
                              <span>
                                <span style={{ fontWeight: 800 }}>Nhóm {gIdx + 1}</span>
                                <span style={{ opacity: 0.8, marginLeft: '0.3rem' }}>({grp.list.length} NCC)</span>
                                {productNames && (
                                  <span style={{ display: 'block', fontSize: '0.72rem', opacity: 0.75, marginTop: '1px' }}>
                                    {productNames}{firstPo?.items?.length > 2 ? ` +${firstPo.items.length - 2}` : ''}
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {activeGroup && (
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                          <strong style={{ color: '#0f172a' }}>Sản phẩm trong nhóm này:</strong>{' '}
                          {(activeGroup.list[0]?.items || []).map(it => it.product?.name || it.productName || it.name).filter(Boolean).join(' • ') || '—'}
                        </div>
                        {activeGroup.list.some(p => p.status === 'RFQ') && (
                          <button
                            onClick={() => handleBulkSendGroup(activeGroup.list)}
                            disabled={submitting}
                            style={{
                              backgroundColor: '#d97706', color: '#fff', border: 'none',
                              borderRadius: '9px', padding: '0.45rem 1rem', fontWeight: 700,
                              fontSize: '0.82rem', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              boxShadow: '0 2px 8px rgba(217,119,6,0.25)'
                            }}
                          >
                            <Send size={14} />
                            Gửi Báo Giá Tới {activeGroup.list.filter(p => p.status === 'RFQ').length} NCC Ngay
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {displayPos.length < 2 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                      <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Chưa có nhóm YCBG nào đủ để so sánh.</p>
                      <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Tạo YCBG gửi đồng thời nhiều NCC với cùng sản phẩm để hệ thống tự động nhóm và so sánh.</p>
                      <button onClick={() => { setShowCompareModal(false); setShowCreateModal(true); }} className="btn btn-primary" style={{ marginTop: '0.5rem', borderRadius: '10px' }}>
                        <Plus size={16} /> Tạo YCBG Mới
                      </button>
                    </div>
                  ) : (() => {
                    // Compute savings
                    const totals = displayPos.map(p => parseFloat(p.totalAmount || 0));
                    const minTotal = Math.min(...totals.filter(t => t > 0));
                    const maxTotal = Math.max(...totals.filter(t => t > 0));
                    const savingsAmount = (maxTotal > minTotal && minTotal > 0) ? (maxTotal - minTotal) : 0;
                    const savingsPercent = maxTotal > 0 ? ((savingsAmount / maxTotal) * 100).toFixed(1) : 0;

                    return (
                      <div>
                        {/* Savings Analysis Banner */}
                        {savingsAmount > 0 && (
                          <div style={{
                            backgroundColor: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '16px',
                            padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              <div style={{ padding: '0.6rem', backgroundColor: '#10b981', borderRadius: '12px', color: '#fff', display: 'flex' }}>
                                <TrendingDown size={22} />
                              </div>
                              <div>
                                <strong style={{ fontSize: '0.95rem', color: '#065f46', display: 'block' }}>
                                  💡 Phân Tích Tiết Kiệm Chi Phí Tối Đa
                                </strong>
                                <span style={{ fontSize: '0.82rem', color: '#047857' }}>
                                  Chọn phương án báo giá rẻ nhất giúp doanh nghiệp tiết kiệm{' '}
                                  <strong style={{ color: '#059669', fontSize: '0.95rem' }}>{formatCurrency(savingsAmount)} ({savingsPercent}%)</strong> so với báo giá cao nhất!
                                </span>
                              </div>
                            </div>
                            <div style={{ backgroundColor: '#ffffff', padding: '0.4rem 0.85rem', borderRadius: '10px', border: '1px solid #6ee7b7', fontSize: '0.82rem', fontWeight: 700, color: '#047857' }}>
                              🎯 Tiết kiệm: {formatCurrency(savingsAmount)}
                            </div>
                          </div>
                        )}

                        {/* Comparison Cards Matrix */}
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`, gap: '1.25rem', marginBottom: '2rem', alignItems: 'stretch' }}>
                          {displayPos.map((po, idx) => {
                            const poTotal = parseFloat(po.totalAmount || 0);
                            const isLowest = poTotal > 0 && poTotal === minTotal && totals.filter(t => t === minTotal).length === 1;

                            return (
                              <div
                                key={po.id}
                                style={{
                                  borderRadius: '18px', padding: '1.5rem',
                                  backgroundColor: isLowest ? '#f0fdf4' : '#ffffff',
                                  border: isLowest ? '2.5px solid #22c55e' : '1px solid #cbd5e1',
                                  boxShadow: isLowest ? '0 10px 25px rgba(34, 197, 94, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                                  position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                }}
                              >
                                {isLowest && (
                                  <div style={{
                                    position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                                    backgroundColor: '#16a34a', color: '#ffffff',
                                    padding: '0.3rem 0.95rem', borderRadius: '20px',
                                    fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.03em', whiteSpace: 'nowrap',
                                    display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 4px 12px rgba(22,163,74,0.3)', zIndex: 10
                                  }}>
                                    <Award size={14} /> ★ BÁO GIÁ RẺ NHẤT
                                  </div>
                                )}

                                <div>
                                  <div style={{ marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.85rem' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: isLowest ? '#16a34a' : '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>
                                      Nhà Cung Cấp #{idx + 1}
                                    </span>
                                    <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center' }}>
                                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                                        {po.supplier?.name || po.supplierCode}
                                      </h3>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#475569', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                      <span>Mã: <strong style={{ color: '#0f172a' }}>{po.poNumber}</strong></span>
                                      <span>•</span>
                                      <span className={`badge ${getStatusBadge(po.status)}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.68rem', borderRadius: '6px' }}>
                                        {getStatusText(po.status)}
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '0.83rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', minHeight: '54px', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>Dự kiến nhận hàng:</span>
                                      <strong>{formatDate(po.expectedDeliveryDate)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>Số mặt hàng:</span>
                                      <strong>{po.items?.length || 1} sản phẩm</strong>
                                    </div>
                                  </div>

                                  <div style={{
                                    padding: '0.85rem 1rem', borderRadius: '14px',
                                    backgroundColor: isLowest ? '#dcfce7' : '#f8fafc',
                                    border: isLowest ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                                    textAlign: 'center', marginBottom: '1.5rem',
                                    minHeight: '82px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                                  }}>
                                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TỔNG CHI PHÍ BÁO GIÁ:</span>
                                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: isLowest ? '#15803d' : '#2563eb', marginTop: '0.15rem' }}>
                                      {formatCurrency(poTotal)}
                                    </div>
                                  </div>
                                </div>

                                {(isCEO || isAdmin) ? (
                                  <button
                                    onClick={() => handleSelectOptimalSupplier(po, displayPos)}
                                    disabled={submitting}
                                    className={`btn ${isLowest ? 'btn-success shadow-glow' : 'btn-primary'}`}
                                    style={{
                                      width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                                      fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                      backgroundColor: isLowest ? '#16a34a' : '#2563eb', color: '#ffffff',
                                      border: 'none', cursor: 'pointer', marginTop: 'auto'
                                    }}
                                  >
                                    <Check size={16} />
                                    {isLowest ? 'Chọn Báo Giá Rẻ Nhất & Tạo PO' : 'Duyệt Chọn Báo Giá Này'}
                                  </button>
                                ) : (
                                  <div style={{
                                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px',
                                    backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1',
                                    fontSize: '0.78rem', fontWeight: 600, textAlign: 'center', marginTop: 'auto'
                                  }}>
                                    🔒 Chỉ CEO/Admin mới có quyền duyệt báo giá
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Line-by-Line Item Breakdown Table */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} style={{ color: '#2563eb' }} /> Bảng Chi Tiết Đơn Giá Sản Phẩm Theo Nhà Cung Cấp
                          </h4>
                          <div className="table-container" style={{ borderRadius: '10px', overflow: 'hidden' }}>
                            <table className="erp-table">
                              <thead>
                                <tr style={{ background: '#ffffff' }}>
                                  <th style={{ textAlign: 'left' }}>Sản Phẩm Linh Kiện</th>
                                  <th style={{ textAlign: 'center' }}>Số Lượng</th>
                                  {displayPos.map((po, i) => (
                                    <th key={po.id} style={{ textAlign: 'right' }}>
                                      {po.supplier?.name || `NCC #${i+1}`}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(displayPos[0]?.items || []).map((item, idx) => (
                                  <tr key={idx} style={{ backgroundColor: '#ffffff' }}>
                                    <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                                      {item.product?.name || item.productName || item.name || 'Linh kiện PC'}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                                      {item.quantity}
                                    </td>
                                    {displayPos.map((po) => {
                                      const matchedItem = (po.items || []).find(it => String(it.productId) === String(item.productId)) || po.items?.[idx] || item;
                                      return (
                                        <td key={po.id} style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                                          {formatCurrency(matchedItem.unitCost || item.unitCost || 0)}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* Styles for Smart Button */}
      <style>{`
        .smart-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          cursor: pointer;
          transition: all 0.2s;
        }
        .smart-button:hover {
          background: rgba(255,255,255,0.08);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
