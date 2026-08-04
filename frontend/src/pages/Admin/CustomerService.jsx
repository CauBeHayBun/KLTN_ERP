import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import {
  HeadphonesIcon, AlertCircle, MessageSquare, RefreshCw, CheckCircle,
  Clock, X, Plus, User, Phone, Mail, ChevronDown, Filter, Search, 
  ArrowRight, Package, Tag
} from 'lucide-react';

const PRIORITY_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };
const STATUS_LABELS = {
  OPEN: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết', CLOSED: 'Đã đóng'
};
const STATUS_COLORS = {
  OPEN: '#ef4444', IN_PROGRESS: '#f59e0b', RESOLVED: '#10b981', CLOSED: '#64748b'
};

const RETURN_STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  RETURNING: 'Đang thu hồi',
  RETURNED: 'Kho đã nhận',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  COMPLETED: 'Hoàn thành',
  REFUNDED: 'Đã hoàn tiền'
};
const RETURN_STATUS_COLORS = {
  PENDING: '#f59e0b',
  PROCESSING: '#6366f1',
  RETURNING: '#3b82f6',
  RETURNED: '#ec4899',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  COMPLETED: '#10b981',
  REFUNDED: '#10b981'
};

export default function CustomerService() {
  const { complaints, addComplaint, updateComplaintStatus, returnRequests, updateReturnStatus, orders } = useERP();
  const { user } = useAuth();
  const [tab, setTab] = useState('complaints');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedReturnDetail, setSelectedReturnDetail] = useState(null);
  const [resolution, setResolution] = useState('');
  const [csNote, setCsNote] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  // New ticket form
  const [form, setForm] = useState({
    customerName: '', phone: '', email: '', subject: '', description: '', priority: 'MEDIUM'
  });

  const filteredComplaints = complaints.filter(c => {
    const matchSearch = !search || c.customerName?.toLowerCase().includes(search.toLowerCase()) 
      || c.subject?.toLowerCase().includes(search.toLowerCase())
      || c.id?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredReturns = returnRequests.filter(r => {
    const matchSearch = !search || r.customerName?.toLowerCase().includes(search.toLowerCase())
      || r.orderId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAddTicket = () => {
    if (!form.customerName || !form.subject || !form.description) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    addComplaint({ ...form, assignedTo: user?.name || 'NV CSKH' });
    setForm({ customerName: '', phone: '', email: '', subject: '', description: '', priority: 'MEDIUM' });
    setShowAddTicket(false);
    alert('✅ Ticket khiếu nại đã được tạo thành công!');
  };

  const handleResolve = (id) => {
    if (!resolution.trim()) { alert('Vui lòng nhập hướng xử lý'); return; }
    updateComplaintStatus(id, 'RESOLVED', user?.name, resolution);
    setSelectedTicket(null);
    setResolution('');
  };

  const handleReturnUpdate = (id, status) => {
    updateReturnStatus(id, status);
  };

  const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  // KPIs
  const openCount = complaints.filter(c => c.status === 'OPEN').length;
  const inProgressCount = complaints.filter(c => c.status === 'IN_PROGRESS').length;
  const pendingReturns = returnRequests.filter(r => r.status === 'PENDING').length;
  const resolvedToday = complaints.filter(c => c.status === 'RESOLVED').length;

  const kpis = [
    { label: 'Ticket mới', value: openCount, icon: <AlertCircle size={20}/>, color: '#ef4444' },
    { label: 'Đang xử lý', value: inProgressCount, icon: <Clock size={20}/>, color: '#f59e0b' },
    { label: 'Đơn đổi trả chờ', value: pendingReturns, icon: <RefreshCw size={20}/>, color: '#6366f1' },
    { label: 'Đã giải quyết', value: resolvedToday, icon: <CheckCircle size={20}/>, color: '#10b981' },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HeadphonesIcon size={28} style={{ color: '#6366f1' }} />
            Chăm Sóc Khách Hàng (CSKH)
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Xử lý khiếu nại, tư vấn và quản lý yêu cầu đổi trả khách hàng.
          </p>
        </div>
        <button onClick={() => setShowAddTicket(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Tạo Ticket Mới
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpis.map((k, i) => (
          <div key={i} className="card-glass" style={{ padding: '1.25rem', borderLeft: `4px solid ${k.color}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ color: k.color, backgroundColor: `${k.color}18`, padding: '0.625rem', borderRadius: '8px' }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{k.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: Tabs + Search & Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { key: 'complaints', label: `Khiếu nại & Hỗ trợ (${complaints.length})`, icon: <MessageSquare size={15}/> },
            { key: 'returns', label: `Yêu cầu đổi trả (${returnRequests.length})`, icon: <RefreshCw size={15}/> },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setStatusFilter('ALL'); setSearch(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'all 0.2s'
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên KH, mã ticket..." className="input-field"
              style={{ paddingLeft: '2.5rem', width: '100%' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input-field" style={{ width: '160px' }}>
            <option value="ALL">Tất cả trạng thái</option>
            {tab === 'complaints'
              ? Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)
              : Object.entries(RETURN_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)
            }
          </select>
        </div>
      </div>

      {/* ── COMPLAINTS TAB ── */}
      {tab === 'complaints' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredComplaints.length === 0 ? (
            <div className="card-glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Không có ticket nào phù hợp
            </div>
          ) : filteredComplaints.map(ticket => (
            <div key={ticket.id} className="card-glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#6366f1', fontSize: '0.875rem' }}>{ticket.id}</strong>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: `${PRIORITY_COLORS[ticket.priority]}22`, color: PRIORITY_COLORS[ticket.priority] }}>
                      {ticket.priority}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: `${STATUS_COLORS[ticket.status]}22`, color: STATUS_COLORS[ticket.status] }}>
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </span>
                  </div>
                  <h4 style={{ margin: '0.25rem 0 0', color: 'var(--text-primary)' }}>{ticket.subject}</h4>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ticket.date}</span>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12}/> {ticket.customerName}</span>
                {ticket.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12}/> {ticket.phone}</span>}
                {ticket.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12}/> {ticket.email}</span>}
                {ticket.assignedTo && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Tag size={12}/> Phụ trách: {ticket.assignedTo}</span>}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: '3px solid var(--border-glass)' }}>
                {ticket.description}
              </p>
              {ticket.resolution && (
                <p style={{ fontSize: '0.8rem', color: '#10b981', margin: 0, padding: '0.75rem', backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                  ✓ Hướng xử lý: {ticket.resolution}
                </p>
              )}
              {/* Actions */}
              {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ticket.status === 'OPEN' && (
                    <button onClick={() => updateComplaintStatus(ticket.id, 'IN_PROGRESS', user?.name)}
                      className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                      Nhận xử lý
                    </button>
                  )}
                  <button onClick={() => { setSelectedTicket(ticket); setResolution(''); }}
                    className="btn btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                    Giải quyết
                  </button>
                  <button onClick={() => updateComplaintStatus(ticket.id, 'CLOSED', ticket.assignedTo)}
                    className="btn" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    Đóng
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── RETURNS TAB ── */}
      {tab === 'returns' && (
        <div className="table-container">
          <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem', fontSize: '0.8rem' }}>Mã Yêu Cầu</th>
                <th style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem', fontSize: '0.8rem' }}>Mã Đơn Hàng</th>
                <th style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem', fontSize: '0.8rem' }}>Khách Hàng</th>
                <th style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem', fontSize: '0.8rem' }}>Loại</th>
                <th style={{ padding: '0.625rem 0.5rem', fontSize: '0.8rem' }}>Lý Do</th>
                <th style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem', fontSize: '0.8rem' }}>Ngày</th>
                <th style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem', fontSize: '0.8rem' }}>Trạng Thái</th>
                <th style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem', fontSize: '0.8rem', textAlign: 'center' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Không có yêu cầu nào</td></tr>
              ) : filteredReturns.map(r => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem' }}>
                    <strong title={r.id} style={{ color: '#4f46e5', fontSize: '0.8125rem', fontFamily: 'monospace', letterSpacing: '-0.3px' }}>
                      {r.id.length > 15 ? `${r.id.slice(0, 11)}...` : r.id}
                    </strong>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem' }}>
                    <strong style={{ color: '#2563eb', fontSize: '0.8125rem', fontFamily: 'monospace' }}>{r.orderId}</strong>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{r.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.phone}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap',
                      backgroundColor: r.type === 'REFUND' ? '#fee2e2' : '#e0e7ff',
                      color: r.type === 'REFUND' ? '#dc2626' : '#4f46e5' }}>
                      {r.type === 'REFUND' ? 'Hoàn tiền' : 'Đổi hàng'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.35, padding: '0.625rem 0.5rem', maxWidth: '180px' }}>
                    {r.reason}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem', fontSize: '0.78rem', color: '#64748b' }}>{r.date}</td>
                  <td style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap',
                      backgroundColor: `${RETURN_STATUS_COLORS[r.status] || '#64748b'}20`,
                      color: RETURN_STATUS_COLORS[r.status] || '#334155' }}>
                      {RETURN_STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', padding: '0.625rem 0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
                      <button onClick={() => { setSelectedReturnDetail(r); setCsNote(r.resolution || ''); }}
                        className="btn btn-secondary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                        Xem Chi Tiết
                      </button>
                      {r.status === 'PENDING' && <>
                        <button onClick={() => handleReturnUpdate(r.id, 'PROCESSING')} className="btn btn-secondary" style={{ padding: '0.22rem 0.45rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Xử lý</button>
                        <button onClick={() => handleReturnUpdate(r.id, 'APPROVED')} className="btn btn-primary" style={{ padding: '0.22rem 0.45rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Duyệt</button>
                      </>}
                      {r.status === 'PROCESSING' && <>
                        <button onClick={() => handleReturnUpdate(r.id, 'APPROVED')} className="btn btn-primary" style={{ padding: '0.22rem 0.45rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Duyệt</button>
                        <button onClick={() => handleReturnUpdate(r.id, 'REJECTED')} className="btn" style={{ padding: '0.22rem 0.45rem', fontSize: '0.7rem', whiteSpace: 'nowrap', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Từ chối</button>
                      </>}
                      {r.status === 'APPROVED' && (
                        <button onClick={() => handleReturnUpdate(r.id, 'COMPLETED')} className="btn btn-primary" style={{ padding: '0.22rem 0.45rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Hoàn thành</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: Tạo Ticket Mới ── */}
      {showAddTicket && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '520px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Tạo Ticket Khiếu Nại Mới</h3>
              <button onClick={() => setShowAddTicket(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { key: 'customerName', label: 'Tên khách hàng *', placeholder: 'Nguyễn Văn A' },
                { key: 'phone', label: 'Số điện thoại', placeholder: '09xxxxxxxx' },
                { key: 'email', label: 'Email', placeholder: 'email@example.com' },
                { key: 'subject', label: 'Tiêu đề khiếu nại *', placeholder: 'Mô tả ngắn vấn đề...' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="input-field" style={{ width: '100%' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Mức độ ưu tiên</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="input-field" style={{ width: '100%' }}>
                  <option value="HIGH">Cao - HIGH</option>
                  <option value="MEDIUM">Trung bình - MEDIUM</option>
                  <option value="LOW">Thấp - LOW</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Mô tả chi tiết *</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Khách hàng phản ánh..." className="input-field" rows={4}
                  style={{ width: '100%', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddTicket(false)} className="btn btn-secondary">Hủy</button>
                <button onClick={handleAddTicket} className="btn btn-primary">Tạo Ticket</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Giải quyết ticket khiếu nại ── */}
      {selectedTicket && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Giải Quyết Ticket {selectedTicket.id}</h3>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20}/></button>
            </div>
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
              <strong style={{ fontSize: '0.875rem' }}>{selectedTicket.subject}</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>{selectedTicket.description}</p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Hướng xử lý / Kết quả giải quyết *</label>
              <textarea value={resolution} onChange={e => setResolution(e.target.value)}
                placeholder="Mô tả cách đã giải quyết vấn đề cho khách hàng..." className="input-field" rows={4}
                style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedTicket(null)} className="btn btn-secondary">Hủy</button>
              <button onClick={() => handleResolve(selectedTicket.id)} className="btn btn-primary">
                <CheckCircle size={15} style={{ marginRight: '0.375rem' }} /> Xác Nhận Giải Quyết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal CSKH: Xem Chi Tiết Yêu Cầu Đổi Trả & Ảnh Minh Chứng ── */}
      {selectedReturnDetail && (() => {
        const associatedOrder = orders.find(o => o.orderId === selectedReturnDetail.orderId);
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card-glass" style={{ width: '100%', maxWidth: '640px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={20} style={{ color: '#6366f1' }} />
                    Chi Tiết Yêu Cầu Đổi Trả #{selectedReturnDetail.id}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mã đơn hàng liên kết: <strong>{selectedReturnDetail.orderId}</strong></span>
                </div>
                <button onClick={() => setSelectedReturnDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20}/></button>
              </div>

              {/* Grid Thông tin chung */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                <div style={{ padding: '0.875rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>THÔNG TIN KHÁCH HÀNG</div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{selectedReturnDetail.customerName}</strong>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>SĐT: {selectedReturnDetail.phone || 'Chưa cập nhật'}</div>
                </div>

                <div style={{ padding: '0.875rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LOẠI YÊU CẦU & TRẠNG THÁI</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: selectedReturnDetail.type === 'REFUND' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)', color: selectedReturnDetail.type === 'REFUND' ? '#ef4444' : '#6366f1' }}>
                      {selectedReturnDetail.type === 'REFUND' ? 'Hoàn tiền (Refund)' : 'Đổi hàng (Exchange)'}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: `${RETURN_STATUS_COLORS[selectedReturnDetail.status] || '#64748b'}22`, color: RETURN_STATUS_COLORS[selectedReturnDetail.status] || '#64748b' }}>
                      {RETURN_STATUS_LABELS[selectedReturnDetail.status] || selectedReturnDetail.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lý Do Đổi Trả */}
              <div style={{ marginBottom: '1.25rem', padding: '1rem', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.25rem' }}>LÝ DO ĐỔI TRẢ TỪ KHÁCH HÀNG:</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{selectedReturnDetail.reason || 'Khách không cung cấp cụ thể'}</div>
              </div>

              {/* Ảnh Minh Chứng Sản Phẩm Lỗi / Hỏng */}
              <div style={{ marginBottom: '1.25rem', padding: '1rem', backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#818cf8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  📷 ÁNH MINH CHỨNG SẢN PHẨM LỖI:
                </div>
                {selectedReturnDetail.evidenceUrl ? (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <img src={selectedReturnDetail.evidenceUrl} alt="Ảnh minh chứng"
                      style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #6366f1', cursor: 'pointer', transition: 'transform 0.2s' }}
                      onClick={() => setPreviewImage(selectedReturnDetail.evidenceUrl)}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <p style={{ margin: '0 0 0.5rem 0' }}>Bấm vào hình ảnh để xem phóng to chi tiết.</p>
                      <button type="button" onClick={() => window.open(selectedReturnDetail.evidenceUrl, '_blank')}
                        className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                        🔗 Mở trong cửa sổ mới
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Khách hàng chưa đính kèm ảnh minh chứng (Hoặc sử dụng minh chứng mặc định).
                  </div>
                )}
              </div>

              {/* Chi Tiết Sản Phẩm Trong Đơn Hàng Gốc */}
              {associatedOrder && associatedOrder.items && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>SAN PHẨM TRONG ĐƠN HÀNG GỐC ({associatedOrder.items.length}):</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '160px', overflowY: 'auto' }}>
                    {associatedOrder.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <span><strong>{item.name}</strong> (x{item.quantity})</span>
                        <strong style={{ color: 'var(--success)' }}>{fmt(item.price * item.quantity)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nhập Ghi chú xử lý của CSKH */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>Ghi chú xử lý / Phản hồi CSKH</label>
                <textarea value={csNote} onChange={e => setCsNote(e.target.value)}
                  placeholder="Nhập ghi chú phản hồi cho khách hàng..." className="input-field" rows={3}
                  style={{ width: '100%', resize: 'vertical' }} />
              </div>

              {/* Nút thao tác nhanh của CSKH */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={() => setSelectedReturnDetail(null)} className="btn btn-secondary">Đóng</button>
                <button onClick={() => {
                  handleReturnUpdate(selectedReturnDetail.id, 'REJECTED');
                  updateReturnStatus(selectedReturnDetail.id, 'REJECTED', csNote || 'Từ chối bởi CSKH');
                  setSelectedReturnDetail(null);
                }} className="btn" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                  ❌ Từ Chối Yêu Cầu
                </button>
                <button onClick={() => {
                  handleReturnUpdate(selectedReturnDetail.id, 'APPROVED');
                  updateReturnStatus(selectedReturnDetail.id, 'APPROVED', csNote || 'Đã duyệt bởi CSKH');
                  setSelectedReturnDetail(null);
                }} className="btn btn-primary">
                  ✓ Phê Duyệt Yêu Cầu
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox phóng to ảnh minh chứng */}
      {previewImage && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Phóng to ảnh" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 0 30px rgba(0,0,0,0.8)' }} />
        </div>
      )}
    </div>
  );
}
