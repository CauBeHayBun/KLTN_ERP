import React, { useState, useEffect } from 'react';
import { X, Barcode, CheckCircle, Package, AlertCircle } from 'lucide-react';
import { useERP } from '../context/ERPContext';

export default function PackAndScanModal({ show, onClose, order, onConfirmPack }) {
  const { serialNumbers } = useERP();
  
  // Trạng thái lưu trữ S/N đã quét/chọn cho từng sản phẩm trong đơn
  // Format: { [productId]: ['SN-123', 'SN-456'] }
  const [scannedSerials, setScannedSerials] = useState({});
  const [barcodeInput, setBarcodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (show && order) {
      setScannedSerials({});
      setBarcodeInput('');
      setErrorMsg('');
    }
  }, [show, order]);

  if (!show || !order) return null;

  const orderItems = order.items || [];

  // Tìm sản phẩm dựa trên S/N nhập vào
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    setErrorMsg('');
    const scanned = barcodeInput.trim();
    
    // Kiểm tra xem S/N này có nằm trong kho và có trạng thái AVAILABLE không
    let foundSnData = serialNumbers.find(s => s.serial === scanned && s.status === 'AVAILABLE');
    
    // Fallback cho mã Mock tự động sinh (dành cho demo)
    if (!foundSnData && scanned.startsWith('SN-MOCK-')) {
      const parts = scanned.split('-');
      if (parts.length >= 3) {
        foundSnData = { serial: scanned, productId: parts[2], status: 'AVAILABLE' };
      }
    }
    
    if (!foundSnData) {
      setErrorMsg(`Không tìm thấy S/N "${scanned}" trong kho (hoặc đã được sử dụng).`);
      setBarcodeInput('');
      return;
    }

    // Kiểm tra xem S/N này thuộc về sản phẩm nào trong đơn hàng
    const targetItem = orderItems.find(item => String(item.productId) === String(foundSnData.productId));
    
    if (!targetItem) {
      setErrorMsg(`S/N "${scanned}" thuộc về linh kiện không có trong đơn hàng này.`);
      setBarcodeInput('');
      return;
    }

    const currentScannedForProduct = scannedSerials[targetItem.productId] || [];
    
    // Kiểm tra đã quét trùng chưa
    if (currentScannedForProduct.includes(scanned)) {
      setErrorMsg(`S/N "${scanned}" đã được quét cho đơn này rồi.`);
      setBarcodeInput('');
      return;
    }

    // Kiểm tra đã đủ số lượng chưa
    if (currentScannedForProduct.length >= targetItem.quantity) {
      setErrorMsg(`Linh kiện "${targetItem.name}" đã quét đủ số lượng (${targetItem.quantity}).`);
      setBarcodeInput('');
      return;
    }

    // Thêm S/N vào danh sách
    setScannedSerials(prev => ({
      ...prev,
      [targetItem.productId]: [...(prev[targetItem.productId] || []), scanned]
    }));
    
    setBarcodeInput('');
  };

  const handleRemoveSn = (productId, snToRemove) => {
    setScannedSerials(prev => ({
      ...prev,
      [productId]: prev[productId].filter(sn => sn !== snToRemove)
    }));
  };

  const isAllPacked = orderItems.every(item => {
    const scannedList = scannedSerials[item.productId] || [];
    return scannedList.length === (parseInt(item.quantity) || 1);
  });

  const handleConfirm = () => {
    // Thu thập toàn bộ S/N đã quét thành mảng 1 chiều để truyền lên
    const allSelectedSerials = Object.values(scannedSerials).flat();
    onConfirmPack(order, allSelectedSerials);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px',
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 2rem)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={24} color="#2563eb" />
            Đóng Gói & Quét S/N Đơn Hàng #{order.orderId}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Barcode Scanner Input (Secondary) */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px dashed #cbd5e1', opacity: 0.8 }}>
            <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#475569', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>Khu vực Quét Mã Vạch (Barcode Scanner)</span>
              <span style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Tính năng mở rộng sau</span>
            </div>
            <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Barcode size={20} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  autoFocus
                  list="available-sn-list"
                  placeholder="Dùng máy quét S/N, hoặc nhập tay và nhấn Enter..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                />
                <datalist id="available-sn-list">
                  {serialNumbers.filter(s => s.status === 'AVAILABLE').map(s => (
                    <option key={s.serial} value={s.serial} />
                  ))}
                </datalist>
              </div>
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                Xác nhận mã
              </button>
            </form>
            {errorMsg && (
              <div style={{ marginTop: '0.75rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}
            <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', margin: '0.75rem 0 0 0' }}>
              💡 Mẹo: Máy quét mã vạch (Barcode Scanner) cắm USB/Bluetooth hoạt động như một bàn phím. Chỉ cần nhấp trỏ chuột vào ô trên và quét, máy sẽ tự động điền mã và Enter.
            </p>
          </div>

          {/* Items Checklist */}
          <div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#1e293b' }}>Danh sách linh kiện cần lấy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orderItems.map((item, idx) => {
                const reqQty = parseInt(item.quantity) || 1;
                const scannedForThis = scannedSerials[item.productId] || [];
                const isFulfilled = scannedForThis.length === reqQty;
                
                // Fallback manual selection list
                let availableForThis = serialNumbers.filter(s => String(s.productId) === String(item.productId) && s.status === 'AVAILABLE');
                
                // Tự động sinh mã mock nếu kho chưa có mã thật cho linh kiện này (dành cho demo)
                if (availableForThis.length === 0) {
                  availableForThis = [
                    { serial: `SN-MOCK-${item.productId}-A`, productId: item.productId, status: 'AVAILABLE' },
                    { serial: `SN-MOCK-${item.productId}-B`, productId: item.productId, status: 'AVAILABLE' }
                  ];
                }

                return (
                  <div key={idx} style={{ 
                    border: `1px solid ${isFulfilled ? '#bbf7d0' : '#e2e8f0'}`, 
                    borderRadius: '8px', padding: '1rem',
                    backgroundColor: isFulfilled ? '#f0fdf4' : '#fff',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{item.name}</strong>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Mã SP: {item.productId}
                        </div>
                      </div>
                      <div style={{ 
                        padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 700,
                        backgroundColor: isFulfilled ? '#dcfce7' : '#f1f5f9',
                        color: isFulfilled ? '#166534' : '#475569'
                      }}>
                        Đã quét: {scannedForThis.length} / {reqQty}
                      </div>
                    </div>

                    {/* Scanned Badges */}
                    {scannedForThis.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                        {scannedForThis.map(sn => (
                          <div key={sn} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', backgroundColor: '#bfdbfe', color: '#1e40af', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                            <Barcode size={12} />
                            {sn}
                            <button 
                              onClick={() => handleRemoveSn(item.productId, sn)}
                              style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', padding: 0, marginLeft: '2px', display: 'flex' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Primary Manual Selection */}
                    {!isFulfilled && availableForThis.length > 0 && (
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>Chọn Serial Number để xuất kho: </span>
                          <select 
                            onChange={(e) => {
                              if (e.target.value) {
                                setBarcodeInput(e.target.value);
                                // Tự động submit
                                setTimeout(() => {
                                  document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                }, 100);
                              }
                            }}
                            value=""
                            style={{ padding: '0.5rem', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #2563eb', backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                          >
                            <option value="">-- Click để chọn mã S/N --</option>
                            {availableForThis.filter(s => !scannedForThis.includes(s.serial)).map(s => (
                            <option key={s.serial} value={s.serial}>{s.serial}</option>
                          ))}
                        </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
          <button 
            onClick={onClose} 
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            Hủy Bỏ
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!isAllPacked}
            style={{ 
              padding: '0.6rem 1.25rem', fontSize: '0.9rem', 
              backgroundColor: isAllPacked ? '#10b981' : '#94a3b8', 
              color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, 
              cursor: isAllPacked ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {isAllPacked ? <CheckCircle size={18} /> : null}
            Xác nhận Hoàn Tất Đóng Gói
          </button>
        </div>
      </div>
    </div>
  );
}
