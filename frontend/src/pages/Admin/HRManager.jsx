import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  Users, UserPlus, CheckCircle, Clock, XCircle, DollarSign, CalendarCheck, 
  Key, Eye, EyeOff, Search, FileEdit, Award, Sparkles, Check, X, Calendar, 
  Clipboard, Send, RefreshCw, Briefcase, Filter, ShieldCheck, AlertCircle, ChevronRight, Edit3, User, Printer, Phone, Mail, MapPin, CreditCard, Building
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function HRManager() {
  const erp = useERP() || {};
  const { 
    employees = [], 
    updateAttendanceLog = () => {}, 
    attendanceLogs = [], 
    addEmployee = () => {}, 
    loading = false,
    ledger = [],
    assemblyJobs = [],
    leaveRequests = [],
    approveLeaveRequest = () => {},
    rejectLeaveRequest = () => {},
    payrolls = [],
    submitPayrolls = () => {},
    resetPayrollCycle = () => {},
    user = null
  } = erp;
  
  // 4 Main Tabs: 'attendance' | 'employees' | 'leaves' | 'payroll'
  const [activeTab, setActiveTab] = useState('attendance');
  
  // New employee state
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('SALES');
  const [newEmpSalary, setNewEmpSalary] = useState('');
  const [newEmpUser, setNewEmpUser] = useState('');
  const [createdEmpInfo, setCreatedEmpInfo] = useState(null);

  // View detail employee state
  const [viewingEmpDetail, setViewingEmpDetail] = useState(null);

  // Edit employee state
  const [editingEmp, setEditingEmp] = useState(null);

  // Manual Payroll Adjustment state for HR
  const [customPayrollAdjustments, setCustomPayrollAdjustments] = useState({});
  const [adjustingEmp, setAdjustingEmp] = useState(null);
  const [adjBonus, setAdjBonus] = useState('');
  const [adjDeduction, setAdjDeduction] = useState('');
  const [adjNote, setAdjNote] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Date management state
  const today = new Date();
  const formatInputDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  const [inputDate, setInputDate] = useState(formatInputDate(today));
  const [selectedDate, setSelectedDate] = useState(today.toLocaleDateString('vi-VN'));

  const handleDateChange = (val) => {
    setInputDate(val);
    if (val) {
      const [y, m, d] = val.split('-');
      setSelectedDate(`${parseInt(d)}/${parseInt(m)}/${y}`);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  // Helper to fetch status from log list safely
  const getEmployeeStatusForDate = (empId, dateStr) => {
    const log = (attendanceLogs || []).find(l => l && l.empId === empId && l.date === dateStr);
    return log ? log.status : 'UNMARKED';
  };

  // Dynamic attendance state calculations based on selected date
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;

  (employees || []).forEach(emp => {
    if (!emp) return;
    const status = getEmployeeStatusForDate(emp.id, selectedDate);
    if (status === 'PRESENT') presentCount++;
    else if (status === 'LATE') lateCount++;
    else if (status === 'ABSENT') absentCount++;
  });

  const totalEmployees = (employees || []).length;
  const attendanceRate = totalEmployees > 0 
    ? Math.round(((presentCount + lateCount) / totalEmployees) * 100) 
    : 0;

  const pendingLeavesCount = (leaveRequests || []).filter(r => r && r.status === 'PENDING').length;

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SALES': 
      case 'Phòng Bán Hàng': return <span className="badge badge-info" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700 }}>Phòng Bán Hàng</span>;
      case 'ASSEMBLY': 
      case 'Kỹ Thuật Lắp Ráp': return <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: 700 }}>Kỹ Thuật Lắp Ráp</span>;
      case 'ACCOUNTANT': 
      case 'Phòng Kế Toán': return <span className="badge badge-success" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Phòng Kế Toán</span>;
      case 'WAREHOUSE': 
      case 'Quản Lý Kho': return <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontWeight: 700 }}>Quản Lý Kho</span>;
      case 'EXECUTIVE': 
      case 'CEO': 
      case 'Ban Giám Đốc': return <span className="badge badge-danger" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700 }}>Ban Giám Đốc</span>;
      default: return <span className="badge badge-secondary">{role || 'Nhân Viên'}</span>;
    }
  };

  const filteredEmployees = (employees || []).filter(emp => {
    if (!emp) return false;
    const empName = emp.name || emp.fullname || '';
    const empRole = emp.role || '';
    const empUser = emp.username || '';

    const matchSearch = empName.toLowerCase().includes((search || '').toLowerCase()) || 
                        empRole.toLowerCase().includes((search || '').toLowerCase()) ||
                        empUser.toLowerCase().includes((search || '').toLowerCase());
    const matchRole = roleFilter === 'ALL' || empRole === roleFilter;
    return matchSearch && matchRole;
  });

  // Calculate monthly payroll summary safely with custom HR adjustment
  const calculatedPayrolls = (employees || []).map(emp => {
    if (!emp) return null;
    const empLogs = (attendanceLogs || []).filter(l => l && l.empId === emp.id);
    const presentDays = empLogs.filter(l => l.status === 'PRESENT').length;
    const lateDays = empLogs.filter(l => l.status === 'LATE').length;
    const absentDays = empLogs.filter(l => l.status === 'ABSENT').length;
    const latePenalty = lateDays * 50000;

    // Full-time monthly contract standard: 26 workdays minus unpaid absent days
    const actualWorkDays = Math.max(0, 26 - absentDays);
    const fullSalaryBase = parseFloat(emp.baseSalary || emp.salary || 10000000);
    const salaryBase = absentDays > 0 ? Math.round((fullSalaryBase / 26) * actualWorkDays) : fullSalaryBase;

    let salesCommission = 0;
    if (emp.role === 'SALES' || emp.role === 'SALES_MANAGER') {
      const salesTxns = (ledger || []).filter(tx => tx && tx.type === 'INCOME');
      const totalSalesRevenue = salesTxns.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const salesEmpCount = (employees || []).filter(e => e && (e.role === 'SALES' || e.role === 'SALES_MANAGER')).length || 1;
      salesCommission = Math.round((totalSalesRevenue * 0.01) / salesEmpCount);
    }

    let assemblyBonus = 0;
    if (emp.role === 'ASSEMBLY') {
      const completedJobs = (assemblyJobs || []).filter(j => j && j.status === 'COMPLETED').length;
      assemblyBonus = completedJobs * 150000;
    }

    const insuranceDeduction = Math.round(salaryBase * 0.105);

    // HR Custom Adjustment
    const customAdj = customPayrollAdjustments[emp.id] || { bonus: 0, deduction: 0, note: '' };
    const extraBonus = customAdj.bonus || 0;
    const extraDeduction = customAdj.deduction || 0;

    const netSalary = Math.max(0, salaryBase + salesCommission + assemblyBonus + extraBonus - latePenalty - insuranceDeduction - extraDeduction);

    return {
      empId: emp.id,
      name: emp.name || emp.fullname || `Nhân viên #${emp.id}`,
      role: emp.role || 'SALES',
      baseSalary: salaryBase,
      presentDays: actualWorkDays,
      lateDays,
      absentDays,
      latePenalty,
      salesCommission,
      assemblyBonus,
      insuranceDeduction,
      extraBonus,
      extraDeduction,
      adjNote: customAdj.note,
      netSalary
    };
  }).filter(Boolean);

  const totalPayrollFund = calculatedPayrolls.reduce((sum, p) => sum + p.netSalary, 0);

  const handleCreateEmployee = (e) => {
    e.preventDefault();
    if (!newEmpName || !newEmpSalary) {
      alert('Vui lòng điền họ tên và mức lương cơ bản!');
      return;
    }
    const created = addEmployee(newEmpName, newEmpRole, parseFloat(newEmpSalary), newEmpUser);
    setCreatedEmpInfo(created);
    setNewEmpName('');
    setNewEmpSalary('');
    setNewEmpUser('');
    setShowAddEmpModal(false);
  };

  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    if (!adjustingEmp) return;
    setCustomPayrollAdjustments(prev => ({
      ...prev,
      [adjustingEmp.empId]: {
        bonus: parseFloat(adjBonus) || 0,
        deduction: parseFloat(adjDeduction) || 0,
        note: adjNote || ''
      }
    }));
    setAdjustingEmp(null);
    setAdjBonus('');
    setAdjDeduction('');
    setAdjNote('');
    alert(`✅ Đã cập nhật điều chỉnh lương cho nhân viên ${adjustingEmp.name}!`);
  };

  // Check if HR has submitted payroll to Accounting
  const isPayrollSubmitted = (payrolls || []).length > 0 && payrolls[0]?.status === 'SUBMITTED_TO_ACCOUNTING';
  const isPayrollDisbursed = (payrolls || []).length > 0 && (payrolls[0]?.status === 'DISBURSED' || payrolls[0]?.status === 'COMPLETED');

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
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users style={{ color: '#4f46e5' }} size={28} /> Quản Lý Nhân Sự & Tiền Lương (HRM)
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Theo dõi hồ sơ nhân sự, điểm danh chuyên cần, duyệt đơn nghỉ phép và chốt bảng lương gửi Kế toán.
          </p>
        </div>

        <button
          onClick={() => setShowAddEmpModal(true)}
          style={{
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.65rem 1.3rem',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4338ca'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4f46e5'}
        >
          <UserPlus size={18} /> Thêm Nhân Viên Mới
        </button>
      </div>

      {/* Account Created Success Alert */}
      {createdEmpInfo && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1.5px solid #bbf7d0',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>Tạo Nhân Viên & Tài Khoản Đăng Nhập Thành Công!</strong>
              <div style={{ fontSize: '0.83rem', color: '#166534', marginTop: '0.2rem' }}>
                Họ tên: <strong>{createdEmpInfo.name}</strong> | Tên đăng nhập: <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>{createdEmpInfo.createdUser?.username}</code> | Mật khẩu ban đầu: <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>{createdEmpInfo.createdUser?.rawPassword}</code>
              </div>
            </div>
          </div>
          <button onClick={() => setCreatedEmpInfo(null)} style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* 4 Top KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        {/* Card 1: Total Employees */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Tổng Nhân Sự</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justify: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>{totalEmployees} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>nhân viên</span></div>
        </div>

        {/* Card 2: Attendance Rate */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Chuyên Cần Hôm Nay</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justify: 'center' }}>
              <CalendarCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a' }}>{attendanceRate}%</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
            Có mặt: <strong>{presentCount}</strong> | Đi trễ: <strong style={{ color: '#d97706' }}>{lateCount}</strong> | Vắng: <strong style={{ color: '#dc2626' }}>{absentCount}</strong>
          </div>
        </div>

        {/* Card 3: Pending Leaves */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Đơn Nghỉ Chờ Duyệt</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justify: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: pendingLeavesCount > 0 ? '#d97706' : '#0f172a' }}>{pendingLeavesCount} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>đơn</span></div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Cần HR duyệt gấp</div>
        </div>

        {/* Card 4: Total Monthly Payroll */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Quỹ Lương Dự Kiến</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justify: 'center' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669' }}>{formatPrice(totalPayrollFund)}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
            Trạng thái: <strong>{isPayrollDisbursed ? 'Đã Thanh Toán (Kế Toán)' : isPayrollSubmitted ? 'Đã Gửi Kế Toán' : 'Dự Thảo (HR)'}</strong>
          </div>
        </div>
      </div>

      {/* Main Professional Tabs Bar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.5rem',
        backgroundColor: '#ffffff',
        padding: '0.5rem 1rem 0 1rem',
        borderRadius: '14px 14px 0 0',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'attendance', label: 'Bảng Chấm Công Theo Ngày', count: null },
          { key: 'employees', label: 'Hồ Sơ Nhân Viên & Hợp Đồng', count: totalEmployees },
          { key: 'leaves', label: 'Quản Lý Đơn Xin Nghỉ Phép', count: pendingLeavesCount },
          { key: 'payroll', label: 'Bảng Lương & Chốt Lương HR', count: null }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              color: activeTab === tab.key ? '#4f46e5' : '#64748b',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #4f46e5' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
            {tab.count !== null && (
              <span style={{
                fontSize: '0.72rem',
                padding: '1px 7px',
                borderRadius: '12px',
                backgroundColor: activeTab === tab.key ? '#e0e7ff' : '#f1f5f9',
                color: activeTab === tab.key ? '#4f46e5' : '#475569',
                fontWeight: 800
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: BẢNG CHẤM CÔNG THEO NGÀY ── */}
      {activeTab === 'attendance' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>Chọn ngày chấm công:</label>
              <input
                type="date"
                value={inputDate}
                onChange={e => handleDateChange(e.target.value)}
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 800 }}>({selectedDate})</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  (employees || []).forEach(emp => emp && updateAttendanceLog(emp.id, selectedDate, 'PRESENT'));
                  alert(`✅ Đã điểm danh CÓ MẶT toàn bộ nhân viên ngày ${selectedDate}!`);
                }}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Tự Động Chấm Có Mặt Hàng Loạt
              </button>
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.73rem', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Nhân Viên</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Phòng Ban / Chức Vụ</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Trạng Thái Điểm Danh ({selectedDate})</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '280px', whiteSpace: 'nowrap' }}>Thao Tác Chấm Công</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => {
                  const status = getEmployeeStatusForDate(emp.id, selectedDate);
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{emp.name || emp.fullname}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mã NV: <strong>{emp.id}</strong></div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {getRoleBadge(emp.role)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {status === 'PRESENT' && <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem' }}>Có Mặt Đúng Giờ</span>}
                        {status === 'LATE' && <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem' }}>Đi Trễ (-50k)</span>}
                        {status === 'ABSENT' && <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem' }}>Vắng Không Phép</span>}
                        {status === 'UNMARKED' && <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, fontSize: '0.78rem' }}>Chưa Chấm</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '280px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => updateAttendanceLog(emp.id, selectedDate, 'PRESENT')}
                            style={{
                              padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                              backgroundColor: status === 'PRESENT' ? '#16a34a' : '#f0fdf4',
                              color: status === 'PRESENT' ? '#ffffff' : '#16a34a',
                              border: '1px solid #bbf7d0'
                            }}
                          >
                            Có Mặt
                          </button>
                          <button
                            onClick={() => updateAttendanceLog(emp.id, selectedDate, 'LATE')}
                            style={{
                              padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                              backgroundColor: status === 'LATE' ? '#d97706' : '#fef3c7',
                              color: status === 'LATE' ? '#ffffff' : '#d97706',
                              border: '1px solid #fde68a'
                            }}
                          >
                            Đi Trễ
                          </button>
                          <button
                            onClick={() => updateAttendanceLog(emp.id, selectedDate, 'ABSENT')}
                            style={{
                              padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                              backgroundColor: status === 'ABSENT' ? '#dc2626' : '#fee2e2',
                              color: status === 'ABSENT' ? '#ffffff' : '#dc2626',
                              border: '1px solid #fecaca'
                            }}
                          >
                            Vắng
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: HỒ SƠ NHÂN VIÊN & HỢP ĐỒNG ── */}
      {activeTab === 'employees' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          {/* Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, maxWidth: '480px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Tìm nhân viên theo tên, phòng ban..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.2rem', paddingRight: '0.85rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: 'Tất cả phòng ban' },
                { key: 'SALES', label: 'Phòng Bán Hàng' },
                { key: 'ASSEMBLY', label: 'Kỹ Thuật Lắp Ráp' },
                { key: 'ACCOUNTANT', label: 'Phòng Kế Toán' },
                { key: 'WAREHOUSE', label: 'Quản Lý Kho' }
              ].map(r => (
                <button
                  key={r.key}
                  onClick={() => setRoleFilter(r.key)}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                    backgroundColor: roleFilter === r.key ? '#4f46e5' : '#f1f5f9',
                    color: roleFilter === r.key ? '#ffffff' : '#475569',
                    border: 'none'
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.73rem', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Mã NV & Họ Tên</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Phòng Ban</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Lương Cơ Bản</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Tài Khoản Hệ Thống</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '230px', whiteSpace: 'nowrap' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{emp.name || emp.fullname}</div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Mã: {emp.id}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>{getRoleBadge(emp.role)}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                      {formatPrice(emp.baseSalary || emp.salary)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {emp.username ? (
                        <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem' }}>
                          Tài khoản: {emp.username}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.78rem' }}>Chưa tạo tài khoản</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '230px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => setViewingEmpDetail(emp)}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 2px 6px rgba(79,70,229,0.2)' }}
                        >
                          <Eye size={13} /> Xem Chi Tiết
                        </button>
                        <button
                          onClick={() => setEditingEmp(emp)}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Sửa Hồ Sơ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: QUẢN LÝ ĐƠN XIN NGHÍ PHÉP ── */}
      {activeTab === 'leaves' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Danh Sách Đơn Xin Nghỉ Phép Từ Nhân Viên ({(leaveRequests || []).length})
          </h3>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.73rem', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Nhân Viên Xin Nghỉ</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Loại Phép</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Ngày Nghỉ</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Lý Do Xin Nghỉ</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '210px', whiteSpace: 'nowrap' }}>Thao Tác Phê Duyệt</th>
                </tr>
              </thead>
              <tbody>
                {(leaveRequests || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      Không có đơn xin nghỉ phép nào gửi tới.
                    </td>
                  </tr>
                ) : (
                  (leaveRequests || []).map(req => {
                    const empMatch = (employees || []).find(e => e && (
                      String(e.id) === String(req.empId || req.employeeId || req.userId) ||
                      (e.username && req.username && e.username.toLowerCase() === req.username.toLowerCase())
                    )) || {};
                    const displayName = req.employeeName || req.empName || empMatch.name || empMatch.fullname || (req.empId ? `Nhân viên #${req.empId}` : 'Nhân Viên');
                    const displayDate = req.date || req.startDate || req.fromDate || 'Hôm nay';

                    let leaveTypeName = 'Nghỉ Việc Riêng';
                    if (req.leaveType === 'ANNUAL' || req.leaveType === 'ANNUAL_LEAVE') leaveTypeName = 'Nghỉ Phép Năm';
                    else if (req.leaveType === 'SICK' || req.leaveType === 'SICK_LEAVE') leaveTypeName = 'Nghỉ Phép Ốm';

                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{displayName}</strong>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}>
                            {leaveTypeName}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{displayDate}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>{req.reason || 'Nghỉ giải quyết việc cá nhân'}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          {req.status === 'PENDING' && <span style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '3px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '0.76rem' }}>Chờ Duyệt</span>}
                          {req.status === 'APPROVED' && <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '0.76rem' }}>Đã Phê Duyệt</span>}
                          {req.status === 'REJECTED' && <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '0.76rem' }}>Đã Từ Chối</span>}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '210px', whiteSpace: 'nowrap' }}>
                          {req.status === 'PENDING' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '95px 95px', gap: '0.4rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => approveLeaveRequest(req.id)}
                                style={{ padding: '0.38rem 0.5rem', borderRadius: '6px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                Phê Duyệt
                              </button>
                              <button
                                onClick={() => rejectLeaveRequest(req.id)}
                                style={{ padding: '0.38rem 0.5rem', borderRadius: '6px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                Từ Chối
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Đã xử lý xong</span>
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

      {/* ── TAB 4: BẢNG LƯƠNG & CHỐT LƯƠNG HR ── */}
      {activeTab === 'payroll' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                Bảng Tổng Hợp Lương & Thu Nhập Tháng Này
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Bao gồm Lương cứng + Hoa hồng Sales 1% + Thưởng Lắp ráp PC + Phụ cấp HR - Khấu trừ bảo hiểm (10.5%) & Phạt đi trễ.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  submitPayrolls(calculatedPayrolls);
                  alert('✅ Đã chốt và chuyển Bảng Lương tháng này sang bộ phận Kế Toán phê duyệt thành công!');
                }}
                disabled={isPayrollDisbursed}
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: '10px',
                  backgroundColor: isPayrollDisbursed ? '#94a3b8' : isPayrollSubmitted ? '#2563eb' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: isPayrollDisbursed ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(22,163,74,0.25)'
                }}
              >
                <Send size={16} /> 
                {isPayrollDisbursed ? 'Đã Thanh Toán Xong (Kế Toán)' : isPayrollSubmitted ? 'Gửi Lại Bảng Lương Sang Kế Toán' : 'Chốt & Gửi Bảng Lương Sang Kế Toán'}
              </button>
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'left' }}>Nhân Viên</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Lương Căn Bản</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>Công / Trễ</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Hoa Hồng Sales (1%)</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Thưởng Lắp Ráp</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Trừ Bảo Hiểm (10.5%)</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Điều Chỉnh HR (+/-)</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>LƯƠNG THỰC NHẬN</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', width: '110px' }}>Thao Tác HR</th>
                </tr>
              </thead>
              <tbody>
                {calculatedPayrolls.map(p => (
                  <tr key={p.empId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem' }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{p.name}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.role}</div>
                    </td>
                    <td style={{ padding: '0.85rem', textAlign: 'right', fontWeight: 700, color: '#334155' }}>{formatPrice(p.baseSalary)}</td>
                    <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>{p.presentDays} ngày</span>
                      {p.lateDays > 0 && <span style={{ color: '#dc2626', marginLeft: '6px', fontWeight: 800 }}>({p.lateDays} trễ)</span>}
                    </td>
                    <td style={{ padding: '0.85rem', textAlign: 'right', color: '#2563eb', fontWeight: 700 }}>+{formatPrice(p.salesCommission)}</td>
                    <td style={{ padding: '0.85rem', textAlign: 'right', color: '#7c3aed', fontWeight: 700 }}>+{formatPrice(p.assemblyBonus)}</td>
                    <td style={{ padding: '0.85rem', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>-{formatPrice(p.insuranceDeduction)}</td>
                    <td style={{ padding: '0.85rem', textAlign: 'right', fontWeight: 700 }}>
                      {p.extraBonus > 0 && <div style={{ color: '#16a34a', fontSize: '0.75rem' }}>+{formatPrice(p.extraBonus)}</div>}
                      {p.extraDeduction > 0 && <div style={{ color: '#dc2626', fontSize: '0.75rem' }}>-{formatPrice(p.extraDeduction)}</div>}
                      {p.extraBonus === 0 && p.extraDeduction === 0 && <span style={{ color: '#94a3b8' }}>0 đ</span>}
                      {p.adjNote && <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>{p.adjNote}</div>}
                    </td>
                    <td style={{ padding: '0.85rem', textAlign: 'right', fontWeight: 900, fontSize: '0.95rem', color: '#16a34a' }}>
                      {formatPrice(p.netSalary)}
                    </td>
                    <td style={{ padding: '0.85rem', textAlign: 'center', width: '110px' }}>
                      <button
                        onClick={() => {
                          setAdjustingEmp(p);
                          setAdjBonus(p.extraBonus ? String(p.extraBonus) : '');
                          setAdjDeduction(p.extraDeduction ? String(p.extraDeduction) : '');
                          setAdjNote(p.adjNote || '');
                        }}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Edit3 size={12} /> Điều Chỉnh
                      </button>
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                  <td colSpan={7} style={{ padding: '1rem', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '0.9rem' }}>
                    TỔNG QUỸ LƯƠNG CẦN CHI TRẢ:
                  </td>
                  <td colSpan={2} style={{ padding: '1rem', textAlign: 'right', fontWeight: 900, fontSize: '1.25rem', color: '#dc2626' }}>
                    {formatPrice(totalPayrollFund)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: XEM CHI TIẾT HỒ SƠ NHÂN VIÊN ── */}
      {viewingEmpDetail && (() => {
        const emp = viewingEmpDetail;
        const empPayroll = calculatedPayrolls.find(p => p.empId === emp.id) || {};
        const empSalaryBase = parseFloat(emp.baseSalary || emp.salary || 10000000);
        const nameInitials = (emp.name || emp.fullname || 'NV').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
            <div style={{ width: '100%', maxWidth: '620px', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)', overflow: 'hidden' }}>
              {/* Header Gradient */}
              <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', padding: '1.5rem 1.75rem', color: '#ffffff', position: 'relative' }}>
                <button
                  onClick={() => setViewingEmpDetail(null)}
                  style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#ffffff', cursor: 'pointer', fontWeight: 800 }}
                >
                  ✕
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ffffff', color: '#4f46e5', fontWeight: 900, fontSize: '1.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {nameInitials}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>{emp.name || emp.fullname}</h2>
                    <div style={{ fontSize: '0.83rem', opacity: 0.95, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span>Mã Nhân Viên: <strong>NV-{emp.id}</strong></span>
                      <span>•</span>
                      <span>Hợp Đồng: <strong>Chính Thức</strong></span>
                    </div>
                    <div style={{ marginTop: '0.4rem' }}>
                      {getRoleBadge(emp.role)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Details */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* Section 1: Thông tin cá nhân & Liên hệ */}
                <div>
                  <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    1. Thông Tin Công Việc & Hệ Thống
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Tài Khoản Hệ Thống:</span>
                      {emp.username ? (
                        <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem' }}>
                          {emp.username}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa cấp tài khoản</span>
                      )}
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Ngày Vào Công Ty:</span>
                      <strong style={{ color: '#0f172a' }}>15/01/2024 (2 năm)</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Email Liên Hệ:</span>
                      <strong style={{ color: '#0f172a' }}>{emp.username ? `${emp.username}@kltnerp.vn` : 'nhanvien@kltnerp.vn'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Số Điện Thoại:</span>
                      <strong style={{ color: '#0f172a' }}>0988 123 45{emp.id}</strong>
                    </div>
                  </div>
                </div>

                {/* Section 2: Lương & Bảo Hiểm */}
                <div>
                  <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    2. Mức Lương & Bảo Hiểm Xã Hội
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.2fr', gap: '0.75rem', backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#1e40af', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>Lương Cơ Bản:</span>
                      <strong style={{ color: '#1d4ed8', fontSize: '1rem', fontWeight: 900 }}>{formatPrice(empSalaryBase)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#1e40af', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>Bảo Hiểm (10.5%):</span>
                      <strong style={{ color: '#dc2626', fontSize: '0.95rem', fontWeight: 900 }}>-{formatPrice(empSalaryBase * 0.105)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#1e40af', display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>Thu Nhập Tháng Này:</span>
                      <strong style={{ color: '#16a34a', fontSize: '1.05rem', fontWeight: 900 }}>{formatPrice(empPayroll.netSalary || empSalaryBase)}</strong>
                    </div>
                  </div>
                </div>

                {/* Section 3: Chuyên Cần & KPI */}
                <div>
                  <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    3. Thống Kê Chuyên Cần & Hiệu Suất Tháng Này
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', height: '75px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 800, letterSpacing: '0.3px' }}>CÓ MẶT</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{empPayroll.presentDays || 0} ngày</div>
                    </div>
                    <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', height: '75px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 800, letterSpacing: '0.3px' }}>ĐI TRỄ</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>{empPayroll.lateDays || 0} lần</div>
                    </div>
                    <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '10px', height: '75px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 800, letterSpacing: '0.3px' }}>VẮNG NGHỈ</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>{empPayroll.absentDays || 0} ngày</div>
                    </div>
                    <div style={{ backgroundColor: '#f3e8ff', border: '1px solid #ddd6fe', borderRadius: '10px', height: '75px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#6b21a8', fontWeight: 800, letterSpacing: '0.3px' }}>THƯỞNG & KHÁC</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#7c3aed', marginTop: '2px' }}>
                        +{formatPrice((empPayroll.salesCommission || 0) + (empPayroll.assemblyBonus || 0) + (empPayroll.extraBonus || 0))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer Actions */}
              <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    alert(`🖨 Đã xuất file in Hồ Sơ Thẻ Nhân Viên #${emp.id} thành công!`);
                  }}
                  style={{ padding: '0.55rem 1.1rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Printer size={15} /> In Thẻ Nhân Viên
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => {
                      setViewingEmpDetail(null);
                      setEditingEmp(emp);
                    }}
                    style={{ padding: '0.55rem 1.25rem', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Chỉnh Sửa Hồ Sơ
                  </button>
                  <button
                    onClick={() => setViewingEmpDetail(null)}
                    style={{ padding: '0.55rem 1.4rem', borderRadius: '10px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Đóng
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── MODAL: THÊM NHÂN VIÊN MỚI ── */}
      {showAddEmpModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Thêm Hồ Sơ Nhân Viên Mới</h3>
              <button onClick={() => setShowAddEmpModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>

            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Họ và tên nhân viên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A..."
                  value={newEmpName}
                  onChange={e => setNewEmpName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Phòng ban / Vai trò *</label>
                  <select
                    value={newEmpRole}
                    onChange={e => setNewEmpRole(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    <option value="SALES">Phòng Bán Hàng</option>
                    <option value="ASSEMBLY">Kỹ Thuật Lắp Ráp</option>
                    <option value="ACCOUNTANT">Phòng Kế Toán</option>
                    <option value="WAREHOUSE">Quản Lý Kho</option>
                    <option value="EXECUTIVE">Ban Giám Đốc</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Lương căn bản (đ) *</label>
                  <input
                    type="number"
                    required
                    placeholder="8000000"
                    value={newEmpSalary}
                    onChange={e => setNewEmpSalary(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Tên đăng nhập hệ thống (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="nhanvien_sales01..."
                  value={newEmpUser}
                  onChange={e => setNewEmpUser(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddEmpModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', fontWeight: 900, cursor: 'pointer' }}>
                  Tạo Hồ Sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CHỈNH SỬA HỒ SƠ NHÂN VIÊN ── */}
      {editingEmp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Chỉnh Sửa Hồ Sơ Nhân Viên #{editingEmp.id}</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Cập nhật thông tin phòng ban, lương cứng và tài khoản đăng nhập</p>
              </div>
              <button onClick={() => setEditingEmp(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Họ và tên nhân viên *</label>
                <input
                  type="text"
                  value={editingEmp.name || editingEmp.fullname || ''}
                  onChange={e => setEditingEmp(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Phòng ban / Vai trò *</label>
                  <select
                    value={editingEmp.role || 'SALES'}
                    onChange={e => setEditingEmp(p => ({ ...p, role: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                  >
                    <option value="SALES">Phòng Bán Hàng</option>
                    <option value="ASSEMBLY">Kỹ Thuật Lắp Ráp</option>
                    <option value="ACCOUNTANT">Phòng Kế Toán</option>
                    <option value="WAREHOUSE">Quản Lý Kho</option>
                    <option value="EXECUTIVE">Ban Giám Đốc</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Tài khoản đăng nhập</label>
                  <input
                    type="text"
                    placeholder="VD: nhanvien01"
                    value={editingEmp.username || ''}
                    onChange={e => setEditingEmp(p => ({ ...p, username: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Lương căn bản mới (VNĐ) *</label>
                <input
                  type="number"
                  value={editingEmp.baseSalary || editingEmp.salary || ''}
                  onChange={e => setEditingEmp(p => ({ ...p, baseSalary: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 900, color: '#16a34a' }}
                />
                <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 800, marginTop: '0.3rem' }}>
                  ➜ Mức lương thực tế: {formatPrice(editingEmp.baseSalary || editingEmp.salary || 0)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  onClick={() => setEditingEmp(null)} 
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button 
                  onClick={() => {
                    const empIndex = (employees || []).findIndex(e => e && e.id === editingEmp.id);
                    if (empIndex >= 0) {
                      employees[empIndex] = { ...editingEmp };
                    }
                    setEditingEmp(null);
                    alert(`✅ Đã cập nhật hồ sơ cho nhân viên ${editingEmp.name || editingEmp.fullname}!`);
                  }}
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,70,229,0.25)' }}
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ĐIỀU CHỈNH LƯƠNG & PHỤ CẤP HR ── */}
      {adjustingEmp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Điều Chỉnh Lương & Phụ Cấp HR</h3>
                <div style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 700, marginTop: '0.15rem' }}>Nhân viên: {adjustingEmp.name}</div>
              </div>
              <button onClick={() => setAdjustingEmp(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>

            <form onSubmit={handleSaveAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#15803d', marginBottom: '0.35rem' }}>Thêm Phụ Cấp / Thưởng Khác (+ VNĐ)</label>
                <input
                  type="number"
                  placeholder="VD: 500000"
                  value={adjBonus}
                  onChange={e => setAdjBonus(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #bbf7d0', fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#b91c1c', marginBottom: '0.35rem' }}>Khấu Trừ Khác / Tạm Ứng Lương (- VNĐ)</label>
                <input
                  type="number"
                  placeholder="VD: 200000"
                  value={adjDeduction}
                  onChange={e => setAdjDeduction(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #fecaca', fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Ghi chú / Lý do điều chỉnh</label>
                <textarea
                  rows={2}
                  placeholder="VD: Thưởng vượt chỉ tiêu tháng, Tạm ứng lương tuần trước..."
                  value={adjNote}
                  onChange={e => setAdjNote(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#475569' }}>Lương thực nhận sau điều chỉnh:</span>
                <strong style={{ fontSize: '1.1rem', color: '#16a34a', fontWeight: 900 }}>
                  {formatPrice(Math.max(0, adjustingEmp.netSalary + (parseFloat(adjBonus) || 0) - (parseFloat(adjDeduction) || 0) - (adjustingEmp.extraBonus || 0) + (adjustingEmp.extraDeduction || 0)))}
                </strong>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setAdjustingEmp(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', fontWeight: 900, cursor: 'pointer' }}>
                  Lưu Điều Chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
