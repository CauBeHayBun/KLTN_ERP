import React, { useState } from 'react';
import { Settings, Shield, Users, Database, Plus, X, Eye, EyeOff, Search, CheckCircle, XCircle, AlertCircle, Key, Lock, Edit, Trash2 } from 'lucide-react';
import { useERP } from '../../context/ERPContext';

const ROLES = ['CEO', 'SALES', 'SALES_MANAGER', 'WAREHOUSE', 'WAREHOUSE_MANAGER', 'ASSEMBLY', 'HR', 'ACCOUNTANT', 'PURCHASING', 'CSKH', 'DELIVERY', 'ADMIN'];
const DEPARTMENTS = ['Ban Giám Đốc', 'Kinh Doanh', 'Kho Vận', 'Kỹ Thuật', 'Nhân Sự', 'Kế Toán', 'Mua Hàng', 'Chăm Sóc KH', 'Giao Vận', 'IT'];

export default function SystemAdmin() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useERP();
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [auditLogs] = useState([
    { id: 1, user: 'admin@aetherpc.vn', action: 'LOGIN', module: 'Auth', timestamp: '23/07/2026 08:30:12', ip: '192.168.1.10', status: 'SUCCESS' },
    { id: 2, user: 'hr@aetherpc.vn', action: 'CREATE_PAYROLL', module: 'HR', timestamp: '23/07/2026 09:15:44', ip: '192.168.1.11', status: 'SUCCESS' },
    { id: 3, user: 'sales@aetherpc.vn', action: 'UPDATE_ORDER_STATUS', module: 'Sales', timestamp: '23/07/2026 10:02:07', ip: '192.168.1.12', status: 'SUCCESS' },
    { id: 4, user: 'unknown@ext.com', action: 'LOGIN', module: 'Auth', timestamp: '23/07/2026 10:45:00', ip: '103.77.12.44', status: 'FAILED' },
    { id: 5, user: 'purchasing@aetherpc.vn', action: 'CREATE_PO', module: 'Purchasing', timestamp: '23/07/2026 11:20:33', ip: '192.168.1.13', status: 'SUCCESS' },
    { id: 6, user: 'ceo@aetherpc.vn', action: 'APPROVE_PAYROLL', module: 'Dashboard', timestamp: '23/07/2026 13:00:01', ip: '192.168.1.1', status: 'SUCCESS' },
  ]);

  const [form, setForm] = useState({ fullname: '', username: '', role: 'SALES', department: 'Kinh Doanh', salary: '', password: '' });

  const filteredEmployees = employees.filter(e => {
    const q = search.toLowerCase();
    return !search || e.fullname?.toLowerCase().includes(q) || e.username?.toLowerCase().includes(q) || e.role?.toLowerCase().includes(q);
  });

  const handleAddEmployee = () => {
    if (!form.fullname || !form.username || !form.salary || !form.password) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc'); return;
    }
    if (parseInt(form.salary) < 1000000) {
      alert('Lương cơ bản phải ít nhất 1.000.000 VNĐ'); return;
    }
    addEmployee(form.fullname, form.username, form.role, form.salary);
    setForm({ fullname: '', username: '', role: 'SALES', department: 'Kinh Doanh', salary: '', password: '' });
    setShowAdd(false);
    alert(`✅ Tài khoản nhân viên "${form.fullname}" (${form.username}) đã được tạo thành công!\nMật khẩu mặc định: 123456`);
  };

  const fmt = n => new Intl.NumberFormat('vi-VN').format(n);

  return (
    <div style={{ padding: '2rem 2rem 3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings size={28} style={{ color: '#6366f1' }} />
            Quản Trị Hệ Thống (System Admin)
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Quản lý tài khoản, phân quyền RBAC và nhật ký hệ thống.
          </p>
        </div>
        {tab === 'users' && (
          <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Thêm Nhân Viên
          </button>
        )}
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Tổng tài khoản NV', value: employees.length, color: '#6366f1', icon: <Users size={18}/> },
          { label: 'Roles hệ thống', value: ROLES.length, color: '#0ea5e9', icon: <Key size={18}/> },
          { label: 'Cảnh báo bảo mật', value: auditLogs.filter(l => l.status === 'FAILED').length, color: '#ef4444', icon: <AlertCircle size={18}/> },
          { label: 'Hoạt động hôm nay', value: auditLogs.length, color: '#10b981', icon: <CheckCircle size={18}/> },
        ].map((k, i) => (
          <div key={i} className="card-glass" style={{ padding: '1.25rem', borderLeft: `4px solid ${k.color}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ color: k.color, backgroundColor: `${k.color}18`, padding: '0.625rem', borderRadius: '8px' }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{k.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: Tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { key: 'users', label: 'Tài Khoản Nhân Viên', icon: <Users size={14}/> },
            { key: 'rbac', label: 'Ma Trận Phân Quyền (RBAC)', icon: <Shield size={14}/> },
            { key: 'audit', label: 'Nhật Ký Hệ Thống', icon: <Database size={14}/> },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.2s' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div style={{ position: 'relative', width: '300px', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, username, role..."
              className="input-field" style={{ paddingLeft: '2.5rem', width: '100%' }} />
          </div>
        )}
      </div>

      {/* ── TAB: USERS ── */}
      {tab === 'users' && (
        <>
          <div className="table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Họ Tên</th>
                  <th>Username</th>
                  <th>Vai Trò (Role)</th>
                  <th>Lương CB</th>
                  <th>Trạng Thái</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, i) => (
                  <tr key={emp.id || i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{emp.id}</td>
                    <td><strong style={{ fontSize: '0.875rem' }}>{emp.fullname}</strong></td>
                    <td><code style={{ fontSize: '0.8rem', color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{emp.username}</code></td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        backgroundColor: emp.role === 'ADMIN' ? 'rgba(239,68,68,0.15)' : emp.role === 'CEO' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                        color: emp.role === 'ADMIN' ? '#ef4444' : emp.role === 'CEO' ? '#f59e0b' : '#6366f1' }}>
                        {emp.role}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{fmt(emp.salary)} ₫</td>
                    <td>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        {emp.attendance === 'ABSENT' ? 'Vắng' : 'Hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          onClick={() => setEditingEmp({ ...emp })}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Sửa thông tin">
                          <Edit size={13} /> Sửa
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa nhân viên "${emp.fullname}"?`)) {
                              deleteEmployee(emp.id);
                            }
                          }}
                          className="btn"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                          title="Xóa nhân viên">
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Không tìm thấy nhân viên</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB: RBAC Matrix ── */}
      {tab === 'rbac' && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Ma trận phân quyền RBAC – tất cả <strong>{ROLES.length} vai trò</strong> của hệ thống AetherPC.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Vai Trò</th>
                  <th>Module Truy Cập</th>
                  <th>Màn Hình</th>
                  <th>Cấp độ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: 'ADMIN', modules: ['Tất cả modules'], screen: 'System Admin', level: 'Toàn quyền', color: '#ef4444' },
                  { role: 'CEO', modules: ['Dashboard', 'Duyệt PR', 'Duyệt lương', 'Duyệt nghỉ'], screen: 'CEO Dashboard', level: 'Xem & Duyệt', color: '#f59e0b' },
                  { role: 'SALES', modules: ['M2 Bán hàng'], screen: 'SalesPOS', level: 'Tạo & Cập nhật', color: '#6366f1' },
                  { role: 'SALES_MANAGER', modules: ['M2 Bán hàng', 'Phê duyệt CK'], screen: 'SalesPOS + Phê duyệt', level: 'Quản lý', color: '#8b5cf6' },
                  { role: 'WAREHOUSE', modules: ['M4 Kho vận'], screen: 'Warehouse', level: 'Tạo & Cập nhật', color: '#10b981' },
                  { role: 'WAREHOUSE_MANAGER', modules: ['M4 Kho vận', 'Kiểm kê'], screen: 'Warehouse + Báo cáo', level: 'Quản lý', color: '#059669' },
                  { role: 'ASSEMBLY', modules: ['M4 Lắp ráp BOM'], screen: 'Assembly', level: 'Tạo & Cập nhật', color: '#0ea5e9' },
                  { role: 'HR', modules: ['M5 Nhân sự', 'Bảng lương'], screen: 'HR Manager', level: 'Quản lý', color: '#d946ef' },
                  { role: 'ACCOUNTANT', modules: ['M6 Kế toán', 'Sổ cái'], screen: 'Accountant', level: 'Xem & Ghi nhận', color: '#ec4899' },
                  { role: 'PURCHASING', modules: ['M3 Mua hàng', 'NCC'], screen: 'Purchasing', level: 'Tạo & Cập nhật', color: '#f97316' },
                  { role: 'CSKH', modules: ['M2 Khiếu nại', 'Đổi trả'], screen: 'Customer Service', level: 'Xử lý', color: '#14b8a6' },
                  { role: 'DELIVERY', modules: ['M2 Giao hàng'], screen: 'Delivery', level: 'Nhận & Cập nhật', color: '#6366f1' },
                  { role: 'SUPPLIER', modules: ['M3 Cổng NCC'], screen: 'Supplier Portal', level: 'Xem & Xác nhận', color: '#64748b' },
                ].map(r => (
                  <tr key={r.role}>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: `${r.color}22`, color: r.color }}>{r.role}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.modules.join(', ')}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{r.screen}</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{r.level}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: AUDIT LOG ── */}
      {tab === 'audit' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Nhật ký thao tác hệ thống – hiển thị {auditLogs.length} sự kiện gần nhất.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                {auditLogs.filter(l => l.status === 'FAILED').length} Cảnh báo
              </span>
            </div>
          </div>
          <div className="table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Thời Gian</th>
                  <th>Người Dùng</th>
                  <th>Hành Động</th>
                  <th>Module</th>
                  <th>IP Address</th>
                  <th>Kết Quả</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} style={{ backgroundColor: log.status === 'FAILED' ? 'rgba(239,68,68,0.04)' : undefined }}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.timestamp}</td>
                    <td style={{ fontSize: '0.8rem' }}>{log.user}</td>
                    <td><code style={{ fontSize: '0.75rem', color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{log.action}</code></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.module}</td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.ip}</td>
                    <td>
                      {log.status === 'SUCCESS'
                        ? <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>SUCCESS</span>
                        : <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>FAILED</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: Thêm nhân viên mới ── */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '480px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Tạo Tài Khoản Nhân Viên Mới</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { key: 'fullname', label: 'Họ và tên *', placeholder: 'Nguyễn Văn A' },
                { key: 'username', label: 'Username (dùng để đăng nhập) *', placeholder: 'nvana' },
                { key: 'salary', label: 'Lương cơ bản (VNĐ) *', placeholder: '15000000', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>{f.label}</label>
                  <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="input-field" style={{ width: '100%' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Vai Trò (Role) *</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="input-field" style={{ width: '100%' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Phòng ban</label>
                <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className="input-field" style={{ width: '100%' }}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.8rem', color: '#10b981' }}>
                ℹ️ Mật khẩu mặc định cho tài khoản mới: <strong>123456</strong> (nhân viên cần đổi sau khi đăng nhập lần đầu)
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Hủy</button>
                <button onClick={handleAddEmployee} className="btn btn-primary">
                  <Plus size={14} style={{ marginRight: '4px' }}/> Tạo Tài Khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Sửa nhân viên ── */}
      {editingEmp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '480px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Chỉnh Sửa Nhân Viên #{editingEmp.id}</h3>
              <button onClick={() => setEditingEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Họ và tên *</label>
                <input value={editingEmp.fullname} onChange={e => setEditingEmp(p => ({ ...p, fullname: e.target.value }))} className="input-field" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Username</label>
                <input value={editingEmp.username} disabled className="input-field" style={{ width: '100%', opacity: 0.6 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Vai Trò (Role) *</label>
                <select value={editingEmp.role} onChange={e => setEditingEmp(p => ({ ...p, role: e.target.value }))} className="input-field" style={{ width: '100%' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Lương cơ bản (VNĐ) *</label>
                <input type="number" value={editingEmp.salary} onChange={e => setEditingEmp(p => ({ ...p, salary: parseInt(e.target.value) || 0 }))} className="input-field" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingEmp(null)} className="btn btn-secondary">Hủy</button>
                <button onClick={() => {
                  updateEmployee(editingEmp.id, { fullname: editingEmp.fullname, role: editingEmp.role, salary: editingEmp.salary });
                  setEditingEmp(null);
                  alert('✅ Cập nhật thông tin nhân viên thành công!');
                }} className="btn btn-primary">Lưu Thay Đổi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
