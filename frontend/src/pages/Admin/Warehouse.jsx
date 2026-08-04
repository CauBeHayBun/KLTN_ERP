import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ActorNotificationBar from '../../components/ActorNotificationBar';
import { 
  Database, PlusCircle, AlertOctagon, TrendingDown, ArrowDownLeft, 
  Edit2, Check, MapPin, BarChart2, DollarSign, ListFilter, ShieldAlert,
  Search, Truck, Package, X, Eye, ClipboardCheck, ArrowRight, RefreshCw,
  Calendar, ChevronRight, CheckCircle2, Clock, FileText, Zap
} from 'lucide-react';

const STANDARD_SUPPLIERS = [
  'Intel Vietnam',
  'Mai Hoàng Distribution',
  'Vĩnh Xuân PSC',
  'Viễn Sơn Distribution',
  'Thủy Linh Distribution',
  'ASUS Vietnam',
  'MSI Vietnam',
  'Gigabyte Vietnam',
  'Corsair Vietnam',
  'Kingston Vietnam',
  'Western Digital Vietnam',
  'Samsung Vina',
  'Khác / Nhập nội bộ'
];

const PREDEFINED_LOCATIONS = [
  'ZONE-A/SHELF-01/BIN-01',
  'ZONE-A/SHELF-01/BIN-02',
  'ZONE-B/SHELF-01/BIN-01',
  'ZONE-C/SHELF-02/BIN-01',
  'ZONE-D/SHELF-03/BIN-01'
];

export default function Warehouse() {
  const navigate = useNavigate();
  const { 
    inventory, processGRN, purchaseOrders, serialNumbers, 
    updateThreshold, updateLocation, ledger, orders = [], assemblyJobs = [],
    deliverOrder, updateOrderStatus, addProduct, updateProduct, deleteProduct,
    sendSystemNotification
  } = useERP();
  const { user } = useAuth();
  
  const isManager = ['WAREHOUSE_MANAGER', 'CEO', 'ADMIN'].includes(user?.role);

  // ──── Backend API State ────
  const [receipts, setReceipts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Receipt Detail Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // GRN filter
  const [receiptStatusFilter, setReceiptStatusFilter] = useState('ALL');
  const [receiptSearch, setReceiptSearch] = useState('');

  // New Product Modal State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdForm, setNewProdForm] = useState({ name: '', category: 'CPU', stock: '', price: '', supplier: 'Intel Vietnam', threshold: '5', location: 'ZONE-A/SHELF-01/BIN-01' });

  // Edit Product Modal State
  const [editingProd, setEditingProd] = useState(null);

  // Edit State
  const [editingThresholdId, setEditingThresholdId] = useState(null);
  const [tempThreshold, setTempThreshold] = useState('');
  
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [tempLocation, setTempLocation] = useState('');

  // Tab State for Warehouse Staff
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'grn', 'delivery', 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedLocationStatus, setSelectedLocationStatus] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('PENDING'); // 'PENDING', 'SHIPPED', 'DELIVERED', 'ALL'
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL'); // 'ALL', 'IN', 'OUT'

  // Direct (Manual) Intake States
  const [directProduct, setDirectProduct] = useState('');
  const [directQty, setDirectQty] = useState('');
  const [directSupplier, setDirectSupplier] = useState('');
  const [directPrice, setDirectPrice] = useState('');
  const [directReason, setDirectReason] = useState('DIRECT_PURCHASE');
  const [directRef, setDirectRef] = useState('');
  const [directLocation, setDirectLocation] = useState('');
  const [directNote, setDirectNote] = useState('');

  // Autosuggest Product Selector States
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // ──── Fetch receipts from backend ────
  const fetchReceipts = async () => {
    setReceiptsLoading(true);
    setReceiptsError(null);
    try {
      const [receiptsRes, movementsRes] = await Promise.all([
        api.get('/warehouse/receipts'),
        api.get('/warehouse/stock-movements?limit=20')
      ]);
      if (receiptsRes?.success) setReceipts(receiptsRes.data || []);
      if (movementsRes?.success) setStockMovements(movementsRes.data || []);
    } catch (err) {
      console.warn('Warehouse API error:', err.message);
      setReceiptsError('Lỗi kết nối tới server Warehouse.');
    }
    setReceiptsLoading(false);
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  // Refetch when switching to GRN tab
  useEffect(() => {
    if (activeTab === 'grn') {
      fetchReceipts();
    }
  }, [activeTab]);

  const isItemDiscontinued = (item) => {
    return item.available === false || item.isAvailable === false || item.status === 'DISCONTINUED' || item.status === 'INACTIVE' || item.available === 'false';
  };

  const CATEGORY_MAP_VI = {
    CPU: 'Bộ Vi Xử Lý (CPU)',
    VGA: 'Card Màn Hình (VGA)',
    MAINBOARD: 'Bo Mạch Chủ (Mainboard)',
    RAM: 'Bộ Nhớ Trong (RAM)',
    STORAGE: 'Ổ Cứng / Thẻ Nhớ (Storage)',
    CASE: 'Vỏ Máy Tính (Case)',
    PSU: 'Nguồn Máy Tính (PSU)',
    COOLER: 'Tản Nhiệt (Cooler)',
    MONITOR: 'Màn Hình (Monitor)',
    KEYBOARD: 'Bàn Phím (Keyboard)',
    MOUSE: 'Chuột Máy Tính (Mouse)',
    HEADPHONE: 'Tai Nghe (Headphone)',
    SPEAKER: 'Loa Máy Tính (Speaker)',
    ACCESSORY: 'Phụ Kiện (Accessory)',
    GEAR: 'Gaming Gear'
  };

  const getCategoryNameVi = (cat) => {
    if (!cat) return 'Khác';
    const key = String(cat).toUpperCase();
    return CATEGORY_MAP_VI[key] || cat;
  };

  const getStockStatusKey = (item) => {
    if (isItemDiscontinued(item)) return 'DISCONTINUED';
    const stock = Number(item.stock || 0);
    const threshold = Number(item.threshold || 0);
    if (stock === 0) return 'OUT_OF_STOCK';
    if (stock <= threshold) return 'WARNING';
    return 'SAFE';
  };

  const getStockStatus = (item) => {
    const key = getStockStatusKey(item);
    const badgeStyle = { whiteSpace: 'nowrap', fontSize: '0.73rem', padding: '0.25rem 0.55rem', borderRadius: '6px', fontWeight: 600, display: 'inline-block' };
    
    if (key === 'DISCONTINUED') return <span className="badge badge-danger" style={{ ...badgeStyle, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Ngừng kinh doanh</span>;
    if (key === 'OUT_OF_STOCK') return <span className="badge badge-danger" style={{ ...badgeStyle, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Hết Hàng</span>;
    if (key === 'WARNING') return <span className="badge badge-warning" style={{ ...badgeStyle, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>Cảnh Báo Tồn</span>;
    return <span className="badge badge-success" style={{ ...badgeStyle, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>An Toàn</span>;
  };

  const categoriesList = ['ALL', ...new Set(inventory.map(item => item.category))];

  const dynamicSuppliersList = Array.from(
    new Set([
      ...inventory.map(item => item.supplier || item.brand).filter(Boolean),
      ...STANDARD_SUPPLIERS
    ])
  ).sort((a, b) => a.localeCompare(b, 'vi'));

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || getStockStatusKey(item) === selectedStatus;

    let matchesLocation = true;
    if (selectedLocationStatus === 'UNASSIGNED') {
      matchesLocation = !item.location || item.location === 'Chưa xếp kệ' || item.location.trim() === '';
    } else if (selectedLocationStatus === 'ASSIGNED') {
      matchesLocation = item.location && item.location !== 'Chưa xếp kệ' && item.location.trim() !== '';
    }

    const itemSupplier = item.supplier || item.brand || 'Khác';
    const matchesSupplier = selectedSupplier === 'ALL' || 
      itemSupplier.toLowerCase() === selectedSupplier.toLowerCase() ||
      itemSupplier.toLowerCase().includes(selectedSupplier.toLowerCase()) || 
      (selectedSupplier === 'Khác / Nhập nội bộ' && itemSupplier === 'Khác');

    return matchesSearch && matchesCategory && matchesStatus && matchesLocation && matchesSupplier;
  });

  const lowStockItems = inventory.filter(item => getStockStatusKey(item) === 'WARNING');
  const outOfStockItems = inventory.filter(item => getStockStatusKey(item) === 'OUT_OF_STOCK');
  const readyReceipts = receipts.filter(r => r.status === 'READY');
  const doneReceipts = receipts.filter(r => r.status === 'DONE');

  // Filtered receipts for display
  const filteredReceipts = receipts.filter(r => {
    const matchesStatus = receiptStatusFilter === 'ALL' || r.status === receiptStatusFilter;
    const matchesSearch = !receiptSearch.trim() || 
      (r.receiptNumber || '').toLowerCase().includes(receiptSearch.toLowerCase()) ||
      (r.po?.poNumber || '').toLowerCase().includes(receiptSearch.toLowerCase()) ||
      (r.po?.supplier?.name || '').toLowerCase().includes(receiptSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Chưa rõ';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
  };

  // ──── Validate Receipt (Backend API) ────
  const handleValidateReceipt = async (receiptId) => {
    if (!window.confirm('Bạn có chắc muốn xác nhận nhập kho cho phiếu này?')) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/warehouse/receipts/${receiptId}/validate`, {});
      if (res?.success) {
        alert('✅ Xác nhận nhập kho thành công! Tồn kho đã được cập nhật.');
        await fetchReceipts();
        // Update the selected receipt if viewing detail
        if (selectedReceipt && selectedReceipt.id === receiptId) {
          const detailRes = await api.get(`/warehouse/receipts/${receiptId}`);
          if (detailRes?.success) setSelectedReceipt(detailRes.data);
        }
      }
    } catch (err) {
      alert('Lỗi xác nhận nhập kho: ' + err.message);
    }
    setSubmitting(false);
  };

  // Direct Intake Handler
  const handleDirectGRNSubmit = (e) => {
    e.preventDefault();
    if (!directProduct || !directQty || !directSupplier) {
      alert('Vui lòng chọn linh kiện hợp lệ từ danh sách gợi ý!');
      return;
    }
    
    const prodId = parseInt(directProduct);
    const qty = parseInt(directQty);
    const unitPrice = directPrice ? parseInt(directPrice) : null;
    const reasonText = {
      'DIRECT_PURCHASE': 'Nhập mua trực tiếp',
      'AUDIT_ADJUSTMENT': 'Điều chỉnh kiểm kê',
      'WARRANTY_RETURN': 'Khách trả bảo hành',
      'OTHER': 'Nhập khác'
    }[directReason];
    
    processGRN(prodId, qty, directSupplier, unitPrice, null);
    
    if (directLocation) {
      updateLocation(prodId, directLocation);
    }
    
    setDirectProduct('');
    setProductSearch('');
    setDirectQty('');
    setDirectSupplier('');
    setDirectPrice('');
    setDirectReason('DIRECT_PURCHASE');
    setDirectRef('');
    setDirectLocation('');
    setDirectNote('');
    alert(`Đã thực hiện nhập kho trực tiếp thành công! Lý do: ${reasonText}.`);
  };

  // ──── Render: Inventory Table ────
  const renderInventoryTable = () => {
    return (
      <div className="card-glass" style={{ padding: '1.5rem', width: '100%' }}>
        {/* Header Title & Primary Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '10px', color: '#2563eb', display: 'flex', alignItems: 'center' }}>
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                Danh Sách Tồn Kho Thực Tế
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Hiển thị {filteredInventory.length.toLocaleString('vi-VN')} / {inventory.length.toLocaleString('vi-VN')} linh kiện trong hệ thống
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowAddProduct(true)}
            className="btn btn-primary shadow-glow"
            style={{ height: '38px', fontSize: '0.85rem', fontWeight: 700, padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#2563eb', borderRadius: '10px', border: 'none' }}
          >
            <PlusCircle size={16} /> Thêm Linh Kiện Mới
          </button>
        </div>

        {/* Filter Toolbar Grid Container */}
        <div style={{
          backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '0.85rem 1rem', marginBottom: '1.25rem',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center'
        }}>
          {/* Search Box (Takes double width if space permits) */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Tìm theo tên linh kiện, S/N..." 
              style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.82rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter 1: Category */}
          <select
            className="input-field"
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 0.6rem', backgroundColor: selectedCategory !== 'ALL' ? '#eff6ff' : '#ffffff', border: selectedCategory !== 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontWeight: selectedCategory !== 'ALL' ? 700 : 500 }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">📁 Phân nhóm (Tất cả)</option>
            {categoriesList.map(cat => cat !== 'ALL' && (
              <option key={cat} value={cat}>{getCategoryNameVi(cat)} ({inventory.filter(i => i.category === cat).length})</option>
            ))}
          </select>

          {/* Filter 2: Status */}
          <select
            className="input-field"
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 0.6rem', backgroundColor: selectedStatus !== 'ALL' ? '#fef3c7' : '#ffffff', border: selectedStatus !== 'ALL' ? '1px solid #d97706' : '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontWeight: selectedStatus !== 'ALL' ? 700 : 500 }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">⚡ Trạng thái (Tất cả)</option>
            <option value="SAFE">An toàn ({inventory.filter(i => getStockStatusKey(i) === 'SAFE').length})</option>
            <option value="WARNING">Cảnh báo tồn ({lowStockItems.length})</option>
            <option value="OUT_OF_STOCK">Hết hàng cần nhập ({outOfStockItems.length})</option>
          </select>

          {/* Filter 3: Shelf Location */}
          <select
            className="input-field"
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 0.6rem', backgroundColor: selectedLocationStatus !== 'ALL' ? '#eff6ff' : '#ffffff', border: selectedLocationStatus !== 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontWeight: selectedLocationStatus !== 'ALL' ? 700 : 500 }}
            value={selectedLocationStatus}
            onChange={(e) => setSelectedLocationStatus(e.target.value)}
          >
            <option value="ALL">📍 Kệ kho (Tất cả)</option>
            <option value="UNASSIGNED">Chưa xếp kệ</option>
            <option value="ASSIGNED">Đã xếp kệ</option>
          </select>

          {/* Filter 4: Supplier */}
          <select
            className="input-field"
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 0.6rem', backgroundColor: selectedSupplier !== 'ALL' ? '#eff6ff' : '#ffffff', border: selectedSupplier !== 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontWeight: selectedSupplier !== 'ALL' ? 700 : 500 }}
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
          >
            <option value="ALL">🏢 Nhà cung cấp (Tất cả)</option>
            {dynamicSuppliersList.map(sup => {
              const count = inventory.filter(i => (i.supplier || i.brand || 'Khác').toLowerCase() === sup.toLowerCase()).length;
              return (
                <option key={sup} value={sup}>{sup} {count > 0 ? `(${count})` : ''}</option>
              );
            })}
          </select>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="erp-table" style={{ width: '100%', minWidth: '980px' }}>
            <thead>
              <tr>
                <th style={{ width: '28%', padding: '0.625rem 0.5rem' }}>Tên Linh Kiện</th>
                <th style={{ width: '10%', padding: '0.625rem 0.5rem' }}>Phân Nhóm</th>
                <th style={{ width: '8%', padding: '0.625rem 0.5rem', textAlign: 'center' }}>Số Lượng Tồn</th>
                <th style={{ width: '14%', padding: '0.625rem 0.5rem' }}>Vị Trí Kệ</th>
                <th style={{ width: '12%', padding: '0.625rem 0.5rem' }}>Nhà Cung Cấp</th>
                <th style={{ width: '12%', padding: '0.625rem 0.5rem', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ width: '16%', padding: '0.625rem 0.5rem', textAlign: 'center' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Không tìm thấy linh kiện nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const itemSerials = (serialNumbers || []).filter(sn => sn.productId === item.id && sn.status === 'AVAILABLE');
                  const serialListStr = itemSerials.slice(0, 3).map(s => s.serial).join(', ') + (itemSerials.length > 3 ? '...' : '');
                  return (
                    <tr key={item.id}>
                      <td style={{ padding: '0.625rem 0.5rem', wordBreak: 'break-word', whiteSpace: 'normal', fontSize: '0.8rem' }}>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{item.name}</strong>
                        
                        {isManager ? (
                          editingThresholdId === item.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cảnh báo:</span>
                              <input 
                                type="number" 
                                className="form-input" 
                                style={{ width: '50px', padding: '0.125rem 0.25rem', fontSize: '0.75rem', height: '24px' }} 
                                value={tempThreshold}
                                onChange={(e) => setTempThreshold(e.target.value)}
                                autoFocus
                              />
                              <button 
                                onClick={() => {
                                  updateThreshold(item.id, tempThreshold);
                                  setEditingThresholdId(null);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '2px' }}
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              <span>Ngưỡng tối thiểu: {item.threshold}</span>
                              <button 
                                onClick={() => {
                                  setEditingThresholdId(item.id);
                                  setTempThreshold(item.threshold.toString());
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                                title="Thiết lập ngưỡng cảnh báo"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Ngưỡng tối thiểu: {item.threshold}
                          </div>
                        )}

                        {itemSerials.length > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                            S/N khả dụng: {serialListStr}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem', fontSize: '0.8rem' }}>{getCategoryNameVi(item.category)}</td>
                      <td style={{ padding: '0.625rem 0.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: Number(item.stock) <= Number(item.threshold) ? 'var(--warning)' : '#0f172a' }}>{item.stock}</td>
                      
                      <td style={{ padding: '0.625rem 0.5rem', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                        {!isManager ? (
                          editingLocationId === item.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <select 
                                className="form-input" 
                                style={{ width: '130px', padding: '0.125rem 0.25rem', fontSize: '0.75rem', height: '24px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }} 
                                value={tempLocation}
                                onChange={(e) => setTempLocation(e.target.value)}
                                autoFocus
                              >
                                <option value="">-- Chọn kệ --</option>
                                {PREDEFINED_LOCATIONS.map(loc => (
                                  <option key={loc} value={loc}>{loc}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => {
                                  updateLocation(item.id, tempLocation);
                                  setEditingLocationId(null);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '2px' }}
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <span style={{ fontSize: '0.8125rem', color: item.location ? '#0f172a' : 'var(--text-muted)', fontStyle: item.location ? 'normal' : 'italic' }}>
                                {item.location || 'Chưa xếp kệ'}
                              </span>
                              <button 
                                onClick={() => {
                                  setEditingLocationId(item.id);
                                  setTempLocation(item.location || '');
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                                title="Cập nhật vị trí kệ"
                              >
                                <MapPin size={12} />
                              </button>
                            </div>
                          )
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: item.location ? '#0f172a' : 'var(--text-muted)', fontStyle: item.location ? 'normal' : 'italic' }}>
                            {item.location || 'Chưa xếp kệ'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.625rem 0.5rem', wordBreak: 'break-word', whiteSpace: 'normal', fontSize: '0.8rem' }}>{item.supplier}</td>
                      <td style={{ padding: '0.625rem 0.5rem', fontSize: '0.8rem', textAlign: 'center' }}>{getStockStatus(item)}</td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          {Number(item.stock) <= Number(item.threshold) && (
                            <button
                              onClick={() => {
                                const recQty = Math.max((item.threshold || 5) * 2 - (item.stock || 0), 5);
                                if (sendSystemNotification) {
                                  sendSystemNotification({
                                    targetRoles: ['PURCHASING', 'CEO', 'ADMIN'],
                                    title: `⚡ Cảnh Báo Kho: ${item.name}`,
                                    message: `Kho báo linh kiện ${item.name} hiện còn ${item.stock} (Ngưỡng: ${item.threshold}). Đề nghị Mua hàng lập RFQ mua bổ sung ${recQty} cái.`,
                                    link: '/admin/purchasing',
                                    navState: { createRFQ: true, product: item },
                                    type: 'RFQ_ALERT',
                                    itemData: item
                                  });
                                }
                                alert(`🔔 ĐÃ GỬI CẢNH BÁO TỒN KHO TỚI BỘ PHẬN MUA HÀNG!\n\n• Linh kiện: ${item.name}\n• Tồn kho hiện tại: ${item.stock} (Ngưỡng an toàn: ${item.threshold})\n• Gợi ý số lượng bổ sung: ${recQty} sản phẩm.\n\nThông báo đã được ghi nhận trực tiếp vào Quả chuông Hệ thống của Bộ phận Mua Hàng & Ban Giám Đốc!`);
                              }}
                              className="btn btn-secondary shadow-glow"
                              style={{ padding: '4px 7px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}
                              title="Gửi Cảnh Báo Tồn Kho đến Bộ Phận Mua Hàng để lập Phiếu Báo Giá (RFQ)"
                            >
                              <Zap size={10} /> 🔔 Cảnh Báo RFQ
                            </button>
                          )}
                          <button
                            onClick={() => setEditingProd({ ...item })}
                            className="btn btn-secondary"
                            style={{ padding: '4px 6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                            title="Sửa sản phẩm"
                          >
                            <Edit2 size={10} /> Sửa
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc muốn xóa linh kiện "${item.name}" khỏi danh mục kho?`)) {
                                deleteProduct(item.id);
                              }
                            }}
                            className="btn"
                            style={{ padding: '4px 6px', fontSize: '0.68rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' }}
                            title="Xóa linh kiện"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ──── Render: GRN Tab (NEW - Backend Linked) ────
  const renderGRNTab = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
        {/* Receipts from Backend */}
        <div className="card-glass" style={{ padding: '1.5rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
                <ClipboardCheck size={20} style={{ color: '#34d399' }} />
                Phiếu Nhận Hàng (Goods Receipt)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                Danh sách phiếu nhận hàng từ Đơn Mua Hàng (PO). Xác nhận nhập kho để cập nhật tồn.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button onClick={fetchReceipts} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px' }}>
                <RefreshCw size={14} className={receiptsLoading ? 'animate-spin' : ''} /> Tải lại
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Tìm theo mã phiếu, mã PO, NCC..."
                style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.82rem' }}
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px' }}>
              {[
                { key: 'ALL', label: 'Tất cả', count: receipts.length },
                { key: 'READY', label: 'Chờ nhập kho', count: readyReceipts.length },
                { key: 'DONE', label: 'Đã nhập kho', count: doneReceipts.length }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setReceiptStatusFilter(f.key)}
                  style={{
                    padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 600,
                    backgroundColor: receiptStatusFilter === f.key ? 'var(--primary)' : 'transparent',
                    borderRadius: '8px', color: receiptStatusFilter === f.key ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span style={{
                      backgroundColor: receiptStatusFilter === f.key ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: receiptStatusFilter === f.key ? '#fff' : 'var(--text-secondary)',
                      padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.7rem'
                    }}>{f.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {receiptsError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <AlertOctagon size={16} /><span>{receiptsError}</span>
            </div>
          )}

          {/* Receipts Table */}
          {receiptsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
              <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Đang tải phiếu nhận hàng...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
              <p style={{ fontSize: '1rem' }}>Không có phiếu nhận hàng nào.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Phiếu nhận hàng sẽ tự động tạo khi Đơn Mua Hàng (PO) được xác nhận ở module Mua Hàng.</p>
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Mã Phiếu</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Đơn Mua Hàng</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Nhà Cung Cấp</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Sản Phẩm</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Trạng Thái</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 1rem', fontSize: '0.82rem', width: '210px', whiteSpace: 'nowrap' }}>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map(receipt => {
                    const po = receipt.po;
                    const itemsPreview = po?.items?.slice(0, 2).map(i => i.product?.name || i.productId).join(', ') || 'N/A';
                    const moreItems = (po?.items?.length || 0) > 2 ? ` (+${po.items.length - 2})` : '';
                    
                    return (
                      <tr key={receipt.id} className="hover-row" style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                        onClick={() => setSelectedReceipt(receipt)}
                      >
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.88rem' }}>{receipt.receiptNumber}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {receipt.receivedDate ? formatDate(receipt.receivedDate) : 'Chưa nhập'}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 600, color: '#818cf8', fontSize: '0.85rem' }}>{po?.poNumber || 'N/A'}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{po?.supplier?.name || po?.supplierCode || 'N/A'}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '250px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {itemsPreview}{moreItems}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {po?.items?.length || 0} sản phẩm • {po?.items?.reduce((s, i) => s + i.quantity, 0) || 0} đơn vị
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          {receipt.status === 'READY' ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 600,
                              backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.25)'
                            }}>
                              <Clock size={12} /> Chờ nhập kho
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 600,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}>
                              <CheckCircle2 size={12} /> Đã nhập kho
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '210px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'grid', gridTemplateColumns: '95px 95px', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              onClick={() => setSelectedReceipt(receipt)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderRadius: '8px', whiteSpace: 'nowrap', width: '100%' }}
                            >
                              <Eye size={13} /> Chi tiết
                            </button>
                            {receipt.status === 'READY' ? (
                              <button
                                onClick={() => handleValidateReceipt(receipt.id)}
                                className="btn btn-primary"
                                disabled={submitting}
                                style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderRadius: '8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', whiteSpace: 'nowrap', width: '100%' }}
                              >
                                <Check size={13} /> Nhập kho
                              </button>
                            ) : (
                              <div />
                            )}
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

        {/* Direct GRN Form */}
        <div className="card-glass" style={{ padding: '1.5rem', width: '100%' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
            <PlusCircle size={18} style={{ color: 'var(--secondary)' }} />
            Nhập Kho Trực Tiếp (Không qua PO)
          </h3>

          <form onSubmit={handleDirectGRNSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directReasonSelect">Lý do nhập kho</label>
              <select
                id="directReasonSelect"
                className="form-input"
                value={directReason}
                onChange={(e) => setDirectReason(e.target.value)}
              >
                <option value="DIRECT_PURCHASE">Nhập hàng trực tiếp từ NCC</option>
                <option value="AUDIT_ADJUSTMENT">Nhập bổ sung kiểm kê định kỳ</option>
                <option value="WARRANTY_RETURN">Nhận trả hàng bảo hành</option>
                <option value="OTHER">Nhập khác (Quà tặng, chuyển kho...)</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0, position: 'relative' }}>
              <label className="form-label" htmlFor="directProdSelect">Chọn linh kiện nhập</label>
              <input
                id="directProdSelect"
                type="text"
                className="form-input"
                placeholder="Gõ để tìm nhanh linh kiện..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                  if (e.target.value === '') {
                    setDirectProduct('');
                  }
                }}
                onFocus={() => setShowProductDropdown(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setShowProductDropdown(false);
                  }, 250);
                }}
                required
              />
              {showProductDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%', left: 0, right: 0,
                  maxHeight: '250px', overflowY: 'auto',
                  backgroundColor: '#1e293b',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 1000,
                  marginTop: '4px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'
                }}>
                  {inventory
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .slice(0, 15)
                    .map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setDirectProduct(p.id.toString());
                          setProductSearch(p.name);
                          setDirectPrice(p.price.toString());
                          setShowProductDropdown(false);
                        }}
                        style={{
                          padding: '0.6rem 0.75rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.02)',
                          color: '#fff',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <strong>{p.name}</strong> 
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mã: #{p.id} | Tồn: {p.stock} | Nhóm: {p.category}</div>
                      </div>
                    ))}
                  {inventory.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      Không tìm thấy linh kiện nào
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directQtyInput">Số lượng nhập</label>
              <input
                id="directQtyInput"
                type="number"
                min="1"
                className="form-input"
                value={directQty}
                onChange={(e) => setDirectQty(e.target.value)}
                placeholder="SL..."
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directPriceInput">Đơn giá nhập (Tùy chọn)</label>
              <input
                id="directPriceInput"
                type="number"
                className="form-input"
                value={directPrice}
                onChange={(e) => setDirectPrice(e.target.value)}
                placeholder="Giá..."
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directSuppSelect">Nhà cung cấp / Đối tác giao hàng</label>
              <select
                id="directSuppSelect"
                className="form-input"
                value={directSupplier}
                onChange={(e) => setDirectSupplier(e.target.value)}
                required
              >
                <option value="">-- Chọn nhà phân phối / Đối tác --</option>
                {STANDARD_SUPPLIERS.map(supp => (
                  <option key={supp} value={supp}>{supp}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directRefInput">Mã chứng từ gốc / Số biên bản</label>
              <input
                id="directRefInput"
                type="text"
                className="form-input"
                value={directRef}
                onChange={(e) => setDirectRef(e.target.value)}
                placeholder="Ví dụ: BBKK-220626, HD-NCC..."
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directLocInput">Vị trí kệ lưu trữ</label>
              <select
                id="directLocInput"
                className="form-input"
                value={directLocation}
                onChange={(e) => setDirectLocation(e.target.value)}
              >
                <option value="">-- Chọn kệ --</option>
                {PREDEFINED_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directNoteInput">Ghi chú chi tiết</label>
              <input
                id="directNoteInput"
                type="text"
                className="form-input"
                value={directNote}
                onChange={(e) => setDirectNote(e.target.value)}
                placeholder="Tình trạng linh kiện khi nhận..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '0.5rem', height: '42px', fontSize: '0.9rem' }}>
                <ArrowDownLeft size={18} />
                Xác Nhận Nhập Kho Trực Tiếp
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '1.25rem 1.5rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          Nhà Kho & Quản Lý Tồn Hàng
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Quản lý luồng Nhập kho, Xuất kho, Ngưỡng quy tắc Min-Max và Nhật ký dịch chuyển kho kép.
        </p>
      </div>

      <ActorNotificationBar />

      {/* Warning & KPI Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Out of Stock Card */}
        <div className="card-glass hover-scale" style={{ borderLeft: '4px solid var(--danger)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertOctagon size={20} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Hết Hàng Cần Nhập</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: outOfStockItems.length > 0 ? '#ef4444' : '#64748b' }}>
              {outOfStockItems.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>SP</span>
            </h3>
          </div>
        </div>

        {/* Low Stock Card */}
        <div className="card-glass hover-scale" style={{ borderLeft: '4px solid var(--warning)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingDown size={20} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Dưới Ngưỡng An Toàn</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: lowStockItems.length > 0 ? '#d97706' : '#64748b' }}>
              {lowStockItems.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>SP</span>
            </h3>
          </div>
        </div>

        {/* Receipts Pending Card */}
        <div className="card-glass hover-scale" style={{ borderLeft: '4px solid #4f46e5', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('grn')}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Phiếu Chờ Nhập Kho</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: readyReceipts.length > 0 ? '#4f46e5' : '#64748b' }}>
              {readyReceipts.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>phiếu</span>
            </h3>
          </div>
        </div>

        {/* Value / Location Card */}
        {isManager ? (
          <div className="card-glass hover-scale" style={{ borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Tổng Giá Trị Tồn Kho</p>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', margin: '0.1rem 0 0' }}>
                {formatPrice(inventory.reduce((sum, item) => sum + (item.stock * (item.price || 0)), 0))}
              </h3>
            </div>
          </div>
        ) : (
          <div className="card-glass hover-scale" style={{ borderLeft: '4px solid var(--accent)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Vị Trí Đã Phân Kệ</p>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: 'var(--text-primary)' }}>
                {inventory.filter(item => item.location).length} / {inventory.length}
              </h3>
            </div>
          </div>
        )}
      </div>

      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
            backgroundColor: activeTab === 'inventory' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'inventory' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          📦 Sổ Kho Thực Tế & Quản Lý Kệ
        </button>
        <button
          onClick={() => setActiveTab('grn')}
          style={{
            padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none', transition: 'all 0.2s', position: 'relative',
            backgroundColor: activeTab === 'grn' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'grn' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          📥 Nhập Kho & Nhận Hàng
          {readyReceipts.length > 0 && (
            <span style={{ marginLeft: '0.4rem', backgroundColor: 'var(--danger)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
              {readyReceipts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          style={{
            padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none', transition: 'all 0.2s', position: 'relative',
            backgroundColor: activeTab === 'delivery' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'delivery' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          🚚 Xuất Kho & Bàn Giao
          {orders.filter(o => o.status === 'CONFIRMED').length > 0 && (
            <span style={{ marginLeft: '0.4rem', backgroundColor: 'var(--danger)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
              {orders.filter(o => o.status === 'CONFIRMED').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.5rem', fontSize: '0.875rem', borderRadius: 'var(--radius-md)' }}
        >
          📜 Lịch Sử Xuất Nhập Kho
        </button>
      </div>

      {/* Main Layout Area */}
      {activeTab === 'inventory' ? (
        isManager ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {renderInventoryTable()}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              {/* Inventory Structure report */}
              <div className="card-glass" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
                  Cơ Cấu Tồn Kho Theo Phân Nhóm
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {Object.entries(
                    inventory.reduce((acc, item) => {
                      acc[item.category] = (acc[item.category] || 0) + item.stock;
                      return acc;
                    }, {})
                  ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                    const totalStock = inventory.reduce((sum, i) => sum + i.stock, 0) || 1;
                    const percent = Math.round((count / totalStock) * 100);
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', letterSpacing: '0.03em' }}>{getCategoryNameVi(cat)}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{count.toLocaleString('vi-VN')} ({percent}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(percent, 1)}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent stock movements from backend */}
              <div className="card-glass" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  <Database size={18} style={{ color: 'var(--success)' }} />
                  Nhật Ký Xuất Nhập Kho Gần Đây
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {stockMovements.length > 0 ? (
                    stockMovements.slice(0, 10).map(mv => (
                      <div key={mv.id} style={{ fontSize: '0.75rem', padding: '0.6rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {mv.type === 'IN' ? (
                              <span style={{ color: '#34d399' }}>↓ NHẬP</span>
                            ) : (
                              <span style={{ color: '#ef4444' }}>↑ XUẤT</span>
                            )}
                            <span style={{ color: 'var(--text-primary)' }}>x{mv.quantity}</span>
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{formatDate(mv.createdAt)}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{mv.product?.name || mv.productId}</p>
                        {mv.note && <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0', fontSize: '0.7rem' }}>{mv.note}</p>}
                      </div>
                    ))
                  ) : (
                    // Fallback to ledger if no backend data
                    ledger
                      .filter(txn => txn.description.includes('Nhập kho') || txn.description.includes('mua hàng') || txn.type === 'EXPENSE')
                      .slice(0, 5)
                      .map(txn => (
                        <div key={txn.id} style={{ fontSize: '0.75rem', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.25rem' }}>
                            <span style={{ color: 'var(--danger)' }}>-{formatPrice(txn.amount)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{txn.date}</span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{txn.description}</p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          renderInventoryTable()
        )
      ) : activeTab === 'grn' ? (
        renderGRNTab()
      ) : activeTab === 'delivery' ? (
          /* TAB 3: Xuất Kho & Giao Hàng */
          <div className="card-glass" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Truck size={20} style={{ color: 'var(--success)' }} />
                  Xuất Kho & Lịch Sử Giao Hàng
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                  Xác nhận xuất kho cho các đơn hàng và xem lịch sử các đơn hàng đã xuất kho.
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm theo mã đơn, tên KH..."
                  style={{ paddingLeft: '2rem', fontSize: '0.85rem', width: '220px' }}
                  value={deliverySearch}
                  onChange={(e) => setDeliverySearch(e.target.value)}
                />
              </div>
            </div>

            {/* Interactive Summary badges & Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => setDeliveryFilter('PENDING')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  backgroundColor: deliveryFilter === 'PENDING' ? '#dcfce7' : '#f8fafc',
                  outline: deliveryFilter === 'PENDING' ? '2px solid #16a34a' : '1px solid #cbd5e1'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
                  ⏳ Chờ xuất kho: <strong>{orders.filter(o => o.status === 'CONFIRMED').length}</strong> đơn
                </span>
              </button>

              <button
                onClick={() => setDeliveryFilter('SHIPPED')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  backgroundColor: deliveryFilter === 'SHIPPED' ? '#e0e7ff' : '#f8fafc',
                  outline: deliveryFilter === 'SHIPPED' ? '2px solid #4f46e5' : '1px solid #cbd5e1'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 600 }}>
                  🚚 Đã xuất kho (Sẵn giao): <strong>{orders.filter(o => ['READY_TO_SHIP', 'SHIPPED'].includes(o.status)).length}</strong> đơn
                </span>
              </button>

              <button
                onClick={() => setDeliveryFilter('DELIVERED')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  backgroundColor: deliveryFilter === 'DELIVERED' ? '#d1fae5' : '#f8fafc',
                  outline: deliveryFilter === 'DELIVERED' ? '2px solid #059669' : '1px solid #cbd5e1'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                  ✅ Đã giao thành công: <strong>{orders.filter(o => o.status === 'DELIVERED').length}</strong> đơn
                </span>
              </button>

              <button
                onClick={() => setDeliveryFilter('ALL')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  backgroundColor: deliveryFilter === 'ALL' ? '#2563eb' : '#f8fafc',
                  color: deliveryFilter === 'ALL' ? '#ffffff' : '#475569',
                  outline: deliveryFilter === 'ALL' ? '2px solid #1d4ed8' : '1px solid #cbd5e1'
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: deliveryFilter === 'ALL' ? '#ffffff' : '#475569' }}>📋 Tất cả lịch sử</span>
              </button>
            </div>

            {/* Table of Orders */}
            <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Mã Đơn</th>
                    <th>Khách Hàng</th>
                    <th>Số Điện Thoại</th>
                    <th style={{ textAlign: 'right' }}>Giá Trị</th>
                    <th>Loại Đơn</th>
                    <th>Trạng Thái</th>
                    <th style={{ textAlign: 'center' }}>Hành Động / Lịch Sử</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredOrders = orders
                      .filter(o => {
                        if (deliveryFilter === 'PENDING') return o.status === 'CONFIRMED';
                        if (deliveryFilter === 'SHIPPED') return ['READY_TO_SHIP', 'SHIPPED'].includes(o.status);
                        if (deliveryFilter === 'DELIVERED') return o.status === 'DELIVERED';
                        if (deliveryFilter === 'ALL') return ['CONFIRMED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'].includes(o.status);
                        return true;
                      })
                      .filter(o => {
                        const term = deliverySearch.toLowerCase().trim();
                        if (!term) return true;
                        return (o.orderId || '').toLowerCase().includes(term) || (o.customerName || '').toLowerCase().includes(term);
                      });
                    
                    if (filteredOrders.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <Package size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                            {deliverySearch ? 'Không tìm thấy đơn hàng phù hợp.' : 'Không có dữ liệu trong danh mục này.'}
                          </td>
                        </tr>
                      );
                    }
                    return filteredOrders.map(ord => (
                      <tr key={ord.orderId}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{ord.orderId}</td>
                        <td>{ord.customerName}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{ord.phone || 'N/A'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{formatPrice(ord.totalAmount)}</td>
                        <td><span className={`badge ${ord.type === 'POS' ? 'badge-info' : 'badge-secondary'}`}>{ord.type || 'ONLINE'}</span></td>
                        <td>
                          {ord.status === 'CONFIRMED' && <span className="badge badge-warning">Chờ xuất kho</span>}
                          {ord.status === 'READY_TO_SHIP' && <span className="badge badge-info" style={{ color: '#818cf8' }}>Đã xuất kho</span>}
                          {ord.status === 'SHIPPED' && <span className="badge badge-info">Đang giao</span>}
                          {ord.status === 'DELIVERED' && <span className="badge badge-success">Đã giao</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {ord.status === 'CONFIRMED' ? (
                            <button
                              onClick={() => {
                                if (updateOrderStatus) {
                                  updateOrderStatus(ord.orderId, 'READY_TO_SHIP', 'Đã xuất kho – Chờ bên giao hàng nhận đơn');
                                  alert(`✅ Đã xác nhận xuất kho thành công! Đơn ${ord.orderId} đã được chuyển sang bộ phận Giao Hàng.`);
                                }
                              }}
                              className="btn btn-primary"
                              style={{ padding: '0.375rem 0.875rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.375rem', backgroundColor: 'var(--success)', border: 'none', margin: '0 auto', cursor: 'pointer' }}
                            >
                              <Truck size={14} />
                              Xác Nhận Xuất Kho
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {ord.deliveredDate ? `Đã hoàn tất (${ord.deliveredDate})` : 'Đã xuất kho'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          /* TAB 4: Lịch Sử Biến Động Kho (Stock Movements API Log) */
          <div className="card-glass" style={{ padding: '1.5rem', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <FileText size={20} style={{ color: '#818cf8' }} />
                  Lịch Sử Biến Động Xuất Nhập Kho
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                  Toàn bộ lịch sử các giao dịch nhập kho (GRN) và xuất kho hàng hóa.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setMovementTypeFilter('ALL')}
                  className={`btn ${movementTypeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setMovementTypeFilter('IN')}
                  className={`btn ${movementTypeFilter === 'IN' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: movementTypeFilter === 'IN' ? '#fff' : '#34d399' }}
                >
                  ↓ Nhập kho (IN)
                </button>
                <button
                  onClick={() => setMovementTypeFilter('OUT')}
                  className={`btn ${movementTypeFilter === 'OUT' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: movementTypeFilter === 'OUT' ? '#fff' : '#ef4444' }}
                >
                  ↑ Xuất kho (OUT)
                </button>
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto', borderRadius: '12px' }}>
              <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Thời Gian</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Loại</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Linh Kiện / Sản Phẩm</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Số Lượng</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem' }}>Mã Thao Tác / Tham Chiếu</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem' }}>Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.filter(mv => movementTypeFilter === 'ALL' || mv.type === movementTypeFilter).length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <Database size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                        Chưa có lịch sử biến động kho nào ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    stockMovements
                      .filter(mv => movementTypeFilter === 'ALL' || mv.type === movementTypeFilter)
                      .map(mv => (
                        <tr key={mv.id}>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {formatDate(mv.createdAt)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {mv.type === 'IN' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399', whiteSpace: 'nowrap' }}>
                                ↓ NHẬP
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', whiteSpace: 'nowrap' }}>
                                ↑ XUẤT
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {mv.product?.name || mv.productId}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                            {mv.quantity}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontFamily: 'monospace', color: '#818cf8' }}>
                            {mv.referenceId || 'N/A'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {mv.note || 'N/A'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

      {/* ================= MODAL CHI TIẾT PHIẾU NHẬN HÀNG (Odoo-style) ================= */}
      {/* ── Modal: Chi Tiết Phiếu Nhập Kho ── */}
      {selectedReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }} onClick={() => setSelectedReceipt(null)}>
          <div style={{ width: '100%', maxWidth: '950px', maxHeight: '92vh', backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Toolbar Header */}
            <div style={{ borderBottom: '3px solid #16a34a', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)', padding: '1.25rem 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Left: Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {selectedReceipt.status === 'READY' && (
                    <button
                      onClick={() => handleValidateReceipt(selectedReceipt.id)}
                      className="btn btn-primary shadow-glow"
                      disabled={submitting}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.4rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.88rem', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                    >
                      <Check size={16} /> Xác Nhận Nhập Kho
                    </button>
                  )}
                  {selectedReceipt.status === 'DONE' && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.5rem 1.1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800,
                      backgroundColor: '#dcfce7', color: '#15803d',
                      border: '1.5px solid #bbf7d0'
                    }}>
                      <CheckCircle2 size={16} /> Đã Nhập Kho Thành Công
                    </span>
                  )}
                </div>

                {/* Right: Pipeline + Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginLeft: 'auto' }}>
                  {/* Pipeline Status Badges */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {[
                      { key: 'READY', label: 'Chờ nhập kho' },
                      { key: 'DONE', label: 'Đã nhập kho' }
                    ].map((step, idx, arr) => {
                      const isActive = selectedReceipt.status === step.key;
                      const isPassed = step.key === 'READY' && selectedReceipt.status === 'DONE';
                      return (
                        <React.Fragment key={step.key}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.78rem', fontWeight: 800,
                            background: isActive ? (step.key === 'DONE' ? '#16a34a' : '#2563eb') : (isPassed ? 'rgba(22, 163, 74, 0.2)' : 'rgba(255,255,255,0.08)'),
                            color: '#ffffff',
                            borderRadius: '20px',
                            border: isActive ? 'none' : (isPassed ? '1px solid #86efac' : '1px solid rgba(255,255,255,0.15)'),
                            whiteSpace: 'nowrap'
                          }}>
                            {isPassed && <Check size={13} />}
                            {step.label}
                          </div>
                          {idx < arr.length - 1 && (
                            <div style={{
                              width: '28px', height: '2px',
                              background: isPassed ? '#16a34a' : 'rgba(255,255,255,0.15)',
                              flexShrink: 0
                            }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Close Icon Button X */}
                  <button 
                    onClick={() => setSelectedReceipt(null)} 
                    title="Đóng phiếu nhập kho"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.15)', 
                      border: '1.5px solid rgba(255, 255, 255, 0.25)', 
                      color: '#ffffff', 
                      cursor: 'pointer', 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }} 
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.85)'; e.currentTarget.style.borderColor = '#ef4444'; }} 
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'; }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body Content */}
            <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', backgroundColor: '#f8fafc' }}>
              
              {/* Receipt Title */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MÃ PHIẾU NHẬP KHO THỰC TẾ</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 900, margin: '0.2rem 0 0 0', color: '#0f172a', letterSpacing: '-0.5px' }}>
                    {selectedReceipt.receiptNumber}
                  </h2>
                </div>
              </div>

              {/* Form Info Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Đơn Mua Hàng (PO)</label>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563eb', marginTop: '0.25rem' }}>{selectedReceipt.po?.poNumber}</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Nhà Cung Cấp Đối Tác</label>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{selectedReceipt.po?.supplier?.name || selectedReceipt.po?.supplierCode}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Mã NCC: {selectedReceipt.po?.supplierCode}</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Kho Nhận Hàng</label>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{selectedReceipt.warehouse?.name || 'Kho Tổng TP. Hồ Chí Minh'}</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    {selectedReceipt.status === 'DONE' ? 'Ngày Nhập Kho Thực Tế' : 'Ngày Nhận Dự Kiến'}
                  </label>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                    {selectedReceipt.status === 'DONE'
                      ? formatDate(selectedReceipt.receivedDate)
                      : formatDate(selectedReceipt.po?.expectedDeliveryDate)
                    }
                  </div>
                  {selectedReceipt.receivedBy && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Người nhận: <strong>{selectedReceipt.receivedBy}</strong></div>
                  )}
                </div>
              </div>

              {selectedReceipt.note && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#334155' }}>
                  <strong style={{ color: '#0f172a' }}>Ghi chú phiếu:</strong> {selectedReceipt.note}
                </div>
              )}

              {/* Items Table */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Danh Sách Linh Kiện Nhập Kho
                </h4>
                
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.73rem', letterSpacing: '0.6px' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Mã SP</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Sản Phẩm Linh Kiện</th>
                        <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', width: '90px' }}>Số Lượng</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', width: '140px' }}>Đơn Giá</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', width: '150px' }}>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.po?.items?.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: idx < (selectedReceipt.po?.items?.length || 0) - 1 ? '1px solid #f1f5f9' : 'none', backgroundColor: '#ffffff' }}>
                          <td style={{ textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                            {item.product?.productId || item.productId}
                          </td>
                          <td style={{ fontWeight: 700, textAlign: 'left', padding: '0.85rem 1rem', color: '#0f172a', lineHeight: '1.4' }}>
                            {item.product?.name || item.name || 'Linh kiện máy tính'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.85rem 0.5rem', fontWeight: 800, color: '#0f172a' }}>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '3px 10px', borderRadius: '12px' }}>{item.quantity}</span>
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>{formatPrice(item.unitCost)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', padding: '0.85rem 1rem' }}>{formatPrice(item.totalCost)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 800, padding: '1rem', color: '#0f172a', fontSize: '0.9rem' }}>TỔNG CỘNG GIÁ TRỊ NHẬP:</td>
                        <td style={{ textAlign: 'right', fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', padding: '1rem', letterSpacing: '-0.3px' }}>
                          {formatPrice(selectedReceipt.po?.items?.reduce((s, i) => s + parseFloat(i.totalCost || 0), 0) || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Thêm Linh Kiện Mới ── */}
      {showAddProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '480px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Thêm Linh Kiện Mới Vĩnh Viễn</h3>
              <button onClick={() => setShowAddProduct(false)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Tên linh kiện *</label>
                <input value={newProdForm.name} onChange={e => setNewProdForm(p => ({ ...p, name: e.target.value }))} placeholder="CPU Intel Core i9-14900K..." className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Phân nhóm *</label>
                  <select value={newProdForm.category} onChange={e => setNewProdForm(p => ({ ...p, category: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }}>
                    {['CPU', 'VGA', 'MAINBOARD', 'RAM', 'STORAGE', 'PSU', 'CASE', 'COOLER', 'MONITOR', 'KEYBOARD', 'MOUSE', 'ACCESSORY'].map(c => <option key={c} value={c}>{getCategoryNameVi(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Số lượng đầu kỳ *</label>
                  <input type="number" value={newProdForm.stock} onChange={e => setNewProdForm(p => ({ ...p, stock: e.target.value }))} placeholder="10" className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Đơn giá (VNĐ) *</label>
                  <input type="number" value={newProdForm.price} onChange={e => setNewProdForm(p => ({ ...p, price: e.target.value }))} placeholder="15000000" className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Ngưỡng tối thiểu</label>
                  <input type="number" value={newProdForm.threshold} onChange={e => setNewProdForm(p => ({ ...p, threshold: e.target.value }))} placeholder="5" className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Nhà phân phối *</label>
                <select value={newProdForm.supplier} onChange={e => setNewProdForm(p => ({ ...p, supplier: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }}>
                  {STANDARD_SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Vị trí kệ</label>
                <select value={newProdForm.location} onChange={e => setNewProdForm(p => ({ ...p, location: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }}>
                  {PREDEFINED_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddProduct(false)} className="btn btn-secondary">Hủy</button>
                <button onClick={() => {
                  if (!newProdForm.name || !newProdForm.price) { alert('Vui lòng điền tên và giá linh kiện'); return; }
                  addProduct(newProdForm);
                  setShowAddProduct(false);
                  setNewProdForm({ name: '', category: 'CPU', stock: '', price: '', supplier: 'Intel Vietnam', threshold: '5', location: 'ZONE-A/SHELF-01/BIN-01' });
                  alert('✅ Đã thêm linh kiện mới vào kho thành công!');
                }} className="btn btn-primary">Thêm Linh Kiện</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Chỉnh Sửa Linh Kiện ── */}
      {editingProd && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '480px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Chỉnh Sửa Linh Kiện #{editingProd.id}</h3>
              <button onClick={() => setEditingProd(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Tên linh kiện *</label>
                <input value={editingProd.name} onChange={e => setEditingProd(p => ({ ...p, name: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Số lượng tồn *</label>
                  <input type="number" value={editingProd.stock} onChange={e => setEditingProd(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Ngưỡng tối thiểu</label>
                  <input type="number" value={editingProd.threshold} onChange={e => setEditingProd(p => ({ ...p, threshold: parseInt(e.target.value) || 0 }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Nhà phân phối</label>
                <input value={editingProd.supplier || ''} onChange={e => setEditingProd(p => ({ ...p, supplier: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Vị trí kệ</label>
                <input value={editingProd.location || ''} onChange={e => setEditingProd(p => ({ ...p, location: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingProd(null)} className="btn btn-secondary">Hủy</button>
                <button onClick={() => {
                  updateProduct(editingProd.id, {
                    name: editingProd.name,
                    stock: editingProd.stock,
                    threshold: editingProd.threshold,
                    supplier: editingProd.supplier,
                    location: editingProd.location
                  });
                  setEditingProd(null);
                  alert('✅ Đã cập nhật thông tin linh kiện!');
                }} className="btn btn-primary">Lưu Thay Đổi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
