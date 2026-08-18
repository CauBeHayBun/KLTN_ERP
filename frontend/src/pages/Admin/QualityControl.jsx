import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
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
import { 
  ShieldCheck, ShieldAlert, CheckCircle, XCircle, AlertTriangle, 
  Package, Search, Eye, Filter, RefreshCw, Truck, FileText, 
  Check, X, ChevronRight, Award, BarChart2, Calendar, User, Building, 
  AlertCircle, ArrowRight, Printer, CheckSquare, Layers, Clock, ThumbsUp, ThumbsDown
} from 'lucide-react';

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

const DEFECT_LABELS = {
  PACKAGE_DAMAGED: '📦 Móp hộp outer / Rách seal niêm phong',
  ELECTRICAL_POWER_FAIL: '⚡ Lỗi nguồn / Không lên điện / Lỗi mạch',
  SERIAL_WARRANTY_MISSING: '🏷️ Thiếu tem bảo hành / Sai mã Serial',
  SPEC_MISMATCH: '⚙️ Trầy xước / Sai thông số kỹ thuật',
  COUNTERFEIT_FAKE: '🚫 Hàng không chính hãng / Lỗi phụ kiện',
  NONE: '✅ Đạt tiêu chuẩn hoàn hảo'
};

export default function QualityControl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth() || {};
  const { 
    purchaseOrders = [], 
    updatePurchaseOrderStatus, 
    sendSystemNotification, 
    returnRequests = [] 
  } = useERP() || {};

  // Active Tab from URL (?tab=overview|inbound|returns|logs|reports)
  const activeTab = searchParams.get('tab') || 'overview';
  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for QA Inbound Inspection
  const [selectedPO, setSelectedPO] = useState(null);
  const [inspectionDecision, setInspectionDecision] = useState('ACCEPT_ALL');
  const [passedQty, setPassedQty] = useState(0);
  const [failedQty, setFailedQty] = useState(0);
  const [defectCategory, setDefectCategory] = useState('PACKAGE_DAMAGED');
  const [qcNotes, setQcNotes] = useState('');
  const [sampleRate, setSampleRate] = useState('100%');

  // Selected Log for Details Modal
  const [viewingLog, setViewingLog] = useState(null);

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
        },
        {
          id: 'QA-2026-002',
          poNumber: 'PO-2026-0006',
          supplierName: 'GIGABYTE Technology',
          inspector: 'Trần Văn QA',
          date: '16/06/2026',
          totalQty: 30,
          passedQty: 28,
          failedQty: 2,
          decision: 'ACCEPT_PARTIAL',
          defectCategory: 'PACKAGE_DAMAGED',
          notes: 'Phát hiện 2 bo mạch chủ bị móp góc hộp khi vận chuyển, đã lập biên bản hoàn trả NCC.',
          status: 'QA_PARTIAL'
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
      console.warn('API error, using fallback:', e);
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

  const saveQaLogs = (newLogs) => {
    const deduped = newLogs.filter((log, index, all) =>
      index === all.findIndex(item => item.poNumber === log.poNumber)
    );
    setQaLogs(deduped);
    localStorage.setItem('erp_qa_inspection_logs', JSON.stringify(deduped));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const PENDING_QA_STATUSES = ['CONFIRMED_BY_SUPPLIER', 'PO', 'APPROVED', 'PENDING_QA', 'SHIPPED', 'DELIVERED', 'RFQ_SENT', 'SENT'];
  const PASSED_QA_STATUSES = ['QA_PASSED', 'DONE', 'COMPLETED', 'RECEIVED'];
  const REJECTED_QA_STATUSES = ['QA_REJECTED', 'QA_PARTIAL'];

  const pendingQaPOs = orders.filter(po => PENDING_QA_STATUSES.includes(po.status));
  const passedQaPOs = orders.filter(po => PASSED_QA_STATUSES.includes(po.status));
  const partialQaPOs = orders.filter(po => po.status === 'QA_PARTIAL');
  const rejectedQaPOs = orders.filter(po => po.status === 'QA_REJECTED');

  const totalInspected = passedQaPOs.length + partialQaPOs.length + rejectedQaPOs.length;
  const passRate = totalInspected > 0 ? Math.round(((passedQaPOs.length + partialQaPOs.length * 0.8) / totalInspected) * 100) : 98;

  // 6 Balanced KPI Cards (2 Rows x 3 Columns)
  const stats = [
    { label: 'Chờ Nghiệm Thu (PO)', value: `${pendingQaPOs.length} lô hàng`, change: 'Từ nhà cung cấp giao tới', icon: <Clock size={20} />, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Đạt Chuẩn Nhập Kho 100%', value: `${passedQaPOs.length} lô hàng`, change: 'Cho phép nhập kho toàn bộ', icon: <CheckCircle size={20} />, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Nghiệm Thu Một Phần', value: `${partialQaPOs.length} lô hàng`, change: 'Nhận SP đạt & Trả SP lỗi', icon: <AlertTriangle size={20} />, color: '#ea580c', bg: '#fff7ed' },
    { label: 'Hoàn Trả NCC 100%', value: `${rejectedQaPOs.length} lô hàng`, change: 'Từ chối toàn bộ do lỗi nặng', icon: <XCircle size={20} />, color: '#ef4444', bg: '#fef2f2' },
    { label: 'Tỷ Lệ Đạt Chuẩn QA', value: `${passRate}%`, change: 'Mục tiêu kiểm định >= 95%', icon: <Award size={20} />, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Đổi Trả Khách (RMA)', value: `${returnRequests.length || 3} yêu cầu`, change: 'Thẩm định lỗi phần cứng', icon: <ShieldAlert size={20} />, color: '#8b5cf6', bg: '#f5f3ff' }
  ];

  // Defect Distribution Chart Data
  const defectChartData = {
    labels: ['Móp Hộp / Rách Seal', 'Lỗi Nguồn / Mạch Điện', 'Thiếu Tem / Sai Serial', 'Sai Thông Số', 'Lỗi Khác'],
    datasets: [
      {
        data: [4, 2, 3, 1, 1],
        backgroundColor: ['#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#64748b']
      }
    ]
  };

  // Weekly Inspection Pass vs Fail Chart
  const weeklyChartData = {
    labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4 (Hiện tại)'],
    datasets: [
      {
        label: 'Sản Phẩm Đạt Chuẩn (Passed)',
        data: [140, 185, 210, 195],
        backgroundColor: '#16a34a'
      },
      {
        label: 'Sản Phẩm Lỗi (Defective)',
        data: [4, 6, 3, 5],
        backgroundColor: '#ef4444'
      }
    ]
  };

  // Open Inspection Modal
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

  // Decision & Qty sync
  const handleDecisionChange = (dec, total) => {
    setInspectionDecision(dec);
    if (dec === 'ACCEPT_ALL') {
      setPassedQty(total);
      setFailedQty(0);
    } else if (dec === 'REJECT_ALL') {
      setPassedQty(0);
      setFailedQty(total);
    } else if (dec === 'ACCEPT_PARTIAL') {
      const p = Math.max(0, total - 1);
      const f = total > 1 ? 1 : 0;
      setPassedQty(p);
      setFailedQty(f);
    }
  };

  const handlePassedQtyChange = (val, total) => {
    const p = Math.max(0, Math.min(total, parseInt(val, 10) || 0));
    const f = total - p;
    setPassedQty(p);
    setFailedQty(f);
    if (p === total) setInspectionDecision('ACCEPT_ALL');
    else if (p === 0) setInspectionDecision('REJECT_ALL');
    else setInspectionDecision('ACCEPT_PARTIAL');
  };

  const handleFailedQtyChange = (val, total) => {
    const f = Math.max(0, Math.min(total, parseInt(val, 10) || 0));
    const p = total - f;
    setPassedQty(p);
    setFailedQty(f);
    if (f === 0) setInspectionDecision('ACCEPT_ALL');
    else if (f === total) setInspectionDecision('REJECT_ALL');
    else setInspectionDecision('ACCEPT_PARTIAL');
  };

  // Submit QA Inspection
  const handleSubmitQaInspection = async (e) => {
    e.preventDefault();
    if (!selectedPO) return;

    const poId = selectedPO.id || selectedPO.poNumber;
    const totalQty = selectedPO.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || selectedPO.quantity || 1;

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
      notes: qcNotes || (targetStatus === 'QA_PASSED' ? 'Lô hàng đạt tiêu chuẩn nhập kho.' : targetStatus === 'QA_PARTIAL' ? `Nghiệm thu nhập ${passedQty} sản phẩm đạt, hoàn trả ${failedQty} sản phẩm lỗi.` : 'Không đạt tiêu chuẩn, yêu cầu hoàn trả NCC.'),
      status: targetStatus
    };

    const nccNoticeText = targetStatus === 'QA_PASSED'
      ? `Lô hàng ${selectedPO.poNumber || poId} đạt 100% chất lượng (${passedQty}/${totalQty} SP). Đã cho nhập kho toàn bộ.`
      : targetStatus === 'QA_PARTIAL'
        ? `Lô hàng ${selectedPO.poNumber || poId} nghiệm thu NHẬP MỘT PHẦN: Đã nhận ${passedQty}/${totalQty} SP đạt chuẩn. Phát hiện ${failedQty}/${totalQty} SP lỗi (${DEFECT_LABELS[defectCategory] || defectCategory}). Đề nghị NCC nhận lại ${failedQty} SP lỗi!`
        : `Lô hàng ${selectedPO.poNumber || poId} KHÔNG ĐẠT CHẤT LƯỢNG (${failedQty}/${totalQty} SP lỗi: ${DEFECT_LABELS[defectCategory] || defectCategory}). Yêu cầu NCC nhận lại 100% lô hàng!`;

    const supplierNote = `[THÔNG BÁO HOÀN TRẢ NCC - QA/QC]: ${nccNoticeText}`;
    const updatedPO = { ...selectedPO, status: targetStatus, supplierNote };

    setOrders(current => current.map(po =>
      po.poNumber === selectedPO.poNumber || String(po.id) === String(poId) ? updatedPO : po
    ));
    if (typeof updatePurchaseOrderStatus === 'function') {
      updatePurchaseOrderStatus(poId, targetStatus, { supplierNote });
    }
    
    saveQaLogs([logEntry, ...qaLogs]);

    try {
      await api.patch(`/purchasing/orders/${poId}/status`, {
        status: targetStatus,
        supplierNote
      });
    } catch (err) {
      console.warn('API sync warn:', err);
    }

    if (typeof sendSystemNotification === 'function') {
      sendSystemNotification({
        title: `[BIÊN BẢN QA/QC] Đơn Hàng ${selectedPO.poNumber || poId}`,
        content: nccNoticeText,
        type: targetStatus === 'QA_PASSED' ? 'SUCCESS' : targetStatus === 'QA_PARTIAL' ? 'WARNING' : 'ERROR',
        recipient: selectedPO.supplier?.name || 'NCC'
      });
    }

    setSubmitting(false);
    setSelectedPO(null);
    alert(`🎉 Đã phát hành Biên bản QA/QC thành công!\n\n• Kết luận: ${targetStatus === 'QA_PASSED' ? 'CHO NHẬP KHO 100%' : targetStatus === 'QA_PARTIAL' ? `NHẬP MỘT PHẦN (Cho nhập ${passedQty} SP đạt, Hoàn trả ${failedQty} SP lỗi)` : 'HOÀN TRẢ NCC 100%'}`);
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={24} style={{ color: '#2563eb' }} />
            {activeTab === 'overview' && 'Tổng Quan Kiểm Định Chất Lượng (QA / QC Dashboard)'}
            {activeTab === 'inbound' && 'Kiểm Định Hàng Nhập Từ Nhà Cung Cấp (Inbound Inspection)'}
            {activeTab === 'returns' && 'Thẩm Định Hàng Đổi Trả Khách Hàng (Customer RMA)'}
            {activeTab === 'logs' && 'Nhật Ký & Biên Bản Nghiệm Thu Chất Lượng (Inspection Logs)'}
            {activeTab === 'reports' && 'Báo Cáo Chất Lượng & Đánh Giá Nhà Cung Cấp (Vendor Quality)'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
            Hệ thống kiểm soát chất lượng linh kiện đầu vào, phân loại lỗi và thẩm định hàng bảo hành đổi trả
          </p>
        </div>

        <button
          onClick={fetchData}
          style={{
            backgroundColor: '#ffffff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '0.45rem 0.9rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <RefreshCw size={14} />
          <span>Làm Mới Dữ Liệu</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* QC TASK BANNER */}
      {/* ========================================================================= */}
      {pendingQaPOs.length > 0 && (
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
              <ShieldAlert size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem', color: '#92400e' }}>
                  Có {pendingQaPOs.length} Lô Hàng PO Vừa Giao Tới Đang Chờ Nghiệm Thu QA/QC
                </strong>
                <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '10px' }}>
                  Cần xử lý
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#b45309' }}>
                Tiến hành kiểm tra ngoại quan, seal niêm phong và Serial Number trước khi cho nhập kho.
              </p>
            </div>
          </div>

          <button
            onClick={() => setTab('inbound')}
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
            <span>Vào Kiểm Định Ngay</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (TỔNG QUAN KIỂM ĐỊNH) */}
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
            {/* Defect Categories Chart */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', height: '320px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Phân Loại Các Dạng Lỗi Linh Kiện
              </h3>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut
                  data={defectChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
                  }}
                />
              </div>
            </div>

            {/* Weekly Pass Rate Chart */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', height: '320px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Khối Lượng Linh Kiện Đạt Chuẩn vs Lỗi Theo Tuần
              </h3>
              <div style={{ flex: 1, position: 'relative' }}>
                <Bar
                  data={weeklyChartData}
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

          {/* Quick Actions & Recent Inspections Preview */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Biên Bản Kiểm Định Gần Đây Nhất
              </h3>
              <button onClick={() => setTab('logs')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                Xem toàn bộ nhật ký →
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '0.5rem 0.65rem' }}>Mã QA</th>
                    <th style={{ padding: '0.5rem 0.65rem' }}>Mã PO</th>
                    <th style={{ padding: '0.5rem 0.65rem' }}>Nhà Cung Cấp</th>
                    <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Đạt / Tổng</th>
                    <th style={{ padding: '0.5rem 0.65rem' }}>Kết Luận</th>
                  </tr>
                </thead>
                <tbody>
                  {qaLogs.slice(0, 4).map((log, lIdx) => (
                    <tr key={lIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#2563eb' }}>{log.id}</td>
                      <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>{log.poNumber}</td>
                      <td style={{ padding: '0.5rem 0.65rem' }}>{log.supplierName}</td>
                      <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>
                        <span style={{ color: '#16a34a' }}>{log.passedQty}</span> / {log.totalQty}
                      </td>
                      <td style={{ padding: '0.5rem 0.65rem' }}>
                        <span style={{
                          backgroundColor: log.status === 'QA_PASSED' ? '#f0fdf4' : log.status === 'QA_PARTIAL' ? '#fff7ed' : '#fef2f2',
                          color: log.status === 'QA_PASSED' ? '#15803d' : log.status === 'QA_PARTIAL' ? '#c2410c' : '#dc2626',
                          border: `1px solid ${log.status === 'QA_PASSED' ? '#bbf7d0' : log.status === 'QA_PARTIAL' ? '#fed7aa' : '#fecaca'}`,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}>
                          {log.status === 'QA_PASSED' ? 'CHO NHẬP KHO 100%' : log.status === 'QA_PARTIAL' ? 'NHẬP 1 PHẦN' : 'HOÀN TRẢ NCC'}
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

      {/* ========================================================================= */}
      {/* TAB 2: INBOUND (KIỂM ĐỊNH HÀNG NHẬP NCC) */}
      {/* ========================================================================= */}
      {activeTab === 'inbound' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '350px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Tìm theo mã PO, tên nhà cung cấp..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
                <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'PENDING', label: `Chờ kiểm định (${pendingQaPOs.length})` },
                { key: 'PASSED', label: 'Đã nghiệm thu' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: statusFilter === f.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: statusFilter === f.key ? '#2563eb' : '#ffffff',
                    color: statusFilter === f.key ? '#ffffff' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* PO List Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Mã Đơn PO</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Nhà Cung Cấp</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Số Lượng</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Giá Trị Lô Hàng</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Trạng Thái QA</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {orders
                  .filter(po => {
                    const matchesSearch = !searchTerm || (po.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) || (po.supplier?.name || po.supplierCode || '').toLowerCase().includes(searchTerm.toLowerCase());
                    if (statusFilter === 'PENDING') return matchesSearch && PENDING_QA_STATUSES.includes(po.status);
                    if (statusFilter === 'PASSED') return matchesSearch && PASSED_QA_STATUSES.includes(po.status);
                    return matchesSearch;
                  })
                  .map(po => {
                    const totalQty = po.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || po.quantity || 1;
                    const isPending = PENDING_QA_STATUSES.includes(po.status);
                    return (
                      <tr key={po.id || po.poNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#2563eb' }}>
                          {po.poNumber || `PO-${po.id}`}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>
                          {po.supplier?.name || po.supplierCode || 'Nhà Cung Cấp'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 600 }}>
                          {totalQty} chiếc
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {formatPrice(po.totalAmount)}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: isPending ? '#fffbeb' : po.status === 'QA_PASSED' ? '#f0fdf4' : '#fff7ed',
                            color: isPending ? '#b45309' : po.status === 'QA_PASSED' ? '#15803d' : '#c2410c',
                            border: `1px solid ${isPending ? '#fde68a' : po.status === 'QA_PASSED' ? '#bbf7d0' : '#fed7aa'}`,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            {isPending ? 'CHỜ NGHIỆM THU' : po.status === 'QA_PASSED' ? 'CHO NHẬP KHO 100%' : 'NHẬP 1 PHẦN'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          {isPending ? (
                            <button
                              onClick={() => handleOpenInspectionModal(po)}
                              style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <ShieldCheck size={14} /> Kiểm Định Ngay
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const log = qaLogs.find(l => l.poNumber === (po.poNumber || po.id));
                                if (log) setViewingLog(log);
                                else alert('Đã hoàn tất kiểm định cho đơn này.');
                              }}
                              style={{ backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Xem Biên Bản
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RETURNS (THẨM ĐỊNH HÀNG ĐỔI TRẢ KHÁCH) */}
      {/* ========================================================================= */}
      {activeTab === 'returns' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldAlert size={18} style={{ color: '#8b5cf6' }} />
            <span>Thẩm Định Lỗi Phần Cứng & Điều Kiện Bảo Hành Khách Hàng (RMA)</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(returnRequests.length > 0 ? returnRequests : [
              { id: 'RMA-901', customerName: 'Hoàng Minh Tuấn', phone: '0912345678', product: 'VGA ASUS RTX 4070 Dual', serial: 'SN-VGA-4070-8891', reason: 'Không lên hình, quạt không quay sau 2 ngày dùng', status: 'PENDING_QA' },
              { id: 'RMA-902', customerName: 'Lê Thùy Dung', phone: '0988776655', product: 'Nguồn Corsair RM850e 850W', serial: 'SN-PSU-850W-1102', reason: 'Có tiếng kêu rè rè ở quạt tản nhiệt', status: 'PENDING_QA' }
            ]).map((rma, rIdx) => (
              <div key={rIdx} style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#2563eb' }}>{rma.id}</strong>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>- {rma.product}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem' }}>
                    Khách hàng: <strong>{rma.customerName}</strong> ({rma.phone}) | Serial: <code>{rma.serial}</code>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.2rem' }}>
                    Mô tả lỗi: <em>"{rma.reason}"</em>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => alert(`✅ Đã phê duyệt ĐỔI MỚI 1-1 cho khách ${rma.customerName} (Linh kiện đủ điều kiện bảo hành 36 tháng).`)}
                    style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <ThumbsUp size={13} /> Duyệt Đổi Mới 1-1
                  </button>
                  <button
                    onClick={() => alert(`🚚 Đã tạo phiếu chuyển tiếp linh kiện lỗi ${rma.serial} về Trung Tâm Bảo Hành Hãng.`)}
                    style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Truck size={13} /> Gửi Hãng Bảo Hành
                  </button>
                  <button
                    onClick={() => alert(`❌ Đã từ chối đổi trả (Linh kiện có dấu hiệu cháy nổ/vào nước ngoài phạm vi bảo hành).`)}
                    style={{ backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '4px', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <ThumbsDown size={13} /> Từ Chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LOGS (NHẬT KÝ & BIÊN BẢN QA) */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={18} style={{ color: '#2563eb' }} />
              <span>Nhật Ký & Hồ Sơ Biên Bản Kiểm Định Chất Lượng</span>
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Mã Biên Bản</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Mã PO</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Nhà Cung Cấp</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Kiểm Định Viên</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Số Lượng Đạt / Lỗi</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Dạng Lỗi</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {qaLogs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#2563eb' }}>{log.id}</td>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>{log.poNumber}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>{log.supplierName}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>{log.inspector}</td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <strong style={{ color: '#16a34a' }}>{log.passedQty}</strong> / <span style={{ color: '#ef4444' }}>{log.failedQty}</span> (Tổng: {log.totalQty})
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      {DEFECT_LABELS[log.defectCategory] || log.defectCategory}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <button
                        onClick={() => setViewingLog(log)}
                        style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Eye size={13} /> Xem Chi Tiết
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
      {/* TAB 5: REPORTS (BÁO CÁO & ĐÁNH GIÁ NHÀ CUNG CẤP) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.25rem' }}>
          
          {/* Supplier Quality Scorecard */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Award size={18} style={{ color: '#f59e0b' }} />
              <span>Bảng Điểm Chất Lượng Nhà Cung Cấp (Vendor Quality Scorecard)</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { name: 'ASUS Vietnam', tier: 'Tier 1 - Vàng', passRate: '99.2%', orders: 15, rankColor: '#16a34a' },
                { name: 'Corsair International', tier: 'Tier 1 - Vàng', passRate: '98.5%', orders: 12, rankColor: '#16a34a' },
                { name: 'GIGABYTE Technology', tier: 'Tier 2 - Bạc', passRate: '95.0%', orders: 8, rankColor: '#2563eb' },
                { name: 'MSI Vietnam', tier: 'Tier 2 - Bạc', passRate: '94.2%', orders: 10, rankColor: '#2563eb' },
                { name: 'Kingston Technology', tier: 'Tier 1 - Vàng', passRate: '99.0%', orders: 18, rankColor: '#16a34a' }
              ].map((sup, sIdx) => (
                <div key={sIdx} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{sup.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: sup.rankColor, fontWeight: 700, marginLeft: '0.5rem' }}>
                      [{sup.tier}]
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a' }}>{sup.passRate}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{sup.orders} đợt giao</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Component Defect Frequency */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={18} style={{ color: '#ea580c' }} />
              <span>Tần Suất Phát Hiện Lỗi Theo Nhóm Linh Kiện</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { cat: 'Card Đồ Họa (VGA)', total: 85, defects: 2, rate: '2.3%', mainReason: 'Móp vỏ hộp khi vận chuyển' },
                { cat: 'Bo Mạch Chủ (Mainboard)', total: 60, defects: 3, rate: '5.0%', mainReason: 'Cong chân socket / Thiếu seal' },
                { cat: 'Nguồn Máy Tính (PSU)', total: 45, defects: 1, rate: '2.2%', mainReason: 'Tiếng ồn quạt tản nhiệt' },
                { cat: 'Bộ Nhớ RAM & Ổ Cứng SSD', total: 150, defects: 1, rate: '0.6%', mainReason: 'Thiếu tem bảo hành' }
              ].map((c, cIdx) => (
                <div key={cIdx} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{c.cat}</strong>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ef4444' }}>Tỷ lệ lỗi: {c.rate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>Kiểm tra: {c.total} SP (Phát hiện {c.defects} lỗi)</span>
                    <span>Lỗi phổ biến: <em>{c.mainReason}</em></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ================= MODAL KIỂM ĐỊNH HÀNG NHẬP PO ================= */}
      {selectedPO && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldCheck size={22} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Biên Bản Kiểm Định Chất Lượng Lô Hàng {selectedPO.poNumber || `PO-${selectedPO.id}`}
                </h3>
              </div>
              <button onClick={() => setSelectedPO(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitQaInspection}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
                <div>Nhà Cung Cấp: <strong>{selectedPO.supplier?.name || selectedPO.supplierCode}</strong></div>
                <div>Tổng Số Lượng Linh Kiện: <strong style={{ color: '#2563eb', fontSize: '0.95rem' }}>{selectedPO.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || selectedPO.quantity || 1} chiếc</strong></div>
              </div>

              {/* Decision Choice */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.4rem' }}>
                  Quyết Định Nghiệm Thu QA/QC:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { key: 'ACCEPT_ALL', label: '✓ Cho Nhập Kho 100%', color: '#16a34a', bg: '#f0fdf4' },
                    { key: 'ACCEPT_PARTIAL', label: '⚠️ Nhập Một Phần & Trả Lỗi', color: '#ea580c', bg: '#fff7ed' },
                    { key: 'REJECT_ALL', label: '✕ Hoàn Trả NCC 100%', color: '#ef4444', bg: '#fef2f2' }
                  ].map(d => {
                    const total = selectedPO.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || selectedPO.quantity || 1;
                    const active = inspectionDecision === d.key;
                    return (
                      <button
                        type="button"
                        key={d.key}
                        onClick={() => handleDecisionChange(d.key, total)}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: '6px',
                          border: active ? `2px solid ${d.color}` : '1px solid #cbd5e1',
                          backgroundColor: active ? d.bg : '#ffffff',
                          color: active ? d.color : '#475569',
                          fontWeight: active ? 800 : 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantities Inputs */}
              {(() => {
                const total = selectedPO.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || selectedPO.quantity || 1;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', display: 'block', marginBottom: '0.3rem' }}>
                        Số Lượng Đạt Tiêu Chuẩn (Passed):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={total}
                        value={passedQty}
                        onChange={e => handlePassedQtyChange(e.target.value, total)}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.9rem', fontWeight: 800, color: '#15803d' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '0.3rem' }}>
                        Số Lượng Không Đạt / Lỗi (Defective):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={total}
                        value={failedQty}
                        onChange={e => handleFailedQtyChange(e.target.value, total)}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '0.9rem', fontWeight: 800, color: '#dc2626' }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Defect Category */}
              {failedQty > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.3rem' }}>
                    Phân Loại Nguyên Nhân Lỗi:
                  </label>
                  <select
                    value={defectCategory}
                    onChange={e => setDefectCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a' }}
                  >
                    <option value="PACKAGE_DAMAGED">📦 Móp hộp outer / Rách seal niêm phong</option>
                    <option value="ELECTRICAL_POWER_FAIL">⚡ Lỗi nguồn / Không lên điện / Lỗi mạch</option>
                    <option value="SERIAL_WARRANTY_MISSING">🏷️ Thiếu tem bảo hành / Sai mã Serial</option>
                    <option value="SPEC_MISMATCH">⚙️ Trầy xước / Sai thông số kỹ thuật</option>
                    <option value="COUNTERFEIT_FAKE">🚫 Hàng không chính hãng / Lỗi linh kiện</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.3rem' }}>
                  Ghi Chú Kỹ Thuật Kiểm Định:
                </label>
                <textarea
                  rows="3"
                  value={qcNotes}
                  onChange={e => setQcNotes(e.target.value)}
                  placeholder="Ghi chú chi tiết về tình trạng linh kiện hoặc lý do từ chối..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPO(null)}
                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Check size={16} /> Phát Hành Biên Bản QA
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL XEM CHI TIẾT BIÊN BẢN QA ================= */}
      {viewingLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={22} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Hồ Sơ Nghiệm Thu Kỹ Thuật {viewingLog.id}
                </h3>
              </div>
              <button onClick={() => setViewingLog(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div>Đơn Hàng Mua: <strong>{viewingLog.poNumber}</strong></div>
              <div>Nhà Cung Cấp: <strong>{viewingLog.supplierName}</strong></div>
              <div>Kiểm Định Viên: <strong>{viewingLog.inspector}</strong> - Ngày: {viewingLog.date}</div>
              <div>Kết Quả: <strong style={{ color: '#16a34a' }}>{viewingLog.passedQty} ĐẠT</strong> / <strong style={{ color: '#ef4444' }}>{viewingLog.failedQty} LỖI</strong> (Tổng: {viewingLog.totalQty} SP)</div>
              <div>Phân Loại Lỗi: <strong>{DEFECT_LABELS[viewingLog.defectCategory] || viewingLog.defectCategory}</strong></div>
              <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid #e2e8f0' }}>
                Ghi chú: <em>"{viewingLog.notes}"</em>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <button
                onClick={() => {
                  window.print();
                }}
                style={{ backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Printer size={15} /> In Biên Bản
              </button>
              <button
                onClick={() => setViewingLog(null)}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
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
