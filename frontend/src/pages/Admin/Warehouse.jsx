import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ActorNotificationBar from '../../components/ActorNotificationBar';
import { 
  Database, PlusCircle, AlertOctagon, TrendingDown, ArrowDownLeft, 
  Edit2, Check, MapPin, BarChart2, DollarSign, ListFilter, ShieldAlert,
  Search, Truck, Package, X, Eye, ClipboardCheck, ArrowRight, RefreshCw,
  Calendar, ChevronRight, CheckCircle2, Clock, FileText, Zap, User, Phone, AlertTriangle
} from 'lucide-react';

const STANDARD_SUPPLIERS = [
  'Intel Vietnam',
  'Mai Hoàng Distribution',
  'Vĩnh Xuân PSC',
  'Viễn Sơn Distribution',
  'Thủy Linh Distribution',
  'ASUS Vietnam',
  'MSI Vietnam',
  'Gigabyte Vietnam',
  'Corsair Vietnam',
  'Kingston Vietnam',
  'Western Digital Vietnam',
  'Samsung Vina',
  'Khác / Nhập nội bộ'
];

const PREDEFINED_LOCATIONS = [
  'ZONE-A/SHELF-01/BIN-01',
  'ZONE-A/SHELF-01/BIN-02',
  'ZONE-B/SHELF-01/BIN-01',
  'ZONE-C/SHELF-02/BIN-01',
  'ZONE-D/SHELF-03/BIN-01'
];

const parseDateVal = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const isDateInRange = (dateVal, startDate, endDate) => {
  if (!startDate && !endDate) return true;
  const d = parseDateVal(dateVal);
  if (!d) return true;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const itemYMD = `${yyyy}-${mm}-${dd}`;

  if (startDate && itemYMD < startDate) return false;
  if (endDate && itemYMD > endDate) return false;
  return true;
};


// ──── Sub-Component: RFQ Alert History Modal ────
function RfqAlertHistoryModal({ show, onClose, logs, formatDateTime }) {
  const [historySearch, setHistorySearch] = useState('');

  if (!show) return null;

  const filteredLogs = (logs || []).filter(log =>
    (log.productName || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    (log.supplier || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    (log.reason || '').toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          borderBottom: '1px solid #fef08a',
          display: 'flex', alignItems: 'center', gap: '0.875rem'
        }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: '#f59e0b', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
            flexShrink: 0
          }}>
            <Clock size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#92400e' }}>
              📜 Lịch Sử Gửi Cảnh Báo Yêu Cầu Báo Giá (RFQ)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#b45309' }}>
              Nhật ký toàn bộ các lượt gửi cảnh báo tồn kho tới Bộ Phận Mua Hàng & Ban Giám Đốc
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              fontSize: '1.4rem', cursor: 'pointer', color: '#92400e', lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Gõ tìm theo tên linh kiện, nhà cung cấp, lý do cảnh báo..."
            style={{
              width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.82rem',
              backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a'
            }}
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />
        </div>

        {/* Table logs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', fontSize: '0.88rem' }}>
              Chưa có lịch sử cảnh báo RFQ nào được gửi gần đây.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.5rem', width: '18%' }}>Thời Gian Gửi</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '32%' }}>Linh Kiện & Nhà Cung Cấp</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '14%', textAlign: 'center' }}>Tồn / Ngưỡng</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '14%', textAlign: 'center' }}>Đề Xuất Mua</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '22%' }}>Ghi Chú & Người Gửi</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b', fontWeight: 600, fontSize: '0.78rem' }}>
                      {formatDateTime ? formatDateTime(log.sentAt) : new Date(log.sentAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>{log.productName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Mã #{log.productId} | NCC: {log.supplier}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: Number(log.currentStock) === 0 ? '#ffe4e6' : '#fef3c7',
                        color: Number(log.currentStock) === 0 ? '#e11d48' : '#d97706'
                      }}>
                        {log.currentStock} / {log.threshold} SP
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#16a34a', fontSize: '0.9rem' }}>
                      +{log.requestedQty} SP
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#334155' }}>
                      <div style={{ fontSize: '0.78rem', marginBottom: '2px' }}>{log.reason}</div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Bởi: {log.sender}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Tổng số cảnh báo đã ghi nhận: <strong>{filteredLogs.length}</strong> lượt
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700,
              color: '#475569', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
              borderRadius: '8px', cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ──── Sub-Component: Shipper Assign Modal ────
function ShipperAssignModal({ orderToAssign, onClose, onConfirmAssign }) {
  const [selectedShipperOption, setSelectedShipperOption] = useState('3');

  if (!orderToAssign) return null;

  const handleConfirm = () => {
    let chosenUser = null;
    if (selectedShipperOption === '1') {
      chosenUser = { id: 15, username: 'delivery', fullname: 'Trần Giao Hàng (Shipper 1)' };
    } else if (selectedShipperOption === '2') {
      chosenUser = { id: 17, username: 'delivery2', fullname: 'Nguyễn Văn Shipper (Shipper 2)' };
    }

    onConfirmAssign(orderToAssign, chosenUser);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderBottom: '1px solid #a7f3d0',
          display: 'flex', alignItems: 'center', gap: '0.875rem'
        }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: '#16a34a', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)', flexShrink: 0
          }}>
            <Truck size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#14532d' }}>
              🚚 PHÂN CÔNG SHIPPERS & XUẤT KHO
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#15803d' }}>
              Đơn hàng: <strong style={{ color: '#0f172a' }}>#{orderToAssign.orderId || orderToAssign.id}</strong> ({orderToAssign.customerName || 'Khách hàng'})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              fontSize: '1.4rem', cursor: 'pointer', color: '#14532d', lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
            Vui lòng chọn Nhân Viên / Đối Tác Giao Hàng tiếp nhận đơn:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Option 1 */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1rem', borderRadius: '10px',
              border: selectedShipperOption === '1' ? '2px solid #16a34a' : '1px solid #cbd5e1',
              backgroundColor: selectedShipperOption === '1' ? '#f0fdf4' : '#ffffff',
              cursor: 'pointer', transition: 'all 0.15s'
            }}>
              <input
                type="radio"
                name="shipperOpt"
                value="1"
                checked={selectedShipperOption === '1'}
                onChange={(e) => setSelectedShipperOption(e.target.value)}
                style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a' }}>
                  👤 Shipper 1 — Trần Giao Hàng
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nhân viên giao hàng nội bộ (Khu vực TP.HCM & lân cận)</span>
              </div>
            </label>

            {/* Option 2 */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1rem', borderRadius: '10px',
              border: selectedShipperOption === '2' ? '2px solid #16a34a' : '1px solid #cbd5e1',
              backgroundColor: selectedShipperOption === '2' ? '#f0fdf4' : '#ffffff',
              cursor: 'pointer', transition: 'all 0.15s'
            }}>
              <input
                type="radio"
                name="shipperOpt"
                value="2"
                checked={selectedShipperOption === '2'}
                onChange={(e) => setSelectedShipperOption(e.target.value)}
                style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a' }}>
                  👤 Shipper 2 — Nguyễn Văn Shipper
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nhân viên giao hàng nội bộ (Ca trực sẵn sàng)</span>
              </div>
            </label>

            {/* Option 3 */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1rem', borderRadius: '10px',
              border: selectedShipperOption === '3' ? '2px solid #16a34a' : '1px solid #cbd5e1',
              backgroundColor: selectedShipperOption === '3' ? '#f0fdf4' : '#ffffff',
              cursor: 'pointer', transition: 'all 0.15s'
            }}>
              <input
                type="radio"
                name="shipperOpt"
                value="3"
                checked={selectedShipperOption === '3'}
                onChange={(e) => setSelectedShipperOption(e.target.value)}
                style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a' }}>
                  🚀 Giao Hàng Tự Do (Chờ Shipper tự nhận đơn)
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đơn hàng hiển thị trên ứng dụng Giao Hàng để bất kỳ Shipper rảnh nhặt đơn</span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0', display: 'flex',
          justify: 'flex-end', gap: '0.75rem'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem 1.15rem', fontSize: '0.82rem', fontWeight: 600,
              color: '#475569', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
              borderRadius: '8px', cursor: 'pointer'
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '0.55rem 1.25rem', fontSize: '0.82rem', fontWeight: 700,
              color: '#ffffff', backgroundColor: '#16a34a', border: 'none',
              borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <Truck size={14} /> Xác Nhận Xuất Kho & Phân Công
          </button>
        </div>
      </div>
    </div>
  );
}

// ──── Sub-Component: RFQ Alert Confirmation Modal ────
function RfqAlertModal({ rfqModalData, setRfqModalData, sendSystemNotification, setRfqAlertLogs }) {
  if (!rfqModalData) return null;
  const { item, qty, reason } = rfqModalData;

  const handleConfirm = () => {
    const finalQty = Number(qty);
    if (!finalQty || finalQty <= 0) {
      alert('Vui lòng nhập số lượng đề xuất hợp lệ (lớn hơn 0).');
      return;
    }

    // Save log to local storage
    const newLog = {
      id: 'RFQ-ALT-' + Date.now(),
      sentAt: new Date().toISOString(),
      sender: 'Thủ kho (Warehouse)',
      productId: item.id,
      productName: item.name,
      category: item.category,
      supplier: item.supplier,
      currentStock: item.stock,
      threshold: item.threshold || 5,
      requestedQty: finalQty,
      reason: reason
    };

    try {
      const existingLogs = JSON.parse(localStorage.getItem('erp_rfq_alert_logs') || '[]');
      const updatedLogs = [newLog, ...existingLogs];
      localStorage.setItem('erp_rfq_alert_logs', JSON.stringify(updatedLogs));
      if (setRfqAlertLogs) setRfqAlertLogs(updatedLogs);
    } catch (e) {}

    if (sendSystemNotification) {
      sendSystemNotification({
        targetRoles: ['PURCHASING', 'CEO', 'ADMIN'],
        title: `⚡ Cảnh Báo Kho: ${item.name}`,
        message: `Kho báo linh kiện ${item.name} hiện còn ${item.stock} cái (Ngưỡng: ${item.threshold || 5}). Đề xuất mua ${finalQty} cái. Lý do: ${reason}`,
        link: '/admin/purchasing',
        navState: { createRFQ: true, product: item, quantity: finalQty, reason: reason },
        type: 'RFQ_ALERT',
        itemData: { ...item, requestedQty: finalQty, alertReason: reason }
      });
    }

    setRfqModalData(null);

    alert(
      `✅ GỬI CẢNH BÁO RFQ THÀNH CÔNG!\n\n` +
      `• Linh kiện: ${item.name}\n` +
      `• Số lượng đề xuất mua: ${finalQty} sản phẩm\n` +
      `• Ghi chú / Lý do: ${reason}\n` +
      `• Đơn vị tiếp nhận: Bộ phận Mua Hàng & Ban Giám Đốc\n\n` +
      `Cảnh báo Yêu cầu Báo giá đã được ghi nhận trực tiếp vào Lịch sử và Quả chuông Thông báo Hệ thống!`
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          borderBottom: '1px solid #fef08a',
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem'
        }}>
          <div style={{
            width: '42px', height: '42px',
            borderRadius: '12px',
            background: '#f59e0b',
            color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
            flexShrink: 0
          }}>
            <Zap size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#92400e' }}>
              Cảnh Báo Yêu Cầu Báo Giá (RFQ)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#b45309' }}>
              Gửi cảnh báo tồn kho tối thiểu đến Bộ Phận Mua Hàng & Ban Giám Đốc
            </p>
          </div>
          <button
            onClick={() => setRfqModalData(null)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              fontSize: '1.4rem', cursor: 'pointer', color: '#92400e',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card Thông tin Linh Kiện */}
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              {item.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
              <div>• Mã SP: <strong style={{ color: '#0f172a' }}>#{item.id}</strong></div>
              <div>• Phân nhóm: <strong style={{ color: '#0f172a' }}>{item.category}</strong></div>
              <div>• Nhà cung cấp: <strong style={{ color: '#0f172a' }}>{item.supplier}</strong></div>
              <div>• Ngưỡng an toàn: <strong style={{ color: '#0f172a' }}>{item.threshold || 5} SP</strong></div>
            </div>
            <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Tồn kho hiện tại:</span>
              <span style={{
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700,
                backgroundColor: Number(item.stock) === 0 ? '#ffe4e6' : '#fef3c7',
                color: Number(item.stock) === 0 ? '#e11d48' : '#d97706',
                border: Number(item.stock) === 0 ? '1px solid #fecdd3' : '1px solid #fde68a'
              }}>
                {Number(item.stock) === 0 ? '🔴 Hết hàng (0 SP)' : `⚠️ Cảnh báo tồn (${item.stock} SP)`}
              </span>
            </div>
          </div>

          {/* Form Chỉnh sửa Số Lượng & Lý Do */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                Số lượng đề xuất mua (Sản phẩm) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => {
                  const val = e.target.value;
                  setRfqModalData(prev => ({ ...prev, qty: val }));
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                💡 Số lượng được gợi ý dựa trên công thức kho. Bạn có thể trực tiếp sửa lại số lượng theo nhu cầu thực tế.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                Lý do cảnh báo / Ghi chú cho Bộ Phận Mua Hàng
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setRfqModalData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Nhập lý do gửi cảnh báo hoặc ghi chú thêm..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            type="button"
            onClick={() => setRfqModalData(null)}
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Zap size={14} /> Xác Nhận Gửi Cảnh Báo RFQ
          </button>
        </div>
      </div>
    </div>
  );
}

// ──── Sub-Component: Receipt Detail Modal (Odoo-style) ────
function ReceiptDetailModal({ selectedReceipt, onClose, purchaseOrders, handleValidateReceipt, submitting, formatPrice }) {
  if (!selectedReceipt) return null;

  const effectivePo = (selectedReceipt.po && typeof selectedReceipt.po === 'object' && selectedReceipt.po.items?.length > 0)
    ? selectedReceipt.po
    : (purchaseOrders.find(p => 
        p.id === selectedReceipt.poId || 
        p.poNumber === selectedReceipt.poId || 
        p.poNumber === selectedReceipt.receiptNumber?.replace('GRN-', '') ||
        (selectedReceipt.receiptNumber && selectedReceipt.receiptNumber.includes(p.poNumber))
      ) || selectedReceipt.po || {});

  // Retrieve QA log for this PO if available
  let qaLog = null;
  try {
    const qaLogs = JSON.parse(localStorage.getItem('erp_qa_inspection_logs') || '[]');
    const poNum = effectivePo.poNumber || selectedReceipt.poId || selectedReceipt.receiptNumber?.replace('GRN-', '');
    qaLog = qaLogs.find(l => l.poNumber === poNum || String(l.poNumber) === String(effectivePo.id));
  } catch (e) {}

  const poStatus = qaLog?.status || effectivePo.status || selectedReceipt.poStatus;
  const isQaPassed = poStatus === 'QA_PASSED';
  const isQaPartial = poStatus === 'QA_PARTIAL';
  const canValidate = isQaPassed || isQaPartial;

  const rawItemsList = effectivePo.items || selectedReceipt.items || [];
  const itemsList = rawItemsList.map(item => {
    const originalQty = parseInt(item.quantity || item.qty) || 1;
    let actualQty = originalQty;
    if (qaLog && qaLog.passedQty !== undefined) {
      if (rawItemsList.length === 1) {
        actualQty = Number(qaLog.passedQty);
      } else {
        const ratio = Number(qaLog.passedQty) / (Number(qaLog.totalQty) || 1);
        actualQty = Math.round(originalQty * ratio);
      }
    }
    return {
      ...item,
      quantity: actualQty,
      originalQty,
      hasQaAdjustment: qaLog && actualQty !== originalQty
    };
  });
  
  const totalAmount = itemsList.reduce((s, i) => {
    const uCost = parseFloat(i.unitCost || i.unitPrice || i.price || 0);
    const qty = parseInt(i.quantity) || 1;
    const tCost = parseFloat(i.totalCost || i.total) || (uCost * qty) || 0;
    return s + (isNaN(tCost) ? 0 : tCost);
  }, 0);

  const poNumberDisplay = effectivePo.poNumber || selectedReceipt.poId || selectedReceipt.receiptNumber?.replace('GRN-', '') || 'Chưa có';
  const supplierDisplay = effectivePo.supplier?.name || effectivePo.supplierName || effectivePo.supplierCode || selectedReceipt.supplierName || 'Chưa rõ';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '950px', maxHeight: '92vh', backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Toolbar Header */}
        <div style={{ borderBottom: '3px solid #16a34a', background: '#f8fafc', padding: '1.25rem 1.75rem' }}>
          
          {/* Top Row: Left Action + Right Close Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {selectedReceipt.status === 'READY' && (
                <button
                  onClick={() => handleValidateReceipt(selectedReceipt, poStatus)}
                  className="btn btn-primary shadow-glow"
                  disabled={submitting || !canValidate}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.4rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.88rem', backgroundColor: canValidate ? '#16a34a' : '#94a3b8', color: '#ffffff', border: 'none', cursor: canValidate ? 'pointer' : 'not-allowed' }}
                >
                  <Check size={16} /> Xác Nhận Nhập Kho {qaLog ? `(${qaLog.passedQty} SP)` : ''}
                </button>
              )}
              {selectedReceipt.status === 'DONE' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 1.1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800,
                  backgroundColor: '#dcfce7', color: '#15803d',
                  border: '1.5px solid #bbf7d0'
                }}>
                  <CheckCircle2 size={16} /> Đã Nhập Kho Thành Công
                </span>
              )}
            </div>

            <button 
              onClick={onClose} 
              title="Đóng phiếu nhập kho"
              style={{ 
                background: '#ffffff', 
                border: '1.5px solid #cbd5e1', 
                color: '#334155', 
                cursor: 'pointer', 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                transition: 'all 0.2s ease',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }} 
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#ef4444'; }} 
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Full Pipeline Stepper Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            gap: '0.3rem',
            backgroundColor: '#ffffff',
            padding: '0.65rem 0.85rem',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(15,23,42,0.03)'
          }}>
            {[
              { key: 'RFQ', label: '1. YCBG (RFQ)' },
              { key: 'RFQ_SENT', label: '2. Đã Gửi YCBG' },
              { key: 'QUOTED', label: '3. Đã Báo Giá' },
              { key: 'PO', label: '4. Đơn PO' },
              { key: 'QC', label: '5. Kiểm Định QC' },
              { key: 'READY', label: '6. Chờ Nhập Kho' },
              { key: 'DONE', label: '7. Đã Nhập Kho' }
            ].map((step, idx, arr) => {
              const stepsList = ['RFQ', 'RFQ_SENT', 'QUOTED', 'PO', 'QC', 'READY', 'DONE'];
              let currentKey = 'PO';
              if (selectedReceipt.status === 'DONE' || ['RECEIVED', 'DONE', 'COMPLETED'].includes(effectivePo.status)) {
                currentKey = 'DONE';
              } else if (selectedReceipt.status === 'READY') {
                if (isQaPassed || isQaPartial) {
                  currentKey = 'READY';
                } else {
                  currentKey = 'QC';
                }
              } else if (['RFQ', 'RFQ_SENT', 'QUOTED', 'PO'].includes(poStatus)) {
                currentKey = poStatus;
              }

              const currentIdx = stepsList.indexOf(currentKey);
              const isActive = idx === currentIdx;
              const isPassed = idx < currentIdx;

              // Glowing colors for active step
              let activeBg = '#2563eb';
              let activeShadow = '0 0 10px rgba(37, 99, 235, 0.4)';
              if (step.key === 'DONE') {
                activeBg = '#16a34a';
                activeShadow = '0 0 10px rgba(22, 163, 74, 0.4)';
              } else if (step.key === 'READY') {
                activeBg = '#0284c7';
                activeShadow = '0 0 10px rgba(2, 132, 199, 0.4)';
              } else if (step.key === 'QC') {
                activeBg = '#d97706';
                activeShadow = '0 0 10px rgba(217, 119, 6, 0.4)';
              }

              return (
                <React.Fragment key={step.key}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                    padding: '0.4rem 0.55rem',
                    fontSize: '0.73rem', fontWeight: isActive ? 800 : (isPassed ? 700 : 500),
                    background: isActive ? activeBg : (isPassed ? '#eff6ff' : '#f8fafc'),
                    color: isActive ? '#ffffff' : (isPassed ? '#1d4ed8' : '#94a3b8'),
                    borderRadius: '16px',
                    border: isActive ? `1.5px solid ${activeBg}` : (isPassed ? '1px solid #bfdbfe' : '1px solid #e2e8f0'),
                    boxShadow: isActive ? activeShadow : 'none',
                    transition: 'all 0.25s ease',
                    whiteSpace: 'nowrap',
                    flex: '1',
                    textAlign: 'center'
                  }}>
                    {isPassed && <Check size={12} style={{ flexShrink: 0 }} />}
                    {step.label}
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{
                      height: '2px',
                      flex: '0.3',
                      background: isPassed ? '#93c5fd' : '#e2e8f0',
                      borderRadius: '1px'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', backgroundColor: '#f8fafc' }}>
          
          {/* Receipt Title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MÃ PHIẾU NHẬP KHO THỰC TẾ</div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 900, margin: '0.2rem 0 0 0', color: '#0f172a', letterSpacing: '-0.5px' }}>
                {selectedReceipt.receiptNumber}
              </h2>
              <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#64748b' }}>
                Mã đơn mua hàng liên kết: <strong style={{ color: '#2563eb' }}>{poNumberDisplay}</strong>
              </div>
            </div>
          </div>

          {/* QA gate status */}
          <div style={{
            marginBottom: '1.5rem', padding: '0.9rem 1.1rem', borderRadius: '12px',
            backgroundColor: (isQaPassed || isQaPartial || selectedReceipt.status === 'DONE') ? '#ecfdf5' : '#fff7ed',
            border: `1px solid ${(isQaPassed || isQaPartial || selectedReceipt.status === 'DONE') ? '#86efac' : '#fdba74'}`,
            color: (isQaPassed || isQaPartial || selectedReceipt.status === 'DONE') ? '#166534' : '#9a3412',
            display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 800
          }}>
            {(isQaPassed || isQaPartial || selectedReceipt.status === 'DONE') ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <div>
              <div>
                {selectedReceipt.status === 'DONE' 
                  ? 'ĐÃ NHẬP KHO THÀNH CÔNG' 
                  : isQaPassed 
                    ? 'QA/QC ĐÃ ĐẠT 100% — SẴN SÀNG NHẬP KHO' 
                    : isQaPartial 
                      ? `QA/QC ĐÃ NGHIỆM THU 1 PHẦN (${qaLog ? qaLog.passedQty : ''}/${qaLog ? qaLog.totalQty : ''} SP ĐẠT) — SẴN SÀNG NHẬP KHO` 
                      : 'CHƯA ĐƯỢC QA/QC DUYỆT — CHƯA THỂ NHẬP KHO'}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '2px' }}>
                {selectedReceipt.status === 'DONE' 
                  ? 'Phiếu đã cập nhật tồn kho thành công.' 
                  : (isQaPassed || isQaPartial) 
                    ? (isQaPartial ? `Thủ kho xác nhận nhập kho số lượng đạt chuẩn (${qaLog ? qaLog.passedQty : ''} SP). ${qaLog ? qaLog.failedQty : ''} SP lỗi sẽ trả NCC.` : 'Thủ kho có thể xác nhận nhập kho toàn bộ.') 
                    : 'Vui lòng chờ bộ phận QA/QC kiểm định đạt chất lượng.'}
              </div>
            </div>
          </div>

          {/* Form Info Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>NHÀ CUNG CẤP</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {supplierDisplay}
              </div>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>ĐỊA ĐIỂM KHO</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={16} color="#2563eb" />
                {selectedReceipt.warehouse?.name || 'Kho Tổng — ZONE-A'}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Danh Sách Linh Kiện Nhập Kho</h4>
            <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#475569' }}>STT</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#475569' }}>Tên Linh Kiện</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.78rem', color: '#475569' }}>Số Lượng</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#475569' }}>Đơn Giá Nhập</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#475569' }}>Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {itemsList.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      Chưa có chi tiết danh sách linh kiện.
                    </td>
                  </tr>
                ) : (
                  itemsList.map((item, idx) => {
                    const uCost = parseFloat(item.unitCost || item.unitPrice || item.price || 0);
                    const qty = parseInt(item.quantity || item.qty) || 1;
                    const tCost = parseFloat(item.totalCost || item.total) || (uCost * qty) || 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                          #{idx + 1}
                        </td>
                        <td style={{ fontWeight: 700, textAlign: 'left', padding: '0.85rem 1rem', color: '#0f172a', lineHeight: '1.4' }}>
                          {item.product?.name || item.name || item.productName || 'Linh kiện máy tính'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.85rem 0.5rem', fontWeight: 800, color: '#0f172a' }}>
                          <span style={{ backgroundColor: item.hasQaAdjustment ? '#dcfce7' : '#f1f5f9', color: item.hasQaAdjustment ? '#15803d' : '#0f172a', padding: '4px 10px', borderRadius: '12px', border: item.hasQaAdjustment ? '1.5px solid #bbf7d0' : 'none' }}>
                            {qty} {item.hasQaAdjustment && <span style={{ fontSize: '0.73rem', color: '#166534', fontWeight: 800 }}>(Duyệt QA: {qty}/{item.originalQty})</span>}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>{formatPrice(uCost)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', padding: '0.85rem 1rem' }}>{formatPrice(tCost)}</td>
                      </tr>
                    );
                  })
                )}
                <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <td colSpan="4" style={{ textAlign: 'right', fontWeight: 800, padding: '1rem', color: '#0f172a', fontSize: '0.9rem' }}>TỔNG CỘNG GIÁ TRỊ NHẬP:</td>
                  <td style={{ textAlign: 'right', fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', padding: '1rem', letterSpacing: '-0.3px' }}>
                    {formatPrice(totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function Warehouse() {
  const navigate = useNavigate();
  const { 
    inventory, processGRN, purchaseOrders, serialNumbers, 
    updateThreshold, updateLocation, ledger, orders = [], assemblyJobs = [],
    deliverOrder, updateOrderStatus, assignShipperToOrder, addProduct, updateProduct, deleteProduct,
    sendSystemNotification
  } = useERP();
  const { user, isCEO } = useAuth();
  
  const isManager = ['WAREHOUSE_MANAGER', 'CEO', 'ADMIN'].includes(user?.role);

  // ──── Backend API State ────
  const [receipts, setReceipts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Receipt Detail Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Order Detail Modal State
  const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);

  // Shipper Assign Modal State
  const [orderToAssignShipper, setOrderToAssignShipper] = useState(null);

  const handleConfirmShipperAssign = (ord, chosenUser) => {
    if (!ord) return;
    const poNumOrOrdId = ord.orderId || ord.id;
    const shipperName = chosenUser ? chosenUser.fullname : null;

    if (typeof assignShipperToOrder === 'function') {
      assignShipperToOrder(poNumOrOrdId, chosenUser);
    } else if (updateOrderStatus) {
      const noteText = shipperName
        ? `Đã xuất kho – Phân công cho ${shipperName} giao hàng`
        : `Đã xuất kho – Chờ bên giao hàng nhận đơn`;
      updateOrderStatus(poNumOrOrdId, 'READY_TO_SHIP', noteText, {
        assignedShipperId: chosenUser?.id || null,
        assignedShipperName: shipperName
      });
    }

    // Send system notification to Delivery, Sales, Admin
    if (typeof sendSystemNotification === 'function') {
      sendSystemNotification({
        targetRoles: ['DELIVERY', 'SALES', 'ADMIN', 'CEO'],
        title: `🚚 Xuất Kho Đơn #${poNumOrOrdId}`,
        message: `Kho đã xuất kho đơn hàng #${poNumOrOrdId} thành công! Giao hàng: ${shipperName || 'Chờ Shipper tự nhặt đơn'}`,
        link: '/admin/delivery',
        type: 'DISPATCH'
      });
    }

    // Close Shipper Assignment Modal & Order Detail Modal
    setOrderToAssignShipper(null);
    setSelectedDetailOrder(null);

    alert(
      `✅ ĐÃ XÁC NHẬN XUẤT KHO THÀNH CÔNG!\n\n` +
      `• Mã đơn hàng: #${poNumOrOrdId}\n` +
      `• Người giao hàng: ${shipperName || 'Đã đưa lên sàn chờ Shipper tự nhặt đơn'}\n` +
      `• Đã gửi thông báo đến bộ phận Giao Hàng & Bán Hàng.`
    );
  };

  // RFQ Alert History Modal State & Helper
  const [showRfqHistoryModal, setShowRfqHistoryModal] = useState(false);
  const [rfqAlertLogs, setRfqAlertLogs] = useState([]);

  // Helper & Modal states
  const [selectedMovementLog, setSelectedMovementLog] = useState(null);

  const getMergedRfqLogs = () => {
    let explicitLogs = [];
    try {
      explicitLogs = JSON.parse(localStorage.getItem('erp_rfq_alert_logs') || '[]');
    } catch (e) {}

    let notifLogs = [];
    try {
      const rawNotifs = JSON.parse(localStorage.getItem('erp_system_notifications') || '[]');
      notifLogs = rawNotifs
        .filter(n => n.type === 'RFQ_ALERT')
        .map(n => {
          const itemData = n.itemData || {};
          const productName = itemData.name || (n.title ? n.title.replace('⚡ Cảnh Báo Kho: ', '') : 'Linh kiện cảnh báo');
          const productId = itemData.id || '---';
          return {
            id: n.id,
            sentAt: n.createdAt,
            sender: 'Thủ kho (Warehouse)',
            productId: productId,
            productName: productName,
            category: itemData.category || 'STORAGE',
            supplier: itemData.supplier || 'Nhà phân phối',
            currentStock: itemData.stock !== undefined ? itemData.stock : 0,
            threshold: itemData.threshold || 5,
            requestedQty: itemData.requestedQty || 10,
            reason: itemData.alertReason || n.message || 'Tồn kho chạm ngưỡng tối thiểu, cần mua bổ sung'
          };
        });
    } catch (e) {}

    const combined = [...explicitLogs];
    notifLogs.forEach(nl => {
      if (!combined.some(c => String(c.productId) === String(nl.productId) && Math.abs(new Date(c.sentAt) - new Date(nl.sentAt)) < 10000)) {
        combined.push(nl);
      }
    });

    return combined.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  };

  const loadRfqLogs = () => {
    setRfqAlertLogs(getMergedRfqLogs());
  };

  useEffect(() => {
    loadRfqLogs();
    const handleNotifSent = () => loadRfqLogs();
    window.addEventListener('erp-notification-sent', handleNotifSent);
    return () => window.removeEventListener('erp-notification-sent', handleNotifSent);
  }, []);

  const handleViewMovementDetail = (mv) => {
    if (!mv) return;
    const ref = String(mv.reference || mv.referenceId || mv.poNumber || mv.orderId || mv.receiptNumber || '');
    
    // 1. Check PO / GRN
    if (ref.startsWith('GRN-') || ref.startsWith('PO-') || mv.poNumber) {
      const poNum = ref.replace('GRN-', '') || mv.poNumber;
      const foundRc = (receipts || []).find(r => r.po?.poNumber === poNum || r.receiptNumber === `GRN-${poNum}` || r.id === ref || r.poId === poNum);
      if (foundRc) {
        setSelectedReceipt(foundRc);
        return;
      }
      const matchingPo = (purchaseOrders || []).find(p => p.poNumber === poNum || String(p.id) === String(poNum));
      if (matchingPo) {
        setSelectedReceipt({
          id: `GRN-${poNum}`,
          receiptNumber: `GRN-${poNum}`,
          status: matchingPo.warehouseStatus === 'RECEIVED' ? 'DONE' : 'READY',
          poId: matchingPo.id,
          poNumber: poNum,
          po: matchingPo,
          warehouse: { name: 'Kho Tổng' },
          isProvisional: true,
          createdAt: matchingPo.createdAt || new Date().toISOString()
        });
        return;
      }
    }

    // 2. Check Sales Order (ORD-)
    if (ref.startsWith('ORD-') || mv.orderId) {
      const ordId = ref || mv.orderId;
      const foundOrd = (orders || []).find(o => o.orderId === ordId || String(o.id) === String(ordId));
      if (foundOrd) {
        setSelectedDetailOrder(foundOrd);
        return;
      }
    }

    // 3. Fallback Movement Log Modal
    setSelectedMovementLog(mv);
  };

  // GRN filter
  const [receiptStatusFilter, setReceiptStatusFilter] = useState('ALL');
  const [receiptSearch, setReceiptSearch] = useState('');
  const [grnStartDate, setGrnStartDate] = useState('');
  const [grnEndDate, setGrnEndDate] = useState('');

  // New Product Modal State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdForm, setNewProdForm] = useState({ name: '', category: 'CPU', stock: '', price: '', supplier: 'Intel Vietnam', threshold: '5', location: 'ZONE-A/SHELF-01/BIN-01' });

  // Edit Product Modal State
  const [editingProd, setEditingProd] = useState(null);

  // Edit State
  const [editingThresholdId, setEditingThresholdId] = useState(null);
  const [tempThreshold, setTempThreshold] = useState('');
  
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [tempLocation, setTempLocation] = useState('');

  // Tab State for Warehouse Staff
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'grn', 'delivery', 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedLocationStatus, setSelectedLocationStatus] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('PENDING'); // 'PENDING', 'SHIPPED', 'DELIVERED', 'ALL'
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL'); // 'ALL', 'IN', 'OUT'
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Direct (Manual) Intake States
  const [directProduct, setDirectProduct] = useState('');
  const [directQty, setDirectQty] = useState('');
  const [directSupplier, setDirectSupplier] = useState('');
  const [directPrice, setDirectPrice] = useState('');
  const [directReason, setDirectReason] = useState('DIRECT_PURCHASE');
  const [directRef, setDirectRef] = useState('');
  const [directLocation, setDirectLocation] = useState('');
  const [directNote, setDirectNote] = useState('');

  // Autosuggest Product Selector States
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // RFQ Alert Modal State
  const [rfqModalData, setRfqModalData] = useState(null);

  // ──── Fetch receipts from backend & sync with QA Inspection Logs ────
  const fetchReceipts = async (silent = false) => {
    if (!silent && receipts.length === 0) {
      setReceiptsLoading(true);
    }
    setReceiptsError(null);
    try {
      let apiReceipts = [];
      try {
        const [receiptsRes, movementsRes] = await Promise.all([
          api.get('/warehouse/receipts'),
          api.get('/warehouse/stock-movements?limit=50')
        ]);
        if (receiptsRes?.success) apiReceipts = receiptsRes.data || [];
        if (movementsRes?.success) setStockMovements(movementsRes.data || []);
      } catch (e) {
        console.warn('API error, using local PO receipts fallback:', e);
      }

      let qaLogs = [];
      try { qaLogs = JSON.parse(localStorage.getItem('erp_qa_inspection_logs') || '[]'); } catch (_) {}

      let localPOs = [];
      try { localPOs = JSON.parse(localStorage.getItem('erp_pos') || '[]'); } catch (_) {}
      [...(purchaseOrders || [])].forEach(p => {
        if (!localPOs.some(l => l.poNumber === p.poNumber || String(l.id) === String(p.id))) {
          localPOs.push(p);
        }
      });

      // Sync PO status & receipt status from localPOs and qaLogs into apiReceipts
      const syncedApiReceipts = apiReceipts.map(receipt => {
        const poNum = receipt.po?.poNumber || receipt.poId;
        const matchingPO = localPOs.find(p => p.poNumber === poNum || String(p.id) === String(receipt.poId));
        const matchingLog = qaLogs.find(l => l.poNumber === poNum || String(l.poNumber) === String(receipt.poId));

        const effectivePoStatus = matchingLog?.status || matchingPO?.status || receipt.po?.status;
        const isWarehouseReceived = matchingPO?.warehouseStatus === 'RECEIVED' || matchingPO?.status === 'DONE' || receipt.status === 'DONE';
        const isCompleted = isWarehouseReceived || ['RECEIVED', 'DONE', 'COMPLETED'].includes(effectivePoStatus);

        return {
          ...receipt,
          status: isCompleted ? 'DONE' : 'READY',
          po: {
            ...(receipt.po || matchingPO || {}),
            poNumber: poNum,
            status: effectivePoStatus
          }
        };
      });

      const combinedReceipts = [...syncedApiReceipts];
      localPOs
        .filter(po => ['CONFIRMED_BY_SUPPLIER', 'QA_PASSED', 'QA_PARTIAL', 'RECEIVED', 'DONE', 'COMPLETED'].includes(po.status))
        .forEach(po => {
          const poNumber = po.poNumber || po.id;
          const matchingLog = qaLogs.find(l => l.poNumber === poNumber || String(l.poNumber) === String(po.id));
          const effectiveStatus = matchingLog?.status || po.status;

          const existingIdx = combinedReceipts.findIndex(r =>
            r.po?.poNumber === poNumber ||
            String(r.poId) === String(po.id) ||
            r.receiptNumber === `GRN-${poNumber}` ||
            r.id === `GRN-${poNumber}`
          );

          const isCompleted = po.warehouseStatus === 'RECEIVED' || po.status === 'DONE' || ['RECEIVED', 'DONE', 'COMPLETED'].includes(effectiveStatus);
          const grnStatus = isCompleted ? 'DONE' : 'READY';

          const receiptObj = {
            id: `GRN-${poNumber}`,
            receiptNumber: `GRN-${poNumber}`,
            status: grnStatus,
            poId: po.id || poNumber,
            poNumber: poNumber,
            po: {
              ...po,
              poNumber,
              status: effectiveStatus,
              supplier: po.supplier || { name: po.supplierName || po.supplierCode || 'Nhà Cung Cấp' }
            },
            warehouse: { name: 'Kho Tổng' },
            isProvisional: true,
            createdAt: po.createdAt || new Date().toISOString()
          };

          if (existingIdx >= 0) {
            combinedReceipts[existingIdx] = {
              ...combinedReceipts[existingIdx],
              status: grnStatus,
              po: {
                ...combinedReceipts[existingIdx].po,
                status: effectiveStatus
              }
            };
          } else {
            combinedReceipts.push(receiptObj);
          }
        });

      setReceipts(combinedReceipts);
    } catch (err) {
      console.warn('Warehouse API error:', err.message);
      setReceiptsError('Lỗi kết nối tới server Warehouse.');
    } finally {
      if (!silent) setReceiptsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts(false);
  }, []);

  useEffect(() => {
    const refresh = () => fetchReceipts(true);
    window.addEventListener('erp-purchase-orders-changed', refresh);
    window.addEventListener('erp-qa-inspection-changed', refresh);
    window.addEventListener('storage', refresh);

    // Heartbeat auto-sync silently in background every 4s
    const intervalId = setInterval(refresh, 4000);

    return () => {
      window.removeEventListener('erp-purchase-orders-changed', refresh);
      window.removeEventListener('erp-qa-inspection-changed', refresh);
      window.removeEventListener('storage', refresh);
      clearInterval(intervalId);
    };
  }, [purchaseOrders]);

  // Auto-correct stale stock movement quantities in localStorage if recorded with fallback quantity=1
  useEffect(() => {
    try {
      const localMvs = JSON.parse(localStorage.getItem('erp_stock_movements') || '[]');
      let hasChanges = false;
      const updatedMvs = localMvs.map(mv => {
        if (mv.reference && (mv.reference.includes('PO-') || mv.reference.includes('GRN-'))) {
          const poNum = String(mv.reference).replace('GRN-', '').trim();
          const matchedPo = (purchaseOrders || []).find(p => p.poNumber === poNum || String(p.id) === poNum);
          if (matchedPo && matchedPo.items && matchedPo.items.length > 0) {
            const correctQty = matchedPo.items.reduce((s, i) => s + (parseInt(i.quantity || i.qty) || 0), 0);
            if (correctQty > 0 && mv.quantity !== correctQty) {
              hasChanges = true;
              return { ...mv, quantity: correctQty };
            }
          }
        }
        return mv;
      });
      if (hasChanges) {
        localStorage.setItem('erp_stock_movements', JSON.stringify(updatedMvs));
      }
    } catch (_) {}
  }, [purchaseOrders]);

  // Refetch silently when switching tabs
  useEffect(() => {
    fetchReceipts(true);
  }, [activeTab]);

  const isItemDiscontinued = (item) => {
    if (!item) return false;
    const statusUpper = String(item.status || '').toUpperCase();
    return item.available === false || 
           item.isAvailable === false || 
           item.available === 'false' ||
           item.isAvailable === 'false' ||
           item.isDiscontinued === true ||
           item.discontinued === true ||
           statusUpper === 'DISCONTINUED' || 
           statusUpper === 'INACTIVE' ||
           statusUpper.includes('NGỪNG') ||
           statusUpper.includes('NGUNG');
  };

  const CATEGORY_MAP_VI = {
    CPU: 'Bộ Vi Xử Lý (CPU)',
    VGA: 'Card Màn Hình (VGA)',
    MAINBOARD: 'Bo Mạch Chủ (Mainboard)',
    RAM: 'Bộ Nhớ Trong (RAM)',
    STORAGE: 'Ổ Cứng / Thẻ Nhớ (Storage)',
    CASE: 'Vỏ Máy Tính (Case)',
    PSU: 'Nguồn Máy Tính (PSU)',
    COOLER: 'Tản Nhiệt (Cooler)',
    MONITOR: 'Màn Hình (Monitor)',
    KEYBOARD: 'Bàn Phím (Keyboard)',
    MOUSE: 'Chuột Máy Tính (Mouse)',
    HEADPHONE: 'Tai Nghe (Headphone)',
    SPEAKER: 'Loa Máy Tính (Speaker)',
    ACCESSORY: 'Phụ Kiện (Accessory)',
    GEAR: 'Gaming Gear'
  };

  const getCategoryNameVi = (cat) => {
    if (!cat) return 'Khác';
    const key = String(cat).toUpperCase();
    return CATEGORY_MAP_VI[key] || cat;
  };

  const getStockStatusKey = (item) => {
    if (isItemDiscontinued(item)) return 'DISCONTINUED';
    const stock = Number(item.stock || 0);
    const threshold = Number(item.threshold || 0);
    if (stock === 0) return 'OUT_OF_STOCK';
    if (stock <= threshold) return 'WARNING';
    return 'SAFE';
  };

  const getStockStatus = (item) => {
    const key = getStockStatusKey(item);
    const badgeStyle = { whiteSpace: 'nowrap', fontSize: '0.73rem', padding: '0.25rem 0.55rem', borderRadius: '6px', fontWeight: 600, display: 'inline-block' };
    
    if (key === 'DISCONTINUED') return <span className="badge badge-danger" style={{ ...badgeStyle, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Ngừng kinh doanh</span>;
    if (key === 'OUT_OF_STOCK') return <span className="badge badge-danger" style={{ ...badgeStyle, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Hết Hàng</span>;
    if (key === 'WARNING') return <span className="badge badge-warning" style={{ ...badgeStyle, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>Cảnh Báo Tồn</span>;
    return <span className="badge badge-success" style={{ ...badgeStyle, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>An Toàn</span>;
  };

  const categoriesList = ['ALL', ...new Set(inventory.map(item => item.category))];

  const dynamicSuppliersList = Array.from(
    new Set([
      ...inventory.map(item => item.supplier || item.brand).filter(Boolean),
      ...STANDARD_SUPPLIERS
    ])
  ).sort((a, b) => a.localeCompare(b, 'vi'));

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || getStockStatusKey(item) === selectedStatus;

    let matchesLocation = true;
    if (selectedLocationStatus === 'UNASSIGNED') {
      matchesLocation = !item.location || item.location === 'Chưa xếp kệ' || item.location.trim() === '';
    } else if (selectedLocationStatus === 'ASSIGNED') {
      matchesLocation = item.location && item.location !== 'Chưa xếp kệ' && item.location.trim() !== '';
    }

    const itemSupplier = item.supplier || item.brand || 'Khác';
    const matchesSupplier = selectedSupplier === 'ALL' || 
      itemSupplier.toLowerCase() === selectedSupplier.toLowerCase() ||
      itemSupplier.toLowerCase().includes(selectedSupplier.toLowerCase()) || 
      (selectedSupplier === 'Khác / Nhập nội bộ' && itemSupplier === 'Khác');

    return matchesSearch && matchesCategory && matchesStatus && matchesLocation && matchesSupplier;
  });

  const lowStockItems = inventory.filter(item => getStockStatusKey(item) === 'WARNING');
  const outOfStockItems = inventory.filter(item => getStockStatusKey(item) === 'OUT_OF_STOCK');
  const discontinuedItems = inventory.filter(item => getStockStatusKey(item) === 'DISCONTINUED');
  const readyReceipts = receipts.filter(r => r.status === 'READY');
  const doneReceipts = receipts.filter(r => r.status === 'DONE');

  // Filtered receipts for display (Only active pending receipts waiting for intake; completed receipts move to History tab)
  const filteredReceipts = receipts
    .filter(r => r.status !== 'DONE' && r.status !== 'COMPLETED')
    .filter(r => {
      const matchesStatus = receiptStatusFilter === 'ALL' || r.status === receiptStatusFilter;
      const matchesSearch = !receiptSearch.trim() || 
        (r.receiptNumber || '').toLowerCase().includes(receiptSearch.toLowerCase()) ||
        (r.po?.poNumber || '').toLowerCase().includes(receiptSearch.toLowerCase()) ||
        (r.po?.supplier?.name || r.po?.supplierCode || r.po?.supplierName || '').toLowerCase().includes(receiptSearch.toLowerCase());
      
      const rDate = r.createdAt || r.receivedDate || r.po?.createdAt;
      const matchesDate = isDateInRange(rDate, grnStartDate, grnEndDate);

      return matchesStatus && matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      const dA = parseDateVal(a.createdAt || a.receivedDate || a.po?.createdAt) || new Date(a.createdAt || 0);
      const dB = parseDateVal(b.createdAt || b.receivedDate || b.po?.createdAt) || new Date(b.createdAt || 0);
      if (dB.getTime() !== dA.getTime()) return dB.getTime() - dA.getTime();
      return String(b.receiptNumber || b.id || '').localeCompare(String(a.receiptNumber || a.id || ''), 'vi', { numeric: true });
    });

  // Dynamic Comprehensive Stock Movements List (Combines API, Receipts, Orders, and Local Logs)
  const allStockMovements = React.useMemo(() => {
    const list = [];
    const seenKeys = new Set();

    // Helper to resolve real product names from receipts/POs or Sales Orders if generic
    const resolveProductName = (name, ref) => {
      if (name && name !== 'Linh kiện nhập kho' && name !== 'Linh kiện' && !name.startsWith('Linh kiện #')) return name;
      if (!ref) return name || 'Linh kiện máy tính';

      const strRef = String(ref).trim();

      // If it's a Sales Order
      if (strRef.startsWith('ORD-')) {
        const matchedOrd = (orders || []).find(o => o.orderId === strRef || String(o.id) === strRef);
        if (matchedOrd && matchedOrd.items && matchedOrd.items.length > 0) {
          return matchedOrd.items.map(i => i.name || i.product?.name || 'Linh kiện').join(', ');
        }
      }

      // If it's a PO / GRN
      const cleanRef = strRef.replace('GRN-', '').trim();
      const matchedRc = (receipts || []).find(r => r.po?.poNumber === cleanRef || r.receiptNumber === ref || String(r.poId) === cleanRef);
      const matchedPo = (purchaseOrders || []).find(p => p.poNumber === cleanRef || String(p.id) === cleanRef || p.poNumber === ref);
      const items = matchedRc?.po?.items || matchedRc?.items || matchedPo?.items || [];
      if (items.length > 0) {
        return items.map(i => i.productName || i.name || i.product?.name).filter(Boolean).join(', ');
      }
      return name || 'Linh kiện máy tính';
    };

    // Helper to resolve real quantity from PO, receipts, or Sales Orders if generic or fallback
    const resolveQuantity = (qty, ref) => {
      if (!ref) return qty || 1;
      const strRef = String(ref).trim();

      // If it's a Sales Order (ORD-)
      if (strRef.startsWith('ORD-')) {
        const matchedOrd = (orders || []).find(o => o.orderId === strRef || String(o.id) === strRef);
        if (matchedOrd && matchedOrd.items && matchedOrd.items.length > 0) {
          const totalOrdQty = matchedOrd.items.reduce((s, i) => s + (parseInt(i.quantity || i.qty) || 0), 0);
          if (totalOrdQty > 0) return totalOrdQty;
        }
      }

      // If it's a PO / GRN
      if (strRef.includes('PO-') || strRef.includes('GRN-')) {
        const cleanRef = strRef.replace('GRN-', '').trim();
        const matchedRc = (receipts || []).find(r => r.po?.poNumber === cleanRef || r.receiptNumber === ref || String(r.poId) === cleanRef);
        const matchedPo = (purchaseOrders || []).find(p => p.poNumber === cleanRef || String(p.id) === cleanRef || p.poNumber === ref);
        const items = matchedRc?.po?.items || matchedRc?.items || matchedPo?.items || [];
        if (items.length > 0) {
          const totalQty = items.reduce((s, i) => s + (parseInt(i.quantity || i.qty) || 0), 0);
          if (totalQty > 0) return totalQty;
        }
      }

      return qty || 1;
    };

    // 1. From API stockMovements state
    (stockMovements || []).forEach(mv => {
      const ref = mv.reference || mv.referenceId || mv.poNumber || mv.orderId || mv.receiptNumber || 'THAO-TAC-KHO';
      const key = mv.id || `API-${mv.createdAt}-${ref}`;
      seenKeys.add(key);
      if (ref) seenKeys.add(ref);
      list.push({
        id: key,
        createdAt: mv.createdAt || mv.date || new Date(),
        type: mv.type || 'IN',
        productName: resolveProductName(mv.product?.name || mv.productName || mv.productId, ref),
        quantity: resolveQuantity(mv.quantity, ref),
        reference: ref,
        note: mv.note || (mv.type === 'IN' ? 'Nhập kho hàng hóa' : 'Xuất kho bán hàng')
      });
    });

    // 2. From LocalStorage stock movements (Direct Intake, manual adjustments)
    try {
      const localMvs = JSON.parse(localStorage.getItem('erp_stock_movements') || '[]');
      localMvs.forEach(mv => {
        const ref = mv.reference || 'THUC-THI-TRUC-TIEP';
        const key = mv.id || `LOCAL-${mv.createdAt}-${ref}`;
        if (!seenKeys.has(key) && !seenKeys.has(ref)) {
          seenKeys.add(key);
          if (ref && ref !== 'THUC-THI-TRUC-TIEP') seenKeys.add(ref);
          list.push({
            id: key,
            createdAt: mv.createdAt || mv.date || new Date(),
            type: mv.type || 'IN',
            productName: resolveProductName(mv.productName, ref),
            quantity: resolveQuantity(mv.quantity, ref),
            reference: ref,
            note: mv.note || 'Thao tác kho trực tiếp'
          });
        }
      });
    } catch (e) {}

    // 3. From Completed Purchase Receipts (Nhập kho từ PO/NCC)
    (receipts || []).forEach(rc => {
      if (rc.status === 'DONE' || rc.receivedDate) {
        const ref = rc.receiptNumber || rc.po?.poNumber || 'GRN-PO';
        const key = `RC-${rc.id || ref}`;
        if (!seenKeys.has(key) && !seenKeys.has(ref)) {
          seenKeys.add(key);
          seenKeys.add(ref);
          const itemsText = rc.items?.map(i => `${i.product?.name || i.name || 'Linh kiện'} (x${i.quantity})`).join(', ') || 
                            rc.po?.items?.map(i => `${i.product?.name || i.name || 'Linh kiện'} (x${i.quantity})`).join(', ') || 'Linh kiện nhập kho PO';
          const totalQty = rc.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 
                           rc.po?.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 1;
          list.push({
            id: key,
            createdAt: rc.receivedDate || rc.updatedAt || rc.createdAt || new Date(),
            type: 'IN',
            productName: itemsText,
            quantity: totalQty,
            reference: ref,
            note: `Nhập kho từ Đơn Mua Hàng PO ${rc.po?.poNumber || ref}`
          });
        }
      }
    });

    // 4. From Shipped & Completed Sales Orders (Xuất kho bán hàng)
    (orders || []).forEach(ord => {
      if (['READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CONFIRMED'].includes(ord.status)) {
        const ordItems = ord.items || [];
        if (ordItems.length > 0) {
          ordItems.forEach((item, idx) => {
            const key = `ORD-${ord.orderId}-${item.productId || idx}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              list.push({
                id: key,
                createdAt: ord.date || ord.createdAt || new Date(),
                type: 'OUT',
                productName: item.name || item.product?.name || `Linh kiện #${item.productId}`,
                quantity: item.quantity || 1,
                reference: ord.orderId,
                note: ord.lastNote || `Xuất kho tự động sau khi duyệt cho Đơn Hàng ${ord.orderId} (${ord.type === 'POS' ? 'Bán tại quầy POS' : 'Đơn Online'})`
              });
            }
          });
        }
      }
    });

    // Sort newest first
    return list.sort((a, b) => {
      const dA = parseDateVal(a.createdAt) || new Date(a.createdAt || 0);
      const dB = parseDateVal(b.createdAt) || new Date(b.createdAt || 0);
      return dB.getTime() - dA.getTime();
    });
  }, [stockMovements, receipts, orders]);

  const formatPrice = (price) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(isNaN(num) ? 0 : num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Chưa rõ';
    const d = parseDateVal(dateStr) || new Date(dateStr);
    if (!d || isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return 'Chưa rõ';
    const d = parseDateVal(dateVal) || new Date(dateVal);
    if (!d || isNaN(d.getTime())) return String(dateVal);
    const dateFormatted = d.toLocaleDateString('vi-VN');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hours}:${minutes}`;
    return (
      <div>
        <div style={{ fontWeight: 700, color: '#0f172a' }}>{dateFormatted}</div>
        {timeFormatted !== '00:00' && (
          <div style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 500 }}>{timeFormatted}</div>
        )}
      </div>
    );
  };

  // ──── Validate Receipt (Backend API & Local Fallback) ────
  const handleValidateReceipt = async (receiptTarget, poStatus) => {
    const receiptId = typeof receiptTarget === 'object' ? receiptTarget.id : receiptTarget;
    const targetReceipt = typeof receiptTarget === 'object' ? receiptTarget : (receipts.find(r => r.id === receiptId) || selectedReceipt);

    if (!['QA_PASSED', 'QA_PARTIAL'].includes(poStatus)) {
      alert('⚠️ Chưa thể nhập kho! Lô hàng phải được QA/QC kiểm định và duyệt đạt chất lượng trước khi kho xác nhận nhập.');
      return;
    }

    if (!window.confirm('Bạn có chắc muốn xác nhận nhập kho cho lô hàng này?')) return;
    setSubmitting(true);

    // Track whether we used the backend API (which creates its own movement record)
    let usedBackendApi = false;

    try {
      const isLocalOrProvisional = String(receiptId).startsWith('local-') || String(receiptId).startsWith('GRN-');
      if (!isLocalOrProvisional) {
        const res = await api.post(`/warehouse/receipts/${receiptId}/validate`, {});
        if (res?.success) {
          usedBackendApi = true;
          console.log('Backend API validate receipt success:', res);
        }
      }

      // Update local PO state & persist receipt completion
      const poId = targetReceipt?.poId || targetReceipt?.po?.id || targetReceipt?.po?.poNumber || selectedReceipt?.poId;
      const poNum = targetReceipt?.po?.poNumber || targetReceipt?.poNumber || poId;
      
      let localPOs = [];
      try { localPOs = JSON.parse(localStorage.getItem('erp_pos') || '[]'); } catch (_) {}
      let found = false;
      const updatedPOs = localPOs.map(po => {
        if (po.poNumber === poNum || String(po.id) === String(poId)) {
          found = true;
          return { ...po, status: 'DONE', warehouseStatus: 'RECEIVED', receivedAt: new Date().toISOString() };
        }
        return po;
      });

      if (!found) {
        const basePo = targetReceipt?.po || (purchaseOrders || []).find(p => p.poNumber === poNum || String(p.id) === String(poId)) || {};
        updatedPOs.push({
          ...basePo,
          id: basePo.id || poId,
          poNumber: poNum,
          status: 'DONE',
          warehouseStatus: 'RECEIVED',
          receivedAt: new Date().toISOString()
        });
      }

      localStorage.setItem('erp_pos', JSON.stringify(updatedPOs));

      // Update inventory stock for each item in the GRN receipt via processGRN
      try {
        const qaLogs = JSON.parse(localStorage.getItem('erp_qa_inspection_logs') || '[]');
        const qaLog = qaLogs.find(l => l.poNumber === poNum || String(l.poNumber) === String(poId));

        // Resolve effective PO with items list from purchaseOrders context if missing in targetReceipt
        const effectivePo = (targetReceipt?.po && Array.isArray(targetReceipt.po.items) && targetReceipt.po.items.length > 0)
          ? targetReceipt.po
          : (purchaseOrders.find(p => 
              p.id === targetReceipt?.poId || 
              p.poNumber === targetReceipt?.poId || 
              p.poNumber === poNum ||
              p.poNumber === targetReceipt?.receiptNumber?.replace('GRN-', '') ||
              (targetReceipt?.receiptNumber && targetReceipt.receiptNumber.includes(p.poNumber))
            ) || targetReceipt?.po || {});

        const rawItems = effectivePo.items || targetReceipt?.items || selectedReceipt?.po?.items || [];
        const supplierName = effectivePo.supplier?.name || targetReceipt?.po?.supplier?.name || targetReceipt?.po?.supplierName || 'NCC';

        rawItems.forEach(item => {
          const itemProdId = item.productId || item.product?.id || item.id;
          let matchingInvItem = (inventory || []).find(i => String(i.id) === String(itemProdId) || String(i.productId) === String(itemProdId));
          if (!matchingInvItem) {
            matchingInvItem = (inventory || []).find(i => i.name?.toLowerCase().includes((item.productName || item.name || '').toLowerCase()));
          }

          const originalQty = parseInt(item.quantity || item.qty) || 1;
          let actualQty = originalQty;
          if (qaLog && qaLog.passedQty !== undefined) {
            if (rawItems.length === 1) {
              actualQty = Number(qaLog.passedQty);
            } else {
              actualQty = Math.round(originalQty * (Number(qaLog.passedQty) / (Number(qaLog.totalQty) || 1)));
            }
          }
          const unitPrice = parseFloat(item.unitCost || item.unitPrice || item.price || matchingInvItem?.price || 0);

          if (matchingInvItem && typeof processGRN === 'function') {
            processGRN(matchingInvItem.id, actualQty, supplierName, unitPrice, poNum);
          }
        });
      } catch (err) {
        console.warn('Error updating inventory stock on GRN validate:', err);
      }

      // Only save local movement when backend was NOT used (provisional/local receipts only)
      if (!usedBackendApi) {
        try {
          const localMvs = JSON.parse(localStorage.getItem('erp_stock_movements') || '[]');
          const qaLogs = JSON.parse(localStorage.getItem('erp_qa_inspection_logs') || '[]');
          const qaLog = qaLogs.find(l => l.poNumber === poNum);

          const effectivePo = (targetReceipt?.po && Array.isArray(targetReceipt.po.items) && targetReceipt.po.items.length > 0)
            ? targetReceipt.po
            : (purchaseOrders.find(p => p.poNumber === poNum || String(p.id) === String(poId)) || targetReceipt?.po || {});

          const totalItems = effectivePo.items || targetReceipt?.items || selectedReceipt?.po?.items || [];
          const totalItemsQty = totalItems.reduce((sum, i) => sum + (parseInt(i.quantity || i.qty) || 0), 0);
          const qtyReceived = qaLog ? Number(qaLog.passedQty) : (totalItemsQty || targetReceipt?.po?.quantity || 1);
          const prodName = totalItems.map(i => i.productName || i.name || i.product?.name).filter(Boolean).join(', ') || targetReceipt?.po?.productName || 'Linh kiện nhập kho';

          const newMv = {
            id: `mv-grn-${Date.now()}`,
            createdAt: new Date().toISOString(),
            type: 'IN',
            productName: prodName,
            quantity: qtyReceived,
            reference: `GRN-${poNum}`,
            note: qaLog ? `Nhập kho thành công ${qtyReceived} SP đạt chuẩn QA/QC (Đơn ${poNum})` : `Nhập kho thành công lô hàng ${poNum}`
          };
          localStorage.setItem('erp_stock_movements', JSON.stringify([newMv, ...localMvs]));
        } catch (_) {}
      }

      // Update UI state & close modal first
      setSelectedReceipt(null);
      await fetchReceipts();
      window.dispatchEvent(new Event('erp-purchase-orders-changed'));

      setTimeout(() => {
        alert(`✅ Xác nhận nhập kho thành công cho đơn ${poNum}! Tồn kho và Lịch sử nhập xuất kho đã được cập nhật.`);
      }, 100);
    } catch (err) {
      console.warn('Receipt validate warning:', err);
      setSelectedReceipt(null);
      await fetchReceipts();
    }
    setSubmitting(false);
  };

  // Direct Intake Handler

  const handleDirectGRNSubmit = (e) => {
    e.preventDefault();
    if (!directProduct || !directQty || !directSupplier) {
      alert('Vui lòng chọn linh kiện hợp lệ từ danh sách gợi ý!');
      return;
    }
    
    const prodId = parseInt(directProduct);
    const qty = parseInt(directQty);
    const unitPrice = directPrice ? parseInt(directPrice) : null;
    const reasonText = {
      'DIRECT_PURCHASE': 'Nhập mua trực tiếp',
      'AUDIT_ADJUSTMENT': 'Điều chỉnh kiểm kê',
      'WARRANTY_RETURN': 'Khách trả bảo hành',
      'OTHER': 'Nhập khác'
    }[directReason];
    
    processGRN(prodId, qty, directSupplier, unitPrice, null);
    
    if (directLocation) {
      updateLocation(prodId, directLocation);
    }
    
    setDirectProduct('');
    setProductSearch('');
    setDirectQty('');
    setDirectSupplier('');
    setDirectPrice('');
    setDirectReason('DIRECT_PURCHASE');
    setDirectRef('');
    setDirectLocation('');
    setDirectNote('');
    alert(`Đã thực hiện nhập kho trực tiếp thành công! Lý do: ${reasonText}.`);
  };

  // ──── Render: Inventory Table ────
  const renderInventoryTable = () => {
    return (
      <div className="card-glass" style={{ padding: '1.5rem', width: '100%' }}>
        {/* Header Title & Primary Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '10px', color: '#2563eb', display: 'flex', alignItems: 'center' }}>
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                Danh Sách Tồn Kho Thực Tế
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Hiển thị {filteredInventory.length.toLocaleString('vi-VN')} / {inventory.length.toLocaleString('vi-VN')} linh kiện trong hệ thống
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => setShowRfqHistoryModal(true)}
              className="btn btn-secondary"
              style={{
                height: '38px', fontSize: '0.82rem', fontWeight: 700, padding: '0 1rem',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a',
                borderRadius: '10px', cursor: 'pointer'
              }}
              title="Xem lịch sử các lần gửi cảnh báo RFQ tới Bộ Phận Mua Hàng & Ban Giám Đốc"
            >
              <Clock size={16} /> 📜 Lịch Sử Cảnh Báo RFQ
              {rfqAlertLogs.length > 0 && (
                <span style={{
                  backgroundColor: '#f59e0b', color: '#ffffff',
                  fontSize: '0.72rem', fontWeight: 800,
                  padding: '1px 7px', borderRadius: '10px', marginLeft: '2px'
                }}>
                  {rfqAlertLogs.length}
                </span>
              )}
            </button>
            {!isCEO && (
              <button
                onClick={() => setShowAddProduct(true)}
                className="btn btn-primary shadow-glow"
                style={{ height: '38px', fontSize: '0.85rem', fontWeight: 700, padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#2563eb', borderRadius: '10px', border: 'none' }}
              >
                <PlusCircle size={16} /> Thêm Linh Kiện Mới
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar Grid Container */}
        <div style={{
          backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '0.85rem 1rem', marginBottom: '1.25rem',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center'
        }}>
          {/* Search Box (Takes double width if space permits) */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Tìm theo tên linh kiện, S/N..." 
              style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.82rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter 1: Category */}
          <select
            className="input-field"
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 0.6rem', backgroundColor: selectedCategory !== 'ALL' ? '#eff6ff' : '#ffffff', border: selectedCategory !== 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontWeight: selectedCategory !== 'ALL' ? 700 : 500 }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">📁 Phân nhóm (Tất cả)</option>
            {categoriesList.map(cat => cat !== 'ALL' && (
              <option key={cat} value={cat}>{getCategoryNameVi(cat)} ({inventory.filter(i => i.category === cat).length})</option>
            ))}
          </select>

          {/* Filter 2: Status */}
          <select
            className="input-field"
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 0.6rem', backgroundColor: selectedStatus !== 'ALL' ? '#fef3c7' : '#ffffff', border: selectedStatus !== 'ALL' ? '1px solid #d97706' : '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontWeight: selectedStatus !== 'ALL' ? 700 : 500 }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">⚡ Trạng thái (Tất cả)</option>
            <option value="SAFE">An toàn ({inventory.filter(i => getStockStatusKey(i) === 'SAFE').length})</option>
            <option value="WARNING">Cảnh báo tồn ({lowStockItems.length})</option>
            <option value="OUT_OF_STOCK">Hết hàng cần nhập ({outOfStockItems.length})</option>
            <option value="DISCONTINUED">Ngừng kinh doanh ({discontinuedItems.length})</option>
          </select>

          {/* Filter 3: Shelf Location */}
          <select
            className="input-field"
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 0.6rem', backgroundColor: selectedLocationStatus !== 'ALL' ? '#eff6ff' : '#ffffff', border: selectedLocationStatus !== 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontWeight: selectedLocationStatus !== 'ALL' ? 700 : 500 }}
            value={selectedLocationStatus}
            onChange={(e) => setSelectedLocationStatus(e.target.value)}
          >
            <option value="ALL">📍 Kệ kho (Tất cả)</option>
            <option value="UNASSIGNED">Chưa xếp kệ</option>
            <option value="ASSIGNED">Đã xếp kệ</option>
          </select>

          {/* Filter 4: Supplier */}
          <select
            className="input-field"
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 0.6rem', backgroundColor: selectedSupplier !== 'ALL' ? '#eff6ff' : '#ffffff', border: selectedSupplier !== 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontWeight: selectedSupplier !== 'ALL' ? 700 : 500 }}
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
          >
            <option value="ALL">🏢 Nhà cung cấp (Tất cả)</option>
            {dynamicSuppliersList.map(sup => {
              const count = inventory.filter(i => (i.supplier || i.brand || 'Khác').toLowerCase() === sup.toLowerCase()).length;
              return (
                <option key={sup} value={sup}>{sup} {count > 0 ? `(${count})` : ''}</option>
              );
            })}
          </select>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="erp-table" style={{ width: '100%', minWidth: '980px' }}>
            <thead>
              <tr>
                <th style={{ width: '28%', padding: '0.625rem 0.5rem' }}>Tên Linh Kiện</th>
                <th style={{ width: '10%', padding: '0.625rem 0.5rem' }}>Phân Nhóm</th>
                <th style={{ width: '8%', padding: '0.625rem 0.5rem', textAlign: 'center' }}>Số Lượng Tồn</th>
                <th style={{ width: '14%', padding: '0.625rem 0.5rem' }}>Vị Trí Kệ</th>
                <th style={{ width: '12%', padding: '0.625rem 0.5rem' }}>Nhà Cung Cấp</th>
                <th style={{ width: '12%', padding: '0.625rem 0.5rem', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ width: '16%', padding: '0.625rem 0.5rem', textAlign: 'center' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Không tìm thấy linh kiện nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const itemSerials = (serialNumbers || []).filter(sn => sn.productId === item.id && sn.status === 'AVAILABLE');
                  const serialListStr = itemSerials.slice(0, 3).map(s => s.serial).join(', ') + (itemSerials.length > 3 ? '...' : '');
                  return (
                    <tr key={item.id}>
                      <td style={{ padding: '0.625rem 0.5rem', wordBreak: 'break-word', whiteSpace: 'normal', fontSize: '0.8rem' }}>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{item.name}</strong>
                        
                        {isManager ? (
                          editingThresholdId === item.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cảnh báo:</span>
                              <input 
                                type="number" 
                                className="form-input" 
                                style={{ width: '50px', padding: '0.125rem 0.25rem', fontSize: '0.75rem', height: '24px' }} 
                                value={tempThreshold}
                                onChange={(e) => setTempThreshold(e.target.value)}
                                autoFocus
                              />
                              <button 
                                onClick={() => {
                                  updateThreshold(item.id, tempThreshold);
                                  setEditingThresholdId(null);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '2px' }}
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              <span>Ngưỡng tối thiểu: {item.threshold}</span>
                              <button 
                                onClick={() => {
                                  setEditingThresholdId(item.id);
                                  setTempThreshold(item.threshold.toString());
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                                title="Thiết lập ngưỡng cảnh báo"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Ngưỡng tối thiểu: {item.threshold}
                          </div>
                        )}

                        {itemSerials.length > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                            S/N khả dụng: {serialListStr}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem', fontSize: '0.8rem' }}>{getCategoryNameVi(item.category)}</td>
                      <td style={{ padding: '0.625rem 0.5rem', fontSize: '0.85rem', fontWeight: 800, textAlign: 'center', color: Number(item.stock) <= Number(item.threshold) ? 'var(--warning)' : '#0f172a' }}>{item.stock}</td>
                      
                      <td style={{ padding: '0.625rem 0.5rem', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                        {!isManager ? (
                          editingLocationId === item.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <select 
                                className="form-input" 
                                style={{ width: '130px', padding: '0.125rem 0.25rem', fontSize: '0.75rem', height: '24px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }} 
                                value={tempLocation}
                                onChange={(e) => setTempLocation(e.target.value)}
                                autoFocus
                              >
                                <option value="">-- Chọn kệ --</option>
                                {PREDEFINED_LOCATIONS.map(loc => (
                                  <option key={loc} value={loc}>{loc}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => {
                                  updateLocation(item.id, tempLocation);
                                  setEditingLocationId(null);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '2px' }}
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <span style={{ fontSize: '0.8125rem', color: item.location ? '#0f172a' : 'var(--text-muted)', fontStyle: item.location ? 'normal' : 'italic' }}>
                                {item.location || 'Chưa xếp kệ'}
                              </span>
                              <button 
                                onClick={() => {
                                  setEditingLocationId(item.id);
                                  setTempLocation(item.location || '');
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                                title="Cập nhật vị trí kệ"
                              >
                                <MapPin size={12} />
                              </button>
                            </div>
                          )
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: item.location ? '#0f172a' : 'var(--text-muted)', fontStyle: item.location ? 'normal' : 'italic' }}>
                            {item.location || 'Chưa xếp kệ'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.625rem 0.5rem', wordBreak: 'break-word', whiteSpace: 'normal', fontSize: '0.8rem' }}>{item.supplier}</td>
                      <td style={{ padding: '0.625rem 0.5rem', fontSize: '0.8rem', textAlign: 'center' }}>{getStockStatus(item)}</td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        {isCEO ? (
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Chỉ Xem Báo Cáo</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                            {!isItemDiscontinued(item) && Number(item.stock) <= Number(item.threshold) && (
                              <button
                                onClick={() => {
                                  const recQty = Math.max((item.threshold || 5) * 2 - (item.stock || 0), 5);
                                  setRfqModalData({
                                    item: item,
                                    qty: recQty,
                                    reason: `Linh kiện ${item.name} hiện còn ${item.stock} cái trong kho (dưới ngưỡng an toàn: ${item.threshold || 5}). Đề xuất Bộ phận Mua hàng lập Yêu Cầu Báo Giá (RFQ) mua bổ sung khẩn cấp.`
                                  });
                                }}
                                className="btn btn-secondary shadow-glow"
                                style={{ padding: '4px 7px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}
                                title="Gửi Cảnh Báo Tồn Kho đến Bộ Phận Mua Hàng để lập Phiếu Báo Giá (RFQ)"
                              >
                                <Zap size={10} /> 🔔 Cảnh Báo RFQ
                              </button>
                            )}
                            <button
                              onClick={() => setEditingProd({ ...item })}
                              className="btn btn-secondary"
                              style={{ padding: '4px 6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                              title="Sửa sản phẩm"
                            >
                              <Edit2 size={10} /> Sửa
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc muốn xóa linh kiện "${item.name}" khỏi danh mục kho?`)) {
                                  deleteProduct(item.id);
                                }
                              }}
                              className="btn"
                              style={{ padding: '4px 6px', fontSize: '0.68rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' }}
                              title="Xóa linh kiện"
                            >
                              Xóa
                            </button>
                          </div>
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
    );
  };

  // ──── Render: GRN Tab (NEW - Backend Linked) ────
  const renderGRNTab = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
        {/* Receipts from Backend */}
        <div className="card-glass" style={{ padding: '1.5rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
                <ClipboardCheck size={20} style={{ color: '#34d399' }} />
                Phiếu Nhận Hàng (Goods Receipt)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                Danh sách phiếu nhận hàng từ Đơn Mua Hàng (PO). Xác nhận nhập kho để cập nhật tồn.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button onClick={fetchReceipts} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px' }}>
                <RefreshCw size={14} className={receiptsLoading ? 'animate-spin' : ''} /> Tải lại
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Tìm mã phiếu, PO, NCC..."
                style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.82rem' }}
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
              />
            </div>

            {/* Simple Date Filter */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: (grnStartDate || grnEndDate) ? '#eff6ff' : '#f8fafc',
              border: (grnStartDate || grnEndDate) ? '1px solid #2563eb' : '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.2rem 0.55rem',
              fontSize: '0.78rem'
            }}>
              <Calendar size={14} style={{ color: '#2563eb' }} />
              <span style={{ color: '#64748b', fontWeight: 600 }}>Từ:</span>
              <input
                type="date"
                value={grnStartDate}
                onChange={(e) => setGrnStartDate(e.target.value)}
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.15rem 0.3rem', fontSize: '0.76rem', color: '#0f172a', outline: 'none' }}
              />
              <span style={{ color: '#64748b', fontWeight: 600 }}>Đến:</span>
              <input
                type="date"
                value={grnEndDate}
                onChange={(e) => setGrnEndDate(e.target.value)}
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.15rem 0.3rem', fontSize: '0.76rem', color: '#0f172a', outline: 'none' }}
              />
              {(grnStartDate || grnEndDate) && (
                <button
                  onClick={() => { setGrnStartDate(''); setGrnEndDate(''); }}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', padding: '0.15rem 0.4rem', marginLeft: '0.2rem' }}
                  title="Xóa bộ lọc ngày"
                >
                  ✕ Xóa
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px' }}>
              {[
                { key: 'ALL', label: 'Tất cả đơn chờ nhập', count: readyReceipts.length },
                { key: 'READY', label: 'Chờ nhập kho', count: readyReceipts.length }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setReceiptStatusFilter(f.key)}
                  style={{
                    padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 600,
                    backgroundColor: receiptStatusFilter === f.key ? 'var(--primary)' : 'transparent',
                    borderRadius: '8px', color: receiptStatusFilter === f.key ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span style={{
                      backgroundColor: receiptStatusFilter === f.key ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: receiptStatusFilter === f.key ? '#fff' : 'var(--text-secondary)',
                      padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.7rem'
                    }}>{f.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {receiptsError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '0.75rem 1rem', color: '#fca5a5', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <AlertOctagon size={16} /><span>{receiptsError}</span>
            </div>
          )}

          {/* Receipts Table */}
          {receiptsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
              <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Đang tải phiếu nhận hàng...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
              <p style={{ fontSize: '1rem' }}>Không có phiếu nhận hàng nào.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Phiếu nhận hàng sẽ tự động tạo khi Đơn Mua Hàng (PO) được xác nhận ở module Mua Hàng.</p>
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Mã Phiếu</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Đơn Mua Hàng</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Nhà Cung Cấp</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Sản Phẩm</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>Trạng Thái</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 1rem', fontSize: '0.82rem', width: '210px', whiteSpace: 'nowrap' }}>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map(receipt => {
                    const po = receipt.po;
                    const poNumber = po?.poNumber || receipt.poId || 'PO-2026-0001';
                    const displayReceiptNumber = receipt.receiptNumber && receipt.receiptNumber.startsWith('GRN-')
                      ? receipt.receiptNumber
                      : `GRN-${poNumber}`;
                    const itemsPreview = po?.items?.slice(0, 2).map(i => i.product?.name || i.name || i.productId).join(', ') || po?.productName || 'Linh kiện';
                    const moreItems = (po?.items?.length || 0) > 2 ? ` (+${po.items.length - 2})` : '';

                    let qaLog = null;
                    try {
                      const rawLogs = JSON.parse(localStorage.getItem('erp_qa_inspection_logs') || '[]');
                      qaLog = rawLogs.find(l => l.poNumber === poNumber || String(l.poNumber) === String(receipt.poId) || String(l.poNumber) === String(po?.id));
                    } catch (_) {}

                    const isQaInspected = ['QA_PASSED', 'QA_PARTIAL'].includes(po?.status) || !!qaLog;
                    
                    return (
                      <tr key={receipt.id} className="hover-row" style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                        onClick={() => setSelectedReceipt(receipt)}
                      >
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.88rem' }}>{displayReceiptNumber}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {receipt.receivedDate ? formatDate(receipt.receivedDate) : 'Chưa nhập'}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.85rem' }}>{poNumber}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{po?.supplier?.name || po?.supplierCode || po?.supplierName || 'N/A'}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '250px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                            {itemsPreview}{moreItems}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {po?.items?.length || 1} sản phẩm • {po?.items?.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || po?.quantity || 1} đơn vị
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          {receipt.status === 'READY' ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700,
                              backgroundColor: isQaInspected ? '#eff6ff' : 'rgba(245, 158, 11, 0.12)',
                              color: isQaInspected ? '#2563eb' : '#d97706',
                              border: isQaInspected ? '1px solid #bfdbfe' : '1px solid #fde68a'
                            }}>
                              <Clock size={12} /> {isQaInspected ? 'Chờ nhập kho (Đã QA)' : 'Chờ nhập kho'}
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#16a34a',
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}>
                              <CheckCircle2 size={12} /> Đã nhập kho
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '210px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'grid', gridTemplateColumns: '95px 95px', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              onClick={() => setSelectedReceipt(receipt)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderRadius: '8px', whiteSpace: 'nowrap', width: '100%' }}
                            >
                              <Eye size={13} /> Chi tiết
                            </button>
                            {receipt.status === 'READY' ? (
                              isQaInspected ? (
                                <button
                                  onClick={() => handleValidateReceipt(receipt, po?.status)}
                                  className="btn btn-primary"
                                  disabled={submitting}
                                  style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderRadius: '8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', whiteSpace: 'nowrap', width: '100%', cursor: 'pointer' }}
                                >
                                  <Check size={13} /> Nhập kho
                                </button>
                              ) : (
                                <button
                                  onClick={() => alert('⚠️ Chưa thể nhập kho! Lô hàng phải qua Chuyên viên QA/QC kiểm định và nghiệm thu chất lượng trước.')}
                                  className="btn btn-warning"
                                  style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', borderRadius: '8px', backgroundColor: '#d97706', color: '#ffffff', border: 'none', whiteSpace: 'nowrap', width: '100%', cursor: 'pointer' }}
                                  title="Chờ Chuyên viên QA/QC nghiệm thu chất lượng"
                                >
                                  <Clock size={12} /> Chờ QC Duyệt
                                </button>
                              )
                            ) : (
                              <div />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Direct GRN Form */}
        <div className="card-glass" style={{ padding: '1.5rem', width: '100%' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
            <PlusCircle size={18} style={{ color: 'var(--secondary)' }} />
            Nhập Kho Trực Tiếp (Không qua PO)
          </h3>

          <form onSubmit={handleDirectGRNSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directReasonSelect">Lý do nhập kho</label>
              <select
                id="directReasonSelect"
                className="form-input"
                value={directReason}
                onChange={(e) => setDirectReason(e.target.value)}
              >
                <option value="DIRECT_PURCHASE">Nhập hàng trực tiếp từ NCC</option>
                <option value="AUDIT_ADJUSTMENT">Nhập bổ sung kiểm kê định kỳ</option>
                <option value="WARRANTY_RETURN">Nhận trả hàng bảo hành</option>
                <option value="OTHER">Nhập khác (Quà tặng, chuyển kho...)</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0, position: 'relative' }}>
              <label className="form-label" htmlFor="directProdSelect">Chọn linh kiện nhập</label>
              <input
                id="directProdSelect"
                type="text"
                className="form-input"
                placeholder="Gõ để tìm nhanh linh kiện..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                  if (e.target.value === '') {
                    setDirectProduct('');
                  }
                }}
                onFocus={() => setShowProductDropdown(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setShowProductDropdown(false);
                  }, 250);
                }}
                required
              />
              {showProductDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%', left: 0, right: 0,
                  maxHeight: '250px', overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 1000,
                  marginTop: '4px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)'
                }}>
                  {inventory
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .slice(0, 15)
                    .map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setDirectProduct(p.id.toString());
                          setProductSearch(p.name);
                          setDirectPrice(p.price.toString());
                          setShowProductDropdown(false);
                        }}
                        style={{
                          padding: '0.65rem 0.85rem',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          color: '#0f172a',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <strong style={{ color: '#0f172a', fontWeight: 700 }}>{p.name}</strong> 
                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>Mã: #{p.id} | Tồn: {p.stock} | Nhóm: {p.category}</div>
                      </div>
                    ))}
                  {inventory.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                      Không tìm thấy linh kiện nào
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directQtyInput">Số lượng nhập</label>
              <input
                id="directQtyInput"
                type="number"
                min="1"
                className="form-input"
                value={directQty}
                onChange={(e) => setDirectQty(e.target.value)}
                placeholder="SL..."
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directPriceInput">Đơn giá nhập (Tùy chọn)</label>
              <input
                id="directPriceInput"
                type="number"
                className="form-input"
                value={directPrice}
                onChange={(e) => setDirectPrice(e.target.value)}
                placeholder="Giá..."
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directSuppSelect">Nhà cung cấp / Đối tác giao hàng</label>
              <select
                id="directSuppSelect"
                className="form-input"
                value={directSupplier}
                onChange={(e) => setDirectSupplier(e.target.value)}
                required
              >
                <option value="">-- Chọn nhà phân phối / Đối tác --</option>
                {STANDARD_SUPPLIERS.map(supp => (
                  <option key={supp} value={supp}>{supp}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directRefInput">Mã chứng từ gốc / Số biên bản</label>
              <input
                id="directRefInput"
                type="text"
                className="form-input"
                value={directRef}
                onChange={(e) => setDirectRef(e.target.value)}
                placeholder="Ví dụ: BBKK-220626, HD-NCC..."
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directLocInput">Vị trí kệ lưu trữ</label>
              <select
                id="directLocInput"
                className="form-input"
                value={directLocation}
                onChange={(e) => setDirectLocation(e.target.value)}
              >
                <option value="">-- Chọn kệ --</option>
                {PREDEFINED_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="directNoteInput">Ghi chú chi tiết</label>
              <input
                id="directNoteInput"
                type="text"
                className="form-input"
                value={directNote}
                onChange={(e) => setDirectNote(e.target.value)}
                placeholder="Tình trạng linh kiện khi nhận..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '0.5rem', height: '42px', fontSize: '0.9rem' }}>
                <ArrowDownLeft size={18} />
                Xác Nhận Nhập Kho Trực Tiếp
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '1.25rem 1.5rem 2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          Nhà Kho & Quản Lý Tồn Hàng
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Quản lý luồng Nhập kho, Xuất kho, Ngưỡng quy tắc Min-Max và Nhật ký dịch chuyển kho kép.
        </p>
      </div>

      <ActorNotificationBar pageName="Quản Lý Kho" icon={<Database size={16} />} />

      {/* Warning & KPI Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Out of Stock Card */}
        <div className="card-glass hover-scale" style={{ borderLeft: '4px solid var(--danger)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertOctagon size={20} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Hết Hàng Cần Nhập</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: outOfStockItems.length > 0 ? '#ef4444' : '#0f172a' }}>
              {outOfStockItems.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>SP</span>
            </h3>
          </div>
        </div>

        {/* Low Stock Card */}
        <div className="card-glass hover-scale" style={{ borderLeft: '4px solid var(--warning)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingDown size={20} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Dưới Ngưỡng An Toàn</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: lowStockItems.length > 0 ? '#d97706' : '#0f172a' }}>
              {lowStockItems.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>SP</span>
            </h3>
          </div>
        </div>

        {/* Receipts Pending Card */}
        <div className="card-glass hover-scale" style={{ borderLeft: '4px solid #818cf8', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('grn')}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Phiếu Chờ Nhập Kho</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: readyReceipts.length > 0 ? '#4f46e5' : '#0f172a' }}>
              {readyReceipts.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>phiếu</span>
            </h3>
          </div>
        </div>

        {/* Value / Location Card */}
        {isManager ? (
          <div className="card-glass hover-scale" style={{ borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Tổng Giá Trị Tồn Kho</p>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', margin: '0.1rem 0 0' }}>
                {formatPrice(inventory.reduce((sum, item) => sum + (item.stock * (item.price || 0)), 0))}
              </h3>
            </div>
          </div>
        ) : (
          <div className="card-glass hover-scale" style={{ borderLeft: '4px solid var(--accent)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.15rem', borderRadius: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Vị Trí Đã Phân Kệ</p>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: 'var(--text-primary)' }}>
                {inventory.filter(item => item.location).length} / {inventory.length}
              </h3>
            </div>
          </div>
        )}
      </div>

      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
            backgroundColor: activeTab === 'inventory' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'inventory' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          📦 Sổ Kho Thực Tế & Báo Cáo Tồn Kho
        </button>
        {!isCEO && (
          <>
            <button
              onClick={() => setActiveTab('grn')}
              style={{
                padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none', transition: 'all 0.2s', position: 'relative',
                backgroundColor: activeTab === 'grn' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'grn' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              📥 Nhập Kho & Nhận Hàng
              {readyReceipts.length > 0 && (
                <span style={{ marginLeft: '0.4rem', backgroundColor: 'var(--danger)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {readyReceipts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('delivery')}
              style={{
                padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', border: 'none', transition: 'all 0.2s', position: 'relative',
                backgroundColor: activeTab === 'delivery' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'delivery' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              🚚 Xuất Kho & Bàn Giao
              {orders.filter(o => o.status === 'CONFIRMED').length > 0 && (
                <span style={{ marginLeft: '0.4rem', backgroundColor: 'var(--danger)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {orders.filter(o => o.status === 'CONFIRMED').length}
                </span>
              )}
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.5rem', fontSize: '0.875rem', borderRadius: 'var(--radius-md)' }}
        >
          📜 Lịch Sử Xuất Nhập Kho
        </button>
      </div>

      {/* Main Layout Area */}
      {activeTab === 'inventory' ? (
        isManager ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {renderInventoryTable()}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              {/* Inventory Structure report */}
              <div className="card-glass" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
                  Cơ Cấu Tồn Kho Theo Phân Nhóm
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {Object.entries(
                    inventory.reduce((acc, item) => {
                      acc[item.category] = (acc[item.category] || 0) + item.stock;
                      return acc;
                    }, {})
                  ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                    const totalStock = inventory.reduce((sum, i) => sum + i.stock, 0) || 1;
                    const percent = Math.round((count / totalStock) * 100);
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', letterSpacing: '0.03em' }}>{getCategoryNameVi(cat)}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{count.toLocaleString('vi-VN')} ({percent}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(percent, 1)}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent stock movements from backend */}
              <div className="card-glass" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  <Database size={18} style={{ color: 'var(--success)' }} />
                  Nhật Ký Xuất Nhập Kho Gần Đây
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {stockMovements.length > 0 ? (
                    stockMovements.slice(0, 10).map(mv => (
                      <div key={mv.id} style={{ fontSize: '0.75rem', padding: '0.6rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {mv.type === 'IN' ? (
                              <span style={{ color: '#34d399' }}>↓ NHẬP</span>
                            ) : (
                              <span style={{ color: '#ef4444' }}>↑ XUẤT</span>
                            )}
                            <span style={{ color: 'var(--text-primary)' }}>x{mv.quantity}</span>
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{formatDate(mv.createdAt)}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{mv.product?.name || mv.productId}</p>
                        {mv.note && <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0', fontSize: '0.7rem' }}>{mv.note}</p>}
                      </div>
                    ))
                  ) : (
                    // Fallback to ledger if no backend data
                    ledger
                      .filter(txn => txn.description.includes('Nhập kho') || txn.description.includes('mua hàng') || txn.type === 'EXPENSE')
                      .slice(0, 5)
                      .map(txn => (
                        <div key={txn.id} style={{ fontSize: '0.75rem', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.25rem' }}>
                            <span style={{ color: 'var(--danger)' }}>-{formatPrice(txn.amount)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{txn.date}</span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{txn.description}</p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          renderInventoryTable()
        )
      ) : activeTab === 'grn' ? (
        renderGRNTab()
      ) : activeTab === 'delivery' ? (
          /* TAB 3: Xuất Kho & Giao Hàng */
          <div className="card-glass" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Truck size={20} style={{ color: 'var(--success)' }} />
                  Xuất Kho & Lịch Sử Giao Hàng
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                  Xác nhận xuất kho cho các đơn hàng và xem lịch sử các đơn hàng đã xuất kho.
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm theo mã đơn, tên KH..."
                  style={{ paddingLeft: '2rem', fontSize: '0.85rem', width: '220px' }}
                  value={deliverySearch}
                  onChange={(e) => setDeliverySearch(e.target.value)}
                />
              </div>
            </div>

            {/* Interactive Summary badges & Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => setDeliveryFilter('PENDING')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  backgroundColor: deliveryFilter === 'PENDING' ? '#dcfce7' : '#f8fafc',
                  outline: deliveryFilter === 'PENDING' ? '2px solid #16a34a' : '1px solid #cbd5e1'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
                  ⏳ Chờ xuất kho: <strong>{orders.filter(o => o.status === 'CONFIRMED').length}</strong> đơn
                </span>
              </button>

              <button
                onClick={() => setDeliveryFilter('SHIPPED')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  backgroundColor: deliveryFilter === 'SHIPPED' ? '#e0e7ff' : '#f8fafc',
                  outline: deliveryFilter === 'SHIPPED' ? '2px solid #4f46e5' : '1px solid #cbd5e1'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 600 }}>
                  🚚 Đã xuất kho (Sẵn giao): <strong>{orders.filter(o => ['READY_TO_SHIP', 'SHIPPED'].includes(o.status)).length}</strong> đơn
                </span>
              </button>

              <button
                onClick={() => setDeliveryFilter('DELIVERED')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  backgroundColor: deliveryFilter === 'DELIVERED' ? '#d1fae5' : '#f8fafc',
                  outline: deliveryFilter === 'DELIVERED' ? '2px solid #059669' : '1px solid #cbd5e1'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                  ✅ Đã giao thành công: <strong>{orders.filter(o => o.status === 'DELIVERED').length}</strong> đơn
                </span>
              </button>

              <button
                onClick={() => setDeliveryFilter('ALL')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  backgroundColor: deliveryFilter === 'ALL' ? '#2563eb' : '#f8fafc',
                  color: deliveryFilter === 'ALL' ? '#ffffff' : '#475569',
                  outline: deliveryFilter === 'ALL' ? '2px solid #1d4ed8' : '1px solid #cbd5e1'
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: deliveryFilter === 'ALL' ? '#ffffff' : '#475569' }}>📋 Tất cả lịch sử</span>
              </button>
            </div>

            {/* Table of Orders */}
            <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Mã Đơn</th>
                    <th>Khách Hàng</th>
                    <th>Số Điện Thoại</th>
                    <th style={{ textAlign: 'right' }}>Giá Trị</th>
                    <th>Loại Đơn</th>
                    <th>Trạng Thái</th>
                    <th style={{ textAlign: 'center' }}>Hành Động / Lịch Sử</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredOrders = orders
                      .filter(o => {
                        if (deliveryFilter === 'PENDING') return o.status === 'CONFIRMED';
                        if (deliveryFilter === 'SHIPPED') return ['READY_TO_SHIP', 'SHIPPED'].includes(o.status);
                        if (deliveryFilter === 'DELIVERED') return o.status === 'DELIVERED';
                        if (deliveryFilter === 'ALL') return ['CONFIRMED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'].includes(o.status);
                        return true;
                      })
                      .filter(o => {
                        const term = deliverySearch.toLowerCase().trim();
                        if (!term) return true;
                        return (o.orderId || '').toLowerCase().includes(term) || (o.customerName || '').toLowerCase().includes(term);
                      });
                    
                    if (filteredOrders.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <Package size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                            {deliverySearch ? 'Không tìm thấy đơn hàng phù hợp.' : 'Không có dữ liệu trong danh mục này.'}
                          </td>
                        </tr>
                      );
                    }
                    return filteredOrders.map(ord => (
                      <tr key={ord.orderId}>
                        <td>
                          <button
                            onClick={() => setSelectedDetailOrder(ord)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontWeight: 700,
                              color: '#2563eb',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              fontSize: '0.85rem'
                            }}
                            title="Bấm để xem chi tiết đơn hàng"
                          >
                            {ord.orderId}
                          </button>
                        </td>
                        <td>{ord.customerName}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{ord.phone || 'N/A'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{formatPrice(ord.totalAmount)}</td>
                        <td><span className={`badge ${ord.type === 'POS' ? 'badge-info' : 'badge-secondary'}`}>{ord.type || 'ONLINE'}</span></td>
                        <td>
                          {ord.status === 'CONFIRMED' && <span className="badge badge-warning">Chờ xuất kho</span>}
                          {ord.status === 'READY_TO_SHIP' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className="badge badge-info" style={{ color: '#818cf8' }}>Đã xuất kho</span>
                              {ord.assignedShipperName ? (
                                <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                                  🚚 Shipper: {ord.assignedShipperName}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                                  🌐 Tự do nhặt đơn
                                </span>
                              )}
                            </div>
                          )}
                          {ord.status === 'SHIPPED' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className="badge badge-info">Đang giao</span>
                              {ord.assignedShipperName && (
                                <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                                  🚚 NV: {ord.assignedShipperName}
                                </span>
                              )}
                            </div>
                          )}
                          {ord.status === 'DELIVERED' && <span className="badge badge-success">Đã giao</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => setSelectedDetailOrder(ord)}
                              className="btn btn-secondary"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer'
                              }}
                              title="Xem chi tiết đơn hàng"
                            >
                              <Eye size={14} />
                              Xem Chi Tiết
                            </button>
                            {ord.status === 'CONFIRMED' && (
                              <button
                                onClick={() => setOrderToAssignShipper(ord)}
                                className="btn btn-primary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--success)', border: 'none', cursor: 'pointer' }}
                              >
                                <Truck size={14} />
                                Xác Nhận Xuất Kho
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          /* TAB 4: Lịch Sử Biến Động Kho (Stock Movements API Log) */
          <div className="card-glass" style={{ padding: '1.5rem', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', gap: '0.75rem', flexWrap: 'nowrap' }}>
              <div style={{ minWidth: 0, flexShrink: 1 }}>
                <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, whiteSpace: 'nowrap' }}>
                  <FileText size={20} style={{ color: '#818cf8' }} />
                  Lịch Sử Biến Động Xuất Nhập Kho
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Toàn bộ lịch sử các giao dịch nhập kho (GRN) và xuất kho hàng hóa.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0, flexWrap: 'nowrap' }}>
                {/* Custom Date Range Controls */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  backgroundColor: (historyStartDate || historyEndDate) ? '#eff6ff' : '#ffffff',
                  border: (historyStartDate || historyEndDate) ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.78rem',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ color: '#64748b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Calendar size={14} style={{ color: '#2563eb' }} />
                    Từ:
                  </span>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      padding: '0.15rem 0.3rem',
                      fontSize: '0.76rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      width: '120px'
                    }}
                  />
                  <span style={{ color: '#64748b', fontWeight: 700 }}>Đến:</span>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      padding: '0.15rem 0.3rem',
                      fontSize: '0.76rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      width: '120px'
                    }}
                  />
                  {(historyStartDate || historyEndDate) && (
                    <button
                      onClick={() => {
                        setHistoryStartDate('');
                        setHistoryEndDate('');
                      }}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#ef4444',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: '5px',
                        cursor: 'pointer',
                        padding: '0.15rem 0.4rem',
                        marginLeft: '0.1rem',
                        whiteSpace: 'nowrap'
                      }}
                      title="Xóa khoảng thời gian"
                    >
                      ✕ Xóa
                    </button>
                  )}
                </div>

                {/* Search Bar for Stock Movements */}
                <div style={{ position: 'relative', width: '200px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Tìm tên SP, mã đơn..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{ paddingLeft: '2rem', height: '32px', fontSize: '0.78rem', borderRadius: '8px' }}
                  />
                </div>

                {/* Type Filter Buttons */}
                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                  <button
                    onClick={() => setMovementTypeFilter('ALL')}
                    className={`btn ${movementTypeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setMovementTypeFilter('IN')}
                    className={`btn ${movementTypeFilter === 'IN' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', color: movementTypeFilter === 'IN' ? '#fff' : '#34d399', whiteSpace: 'nowrap' }}
                  >
                    ↓ Nhập kho (IN)
                  </button>
                  <button
                    onClick={() => setMovementTypeFilter('OUT')}
                    className={`btn ${movementTypeFilter === 'OUT' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', color: movementTypeFilter === 'OUT' ? '#fff' : '#ef4444', whiteSpace: 'nowrap' }}
                  >
                    ↑ Xuất kho (OUT)
                  </button>
                </div>
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: '550px', minHeight: '380px', overflowY: 'auto', borderRadius: '12px' }}>
              <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', whiteSpace: 'nowrap', width: '135px' }}>Thời Gian</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 0.75rem', whiteSpace: 'nowrap', width: '105px' }}>Loại</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem' }}>Linh Kiện / Sản Phẩm</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 0.75rem', whiteSpace: 'nowrap', width: '85px' }}>Số Lượng</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', whiteSpace: 'nowrap', width: '185px' }}>Mã Tham Chiếu</th>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem' }}>Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredMovements = allStockMovements.filter(mv => {
                      const matchType = movementTypeFilter === 'ALL' || mv.type === movementTypeFilter;
                      const matchDate = isDateInRange(mv.createdAt || mv.date, historyStartDate, historyEndDate);
                      const matchSearch = !historySearch.trim() ||
                        (mv.productName || '').toLowerCase().includes(historySearch.toLowerCase()) ||
                        (mv.reference || '').toLowerCase().includes(historySearch.toLowerCase()) ||
                        (mv.note || '').toLowerCase().includes(historySearch.toLowerCase());
                      return matchType && matchDate && matchSearch;
                    });

                    if (filteredMovements.length === 0) {
                      return (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <Database size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                            Chưa có lịch sử biến động kho nào ghi nhận.
                          </td>
                        </tr>
                      );
                    }

                    return filteredMovements.map(mv => {
                      const refCode = mv.reference || mv.referenceId || mv.poNumber || mv.orderId || mv.receiptNumber || 'THAO-TAC-KHO';
                      return (
                        <tr 
                          key={mv.id} 
                          className="hover-row"
                          onClick={() => handleViewMovementDetail(mv)}
                          style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                          title="Bấm để xem chi tiết đầy đủ của chứng từ/giao dịch này"
                        >
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {formatDateTime(mv.createdAt)}
                          </td>
                          <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {mv.type === 'IN' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.15)', color: '#16a34a', whiteSpace: 'nowrap', border: '1px solid rgba(22,163,74,0.3)' }}>
                                ↓ NHẬP
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700, backgroundColor: 'rgba(239,68,68,0.15)', color: '#dc2626', whiteSpace: 'nowrap', border: '1px solid rgba(220,38,38,0.3)' }}>
                                ↑ XUẤT
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span>{mv.productName || mv.product?.name || mv.productId}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: mv.type === 'IN' ? '#16a34a' : '#0f172a' }}>
                            {mv.quantity}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                background: '#eff6ff',
                                border: '1.5px solid #bfdbfe',
                                color: '#2563eb',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                fontFamily: 'monospace',
                                display: 'inline-block'
                              }}
                            >
                              {refCode}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569' }}>
                            {mv.note || 'N/A'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

      {/* ── Modal: Thêm Linh Kiện Mới ── */}
      {showAddProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '480px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Thêm Linh Kiện Mới Vĩnh Viễn</h3>
              <button onClick={() => setShowAddProduct(false)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Tên linh kiện *</label>
                <input value={newProdForm.name} onChange={e => setNewProdForm(p => ({ ...p, name: e.target.value }))} placeholder="CPU Intel Core i9-14900K..." className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Phân nhóm *</label>
                  <select value={newProdForm.category} onChange={e => setNewProdForm(p => ({ ...p, category: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }}>
                    {['CPU', 'VGA', 'MAINBOARD', 'RAM', 'STORAGE', 'PSU', 'CASE', 'COOLER', 'MONITOR', 'KEYBOARD', 'MOUSE', 'ACCESSORY'].map(c => <option key={c} value={c}>{getCategoryNameVi(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Số lượng đầu kỳ *</label>
                  <input type="number" value={newProdForm.stock} onChange={e => setNewProdForm(p => ({ ...p, stock: e.target.value }))} placeholder="10" className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Đơn giá (VNĐ) *</label>
                  <input type="number" value={newProdForm.price} onChange={e => setNewProdForm(p => ({ ...p, price: e.target.value }))} placeholder="15000000" className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Ngưỡng tối thiểu</label>
                  <input type="number" value={newProdForm.threshold} onChange={e => setNewProdForm(p => ({ ...p, threshold: e.target.value }))} placeholder="5" className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Nhà phân phối *</label>
                <select value={newProdForm.supplier} onChange={e => setNewProdForm(p => ({ ...p, supplier: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }}>
                  {STANDARD_SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Vị trí kệ</label>
                <select value={newProdForm.location} onChange={e => setNewProdForm(p => ({ ...p, location: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }}>
                  {PREDEFINED_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddProduct(false)} className="btn btn-secondary">Hủy</button>
                <button onClick={() => {
                  if (!newProdForm.name || !newProdForm.price) { alert('Vui lòng điền tên và giá linh kiện'); return; }
                  addProduct(newProdForm);
                  setShowAddProduct(false);
                  setNewProdForm({ name: '', category: 'CPU', stock: '', price: '', supplier: 'Intel Vietnam', threshold: '5', location: 'ZONE-A/SHELF-01/BIN-01' });
                  alert('✅ Đã thêm linh kiện mới vào kho thành công!');
                }} className="btn btn-primary">Thêm Linh Kiện</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Chỉnh Sửa Linh Kiện ── */}
      {editingProd && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '480px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Chỉnh Sửa Linh Kiện #{editingProd.id}</h3>
              <button onClick={() => setEditingProd(null)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Tên linh kiện *</label>
                <input value={editingProd.name} onChange={e => setEditingProd(p => ({ ...p, name: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Số lượng tồn *</label>
                  <input type="number" value={editingProd.stock} onChange={e => setEditingProd(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Ngưỡng tối thiểu</label>
                  <input type="number" value={editingProd.threshold} onChange={e => setEditingProd(p => ({ ...p, threshold: parseInt(e.target.value) || 0 }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Nhà phân phối</label>
                <input value={editingProd.supplier || ''} onChange={e => setEditingProd(p => ({ ...p, supplier: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Vị trí kệ</label>
                <input value={editingProd.location || ''} onChange={e => setEditingProd(p => ({ ...p, location: e.target.value }))} className="input-field" style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: '#475569' }}>Trạng thái kinh doanh</label>
                <select 
                  value={isItemDiscontinued(editingProd) ? 'DISCONTINUED' : 'ACTIVE'} 
                  onChange={e => {
                    const isDisc = e.target.value === 'DISCONTINUED';
                    setEditingProd(p => ({ 
                      ...p, 
                      status: isDisc ? 'DISCONTINUED' : 'ACTIVE',
                      available: !isDisc,
                      isAvailable: !isDisc 
                    }));
                  }} 
                  className="input-field" 
                  style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }}
                >
                  <option value="ACTIVE">Đang kinh doanh (Kích hoạt)</option>
                  <option value="DISCONTINUED">Ngừng kinh doanh (Tạm ngưng)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingProd(null)} className="btn btn-secondary">Hủy</button>
                <button onClick={() => {
                  updateProduct(editingProd.id, {
                    name: editingProd.name,
                    stock: editingProd.stock,
                    threshold: editingProd.threshold,
                    supplier: editingProd.supplier,
                    location: editingProd.location,
                    status: editingProd.status,
                    available: editingProd.available,
                    isAvailable: editingProd.isAvailable
                  });
                  setEditingProd(null);
                  alert('✅ Đã cập nhật thông tin linh kiện!');
                }} className="btn btn-primary">Lưu Thay Đổi</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Order Detail Modal */}
      {selectedDetailOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }} onClick={() => setSelectedDetailOrder(null)}>
          <div style={{
            width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
            padding: '1.75rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
            borderRadius: '16px', boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.3rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>
                    Chi Tiết Đơn Hàng: {selectedDetailOrder.orderId}
                  </h2>
                  <span style={{
                    fontSize: '0.725rem', padding: '2px 8px', borderRadius: '6px',
                    backgroundColor: selectedDetailOrder.type === 'POS' ? '#eff6ff' : '#f0fdf4',
                    color: selectedDetailOrder.type === 'POS' ? '#2563eb' : '#16a34a',
                    border: selectedDetailOrder.type === 'POS' ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                    fontWeight: 700
                  }}>
                    {selectedDetailOrder.type || 'ONLINE'}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Ngày tạo đơn: {selectedDetailOrder.date || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {selectedDetailOrder.status === 'CONFIRMED' && <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Chờ xuất kho</span>}
                {selectedDetailOrder.status === 'READY_TO_SHIP' && <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: '#818cf8' }}>Đã xuất kho</span>}
                {selectedDetailOrder.status === 'SHIPPED' && <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Đang giao</span>}
                {selectedDetailOrder.status === 'DELIVERED' && <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Đã giao</span>}
                {selectedDetailOrder.status === 'CANCELLED' && <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Đã hủy</span>}
                <button onClick={() => setSelectedDetailOrder(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Customer & Receiver Information */}
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <User size={14}/> Khách Hàng / Người Nhận
                </div>
                <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>{selectedDetailOrder.customerName || 'N/A'}</strong>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <Phone size={14}/> Số Điện Thoại Liên Hệ
                </div>
                <strong style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.95rem' }}>{selectedDetailOrder.phone || 'N/A'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <MapPin size={14}/> Địa Chỉ Giao Hàng & Nhận Hàng
                </div>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedDetailOrder.shippingAddress || 'Bán tại cửa hàng (POS)'}</span>
              </div>
            </div>

            {/* Product Items Table */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={16}/> Danh Sách Linh Kiện / Sản Phẩm trong Đơn ({(selectedDetailOrder.items || []).length})
              </h4>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1', fontWeight: 700 }}>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>Sản Phẩm</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', width: '70px' }}>Số Lượng</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', width: '120px' }}>Đơn Giá</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', width: '130px' }}>Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDetailOrder.items && selectedDetailOrder.items.length > 0) ? (
                      selectedDetailOrder.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#0f172a', fontWeight: 700 }}>
                            <div>{item.name || item.productName || `Linh kiện #${item.productId}`}</div>
                            {item.category && <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Danh mục: {item.category}</span>}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>x{item.quantity || 1}</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#475569' }}>{formatPrice(item.price || item.unitPrice || 0)}</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{formatPrice((item.price || item.unitPrice || 0) * (item.quantity || 1))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                          Không có thông tin chi tiết từng sản phẩm
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total and Notes Summary */}
            {(() => {
              const rawItems = selectedDetailOrder.items || [];
              const parsedItems = typeof rawItems === 'string' ? (JSON.parse(rawItems) || []) : rawItems;
              const itemsSubtotal = parsedItems.reduce((sum, item) => sum + (Number(item.price || item.unitPrice || 0) * Number(item.quantity || 1)), 0);
              const effectiveSubtotal = selectedDetailOrder.subtotal || (itemsSubtotal > 0 ? itemsSubtotal : selectedDetailOrder.totalAmount);
              const calculatedFee = selectedDetailOrder.totalAmount > effectiveSubtotal ? selectedDetailOrder.totalAmount - effectiveSubtotal : 0;
              const shippingFee = selectedDetailOrder.shippingFee !== undefined ? selectedDetailOrder.shippingFee : calculatedFee;

              return (
                <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Tạm tính linh kiện:</span>
                      <strong style={{ color: '#0f172a' }}>{formatPrice(effectiveSubtotal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Phí giao hàng / Vận chuyển:</span>
                      <strong style={{ color: shippingFee > 0 ? '#0f172a' : '#16a34a' }}>
                        {shippingFee > 0 ? `+${formatPrice(shippingFee)}` : 'MIỄN PHÍ'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #a7f3d0', paddingTop: '0.65rem', marginTop: '0.25rem' }}>
                      <span style={{ color: '#0f172a', fontWeight: 800, fontSize: '1rem' }}>Tổng Giá Trị Đơn Hàng:</span>
                      <span style={{ color: '#16a34a', fontSize: '1.35rem', fontWeight: 900 }}>{formatPrice(selectedDetailOrder.totalAmount)}</span>
                    </div>
                  </div>
                  {selectedDetailOrder.lastNote && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.775rem', color: '#be123c', fontStyle: 'italic', fontWeight: 600, borderTop: '1px dashed #bbf7d0', paddingTop: '0.5rem' }}>
                      📝 Ghi chú nhật ký: {selectedDetailOrder.lastNote}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              {selectedDetailOrder.status === 'CONFIRMED' && (
                <button
                  onClick={() => setOrderToAssignShipper(selectedDetailOrder)}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', backgroundColor: 'var(--success)', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.375rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <Truck size={16} /> Xác Nhận Xuất Kho
                </button>
              )}
              <button
                onClick={() => setSelectedDetailOrder(null)}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CHI TIẾT PHIẾU NHẬN HÀNG (Odoo-style) ================= */}
      <ReceiptDetailModal
        selectedReceipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        purchaseOrders={purchaseOrders}
        handleValidateReceipt={handleValidateReceipt}
        submitting={submitting}
        formatPrice={formatPrice}
      />

      {/* ================= MODAL CHI TIẾT BIẾN ĐỘNG KHO (Direct / Manual Log) ================= */}
      {selectedMovementLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050, padding: '1.5rem' }} onClick={() => setSelectedMovementLog(null)}>
          <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', background: selectedMovementLog.type === 'IN' ? '#dcfce7' : '#fee2e2', color: selectedMovementLog.type === 'IN' ? '#16a34a' : '#ef4444', borderRadius: '10px' }}>
                  <Database size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Chi Tiết Biến Động Xuất Nhập Kho
                </h3>
              </div>
              <button onClick={() => setSelectedMovementLog(null)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>LOẠI THAO TÁC</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: selectedMovementLog.type === 'IN' ? '#16a34a' : '#dc2626', marginTop: '3px' }}>
                    {selectedMovementLog.type === 'IN' ? '↓ NHẬP KHO (IN)' : '↑ XUẤT KHO (OUT)'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>MÃ THAM CHIẾU</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace', marginTop: '3px' }}>
                    {selectedMovementLog.reference || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>SẢN PHẨM / LINH KIỆN</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.4' }}>
                  {selectedMovementLog.productName || 'Linh kiện máy tính'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Số Lượng Dịch Chuyển:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: selectedMovementLog.type === 'IN' ? '#16a34a' : '#0f172a' }}>
                    x{selectedMovementLog.quantity || 1}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', fontSize: '0.85rem' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Thời gian ghi nhận:</span>
                  <strong style={{ color: '#0f172a' }}>{formatDateTime(selectedMovementLog.createdAt)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Ghi chú chi tiết:</span>
                  <strong style={{ color: '#334155' }}>{selectedMovementLog.note || 'Không có ghi chú'}</strong>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSelectedMovementLog(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: 700 }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ──── RFQ Alert Confirmation Modal ──── */}
      <RfqAlertModal
        rfqModalData={rfqModalData}
        setRfqModalData={setRfqModalData}
        sendSystemNotification={sendSystemNotification}
        setRfqAlertLogs={setRfqAlertLogs}
      />
      {/* ──── RFQ Alert History Modal ──── */}
      <RfqAlertHistoryModal
        show={showRfqHistoryModal}
        onClose={() => setShowRfqHistoryModal(false)}
        logs={rfqAlertLogs}
        formatDateTime={formatDateTime}
      />
      {/* ──── Shipper Assignment Modal ──── */}
      <ShipperAssignModal
        orderToAssign={orderToAssignShipper}
        onClose={() => setOrderToAssignShipper(null)}
        onConfirmAssign={handleConfirmShipperAssign}
      />
    </div>
  );
}
