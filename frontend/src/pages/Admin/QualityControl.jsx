import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ActorNotificationBar from '../../components/ActorNotificationBar';
import { 
  ShieldCheck, ShieldAlert, CheckCircle, XCircle, AlertTriangle, 
  Package, Search, Eye, Filter, RefreshCw, Truck, FileText, 
  Check, X, ChevronRight, Award, BarChart2, Calendar, User, Building, AlertCircle
} from 'lucide-react';

export default function QualityControl() {
  const { purchaseOrders = [], updatePurchaseOrderStatus, sendSystemNotification } = useERP() || {};
  const { user } = useAuth() || {};
  const location = useLocation();
  const isQC = ['QC', 'QA', 'QUALITY_CONTROL', 'CEO', 'ADMIN', 'WAREHOUSE', 'WAREHOUSE_MANAGER', 'PURCHASING'].includes(user?.role);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Selected PO for QA Inspection Modal
  const [selectedPO, setSelectedPO] = useState(null);
  const [inspectionDecision, setInspectionDecision] = useState('ACCEPT_ALL');
  const [passedQty, setPassedQty] = useState(0);
  const [failedQty, setFailedQty] = useState(0);
  const [defectCategory, setDefectCategory] = useState('PACKAGE_DAMAGED');
  const [qcNotes, setQcNotes] = useState('');
  const [sampleRate, setSampleRate] = useState('100%');
  const [viewingLog, setViewingLog] = useState(null); // Selected QA Log for Details Modal

  // Inspection Logs (Stored in localStorage for mock persistence)
  const [qaLogs, setQaLogs] = useState(() => {
    try {
      const raw = localStorage.getItem('erp_qa_inspection_logs');
      return raw ? JSON.parse(raw) : [
        {
          id: 'QA-2026-001',
          poNumber: 'PO-2026-0005',
          supplierName: 'ASUS Vietnam',
          inspector: 'Nguyễn Văn QC',
          date: '15/06/2026',
          totalQty: 50,
          passedQty: 50,
          failedQty: 0,
          decision: 'ACCEPT_ALL',
          defectCategory: 'NONE',
          notes: 'Lô hàng VGA ASUS RTX 4070 nguyên tem niêm phong, kiểm tra 100% đạt chuẩn.',
          status: 'QA_PASSED'
        }
      ];
    } catch (e) {
      return [];
    }
  });

  const fetchData = async () => {
    setLoading(true);
    let list = [];
    try {
      const res = await api.get('/purchasing/orders');
      if (res && res.success) {
        list = res.data || [];
      }
    } catch (e) {
      console.warn('API error, using ERPContext fallback:', e);
    }
    
    let localOrders = [];
    try { localOrders = JSON.parse(localStorage.getItem('erp_pos') || '[]'); } catch (_) { localOrders = purchaseOrders; }
    const combined = list.map(apiPo => {
      const localPo = localOrders.find(po => po.poNumber === apiPo.poNumber || String(po.id) === String(apiPo.id));
      const merged = localPo ? { ...apiPo, ...localPo } : apiPo;
      const poLog = qaLogs.find(log => log.poNumber === merged.poNumber);
      return poLog && Number(poLog.failedQty) > 0 && merged.status === 'QA_PASSED'
        ? { ...merged, status: 'QA_PARTIAL' }
        : merged;
    });
    [...localOrders, ...purchaseOrders].forEach(po => {
      if (!combined.some(c => c.poNumber === po.poNumber || String(c.id) === String(po.id))) combined.push(po);
    });
    setOrders(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [purchaseOrders]);

  useEffect(() => {
    const refresh = () => fetchData();
    window.addEventListener('erp-purchase-orders-changed', refresh);
    return () => window.removeEventListener('erp-purchase-orders-changed', refresh);
  }, [purchaseOrders]);

  const saveQaLogs = (newLogs) => {
    const deduped = newLogs.filter((log, index, all) =>
      index === all.findIndex(item => item.poNumber === log.poNumber)
    );
    setQaLogs(deduped);
    localStorage.setItem('erp_qa_inspection_logs', JSON.stringify(deduped));
  };

  const formatPrice = (price) => {
    const num = Number(price);
    if (isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const isValidFullPass = (log) =>
    log.status === 'QA_PASSED' &&
    Number(log.failedQty) === 0 &&
    Number(log.passedQty) === Number(log.totalQty);
  const getLogSummary = (log) => Number(log.failedQty) > 0
    ? `Có ${log.failedQty} sản phẩm lỗi, ${log.passedQty} sản phẩm đạt (${log.totalQty ? Math.round((Number(log.passedQty) / Number(log.totalQty)) * 100) : 0}% đạt).`
    : (log.notes || 'Không có ghi chú thêm.');

  const getLogStatusInfo = (log) => {
    if (!log) return {};
    const passed = Number(log.passedQty || 0);
    const failed = Number(log.failedQty || 0);
    const total = Number(log.totalQty || (passed + failed) || 1);

    if (passed === total && failed === 0) {
      return {
        type: 'FULL_PASS',
        bannerBg: '#f0fdf4',
        bannerBorder: '1px solid #bbf7d0',
        textColor: '#15803d',
        iconColor: '#16a34a',
        badgeBg: '#dcfce7',
        badgeColor: '#15803d',
        badgeBorder: '1px solid #bbf7d0',
        title: 'KẾT LUẬN: ĐẠT CHUẨN 100% — PHÊ DUYỆT NHẬP KHO TOÀN BỘ',
        badgeText: 'CHO NHẬP KHO 100%'
      };
    } else if (passed > 0 && failed > 0) {
      return {
        type: 'PARTIAL',
        bannerBg: '#fff7ed',
        bannerBorder: '1px solid #fed7aa',
        textColor: '#c2410c',
        iconColor: '#ea580c',
        badgeBg: '#fff7ed',
        badgeColor: '#c2410c',
        badgeBorder: '1px solid #fed7aa',
        title: `KẾT LUẬN: NHẬP MỘT PHẦN — CHO NHẬP ${passed} SP ĐẠT & THÔNG BÁO HOÀN TRẢ ${failed} SP LỖI CHO NCC`,
        badgeText: `NHẬP MỘT PHẦN (${passed}/${total})`
      };
    } else {
      return {
        type: 'FULL_REJECT',
        bannerBg: '#fef2f2',
        bannerBorder: '1px solid #fecaca',
        textColor: '#991b1b',
        iconColor: '#dc2626',
        badgeBg: '#fef2f2',
        badgeColor: '#dc2626',
        badgeBorder: '1px solid #fecaca',
        title: 'KẾT LUẬN: KHÔNG ĐẠT CHẤT LƯỢNG — YÊU CẦU HOÀN TRẢ 100% LÔ HÀNG CHO NCC',
        badgeText: 'HOÀN TRẢ NCC 100%'
      };
    }
  };

  const uniqueQaLogs = qaLogs.filter((log, index, all) =>
    index === all.findIndex(item => item.poNumber === log.poNumber)
  );

  const PENDING_QA_STATUSES = ['CONFIRMED_BY_SUPPLIER', 'PO', 'APPROVED', 'PENDING_QA', 'SHIPPED', 'DELIVERED', 'RFQ_SENT', 'SENT'];
  const PASSED_QA_STATUSES = ['QA_PASSED', 'DONE', 'COMPLETED', 'RECEIVED'];
  const REJECTED_QA_STATUSES = ['QA_REJECTED', 'QA_PARTIAL'];

  useEffect(() => {
    if (location.state?.openInspection && orders.length > 0) {
      const pending = orders.find(po => PENDING_QA_STATUSES.includes(po.status));
      if (pending) handleOpenInspectionModal(pending);
    }
    const poNumber = location.state?.inspectionPO;
    if (!poNumber) return;
    const log = qaLogs.find(item => item.poNumber === poNumber);
    if (log) setViewingLog(log);
  }, [location.state, orders, qaLogs]);

  const qaPOs = orders.filter(po => {
    const s = po.status;
    return [...PENDING_QA_STATUSES, ...PASSED_QA_STATUSES, ...REJECTED_QA_STATUSES].includes(s);
  });

  const pendingQaPOs = qaPOs.filter(po => PENDING_QA_STATUSES.includes(po.status));
  const passedQaPOs = qaPOs.filter(po => PASSED_QA_STATUSES.includes(po.status));
  const partialQaPOs = qaPOs.filter(po => po.status === 'QA_PARTIAL');
  const rejectedQaPOs = qaPOs.filter(po => po.status === 'QA_REJECTED');

  const filteredPOs = qaPOs
    .filter(po => {
      const matchesSearch = !searchTerm.trim() || 
        (po.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (po.supplier?.name || po.supplierCode || po.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === 'PENDING') matchesStatus = PENDING_QA_STATUSES.includes(po.status);
      else if (statusFilter === 'PASSED') matchesStatus = PASSED_QA_STATUSES.includes(po.status);
      else if (statusFilter === 'REJECTED') matchesStatus = REJECTED_QA_STATUSES.includes(po.status);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dA = new Date(a.createdAt || a.date || 0);
      const dB = new Date(b.createdAt || b.date || 0);
      if (dB.getTime() !== dA.getTime()) return dB.getTime() - dA.getTime();
      return String(b.poNumber || b.id || '').localeCompare(String(a.poNumber || a.id || ''), 'vi', { numeric: true });
    });

  const handleOpenInspectionModal = (po) => {
    setSelectedPO(po);
    const total = po.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || po.quantity || 1;
    setPassedQty(total);
    setFailedQty(0);
    setInspectionDecision('ACCEPT_ALL');
    setDefectCategory('PACKAGE_DAMAGED');
    setQcNotes('');
    setSampleRate('100%');
  };

  const updateQuantitiesAndDecision = (pQty, fQty, total) => {
    setPassedQty(pQty);
    setFailedQty(fQty);

    if (pQty === total && fQty === 0) {
      setInspectionDecision('ACCEPT_ALL');
    } else if (fQty === total && pQty === 0) {
      setInspectionDecision('REJECT_ALL');
    } else {
      setInspectionDecision('ACCEPT_PARTIAL');
    }
  };

  const handleDecisionChange = (dec, total) => {
    setInspectionDecision(dec);
    if (dec === 'ACCEPT_ALL') {
      setPassedQty(total);
      setFailedQty(0);
    } else if (dec === 'REJECT_ALL') {
      setPassedQty(0);
      setFailedQty(total);
    } else if (dec === 'ACCEPT_PARTIAL') {
      if (passedQty === total || failedQty === total) {
        const p = Math.max(0, total - 1);
        const f = total > 1 ? 1 : 0;
        setPassedQty(p);
        setFailedQty(f);
      }
    }
  };

  const handlePassedQtyInputChange = (val, total) => {
    const pQty = Math.max(0, Math.min(total, parseInt(val, 10) || 0));
    const fQty = Math.max(0, total - pQty);
    updateQuantitiesAndDecision(pQty, fQty, total);
  };

  const handleFailedQtyInputChange = (val, total) => {
    const fQty = Math.max(0, Math.min(total, parseInt(val, 10) || 0));
    const pQty = Math.max(0, total - fQty);
    updateQuantitiesAndDecision(pQty, fQty, total);
  };

  const handleSubmitQaInspection = async (e) => {
    e.preventDefault();
    if (!selectedPO) return;

    const poId = selectedPO.id || selectedPO.poNumber;
    const totalQty = selectedPO.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || selectedPO.quantity || 1;

    if (passedQty + failedQty !== totalQty) {
      alert(`Tổng số lượng đạt (${passedQty}) + không đạt (${failedQty}) phải đúng bằng tổng sản phẩm lô hàng (${totalQty}).`);
      return;
    }

    const isFullPass = passedQty === totalQty && failedQty === 0;
    const isFullReject = passedQty === 0 && failedQty === totalQty;
    const targetStatus = isFullPass ? 'QA_PASSED' : isFullReject ? 'QA_REJECTED' : 'QA_PARTIAL';

    setSubmitting(true);

    const logEntry = {
      id: `QA-${Date.now().toString().slice(-4)}`,
      poNumber: selectedPO.poNumber || poId,
      supplierName: selectedPO.supplier?.name || selectedPO.supplierCode || selectedPO.supplierName || 'Nhà Cung Cấp',
      inspector: user?.fullname || 'Chuyên viên QA/QC',
      date: new Date().toLocaleDateString('vi-VN'),
      totalQty,
      passedQty,
      failedQty,
      decision: inspectionDecision,
      defectCategory: failedQty > 0 ? defectCategory : 'NONE',
      notes: qcNotes || (targetStatus === 'QA_PASSED' ? 'Lô hàng đạt tiêu chuẩn nhập kho.' : targetStatus === 'QA_PARTIAL' ? `Nghệ thu nhập ${passedQty} sản phẩm đạt, hoàn trả ${failedQty} sản phẩm lỗi.` : 'Không đạt tiêu chuẩn, yêu cầu hoàn trả NCC.'),
      status: targetStatus
    };

    const nccNoticeText = targetStatus === 'QA_PASSED'
      ? `Lô hàng ${selectedPO.poNumber || poId} đạt 100% chất lượng (${passedQty}/${totalQty} SP). Đã cho nhập kho toàn bộ.`
      : targetStatus === 'QA_PARTIAL'
        ? `Lô hàng ${selectedPO.poNumber || poId} nghiệm thu NHẬP MỘT PHẦN: Đã nhận ${passedQty}/${totalQty} SP đạt chuẩn. Phát hiện ${failedQty}/${totalQty} SP lỗi (${DEFECT_LABELS[defectCategory] || defectCategory}). Đề nghị NCC nhận lại ${failedQty} SP lỗi!`
        : `Lô hàng ${selectedPO.poNumber || poId} KHÔNG ĐẠT CHẤT LƯỢNG (${failedQty}/${totalQty} SP lỗi: ${DEFECT_LABELS[defectCategory] || defectCategory}). Yêu cầu NCC nhận lại 100% lô hàng!`;

    const supplierNote = `[THÔNG BÁO HOÀN TRẢ NCC - QA/QC]: ${nccNoticeText}`;
    const updatedPO = { ...selectedPO, status: targetStatus, supplierNote };

    // Persist and update the list before the API call: Docker/API may be
    // temporarily unavailable, but the QA result must not look unchanged.
    setOrders(current => current.map(po =>
      po.poNumber === selectedPO.poNumber || String(po.id) === String(poId) ? updatedPO : po
    ));
    updatePurchaseOrderStatus(poId, targetStatus, { supplierNote });
    try {
      const savedPOs = JSON.parse(localStorage.getItem('erp_pos') || '[]');
      const exists = savedPOs.some(po => po.poNumber === selectedPO.poNumber || String(po.id) === String(poId));
      const nextPOs = exists
        ? savedPOs.map(po => po.poNumber === selectedPO.poNumber || String(po.id) === String(poId) ? { ...po, ...updatedPO } : po)
        : [updatedPO, ...savedPOs];
      localStorage.setItem('erp_pos', JSON.stringify(nextPOs));
    } catch (_) { /* Context state remains the fallback. */ }
    // Save QA Inspection log entry
    saveQaLogs([logEntry, ...qaLogs]);

    window.dispatchEvent(new Event('erp-purchase-orders-changed'));
    window.dispatchEvent(new Event('erp-qa-inspection-changed'));

    try {
      const res = await api.patch(`/purchasing/orders/${poId}/status`, {
        status: targetStatus,
        supplierNote
      });

      if (res && res.success) {
        window.dispatchEvent(new Event('erp-purchase-orders-changed'));
        window.dispatchEvent(new Event('erp-qa-inspection-changed'));
      }
    } catch (err) {
      console.warn('API update failed; local QA state has been saved:', err);
    }

    // Send Notification to Supplier & Purchasing
    sendSystemNotification && sendSystemNotification({
      title: `[THÔNG BÁO GỬI NCC] Biên bản QA/QC: Đơn ${selectedPO.poNumber || poId}`,
      content: nccNoticeText,
      type: targetStatus === 'QA_PASSED' ? 'SUCCESS' : targetStatus === 'QA_PARTIAL' ? 'WARNING' : 'ERROR',
      recipient: selectedPO.supplier?.name || selectedPO.supplierCode || 'NCC',
      link: '/admin/quality-control',
      navState: { inspectionPO: selectedPO.poNumber || poId }
    });

    setSubmitting(false);
    setSelectedPO(null);
    alert(`🎉 Đã phát hành Biên bản QA/QC & Gửi Thông báo cho Nhà Cung Cấp thành công!\n\n• Trạng thái đơn: ${targetStatus === 'QA_PASSED' ? 'CHO NHẬP KHO 100%' : targetStatus === 'QA_PARTIAL' ? `NHẬP MỘT PHẦN (Cho nhập ${passedQty} SP đạt, Hoàn trả ${failedQty} SP lỗi)` : 'HOÀN TRẢ NCC 100%'}\n• Nội dung gửi NCC: "${nccNoticeText}"`);
  };

  const DEFECT_LABELS = {
    PACKAGE_DAMAGED: '📦 Móp hộp outer / Hỏng niêm phong',
    ELECTRICAL_POWER_FAIL: '⚡ Lỗi nguồn / Điện áp / Lỗi bo mạch',
    SERIAL_WARRANTY_MISSING: '🏷️ Thiếu tem bảo hành / Sai Serial',
    SPEC_MISMATCH: '⚙️ Trầy xước / Sai thông số kỹ thuật',
    COUNTERFEIT_FAKE: '🚫 Hàng không chính hãng / Lỗi linh kiện',
    NONE: '✅ Không có lỗi'
  };

  return (
    <div className="admin-page-container" style={{ padding: '1.5rem', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
        width: '100%'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.2rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#2563eb" />
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-title)', margin: 0, color: 'var(--text-primary)' }}>
              Phân Hệ Kiểm Định Chất Lượng (QA / QC Management)
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Kiểm tra chất lượng linh kiện NCC giao tới, phân loại lỗi, phê duyệt nhập kho hoặc khởi tạo phiếu hoàn trả NCC.
          </p>
        </div>

        <button 
          onClick={fetchData} 
          className="btn btn-secondary" 
          style={{ 
            padding: '0.55rem 1.1rem', 
            fontSize: '0.82rem', 
            borderRadius: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.45rem', 
            fontWeight: 700,
            cursor: 'pointer',
            marginLeft: 'auto',
            flexShrink: 0
          }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Tải lại dữ liệu
        </button>
      </div>

      {/* Task Notification Bar (Placed BELOW Page Header Banner) */}
      <ActorNotificationBar currentActor="QC" />

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="card-glass" style={{ padding: '1.25rem', borderRadius: '14px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Chờ Kiểm Định (Pending QA)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{pendingQaPOs.length} lô</span>
            <AlertTriangle size={26} color="#f59e0b" style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Hàng NCC đã về cảng chờ nghiệm thu</div>
        </div>

        <div className="card-glass" style={{ padding: '1.25rem', borderRadius: '14px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Đạt 100% Chất Lượng (Passed)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{passedQaPOs.length} lô</span>
            <CheckCircle size={26} color="#10b981" style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Đã phê duyệt đủ tiêu chuẩn nhập kho</div>
        </div>

        <div className="card-glass" style={{ padding: '1.25rem', borderRadius: '14px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Không Đạt / Trả NCC (Rejected)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{rejectedQaPOs.length} lô</span>
            <XCircle size={26} color="#ef4444" style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Hàng lỗi phát sinh biên bản hoàn trả</div>
        </div>

        <div className="card-glass" style={{ padding: '1.25rem', borderRadius: '14px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Tỷ Lệ Đạt Chất Lượng (Pass Rate)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{qaPOs.length > 0 ? Math.round(((passedQaPOs.length + partialQaPOs.reduce((sum, po) => { const log = [...qaLogs].reverse().find(l => l.poNumber === po.poNumber); return sum + (log?.totalQty ? Number(log.passedQty || 0) / Number(log.totalQty) : 0); }, 0)) / qaPOs.length) * 100) : 0}%</span>
            <Award size={26} color="#3b82f6" style={{ opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Chỉ số KPI kiểm định trung bình</div>
        </div>
      </div>

      {/* Main Inspection Queue Table */}
      <div className="card-glass" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={19} color="#2563eb" />
              Danh Sách Lô Hàng Cần Kiểm Định QA/QC
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Hàng do Nhà cung cấp (NCC) giao đến cần chuyên viên QA/QC kiểm định kỹ thuật trước khi kho thực hiện nhập hàng.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Tìm mã PO, tên Nhà Cung Cấp..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.1rem', height: '36px', fontSize: '0.83rem', borderRadius: '10px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'PENDING', label: 'Chờ kiểm định' },
                { key: 'PASSED', label: 'Đã đạt (Nhập kho)' },
                { key: 'REJECTED', label: 'Không đạt (Trả NCC)' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setStatusFilter(t.key)}
                  style={{
                    padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer',
                    backgroundColor: statusFilter === t.key ? '#2563eb' : 'transparent',
                    color: statusFilter === t.key ? '#ffffff' : '#64748b'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PO Queue Table */}
        <div className="table-container" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Mã PO / Ngày Tạo</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Nhà Cung Cấp (NCC)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Chi Tiết Sản Phẩm Lô Hàng</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Số Lượng</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Trạng Thái QA/QC</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '160px' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: '#2563eb' }} />
                    <div>Đang tải danh sách kiểm định...</div>
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    Không có lô hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const poId = po.id || po.poNumber;
                  const totalQty = po.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || po.quantity || 1;
                  const itemNames = po.items?.map(i => `${i.product?.name || i.name} (x${i.quantity})`).join(', ') || po.productName || 'Linh kiện';
                  const supName = po.supplier?.name || po.supplierCode || po.supplierName || 'Nhà Cung Cấp';

                  const isPendingQA = PENDING_QA_STATUSES.includes(po.status);
                  const isPassedQA = PASSED_QA_STATUSES.includes(po.status);
                  const isPartialQA = po.status === 'QA_PARTIAL';
                  const isRejectedQA = po.status === 'QA_REJECTED';
                  const poLog = qaLogs.find(log => log.poNumber === (po.poNumber || poId));

                  return (
                    <tr key={poId} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <strong style={{ color: '#2563eb', fontSize: '0.9rem' }}>{po.poNumber || poId}</strong>
                        <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>
                          📅 Hẹn giao: {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('vi-VN') : 'Đã giao tới cảng'}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building size={14} color="#64748b" /> {supName}
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Mã: {po.supplierCode || 'NCC'}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '300px' }}>
                        <div style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {itemNames}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                        {totalQty} cái
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {isPendingQA && (
                          <span style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={13} /> Chờ Kiểm Định
                          </span>
                        )}
                        {isPassedQA && (
                          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={13} /> Đạt Chất Lượng
                          </span>
                        )}
                        {isRejectedQA && (
                          <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={13} /> Trả Về NCC
                          </span>
                        )}
                        {isPartialQA && (
                          <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={13} /> Nhập một phần / Trả phần lỗi
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {isPendingQA ? (
                          <button
                            onClick={() => handleOpenInspectionModal(po)}
                            className="btn btn-primary"
                            style={{ padding: '0.45rem 0.8rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ShieldCheck size={14} /> Kiểm Định
                          </button>
                        ) : poLog ? (
                          <button
                            onClick={() => setViewingLog(poLog)}
                            className="btn btn-secondary"
                            style={{ padding: '0.45rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={14} /> Xem Biên Bản
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenInspectionModal(po)}
                            className="btn btn-secondary"
                            style={{ padding: '0.45rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ShieldCheck size={14} /> Kiểm định lại
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection History & Audit Trail */}
      <div className="card-glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="#2563eb" />
          Lịch Sử Biên Bản Kiểm Định Chất Lượng QA/QC (Audit Trail)
        </h3>

        <div className="table-container" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Mã BB / Ngày</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Đơn Mua Hàng</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Nhà Cung Cấp</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Chuyên Viên QA</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Số Lượng Đạt / Lỗi</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Phân Loại Lỗi & Ghi Chú</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Kết Luận</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {uniqueQaLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Chưa có biên bản kiểm định nào.</td>
                </tr>
              ) : (
                uniqueQaLogs.map(log => (
                  <tr 
                    key={log.id} 
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    className="hover-row"
                    onClick={() => setViewingLog(log)}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#2563eb' }}>
                      <span style={{ textDecoration: 'underline' }}>{log.id}</span>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.date}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{log.poNumber}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{log.supplierName}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569' }}>{log.inspector}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>{log.passedQty} Đạt</span> / <span style={{ color: '#dc2626', fontWeight: 800 }}>{log.failedQty} Lỗi</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', maxWidth: '280px' }}>
                      <div style={{ fontWeight: 600 }}>{DEFECT_LABELS[log.defectCategory] || log.defectCategory}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>{log.notes}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {(() => {
                        const info = getLogStatusInfo(log);
                        return (
                          <span style={{ backgroundColor: info.badgeBg, color: info.badgeColor, border: info.badgeBorder, padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-block' }}>
                            {info.badgeText}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setViewingLog(log)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                      >
                        <Eye size={14} /> Xem Chi Tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW QA LOG DETAILS MODAL */}
      {viewingLog && (() => {
        const info = getLogStatusInfo(viewingLog);
        const total = Number(viewingLog.totalQty || (Number(viewingLog.passedQty) + Number(viewingLog.failedQty)) || 1);
        const passed = Number(viewingLog.passedQty || 0);
        const failed = Number(viewingLog.failedQty || 0);
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;
        const failRate = 100 - passRate;

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem'
          }} onClick={() => setViewingLog(null)}>
            <div style={{
              width: '100%', maxWidth: '600px', backgroundColor: '#ffffff',
              borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }} onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '0.85rem 1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ShieldCheck size={20} color="#2563eb" />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Biên Bản QA/QC — #{viewingLog.id}
                    </h3>
                    <p style={{ margin: '1px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                      Ngày: <strong>{viewingLog.date}</strong> | Kiểm định viên: <strong>{viewingLog.inspector}</strong>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingLog(null)} 
                  style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '1rem 1.25rem', overflowY: 'auto' }}>
                {/* Conclusion Banner */}
                <div style={{
                  marginBottom: '0.85rem', padding: '0.65rem 0.85rem', borderRadius: '10px',
                  backgroundColor: info.bannerBg, border: info.bannerBorder,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 800, color: info.textColor }}>
                    {info.type === 'FULL_PASS' ? <CheckCircle size={17} color={info.iconColor} /> : info.type === 'PARTIAL' ? <AlertCircle size={17} color={info.iconColor} /> : <XCircle size={17} color={info.iconColor} />}
                    <span>{info.title}</span>
                  </div>
                  <span style={{ backgroundColor: info.badgeBg, color: info.badgeColor, border: info.badgeBorder, fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                    {info.badgeText}
                  </span>
                </div>

                {/* Key Information Grid (2x2) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', marginBottom: '0.85rem', fontSize: '0.8rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: '2px' }}>MÃ ĐƠN HÀNG (PO)</span>
                    <strong style={{ color: '#2563eb', fontSize: '0.88rem' }}>{viewingLog.poNumber}</strong>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: '2px' }}>NHÀ CUNG CẤP</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{viewingLog.supplierName}</strong>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: '2px' }}>CHUYÊN VIÊN QA</span>
                    <strong style={{ color: '#334155', fontSize: '0.85rem' }}>{viewingLog.inspector}</strong>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: '2px' }}>TỶ LỆ KIỂM MẪU</span>
                    <strong style={{ color: '#2563eb', fontSize: '0.85rem' }}>{viewingLog.sampleRate || '100%'}</strong>
                  </div>
                </div>

                {/* Quantity KPI Row + Progress Bar */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.78rem', fontWeight: 700 }}>
                    <span style={{ color: '#334155' }}>Thống Kê Số Lượng Nghiệm Thu</span>
                    <span style={{ color: passRate >= 90 ? '#15803d' : '#c2410c' }}>Tỷ lệ đạt: {passRate}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: '6px', borderRadius: '4px', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', marginBottom: '0.75rem' }}>
                    <div style={{ width: `${passRate}%`, backgroundColor: '#16a34a' }} />
                    <div style={{ width: `${failRate}%`, backgroundColor: '#dc2626' }} />
                  </div>

                  {/* 3 Compact KPI Boxes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', textAlign: 'center' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>TỔNG SỐ LƯỢNG</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{total} SP</div>
                    </div>

                    <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700 }}>🟢 SỐ LƯỢNG ĐẠT</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a' }}>{passed} SP</div>
                    </div>

                    <div style={{ padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '0.68rem', color: '#991b1b', fontWeight: 700 }}>🔴 SỐ LƯỢNG LỖI</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>{failed} SP</div>
                    </div>
                  </div>
                </div>

                {/* Defect Classification & Comment */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                    ⚠️ Nguyên Nhân Lỗi & Đánh Giá Kỹ Thuật:
                  </div>

                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: failed > 0 ? '#dc2626' : '#16a34a', marginBottom: '0.35rem' }}>
                    {DEFECT_LABELS[viewingLog.defectCategory] || viewingLog.defectCategory}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#475569', backgroundColor: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '8px', borderLeft: '3px solid #2563eb', fontStyle: 'italic' }}>
                    "{getLogSummary(viewingLog)}"
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', padding: '0.75rem 1.25rem', backgroundColor: '#f8fafc' }}>
                <button 
                  type="button" 
                  onClick={() => window.print()} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                >
                  <FileText size={14} /> In Biên Bản
                </button>
                <button 
                  type="button" 
                  onClick={() => setViewingLog(null)} 
                  className="btn btn-primary" 
                  style={{ padding: '0.45rem 1.2rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800, backgroundColor: '#0f172a', border: 'none', cursor: 'pointer', color: '#ffffff' }}
                >
                  Đóng Tệp
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* QA INSPECTION FORM MODAL */}
      {selectedPO && (() => {
        const totalQty = selectedPO.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || selectedPO.quantity || 1;
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
          }} onClick={() => setSelectedPO(null)}>
            <div style={{
              width: '100%', maxWidth: '600px', backgroundColor: '#ffffff',
              borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }} onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '0.85rem 1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ShieldCheck size={20} color="#2563eb" />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Lập Biên Bản Kiểm Định QA/QC
                    </h3>
                    <p style={{ margin: '1px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                      Đơn hàng: <strong style={{ color: '#2563eb' }}>#{selectedPO.poNumber || selectedPO.id}</strong>
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedPO(null)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '5px', borderRadius: '8px' }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitQaInspection} style={{ padding: '1rem 1.25rem', overflowY: 'auto' }}>
                {/* Meta Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.85rem', fontSize: '0.8rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>NHÀ CUNG CẤP</span>
                    <strong style={{ color: '#0f172a' }}>{selectedPO.supplier?.name || selectedPO.supplierCode || selectedPO.supplierName}</strong>
                  </div>
                  <div style={{ backgroundColor: '#eff6ff', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                    <span style={{ color: '#1e40af', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>TỔNG SỐ LƯỢNG LÔ HÀNG</span>
                    <strong style={{ color: '#2563eb' }}>{totalQty} sản phẩm</strong>
                  </div>
                </div>

                {/* Decision Options */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                    🎯 Quyết Định Kiểm Định QA/QC:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {[
                      { id: 'ACCEPT_ALL', label: '🟢 NHẬP 100%', desc: 'Đạt chuẩn 100%' },
                      { id: 'ACCEPT_PARTIAL', label: '🟠 NHẬP 1 PHẦN', desc: `Đạt: ${passedQty} | Lỗi: ${failedQty}` },
                      { id: 'REJECT_ALL', label: '🔴 TRẢ NCC 100%', desc: 'Không đạt' }
                    ].map(opt => (
                      <div
                        key={opt.id}
                        onClick={() => handleDecisionChange(opt.id, totalQty)}
                        style={{
                          padding: '0.6rem 0.4rem', borderRadius: '10px',
                          border: `1.5px solid ${inspectionDecision === opt.id ? (opt.id === 'ACCEPT_ALL' ? '#16a34a' : opt.id === 'ACCEPT_PARTIAL' ? '#ea580c' : '#dc2626') : '#e2e8f0'}`,
                          backgroundColor: inspectionDecision === opt.id ? (opt.id === 'ACCEPT_ALL' ? '#f0fdf4' : opt.id === 'ACCEPT_PARTIAL' ? '#fff7ed' : '#fef2f2') : '#ffffff',
                          cursor: 'pointer', textAlign: 'center'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.76rem', color: opt.id === 'ACCEPT_ALL' ? '#15803d' : opt.id === 'ACCEPT_PARTIAL' ? '#c2410c' : '#991b1b' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>{opt.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quantity Breakdown Inputs */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                        Tỷ Lệ Mẫu Test
                      </label>
                      <select
                        value={sampleRate}
                        onChange={e => setSampleRate(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a' }}
                      >
                        <option value="100%">Kiểm tra 100%</option>
                        <option value="50%">Lấy mẫu 50%</option>
                        <option value="10%">Lấy mẫu 10%</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '0.2rem' }}>
                        🟢 Số Lượng Đạt
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={totalQty}
                        value={passedQty}
                        onChange={e => handlePassedQtyInputChange(e.target.value, totalQty)}
                        className="form-input"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, color: '#16a34a', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.2rem' }}>
                        🔴 Số Lượng Lỗi
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={totalQty}
                        value={failedQty}
                        onChange={e => handleFailedQtyInputChange(e.target.value, totalQty)}
                        className="form-input"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, color: '#dc2626', border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 700, borderTop: '1px dashed #cbd5e1', paddingTop: '0.45rem' }}>
                    <span style={{ color: '#15803d' }}>Đạt: {totalQty ? Math.round((passedQty / totalQty) * 100) : 0}%</span>
                    <span style={{ color: '#b91c1c' }}>Lỗi: {totalQty ? Math.round((failedQty / totalQty) * 100) : 0}%</span>
                    <span style={{ color: '#64748b' }}>Tổng: {passedQty + failedQty}/{totalQty} SP</span>
                  </div>
                </div>

                {/* Defect Category selector if failedQty > 0 */}
                {failedQty > 0 && (
                  <div style={{ marginBottom: '0.85rem', backgroundColor: '#fff5f5', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.3rem' }}>
                      ⚠️ Phân loại nguyên nhân lỗi:
                    </label>
                    <select
                      value={defectCategory}
                      onChange={e => setDefectCategory(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', fontSize: '0.82rem', border: '1px solid #fecaca', backgroundColor: '#ffffff', color: '#991b1b', fontWeight: 700 }}
                    >
                      <option value="PACKAGE_DAMAGED">📦 Móp hộp outer / Hỏng niêm phong đóng gói</option>
                      <option value="ELECTRICAL_POWER_FAIL">⚡ Lỗi nguồn / Điện áp / Lỗi bo mạch không lên</option>
                      <option value="SERIAL_WARRANTY_MISSING">🏷️ Thiếu tem bảo hành chính hãng / Sai Serial Number</option>
                      <option value="SPEC_MISMATCH">⚙️ Trầy xước / Sai thông số kỹ thuật (Wrong Specs)</option>
                      <option value="COUNTERFEIT_FAKE">🚫 Hàng nghi ngờ nhái / Không đúng mô tả</option>
                    </select>
                  </div>
                )}

                {/* Detailed Inspection Notes */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '0.3rem' }}>
                    📝 Ghi chú biên bản QA/QC:
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Nhập ghi chú chi tiết..."
                    value={qcNotes}
                    onChange={e => setQcNotes(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', fontSize: '0.82rem', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a' }}
                  />
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                  <button type="button" onClick={() => setSelectedPO(null)} className="btn btn-secondary" style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                    Hủy Bỏ
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1.25rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800, backgroundColor: '#2563eb', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }} disabled={submitting}>
                    <ShieldCheck size={15} /> Lưu & Phát Hành Biên Bản
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
