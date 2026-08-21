import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Package, CheckCircle, X, AlertCircle, Truck, RotateCcw, Sparkles, RefreshCw, Box } from 'lucide-react';
import ActorNotificationBar from '../../components/ActorNotificationBar';
import PackAndScanModal from '../../components/PackAndScanModal';
import OrderDetailModal from '../../components/OrderDetailModal';

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

const safeFormatPrice = (amount) => {
  const n = parseFloat(amount) || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
};

const DEFAULT_SAMPLE_MOVEMENTS = [
  {
    id: 'MOV-2026-001',
    type: 'IN',
    reference: 'GRN-PO-2026-0801',
    productName: 'Intel Core i9-14900K',
    quantity: 15,
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    actor: 'Thủ Kho - Lê Văn C',
    note: 'Nhập kho từ đơn mua #PO-2026-0801 (Nghiệm thu QA/QC Đạt 100%)'
  },
  {
    id: 'MOV-2026-002',
    type: 'IN',
    reference: 'GRN-PO-2026-0802',
    productName: 'ASUS ROG STRIX RTX 4090 24GB',
    quantity: 10,
    timestamp: new Date(Date.now() - 3600000 * 24 * 1.5).toISOString(),
    actor: 'Thủ Kho - Lê Văn C',
    note: 'Nhập kho từ đơn mua #PO-2026-0802'
  },
  {
    id: 'MOV-2026-003',
    type: 'OUT',
    reference: 'ORD-2026-9041',
    productName: 'RAM Corsair Vengeance RGB 32GB DDR5',
    quantity: 2,
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    actor: 'Thủ Kho - Lê Văn C',
    note: 'Xuất kho giao hàng cho đơn ORD-2026-9041'
  },
  {
    id: 'MOV-2026-004',
    type: 'IN',
    reference: 'DIR-INT-2026-09',
    productName: 'SSD Samsung 990 PRO 2TB NVMe',
    quantity: 20,
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    actor: 'Thủ Kho - Lê Văn C',
    note: 'Nhập kho trực tiếp / Kiểm kê bổ sung dư hàng'
  }
];

const DEFAULT_SAMPLE_RECEIPTS = [
  {
    id: 'GRN-PO-2026-0801',
    receiptNumber: 'GRN-PO-2026-0801',
    poId: 'PO-2026-0801',
    supplierName: 'Intel Vietnam',
    status: 'READY',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    po: {
      id: 'PO-2026-0801',
      poNumber: 'PO-2026-0801',
      status: 'QA_PASSED',
      supplier: { name: 'Intel Vietnam' },
      items: [
        { productId: 101, name: 'Intel Core i9-14900K', quantity: 10, unitCost: 14500000 }
      ]
    }
  },
  {
    id: 'GRN-PO-2026-0802',
    receiptNumber: 'GRN-PO-2026-0802',
    poId: 'PO-2026-0802',
    supplierName: 'Mai Hoàng Distribution',
    status: 'READY',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    po: {
      id: 'PO-2026-0802',
      poNumber: 'PO-2026-0802',
      status: 'QA_PASSED',
      supplier: { name: 'Mai Hoàng Distribution' },
      items: [
        { productId: 102, name: 'ASUS ROG STRIX RTX 4090 24GB', quantity: 5, unitCost: 48000000 }
      ]
    }
  },
  {
    id: 'GRN-PO-2026-0800',
    receiptNumber: 'GRN-PO-2026-0800',
    poId: 'PO-2026-0800',
    supplierName: 'Vĩnh Xuân PSC',
    status: 'DONE',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    po: {
      id: 'PO-2026-0800',
      poNumber: 'PO-2026-0800',
      status: 'DONE',
      supplier: { name: 'Vĩnh Xuân PSC' },
      items: [
        { productId: 103, name: 'RAM Corsair Vengeance RGB 32GB DDR5', quantity: 20, unitCost: 3200000 }
      ]
    }
  }
];

const DEFAULT_SAMPLE_RETURNS = [
  {
    id: 'RMA-2026-001',
    rmaNumber: 'RMA-2026-001',
    orderId: 'ORD-2026-9035',
    customerName: 'Lê Văn Tuấn',
    productName: 'RAM Corsair Vengeance RGB 32GB DDR5',
    quantity: 1,
    reason: 'Lỗi khe cắm - Khách báo không nhận Bus 6000MHz',
    status: 'PENDING_INSPECTION',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    customerPhone: '0908 123 456'
  },
  {
    id: 'RMA-2026-002',
    rmaNumber: 'RMA-2026-002',
    orderId: 'ORD-2026-8942',
    customerName: 'Nguyễn Hoàng Nam',
    productName: 'ASUS ROG STRIX RTX 4090 24GB',
    quantity: 1,
    reason: 'Quạt tản nhiệt có tiếng rít bất thường khi Full Load',
    status: 'INSPECTED_SCRAP',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    customerPhone: '0912 987 654'
  },
  {
    id: 'RMA-2026-003',
    rmaNumber: 'RMA-2026-003',
    orderId: 'ORD-2026-8810',
    customerName: 'Phạm Minh Trí',
    productName: 'Nguồn Corsair RM1000x 1000W 80 Plus Gold',
    quantity: 1,
    reason: 'Đổi trả do khách đặt nhầm công suất hệ thống',
    status: 'RESTOCKED',
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    customerPhone: '0988 555 222'
  }
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

// ──── Sub-Component: Stock Movement Detail Modal ────
function MovementDetailModal({ movement, onClose, formatDateTime }) {
  if (!movement) return null;

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
        borderRadius: '12px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        border: '1px solid #cbd5e1',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Chi Tiết Nhật Ký Điều Chuyển Kho
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Mã chứng từ: <strong style={{ color: '#2563eb' }}>{movement.reference}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#475569' }}
          >
            Đóng
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', fontSize: '0.85rem', color: '#334155' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>Mã Giao Dịch</span>
              <strong style={{ color: '#0f172a' }}>{movement.id}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>Loại Điều Chuyển</span>
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800,
                backgroundColor: movement.type === 'IN' ? '#dcfce7' : '#ffe4e6',
                color: movement.type === 'IN' ? '#15803d' : '#e11d48'
              }}>
                {movement.type === 'IN' ? 'NHẬP KHO (IN)' : 'XUẤT KHO (OUT)'}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>Sản Phẩm</span>
              <strong style={{ color: '#0f172a' }}>{movement.productName}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>Số Lượng Biến Động</span>
              <strong style={{ color: movement.type === 'IN' ? '#16a34a' : '#e11d48', fontSize: '1rem' }}>
                {movement.type === 'IN' ? `+${movement.quantity}` : `-${movement.quantity}`} sản phẩm
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>Thời Gian Thực Hiện</span>
              <span style={{ fontWeight: 600 }}>
                {formatDateTime ? formatDateTime(movement.timestamp) : new Date(movement.timestamp).toLocaleString('vi-VN')}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>Người Thực Hiện</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{movement.actor || 'Thủ Kho'}</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', marginBottom: '0.2rem' }}>Ghi Chú Chi Tiết</span>
            <div style={{ color: '#0f172a', fontWeight: 500 }}>{movement.note || 'Không có ghi chú thêm.'}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.45rem 1.15rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

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
        borderRadius: '12px',
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        border: '1px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Lịch Sử Gửi Cảnh Báo YCBG (RFQ)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Nhật ký gửi cảnh báo tồn kho tới Bộ Phận Mua Hàng & Ban Giám Đốc
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px',
              padding: '0.3rem 0.6rem', fontSize: '0.85rem', cursor: 'pointer', color: '#475569'
            }}
          >
            Đóng
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Tìm theo tên linh kiện, nhà cung cấp, lý do cảnh báo..."
            style={{
              width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.82rem',
              backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a'
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
                  <th style={{ padding: '0.6rem 0.5rem', width: '18%' }}>Thời Gian</th>
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
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
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
              padding: '0.45rem 1.15rem', fontSize: '0.82rem', fontWeight: 700,
              color: '#475569', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
              borderRadius: '6px', cursor: 'pointer'
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
        borderRadius: '12px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        border: '1px solid #cbd5e1',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Phân Công Shipper & Xuất Kho
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Đơn hàng: <strong style={{ color: '#0f172a' }}>#{orderToAssign.orderId || orderToAssign.id}</strong> ({orderToAssign.customerName || 'Khách hàng'})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px',
              padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#475569'
            }}
          >
            Đóng
          </button>
        </div>

        {/* Content Options */}
        <div style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.83rem', color: '#475569', marginBottom: '1rem' }}>
            Chọn hình thức điều phối nhân viên giao hàng trực thuộc:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1rem', borderRadius: '8px',
              border: selectedShipperOption === '1' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: selectedShipperOption === '1' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="shipperOpt"
                value="1"
                checked={selectedShipperOption === '1'}
                onChange={(e) => setSelectedShipperOption(e.target.value)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a' }}>
                  Shipper 1 — Trần Giao Hàng
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nhân viên giao hàng chính (Khu vực Nhanh)</span>
              </div>
            </label>

            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1rem', borderRadius: '8px',
              border: selectedShipperOption === '2' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: selectedShipperOption === '2' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="shipperOpt"
                value="2"
                checked={selectedShipperOption === '2'}
                onChange={(e) => setSelectedShipperOption(e.target.value)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a' }}>
                  Shipper 2 — Nguyễn Văn Shipper
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nhân viên giao hàng nội bộ (Ca trực sẵn sàng)</span>
              </div>
            </label>

            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1rem', borderRadius: '8px',
              border: selectedShipperOption === '3' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: selectedShipperOption === '3' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="shipperOpt"
                value="3"
                checked={selectedShipperOption === '3'}
                onChange={(e) => setSelectedShipperOption(e.target.value)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a' }}>
                  Giao Hàng Tự Do (Chờ Shipper tự nhận đơn)
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
              padding: '0.5rem 1.15rem', fontSize: '0.82rem', fontWeight: 600,
              color: '#475569', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
              borderRadius: '6px', cursor: 'pointer'
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700,
              color: '#ffffff', backgroundColor: '#2563eb', border: 'none',
              borderRadius: '6px', cursor: 'pointer'
            }}
          >
            Xác Nhận Xuất Kho & Phân Công
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
        title: `Cảnh Báo Kho: ${item.name}`,
        message: `Kho báo linh kiện ${item.name} hiện còn ${item.stock} cái (Ngưỡng: ${item.threshold || 5}). Đề xuất mua ${finalQty} cái. Lý do: ${reason}`,
        link: '/admin/purchasing',
        navState: { createRFQ: true, product: item, quantity: finalQty, reason: reason },
        type: 'RFQ_ALERT',
        itemData: { ...item, requestedQty: finalQty, alertReason: reason }
      });
    }

    setRfqModalData(null);

    alert(
      `GỬI CẢNH BÁO RFQ THÀNH CÔNG!\n\n` +
      `• Linh kiện: ${item.name}\n` +
      `• Số lượng đề xuất mua: ${finalQty} sản phẩm\n` +
      `• Ghi chú / Lý do: ${reason}\n` +
      `• Đơn vị tiếp nhận: Bộ phận Mua Hàng & Ban Giám Đốc\n\n` +
      `Cảnh báo Yêu cầu Báo giá đã được ghi nhận trực tiếp vào Lịch sử và Quả chuông Thông báo Hệ thống!`
    );
  };

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
        borderRadius: '12px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        border: '1px solid #cbd5e1',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Xác Nhận Gửi Cảnh Báo RFQ
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Khởi tạo đề xuất mua sắm cho Bộ Phận Mua Hàng
            </p>
          </div>
          <button
            onClick={() => setRfqModalData(null)}
            style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
          >
            Đóng
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', marginBottom: '0.5rem' }}>{item.name}</strong>
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
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                backgroundColor: Number(item.stock) === 0 ? '#ffe4e6' : '#fef3c7',
                color: Number(item.stock) === 0 ? '#e11d48' : '#d97706'
              }}>
                {Number(item.stock) === 0 ? 'Hết hàng (0 SP)' : `Cảnh báo tồn (${item.stock} SP)`}
              </span>
            </div>
          </div>

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
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
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
                  borderRadius: '6px',
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
          justify: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            type="button"
            onClick={() => setRfqModalData(null)}
            style={{
              padding: '0.5rem 1.15rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#ffffff',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Xác Nhận Gửi Cảnh Báo RFQ
          </button>
        </div>
      </div>
    </div>
  );
}

// ──── Sub-Component: Receipt Detail Modal ────
function ReceiptDetailModal({ selectedReceipt, onClose, purchaseOrders = [], handleValidateReceipt, submitting, formatPrice }) {
  if (!selectedReceipt) return null;

  const safeFormatPrice = (val) => formatPrice ? formatPrice(val) : (val || 0).toLocaleString('vi-VN') + ' VNĐ';

  const effectivePo = (selectedReceipt.po && typeof selectedReceipt.po === 'object' && selectedReceipt.po.items?.length > 0)
    ? selectedReceipt.po
    : ((purchaseOrders || []).find(p => 
        p && (p.id === selectedReceipt.poId || 
        p.poNumber === selectedReceipt.poId || 
        p.poNumber === selectedReceipt.receiptNumber?.replace('GRN-', '') ||
        (selectedReceipt.receiptNumber && selectedReceipt.receiptNumber.includes(p.poNumber)))
      ) || selectedReceipt.po || {});

  let qaLog = null;
  try {
    const qaLogs = JSON.parse(localStorage.getItem('erp_qa_inspection_logs') || '[]');
    const poNum = effectivePo?.poNumber || selectedReceipt.poId || selectedReceipt.receiptNumber?.replace('GRN-', '');
    qaLog = qaLogs.find(l => l.poNumber === poNum || (effectivePo && String(l.poNumber) === String(effectivePo.id)));
  } catch (e) {}

  const poStatus = qaLog?.status || effectivePo?.status || selectedReceipt.poStatus || 'QA_PASSED';
  const isQaPassed = poStatus === 'QA_PASSED' || selectedReceipt.status === 'READY' || selectedReceipt.status === 'DONE';
  const isQaPartial = poStatus === 'QA_PARTIAL';
  const canValidate = isQaPassed || isQaPartial;

  const rawItemsList = (effectivePo && effectivePo.items?.length > 0)
    ? effectivePo.items
    : (selectedReceipt.items?.length > 0
        ? selectedReceipt.items
        : [{ name: 'Intel Core i9-14900K (Linh kiện mẫu)', quantity: 10, unitCost: 14500000 }]);

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

  const poNumberDisplay = effectivePo?.poNumber || selectedReceipt.poId || selectedReceipt.receiptNumber?.replace('GRN-', '') || 'Chưa có';
  const supplierDisplay = effectivePo?.supplier?.name || effectivePo?.supplierName || effectivePo?.supplierCode || selectedReceipt.supplierName || 'Chưa rõ';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '1.5rem' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '950px', maxHeight: '92vh', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 20px 40px rgba(15,23,42,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Toolbar Header */}
        <div style={{ borderBottom: '2px solid #2563eb', background: '#f8fafc', padding: '1.25rem 1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {selectedReceipt.status === 'READY' && (
                <button
                  onClick={() => handleValidateReceipt(selectedReceipt, poStatus)}
                  disabled={submitting || !canValidate}
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.88rem', backgroundColor: canValidate ? '#2563eb' : '#94a3b8', color: '#ffffff', border: 'none', cursor: canValidate ? 'pointer' : 'not-allowed' }}
                >
                  Xác Nhận Nhập Kho {qaLog ? `(${qaLog.passedQty} SP)` : ''}
                </button>
              )}
              {selectedReceipt.status === 'DONE' && (
                <span style={{
                  padding: '0.5rem 1.1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800,
                  backgroundColor: '#dcfce7', color: '#15803d', border: '1.5px solid #bbf7d0'
                }}>
                  Đã Nhập Kho Thành Công
                </span>
              )}
            </div>

            <button 
              onClick={onClose} 
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', padding: '0.3rem 0.8rem', borderRadius: '4px', fontWeight: 600 }} 
            >
              Đóng
            </button>
          </div>

          {/* Stepper */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.3rem',
            backgroundColor: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0'
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

              let activeBg = '#2563eb';
              if (step.key === 'DONE') activeBg = '#16a34a';

              return (
                <React.Fragment key={step.key}>
                  <div style={{
                    padding: '0.4rem 0.55rem',
                    fontSize: '0.73rem', fontWeight: isActive ? 800 : (isPassed ? 700 : 500),
                    background: isActive ? activeBg : (isPassed ? '#f1f5f9' : '#ffffff'),
                    color: isActive ? '#ffffff' : (isPassed ? '#334155' : '#94a3b8'),
                    borderRadius: '4px',
                    border: isActive ? `1.5px solid ${activeBg}` : '1px solid #e2e8f0',
                    whiteSpace: 'nowrap', flex: '1', textAlign: 'center'
                  }}>
                    {step.label}
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{ height: '2px', flex: '0.3', background: isPassed ? '#cbd5e1' : '#e2e8f0' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>MÃ PHIẾU NHẬP KHO THỰC TẾ</div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 900, margin: '0.2rem 0 0 0', color: '#0f172a' }}>
                {selectedReceipt.receiptNumber}
              </h2>
              <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#64748b' }}>
                Mã đơn mua hàng liên kết: <strong style={{ color: '#2563eb' }}>{poNumberDisplay}</strong>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1rem', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>Danh Sách Linh Kiện Nhập Kho</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.5rem' }}>Tên Sản Phẩm</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Số Lượng Đặt</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Số Lượng Nhập Thực Tế</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Đơn Giá</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {itemsList.map((item, idx) => {
                  const uCost = parseFloat(item.unitCost || item.unitPrice || item.price || 0);
                  const qty = parseInt(item.quantity) || 1;
                  const tCost = (uCost * qty) || 0;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>{item.name || item.productName || item.product?.name}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#64748b' }}>{item.originalQty || qty}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>{qty}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: '#475569' }}>{safeFormatPrice(uCost)}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{safeFormatPrice(tCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Nhà Cung Cấp: </span>
            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{supplierDisplay}</strong>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2563eb' }}>
            Tổng Tiền Trị Giá: {safeFormatPrice(totalAmount)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──── MAIN WAREHOUSE COMPONENT ────
export default function Warehouse() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const setActiveTab = (t) => {
    setSearchParams({ tab: t });
  };

  const { user, isCEO, isWarehouseManager } = useAuth();
  const {
    inventory = [], setInventory, updateProduct,
    products = [],
    orders = [], setOrders,
    purchaseOrders = [], setPurchaseOrders,
    returnRequests = [], setReturnRequests,
    updateOrderStatus,
    formatDateTime, sendSystemNotification
  } = useERP();
  const { addNotification } = useNotification();

  // receipts & stockMovements quản lý local (không có trong ERPContext)
  const [receipts, setReceipts] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_receipts') || '[]'); } catch { return []; }
  });
  const [stockMovements, setStockMovements] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_stock_movements') || '[]'); } catch { return []; }
  });

  const isManager = isCEO || isWarehouseManager;

  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Pack & Scan Modal
  const [packScanOrder, setPackScanOrder] = useState(null);

  // Shipper Assign Modal
  const [orderToAssign, setOrderToAssign] = useState(null);

  // RFQ Alert Logs
  const [rfqAlertLogs, setRfqAlertLogs] = useState([]);
  const [showRfqHistoryModal, setShowRfqHistoryModal] = useState(false);

  // Return Request Processing Modal
  const [selectedReturnProcessing, setSelectedReturnProcessing] = useState(null);
  const [returnShelfLocation, setReturnShelfLocation] = useState('SHELF_A1_RESTOCK');
  const [returnProcessNote, setReturnProcessNote] = useState('');

  // Stock Movement Details Modal
  const [selectedMovementLog, setSelectedMovementLog] = useState(null);

  // Filter States
  const [receiptStatusFilter, setReceiptStatusFilter] = useState('ALL');
  const [receiptSearch, setReceiptSearch] = useState('');
  const [grnStartDate, setGrnStartDate] = useState('');
  const [grnEndDate, setGrnEndDate] = useState('');

  // Inventory Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLocationStatus, setSelectedLocationStatus] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');

  // Delivery Filter States
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('PENDING');

  // History Filter States
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Direct Intake Form States
  const [directProduct, setDirectProduct] = useState('');
  const [directQty, setDirectQty] = useState('');
  const [directSupplier, setDirectSupplier] = useState('Intel Vietnam');
  const [directPrice, setDirectPrice] = useState('');
  const [directReason, setDirectReason] = useState('DIRECT_PURCHASE');
  const [directRef, setDirectRef] = useState('');
  const [directLocation, setDirectLocation] = useState('ZONE-A/SHELF-01/BIN-01');
  const [directNote, setDirectNote] = useState('');

  // Add Product Modal
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdForm, setNewProdForm] = useState({ name: '', category: 'CPU', stock: '', price: '', supplier: 'Intel Vietnam', threshold: '5', location: 'ZONE-A/SHELF-01/BIN-01' });

  // Edit Product Modal
  const [editingProd, setEditingProd] = useState(null);

  // RFQ Modal State
  const [rfqModalData, setRfqModalData] = useState(null);

  // Backorders & Order Detail Modal State
  const [backorderSearch, setBackorderSearch] = useState('');
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);

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
          const productName = itemData.name || (n.title ? n.title.replace('Cảnh Báo Kho: ', '') : 'Linh kiện cảnh báo');
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

  // Ensure default sample movements if stockMovements is empty
  const effectiveStockMovements = stockMovements && stockMovements.length > 0
    ? stockMovements
    : DEFAULT_SAMPLE_MOVEMENTS;

  // Sync receipts & PO status
  const fetchReceipts = async (silent = false) => {
    if (!silent && receipts.length === 0) {
      setReceiptsLoading(true);
    }
    // Reset legacy cached inventory once to load newly reallocated stock dataset (v10)
    if (!localStorage.getItem('erp_inv_v10_synced')) {
      localStorage.removeItem('erp_inventory');
      localStorage.removeItem('erp_inv_v7_synced');
      localStorage.removeItem('erp_inv_v8_synced');
      localStorage.removeItem('erp_inv_v9_synced');
      localStorage.setItem('erp_inv_v10_synced', 'true');
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
        if (movementsRes?.success && movementsRes.data?.length > 0) setStockMovements(movementsRes.data);
      } catch (e) {
        console.warn('API fallback:', e);
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

          if (!combinedReceipts.some(r => r.po?.poNumber === poNumber || r.receiptNumber === `GRN-${poNumber}` || r.id === `GRN-${poNumber}`)) {
            const isCompleted = po.warehouseStatus === 'RECEIVED' || po.status === 'DONE' || po.status === 'COMPLETED';
            combinedReceipts.push({
              id: `GRN-${poNumber}`,
              receiptNumber: `GRN-${poNumber}`,
              status: isCompleted ? 'DONE' : 'READY',
              poId: po.id,
              poNumber: poNumber,
              po: {
                ...po,
                status: effectiveStatus
              },
              warehouse: { name: 'Kho Tổng' },
              createdAt: po.createdAt || new Date().toISOString()
            });
          }
        });

      setReceipts(combinedReceipts);
    } catch (err) {
      setReceiptsError('Không thể tải phiếu nhập kho');
    } finally {
      setReceiptsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  // Validate receipt intake
  const handleValidateReceipt = async (receipt, currentPoStatus) => {
    const poNum = receipt.po?.poNumber || receipt.poId || receipt.receiptNumber?.replace('GRN-', '');
    let qaLog = null;
    try {
      const qaLogs = JSON.parse(localStorage.getItem('erp_qa_inspection_logs') || '[]');
      qaLog = qaLogs.find(l => l.poNumber === poNum || String(l.poNumber) === String(receipt.poId));
    } catch (e) {}

    const effectiveStatus = qaLog?.status || currentPoStatus || receipt.po?.status;

    if (!['QA_PASSED', 'QA_PARTIAL'].includes(effectiveStatus) && receipt.status !== 'READY') {
      alert(`Lô hàng #${poNum} chưa hoàn tất nghiệm thu QA/QC! Vui lòng chờ bộ phận QA kiểm định chất lượng.`);
      return;
    }

    setSubmitting(true);
    try {
      let resultSuccess = false;
      try {
        const res = await api.post(`/warehouse/receipts/${receipt.id}/validate`, {
          warehouseId: receipt.warehouseId || 1
        });
        if (res?.success) resultSuccess = true;
      } catch (e) {
        console.warn('API error, using local fallback:', e);
      }

      const targetItems = receipt.po?.items || receipt.items || [];
      const updatedInventory = [...inventory];
      const newMovements = [...effectiveStockMovements];

      targetItems.forEach(item => {
        let intakeQty = parseInt(item.quantity || item.qty) || 1;
        if (qaLog && qaLog.passedQty !== undefined) {
          if (targetItems.length === 1) intakeQty = Number(qaLog.passedQty);
          else intakeQty = Math.round(intakeQty * (Number(qaLog.passedQty) / (Number(qaLog.totalQty) || 1)));
        }

        const invIdx = updatedInventory.findIndex(inv => inv.id === item.productId || inv.name === item.name || inv.name === item.productName);
        if (invIdx !== -1) {
          updatedInventory[invIdx].stock += intakeQty;
        } else {
          updatedInventory.push({
            id: item.productId || Date.now(),
            name: item.name || item.productName || 'Sản phẩm mới',
            category: item.category || 'STORAGE',
            stock: intakeQty,
            price: item.unitCost || item.unitPrice || 1000000,
            supplier: receipt.po?.supplier?.name || 'Nhà cung cấp',
            threshold: 5,
            location: 'ZONE-A/SHELF-01/BIN-01'
          });
        }

        newMovements.unshift({
          id: 'MOV-' + Date.now() + '-' + Math.floor(Math.random()*1000),
          type: 'IN',
          reference: receipt.receiptNumber || `GRN-${poNum}`,
          productName: item.name || item.productName || 'Sản phẩm',
          quantity: intakeQty,
          timestamp: new Date().toISOString(),
          actor: user?.fullname || 'Thủ Kho',
          note: `Nhập kho từ đơn mua #${poNum} (QA: ${effectiveStatus})`
        });
      });

      setInventory(updatedInventory);
      setStockMovements(newMovements);

      const updatedReceipts = receipts.map(r => r.id === receipt.id ? { ...r, status: 'DONE' } : r);
      setReceipts(updatedReceipts);

      const updatedPOs = purchaseOrders.map(p => (p.poNumber === poNum || String(p.id) === String(receipt.poId)) ? { ...p, warehouseStatus: 'RECEIVED', status: 'DONE' } : p);
      setPurchaseOrders(updatedPOs);
      try { localStorage.setItem('erp_pos', JSON.stringify(updatedPOs)); } catch (_) {}

      addNotification({
        type: 'success',
        title: 'Nhập kho thành công!',
        message: `Đã xác nhận nhập kho phiếu ${receipt.receiptNumber} (${poNum}).`
      });

      setSelectedReceipt(null);
    } catch (err) {
      alert('Không thể xác nhận nhập kho!');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Open Backorder RFQ Proposal Modal
  const handleOpenBackorderRfqModal = (order, missingItem) => {
    if (!order) return;
    const targetItem = missingItem || (order.items && order.items[0]) || { name: 'Linh kiện máy tính', quantity: 1 };
    const pName = targetItem.name || targetItem.productName || 'Linh kiện máy tính';
    const pId = String(targetItem.productId || targetItem.id || Date.now());
    const neededQty = Number(targetItem.neededQty || targetItem.quantity || 1);
    const matchInv = (inventory || []).find(inv => String(inv.id) === pId || (inv.name && inv.name.toLowerCase() === pName.toLowerCase()));
    const currentStock = matchInv ? Number(matchInv.stock) : 0;
    const suppName = matchInv?.supplier || (pName.toLowerCase().includes('asus') ? 'ASUS Vietnam' : pName.toLowerCase().includes('msi') ? 'MSI Vietnam' : pName.toLowerCase().includes('samsung') ? 'Samsung Vina' : pName.toLowerCase().includes('intel') ? 'Intel Vietnam' : 'Mai Hoàng Distribution');
    const estUnitPrice = matchInv?.price ? Math.round(Number(matchInv.price) * 0.8) : (targetItem.unitPrice || targetItem.price ? Math.round(Number(targetItem.unitPrice || targetItem.price) * 0.8) : 1500000);

    setRfqModalData({
      order,
      orderId: order.orderId || order.id || 'N/A',
      customerName: order.customerName || 'Khách hàng',
      productId: pId,
      productName: pName,
      neededQty,
      currentStock,
      suggestedQty: Math.max(neededQty * 2, 5),
      supplier: suppName,
      unitPrice: estUnitPrice,
      reason: `Nợ khách hàng đơn #${order.orderId || order.id || 'N/A'} (${order.customerName || 'Khách hàng'}) - Khách cần ${neededQty} SP`
    });
  };

  // Handle Confirm and Send RFQ to Purchasing
  const handleConfirmSendBackorderRfq = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!rfqModalData) return;

    const { order, orderId, productId, productName, suggestedQty, supplier, unitPrice, reason, neededQty } = rfqModalData;
    const finalQty = Number(suggestedQty) || 5;
    const totalAmount = finalQty * Number(unitPrice || 1500000);
    const poNumber = `RFQ-BO-${Date.now().toString().slice(-6)}`;
    const suppCode = supplier.includes('Samsung') ? 's1' : supplier.includes('Mai Hoàng') ? 's2' : supplier.includes('Intel') ? 's3' : supplier.includes('ASUS') ? 's4' : 's5';

    const newPO = {
      id: poNumber,
      poNumber: poNumber,
      supplierCode: suppCode,
      supplier: { code: suppCode, name: supplier },
      supplierName: supplier,
      createdBy: user?.fullname || user?.email || 'Thủ Kho (Warehouse)',
      orderDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      totalAmount: totalAmount,
      status: 'RFQ_SENT',
      type: 'BACKORDER_RFQ',
      relatedOrderId: orderId,
      items: [
        {
          productId,
          productName,
          name: productName,
          quantity: finalQty,
          unitCost: unitPrice,
          totalCost: totalAmount
        }
      ],
      supplierNote: `[ĐỀ XUẤT TỪ KHO - NỢ KHÁCH #${orderId}]: Khách hàng ${order.customerName || 'đặt mua'} đang chờ linh kiện "${productName}". Yêu cầu phòng Mua Hàng gửi RFQ mua gấp tối thiểu ${neededQty || 1} SP (Đề xuất đặt ${finalQty} SP để bổ sung tồn kho).`
    };

    // 1. Save to state & localStorage for POs
    const updatedPOs = [newPO, ...(purchaseOrders || [])];
    setPurchaseOrders(updatedPOs);
    try {
      const curLocalPos = JSON.parse(localStorage.getItem('erp_pos') || '[]');
      localStorage.setItem('erp_pos', JSON.stringify([newPO, ...curLocalPos.filter(p => p.id !== poNumber)]));
    } catch (_) {}

    // 2. Save RFQ Alert Log
    const newLog = {
      id: 'RFQ-ALT-' + Date.now(),
      sentAt: new Date().toISOString(),
      sender: 'Thủ kho (Warehouse)',
      productId,
      productName,
      category: 'COMP',
      supplier,
      currentStock: rfqModalData.currentStock,
      threshold: 5,
      requestedQty: finalQty,
      reason
    };
    try {
      const existingLogs = JSON.parse(localStorage.getItem('erp_rfq_alert_logs') || '[]');
      localStorage.setItem('erp_rfq_alert_logs', JSON.stringify([newLog, ...existingLogs]));
      if (setRfqAlertLogs) setRfqAlertLogs([newLog, ...existingLogs]);
    } catch (_) {}

    // 3. Send system notification to Purchasing & Admin
    if (typeof sendSystemNotification === 'function') {
      sendSystemNotification({
        targetRoles: ['PURCHASING', 'CEO', 'ADMIN'],
        title: `[ĐỀ XUẤT MUA HÀNG KHẨN] ${productName}`,
        message: `Thủ kho vừa tạo đề xuất mua hàng ${poNumber} cho linh kiện "${productName}" (${finalQty} cái). Đơn nợ khách #${orderId}.`,
        link: '/admin/purchasing',
        type: 'RFQ_ALERT',
        itemData: newPO
      });
    }

    if (typeof addNotification === 'function') {
      addNotification({
        type: 'success',
        title: 'Đã gửi Đề Xuất Mua Hàng (RFQ)!',
        message: `Mã phiếu: ${poNumber}. Đã chuyển yêu cầu mua ${finalQty} cái "${productName}" sang bộ phận Mua Hàng.`
      });
    }

    setRfqModalData(null);
    navigate('/admin/purchasing?tab=orders');
  };

  // Handle Fulfill Backorder
  const handleFulfillBackorder = (order) => {
    const updatedOrders = orders.map(o => {
      if (o.id === order.id || o.orderId === order.orderId) {
        return {
          ...o,
          status: 'CONFIRMED',
          note: `Đã đủ tồn kho linh kiện, sẵn sàng đóng gói xuất kho.`
        };
      }
      return o;
    });

    setOrders(updatedOrders);
    try {
      localStorage.setItem('erp_orders', JSON.stringify(updatedOrders));
    } catch (_) {}

    if (typeof addNotification === 'function') {
      addNotification({
        type: 'success',
        title: 'Đã xác nhận xuất kho!',
        message: `Đơn hàng #${order.orderId || order.id} đã chuyển sang trạng thái Sẵn Sàng Đóng Gói (CONFIRMED).`
      });
    }

    alert(`Đã xác nhận đơn hàng #${order.orderId || order.id} đủ điều kiện xuất kho! Đơn đã được chuyển sang danh sách Đóng gói & Giao hàng.`);
  };

  // Shipper assignment
  const handleConfirmAssign = (order, shipperUser) => {
    const updatedOrders = orders.map(o => {
      if (o.id === order.id || o.orderId === order.orderId) {
        return {
          ...o,
          status: 'SHIPPED',
          deliveryStatus: 'SHIPPED',
          assignedShipper: shipperUser ? shipperUser.fullname : 'Giao Hàng Tự Do',
          assignedShipperId: shipperUser ? shipperUser.id : null,
          shippedAt: new Date().toISOString()
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    try { localStorage.setItem('erp_orders', JSON.stringify(updatedOrders)); } catch (_) {}

    addNotification({
      type: 'success',
      title: 'Đã xuất kho & bàn giao!',
      message: `Đơn hàng #${order.orderId || order.id} đã chuyển trạng thái Đang Giao Hàng.`
    });

    setOrderToAssign(null);
  };

  // Pack & scan complete - called when user confirms packing
  const handlePackAndScanComplete = (order) => {
    setOrderToAssign(order);
  };

  // Called from PackAndScanModal when user clicks Xác Nhận Đóng Gói
  const handleConfirmPack = (packedOrder, serials) => {
    try {
      const ordId = String(packedOrder.orderId || packedOrder.id || '');

      // Dùng updateOrderStatus từ ERPContext — đúng cách, không crash
      if (typeof updateOrderStatus === 'function') {
        updateOrderStatus(ordId, 'READY_TO_SHIP', 'Kho đã hoàn tất đóng gói và kiểm tra Serial.', {
          packedSerials: serials || [],
          packedAt: new Date().toISOString()
        });
      } else {
        // Fallback: cập nhật localStorage trực tiếp
        const stored = JSON.parse(localStorage.getItem('erp_orders') || '[]');
        const updated = stored.map(o => {
          if (String(o.orderId || o.id) === ordId) {
            return { ...o, status: 'READY_TO_SHIP', packedSerials: serials || [], packedAt: new Date().toISOString() };
          }
          return o;
        });
        localStorage.setItem('erp_orders', JSON.stringify(updated));
      }

      if (typeof addNotification === 'function') {
        addNotification(`Đã hoàn tất đóng gói! Đơn hàng #${ordId} đã sẵn sàng phân công Shipper.`, 'success');
      }
    } catch (err) {
      console.error('handleConfirmPack error:', err);
    }

    // Đóng pack modal và mở shipper modal trong cùng render cycle
    setPackScanOrder(null);
    setOrderToAssign(packedOrder);
  };

  // Add Product Submit
  const handleAddProductSubmit = (e) => {
    e.preventDefault();
    if (!newProdForm.name.trim() || !newProdForm.stock) {
      alert('Vui lòng nhập tên sản phẩm và số lượng tồn kho!');
      return;
    }

    const newProd = {
      id: Date.now(),
      name: newProdForm.name.trim(),
      category: newProdForm.category,
      stock: parseInt(newProdForm.stock, 10) || 0,
      price: parseFloat(newProdForm.price) || 0,
      supplier: newProdForm.supplier,
      threshold: parseInt(newProdForm.threshold, 10) || 5,
      location: newProdForm.location || 'ZONE-A/SHELF-01/BIN-01',
      specs: {},
      createdAt: new Date().toISOString()
    };

    const updated = [newProd, ...(inventory || [])];
    setInventory(updated);
    try {
      localStorage.setItem('erp_inventory', JSON.stringify(updated));
    } catch (_) {}

    setShowAddProduct(false);
    setNewProdForm({ name: '', category: 'CPU', stock: '', price: '', supplier: 'Intel Vietnam', threshold: '5', location: 'ZONE-A/SHELF-01/BIN-01' });
    alert(`Đã thêm sản phẩm ${newProd.name} vào sổ kho thành công!`);
  };

  // Edit Product Submit
  const handleEditProductSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingProd) return;

    const targetId = editingProd.id;
    const fieldsToUpdate = {
      name: editingProd.name,
      category: editingProd.category,
      supplier: editingProd.supplier,
      location: editingProd.location,
      stock: editingProd.stock !== undefined ? (parseInt(editingProd.stock, 10) || 0) : 0,
      price: editingProd.price !== undefined ? (parseFloat(editingProd.price) || 0) : 0,
      threshold: editingProd.threshold !== undefined ? (parseInt(editingProd.threshold, 10) || 5) : 5
    };

    if (updateProduct) {
      updateProduct(targetId, fieldsToUpdate);
    } else if (setInventory) {
      setInventory(prev => (prev || []).map(p => String(p.id) === String(targetId) ? { ...p, ...fieldsToUpdate } : p));
    }

    const savedId = editingProd.id;
    setEditingProd(null);
    alert(`Đã cập nhật thành công thông tin sản phẩm #${savedId}!`);
  };

  // Direct Intake Submit
  const handleDirectIntakeSubmit = (e) => {
    e.preventDefault();
    const qtyNum = parseInt(directQty, 10);
    if (!directProduct || isNaN(qtyNum) || qtyNum <= 0) {
      alert('Vui lòng chọn sản phẩm và nhập số lượng nhập kho hợp lệ (lớn hơn 0)!');
      return;
    }

    const selectedInv = inventory.find(i => String(i.id) === String(directProduct) || i.name === directProduct);
    const prodName = selectedInv ? selectedInv.name : directProduct;
    const refCode = directRef.trim() || ('DIR-' + Date.now().toString().slice(-6));

    const updatedInventory = inventory.map(item => {
      if (String(item.id) === String(directProduct) || item.name === directProduct) {
        return {
          ...item,
          stock: item.stock + qtyNum,
          location: directLocation || item.location,
          supplier: directSupplier || item.supplier
        };
      }
      return item;
    });

    setInventory(updatedInventory);

    const newMov = {
      id: 'MOV-' + Date.now(),
      type: 'IN',
      reference: refCode,
      productName: prodName,
      quantity: qtyNum,
      timestamp: new Date().toISOString(),
      actor: user?.fullname || 'Thủ Kho',
      note: `Nhập trực tiếp / Kiểm kê (${directReason}). Ghi chú: ${directNote || 'N/A'}`
    };

    setStockMovements(prev => [newMov, ...prev]);

    setDirectQty('');
    setDirectNote('');
    setDirectRef('');
    alert(`Đã hoàn tất nhập kho trực tiếp ${qtyNum} SP ${prodName} (Mã chiếu: ${refCode})!`);
  };

  // Filter calculations — in warehouse context we show all products except truly discontinued
  // available=false means hidden from storefront but still physically in warehouse
  const activeInventory = inventory.filter(item => item.status !== 'DISCONTINUED');
  const outOfStockItems = activeInventory.filter(item => Number(item.stock) === 0);
  const lowStockItems = activeInventory.filter(item => Number(item.stock) > 0 && Number(item.stock) <= Number(item.threshold || 5));
  const effectiveReceipts = (receipts && receipts.length > 0) ? receipts : DEFAULT_SAMPLE_RECEIPTS;
  const effectiveReturnRequests = (returnRequests && returnRequests.length > 0) ? returnRequests : DEFAULT_SAMPLE_RETURNS;
  const readyReceipts = effectiveReceipts.filter(r => r.status === 'READY');
  const pendingDeliveriesCount = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'READY_TO_SHIP').length;

  const CAT_ALIASES = {
    'CPU': ['CPU', 'PROCESSOR', 'BỘ XỬ LÝ'],
    'VGA': ['VGA', 'GPU', 'GRAPHICS', 'CARD MÀN HÌNH', 'VIDEO CARD'],
    'MAINBOARD': ['MAINBOARD', 'MOTHERBOARD', 'BO MẠCH CHỦ', 'MAIN'],
    'RAM': ['RAM', 'MEMORY', 'BỘ NHỚ'],
    'STORAGE': ['STORAGE', 'HDD', 'SSD', 'Ổ CỨNG', 'O CUNG'],
    'PSU': ['PSU', 'POWER SUPPLY', 'NGUỒN', 'NGUON'],
    'CASE': ['CASE', 'CHASSIS', 'VỎ CASE', 'THÙNG MÁY'],
    'COOLER': ['COOLER', 'TẢN NHIỆT', 'FAN', 'COOLING'],
    'MONITOR': ['MONITOR', 'MÀN HÌNH', 'MAN HINH', 'SCREEN', 'DISPLAY'],
    'KEYBOARD': ['KEYBOARD', 'BÀN PHÍM', 'BAN PHIM', 'PHÍM'],
    'MOUSE': ['MOUSE', 'CHUỘT', 'CHUOT']
  };

  const filteredProducts = activeInventory.filter(item => {
    const matchSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
    const itemCatUpper = String(item.category || '').toUpperCase().trim();
    const matchCat = selectedCategory === 'ALL' || (() => {
      const aliases = CAT_ALIASES[selectedCategory] || [selectedCategory];
      return aliases.some(a => itemCatUpper === a || itemCatUpper.includes(a));
    })();
    const matchLoc = selectedLocationStatus === 'ALL' || (selectedLocationStatus === 'ASSIGNED' ? (!!item.location && item.location !== 'Chưa xếp kệ') : (!item.location || item.location === 'Chưa xếp kệ'));
    const matchSup = selectedSupplier === 'ALL' || item.supplier === selectedSupplier;

    let matchStock = true;
    if (stockStatusFilter === 'IN_STOCK') matchStock = Number(item.stock) > 0;
    if (stockStatusFilter === 'LOW_STOCK') matchStock = Number(item.stock) > 0 && Number(item.stock) <= Number(item.threshold || 5);
    if (stockStatusFilter === 'OUT_OF_STOCK') matchStock = Number(item.stock) === 0;

    return matchSearch && matchCat && matchLoc && matchSup && matchStock;
  });

  // Dynamic suppliers available for current selected category
  const categoryMatchedInventory = activeInventory.filter(item => {
    if (selectedCategory === 'ALL') return true;
    const itemCatUpper = String(item.category || '').toUpperCase().trim();
    const aliases = CAT_ALIASES[selectedCategory] || [selectedCategory];
    return aliases.some(a => itemCatUpper === a || itemCatUpper.includes(a));
  });
  const availableSuppliers = [...new Set(categoryMatchedInventory.map(i => i.supplier).filter(Boolean))].sort();

  // Stock status counts computed in context of category/supplier/location/search filters
  const baseForStockStatus = activeInventory.filter(item => {
    const matchSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
    const itemCatUpper = String(item.category || '').toUpperCase().trim();
    const matchCat = selectedCategory === 'ALL' || (() => {
      const aliases = CAT_ALIASES[selectedCategory] || [selectedCategory];
      return aliases.some(a => itemCatUpper === a || itemCatUpper.includes(a));
    })();
    const matchLoc = selectedLocationStatus === 'ALL' || (selectedLocationStatus === 'ASSIGNED' ? (!!item.location && item.location !== 'Chưa xếp kệ') : (!item.location || item.location === 'Chưa xếp kệ'));
    const matchSup = selectedSupplier === 'ALL' || item.supplier === selectedSupplier;
    return matchSearch && matchCat && matchLoc && matchSup;
  });
  const countAllStock = baseForStockStatus.length;
  const countInStock = baseForStockStatus.filter(i => Number(i.stock) > 0).length;
  const countLowStock = baseForStockStatus.filter(i => Number(i.stock) > 0 && Number(i.stock) <= Number(i.threshold || 5)).length;
  const countOutOfStock = baseForStockStatus.filter(i => Number(i.stock) === 0).length;

  const filteredReceiptsList = effectiveReceipts.filter(r => {
    const poNum = r.po?.poNumber || r.poId || r.receiptNumber;
    const matchSearch = !receiptSearch.trim() || r.receiptNumber.toLowerCase().includes(receiptSearch.toLowerCase()) || String(poNum).toLowerCase().includes(receiptSearch.toLowerCase());
    const matchStatus = receiptStatusFilter === 'ALL' || r.status === receiptStatusFilter;
    const matchDate = isDateInRange(r.createdAt, grnStartDate, grnEndDate);
    return matchSearch && matchStatus && matchDate;
  });

  const filteredDeliveriesList = orders.filter(o => {
    const matchSearch = !deliverySearch.trim() || String(o.orderId || o.id).toLowerCase().includes(deliverySearch.toLowerCase()) || (o.customerName && o.customerName.toLowerCase().includes(deliverySearch.toLowerCase()));
    const matchStatus = deliveryFilter === 'ALL' ||
      (deliveryFilter === 'PENDING' && (o.status === 'CONFIRMED' || o.status === 'READY_TO_SHIP')) ||
      (deliveryFilter === 'SHIPPED' && o.status === 'SHIPPED') ||
      (deliveryFilter === 'DELIVERED' && o.status === 'DELIVERED');
    return matchSearch && matchStatus;
  });

  const filteredHistoryList = effectiveStockMovements.filter(m => {
    const matchSearch = !historySearch.trim() || (m.productName && m.productName.toLowerCase().includes(historySearch.toLowerCase())) || (m.reference && m.reference.toLowerCase().includes(historySearch.toLowerCase()));
    const matchType = movementTypeFilter === 'ALL' || m.type === movementTypeFilter;
    const matchDate = isDateInRange(m.timestamp, historyStartDate, historyEndDate);
    return matchSearch && matchType && matchDate;
  });

  // Backorders List (Orders with AWAITING_STOCK status)
  const backorderOrders = orders.filter(o => o && o.status === 'AWAITING_STOCK');
  const filteredBackordersList = backorderOrders.filter(o => {
    const matchSearch = !backorderSearch.trim() ||
      String(o.orderId || o.id).toLowerCase().includes(backorderSearch.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(backorderSearch.toLowerCase())) ||
      (o.items && o.items.some(i => (i.name || i.productName || '').toLowerCase().includes(backorderSearch.toLowerCase())));
    return matchSearch;
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Notification Bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <ActorNotificationBar />
      </div>

      {/* 1. VIEW: TỔNG QUAN TỒN KHO */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Tổng Quan Tồn Kho
            </h2>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Card 1: Phiếu nhập kho */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7', margin: '0 0 1rem 0' }}>
                  Phiếu nhập kho
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setActiveTab('grn')}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {readyReceipts.length} Cần nhập
                  </button>
                  <div style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'right' }}>
                    <div>Trễ: <strong style={{ color: '#0f172a' }}>0</strong></div>
                    <div>Hoạt động: <strong style={{ color: '#0f172a' }}>{receipts.length}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Lệnh giao hàng */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7', margin: '0 0 1rem 0' }}>
                  Lệnh giao hàng
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setActiveTab('delivery')}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {pendingDeliveriesCount} Cần xuất
                  </button>
                  <div style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'right' }}>
                    <div>Trễ: <strong style={{ color: '#0f172a' }}>0</strong></div>
                    <div>Hoạt động: <strong style={{ color: '#0f172a' }}>{orders.length}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Nhập kho trực tiếp */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7', margin: '0 0 1rem 0' }}>
                  Nhập kho trực tiếp
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setActiveTab('intake')}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Mở
                  </button>
                  <div style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'right' }}>
                    <div>Tổng sản phẩm: <strong style={{ color: '#0f172a' }}>{activeInventory.length}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Bổ sung hàng (RFQ Alert) */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7', margin: '0 0 1rem 0' }}>
                  Bổ sung hàng (RFQ Alerts)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setActiveTab('rfq')}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {lowStockItems.length} Cần mua
                  </button>
                  <div style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'right' }}>
                    <div>Hết hàng: <strong style={{ color: '#ef4444' }}>{outOfStockItems.length}</strong></div>
                    <div>Dưới ngưỡng: <strong style={{ color: '#d97706' }}>{lowStockItems.length}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Hàng lỗi & Trả về */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7', margin: '0 0 1rem 0' }}>
                  Hàng lỗi & Trả về
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setActiveTab('returns')}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Mở
                  </button>
                  <div style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'right' }}>
                    <div>Chờ xử lý: <strong style={{ color: '#0f172a' }}>{(returnRequests || []).length}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 6: Đơn Chờ Hàng (Backorders) */}
            <div style={{
              borderRadius: '8px',
              border: backorderOrders.length > 0 ? '1.5px solid #fdba74' : '1px solid #cbd5e1',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: backorderOrders.length > 0 ? '#fff7ed' : '#ffffff'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: backorderOrders.length > 0 ? '#c2410c' : '#0284c7', margin: '0 0 1rem 0' }}>
                  Đơn Hàng Chờ Nhập Kho
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setActiveTab('backorders')}
                    style={{
                      backgroundColor: backorderOrders.length > 0 ? '#ea580c' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {backorderOrders.length} Đơn chờ hàng
                  </button>
                  <div style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'right' }}>
                    <div>Linh kiện cần nhập: <strong style={{ color: '#dc2626' }}>{backorderOrders.reduce((s, o) => s + (o.items?.length || 1), 0)} SP</strong></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW: QUẢN LÝ ĐƠN HÀNG CHỜ NHẬP KHO (BACKORDERS) - CLEAN ENTERPRISE UI */}
      {/* ========================================================================= */}
      {activeTab === 'backorders' && (
        <div>
          {/* Header Bar */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Quản Lý Đơn Hàng Chờ Nhập Kho (Backorders)
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                Danh sách các đơn hàng tạm giữ chỗ do thiếu tồn kho. Hệ thống tự động giải phóng đơn sang Chờ xuất kho khi hoàn tất nhập hàng PO.
              </p>
            </div>

            <button
              onClick={() => {
                const totalAwaiting = backorderOrders.length;
                if (totalAwaiting === 0) {
                  alert('Hiện tại không có đơn hàng nào đang chờ nhập hàng.');
                  return;
                }
                let resolvedCount = 0;
                backorderOrders.forEach(o => {
                  let canFulfill = true;
                  (o.items || []).forEach(item => {
                    const inv = activeInventory.find(i => String(i.id) === String(item.productId || item.id));
                    if (!inv || Number(inv.stock) < (Number(item.quantity) || 1)) canFulfill = false;
                  });
                  if (canFulfill) resolvedCount++;
                });

                if (resolvedCount > 0) {
                  alert(`Đã tìm thấy ${resolvedCount} đơn hàng đã có đủ tồn kho trong hệ thống. Bạn có thể nhấn nút "Xác Nhận Xuất Kho" để tiến hành xuất hàng.`);
                } else {
                  alert(`Đang có ${totalAwaiting} đơn chờ hàng. Các sản phẩm này hiện vẫn chưa đủ tồn kho. Vui lòng bấm "Đề Xuất Mua Hàng" để gửi yêu cầu cho phòng Mua Hàng.`);
                }
              }}
              style={{
                backgroundColor: '#ffffff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '0.55rem 1.1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Kiểm Tra Lại Tồn Kho Hệ Thống
            </button>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '1.1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Đơn Hàng Chờ Xử Lý
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ea580c', marginTop: '0.25rem' }}>
                {backorderOrders.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>đơn</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1.1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Mặt Hàng Thiếu Tồn Kho
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>
                {backorderOrders.reduce((sum, o) => {
                  const missingCount = (o.items || []).filter(item => {
                    const inv = (inventory || []).find(i => String(i.id) === String(item.productId || item.id));
                    return !inv || Number(inv.stock) < (Number(item.quantity) || 1);
                  }).length;
                  return sum + missingCount;
                }, 0)} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>sản phẩm</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1.1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tổng Giá Trị Đơn Treo
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                {safeFormatPrice(backorderOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0))}
              </div>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div style={{ backgroundColor: '#ffffff', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.25rem' }}>
            <input
              type="text"
              placeholder="Tìm theo mã đơn hàng, tên khách hàng, tên linh kiện..."
              value={backorderSearch}
              onChange={e => setBackorderSearch(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
          </div>

          {/* Backorders Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '130px' }}>Mã Đơn Hàng</th>
                  <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Khách Hàng</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tình Trạng Linh Kiện & Tồn Kho</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '120px' }}>Tổng Tiền</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '140px' }}>Trạng Thái</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '180px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredBackordersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Hiện tại không có đơn hàng nào cần nhập kho.</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Tất cả các đơn hàng đều đã có đủ tồn kho khả dụng để xuất giao.</div>
                    </td>
                  </tr>
                ) : (
                  filteredBackordersList.map((order, idx) => {
                    const orderItems = order.items || [];
                    
                    // Evaluate availability of each item
                    const evaluatedItems = orderItems.map(item => {
                      const invItem = (inventory || []).find(inv => String(inv.id) === String(item.productId || item.id));
                      const currentStock = invItem ? Number(invItem.stock) : 0;
                      const neededQty = Number(item.quantity) || 1;
                      const isOutOfStock = currentStock < neededQty;
                      const shortage = Math.max(0, neededQty - currentStock);
                      return {
                        ...item,
                        currentStock,
                        neededQty,
                        isOutOfStock,
                        shortage
                      };
                    });

                    const allFulfilled = evaluatedItems.every(i => !i.isOutOfStock);
                    const missingItems = evaluatedItems.filter(i => i.isOutOfStock);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        {/* Order Code & Date */}
                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.9rem' }}>
                            #{order.orderId || order.id}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '18/08/2026'}
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                            {order.customerName || 'Khách Hàng'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                            {order.phone || '090xxxxxxx'}
                          </div>
                        </td>

                        {/* Items Breakdown */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {evaluatedItems.map((it, iIdx) => (
                              <div
                                key={iIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.45rem 0.75rem',
                                  borderRadius: '6px',
                                  backgroundColor: it.isOutOfStock ? '#fef2f2' : '#f8fafc',
                                  border: `1px solid ${it.isOutOfStock ? '#fecaca' : '#e2e8f0'}`
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0, paddingRight: '0.75rem' }}>
                                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {it.name || it.productName || 'Linh Kiện Máy Tính'}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>
                                    Số lượng yêu cầu: <strong>{it.neededQty}</strong> | Tồn kho hiện tại: <strong>{it.currentStock}</strong>
                                  </div>
                                </div>

                                <div>
                                  {it.isOutOfStock ? (
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      backgroundColor: '#fee2e2',
                                      color: '#b91c1c',
                                      border: '1px solid #fca5a5'
                                    }}>
                                      Thiếu {it.shortage} SP
                                    </span>
                                  ) : (
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      backgroundColor: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #cbd5e1'
                                    }}>
                                      Đủ hàng
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td style={{ padding: '1rem', textAlign: 'right', verticalAlign: 'top', fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                          {safeFormatPrice(order.totalAmount)}
                        </td>

                        {/* Stock Status Badge */}
                        <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'top' }}>
                          {allFulfilled ? (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              display: 'inline-block'
                            }}>
                              Đã Đủ Hàng
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              backgroundColor: '#ffedd5',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                              display: 'inline-block'
                            }}>
                              Thiếu {missingItems.length} Linh Kiện
                            </span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {allFulfilled ? (
                              <button
                                onClick={() => handleFulfillBackorder(order)}
                                style={{
                                  backgroundColor: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  padding: '0.45rem 0.75rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  width: '100%'
                                }}
                              >
                                Xác Nhận Xuất Kho
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenBackorderRfqModal(order, missingItems[0] || orderItems[0])}
                                style={{
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  padding: '0.45rem 0.75rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  width: '100%'
                                }}
                              >
                                Đề Xuất Mua Hàng (RFQ)
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedOrderForDetail(order)}
                              style={{
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '5px',
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                width: '100%'
                              }}
                            >
                              Xem Chi Tiết
                            </button>
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

      {/* 2. VIEW: HOẠT ĐỘNG > PHIẾU NHẬP KHO (GRN) */}
      {activeTab === 'grn' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Hoạt Động / Phiếu Nhập Kho (Receipts)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              Tiếp nhận lô hàng từ Nhà cung cấp sau khi đã nghiệm thu QA/QC
            </p>
          </div>

          {/* Filter bar */}
          <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Tìm theo mã phiếu nhập GRN, mã PO..."
              value={receiptSearch}
              onChange={(e) => setReceiptSearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '0.55rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
            <select
              value={receiptStatusFilter}
              onChange={(e) => setReceiptStatusFilter(e.target.value)}
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="READY">Chờ nhập kho</option>
              <option value="DONE">Đã nhập kho</option>
            </select>
          </div>

          {/* Receipts Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Mã Phiếu GRN</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Mã Đơn PO</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Nhà Cung Cấp</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Ngày Khởi Tạo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Trạng Thái QA/QC</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Trạng Thái Kho</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceiptsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      Không có phiếu nhập kho nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredReceiptsList.map(r => (
                    <tr 
                      key={r.id} 
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setSelectedReceipt(r)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#2563eb' }}>{r.receiptNumber}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>{r.po?.poNumber || r.poId || '---'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{r.po?.supplier?.name || r.supplierName || 'Intel Vietnam'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{formatDateTime ? formatDateTime(r.createdAt) : new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                          Đã Đạt QA/QC
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                          backgroundColor: r.status === 'DONE' ? '#dcfce7' : '#fef3c7',
                          color: r.status === 'DONE' ? '#15803d' : '#d97706'
                        }}>
                          {r.status === 'DONE' ? 'Đã Nhập Kho' : 'Chờ Nhập Kho'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedReceipt(r); }}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Xem Chi Tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. VIEW: HOẠT ĐỘNG > LỆNH GIAO HÀNG (DELIVERY) */}
      {activeTab === 'delivery' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Hoạt Động / Lệnh Giao Hàng (Delivery Orders)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              Kiểm tra đóng gói, quét mã sản phẩm và phân công nhân viên Shipper giao hàng
            </p>
          </div>

          {/* Filter bar */}
          <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Tìm theo mã đơn hàng ORD, tên khách hàng..."
              value={deliverySearch}
              onChange={(e) => setDeliverySearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '0.55rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="PENDING">Chờ xuất kho & bàn giao</option>
              <option value="SHIPPED">Đang giao hàng</option>
              <option value="DELIVERED">Đã giao hàng thành công</option>
              <option value="ALL">Tất cả đơn hàng</option>
            </select>
          </div>

          {/* Delivery Orders Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Mã Đơn Hàng</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Khách Hàng</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Địa Chỉ Giao</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Giá Trị Đơn</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Shipper Đảm Nhận</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Tiến Trình & Trạng Thái</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Hành Động Nghiệp Vụ</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveriesList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      Không có lệnh giao hàng nào trong danh sách.
                    </td>
                  </tr>
                ) : (
                  filteredDeliveriesList.map(o => {
                    const isPendingPack = ['CONFIRMED', 'PROCESSING', 'PENDING', 'AWAITING_SHIP'].includes(o.status);
                    const isPackedWaitingShipper = ['PACKED', 'READY_TO_SHIP'].includes(o.status);
                    const isShipping = ['SHIPPED', 'OUT_FOR_DELIVERY', 'ASSIGNED'].includes(o.status);
                    const isDelivered = ['DELIVERED', 'COMPLETED'].includes(o.status);

                    return (
                      <tr key={o.id || o.orderId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#2563eb' }}>
                          #{o.orderId || o.id}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                          <div style={{ fontWeight: 700 }}>{o.customerName || 'Khách hàng'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.phone || o.customerPhone || '090xxxxxxx'}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569', maxWidth: '240px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {o.shippingAddress || o.address || 'TP. Hồ Chí Minh'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {safeFormatPrice(o.totalAmount || o.total || 0)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#334155' }}>
                          {isShipping || isDelivered ? (
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {o.assignedShipper || 'Shipper Nội Bộ'}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                              {isPackedWaitingShipper ? 'Chưa phân công' : '---'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {isPendingPack && (
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fdba74'
                            }}>
                              Bước 1: Chờ Đóng Gói
                            </span>
                          )}

                          {isPackedWaitingShipper && (
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#f5f3ff',
                              color: '#6d28d9',
                              border: '1px solid #ddd6fe'
                            }}>
                              Bước 2: Đã Đóng Gói (Chờ Shipper)
                            </span>
                          )}

                          {isShipping && (
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}>
                              Bước 3: Đang Giao Hàng
                            </span>
                          )}

                          {isDelivered && (
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0'
                            }}>
                              Hoàn Tất: Đã Giao Hàng
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            {isPendingPack && (
                              <button
                                onClick={() => setPackScanOrder(o)}
                                style={{
                                  backgroundColor: '#1d4ed8',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  padding: '0.45rem 0.85rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Đóng Gói & Quét Mã
                              </button>
                            )}

                            {isPackedWaitingShipper && (
                              <>
                                <button
                                  onClick={() => setOrderToAssign(o)}
                                  style={{
                                    backgroundColor: '#6d28d9',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    padding: '0.45rem 0.85rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Phân Công Shipper
                                </button>
                                <button
                                  onClick={() => setSelectedOrderForDetail(o)}
                                  style={{
                                    backgroundColor: '#ffffff',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '5px',
                                    padding: '0.45rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Xem Gói Hàng
                                </button>
                              </>
                            )}

                            {(isShipping || isDelivered) && (
                              <button
                                onClick={() => setSelectedOrderForDetail(o)}
                                style={{
                                  backgroundColor: '#ffffff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '5px',
                                  padding: '0.45rem 0.85rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Xem Chi Tiết
                              </button>
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

      {/* 4. VIEW: HOẠT ĐỘNG > NHẬP TRỰC TIẾP (INTAKE) */}
      {activeTab === 'intake' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Hoạt Động / Nhập Kho Trực Tiếp
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              Tạo phiếu nhập trực tiếp bổ sung số lượng tồn kho không qua đơn mua PO
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.5rem' }}>
            <form onSubmit={handleDirectIntakeSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Chọn sản phẩm nhập kho *
                  </label>
                  <select
                    value={directProduct}
                    onChange={(e) => setDirectProduct(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {activeInventory.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (Tồn hiện tại: {prod.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Số lượng nhập bổ sung *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Nhập số lượng..."
                    value={directQty}
                    onChange={(e) => setDirectQty(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Vị trí lưu kho (Kệ / Bin)
                  </label>
                  <select
                    value={directLocation}
                    onChange={(e) => setDirectLocation(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    {PREDEFINED_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Mã tham chiếu / Số chứng từ
                  </label>
                  <input
                    type="text"
                    placeholder="VD: INT-2026-001"
                    value={directRef}
                    onChange={(e) => setDirectRef(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Ghi chú chi tiết / Lý do điều chỉnh
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ lý do nhập bổ sung hoặc kiểm kê thừa..."
                  value={directNote}
                  onChange={(e) => setDirectNote(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'inherit' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.5rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Xác Nhận Nhập Kho Trực Tiếp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. VIEW: HOẠT ĐỘNG > BỔ SUNG HÀNG (RFQ) */}
      {activeTab === 'rfq' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Hoạt Động / Mua Sắm & Bổ Sung Hàng (RFQ Alerts)
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Quản lý danh sách linh kiện chạm ngưỡng tồn kho an toàn và gửi cảnh báo YCBG
              </p>
            </div>
            <button
              onClick={() => setShowRfqHistoryModal(true)}
              style={{
                backgroundColor: '#ffffff',
                color: '#2563eb',
                border: '1px solid #2563eb',
                borderRadius: '6px',
                padding: '0.5rem 1.25rem',
                fontSize: '0.83rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Lịch Sử Cảnh Báo ({rfqAlertLogs.length})
            </button>
          </div>

          {/* Low stock table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Sản Phẩm</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Nhà Cung Cấp</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Tồn Hiện Tại</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Ngưỡng An Toàn</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      Tất cả sản phẩm đều đang ở mức tồn kho an toàn!
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{item.name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{item.supplier}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800, color: Number(item.stock) === 0 ? '#ef4444' : '#d97706' }}>
                        {item.stock} SP
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>{item.threshold || 5} SP</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                          backgroundColor: Number(item.stock) === 0 ? '#ffe4e6' : '#fef3c7',
                          color: Number(item.stock) === 0 ? '#e11d48' : '#d97706'
                        }}>
                          {Number(item.stock) === 0 ? 'Hết Hàng' : 'Cảnh Báo Tồn'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => setRfqModalData({ item, qty: (item.threshold || 5) * 2, reason: 'Tồn kho chạm ngưỡng tối thiểu' })}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Gửi Cảnh Báo RFQ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. VIEW: HOẠT ĐỘNG > HÀNG LỖI & TRẢ VỀ (RETURNS) */}
      {activeTab === 'returns' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Hoạt Động / Hàng Lỗi & Trả Về (Scrap & Returns / RMA)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              Tiếp nhận linh kiện trả về từ khách hàng, kiểm định lỗi kỹ thuật, phân loại hàng hỏng (Scrap) hoặc nhập lại sổ kho (Restock)
            </p>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Mã Yêu Cầu RMA</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Sản Phẩm Trả Về</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Khách Hàng</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Lý Do Đổi Trả</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Ngày Tạo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Trạng Thái Kiểm Định</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {effectiveReturnRequests.map((item, index) => {
                  const prodName = item.productName || item.product?.name || item.productTitle || item.items?.[0]?.name || item.name || (index % 2 === 0 ? 'RAM Corsair Vengeance RGB 32GB DDR5' : 'Màn hình Dell UltraSharp 27" 4K');
                  const orderNum = item.orderId || item.orderNumber || item.orderCode || `ORD-${101 + index}`;
                  const qty = item.quantity || item.qty || 1;
                  const custName = item.customerName || item.customer || item.clientName || 'Khách hàng';
                  const phone = item.customerPhone || item.phone || item.mobile || item.customerTel || '0908 123 456';
                  const reasonText = item.reason || item.note || item.description || 'Lỗi sản phẩm / Yêu cầu bảo hành';
                  
                  let dateDisplay = '18/8/2026';
                  const rawDate = item.createdAt || item.date || item.createdDate || item.time;
                  if (rawDate) {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) {
                      dateDisplay = formatDateTime ? formatDateTime(rawDate) : d.toLocaleDateString('vi-VN');
                    }
                  }

                  return (
                    <tr key={item.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#2563eb' }}>{item.rmaNumber || item.code || `RET-${String(index + 1).padStart(3, '0')}`}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{prodName}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Đơn hàng #{orderNum} | SL: {qty} SP</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ color: '#0f172a', fontWeight: 600 }}>{custName}</div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>SĐT: {phone}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{reasonText}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        {dateDisplay}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {(() => {
                          const st = item.status || 'PENDING';
                          let label = 'Chờ QC Kiểm Định';
                          let bg = '#fef3c7';
                          let color = '#b45309';
                          let border = '#fde68a';

                          if (['QC_PASSED', 'RESTOCKED', 'APPROVED'].includes(st)) {
                            label = 'Đã Nhập Lại Kho';
                            bg = '#dcfce7';
                            color = '#15803d';
                            border = '#bbf7d0';
                          } else if (st === 'EXCHANGE_NEW' || st === 'EXCHANGED') {
                            label = 'Đã Duyệt Đổi Mới';
                            bg = '#ede9fe';
                            color = '#6d28d9';
                            border = '#ddd6fe';
                          } else if (st === 'VENDOR_WARRANTY') {
                            label = 'Chuyển Gửi Hãng BH';
                            bg = '#ffedd5';
                            color = '#c2410c';
                            border = '#fed7aa';
                          } else if (st === 'INSPECTED_SCRAP') {
                            label = 'Phế Phẩm / Kho Lỗi';
                            bg = '#ffe4e6';
                            color = '#be123c';
                            border = '#fecdd3';
                          } else if (['REJECTED', 'REJECT_RMA'].includes(st)) {
                            label = 'Từ Chối Bảo Hành';
                            bg = '#fee2e2';
                            color = '#dc2626';
                            border = '#fca5a5';
                          }

                          return (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: bg,
                              color: color,
                              border: `1px solid ${border}`,
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {(() => {
                          const st = item.status || 'PENDING';
                          let btnText = 'Xử lý nhập kho';
                          let btnBg = '#2563eb';

                          if (['QC_PASSED', 'RESTOCKED', 'APPROVED'].includes(st)) {
                            btnText = 'Xem vị trí kệ';
                            btnBg = '#16a34a';
                          } else if (st === 'VENDOR_WARRANTY') {
                            btnText = 'Chi tiết gửi hãng';
                            btnBg = '#d97706';
                          } else if (st === 'INSPECTED_SCRAP') {
                            btnText = 'Xem kho lỗi';
                            btnBg = '#e11d48';
                          } else if (st === 'EXCHANGE_NEW' || st === 'EXCHANGED') {
                            btnText = 'Xem đổi mới';
                            btnBg = '#7c3aed';
                          } else if (['REJECTED', 'REJECT_RMA'].includes(st)) {
                            btnText = 'Xem lý do';
                            btnBg = '#64748b';
                          }

                          return (
                            <button
                              onClick={() => {
                                setSelectedReturnProcessing(item);
                                setReturnShelfLocation(
                                  ['QC_PASSED', 'RESTOCKED', 'APPROVED'].includes(item.status) ? 'SHELF_A1_RESTOCK' :
                                  item.status === 'EXCHANGE_NEW' ? 'SHELF_A1_RESTOCK' :
                                  item.status === 'VENDOR_WARRANTY' ? 'SHELF_C2_VENDOR' :
                                  item.status === 'INSPECTED_SCRAP' ? 'SHELF_D_SCRAP' : 'SHELF_A1_RESTOCK'
                                );
                                setReturnProcessNote(item.resolution || item.shelfNote || item.reason || 'Đã phân luồng vị trí kệ kho');
                              }}
                              style={{
                                backgroundColor: btnBg,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.45rem 0.9rem',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-block',
                                minWidth: '120px',
                                textAlign: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                              }}
                            >
                              {btnText}
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. VIEW: SẢN PHẨM > DANH SÁCH SẢN PHẨM (INVENTORY) */}
      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Sản Phẩm / Danh Sách Sản Phẩm
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Quản lý danh mục tất cả linh kiện máy tính, giá niêm yết, vị trí kệ và ngưỡng Min-Max
              </p>
            </div>
            <button
              onClick={() => setShowAddProduct(true)}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.55rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Thêm Sản Phẩm Mới
            </button>
          </div>

          {/* Enhanced Filter Toolbar */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            marginBottom: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1.8fr) minmax(140px, 1fr) minmax(160px, 1.2fr) minmax(170px, 1.2fr) minmax(130px, 1fr)',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <input
              type="text"
              placeholder="Tìm theo tên linh kiện, nhà cung cấp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 0.85rem',
                fontSize: '0.83rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSupplier('ALL');
              }}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 0.65rem',
                fontSize: '0.83rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#0f172a',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả phân nhóm</option>
              <option value="CPU">CPU</option>
              <option value="VGA">VGA</option>
              <option value="MAINBOARD">Mainboard</option>
              <option value="RAM">RAM</option>
              <option value="STORAGE">Storage</option>
              <option value="PSU">PSU</option>
              <option value="CASE">Case</option>
              <option value="COOLER">Cooler</option>
              <option value="MONITOR">Monitor</option>
              <option value="KEYBOARD">Keyboard</option>
              <option value="MOUSE">Mouse</option>
            </select>

            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 0.65rem',
                fontSize: '0.83rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#0f172a',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả nhà cung cấp ({availableSuppliers.length})</option>
              {availableSuppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 0.65rem',
                fontSize: '0.83rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#0f172a',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả trạng thái tồn ({countAllStock})</option>
              <option value="IN_STOCK">Còn hàng ({countInStock})</option>
              <option value="LOW_STOCK">Cảnh báo tồn ({countLowStock})</option>
              <option value="OUT_OF_STOCK">Hết hàng ({countOutOfStock})</option>
            </select>

            <select
              value={selectedLocationStatus}
              onChange={(e) => setSelectedLocationStatus(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 0.65rem',
                fontSize: '0.83rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#0f172a',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả vị trí kệ</option>
              <option value="ASSIGNED">Đã xếp kệ</option>
              <option value="UNASSIGNED">Chưa xếp kệ</option>
            </select>
          </div>

          {/* Inventory Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Tên Sản Phẩm</th>
                  <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Phân Nhóm</th>
                  <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Nhà Cung Cấp</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Vị Trí Kệ</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Tồn Hiện Tại</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng Thái</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Đơn Giá</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      Không tìm thấy sản phẩm nào.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(p => {
                    const stockNum = Number(p.stock) || 0;
                    const threshNum = Number(p.threshold || 5);
                    const isOutOfStock = stockNum === 0;
                    const isLowStock = stockNum > 0 && stockNum <= threshNum;

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                        <td style={{ padding: '0.75rem 0.85rem', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.category}</td>
                        <td style={{ padding: '0.75rem 0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>{p.supplier || 'Chưa rõ'}</td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#334155', whiteSpace: 'nowrap' }}>{p.location || 'Chưa xếp'}</td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap', color: isOutOfStock ? '#dc2626' : (isLowStock ? '#d97706' : '#0f172a') }}>
                          {stockNum}
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {isOutOfStock ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#dc2626',
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '12px'
                            }}>
                              Hết hàng
                            </span>
                          ) : isLowStock ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#b45309',
                              backgroundColor: '#fffbeb',
                              border: '1px solid #fde68a',
                              borderRadius: '12px'
                            }}>
                              Cảnh báo tồn
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#15803d',
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: '12px'
                            }}>
                              Còn hàng
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>
                          {safeFormatPrice(p.price)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => setEditingProd(p)}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#2563eb',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Chỉnh Sửa
                          </button>
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





      {/* 10. VIEW: BÁO CÁO > LỊCH SỬ ĐIỀU CHUYỂN (HISTORY - WORKING & VIEWABLE) */}
      {activeTab === 'history' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Báo Cáo / Lịch Sử Điều Chuyển Kho (Stock Movements)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              Nhật ký xuất nhập kho hai chiều ghi nhận tất cả biến động linh kiện (Nhấn vào bất kỳ dòng nào để xem chi tiết)
            </p>
          </div>

          {/* Filter Toolbar */}
          <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Tìm theo mã chứng từ GRN/ORD, tên sản phẩm..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '0.55rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="ALL">Tất cả loại dịch chuyển</option>
              <option value="IN">Nhập Kho (IN)</option>
              <option value="OUT">Xuất Kho (OUT)</option>
            </select>
          </div>

          {/* History Table with Full Click & Detail Viewer */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Thời Gian</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Loại Biến Động</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Mã Chứng Từ</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Sản Phẩm</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Số Lượng</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Người Thực Hiện</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      Chưa có nhật ký biến động kho nào.
                    </td>
                  </tr>
                ) : (
                  filteredHistoryList.map(mv => (
                    <tr 
                      key={mv.id} 
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setSelectedMovementLog(mv)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {formatDateTime ? formatDateTime(mv.timestamp) : new Date(mv.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                          backgroundColor: mv.type === 'IN' ? '#dcfce7' : '#ffe4e6',
                          color: mv.type === 'IN' ? '#15803d' : '#e11d48'
                        }}>
                          {mv.type === 'IN' ? 'NHẬP KHO' : 'XUẤT KHO'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#2563eb' }}>{mv.reference}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{mv.productName}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800, color: mv.type === 'IN' ? '#16a34a' : '#e11d48' }}>
                        {mv.type === 'IN' ? `+${mv.quantity}` : `-${mv.quantity}`}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{mv.actor || 'Thủ Kho'}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedMovementLog(mv); }}
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#2563eb',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Xem Chi Tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. VIEW: CẤU HÌNH > KHO HÀNG & VỊ TRÍ KỆ (LOCATIONS) */}
      {activeTab === 'locations' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Cấu Hình / Kho Hàng & Vị Trí Kệ (Warehouses & Bins)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              Danh sách khu vực kệ kho cố định trong nhà kho
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {PREDEFINED_LOCATIONS.map(loc => {
              const count = activeInventory.filter(i => i.location === loc).length;
              return (
                <div key={loc} style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#2563eb', fontSize: '1rem', fontWeight: 800 }}>{loc}</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    Số sản phẩm gán vị trí này: <strong style={{ color: '#0f172a' }}>{count}</strong> sản phẩm
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 12. VIEW: CẤU HÌNH > DANH MỤC SẢN PHẨM (CATEGORIES) */}
      {activeTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Cấu Hình / Danh Mục Sản Phẩm (Categories)
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Quản lý phân nhóm danh mục linh kiện, tổng mã sản phẩm, số lượng tồn thực tế và giá trị tài sản
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const name = prompt('Nhập tên danh mục linh kiện mới (ví dụ: NETWORKING, PERIPHERALS...):');
                if (name && name.trim()) {
                  alert(`Đã thêm danh mục quy chuẩn ${name.trim().toUpperCase()} vào hệ thống!`);
                }
              }}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.55rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Thêm Danh Mục Mới
            </button>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Mã Danh Mục</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Mô Tả Phân Nhóm</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Tổng Sản Phẩm</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Tổng Trị Giá Tồn</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: 'CPU', desc: 'Bộ vi xử lý trung tâm Intel / AMD' },
                  { code: 'VGA', desc: 'Card màn hình & Xử lý đồ họa NVIDIA / AMD' },
                  { code: 'MAINBOARD', desc: 'Bo mạch chủ máy tính các chuẩn ATX / MATX / ITX' },
                  { code: 'RAM', desc: 'Bộ nhớ trong DDR4 / DDR5' },
                  { code: 'STORAGE', desc: 'Ổ cứng SSD NVMe / SATA & HDD' },
                  { code: 'PSU', desc: 'Nguồn máy tính chuẩn 80 Plus Gold / Platinum' },
                  { code: 'CASE', desc: 'Vỏ thùng máy tính Gaming & Workstation Server' },
                  { code: 'COOLER', desc: 'Tản nhiệt khí & Tản nhiệt nước All-In-One' },
                  { code: 'MONITOR', desc: 'Màn hình máy tính đồ họa 2K / 4K / Gaming' },
                  { code: 'KEYBOARD', desc: 'Bàn phím cơ Custom & Chuẩn văn phòng', aliases: ['KEYBOARD', 'BÀN PHÍM', 'BANPHIM'] },
                  { code: 'MOUSE', desc: 'Chuột Gaming & Chuột không dây', aliases: ['MOUSE', 'CHUỘT'] }
                ].map(cat => {
                  const aliases = cat.aliases || [cat.code];
                  // Use all products (from backend) for total count
                  const allProdsInCat = products.filter(p => {
                    const c = String(typeof p.category === 'object' ? p.category?.name : p.category || '').toUpperCase().trim();
                    return aliases.some(a => c === a || c.includes(a));
                  });
                  // Get matching IDs from backend products, then look up in activeInventory
                  const matchedIds = new Set(allProdsInCat.map(p => String(p.id || p.productId)));
                  const invProdsInCat = activeInventory.filter(i => {
                    // Match by ID first (most reliable), then fallback to category string
                    if (matchedIds.has(String(i.id))) return true;
                    const c = String(i.category || '').toUpperCase().trim();
                    return aliases.some(a => c === a || c.includes(a));
                  });

                  const totalSkus = allProdsInCat.length || invProdsInCat.length;
                  const totalValue = invProdsInCat.reduce((sum, item) => sum + ((Number(item.stock) || 0) * (Number(item.price) || 0)), 0);

                  return (
                    <tr key={cat.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#2563eb' }}>{cat.code}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{cat.desc}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                        {totalSkus}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: totalValue > 0 ? '#2563eb' : '#64748b' }}>
                        {safeFormatPrice(totalValue)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.code);
                            setSelectedSupplier('ALL');
                            setStockStatusFilter('ALL');
                            setSelectedLocationStatus('ALL');
                            setSearchQuery('');
                            setActiveTab('inventory');
                          }}
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '0.4rem 1rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            minWidth: '160px',
                            display: 'inline-block',
                            textAlign: 'center'
                          }}
                        >
                          Xem Sản Phẩm ({totalSkus})
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

      {/* ──── MODALS ──── */}

      {/* Stock Movement Log Detail Modal */}
      {selectedMovementLog && (
        <MovementDetailModal
          movement={selectedMovementLog}
          onClose={() => setSelectedMovementLog(null)}
          formatDateTime={formatDateTime}
        />
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <ReceiptDetailModal
          selectedReceipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          purchaseOrders={purchaseOrders}
          handleValidateReceipt={handleValidateReceipt}
          submitting={submitting}
          formatPrice={safeFormatPrice}
        />
      )}

      {/* Shipper Assign Modal */}
      {orderToAssign && (
        <ShipperAssignModal
          orderToAssign={orderToAssign}
          onClose={() => setOrderToAssign(null)}
          onConfirmAssign={handleConfirmAssign}
        />
      )}

      {/* Pack & Scan Modal */}
      {packScanOrder && (
        <PackAndScanModal
          order={packScanOrder}
          onClose={() => setPackScanOrder(null)}
          onComplete={handlePackAndScanComplete}
        />
      )}

      {/* RFQ Alert Modal */}
      {rfqModalData && (
        <RfqAlertModal
          rfqModalData={rfqModalData}
          setRfqModalData={setRfqModalData}
          sendSystemNotification={sendSystemNotification}
          setRfqAlertLogs={setRfqAlertLogs}
        />
      )}

      {/* RFQ History Modal */}
      <RfqAlertHistoryModal
        show={showRfqHistoryModal}
        onClose={() => setShowRfqHistoryModal(false)}
        logs={rfqAlertLogs}
        formatDateTime={formatDateTime}
      />

      {/* Add Product Modal */}
      {showAddProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '600px', width: '100%', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Thêm Sản Phẩm Mới Vào Sổ Kho</h3>
              <button onClick={() => setShowAddProduct(false)} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>Đóng</button>
            </div>
            <form onSubmit={handleAddProductSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>Tên Sản Phẩm *</label>
                  <input type="text" required value={newProdForm.name} onChange={(e) => setNewProdForm({ ...newProdForm, name: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>Phân Nhóm</label>
                    <select value={newProdForm.category} onChange={(e) => setNewProdForm({ ...newProdForm, category: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      <option value="CPU">CPU</option>
                      <option value="VGA">VGA</option>
                      <option value="MAINBOARD">Mainboard</option>
                      <option value="RAM">RAM</option>
                      <option value="STORAGE">Storage</option>
                      <option value="PSU">PSU</option>
                      <option value="CASE">Case</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>Số Lượng Tồn Kho *</label>
                    <input type="number" required min="0" value={newProdForm.stock} onChange={(e) => setNewProdForm({ ...newProdForm, stock: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>Đơn Giá (VNĐ)</label>
                    <input type="number" min="0" value={newProdForm.price} onChange={(e) => setNewProdForm({ ...newProdForm, price: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>Ngưỡng An Toàn</label>
                    <input type="number" min="1" value={newProdForm.threshold} onChange={(e) => setNewProdForm({ ...newProdForm, threshold: e.target.value })} style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowAddProduct(false)} style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}>Hủy</button>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '6px', background: '#2563eb', color: '#fff', fontWeight: 700 }}>Lưu Sản Phẩm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Edit Product Modal */}
      {editingProd && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '640px', width: '100%', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Chỉnh Sửa Thông Tin Sản Phẩm</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Mã định danh: <strong style={{ color: '#2563eb' }}>#{editingProd.id}</strong></span>
              </div>
              <button onClick={() => setEditingProd(null)} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.2rem 0.6rem', cursor: 'pointer', color: '#475569', fontWeight: 600 }}>Đóng</button>
            </div>
            <form onSubmit={handleEditProductSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>Tên Linh Kiện / Sản Phẩm *</label>
                  <input type="text" required value={editingProd.name || ''} onChange={(e) => setEditingProd({ ...editingProd, name: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>Phân Nhóm Danh Mục</label>
                    <select value={editingProd.category || 'CPU'} onChange={(e) => setEditingProd({ ...editingProd, category: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      <option value="CPU">CPU</option>
                      <option value="VGA">VGA</option>
                      <option value="MAINBOARD">Mainboard</option>
                      <option value="RAM">RAM</option>
                      <option value="STORAGE">Storage</option>
                      <option value="PSU">PSU</option>
                      <option value="CASE">Case</option>
                      <option value="COOLER">Tản nhiệt (Cooler)</option>
                      <option value="MONITOR">Màn hình</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>Nhà Cung Cấp</label>
                    <select value={editingProd.supplier || 'Intel Vietnam'} onChange={(e) => setEditingProd({ ...editingProd, supplier: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      {STANDARD_SUPPLIERS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>Vị Trí Kệ Lưu Kho</label>
                    <select value={editingProd.location || 'ZONE-A/SHELF-01/BIN-01'} onChange={(e) => setEditingProd({ ...editingProd, location: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.83rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      <option value="Chưa xếp kệ">Chưa xếp kệ</option>
                      {PREDEFINED_LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>Đơn Giá Niêm Yết (VNĐ)</label>
                    <input type="number" min="0" value={editingProd.price !== undefined ? editingProd.price : 0} onChange={(e) => setEditingProd({ ...editingProd, price: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.85rem', fontWeight: 700, color: '#16a34a', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>Số Lượng Tồn Kho Thực Tế</label>
                    <input type="number" required min="0" value={editingProd.stock !== undefined ? editingProd.stock : 0} onChange={(e) => setEditingProd({ ...editingProd, stock: parseInt(e.target.value, 10) || 0 })} style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.85rem', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>Ngưỡng An Toàn (Threshold)</label>
                    <input type="number" min="1" value={editingProd.threshold || 5} onChange={(e) => setEditingProd({ ...editingProd, threshold: parseInt(e.target.value, 10) || 5 })} style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setEditingProd(null)} style={{ padding: '0.5rem 1.15rem', fontSize: '0.82rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#475569', cursor: 'pointer' }}>Hủy bỏ</button>
                <button type="button" onClick={handleEditProductSubmit} style={{ padding: '0.5rem 1.35rem', fontSize: '0.82rem', border: 'none', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>Lưu Cập Nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderForDetail && (
        <OrderDetailModal
          order={selectedOrderForDetail}
          onClose={() => setSelectedOrderForDetail(null)}
        />
      )}

      {/* Backorder RFQ Proposal Modal */}
      {rfqModalData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '580px', width: '100%', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Khởi Tạo Đề Xuất Mua Hàng (RFQ)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Phục vụ đơn nợ khách: <strong style={{ color: '#2563eb' }}>#{rfqModalData.orderId}</strong> ({rfqModalData.customerName})
                </span>
              </div>
              <button onClick={() => setRfqModalData(null)} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.2rem 0.6rem', cursor: 'pointer', color: '#475569', fontWeight: 600 }}>
                Đóng
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmSendBackorderRfq} style={{ padding: '1.5rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', marginBottom: '0.5rem' }}>
                  {rfqModalData.productName}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                  <div>Khách yêu cầu: <strong style={{ color: '#dc2626' }}>{rfqModalData.neededQty || 1} cái</strong></div>
                  <div>Tồn kho hiện tại: <strong style={{ color: Number(rfqModalData.currentStock || 0) === 0 ? '#dc2626' : '#15803d' }}>{rfqModalData.currentStock || 0} cái</strong></div>
                  <div>Đơn giá vốn ước tính: <strong style={{ color: '#0f172a' }}>{safeFormatPrice(rfqModalData.unitPrice || 0)}</strong></div>
                  <div>Tổng trị giá đề xuất: <strong style={{ color: '#16a34a' }}>{safeFormatPrice((Number(rfqModalData.suggestedQty) || 5) * (Number(rfqModalData.unitPrice) || 1500000))}</strong></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      Số Lượng Đề Xuất Mua *
                    </label>
                    <input
                      type="number"
                      required
                      min={rfqModalData.neededQty || 1}
                      value={rfqModalData.suggestedQty || 5}
                      onChange={(e) => setRfqModalData({ ...rfqModalData, suggestedQty: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.9rem', fontWeight: 800, color: '#2563eb', border: '1.5px solid #bfdbfe', borderRadius: '6px', backgroundColor: '#eff6ff', boxSizing: 'border-box' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                      (Tối thiểu {rfqModalData.neededQty || 1} cái để trả khách)
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      Nhà Cung Cấp Đề Xuất
                    </label>
                    <select
                      value={rfqModalData.supplier || 'Intel Vietnam'}
                      onChange={(e) => setRfqModalData({ ...rfqModalData, supplier: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                    >
                      {STANDARD_SUPPLIERS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      {rfqModalData.supplier && !STANDARD_SUPPLIERS.includes(rfqModalData.supplier) && (
                        <option value={rfqModalData.supplier}>{rfqModalData.supplier}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Ghi Chú Cho Phòng Mua Hàng
                  </label>
                  <textarea
                    rows={3}
                    value={rfqModalData.reason}
                    onChange={(e) => setRfqModalData({ ...rfqModalData, reason: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setRfqModalData(null)}
                  style={{ padding: '0.55rem 1.15rem', fontSize: '0.82rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.35rem', fontSize: '0.82rem', border: 'none', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.25)' }}
                >
                  Xác Nhận & Gửi RFQ Sang Mua Hàng
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Pack & Scan Modal */}
      {packScanOrder && (
        <PackAndScanModal
          show={true}
          order={packScanOrder}
          onClose={() => setPackScanOrder(null)}
          onConfirmPack={handleConfirmPack}
        />
      )}

      {/* Shipper Assign Modal */}
      {orderToAssign && (() => {
        const address = (orderToAssign.shippingAddress || orderToAssign.address || '').toLowerCase();
        const isHCM = address.includes('hcm') || address.includes('hồ chí minh') || address.includes('thành phố hồ chí minh') || address.includes('quận') || address.includes('thủ đức') || address.includes('bình thạnh') || address.includes('gò vấp');
        const defaultCarrier = isHCM 
          ? 'Shipper Nội Bộ - Nguyễn Văn A (0912.345.678)' 
          : 'Đối Tác Giao Hàng Tiết Kiệm (GHTK Express)';
        const autoTrackingCode = isHCM
          ? `NB-HCM-${(orderToAssign.orderId || orderToAssign.id || '').replace(/\D/g, '').slice(-6) || Date.now().toString().slice(-6)}`
          : `GHTK-VN-${Date.now().toString().slice(-6)}`;

        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, padding: '1rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '620px', width: '100%', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              {/* Header */}
              <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                    Điều Phối Vận Chuyển - Đơn #{orderToAssign.orderId || orderToAssign.id}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Khách hàng: <strong style={{ color: '#2563eb' }}>{orderToAssign.customerName}</strong> ({orderToAssign.phone || '090xxxxxxx'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderToAssign(null)}
                  style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
                >
                  Đóng
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const shipperName = formData.get('shipperName') || defaultCarrier;
                const trackingCode = formData.get('trackingCode') || autoTrackingCode;
                const deliveryType = formData.get('deliveryType') || (isHCM ? 'INTERNAL_HCM' : 'EXTERNAL_3PL');
                const note = formData.get('note') || '';
                
                const ordId = String(orderToAssign.orderId || orderToAssign.id || '');

                // Cập nhật ERP Context / Database
                if (typeof updateOrderStatus === 'function') {
                  updateOrderStatus(ordId, 'SHIPPED', `Đã bàn giao cho ${shipperName} [Mã VĐ: ${trackingCode}]`, {
                    assignedShipper: shipperName,
                    trackingCode: trackingCode,
                    deliveryType: deliveryType,
                    shippingNote: note,
                    shippedAt: new Date().toISOString()
                  });
                } else {
                  const updatedOrders = orders.map(o => {
                    if ((o.orderId && o.orderId === ordId) || o.id === ordId || String(o.id) === String(orderToAssign.id)) {
                      return {
                        ...o,
                        status: 'SHIPPED',
                        deliveryStatus: 'SHIPPED',
                        assignedShipper: shipperName,
                        trackingCode: trackingCode,
                        deliveryType: deliveryType,
                        shippingNote: note,
                        shippedAt: new Date().toISOString(),
                        lastNote: `Đã bàn giao cho ${shipperName}. Mã tra cứu: ${trackingCode}`
                      };
                    }
                    return o;
                  });
                  setOrders(updatedOrders);
                  try { localStorage.setItem('erp_orders', JSON.stringify(updatedOrders)); } catch (_) {}
                }

                if (sendSystemNotification) {
                  sendSystemNotification({
                    targetRoles: ['DELIVERY', 'SALES', 'CUSTOMER'],
                    title: `Đã Bàn Giao Vận Chuyển Đơn #${ordId}`,
                    message: `Đơn hàng đã bàn giao cho ${shipperName} (Mã VĐ: ${trackingCode}) xuất phát đi giao.`,
                    type: 'INFO'
                  });
                }

                if (typeof addNotification === 'function') {
                  addNotification(`Điều phối vận chuyển thành công! Đơn hàng #${ordId} đã chuyển giao cho ${shipperName}.`, 'success');
                }

                setOrderToAssign(null);
              }} style={{ padding: '1.5rem' }}>
                
                {/* Routing Alert Box */}
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  backgroundColor: isHCM ? '#eff6ff' : '#fef3c7',
                  border: `1.5px solid ${isHCM ? '#bfdbfe' : '#fde68a'}`
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: isHCM ? '#1e40af' : '#92400e' }}>
                    {isHCM ? 'Đơn Hàng Nội Thành TP.HCM (Khu Vực Trụ Sở)' : 'Đơn Hàng Ngoại Tỉnh / Vùng Xa (Chuyển Phát Liên Tỉnh)'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: isHCM ? '#3b82f6' : '#b45309', marginTop: '0.2rem' }}>
                    {isHCM 
                      ? 'Doanh nghiệp có đội xe giao hàng trực tiếp tại HCM trong 2 - 4 giờ.' 
                      : 'Hệ thống tự động liên kết đối tác vận chuyển thứ 3 (3PL Logistics) như GHTK, GHN, Viettel Post để giao liên tỉnh an toàn.'}
                  </div>
                </div>

                {/* Order Summary */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                    <div>Địa chỉ giao: <strong style={{ color: '#0f172a' }}>{orderToAssign.shippingAddress || orderToAssign.address || 'TP.HCM'}</strong></div>
                    <div>Thu hộ COD: <strong style={{ color: '#16a34a' }}>{safeFormatPrice(orderToAssign.totalAmount || orderToAssign.total || 0)}</strong></div>
                    <div>Hình thức: <strong style={{ color: '#0f172a' }}>{orderToAssign.paymentMethod || 'COD'}</strong></div>
                    <div>Đóng gói: <strong style={{ color: '#2563eb' }}>{orderToAssign.packedSerials?.length || 1} linh kiện đã niêm phong</strong></div>
                  </div>
                </div>

                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Đơn Vị / Nhân Viên Vận Chuyển *
                      </label>
                      <select
                        name="shipperName"
                        defaultValue={defaultCarrier}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.82rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                      >
                        <optgroup label="Đội Giao Hàng Nội Bộ (TP.HCM)">
                          <option value="Shipper Nội Bộ - Nguyễn Văn A (0912.345.678)">Shipper Nội Bộ - Nguyễn Văn A (0912.345.678) [Đang rảnh]</option>
                          <option value="Shipper Nội Bộ - Trần Văn B (0988.765.432)">Shipper Nội Bộ - Trần Văn B (0988.765.432) [Đang rảnh]</option>
                          <option value="Shipper Nội Bộ - Lê Hoàng Long (0909.112.233)">Shipper Nội Bộ - Lê Hoàng Long (0909.112.233)</option>
                        </optgroup>
                        <optgroup label="Đối Tác Vận Chuyển Liên Tỉnh (3PL Logistics)">
                          <option value="Đối Tác Giao Hàng Tiết Kiệm (GHTK Express)">Đối Tác Giao Hàng Tiết Kiệm (GHTK Express) [Khuyên dùng cho liên tỉnh]</option>
                          <option value="Đối Tác Giao Hàng Nhanh (GHN Express)">Đối Tác Giao Hàng Nhanh (GHN Express) [Lấy hàng 15-30p]</option>
                          <option value="Đối Tác Viettel Post">Đối Tác Viettel Post [Phủ 100% huyện xã vùng xa]</option>
                          <option value="Đối Tác VNPost (Bưu Điện Việt Nam)">Đối Tác VNPost (Bưu Điện Việt Nam)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Mã Vận Đơn (Tracking Code)
                      </label>
                      <input
                        type="text"
                        name="trackingCode"
                        defaultValue={autoTrackingCode}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      Ghi Chú Giao Hàng Cho Đơn Vị Vận Chuyển
                    </label>
                    <textarea
                      name="note"
                      rows={2}
                      defaultValue={isHCM ? 'Giao giờ hành chính, gọi khách trước 15 phút' : 'Hàng linh kiện điện tử dễ vỡ, bảo quản cẩn thận, cho khách đồng kiểm ngoại quan'}
                      style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setOrderToAssign(null)}
                    style={{ padding: '0.55rem 1.15rem', fontSize: '0.82rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '0.55rem 1.35rem', fontSize: '0.82rem', border: 'none', borderRadius: '6px', background: isHCM ? '#2563eb' : '#d97706', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                  >
                    {isHCM ? 'Xác Nhận Giao Cho Shipper Nội Bộ' : 'Xác Nhận Đẩy Đơn Sang Đối Tác 3PL'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: XỬ LÝ NHẬP KHO HÀNG ĐỔI TRẢ & ĐỊNH VỊ KỆ KHO */}
      {/* ========================================================================= */}
      {selectedReturnProcessing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            maxWidth: '620px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem 1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Package size={22} style={{ color: '#2563eb' }} />
                  <span>Xử Lý Nhập Kho Kiện Hàng Đổi Trả</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                  Phân luồng vị trí kệ lưu trữ và ghi nhận biến động số lượng vào Thẻ Kho ERP
                </p>
              </div>
              <button
                onClick={() => setSelectedReturnProcessing(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Kiện Hàng Overview Card */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2563eb' }}>
                    {selectedReturnProcessing.rmaNumber || selectedReturnProcessing.id || 'RET-001'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '0.4rem' }}>
                    • Đơn gốc: <strong>#{selectedReturnProcessing.orderId || selectedReturnProcessing.orderNumber || 'N/A'}</strong>
                  </span>
                </div>

                {/* Status Badge */}
                {(() => {
                  const st = selectedReturnProcessing.status || 'PENDING';
                  const isPassed = ['QC_PASSED', 'RESTOCKED', 'APPROVED'].includes(st);
                  const isExchange = st === 'EXCHANGE_NEW' || st === 'EXCHANGED';
                  const isVendor = st === 'VENDOR_WARRANTY';
                  const isScrap = st === 'INSPECTED_SCRAP';
                  const isReject = ['REJECTED', 'REJECT_RMA'].includes(st);

                  let badgeLabel = 'Chờ QC Thẩm Định';
                  if (isPassed) badgeLabel = 'Đã Nhập Lại Kho';
                  else if (isExchange) badgeLabel = 'Đã Duyệt Đổi Mới';
                  else if (isVendor) badgeLabel = 'Chờ Gửi Hãng BH';
                  else if (isScrap) badgeLabel = 'Phế Phẩm / Kho Lỗi';
                  else if (isReject) badgeLabel = 'Từ Chối Bảo Hành';

                  return (
                    <span style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      backgroundColor: isPassed ? '#dcfce7' : isExchange ? '#ede9fe' : isVendor ? '#ffedd5' : isScrap ? '#ffe4e6' : isReject ? '#fee2e2' : '#fef3c7',
                      color: isPassed ? '#15803d' : isExchange ? '#6d28d9' : isVendor ? '#c2410c' : isScrap ? '#be123c' : isReject ? '#dc2626' : '#b45309',
                      border: `1px solid ${isPassed ? '#bbf7d0' : isExchange ? '#ddd6fe' : isVendor ? '#fed7aa' : isScrap ? '#fecdd3' : isReject ? '#fca5a5' : '#fde68a'}`
                    }}>
                      {badgeLabel}
                    </span>
                  );
                })()}
              </div>

              <div style={{ marginTop: '0.5rem', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                {selectedReturnProcessing.productName || selectedReturnProcessing.product || selectedReturnProcessing.items?.[0]?.name || 'Linh kiện máy tính'}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.76rem', color: '#475569', marginTop: '0.35rem' }}>
                <span>Khách hàng: <strong>{selectedReturnProcessing.customerName || selectedReturnProcessing.customer || 'Khách lẻ'}</strong></span>
                <span>SĐT: {selectedReturnProcessing.customerPhone || selectedReturnProcessing.phone || 'N/A'}</span>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>Lý do: {selectedReturnProcessing.reason || selectedReturnProcessing.description || 'Hàng đổi trả / bảo hành'}</span>
              </div>
            </div>

            {/* Phân Luồng Kệ Kho Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 750, color: '#1e293b', marginBottom: '0.45rem' }}>
                  Chọn Vị Trí Kệ Kho Lưu Trữ *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  {[
                    { key: 'SHELF_A1_RESTOCK', label: 'Kệ A1 - Tồn Kho Bán Mới', desc: 'Hàng nguyên seal, đủ điều kiện bán lại', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                    { key: 'SHELF_B3_OUTLET', label: 'Kệ B3 - Kho Outlet Open-Box', desc: 'Móp vỏ hộp nhẹ, bán thanh lý -15%', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                    { key: 'SHELF_C2_VENDOR', label: 'Kệ C2 - Khu Chờ Gửi Hãng', desc: 'Chờ đóng gói chuyển tiếp NCC/Hãng', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
                    { key: 'SHELF_D_SCRAP', label: 'Kệ D - Khu Phế Phẩm / Lỗi', desc: 'Lỗi nặng, giữ làm xác linh kiện/hủy', color: '#be123c', bg: '#fff1f2', border: '#fecdd3' }
                  ].map(shelf => {
                    const isSelected = returnShelfLocation === shelf.key;
                    return (
                      <div
                        key={shelf.key}
                        onClick={() => setReturnShelfLocation(shelf.key)}
                        style={{
                          padding: '0.75rem 0.85rem',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${shelf.color}` : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? shelf.bg : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 750, fontSize: '0.82rem', color: shelf.color }}>
                          {shelf.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                          {shelf.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 750, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Ghi Chú Nhập Kệ & Mã Định Danh Ô Kho
                </label>
                <input
                  type="text"
                  value={returnProcessNote}
                  onChange={e => setReturnProcessNote(e.target.value)}
                  placeholder="Ví dụ: Đã xếp vào Ô Kệ A1-04, mã vạch seal nguyên vẹn..."
                  style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedReturnProcessing(null);
                  window.location.href = '/admin/quality-control?tab=returns';
                }}
                style={{
                  backgroundColor: '#f5f3ff',
                  color: '#7c3aed',
                  border: '1px solid #ddd6fe',
                  borderRadius: '6px',
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                🔍 Mở Màn Hình QC Thẩm Định
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReturnProcessing(null)}
                  style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isScrap = returnShelfLocation === 'SHELF_D_SCRAP';
                    const isVendor = returnShelfLocation === 'SHELF_C2_VENDOR';
                    const targetStatus = isScrap ? 'INSPECTED_SCRAP' : isVendor ? 'VENDOR_WARRANTY' : 'RESTOCKED';

                    // Lấy base list từ returnRequests hoặc effectiveReturnRequests
                    const baseList = (returnRequests && returnRequests.length > 0) ? [...returnRequests] : [...effectiveReturnRequests];
                    const targetId = String(selectedReturnProcessing.id || '');
                    const targetRma = String(selectedReturnProcessing.rmaNumber || selectedReturnProcessing.code || '');
                    const targetOrder = String(selectedReturnProcessing.orderId || '');

                    const updated = baseList.map(r => {
                      const matchId = targetId && String(r.id) === targetId;
                      const matchRma = targetRma && (String(r.rmaNumber) === targetRma || String(r.code) === targetRma);
                      const matchOrder = targetOrder && String(r.orderId) === targetOrder;
                      if (matchId || matchRma || matchOrder) {
                        return {
                          ...r,
                          status: targetStatus,
                          shelfLocation: returnShelfLocation,
                          shelfNote: returnProcessNote || 'Đã phân luồng vị trí kệ kho'
                        };
                      }
                      return r;
                    });

                    if (typeof setReturnRequests === 'function') {
                      setReturnRequests(updated);
                    }
                    localStorage.setItem('erp_return_requests', JSON.stringify(updated));

                    // Tự động tăng tồn kho nếu nhập kho bán mới hoặc outlet
                    if (['SHELF_A1_RESTOCK', 'SHELF_B3_OUTLET'].includes(returnShelfLocation)) {
                      const pName = selectedReturnProcessing.productName || selectedReturnProcessing.product || selectedReturnProcessing.items?.[0]?.name;
                      if (pName && Array.isArray(inventory) && typeof setInventory === 'function') {
                        const invUpdated = inventory.map(inv => {
                          if (inv.name === pName || (pName && inv.name.toLowerCase().includes(pName.toLowerCase()))) {
                            return { ...inv, stock: Number(inv.stock || 0) + 1 };
                          }
                          return inv;
                        });
                        setInventory(invUpdated);
                        localStorage.setItem('erp_inventory', JSON.stringify(invUpdated));
                      }
                    }

                    // Lưu log điều chuyển kho
                    const newLog = {
                      id: `MOV-RET-${Date.now().toString().slice(-4)}`,
                      type: isScrap ? 'SCRAP_INBOUND' : isVendor ? 'VENDOR_WARRANTY' : 'RETURN_RESTOCK',
                      orderId: selectedReturnProcessing.orderId || 'N/A',
                      productName: selectedReturnProcessing.productName || selectedReturnProcessing.product || selectedReturnProcessing.items?.[0]?.name || 'Linh kiện đổi trả',
                      quantity: 1,
                      fromLocation: 'Khu Vực Tiếp Nhận Trả Hàng',
                      toLocation: returnShelfLocation === 'SHELF_A1_RESTOCK' ? 'Kệ A1 (Tồn Kho Bán Mới)' : returnShelfLocation === 'SHELF_B3_OUTLET' ? 'Kệ B3 (Thanh Lý Outlet)' : returnShelfLocation === 'SHELF_C2_VENDOR' ? 'Kệ C2 (Chờ Gửi Hãng)' : 'Kệ D (Kho Lỗi Phế Phẩm)',
                      timestamp: new Date().toISOString(),
                      performedBy: 'Thủ Kho (Lê Văn C)',
                      note: returnProcessNote || 'Đã phân luồng vị trí kệ kho'
                    };
                    const updatedMovements = [newLog, ...stockMovements];
                    setStockMovements(updatedMovements);
                    localStorage.setItem('erp_stock_movements', JSON.stringify(updatedMovements));

                    if (typeof sendSystemNotification === 'function') {
                      sendSystemNotification({
                        title: `[NHẬP KHO TRẢ HÀNG] Phiếu ${selectedReturnProcessing.rmaNumber || selectedReturnProcessing.id}`,
                        content: `Thủ kho đã hoàn tất xếp kiện hàng vào ${newLog.toLocation} (${targetStatus}).`,
                        type: 'SUCCESS',
                        recipient: 'Quản Lý Kho, QC, Kế Toán'
                      });
                    }

                    if (typeof addNotification === 'function') {
                      addNotification(`Đã phân luồng kiện hàng vào ${newLog.toLocation} và cập nhật trạng thái thành công!`, 'success');
                    }

                    setSelectedReturnProcessing(null);
                  }}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1.15rem',
                    fontSize: '0.8rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 4px rgba(22,163,74,0.25)'
                  }}
                >
                  <CheckCircle size={16} /> Xác Nhận Nhập Kệ & Cập Nhật Tồn Kho
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
