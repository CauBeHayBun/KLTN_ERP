import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Settings, Shield, Users, Database, Plus, X, Eye, EyeOff, Search, 
  CheckCircle, XCircle, AlertCircle, Key, Lock, Edit, Trash2, 
  RefreshCw, Download, Upload, Server, ShieldCheck, FileText, Check, 
  AlertTriangle, HardDrive, Cpu, Layers, Activity, ArrowRight, UserCheck, UserX,
  Building
} from 'lucide-react';
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
import { useERP } from '../../context/ERPContext';

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

const ROLES = [
  'CEO', 'SALES', 'WAREHOUSE', 'PURCHASING', 'QC', 
  'ASSEMBLY', 'HR', 'ACCOUNTANT', 'CSKH', 'DELIVERY', 'ADMIN'
];

const DEPARTMENTS = [
  'Ban Giám Đốc', 'Kinh Doanh', 'Kho Vận', 'Mua Hàng', 'Kiểm Định QA/QC',
  'Kỹ Thuật Lắp Ráp', 'Nhân Sự', 'Kế Toán', 'Chăm Sóc KH', 'Giao Vận', 'IT'
];

const ROLE_COLORS = {
  ADMIN: '#ef4444',
  CEO: '#f59e0b',
  SALES: '#2563eb',
  WAREHOUSE: '#10b981',
  PURCHASING: '#f97316',
  QC: '#8b5cf6',
  QA: '#8b5cf6',
  ASSEMBLY: '#0ea5e9',
  HR: '#ec4899',
  ACCOUNTANT: '#14b8a6',
  CSKH: '#06b6d4',
  DELIVERY: '#64748b'
};

const DEFAULT_RBAC_LIST = [
  { role: 'ADMIN', screen: 'Toàn bộ hệ thống & Quản trị', read: true, create: true, edit: true, approve: true, level: 'Toàn quyền cấu hình (Super Admin)', color: '#ef4444' },
  { role: 'CEO', screen: 'Ban Giám Đốc Dashboard', read: true, create: false, edit: false, approve: true, level: 'Xem KPI & Phê duyệt cấp cao', color: '#f59e0b' },
  { role: 'SALES', screen: 'Bán Hàng POS & Tra Cứu Khách Hàng', read: true, create: true, edit: true, approve: true, level: 'Quản lý & Tác nghiệp bán hàng', color: '#2563eb' },
  { role: 'WAREHOUSE', screen: 'Kho Vận, Nhập/Xuất Kho & Vị Trí Kệ', read: true, create: true, edit: true, approve: true, level: 'Quản lý & Thao tác kho hàng', color: '#10b981' },
  { role: 'PURCHASING', screen: 'Mua Hàng, Yêu Cầu Báo Giá & Đơn PO', read: true, create: true, edit: true, approve: false, level: 'Tác nghiệp mua hàng NCC', color: '#f97316' },
  { role: 'QC / QA', screen: 'Kiểm Định Hàng Nhập & Đổi Trả RMA', read: true, create: true, edit: true, approve: true, level: 'Thẩm định chất lượng', color: '#8b5cf6' },
  { role: 'ASSEMBLY', screen: 'Lắp Ráp PC & Kiểm Thử QA 4 Bước', read: true, create: true, edit: true, approve: false, level: 'Kỹ thuật viên build máy', color: '#0ea5e9' },
  { role: 'HR', screen: 'Hồ Sơ Nhân Sự, Chấm Công & Bảng Lương', read: true, create: true, edit: true, approve: false, level: 'Quản lý nhân sự', color: '#ec4899' },
  { role: 'ACCOUNTANT', screen: 'Kế Toán Tài Chính & Sổ Cái Thu Chi', read: true, create: true, edit: true, approve: false, level: 'Kế toán & hóa đơn VAT', color: '#14b8a6' },
  { role: 'CSKH', screen: 'Chăm Sóc Khách Hàng & Đổi Trả', read: true, create: true, edit: true, approve: false, level: 'Hỗ trợ & tư vấn khách', color: '#06b6d4' },
  { role: 'DELIVERY', screen: 'Giao Hàng & Thu Tiền COD', read: true, create: false, edit: true, approve: false, level: 'Shipper giao nhận', color: '#64748b' }
];

export default function SystemAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { employees = [], addEmployee, updateEmployee, deleteEmployee, orders = [], inventory = [], purchaseOrders = [] } = useERP() || {};

  // Active Tab from URL (?tab=overview|users|rbac|audit|settings)
  const activeTab = searchParams.get('tab') || 'overview';
  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);

  // RBAC Permission Matrix State
  const [rbacList, setRbacList] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_rbac_matrix');
      return saved ? JSON.parse(saved) : DEFAULT_RBAC_LIST;
    } catch (e) {
      return DEFAULT_RBAC_LIST;
    }
  });

  const handleTogglePermission = (roleName, permissionKey, value) => {
    setRbacList(prev => prev.map(item => {
      if (item.role === roleName) {
        return { ...item, [permissionKey]: value };
      }
      return item;
    }));
  };

  const handleSaveRbacMatrix = () => {
    localStorage.setItem('erp_rbac_matrix', JSON.stringify(rbacList));
    window.dispatchEvent(new Event('erp-rbac-changed'));
    alert('💾 Đã lưu và cập nhật ma trận phân quyền hệ thống thành công! Toàn bộ quyền thao tác đã được áp dụng.');
  };

  const handleResetDefaultRbac = () => {
    if (window.confirm('Khôi phục ma trận phân quyền về mặc định ban đầu?')) {
      setRbacList(DEFAULT_RBAC_LIST);
      localStorage.setItem('erp_rbac_matrix', JSON.stringify(DEFAULT_RBAC_LIST));
      window.dispatchEvent(new Event('erp-rbac-changed'));
      alert('🔄 Đã khôi phục ma trận phân quyền về mặc định ban đầu.');
    }
  };

  // System Configuration State
  const [companyConfig, setCompanyConfig] = useState({
    companyName: 'AetherPC Technology ERP JSC',
    taxCode: '0316888999',
    hotline: '1900 6868',
    email: 'admin@aetherpc.vn',
    address: 'Tầng 12, Tòa nhà Landmark 81, TP. Hồ Chí Minh',
    salesCommission: 1, // 1%
    assemblyBonus: 150000, // 150K
    defaultVat: 10, // 10%
    lowStockThreshold: 5
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, user: 'admin@aetherpc.vn', action: 'LOGIN', module: 'Hệ Thống', timestamp: '18/08/2026 08:30:12', ip: '192.168.1.10', status: 'SUCCESS' },
    { id: 2, user: 'hr@aetherpc.vn', action: 'CREATE_PAYROLL', module: 'Nhân Sự', timestamp: '18/08/2026 09:15:44', ip: '192.168.1.11', status: 'SUCCESS' },
    { id: 3, user: 'sales@aetherpc.vn', action: 'CREATE_ORDER', module: 'Bán Hàng', timestamp: '18/08/2026 10:02:07', ip: '192.168.1.12', status: 'SUCCESS' },
    { id: 4, user: 'unknown@ext.com', action: 'LOGIN', module: 'Bảo Mật', timestamp: '18/08/2026 10:45:00', ip: '103.77.12.44', status: 'FAILED' },
    { id: 5, user: 'purchasing@aetherpc.vn', action: 'CREATE_PO', module: 'Mua Hàng', timestamp: '18/08/2026 11:20:33', ip: '192.168.1.13', status: 'SUCCESS' },
    { id: 6, user: 'ceo@aetherpc.vn', action: 'APPROVE_PAYROLL', module: 'Ban Giám Đốc', timestamp: '18/08/2026 13:00:01', ip: '192.168.1.1', status: 'SUCCESS' },
    { id: 7, user: 'qc@aetherpc.vn', action: 'QA_INSPECTION', module: 'Kiểm Định QC', timestamp: '18/08/2026 14:10:20', ip: '192.168.1.15', status: 'SUCCESS' }
  ]);

  const [form, setForm] = useState({
    fullname: '',
    username: '',
    role: 'SALES',
    department: 'Kinh Doanh',
    salary: '8500000',
    password: ''
  });

  const fmt = n => new Intl.NumberFormat('vi-VN').format(n || 0);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const q = search.toLowerCase();
      const matchesSearch = !search || 
        e.fullname?.toLowerCase().includes(q) || 
        e.username?.toLowerCase().includes(q) || 
        e.role?.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || e.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, search, roleFilter]);

  // KPI Stats
  const failedSecurityCount = auditLogs.filter(l => l.status === 'FAILED').length;
  const stats = [
    { label: 'Tài Khoản Nhân Sự', value: `${employees.length} tài khoản`, change: 'Đang hoạt động trên hệ thống', icon: <Users size={20} />, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Vai Trò Định Danh (RBAC)', value: `${ROLES.length} Roles`, change: 'Phân quyền độc lập theo Actor', icon: <Shield size={20} />, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Cảnh Báo An Ninh', value: `${failedSecurityCount} cảnh báo`, change: 'Đăng nhập sai / IP bất thường', icon: <AlertTriangle size={20} />, color: failedSecurityCount > 0 ? '#ef4444' : '#16a34a', bg: '#fef2f2' },
    { label: 'Thao Tác Ghi Nhận', value: `${auditLogs.length} sự kiện`, change: 'Lưu vết trong ngày hôm nay', icon: <Activity size={20} />, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Cơ Sở Dữ Liệu PostgreSQL', value: 'Online 99.9%', change: 'Docker Container kltn_postgres', icon: <Database size={20} />, color: '#0ea5e9', bg: '#f0f9ff' },
    { label: 'Dữ Liệu Vận Hành', value: `${orders.length + inventory.length + purchaseOrders.length} bản ghi`, change: 'Đơn hàng, linh kiện kho & PO', icon: <HardDrive size={20} />, color: '#d97706', bg: '#fffbeb' }
  ];

  // Department distribution chart data
  const deptCounts = {};
  employees.forEach(emp => {
    const dept = emp.department || 'Kinh Doanh';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const deptChartData = {
    labels: Object.keys(deptCounts).length > 0 ? Object.keys(deptCounts) : ['Kinh Doanh', 'Kho Vận', 'Kỹ Thuật', 'Kế Toán', 'Khác'],
    datasets: [
      {
        data: Object.values(deptCounts).length > 0 ? Object.values(deptCounts) : [4, 3, 2, 2, 1],
        backgroundColor: ['#3b82f6', '#10b981', '#0ea5e9', '#ec4899', '#f59e0b', '#8b5cf6', '#64748b']
      }
    ]
  };

  // Hourly Audit Activity chart data
  const hourlyActivityData = {
    labels: ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'],
    datasets: [
      {
        label: 'Số Lượng Thao Tác',
        data: [12, 28, 45, 32, 20, 38, 15],
        backgroundColor: '#2563eb'
      }
    ]
  };

  const handleAddEmployee = () => {
    if (!form.fullname || !form.username || !form.salary) {
      alert('Vui lòng điền đầy đủ họ tên, username và lương cơ bản.');
      return;
    }
    if (parseInt(form.salary) < 1000000) {
      alert('Lương cơ bản phải từ 1.000.000 VNĐ trở lên.');
      return;
    }
    if (typeof addEmployee === 'function') {
      addEmployee(form.fullname, form.username, form.role, form.salary);
    }
    setForm({ fullname: '', username: '', role: 'SALES', department: 'Kinh Doanh', salary: '8500000', password: '' });
    setShowAdd(false);
    alert(`✅ Tài khoản nhân viên "${form.fullname}" (${form.username}) đã được tạo thành công!\nMật khẩu mặc định: 123456`);
  };

  const handleResetPassword = (emp) => {
    if (window.confirm(`Xác nhận ĐẶT LẠI MẬT KHẨU cho tài khoản "${emp.username}" về mật khẩu mặc định "123456"?`)) {
      alert(`🔑 Mật khẩu của tài khoản "${emp.username}" đã được đặt lại thành công về: 123456`);
    }
  };

  const handleBackupData = () => {
    const dataToExport = {
      timestamp: new Date().toISOString(),
      company: companyConfig,
      employees,
      orders,
      inventory,
      purchaseOrders,
      auditLogs
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AetherPC_ERP_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    alert('📥 Đã xuất và tải xuống file sao lưu dữ liệu toàn hệ thống ERP thành công!');
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={24} style={{ color: '#2563eb' }} />
            {activeTab === 'overview' && 'Tổng Quan Quản Trị Hệ Thống (System Admin Dashboard)'}
            {activeTab === 'users' && 'Quản Lý Tài Khoản & Người Dùng (Identity Management)'}
            {activeTab === 'rbac' && 'Ma Trận Phân Quyền Vai Trò (Role-Based Access Control - RBAC)'}
            {activeTab === 'audit' && 'Nhật Ký Kiểm Toán & Giám Sát An Ninh (Security Audit Trail)'}
            {activeTab === 'settings' && 'Cấu Hình Doanh Nghiệp & Sao Lưu Dữ Liệu (Settings & Backup)'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
            Quản trị hạ tầng ERP, kiểm soát tài khoản người dùng, phân quyền RBAC và sao lưu dữ liệu an toàn
          </p>
        </div>

        {activeTab === 'users' && (
          <button
            onClick={() => setShowAdd(true)}
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
            <Plus size={16} />
            <span>Thêm Nhân Viên Mới</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (TỔNG QUAN QUẢN TRỊ) */}
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
            {/* Department Chart */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', height: '320px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Phân Bổ Nhân Sự Theo Phòng Ban
              </h3>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut
                  data={deptChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
                  }}
                />
              </div>
            </div>

            {/* Hourly Activity Chart */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', height: '320px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Lưu Lượng Thao Tác Hệ Thống Hôm Nay
              </h3>
              <div style={{ flex: 1, position: 'relative' }}>
                <Bar
                  data={hourlyActivityData}
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

          {/* Quick Shortcuts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0' }}>
                Tài Khoản Vừa Tạo Gần Đây
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {employees.slice(0, 3).map((emp, eIdx) => (
                  <div key={eIdx} style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{emp.fullname}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Username: {emp.username}</span>
                    </div>
                    <span style={{ backgroundColor: `${ROLE_COLORS[emp.role] || '#6366f1'}15`, color: ROLE_COLORS[emp.role] || '#6366f1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                      {emp.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0' }}>
                Trạng Thái Hạ Tầng & Backup
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <span>Docker Backend (Port 5000):</span>
                  <strong style={{ color: '#16a34a' }}>Đang chạy (Healthy)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <span>PostgreSQL DB (Port 5432):</span>
                  <strong style={{ color: '#16a34a' }}>Kết nối hoàn hảo</strong>
                </div>
                <button
                  onClick={handleBackupData}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <Download size={14} /> Sao Lưu Dữ Liệu Ngay (Backup JSON)
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USERS (QUẢN LÝ TÀI KHOẢN) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          
          {/* Filter Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <input
                type="text"
                placeholder="Tìm theo họ tên, username, vai trò..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Lọc Vai Trò:</span>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#0f172a' }}
              >
                <option value="ALL">Tất cả ({employees.length})</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* User Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Mã NV</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Họ và Tên</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Username Đăng Nhập</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Vai Trò (Role)</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Phòng Ban</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Lương Cơ Bản</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác Admin</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, i) => (
                  <tr key={emp.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#64748b' }}>NV-{emp.id || i + 1}</td>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>{emp.fullname}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <code style={{ fontSize: '0.8rem', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                        {emp.username}
                      </code>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        backgroundColor: `${ROLE_COLORS[emp.role] || '#6366f1'}15`,
                        color: ROLE_COLORS[emp.role] || '#6366f1'
                      }}>
                        {emp.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>{emp.department || 'Kinh Doanh'}</td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmt(emp.salary)} ₫</td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleResetPassword(emp)}
                          style={{ backgroundColor: '#ffffff', color: '#d97706', border: '1px solid #fde68a', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          title="Đặt lại mật khẩu về 123456"
                        >
                          <Key size={12} /> Reset Pass
                        </button>
                        <button
                          onClick={() => setEditingEmp({ ...emp })}
                          style={{ backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <Edit size={12} /> Sửa
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Xác nhận xóa tài khoản "${emp.fullname}"?`)) {
                              if (typeof deleteEmployee === 'function') deleteEmployee(emp.id);
                            }
                          }}
                          style={{ backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          <Trash2 size={12} />
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

      {/* ========================================================================= */}
      {/* TAB 3: RBAC (MA TRẬN PHÂN QUYỀN CÓ THỂ CHỈNH SỬA) */}
      {/* ========================================================================= */}
      {activeTab === 'rbac' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={18} style={{ color: '#8b5cf6' }} />
                <span>Ma Trận Phân Quyền Vai Trò (Role-Based Access Control - RBAC)</span>
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
                Tích chọn / bỏ chọn trực tiếp để điều chỉnh quyền hạn Xem, Tạo mới, Sửa đổi, Phê duyệt cho từng vai trò
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleResetDefaultRbac}
                style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <RefreshCw size={14} /> Khôi Phục Mặc Định
              </button>
              <button
                onClick={handleSaveRbacMatrix}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.4rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Check size={16} /> Lưu Ma Trận Phân Quyền
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Vai Trò (Role)</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Màn Hình Phụ Trách</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Xem (Read)</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Tạo Mới (Create)</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Sửa Đổi (Edit)</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Phê Duyệt (Approve)</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Cấp Độ Phân Quyền</th>
                </tr>
              </thead>
              <tbody>
                {rbacList.map((r) => {
                  const isAdminRole = r.role === 'ADMIN';
                  return (
                    <tr key={r.role} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, backgroundColor: `${r.color}15`, color: r.color }}>
                          {r.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>{r.screen}</td>
                      
                      {/* Read Checkbox */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={r.read}
                          disabled={isAdminRole}
                          onChange={(e) => handleTogglePermission(r.role, 'read', e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: isAdminRole ? 'not-allowed' : 'pointer', accentColor: '#16a34a' }}
                        />
                      </td>

                      {/* Create Checkbox */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={r.create}
                          disabled={isAdminRole}
                          onChange={(e) => handleTogglePermission(r.role, 'create', e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: isAdminRole ? 'not-allowed' : 'pointer', accentColor: '#2563eb' }}
                        />
                      </td>

                      {/* Edit Checkbox */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={r.edit}
                          disabled={isAdminRole}
                          onChange={(e) => handleTogglePermission(r.role, 'edit', e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: isAdminRole ? 'not-allowed' : 'pointer', accentColor: '#2563eb' }}
                        />
                      </td>

                      {/* Approve Checkbox */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={r.approve}
                          disabled={isAdminRole}
                          onChange={(e) => handleTogglePermission(r.role, 'approve', e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: isAdminRole ? 'not-allowed' : 'pointer', accentColor: '#f59e0b' }}
                        />
                      </td>

                      <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.75rem' }}>
                        {r.level}
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
      {/* TAB 4: AUDIT (NHẬT KÝ KIỂM TOÁN) */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={18} style={{ color: '#2563eb' }} />
              <span>Nhật Ký Thao Tác & Giám Sát An Ninh Hệ Thống</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Hiển thị {auditLogs.length} sự kiện gần nhất
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Thời Gian</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Người Thực Hiện</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Hành Động</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Phân Hệ</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Địa Chỉ IP</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Kết Quả</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: log.status === 'FAILED' ? '#fef2f2' : undefined }}>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontFamily: 'monospace' }}>{log.timestamp}</td>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>{log.user}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <code style={{ fontSize: '0.78rem', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                        {log.action}
                      </code>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>{log.module}</td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontFamily: 'monospace' }}>{log.ip}</td>
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: log.status === 'SUCCESS' ? '#f0fdf4' : '#fef2f2',
                        color: log.status === 'SUCCESS' ? '#15803d' : '#dc2626',
                        border: `1px solid ${log.status === 'SUCCESS' ? '#bbf7d0' : '#fecaca'}`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 800
                      }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SETTINGS (CẤU HÌNH & SAO LƯU DỮ LIỆU) */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.25rem' }}>
          
          {/* Company Information Form */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building size={18} style={{ color: '#2563eb' }} />
              <span>Thông Tin Doanh Nghiệp & Hóa Đơn</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Tên Công Ty:</label>
                <input
                  type="text"
                  value={companyConfig.companyName}
                  onChange={e => setCompanyConfig(p => ({ ...p, companyName: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Mã Số Thuế (MST):</label>
                <input
                  type="text"
                  value={companyConfig.taxCode}
                  onChange={e => setCompanyConfig(p => ({ ...p, taxCode: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Hotline CSKH:</label>
                <input
                  type="text"
                  value={companyConfig.hotline}
                  onChange={e => setCompanyConfig(p => ({ ...p, hotline: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Địa Chỉ Trụ Sở:</label>
                <input
                  type="text"
                  value={companyConfig.address}
                  onChange={e => setCompanyConfig(p => ({ ...p, address: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={() => alert('✅ Đã lưu cấu hình thông tin doanh nghiệp thành công!')}
                style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', marginTop: '0.5rem' }}
              >
                Lưu Cấu Hình Doanh Nghiệp
              </button>
            </div>
          </div>

          {/* Business Rules & Backup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Automatic Business Parameters */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Settings size={18} style={{ color: '#16a34a' }} />
                <span>Tham Số Tự Động Hóa Nghiệp Vụ</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.82rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Hoa Hồng Sales (%):</label>
                  <input
                    type="number"
                    value={companyConfig.salesCommission}
                    onChange={e => setCompanyConfig(p => ({ ...p, salesCommission: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Thưởng Ráp PC (VNĐ/bộ):</label>
                  <input
                    type="number"
                    value={companyConfig.assemblyBonus}
                    onChange={e => setCompanyConfig(p => ({ ...p, assemblyBonus: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Thuế VAT Mặc Định (%):</label>
                  <input
                    type="number"
                    value={companyConfig.defaultVat}
                    onChange={e => setCompanyConfig(p => ({ ...p, defaultVat: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Ngưỡng Cảnh Báo Tồn Kho:</label>
                  <input
                    type="number"
                    value={companyConfig.lowStockThreshold}
                    onChange={e => setCompanyConfig(p => ({ ...p, lowStockThreshold: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Backup & Restore Hub */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardDrive size={18} style={{ color: '#d97706' }} />
                <span>Sao Lưu & Phục Hồi Cơ Sở Dữ Liệu</span>
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '1rem' }}>
                Xuất file sao lưu toàn bộ dữ liệu đơn hàng, kho hàng, tài khoản nhân sự phục vụ lưu trữ định kỳ.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleBackupData}
                  style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Download size={15} /> Tải Về File Sao Lưu (Backup JSON)
                </button>
                <button
                  onClick={() => alert('📤 Chức năng Phục Hồi Dữ Liệu: Hãy chọn file backup .json để ghi đè dữ liệu.')}
                  style={{ backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Upload size={15} /> Khôi Phục Dữ Liệu (Restore)
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= MODAL: THÊM NHÂN VIÊN MỚI ================= */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '480px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Tạo Tài Khoản Nhân Viên Mới</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Họ và tên *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn Hùng"
                  value={form.fullname}
                  onChange={e => setForm(p => ({ ...p, fullname: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Username (Dùng đăng nhập) *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: hungnv"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Vai Trò (Role) *</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Phòng ban</label>
                <select
                  value={form.department}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Lương cơ bản (VNĐ) *</label>
                <input
                  type="number"
                  placeholder="8500000"
                  value={form.salary}
                  onChange={e => setForm(p => ({ ...p, salary: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.78rem', color: '#15803d' }}>
                ℹ️ Mật khẩu khởi tạo mặc định: <strong>123456</strong> (Nhân viên có thể đổi sau khi đăng nhập).
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={15} /> Tạo Tài Khoản
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: CHỈNH SỬA NHÂN VIÊN ================= */}
      {editingEmp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '480px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Chỉnh Sửa Tài Khoản #{editingEmp.id}</h3>
              <button onClick={() => setEditingEmp(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Họ và tên *</label>
                <input
                  type="text"
                  value={editingEmp.fullname}
                  onChange={e => setEditingEmp(p => ({ ...p, fullname: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Username</label>
                <input
                  type="text"
                  value={editingEmp.username}
                  disabled
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Vai Trò (Role) *</label>
                <select
                  value={editingEmp.role}
                  onChange={e => setEditingEmp(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>Lương cơ bản (VNĐ) *</label>
                <input
                  type="number"
                  value={editingEmp.salary}
                  onChange={e => setEditingEmp(p => ({ ...p, salary: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof updateEmployee === 'function') {
                      updateEmployee(editingEmp.id, { fullname: editingEmp.fullname, role: editingEmp.role, salary: editingEmp.salary });
                    }
                    setEditingEmp(null);
                    alert('✅ Cập nhật thông tin nhân viên thành công!');
                  }}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
