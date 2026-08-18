import React, { useState, useEffect } from 'react';
import { X, RefreshCw, DollarSign, Camera, AlertTriangle } from 'lucide-react';
import { useERP } from '../context/ERPContext';

export default function ReturnRequestModal({ show, onClose, order }) {
  const { addReturnRequest } = useERP();
  
  const [returnType, setReturnType] = useState('EXCHANGE'); // 'EXCHANGE' or 'REFUND'
  const [reason, setReason] = useState('Lỗi do Nhà sản xuất');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      setReturnType('EXCHANGE');
      setReason('Lỗi do Nhà sản xuất');
      setDescription('');
      setEvidenceUrl('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [show]);

  if (!show || !order) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Vui lòng nhập chi tiết tình trạng hàng hóa.');
      return;
    }
    if (!evidenceUrl.trim()) {
      setErrorMsg('Vui lòng cung cấp link hình ảnh/video minh chứng.');
      return;
    }

    setIsSubmitting(true);
    
    // Tạo data giả lập đẩy vào context
    const reqData = {
      orderId: order.orderId,
      customerName: order.customerName,
      customerEmail: order.email || order.customerEmail || 'Khách vãng lai',
      phone: order.phone || '',
      reason,
      description,
      evidenceUrl,
      type: returnType, // 'EXCHANGE' hoặc 'REFUND'
      returnType: returnType, // để sync backend nếu cần
      totalAmount: order.totalAmount,
      items: order.items
    };

    setTimeout(() => {
      addReturnRequest(reqData);
      alert('Đã gửi Yêu cầu Đổi/Trả hàng thành công. Vui lòng chờ bộ phận CSKH liên hệ!');
      setIsSubmitting(false);
      onClose(true);
    }, 1000);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
            <RefreshCw size={22} color="#2563eb" />
            Yêu Cầu Đổi Trả / Hoàn Tiền
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, color: '#334155' }}>Đơn hàng: #{order.orderId}</div>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>Tổng giá trị: {order.totalAmount?.toLocaleString()}đ</div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Hình thức giải quyết mong muốn *</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: `2px solid ${returnType === 'EXCHANGE' ? '#2563eb' : '#cbd5e1'}`, borderRadius: '8px', cursor: 'pointer', backgroundColor: returnType === 'EXCHANGE' ? '#eff6ff' : '#fff' }}>
                <input 
                  type="radio" name="returnType" value="EXCHANGE" 
                  checked={returnType === 'EXCHANGE'} onChange={() => setReturnType('EXCHANGE')} 
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={16}/> Đổi sản phẩm mới</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Chúng tôi sẽ gửi linh kiện mới 100% thay thế.</div>
                </div>
              </label>

              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: `2px solid ${returnType === 'REFUND' ? '#059669' : '#cbd5e1'}`, borderRadius: '8px', cursor: 'pointer', backgroundColor: returnType === 'REFUND' ? '#ecfdf5' : '#fff' }}>
                <input 
                  type="radio" name="returnType" value="REFUND" 
                  checked={returnType === 'REFUND'} onChange={() => setReturnType('REFUND')} 
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={16}/> Hoàn tiền</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Chuyển khoản lại 100% giá trị linh kiện lỗi.</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Lý do *</label>
            <select 
              value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            >
              <option value="Lỗi do Nhà sản xuất">Lỗi do Nhà sản xuất (Cắm không lên, vỡ móp...)</option>
              <option value="Giao sai hàng hóa">Giao sai hàng hóa</option>
              <option value="Thiếu linh kiện">Thiếu linh kiện trong đơn</option>
              <option value="Hàng giả / Hàng nhái">Nghi ngờ Hàng giả / Hàng nhái</option>
              <option value="Đổi ý, không muốn mua nữa">Đổi ý, không muốn mua nữa</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Chi tiết tình trạng *</label>
            <textarea 
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Vui lòng mô tả rõ tình trạng thiết bị đang gặp phải..."
              rows={3}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Camera size={16}/> Link Hình ảnh / Video minh chứng *
            </label>
            <input 
              type="text" 
              value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)}
              placeholder="VD: Dán link Google Drive hoặc Youtube vào đây..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            />
            <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={14}/> Bắt buộc phải có hình ảnh/video unbox hoặc quay tình trạng lỗi để được duyệt nhanh.
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Hủy bỏ
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu Đổi Trả'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
