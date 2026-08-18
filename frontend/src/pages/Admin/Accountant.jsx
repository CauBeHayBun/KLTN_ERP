import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  DollarSign, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle, ShoppingBag, 
  Search, PlusCircle, Download, X, Eye, Printer, Calendar, CreditCard, Users, 
  Building2, ArrowRightLeft, ShieldCheck, Check, RefreshCw, FileCheck, PieChart, TrendingUp, Filter, AlertTriangle, Send
} from 'lucide-react';
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

export default function Accountant() {
  const { isCEO } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  
  // Active Tab from URL (?tab=overview|ledger|po_payments|payroll_disbursement|reports)
  const activeTab = searchParams.get('tab') || 'overview';
  const setTab = (tKey) => {
    setSearchParams({ tab: tKey });
    setSearch('');
  };

  const { 
    ledger = [], 
    employees = [], 
    purchaseOrders = [], 
    paySupplierPO, 
    addLedgerEntry, 
    payrolls = [], 
    disbursePayroll,
    disburseAllPayrolls,
    returnRequests = []
  } = useERP();

  const [allPOs, setAllPOs] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Manual Entry Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    type: 'EXPENSE',
    amount: '',
    category: 'Vận hành văn phòng',
    description: ''
  });

  // Selected details
  const [viewingTxDetail, setViewingTxDetail] = useState(null);
  const [viewingPODetail, setViewingPODetail] = useState(null);

  const fetchBackendPOs = async () => {
    try {
      const res = await api.get('/purchasing/orders');
      if (res && res.success) {
        setAllPOs(res.data || []);
      }
    } catch (e) {
      console.warn('Accountant PO fetch error:', e);
    }
  };

  useEffect(() => {
    fetchBackendPOs();
  }, [purchaseOrders]);

  const fmt = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  // Financial Metric Calculations
  const totalRevenue = (ledger || [])
    .filter(tx => tx && tx.type === 'INCOME')
    .reduce((sum, tx) => sum + (Number(tx.amount || 0) || 0), 0);

  const totalExpense = (ledger || [])
    .filter(tx => tx && (tx.type === 'EXPENSE' || tx.type === 'EXPENSE_PAYROLL' || tx.type === 'EXPENSE_PO' || tx.type === 'EXPENSE_REFUND'))
    .reduce((sum, tx) => sum + (Number(tx.amount || 0) || 0), 0);

  const netProfit = totalRevenue - totalExpense;
  const cashBalance = 450000000 + netProfit; // Base capital + Net profit

  const effectivePOs = allPOs.length > 0 ? allPOs : purchaseOrders;
  const unpaidPOs = effectivePOs.filter(po => po && po.paymentStatus !== 'PAID');
  const unpaidPOAmount = unpaidPOs.reduce((sum, po) => sum + (Number(po.totalAmount || po.totalCost || 0) || 0), 0);

  const totalPayrollFund = payrolls.reduce((sum, p) => sum + (Number(p.totalAmount || 0) || 0), 0) || (employees.reduce((s, e) => s + (Number(e.salary || e.baseSalary || 8500000) || 8500000), 0));

  const stats = [
    { label: 'Tổng Doanh Thu Bán Hàng', value: fmt(totalRevenue), change: 'Bao gồm POS & Website Online', icon: <ArrowUpRight size={20} />, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Tổng Chi Phí Hoạt Động', value: fmt(totalExpense), change: 'Giá vốn, lương & mua linh kiện', icon: <ArrowDownLeft size={20} />, color: '#ef4444', bg: '#fef2f2' },
    { label: 'Lợi Nhuận Ròng (Net Profit)', value: fmt(netProfit), change: netProfit >= 0 ? 'Tỷ suất lợi nhuận dương' : 'Cần tối ưu chi phí', icon: <DollarSign size={20} />, color: netProfit >= 0 ? '#16a34a' : '#ef4444', bg: netProfit >= 0 ? '#f0fdf4' : '#fef2f2' },
    { label: 'Tiền Mặt Tồn Quỹ & Ngân Hàng', value: fmt(cashBalance), change: 'Thanh khoản sẵn sàng chi trả', icon: <CreditCard size={20} />, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Đơn PO Chờ Thanh Toán NCC', value: `${unpaidPOs.length} đơn (${fmt(unpaidPOAmount)})`, change: 'Cần giải ngân cho Nhà Cung Cấp', icon: <ShoppingBag size={20} />, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Quỹ Lương Chờ Chi Trả', value: fmt(totalPayrollFund), change: 'Dự toán kỳ lương tháng hiện tại', icon: <Users size={20} />, color: '#8b5cf6', bg: '#f5f3ff' }
  ];

  // Chart 1: Income vs Expense Doughnut
  const cashFlowChartData = {
    labels: ['Doanh Thu Bán Hàng', 'Chi Mua Hàng PO', 'Chi Lương Nhân Sự', 'Chi Phí Vận Hành Khác'],
    datasets: [
      {
        data: [
          Math.max(1, totalRevenue),
          Math.max(1, unpaidPOAmount || 15000000),
          Math.max(1, totalPayrollFund || 25000000),
          5000000
        ],
        backgroundColor: ['#16a34a', '#f59e0b', '#8b5cf6', '#ef4444']
      }
    ]
  };

  // Chart 2: Monthly Revenue & Expense Bar
  const monthlyFinanceData = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8 (Hiện tại)'],
    datasets: [
      {
        label: 'Doanh Thu (Triệu VNĐ)',
        data: [120, 145, 130, 180, 210, 195, 240, Math.round(totalRevenue / 1000000) || 280],
        backgroundColor: '#16a34a'
      },
      {
        label: 'Chi Phí (Triệu VNĐ)',
        data: [90, 105, 95, 130, 150, 140, 170, Math.round(totalExpense / 1000000) || 190],
        backgroundColor: '#ef4444'
      }
    ]
  };

  // Filtered Ledger Entries
  const filteredLedger = useMemo(() => {
    return (ledger || []).filter(tx => {
      if (!tx) return false;
      const q = search.toLowerCase();
      const matchSearch = !search || 
        tx.description?.toLowerCase().includes(q) || 
        tx.referenceId?.toLowerCase().includes(q) || 
        tx.type?.toLowerCase().includes(q);
      const matchType = typeFilter === 'ALL' || tx.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [ledger, search, typeFilter]);

  const handleAddManualEntry = () => {
    if (!manualForm.amount || !manualForm.description) {
      alert('Vui lòng nhập số tiền và nội dung thu/chi!');
      return;
    }
    const amt = parseInt(manualForm.amount, 10);
    if (isNaN(amt) || amt <= 0) {
      alert('Số tiền không hợp lệ!');
      return;
    }
    if (typeof addLedgerEntry === 'function') {
      addLedgerEntry({
        type: manualForm.type,
        amount: amt,
        description: manualForm.description,
        category: manualForm.category,
        date: new Date().toLocaleDateString('vi-VN')
      });
    }
    setManualForm({ type: 'EXPENSE', amount: '', category: 'Vận hành văn phòng', description: '' });
    setShowManualModal(false);
    alert('✅ Đã thêm bút toán vào Sổ Cái thành công!');
  };

  const handlePayPO = (poId, poAmount) => {
    if (window.confirm(`Xác nhận thanh toán ${fmt(poAmount)} cho Đơn Mua Hàng #${poId}?`)) {
      if (typeof paySupplierPO === 'function') {
        paySupplierPO(poId);
      }
      alert(`✅ Đã giải ngân thanh toán thành công cho PO #${poId}! Bút toán đã được ghi nhận tự động vào Sổ Cái.`);
    }
  };

  const handleDisburseAll = () => {
    if (window.confirm(`Xác nhận GIẢI NGÂN LƯƠNG TOÀN DOANH NGHIỆP (${fmt(totalPayrollFund)})? Tiền sẽ được trừ vào quỹ và ghi sổ cái.`)) {
      if (typeof disburseAllPayrolls === 'function') {
        disburseAllPayrolls();
      }
      alert('✅ Đã giải ngân toàn bộ bảng lương tháng thành công!');
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={24} style={{ color: '#16a34a' }} />
            {activeTab === 'overview' && 'Tổng Quan Tài Chính & Dòng Tiền Doanh Nghiệp'}
            {activeTab === 'ledger' && 'Sổ Cái Kế Toán & Lịch Sử Dòng Tiền (General Ledger)'}
            {activeTab === 'po_payments' && 'Thanh Toán Đơn Mua Hàng Nhà Cung Cấp (PO Payments)'}
            {activeTab === 'payroll_disbursement' && 'Chi Trả & Giải Ngân Bảng Lương (Payroll Disbursement)'}
            {activeTab === 'reports' && 'Báo Cáo Tài Chính P&L & Thuế GTGT (VAT)'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
            Quản trị dòng tiền thu chi, thanh toán NCC, chi lương và báo cáo lãi lỗ P&L
          </p>
        </div>

        {activeTab === 'ledger' && (
          <button
            onClick={() => setShowManualModal(true)}
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
            <PlusCircle size={16} />
            <span>Thêm Phiếu Thu / Chi</span>
          </button>
        )}

        {activeTab === 'reports' && (
          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
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
            <Printer size={15} />
            <span>In Báo Cáo Tài Chính</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (TỔNG QUAN TÀI CHÍNH) */}
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
                Cơ Cấu Dòng Tiền Thu & Chi
              </h3>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut
                  data={cashFlowChartData}
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
                Biến Động Doanh Thu & Chi Phí Theo Tháng
              </h3>
              <div style={{ flex: 1, position: 'relative' }}>
                <Bar
                  data={monthlyFinanceData}
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

          {/* Quick Hub: Unpaid POs, Pending Payroll & P&L Card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0' }}>
                Đơn Mua Hàng Cần Thanh Toán
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {unpaidPOs.slice(0, 2).map((po, pIdx) => (
                  <div key={po.id || pIdx} style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>PO #{po.id}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{fmt(po.totalAmount || po.totalCost)}</span>
                    </div>
                    <button
                      onClick={() => setTab('po_payments')}
                      style={{ backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.55rem', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Chi Trả
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0' }}>
                Bảng Lương Chờ Chi Trả
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span>Quỹ Lương:</span>
                  <strong style={{ color: '#2563eb' }}>{fmt(totalPayrollFund)}</strong>
                </div>
                <button
                  onClick={() => setTab('payroll_disbursement')}
                  style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Giải Ngân Bảng Lương
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0' }}>
                Báo Cáo Tài Chính P&L
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  <span>Lợi Nhuận Thuần:</span>
                  <strong style={{ color: '#1d4ed8' }}>{fmt(netProfit)}</strong>
                </div>
                <button
                  onClick={() => setTab('reports')}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Xem Báo Cáo P&L & VAT →
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEDGER (SỔ CÁI DÒNG TIỀN) */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <input
                type="text"
                placeholder="Tìm giao dịch, mã đơn, nội dung thu chi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Phân Loại:</span>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#0f172a' }}
              >
                <option value="ALL">Tất cả bút toán</option>
                <option value="INCOME">Thu tiền (+) (Bán hàng, Khác)</option>
                <option value="EXPENSE">Chi tiền (-) (Mua hàng, Vận hành)</option>
                <option value="EXPENSE_PAYROLL">Chi lương nhân viên (-)</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Mã Bút Toán</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Thời Gian</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Loại Giao Dịch</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Nội Dung Thu / Chi</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Số Tiền</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((tx, tIdx) => {
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <tr key={tx.id || tIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#2563eb' }}>
                        #{tx.referenceId || tx.id || `TX-${tIdx + 100}`}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>{tx.date || '18/08/2026'}</td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          backgroundColor: isIncome ? '#f0fdf4' : '#fef2f2',
                          color: isIncome ? '#16a34a' : '#dc2626'
                        }}>
                          {isIncome ? '▲ Thu Tiền' : '▼ Chi Tiền'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#0f172a', fontWeight: 500 }}>
                        {tx.description || 'Giao dịch thu chi'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: isIncome ? '#16a34a' : '#dc2626', fontSize: '0.88rem' }}>
                        {isIncome ? `+${fmt(tx.amount)}` : `-${fmt(tx.amount)}`}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <button
                          onClick={() => setViewingTxDetail(tx)}
                          style={{ backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Chứng Từ
                        </button>
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
      {/* TAB 3: PO PAYMENTS (THANH TOÁN ĐƠN MUA HÀNG) */}
      {/* ========================================================================= */}
      {activeTab === 'po_payments' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShoppingBag size={18} style={{ color: '#f59e0b' }} />
            <span>Danh Sách Đơn Mua Hàng Cần Thanh Toán Cho Nhà Cung Cấp</span>
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
            Xác nhận chi tiền thanh toán cho các đơn PO đã nhập kho an toàn, tự động trừ quỹ và ghi sổ cái
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Mã PO</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Nhà Cung Cấp</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Tình Trạng Kho</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Tổng Tiền</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Thanh Toán</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác Kế Toán</th>
                </tr>
              </thead>
              <tbody>
                {effectivePOs.map((po, pIdx) => {
                  const isPaid = po.paymentStatus === 'PAID';
                  return (
                    <tr key={po.id || pIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#2563eb' }}>PO-{po.id}</td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>{po.supplierName || 'NCC ASUS Vietnam'}</td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                          ✓ Đã nhập kho (GRN)
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        {fmt(po.totalAmount || po.totalCost || 18500000)}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          backgroundColor: isPaid ? '#f0fdf4' : '#fffbeb',
                          color: isPaid ? '#16a34a' : '#d97706'
                        }}>
                          {isPaid ? '✓ Đã Thanh Toán' : 'Chờ Thanh Toán'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        {!isPaid ? (
                          <button
                            onClick={() => handlePayPO(po.id, po.totalAmount || po.totalCost || 18500000)}
                            style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            ✓ Chi Trả Ngay
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hoàn tất</span>
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
      {/* TAB 4: PAYROLL DISBURSEMENT (CHI TRẢ BẢNG LƯƠNG) */}
      {/* ========================================================================= */}
      {activeTab === 'payroll_disbursement' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Bảng Lương Tháng Đã Phê Duyệt — Sẵn Sàng Chi Trả
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
                Tổng quỹ chi trả: <strong style={{ color: '#2563eb' }}>{fmt(totalPayrollFund)}</strong> (CEO đã phê duyệt)
              </p>
            </div>

            <button
              onClick={handleDisburseAll}
              style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Send size={15} /> ⚡ Chi Lương Toàn Doanh Nghiệp
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Nhân Viên</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Chức Danh</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Lương Cứng</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Thưởng / Phạt</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Thực Nhận</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, eIdx) => {
                  const net = parseInt(emp.salary || emp.baseSalary || 8500000) + (emp.role === 'SALES' ? 1250000 : 0) - 50000;
                  return (
                    <tr key={emp.id || eIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>{emp.fullname}</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>{emp.role}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#475569' }}>{fmt(emp.salary || emp.baseSalary)}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#16a34a' }}>+1.200.000 ₫</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{fmt(net)}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            if (typeof disbursePayroll === 'function') disbursePayroll(emp.id);
                            alert(`✅ Đã chuyển khoản lương ${fmt(net)} cho ${emp.fullname}!`);
                          }}
                          style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Chi Lương
                        </button>
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
      {/* TAB 5: REPORTS (BÁO CÁO P&L & VAT) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* P&L Statement Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={18} style={{ color: '#2563eb' }} />
              <span>Báo Cáo Kết Quả Hoạt Động Kinh Doanh (P&L Statement)</span>
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
              Kỳ tính toán: Tháng {today.getMonth() + 1}/{today.getFullYear()}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <strong style={{ color: '#16a34a' }}>1. DOANH THU THUẦN TỪ BÁN HÀNG & DỊCH VỤ:</strong>
                <strong style={{ color: '#16a34a', fontSize: '1rem' }}>{fmt(totalRevenue)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <strong style={{ color: '#dc2626' }}>2. GIÁ VỐN HÀNG BÁN & MUA LINH KIỆN (COGS):</strong>
                <strong style={{ color: '#dc2626', fontSize: '1rem' }}>- {fmt(unpaidPOAmount || 18500000)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <strong style={{ color: '#dc2626' }}>3. CHI PHÍ LƯƠNG NHÂN VIÊN & HOA HỒNG:</strong>
                <strong style={{ color: '#dc2626', fontSize: '1rem' }}>- {fmt(totalPayrollFund)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <strong style={{ color: '#dc2626' }}>4. CHI PHÍ VẬN HÀNH, ĐIỆN NƯỚC, MẶT BẰNG:</strong>
                <strong style={{ color: '#dc2626', fontSize: '1rem' }}>- 5.000.000 ₫</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '2px solid #3b82f6', marginTop: '0.5rem' }}>
                <strong style={{ color: '#1d4ed8', fontSize: '1.05rem' }}>5. LỢI NHUẬN RÒNG TRƯỚC THUẾ (NET PROFIT):</strong>
                <strong style={{ color: '#1d4ed8', fontSize: '1.15rem' }}>{fmt(netProfit)}</strong>
              </div>
            </div>
          </div>

          {/* VAT Tax Ledger */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Bảng Kê Thuế Giá Trị Gia Tăng (VAT 10%)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
              <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Thuế VAT Đầu Ra (Bán Hàng 10%):</strong>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a', marginTop: '0.35rem' }}>
                  {fmt(Math.round(totalRevenue * 0.1))}
                </div>
              </div>
              <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Thuế VAT Đầu Vào Được Khấu Trừ:</strong>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', marginTop: '0.35rem' }}>
                  {fmt(Math.round(totalExpense * 0.1))}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ================= MODAL: THÊM BÚT TOÁN THỦ CÔNG ================= */}
      {showManualModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '480px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Thêm Phiếu Thu / Chi Thủ Công</h3>
              <button onClick={() => setShowManualModal(false)} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Loại phiếu *</label>
                <select
                  value={manualForm.type}
                  onChange={e => setManualForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  <option value="EXPENSE">Phiếu Chi (-)</option>
                  <option value="INCOME">Phiếu Thu (+)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Số tiền (VNĐ) *</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 1500000"
                  value={manualForm.amount}
                  onChange={e => setManualForm(p => ({ ...p, amount: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Hạng mục</label>
                <select
                  value={manualForm.category}
                  onChange={e => setManualForm(p => ({ ...p, category: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  <option value="Vận hành văn phòng">Vận hành văn phòng</option>
                  <option value="Điện nước Internet">Điện nước Internet</option>
                  <option value="Tiếp khách kinh doanh">Tiếp khách kinh doanh</option>
                  <option value="Mua dụng cụ kỹ thuật">Mua dụng cụ kỹ thuật</option>
                  <option value="Khác">Hạng mục khác</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Nội dung diễn giải *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thanh toán tiền điện tháng 8"
                  value={manualForm.description}
                  onChange={e => setManualForm(p => ({ ...p, description: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddManualEntry}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Ghi Sổ Cái
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: XEM CHỨNG TỪ SỔ CÁI ================= */}
      {viewingTxDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '520px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Chứng Từ Kế Toán #{viewingTxDetail.id || 'TX-101'}</h3>
              <button onClick={() => setViewingTxDetail(null)} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div><strong>Mã tham chiếu:</strong> <code style={{ color: '#2563eb' }}>{viewingTxDetail.referenceId || viewingTxDetail.id}</code></div>
              <div><strong>Ngày hạch toán:</strong> {viewingTxDetail.date || '18/08/2026'}</div>
              <div><strong>Loại nghiệp vụ:</strong> <span style={{ fontWeight: 800, color: viewingTxDetail.type === 'INCOME' ? '#16a34a' : '#dc2626' }}>{viewingTxDetail.type}</span></div>
              <div><strong>Nội dung:</strong> {viewingTxDetail.description}</div>
              <div><strong>Số tiền ghi sổ:</strong> <strong style={{ fontSize: '1.1rem', color: viewingTxDetail.type === 'INCOME' ? '#16a34a' : '#dc2626' }}>{fmt(viewingTxDetail.amount)}</strong></div>
              <div><strong>Người lập biểu:</strong> Kế Toán Viên (AetherPC Accounting)</div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setViewingTxDetail(null)}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Đóng
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
