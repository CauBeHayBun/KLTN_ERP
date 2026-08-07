import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { Wrench, Play, CheckCircle2, ShieldCheck, ClipboardList, Plus, AlertCircle, Truck, XCircle } from 'lucide-react';

export default function Assembly() {
  const { assemblyJobs, updateAssemblyJob, inventory, serialNumbers, orders, createAssemblyJob } = useERP();
  const { user } = useAuth();
  const jobs = assemblyJobs || [];

  const [activeJobId, setActiveJobId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form tạo job thủ công
  const [newJobOrderId, setNewJobOrderId] = useState('');
  const [newJobCustomer, setNewJobCustomer] = useState('');
  const [newJobComponents, setNewJobComponents] = useState([
    { category: 'CPU', name: '' },
    { category: 'MAINBOARD', name: '' },
    { category: 'RAM', name: '' },
    { category: 'VGA', name: '' },
    { category: 'PSU', name: '' },
    { category: 'STORAGE', name: '' },
    { category: 'CASE', name: '' },
  ]);

  const [focusedIndex, setFocusedIndex] = useState(null);

  // Auto-select job đầu tiên khi danh sách jobs thay đổi
  useEffect(() => {
    if (!activeJobId && jobs.length > 0) {
      const assembling = jobs.find(j => j.status === 'ASSEMBLING');
      const pending = jobs.find(j => j.status === 'PENDING');
      setActiveJobId((assembling || pending || jobs[0]).id);
    }
    if (activeJobId && !jobs.find(j => j.id === activeJobId) && jobs.length > 0) {
      setActiveJobId(jobs[0].id);
    }
  }, [jobs, activeJobId]);

  const activeJob = jobs.find(j => j.id === activeJobId);
  const relatedOrder = activeJob ? (orders || []).find(o => o.orderId === activeJob.orderId) : null;
  const isCancelled = activeJob?.status === 'CANCELLED' || relatedOrder?.status === 'CANCELLED';

  // Thống kê (Lọc bỏ các đơn đã bị hủy)
  const todayStr = new Date().toLocaleDateString('vi-VN');
  const pendingJobs = jobs.filter(j => {
    const ord = (orders || []).find(o => o.orderId === j.orderId);
    return j.status === 'PENDING' && ord?.status !== 'CANCELLED';
  });
  const assemblingJobs = jobs.filter(j => {
    const ord = (orders || []).find(o => o.orderId === j.orderId);
    return j.status === 'ASSEMBLING' && ord?.status !== 'CANCELLED';
  });
  const completedToday = jobs.filter(j => j.status === 'COMPLETED' && j.date === todayStr);

  const toggleChecklist = (jobId, key) => {
    if (isCancelled) {
      alert('⚠️ Không thể thao tác: Đơn hàng này đã bị HỦY!');
      return;
    }
    const targetJob = jobs.find(j => j.id === jobId);
    if (targetJob) {
      const nextChecklist = { ...(targetJob.checklist || {}), [key]: !targetJob.checklist?.[key] };
      updateAssemblyJob(jobId, targetJob.status, nextChecklist, targetJob.componentSerials);
    }
  };

  const startAssembly = (jobId) => {
    if (isCancelled) {
      alert('⚠️ Không thể bắt đầu: Đơn hàng này đã bị HỦY!');
      return;
    }
    const targetJob = jobs.find(j => j.id === jobId);
    if (targetJob) {
      updateAssemblyJob(jobId, 'ASSEMBLING', targetJob.checklist, targetJob.componentSerials);
    }
  };

  const completeAssembly = (jobId) => {
    if (isCancelled) {
      alert('⚠️ Không thể nghiệm thu: Đơn hàng này đã bị HỦY!');
      return;
    }
    const jobToCheck = jobs.find(j => j.id === jobId);
    if (!jobToCheck) return;
    const allDone = Object.values(jobToCheck.checklist || {}).every(Boolean);
    if (!allDone) {
      alert('⚠️ Cảnh báo: Vui lòng hoàn thành đầy đủ tất cả các đầu mục kiểm thử chất lượng QA trước khi xuất xưởng máy!');
      return;
    }
    const serialsAssigned = (jobToCheck.components || []).every(comp => jobToCheck.componentSerials?.[comp.category]);
    if (!serialsAssigned) {
      alert('⚠️ Cảnh báo: Vui lòng chọn đầy đủ mã Serial Number (S/N) cho tất cả linh kiện trước khi nghiệm thu xuất xưởng!');
      return;
    }
    updateAssemblyJob(jobId, 'COMPLETED', jobToCheck.checklist, jobToCheck.componentSerials);
    alert(`🎉 Đã hoàn tất lắp ráp và nghiệm thu! Đơn hàng ${jobToCheck.orderId || jobId} đã chuyển trạng thái "Chờ Xuất Kho". Warehouse sẽ xác nhận giao hàng.`);
  };

  const handleSerialChange = (jobId, category, serial) => {
    if (isCancelled) {
      alert('⚠️ Không thể đổi S/N: Đơn hàng này đã bị HỦY!');
      return;
    }
    const targetJob = jobs.find(j => j.id === jobId);
    if (targetJob) {
      const nextSerials = { ...(targetJob.componentSerials || {}), [category]: serial };
      updateAssemblyJob(jobId, targetJob.status, targetJob.checklist, nextSerials);
    }
  };

  const handleCreateJob = (e) => {
    e.preventDefault();
    const comps = newJobComponents.filter(c => c.name.trim() !== '');
    if (comps.length === 0) {
      alert('Vui lòng nhập ít nhất 1 linh kiện!');
      return;
    }
    const orderId = newJobOrderId.trim() || `MANUAL-${Date.now()}`;
    const job = createAssemblyJob(orderId, newJobCustomer.trim() || 'Khách hàng', comps);
    if (!job) {
      alert('Đơn hàng này đã có lệnh lắp ráp. Vui lòng chọn đơn khác!');
      return;
    }
    setActiveJobId(job.id);
    setShowCreateForm(false);
    setNewJobOrderId('');
    setNewJobCustomer('');
    setNewJobComponents([
      { category: 'CPU', name: '' }, { category: 'MAINBOARD', name: '' },
      { category: 'RAM', name: '' }, { category: 'VGA', name: '' },
      { category: 'PSU', name: '' }, { category: 'STORAGE', name: '' },
      { category: 'CASE', name: '' }
    ]);
    alert(`✅ Đã tạo lệnh lắp ráp ${job.id} thành công!`);
  };

  const getJobStatusBadge = (job) => {
    const ord = (orders || []).find(o => o.orderId === job.orderId);
    if (job.status === 'CANCELLED' || ord?.status === 'CANCELLED') {
      return <span className="badge badge-danger" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700 }}>Đã Hủy Lệnh</span>;
    }

    switch (job.status) {
      case 'PENDING': return <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: 700 }}>Chờ Lắp</span>;
      case 'ASSEMBLING': return <span className="badge badge-info" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700 }}>Đang Lắp</span>;
      case 'COMPLETED': return <span className="badge badge-success" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Đã Xong</span>;
      default: return <span className="badge badge-secondary" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 700 }}>{job.status}</span>;
    }
  };

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="badge badge-success" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Đã Giao</span>;
      case 'PROCESSING':
        return <span className="badge badge-info" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700 }}>Đang Xử Lý</span>;
      case 'AWAITING_STOCK':
        return <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: 700 }}>Chờ Linh Kiện</span>;
      case 'CONFIRMED':
        return <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700 }}>Đã Xác Nhận</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700 }}>ĐÃ HỦY</span>;
      case 'READY_TO_SHIP':
        return <span className="badge badge-success" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Đã Xuất Kho</span>;
      case 'SHIPPED':
        return <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700 }}>Đang Giao</span>;
      default:
        return <span className="badge badge-secondary" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 700 }}>{status || 'Đang Xử Lý'}</span>;
    }
  };

  return (
    <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-title)', color: '#0f172a', marginBottom: '0.25rem' }}>
            Bộ Phận Kỹ Thuật Lắp Ráp Máy Tính
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Tiếp nhận đơn build PC, kiểm định quy trình QA và bàn giao cho kho xuất hàng.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary shadow-glow"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#2563eb', borderRadius: '10px', fontWeight: 700, padding: '0.6rem 1.25rem' }}
        >
          <Plus size={18} />
          Tạo Lệnh Lắp Ráp Mới
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', borderLeft: '5px solid #d97706', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardList size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 600 }}>Chờ Tiếp Nhận</h4>
            <p style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.1rem 0' }}>{pendingJobs.length}</p>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lệnh chưa bắt đầu</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', borderLeft: '5px solid #2563eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wrench size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 600 }}>Đang Lắp Ráp</h4>
            <p style={{ fontSize: '1.65rem', fontWeight: 800, color: '#2563eb', margin: '0.1rem 0' }}>{assemblingJobs.length}</p>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lệnh đang thực hiện</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', borderLeft: '5px solid #16a34a', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 600 }}>Hoàn Thành Hôm Nay</h4>
            <p style={{ fontSize: '1.65rem', fontWeight: 800, color: '#16a34a', margin: '0.1rem 0' }}>{completedToday.length}</p>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Đã bàn giao kho</span>
          </div>
        </div>
      </div>

      {/* Create Job Form */}
      {showCreateForm && (
        <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', border: '1px solid #2563eb', borderRadius: '14px', boxShadow: '0 4px 15px rgba(37,99,235,0.1)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <Plus size={18} style={{ color: '#2563eb' }} />
            Tạo Lệnh Lắp Ráp Thủ Công
          </h3>
          <form onSubmit={handleCreateJob}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: '#0f172a', fontWeight: 700 }}>Mã Đơn Hàng (tùy chọn)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="ORD-xxxxxx hoặc để trống"
                  value={newJobOrderId}
                  onChange={(e) => setNewJobOrderId(e.target.value)}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: '#0f172a', fontWeight: 700 }}>Tên Khách Hàng</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Tên khách hàng..."
                  value={newJobCustomer}
                  onChange={(e) => setNewJobCustomer(e.target.value)}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>
            </div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#475569', fontWeight: 700 }}>Danh Sách Linh Kiện:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              {newJobComponents.map((comp, idx) => {
                const categoryProducts = (inventory || []).filter(
                  item => (item.category || '').toUpperCase() === comp.category.toUpperCase()
                );
                
                return (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}>
                    <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 800, width: '80px', flexShrink: 0 }}>{comp.category}</span>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder={`Gõ tìm hoặc tự nhập ${comp.category}...`}
                        value={comp.name}
                        onChange={(e) => {
                          const next = [...newJobComponents];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setNewJobComponents(next);
                        }}
                        onFocus={() => setFocusedIndex(idx)}
                        onBlur={() => {
                          setTimeout(() => {
                            setFocusedIndex(null);
                          }, 250);
                        }}
                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.6rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                      />
                      
                      {focusedIndex === idx && categoryProducts.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          zIndex: 1000,
                          marginTop: '4px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                        }}>
                          {categoryProducts
                            .filter(p => p.name.toLowerCase().includes((comp.name || '').toLowerCase()))
                            .map(p => (
                              <div
                                key={p.id}
                                onMouseDown={() => {
                                  const next = [...newJobComponents];
                                  next[idx] = { ...next[idx], name: p.name };
                                  setNewJobComponents(next);
                                  setFocusedIndex(null);
                                }}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f1f5f9',
                                  color: '#0f172a',
                                  transition: 'background-color 0.15s',
                                  textAlign: 'left'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                              >
                                <strong>{p.name}</strong>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Tồn: {p.stock} | Giá: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)}</div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary">Hủy</button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#2563eb', fontWeight: 700 }}>
                <Plus size={16} />
                Tạo Lệnh Lắp Ráp
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'stretch' }}>
        {/* Left Column: Job Queue */}
        <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', boxShadow: '0 4px 15px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <ClipboardList size={18} style={{ color: '#2563eb' }} />
            Hàng Chờ Đơn Máy ({jobs.length})
          </h3>

          {jobs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              <Wrench size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Chưa có lệnh lắp ráp nào.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Nhấn "Tạo Lệnh Lắp Ráp Mới" để bắt đầu.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '70vh' }}>
              {jobs.map(job => {
                const isSelected = activeJobId === job.id;
                const jobOrd = (orders || []).find(o => o.orderId === job.orderId);
                const isJobCancelled = job.status === 'CANCELLED' || jobOrd?.status === 'CANCELLED';

                return (
                  <div
                    key={job.id}
                    onClick={() => setActiveJobId(job.id)}
                    style={{
                      padding: '1rem',
                      border: isSelected ? '2px solid #2563eb' : (isJobCancelled ? '1px solid #fecaca' : '1px solid #cbd5e1'),
                      borderRadius: '10px',
                      backgroundColor: isSelected ? '#eff6ff' : (isJobCancelled ? '#fff5f5' : '#ffffff'),
                      boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      opacity: isJobCancelled ? 0.8 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: isJobCancelled ? '#dc2626' : '#0f172a', fontSize: '0.925rem', fontWeight: 800, textDecoration: isJobCancelled ? 'line-through' : 'none' }}>{job.id}</strong>
                      {getJobStatusBadge(job)}
                    </div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <p style={{ margin: 0 }}>Đơn: <strong style={{ color: isJobCancelled ? '#dc2626' : '#2563eb', fontWeight: 700 }}>{job.orderId}</strong></p>
                      <p style={{ margin: 0, fontWeight: 600 }}>KH: {job.customer} | {job.date}</p>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.75rem' }}>{job.components?.length || 0} linh kiện</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Job Details & QA checklist */}
        {activeJob ? (
          <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', boxShadow: '0 4px 15px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'var(--font-title)' }}>Chi Tiết: {activeJob.id}</h2>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem', margin: 0 }}>
                  KH: <strong style={{ color: '#0f172a' }}>{activeJob.customer}</strong> | Đơn: <strong style={{ color: '#2563eb' }}>{activeJob.orderId}</strong> | Ngày: {activeJob.date}
                </p>
                {relatedOrder && (
                  <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569' }}>
                    Trạng thái đơn hàng: {getOrderStatusBadge(relatedOrder.status)}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {isCancelled ? (
                  <div style={{ padding: '0.5rem 0.85rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontWeight: 800, fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <XCircle size={16} /> Lệnh Đã Hủy Tự Động
                  </div>
                ) : (
                  <>
                    {activeJob.status === 'PENDING' && (
                      <button onClick={() => startAssembly(activeJob.id)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#2563eb', borderRadius: '8px', fontWeight: 700 }}>
                        <Play size={16} /> Bắt đầu lắp
                      </button>
                    )}
                    {activeJob.status === 'ASSEMBLING' && (
                      <button onClick={() => completeAssembly(activeJob.id)} className="btn btn-primary" style={{ backgroundColor: '#16a34a', border: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px', fontWeight: 700 }}>
                        <ShieldCheck size={16} /> Nghiệm thu xuất xưởng
                      </button>
                    )}
                    {activeJob.status === 'COMPLETED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <Truck size={16} style={{ color: '#16a34a' }} />
                        <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800 }}>Chờ Kho Xuất Hàng</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Cancelled Alert Banner */}
            {isCancelled && (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '0.875rem' }}>
                <AlertCircle size={22} style={{ flexShrink: 0, color: '#dc2626' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>⚠️ ĐƠN HÀNG ĐÃ BỊ HỦY (ORD CANCELLED)</div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#991b1b' }}>
                    Khách hàng hoặc Quản Lý Bán Hàng đã hủy đơn này. Lệnh lắp ráp tạm dừng hoàn toàn. Kỹ thuật viên không tiếp tục thao tác lắp ráp. Vui lòng hoàn trả các linh kiện (nếu có) về Kho tồn thực tế.
                  </span>
                </div>
              </div>
            )}

            {/* QA Progress */}
            {!isCancelled && activeJob.status === 'ASSEMBLING' && (
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.825rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <AlertCircle size={16} style={{ color: '#2563eb' }} />
                Hoàn thành QA 5 bước và gán S/N cho tất cả linh kiện trước khi nghiệm thu.
                ({Object.values(activeJob.checklist || {}).filter(Boolean).length}/5 bước hoàn thành)
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', opacity: isCancelled ? 0.6 : 1, pointerEvents: isCancelled ? 'none' : 'auto' }}>
              {/* Components List */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.85rem', color: '#0f172a' }}>Cấu hình linh kiện:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(activeJob.components || []).map((comp, idx) => {
                    const matchedProduct = (inventory || []).find(p => p.name === comp.name);
                    const matchedProductId = matchedProduct ? matchedProduct.id : null;
                    let availableSerials = (serialNumbers || []).filter(sn =>
                      sn.productId === matchedProductId &&
                      (sn.status === 'AVAILABLE' || activeJob.componentSerials?.[comp.category] === sn.serial)
                    );

                    if (availableSerials.length === 0) {
                      const categoryPrefix = (comp.category || 'COMP').substring(0, 3).toUpperCase();
                      const mockId = matchedProductId || (idx + 1) * 7;
                      availableSerials = [
                        { serial: `SN-${categoryPrefix}-${mockId}001`, productId: mockId, status: 'AVAILABLE' },
                        { serial: `SN-${categoryPrefix}-${mockId}002`, productId: mockId, status: 'AVAILABLE' }
                      ];
                    }

                    return (
                      <div key={idx} style={{
                        display: 'flex', flexDirection: 'column', gap: '0.4rem',
                        padding: '0.65rem 0.85rem', borderRadius: '8px',
                        backgroundColor: '#f8fafc', border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.85rem' }}>
                          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
                            {comp.category}
                          </span>
                          <strong style={{ color: '#0f172a', textAlign: 'right', flex: 1, fontSize: '0.825rem', fontWeight: 800 }}>{comp.name || 'Linh kiện chưa gán tên'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Mã S/N:</span>
                          {activeJob.status === 'ASSEMBLING' && !isCancelled ? (
                            <select
                              value={activeJob.componentSerials?.[comp.category] || ''}
                              onChange={(e) => handleSerialChange(activeJob.id, comp.category, e.target.value)}
                              disabled={isCancelled}
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', maxWidth: '180px', fontWeight: 600 }}
                            >
                              <option value="">-- Chọn S/N trong kho --</option>
                              {availableSerials.map(sn => (
                                <option key={sn.serial} value={sn.serial}>{sn.serial}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: isCancelled ? '#dc2626' : (activeJob.componentSerials?.[comp.category] ? '#2563eb' : (activeJob.status === 'COMPLETED' ? '#16a34a' : '#dc2626')), fontFamily: 'monospace', fontWeight: 700 }}>
                              {isCancelled ? 'Đã dừng' : (activeJob.componentSerials?.[comp.category] || (activeJob.status === 'COMPLETED' ? 'Đã gán S/N' : 'Chưa gán S/N'))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* QA Checklist */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.85rem', color: '#0f172a' }}>Quy trình kiểm định chất lượng QA:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { key: 'socketCheck', label: '1. Kiểm tra chân Socket CPU & RAM click chặt' },
                    { key: 'thermalPaste', label: '2. Thoa keo tản nhiệt & bắt tản Cooler đều lực' },
                    { key: 'cableRouting', label: '3. Đi dây nguồn gọn gàng (Cable Routing)' },
                    { key: 'biosBoot', label: '4. Boot vào BIOS nhận đủ CPU/RAM/VGA/Storage' },
                    { key: 'stressTest', label: '5. Cài OS & Stress Test nhiệt độ an toàn' }
                  ].map(chk => {
                    const isChecked = !!activeJob.checklist?.[chk.key];
                    return (
                      <label
                        key={chk.key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.7rem 0.85rem',
                          border: isChecked ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                          borderRadius: '8px',
                          cursor: (activeJob.status === 'ASSEMBLING' && !isCancelled) ? 'pointer' : 'not-allowed',
                          backgroundColor: isChecked ? '#f0fdf4' : '#ffffff',
                          transition: 'all 0.2s', fontSize: '0.825rem'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={activeJob.status !== 'ASSEMBLING' || isCancelled}
                          onChange={() => toggleChecklist(activeJob.id, chk.key)}
                          style={{ cursor: (activeJob.status === 'ASSEMBLING' && !isCancelled) ? 'pointer' : 'not-allowed' }}
                        />
                        <span style={{ color: isChecked ? '#16a34a' : '#334155', fontWeight: isChecked ? 700 : 500 }}>{chk.label}</span>
                        {isChecked && <CheckCircle2 size={16} style={{ color: '#16a34a', marginLeft: 'auto' }} />}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#64748b', padding: '5rem 0', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px' }}>
            <Wrench size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>Vui lòng chọn một lệnh lắp ráp bên hàng chờ để theo dõi chi tiết.</p>
          </div>
        )}
      </div>
    </div>
  );
}
