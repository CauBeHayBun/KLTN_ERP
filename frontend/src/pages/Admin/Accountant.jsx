import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { api } from '../../services/api';
import ActorNotificationBar from '../../components/ActorNotificationBar';
import { 
  DollarSign, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle, ShoppingBag, 
  Search, PlusCircle, Download, X, Eye, Printer, Calendar, CreditCard, Users, 
  Building2, ArrowRightLeft, ShieldCheck, Check, RefreshCw, FileCheck
} from 'lucide-react';
import { Doughnut, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  ArcElement, Title, Tooltip, Legend 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

export default function Accountant() {
  const { 
    ledger = [], 
    employees = [], 
    processPayroll, 
    resetPayrollCycle, 
    assemblyJobs = [], 
    purchaseOrders = [], 
    paySupplierPO, 
    addLedgerEntry, 
    payrolls = [], 
    disbursePayroll,
    disburseAllPayrolls
  } = useERP();

  const [allPOs, setAllPOs] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'po_payments' | 'payroll_disbursement'
  const [viewingPayrollDetail, setViewingPayrollDetail] = useState(null);
  const [viewingTxDetail, setViewingTxDetail] = useState(null);
  
  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPNLModal, setShowPNLModal] = useState(false);

  // Manual Form
  const [manualType, setManualType] = useState('EXPENSE');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');

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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Financial Metric Calculations
  const totalRevenue = ledger
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = ledger
    .filter(tx => tx.type === 'EXPENSE' || tx.type === 'EXPENSE_PAYROLL' || tx.type === 'EXPENSE_PO' || tx.type === 'EXPENSE_REFUND')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netProfit = totalRevenue - totalExpense;

  const totalPayrollFund = payrolls.reduce((sum, p) => sum + (p.totalAmount || 0), 0) || (employees.reduce((s, e) => s + (e.baseSalary || 0), 0));

  const [poFilter, setPoFilter] = useState('READY_FOR_PAYMENT'); // 'READY_FOR_PAYMENT' | 'AWAITING_WH' | 'PAID' | 'ALL'

  const effectivePOs = allPOs.length > 0 ? allPOs : purchaseOrders;
  
  // POs that are actually received in Warehouse (RECEIVED / CONFIRMED / SENT) and UNPAID
  const readyPOs = effectivePOs.filter(po => 
    po.paymentStatus !== 'PAID' && (po.status === 'RECEIVED' || po.status === 'CONFIRMED' || po.status === 'SENT')
  );

  // POs that are still DRAFT / PENDING warehouse receipt
  const awaitingWhPOs = effectivePOs.filter(po => 
    po.paymentStatus !== 'PAID' && (po.status === 'DRAFT' || po.status === 'PENDING' || !po.status)
  );

  const paidPOs = effectivePOs.filter(po => po.paymentStatus === 'PAID');

  const displayedPOs = effectivePOs.filter(po => {
    if (poFilter === 'READY_FOR_PAYMENT') {
      return po.paymentStatus !== 'PAID' && (po.status === 'RECEIVED' || po.status === 'CONFIRMED' || po.status === 'SENT');
    }
    if (poFilter === 'AWAITING_WH') {
      return po.paymentStatus !== 'PAID' && (po.status === 'DRAFT' || po.status === 'PENDING' || !po.status);
    }
    if (poFilter === 'PAID') {
      return po.paymentStatus === 'PAID';
    }
    return true;
  });

  const pendingPayrolls = payrolls.filter(p => p.status === 'APPROVED_BY_CEO' || p.status === 'SUBMITTED_TO_ACCOUNTING');

  const filteredLedger = ledger.filter(tx => {
    const matchSearch = (tx.description || '').toLowerCase().includes(search.toLowerCase()) || 
                        (tx.id || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || tx.type === typeFilter;
    return matchSearch && matchType;
  });

  const pendingPOs = readyPOs;

  const handleCreateManualEntry = (e) => {
    e.preventDefault();
    if (!manualAmount || !manualDesc) {
      alert('Vui lòng nhập đầy đủ số tiền và diễn giải lý do chứng từ!');
      return;
    }

    addLedgerEntry(manualType, parseFloat(manualAmount), manualDesc);
    setShowManualModal(false);
    setManualAmount('');
    setManualDesc('');
    alert(`✅ Đã lập chứng từ ${manualType === 'INCOME' ? 'PHIẾU THU' : 'PHIẾU CHI'} thành công!`);
  };

  // 🖨️ Official Print P&L Report Generator
  const handlePrintPNLReport = () => {
    const printWin = window.open('', '_blank', 'width=950,height=850');
    if (!printWin) {
      alert('Vui lòng cho phép trình duyệt mở cửa sổ Pop-up để in Báo Cáo!');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('vi-VN');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Báo Cáo Tài Chính P&L - AetherPC ERP</title>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; font-size: 13pt; line-height: 1.5; color: #000; margin: 40px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px; }
          .company-name { font-weight: bold; font-size: 14pt; text-transform: uppercase; }
          .title { text-align: center; font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 20px 0 5px 0; }
          .subtitle { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 10px 12px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 11pt; }
          .num { text-align: right; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #fafafa; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; text-align: center; page-break-inside: avoid; }
          .sig-box { width: 30%; }
          .sig-title { font-weight: bold; text-transform: uppercase; margin-bottom: 65px; }
          @media print {
            body { margin: 20mm 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">CÔNG TY CỔ PHẦN CÔNG NGHỆ AETHERPC</div>
            <div>Mã số thuế: 0317892042</div>
            <div>Địa chỉ: Quận Gò Vấp, TP. Hồ Chí Minh</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Mẫu số B 02 - DN</strong></div>
            <div style="font-size: 10pt; font-style: italic;">(Thông tư 200/2014/TT-BTC)</div>
          </div>
        </div>

        <div class="title">BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH</div>
        <div class="subtitle">Kỳ kế toán: Năm ${now.getFullYear()} • Ngày xuất báo cáo: ${dateStr} (${timeStr})</div>

        <table>
          <thead>
            <tr>
              <th style="width: 8%;">STT</th>
              <th style="width: 52%;">CHỈ TIÊU KẾ TOÁN</th>
              <th style="width: 15%;">MÃ SỐ</th>
              <th style="width: 25%;">GIÁ TRỊ (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td><strong>1. Doanh thu bán hàng và cung cấp dịch vụ</strong></td>
              <td style="text-align: center;">01</td>
              <td class="num">${formatPrice(totalRevenue)}</td>
            </tr>
            <tr>
              <td style="text-align: center;">2</td>
              <td>Các khoản giảm trừ doanh thu (Chiết khấu, Hàng bán bị trả lại)</td>
              <td style="text-align: center;">02</td>
              <td class="num">0 đ</td>
            </tr>
            <tr class="total-row">
              <td style="text-align: center;">3</td>
              <td><strong>2. DOANH THU THUẦN (STT 3 = STT 1 - STT 2)</strong></td>
              <td style="text-align: center;">10</td>
              <td class="num" style="color: #008000;">${formatPrice(totalRevenue)}</td>
            </tr>
            <tr>
              <td style="text-align: center;">4</td>
              <td><strong>3. Giá vốn linh kiện mua vào (PO Goods Cost)</strong></td>
              <td style="text-align: center;">11</td>
              <td class="num">${formatPrice(Math.max(0, totalExpense - totalPayrollFund))}</td>
            </tr>
            <tr>
              <td style="text-align: center;">5</td>
              <td><strong>4. Chi phí lương & chế độ nhân sự (Payroll Expenses)</strong></td>
              <td style="text-align: center;">25</td>
              <td class="num">${formatPrice(totalPayrollFund)}</td>
            </tr>
            <tr class="total-row">
              <td style="text-align: center;">6</td>
              <td><strong>5. TỔNG CHI PHÍ HOẠT ĐỘNG (STT 6 = STT 4 + STT 5)</strong></td>
              <td style="text-align: center;">26</td>
              <td class="num" style="color: #cc0000;">-${formatPrice(totalExpense)}</td>
            </tr>
            <tr class="total-row" style="font-size: 14pt; background-color: #e6f2ff;">
              <td style="text-align: center;">7</td>
              <td><strong>6. LỢI NHUẬN THUẦN TRƯỚC THUẾ (STT 7 = STT 3 - STT 6)</strong></td>
              <td style="text-align: center;">50</td>
              <td class="num" style="color: ${netProfit >= 0 ? '#008000' : '#cc0000'};">${formatPrice(netProfit)}</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">NGƯỜI LẬP BẢNG</div>
            <div>(Ký, họ tên)</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">KẾ TOÁN TRƯỞNG</div>
            <div>(Ký, họ tên)</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">BAN GIÁM ĐỐC / CEO</div>
            <div>(Ký, đóng dấu, họ tên)</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  return (
    <div style={{ padding: '1.75rem', fontFamily: "'Inter', system-ui, sans-serif", color: '#0f172a' }}>
      
      {/* Top Banner Header */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '1.75rem',
        backgroundColor: '#ffffff',
        padding: '1.5rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(15,23,42,0.03)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ flex: '1 1 340px' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <DollarSign style={{ color: '#16a34a' }} size={28} /> Quản Lý Tài Chính & Kế Toán Trung Tâm
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Hạch toán doanh thu bán hàng, duyệt chi tiền hàng NCC, duyệt chi lương HR và quản lý sổ nhật ký đa vai trò.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={() => setShowPNLModal(true)}
            style={{
              backgroundColor: '#ffffff',
              color: '#4f46e5',
              border: '1.5px solid #c7d2fe',
              borderRadius: '10px',
              padding: '0.65rem 1.25rem',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f3ff'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            <Printer size={18} /> In Báo Cáo Lãi Lỗ
          </button>

          <button
            onClick={() => setShowManualModal(true)}
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.65rem 1.25rem',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(22,163,74,0.25)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
          >
            <PlusCircle size={18} /> Lập Phiếu Thu / Chi
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        {/* Card 1: Total Revenue */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>TỔNG DOANH THU</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justify: 'center' }}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a' }}>{formatPrice(totalRevenue)}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Bán lẻ Online & Quầy POS</div>
        </div>

        {/* Card 2: Total Expenses */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>TỔNG CHI PHÍ</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justify: 'center' }}>
              <ArrowDownLeft size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#dc2626' }}>{formatPrice(totalExpense)}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Tiền hàng PO + Chi Lương + Phí CSKH</div>
        </div>

        {/* Card 3: Net Profit */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>LỢI NHUẬN THUẦN</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: netProfit >= 0 ? '#eff6ff' : '#fee2e2', color: netProfit >= 0 ? '#2563eb' : '#dc2626', display: 'flex', alignItems: 'center', justify: 'center' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: netProfit >= 0 ? '#2563eb' : '#dc2626' }}>{formatPrice(netProfit)}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Hiệu số Doanh thu - Chi phí</div>
        </div>

        {/* Card 4: Pending Disbursements */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>CHỜ KẾ TOÁN DUYỆT CHI</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justify: 'center' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706' }}>
            {pendingPOs.length + pendingPayrolls.length} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>chứng từ</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
            {pendingPayrolls.length} Bảng lương HR | {pendingPOs.length} Hóa đơn PO
          </div>
        </div>
      </div>

      {/* Main Tabs Bar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.5rem',
        backgroundColor: '#ffffff',
        padding: '0.5rem 1rem 0 1rem',
        borderRadius: '14px 14px 0 0',
        border: '1px solid #e2e8f0'
      }}>
        {[
          { key: 'ledger', label: '📒 Sổ Nhật Ký Tài Chính', count: ledger.length },
          { key: 'payroll_disbursement', label: '💵 Duyệt Chi Lương Nhân Sự', count: pendingPayrolls.length },
          { key: 'po_payments', label: '🛒 Duyệt Chi Tiền Hàng (Nhà Cung Cấp)', count: pendingPOs.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              color: activeTab === tab.key ? '#16a34a' : '#64748b',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #16a34a' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
            {tab.count !== null && (
              <span style={{
                fontSize: '0.72rem',
                padding: '1px 7px',
                borderRadius: '12px',
                backgroundColor: activeTab === tab.key ? '#dcfce7' : '#f1f5f9',
                color: activeTab === tab.key ? '#15803d' : '#475569',
                fontWeight: 800
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: 📒 SỔ NHẬT KÝ TÀI CHÍNH ── */}
      {activeTab === 'ledger' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm mã chứng từ, diễn giải..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.2rem', paddingRight: '0.85rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['ALL', 'INCOME', 'EXPENSE'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                    backgroundColor: typeFilter === t ? '#16a34a' : '#f1f5f9',
                    color: typeFilter === t ? '#ffffff' : '#475569',
                    border: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t === 'ALL' ? 'Tất cả nghiệp vụ' : t === 'INCOME' ? 'Khoản Thu' : 'Khoản Chi'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.73rem', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', width: '130px', whiteSpace: 'nowrap' }}>Mã Chứng Từ</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', width: '140px', whiteSpace: 'nowrap' }}>Loại Hạch Toán</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Nội Dung / Diễn Giải Chi Tiết</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '120px', whiteSpace: 'nowrap' }}>Ngày Ghi Sổ</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', width: '160px', whiteSpace: 'nowrap' }}>Số Tiền Giao Dịch</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '120px', whiteSpace: 'nowrap' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map(tx => {
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{tx.id}</td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          backgroundColor: isIncome ? '#dcfce7' : '#fee2e2',
                          color: isIncome ? '#15803d' : '#dc2626',
                          border: isIncome ? '1.5px solid #bbf7d0' : '1.5px solid #fecaca',
                          whiteSpace: 'nowrap'
                        }}>
                          {isIncome ? 'KHOẢN THU' : 'KHOẢN CHI'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#0f172a', fontWeight: 600, lineHeight: '1.4' }}>{tx.description}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{tx.date}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 900, color: isIncome ? '#16a34a' : '#dc2626', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                        {isIncome ? '+' : '-'}{formatPrice(tx.amount)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setViewingTxDetail(tx)}
                          style={{
                            padding: '0.4rem 0.65rem',
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          👁 Xem Chi Tiết
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

      {/* ── TAB 2: 💵 DUYỆT CHI LƯƠNG NHÂN SỰ (HR PAYROLL) ── */}
      {activeTab === 'payroll_disbursement' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                Phê Duyệt Chi Tiền Lương Nhân Sự Từ Bộ Phận HR
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Kiểm tra chi tiết bảng lương chốt từ phòng HR, xác nhận phê duyệt của CEO và duyệt chi giải ngân sang Sổ nhật ký tài chính.
              </p>
            </div>

            {pendingPayrolls.length > 0 && (
              <button
                onClick={() => {
                  const totalSum = pendingPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
                  if (window.confirm(`Xác nhận GIẢI NGÂN TOÀN BỘ ${pendingPayrolls.length} nhân viên với tổng tiền ${formatPrice(totalSum)}? Hệ thống sẽ ghi nhận chi phí vào Sổ nhật ký.`)) {
                    disburseAllPayrolls();
                  }
                }}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(22,163,74,0.25)'
                }}
              >
                ✓ Duyệt Chi Tất Cả Lương ({pendingPayrolls.length} Người)
              </button>
            )}
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Nhân Viên / Vai Trò</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Công Thực Tế</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Lương Cơ Bản</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Tổng Thưởng</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Tổng Khấu Trừ</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right', color: '#16a34a', whiteSpace: 'nowrap' }}>Thực Nhận</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng Thái CEO</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao Tác Kế Toán</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      Chưa có Bảng lương nào được bộ phận HR gửi sang.
                    </td>
                  </tr>
                ) : (
                  payrolls.map((p, idx) => {
                    const empName = p.name || p.empName || `Nhân viên #${p.empId}`;
                    const daysDisplay = `${p.presentDays || 26}/26 ngày`;
                    const bonusVal = (p.salesCommission || 0) + (p.assemblyBonus || 0) + (p.extraBonus || 0) + (p.bonus || 0);
                    
                    // Deductions include 10.5% mandatory social insurance + late fines + HR custom deductions
                    const insuranceVal = p.insuranceDeduction !== undefined ? p.insuranceDeduction : Math.round((p.baseSalary || 0) * 0.105);
                    const fineVal = insuranceVal + (p.latePenalty || 0) + (p.extraDeduction || 0) + (p.lateFine || 0);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 0.75rem', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{empName}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.role}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: '#334155', whiteSpace: 'nowrap' }}>
                          {daysDisplay}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {formatPrice(p.baseSalary)}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', color: bonusVal > 0 ? '#16a34a' : '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {bonusVal > 0 ? `+${formatPrice(bonusVal)}` : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', color: fineVal > 0 ? '#dc2626' : '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {fineVal > 0 ? `-${formatPrice(fineVal)}` : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: 900, color: '#16a34a', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                          {formatPrice(p.netSalary)}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {p.status === 'SUBMITTED_TO_CEO' && <span style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'inline-block' }}>Chờ CEO Duyệt</span>}
                          {p.status === 'APPROVED_BY_CEO' && <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'inline-block' }}>CEO Đã Duyệt</span>}
                          {p.status === 'PAID' && <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'inline-block' }}>✓ Đã Chi Trả</span>}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              onClick={() => setViewingPayrollDetail(p)}
                              style={{
                                padding: '0.42rem 0.65rem',
                                borderRadius: '8px',
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              👁 Xem Chi Tiết
                            </button>
                            {p.status === 'APPROVED_BY_CEO' || p.status === 'SUBMITTED_TO_ACCOUNTING' ? (
                              <button
                                onClick={() => disbursePayroll(p.empId)}
                                style={{ padding: '0.42rem 0.75rem', borderRadius: '8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(22,163,74,0.2)' }}
                              >
                                ✓ Duyệt Chi
                              </button>
                            ) : p.status === 'PAID' ? (
                              <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 800 }}>✓ Đã chi trả</span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#d97706', fontStyle: 'italic' }}>Chờ CEO phê duyệt</span>
                            )}
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
      )}

      {/* ── TAB 3: 🛒 DUYỆT CHI TIỀN HÀNG PO (SUPPLIERS) ── */}
      {activeTab === 'po_payments' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                Thanh Toán Hóa Đơn Tiền Hàng Cho Nhà Cung Cấp
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Kế toán duyệt chi thanh toán tiền hàng khi Kho đã xác nhận nhận linh kiện thực tế.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'READY_FOR_PAYMENT', label: `Đủ Điều Kiện Duyệt Chi (${readyPOs.length})` },
                { key: 'AWAITING_WH', label: `Chờ Kho Nhập Hàng (${awaitingWhPOs.length})` },
                { key: 'PAID', label: `Đã Thanh Toán (${paidPOs.length})` },
                { key: 'ALL', label: `Tất Cả Hóa Đơn (${effectivePOs.length})` }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setPoFilter(f.key)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    backgroundColor: poFilter === f.key ? '#16a34a' : '#f1f5f9',
                    color: poFilter === f.key ? '#ffffff' : '#475569',
                    border: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.73rem', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', width: '150px', whiteSpace: 'nowrap' }}>Mã Đơn PO</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Nhà Cung Cấp Đối Tác</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', width: '160px', whiteSpace: 'nowrap' }}>Tổng Tiền Hóa Đơn</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '220px', whiteSpace: 'nowrap' }}>Trạng Thái Kho & Thanh Toán</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '210px', whiteSpace: 'nowrap' }}>Thao Tác Kế Toán</th>
                </tr>
              </thead>
              <tbody>
                {displayedPOs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      Không có hóa đơn PO nào thuộc trạng thái này.
                    </td>
                  </tr>
                ) : (
                  displayedPOs.map(po => {
                    const isPaid = po.paymentStatus === 'PAID';
                    const isReady = po.status === 'RECEIVED' || po.status === 'CONFIRMED' || po.status === 'SENT';

                    return (
                      <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#2563eb', whiteSpace: 'nowrap' }}>{po.poNumber || `PO-${po.id}`}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>{po.supplier?.name || po.supplierCode || 'Intel Vietnam'}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 900, color: '#dc2626', whiteSpace: 'nowrap' }}>{formatPrice(po.totalAmount)}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center', justifyContent: 'center' }}>
                            {isReady ? (
                              <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '14px', fontWeight: 800, fontSize: '0.75rem' }}>
                                Đã Nhập Kho
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '3px 10px', borderRadius: '14px', fontWeight: 800, fontSize: '0.75rem' }}>
                                Chờ Kho Nhập Hàng
                              </span>
                            )}

                            {isPaid ? (
                              <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '14px', fontWeight: 800, fontSize: '0.75rem' }}>
                                Đã Thanh Toán
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8', padding: '3px 10px', borderRadius: '14px', fontWeight: 800, fontSize: '0.75rem' }}>
                                Chờ Duyệt Chi
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '210px', whiteSpace: 'nowrap' }}>
                          {isPaid ? (
                            <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 800 }}>Đã chi trả tiền</span>
                          ) : isReady ? (
                            <button
                              onClick={() => {
                                paySupplierPO(po.id);
                                alert(`✅ Kế toán đã duyệt chi thanh toán tiền mua hàng ${formatPrice(po.totalAmount)} cho đơn PO-${po.id}!`);
                              }}
                              style={{ padding: '0.45rem 1rem', borderRadius: '8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 900, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(22,163,74,0.2)' }}
                            >
                              Duyệt Chi Thanh Toán
                            </button>
                          ) : (
                            <button
                              disabled
                              title="Kho chưa xác nhận nhận linh kiện thực tế, Kế toán chưa thể chi tiền."
                              style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.75rem', cursor: 'not-allowed', whiteSpace: 'nowrap' }}
                            >
                              Chờ Kho Nhập Hàng
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
      )}

      {/* ── MODAL: LẬP PHIẾU THU / CHI THỦ CÔNG ── */}
      {showManualModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Lập Chứng Từ Thu / Chi Kế Toán</h3>
              <button onClick={() => setShowManualModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>

            <form onSubmit={handleCreateManualEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Loại chứng từ hạch toán *</label>
                <select
                  value={manualType}
                  onChange={e => setManualType(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800 }}
                >
                  <option value="INCOME">🟢 PHIẾU THU (Tăng Thu Nhập / Doanh Thu)</option>
                  <option value="EXPENSE">🔴 PHIẾU CHI (Tăng Chi Phí Hoạt Động)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Số tiền chứng từ (VNĐ) *</label>
                <input
                  type="number"
                  required
                  placeholder="5000000"
                  value={manualAmount}
                  onChange={e => setManualAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Diễn giải lý do thu / chi *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Thanh toán tiền điện nước văn phòng, Chi tiền tiếp khách..."
                  value={manualDesc}
                  onChange={e => setManualDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowManualModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 900, cursor: 'pointer' }}>
                  Ghi Sổ Hạch Toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BÁO CÁO TÀI CHÍNH P&L (PROFIT & LOSS) ── */}
      {showPNLModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div style={{ width: '100%', maxWidth: '720px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (P&L)</h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>Kỳ kế toán: Năm {new Date().getFullYear()} • Chuẩn mực kế toán VAS ERP (Thông tư 200/2014/TT-BTC)</div>
              </div>
              <button onClick={() => setShowPNLModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>1. DOANH THU THUẦN BÁN HÀNG & DỊCH VỤ:</span>
                <strong style={{ color: '#16a34a', fontWeight: 900 }}>{formatPrice(totalRevenue)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', paddingLeft: '1rem' }}>
                <span style={{ color: '#64748b' }}>• Doanh thu bán linh kiện & PC online/POS:</span>
                <span>{formatPrice(totalRevenue)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>2. TỔNG CHI PHÍ HOẠT ĐỘNG:</span>
                <strong style={{ color: '#dc2626', fontWeight: 900 }}>-{formatPrice(totalExpense)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', paddingLeft: '1rem' }}>
                <span style={{ color: '#64748b' }}>• Chi phí lương & chế độ nhân sự:</span>
                <span>{formatPrice(totalPayrollFund)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', paddingLeft: '1rem' }}>
                <span style={{ color: '#64748b' }}>• Chi phí giá vốn linh kiện mua PO:</span>
                <span>{formatPrice(Math.max(0, totalExpense - totalPayrollFund))}</span>
              </div>

              <div style={{
                display: 'flex',
                justify: 'space-between',
                backgroundColor: netProfit >= 0 ? '#f0fdf4' : '#fef2f2',
                border: netProfit >= 0 ? '1.5px solid #bbf7d0' : '1.5px solid #fecaca',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginTop: '0.5rem'
              }}>
                <span style={{ fontWeight: 900, color: netProfit >= 0 ? '#15803d' : '#991b1b', fontSize: '1rem' }}>LỢI NHUẬN THUẦN TRƯỚC THUẾ:</span>
                <strong style={{ fontSize: '1.4rem', fontWeight: 900, color: netProfit >= 0 ? '#16a34a' : '#dc2626' }}>{formatPrice(netProfit)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={handlePrintPNLReport}
                style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}
              >
                <Printer size={18} /> In Báo Cáo P&L Chuẩn Khổ A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: XEM CHI TIẾT PHIẾU LƯƠNG NHÂN VIÊN ── */}
      {viewingPayrollDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Phiếu Chi Lương Chi Tiết</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Bảng kê thu nhập và khấu trừ thuế/bảo hiểm đợt này</p>
              </div>
              <button onClick={() => setViewingPayrollDetail(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>

            {/* Employee Info Header */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>{viewingPayrollDetail.name || viewingPayrollDetail.empName}</strong>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Bộ phận: {viewingPayrollDetail.role} | Mã NV: #{viewingPayrollDetail.empId}</span>
              </div>
              <span style={{ backgroundColor: viewingPayrollDetail.status === 'PAID' ? '#dcfce7' : '#dbeafe', color: viewingPayrollDetail.status === 'PAID' ? '#15803d' : '#1e40af', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem' }}>
                {viewingPayrollDetail.status === 'PAID' ? '✓ Đã Chi Trả' : 'CEO Đã Duyệt'}
              </span>
            </div>

            {/* Itemized Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569' }}>Lương căn bản hợp đồng:</span>
                <strong style={{ color: '#0f172a' }}>{formatPrice(viewingPayrollDetail.baseSalary || 0)}</strong>
              </div>

              {(viewingPayrollDetail.salesCommission > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#475569' }}>Hoa hồng doanh số Sales (1%):</span>
                  <strong style={{ color: '#16a34a' }}>+{formatPrice(viewingPayrollDetail.salesCommission)}</strong>
                </div>
              )}

              {(viewingPayrollDetail.assemblyBonus > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#475569' }}>Thưởng lắp ráp máy PC:</span>
                  <strong style={{ color: '#16a34a' }}>+{formatPrice(viewingPayrollDetail.assemblyBonus)}</strong>
                </div>
              )}

              {(viewingPayrollDetail.extraBonus > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#475569' }}>Phụ cấp & Thưởng HR:</span>
                  <strong style={{ color: '#16a34a' }}>+{formatPrice(viewingPayrollDetail.extraBonus)}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569' }}>Trừ Bảo hiểm xã hội / Y tế (10.5%):</span>
                <strong style={{ color: '#dc2626' }}>-{formatPrice(viewingPayrollDetail.insuranceDeduction !== undefined ? viewingPayrollDetail.insuranceDeduction : Math.round((viewingPayrollDetail.baseSalary || 0) * 0.105))}</strong>
              </div>

              {(viewingPayrollDetail.latePenalty > 0 || viewingPayrollDetail.lateFine > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#475569' }}>Phạt vi phạm đi muộn:</span>
                  <strong style={{ color: '#dc2626' }}>-{formatPrice(viewingPayrollDetail.latePenalty || viewingPayrollDetail.lateFine)}</strong>
                </div>
              )}

              {/* Net Result Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', marginTop: '0.25rem', borderTop: '2px solid #e2e8f0', fontSize: '1rem' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>LƯƠNG THỰC NHẬN CHUYỂN KHOẢN:</span>
                <strong style={{ fontWeight: 900, color: '#16a34a', fontSize: '1.15rem' }}>{formatPrice(viewingPayrollDetail.netSalary || 0)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setViewingPayrollDetail(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: XEM CHI TIẾT CHỨNG TỪ SỔ TÀI CHÍNH ── */}
      {viewingTxDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Chi Tiết Chứng Từ Hạch Toán</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Sổ nhật ký kế toán tài chính doanh nghiệp (VAS)</p>
              </div>
              <button onClick={() => setViewingTxDetail(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#2563eb', fontFamily: 'monospace', display: 'block' }}>{viewingTxDetail.id}</strong>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Ngày hạch toán: {viewingTxDetail.date}</span>
              </div>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontWeight: 900,
                fontSize: '0.78rem',
                backgroundColor: viewingTxDetail.type === 'INCOME' ? '#dcfce7' : '#fee2e2',
                color: viewingTxDetail.type === 'INCOME' ? '#15803d' : '#dc2626',
                border: viewingTxDetail.type === 'INCOME' ? '1.5px solid #bbf7d0' : '1.5px solid #fecaca'
              }}>
                {viewingTxDetail.type === 'INCOME' ? 'KHOẢN THU' : 'KHOẢN CHI'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem' }}>
              <div style={{ paddingBottom: '0.75rem', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>NỘI DUNG / DIỄN GIẢI CHI TIẾT:</span>
                <strong style={{ color: '#0f172a', lineHeight: '1.5', display: 'block' }}>{viewingTxDetail.description}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>GIÁ TRỊ GIAO DỊCH:</span>
                <strong style={{ fontWeight: 900, color: viewingTxDetail.type === 'INCOME' ? '#16a34a' : '#dc2626', fontSize: '1.3rem' }}>
                  {viewingTxDetail.type === 'INCOME' ? '+' : '-'}{formatPrice(viewingTxDetail.amount)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
              <button
                onClick={() => {
                  window.print();
                }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37,99,235,0.2)' }}
              >
                🖨 In Chứng Từ
              </button>
              <button onClick={() => setViewingTxDetail(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
