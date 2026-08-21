import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Printer, Check, X, ShieldCheck, FileText, CheckCircle2, Award, Building, User, Phone, Mail, MapPin } from 'lucide-react';

function numberToWordsVietnamese(n) {
  if (!n || isNaN(n) || n === 0) return 'Không đồng chẵn./.';
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  function readThree(num, isFirst) {
    let hundred = Math.floor(num / 100);
    let remainder = num % 100;
    let ten = Math.floor(remainder / 10);
    let unit = remainder % 10;
    let res = '';

    if (hundred > 0 || !isFirst) {
      res += digits[hundred] + ' trăm ';
    }

    if (ten > 1) {
      res += digits[ten] + ' mươi ';
      if (unit === 1) res += 'mốt ';
      else if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (ten === 1) {
      res += 'mười ';
      if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (ten === 0 && unit > 0) {
      if (hundred > 0 || !isFirst) res += 'lẻ ';
      res += digits[unit] + ' ';
    }
    return res.trim();
  }

  let numStr = Math.floor(Math.abs(n)).toString();
  let groups = [];
  while (numStr.length > 0) {
    groups.unshift(numStr.slice(-3));
    numStr = numStr.slice(0, -3);
  }

  let parts = [];
  let totalGroups = groups.length;
  for (let i = 0; i < totalGroups; i++) {
    let groupVal = parseInt(groups[i], 10);
    if (groupVal > 0) {
      let isFirst = parts.length === 0;
      let groupWord = readThree(groupVal, isFirst);
      let unitWord = units[totalGroups - 1 - i];
      parts.push((groupWord + (unitWord ? ' ' + unitWord : '')).trim());
    }
  }

  let result = parts.join(' ').replace(/\s+/g, ' ').trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn./.';
}

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

export default function PrintQuotationModal({ po, onClose, onApprove, isCEO = false }) {
  if (!po) return null;

  const { inventory = [], products = [] } = useERP() || {};
  const allCatalog = [...inventory, ...products];

  const rawId = String(po.poNumber || po.id || '');
  const poNumber = rawId.startsWith('PO-') || rawId.startsWith('RFQ-') ? rawId : `PO-${rawId}`;

  const isRFQ = ['RFQ', 'RFQ_SENT', 'DRAFT'].includes(po?.status);
  const isQuotedPendingApproval = po?.status === 'QUOTED';
  const isPOApproved = ['PO', 'CONFIRMED', 'CONFIRMED_BY_SUPPLIER', 'SENT', 'SHIPPED', 'DELIVERED', 'PENDING_QA', 'QA_PASSED', 'QA_PARTIAL', 'RECEIVED', 'PAID', 'DONE', 'COMPLETED'].includes(po?.status) || po?.isApprovedByCEO;

  const [signedState, setSignedState] = useState(isPOApproved);
  const [isSigning, setIsSigning] = useState(false);

  // Document Title & Print Action Labels based on Workflow Stage
  let documentTitle = 'ĐƠN ĐẶT HÀNG MUA HÀNG';
  let documentSubtitle = '(Đơn đặt hàng mua linh kiện chính thức & cam kết thanh toán)';
  let toolbarTitle = `Đơn Đặt Hàng Mua #${poNumber}`;
  let printButtonLabel = 'In Đơn Đặt Hàng';

  if (isRFQ) {
    documentTitle = 'PHIẾU YÊU CẦU BÁO GIÁ';
    documentSubtitle = '(Yêu cầu báo giá linh kiện & thời hạn cung ứng)';
    toolbarTitle = `Phiếu Yêu Cầu Báo Giá #${poNumber}`;
    printButtonLabel = 'In Phiếu Yêu Cầu Báo Giá';
  } else if (isQuotedPendingApproval && !signedState) {
    documentTitle = 'PHIẾU BÁO GIÁ & ĐỀ XUẤT MUA HÀNG';
    documentSubtitle = '(Bảng báo giá linh kiện & đề xuất Tổng Giám Đốc phê duyệt)';
    toolbarTitle = `Tờ Trình Báo Giá Mua Hàng #${poNumber}`;
    printButtonLabel = 'In Tờ Trình Báo Giá';
  }

  const supplierName = po.supplier?.name || po.supplierName || po.supplierCode || 'Công Ty Cổ Phần Đầu Tư Công Nghệ Anh Ngọc';
  const supplierPhone = po.supplier?.phone || '024 3976 3189';
  const supplierEmail = po.supplier?.email || 'contact@anhngoc.vn';
  const supplierAddress = po.supplier?.address || '12 Cát Linh, Đống Đa, Hà Nội';
  const supplierTax = po.supplier?.taxCode || '0302998877';

  // Process items & fallback product names
  const rawItems = po.items && po.items.length > 0 ? po.items : [
    { productName: 'CPU Intel Core i7-14700K (Box Chính Hãng)', quantity: 30, unitPrice: 9800000, sku: 'CPU-INTEL-14700K', unit: 'Cái' }
  ];

  const items = rawItems.map((it, idx) => {
    const rawItemId = String(it.productId || it.sku || it.id || '');
    const matched = allCatalog.find(p => String(p.id) === rawItemId || String(p.sku) === rawItemId || String(p.productId) === rawItemId || p.name === it.productName);

    const displayName = it.productName || it.name || it.product?.name || matched?.name || matched?.productName || (it.sku && it.sku !== rawItemId ? `Linh kiện ${it.sku}` : `Linh kiện máy tính chuyên dụng #${rawItemId || (idx + 1)}`);
    const sku = it.sku || matched?.sku || rawItemId || `LK-${1000 + idx}`;
    const unit = it.unit || matched?.unit || 'Cái';
    const quantity = parseInt(it.quantity, 10) || 1;
    let unitPrice = parseFloat(it.unitPrice || it.unitCost || it.price || matched?.cost || matched?.price || 0);

    if (unitPrice === 0 && parseFloat(po.totalAmount) > 0) {
      unitPrice = Math.round(parseFloat(po.totalAmount) / (po.items?.length || 1) / quantity);
    }
    if (unitPrice === 0) {
      unitPrice = 4500000;
    }

    const lineTotal = quantity * unitPrice;
    return { ...it, displayName, sku, unit, quantity, unitPrice, lineTotal };
  });

  const calculatedTotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const finalTotal = parseFloat(po.totalAmount) > 0 ? parseFloat(po.totalAmount) : calculatedTotal;
  const subTotalBeforeVat = Math.round(finalTotal / 1.1);
  const vatAmount = finalTotal - subTotalBeforeVat;
  const wordsAmount = numberToWordsVietnamese(finalTotal);

  const issueDate = po.createdAt ? new Date(po.createdAt) : new Date();
  const dateStr = `Ngày ${issueDate.getDate()} tháng ${issueDate.getMonth() + 1} năm ${issueDate.getFullYear()}`;
  const auditToken = `SIG-CEO-${poNumber.replace(/[^a-zA-Z0-9]/g, '')}-${issueDate.getFullYear()}${(issueDate.getMonth() + 1).toString().padStart(2, '0')}${issueDate.getDate().toString().padStart(2, '0')}-VERIFIED`;

  const handlePrint = () => {
    const sheetElement = document.querySelector('.quotation-a4-sheet');
    if (!sheetElement) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe for 100% accurate A4 printing on exactly 1 page
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle} - ${poNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              background: #ffffff;
              font-size: 11.5px;
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .quotation-a4-sheet {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="quotation-a4-sheet">
            ${sheetElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        window.print();
      }
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 3000);
    }, 250);
  };

  const handleSignAndApprove = async () => {
    setIsSigning(true);
    setTimeout(async () => {
      setSignedState(true);
      setIsSigning(false);
      if (onApprove) {
        await onApprove(po.id, poNumber);
      }
    }, 500);
  };

  return (
    <div
      className="print-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflowY: 'auto',
        padding: '1.25rem 1rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* CSS In Ấn Chuẩn A4 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print {
          body * {
            visibility: hidden !important;
          }
          .quotation-a4-sheet, .quotation-a4-sheet * {
            visibility: visible !important;
          }
          .quotation-a4-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
        @keyframes stampPop {
          0% { transform: scale(1.8) rotate(-20deg); opacity: 0; }
          75% { transform: scale(0.95) rotate(-8deg); opacity: 0.95; }
          100% { transform: scale(1) rotate(-9deg); opacity: 1; }
        }
      `}</style>

      {/* Floating Action Bar (Ẩn khi In) - Light Theme */}
      <div
        className="no-print"
        style={{
          width: '100%',
          maxWidth: '840px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.12)',
          color: '#0f172a',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.4rem', borderRadius: '6px', display: 'flex' }}>
            <FileText size={18} />
          </div>
          <div>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{toolbarTitle}</strong>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Mẫu biểu chứng từ ERP chuẩn Doanh Nghiệp & Kế Toán</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={handlePrint}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.48rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <Printer size={15} /> {printButtonLabel}
          </button>

          {(isQuotedPendingApproval || isCEO) && !signedState && (
            <button
              onClick={handleSignAndApprove}
              disabled={isSigning || signedState}
              style={{
                backgroundColor: signedState ? '#16a34a' : '#ea580c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.48rem 1.15rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: signedState ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(234,88,12,0.25)',
                whiteSpace: 'nowrap'
              }}
            >
              {signedState ? 'Đã Ký Duyệt' : (isSigning ? 'Đang Xử Lý...' : 'Ký Phê Duyệt')}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.45rem 0.65rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
            title="Đóng"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TRANG GIẤY A4 CHUẨN THỰC TẾ (A4 SHEET - VỪA KHÍT 1 TRANG) */}
      {/* ========================================================================= */}
      <div
        className="quotation-a4-sheet"
        style={{
          width: '100%',
          maxWidth: '840px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          padding: '1.75rem 2.25rem',
          borderRadius: '6px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.18)',
          boxSizing: 'border-box',
          position: 'relative',
          lineHeight: '1.4'
        }}
      >
        {/* HEADER: LOGO & THÔNG TIN DOANH NGHIỆP */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
          <div style={{ maxWidth: '62%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <div style={{ backgroundColor: '#2563eb', color: '#ffffff', width: '28px', height: '28px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem' }}>
                E
              </div>
              <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                CÔNG TY CỔ PHẦN CÔNG NGHỆ KLTN ERP
              </h2>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.45 }}>
              <div><strong>Trụ sở:</strong> Tòa nhà KLTN Innovation, Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM</div>
              <div><strong>MST:</strong> 0317896542 | <strong>Hotline:</strong> 1900 8899 | <strong>Email:</strong> purchasing@kltnerp.vn</div>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: '34%' }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.75rem', borderRadius: '5px', backgroundColor: '#f8fafc', textAlign: 'left', fontSize: '0.74rem', color: '#475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                <span>Số chứng từ:</span>
                <strong style={{ color: '#2563eb' }}>{poNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                <span>Ngày lập:</span>
                <strong style={{ color: '#0f172a' }}>{dateStr}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                <span>Mã tham chiếu:</span>
                <span>TC-2026/ERP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Hiệu lực báo giá:</span>
                <strong style={{ color: '#16a34a' }}>30 ngày</strong>
              </div>
            </div>
          </div>
        </div>

        {/* TIÊU ĐỀ CHÍNH CỦA VĂN BẢN */}
        <div style={{ textAlign: 'center', margin: '0.85rem 0' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            {documentTitle}
          </h1>
          <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
            {documentSubtitle}
          </p>
        </div>

        {/* THÔNG TIN BÊN MUA & BÊN BÁN (2 CỘT CÂN ĐỐI) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', backgroundColor: '#f8fafc', padding: '0.75rem 0.95rem', borderRadius: '5px', border: '1px solid #e2e8f0', marginBottom: '0.85rem', fontSize: '0.76rem' }}>
          <div style={{ paddingRight: '0.4rem', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '0.3rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'inline-block' }}></span>
              [BÊN A] ĐƠN VỊ MUA HÀNG
            </div>
            <div style={{ marginBottom: '0.15rem' }}><strong>Công ty:</strong> CÔNG TY CP CÔNG NGHỆ KLTN ERP</div>
            <div style={{ marginBottom: '0.15rem' }}><strong>Đại diện:</strong> Ông/Bà <strong>Nguyễn Văn An</strong> (Tổng Giám Đốc)</div>
            <div style={{ marginBottom: '0.15rem' }}><strong>Người liên hệ:</strong> Phòng Thu Mua & Cung Ứng Vật Tư</div>
            <div><strong>Địa điểm giao hàng:</strong> Tổng Kho KLTN - Quận 7, TP.HCM</div>
          </div>

          <div style={{ paddingLeft: '0.4rem' }}>
            <div style={{ fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '0.3rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }}></span>
              [BÊN B] ĐƠN VỊ CUNG ỨNG (NHÀ CUNG CẤP)
            </div>
            <div style={{ marginBottom: '0.15rem' }}><strong>Đơn vị cung ứng:</strong> <strong>{supplierName}</strong></div>
            <div style={{ marginBottom: '0.15rem' }}><strong>Mã Số Thuế:</strong> {supplierTax}</div>
            <div style={{ marginBottom: '0.15rem' }}><strong>Điện thoại:</strong> {supplierPhone} | <strong>Email:</strong> {supplierEmail}</div>
            <div><strong>Địa chỉ:</strong> {supplierAddress}</div>
          </div>
        </div>

        {/* BẢNG CHI TIẾT DANH MỤC LINH KIỆN */}
        <div style={{ marginBottom: '0.85rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.77rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', width: '30px', fontWeight: 800 }}>STT</th>
                <th style={{ padding: '0.5rem 0.55rem', width: '115px', fontWeight: 800 }}>Mã Linh Kiện</th>
                <th style={{ padding: '0.5rem 0.65rem', fontWeight: 800 }}>Tên Hàng Hóa & Quy Cách Kỹ Thuật</th>
                <th style={{ padding: '0.5rem 0.35rem', textAlign: 'center', width: '45px', fontWeight: 800 }}>ĐVT</th>
                <th style={{ padding: '0.5rem 0.45rem', textAlign: 'center', width: '55px', fontWeight: 800 }}>Số Lượng</th>
                <th style={{ padding: '0.5rem 0.55rem', textAlign: 'right', width: '105px', fontWeight: 800 }}>Đơn Giá (VNĐ)</th>
                <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right', width: '120px', fontWeight: 800 }}>Thành Tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '0.45rem 0.55rem', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                    {it.sku}
                  </td>
                  <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600, color: '#0f172a' }}>
                    {it.displayName}
                  </td>
                  <td style={{ padding: '0.45rem 0.35rem', textAlign: 'center', color: '#475569' }}>
                    {it.unit}
                  </td>
                  <td style={{ padding: '0.45rem 0.45rem', textAlign: 'center', fontWeight: 800 }}>
                    {it.quantity}
                  </td>
                  <td style={{ padding: '0.45rem 0.55rem', textAlign: 'right', color: '#334155' }}>
                    {fmt(it.unitPrice)}
                  </td>
                  <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                    {fmt(it.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PHẦN TỔNG CỘNG THANH TOÁN & BẰNG CHỮ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem', gap: '1.25rem' }}>
          <div style={{ flex: '1', fontSize: '0.76rem', color: '#334155' }}>
            <div style={{ marginBottom: '0.25rem', fontWeight: 700, color: '#475569' }}>
              Số tiền viết bằng chữ:
            </div>
            <div style={{ fontStyle: 'italic', fontWeight: 700, color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '0.45rem 0.75rem', borderRadius: '5px', border: '1px dashed #bfdbfe', lineHeight: 1.35 }}>
              {wordsAmount}
            </div>
          </div>

          <div style={{ width: '42%', fontSize: '0.76rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
              <span style={{ color: '#64748b' }}>Cộng tiền hàng (chưa thuế):</span>
              <strong style={{ color: '#0f172a' }}>{fmt(subTotalBeforeVat)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
              <span style={{ color: '#64748b' }}>Thuế Giá Trị Gia Tăng (10%):</span>
              <span style={{ color: '#334155', fontWeight: 600 }}>{fmt(vatAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
              <span style={{ color: '#64748b' }}>Chiết khấu thương mại:</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>0 đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0 0', borderTop: '2px solid #0f172a', marginTop: '0.25rem', fontSize: '0.88rem', fontWeight: 900, color: '#dc2626' }}>
              <span>TỔNG CỘNG THANH TOÁN:</span>
              <span>{fmt(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* ĐIỀU KHOẢN GIAO HÀNG & THANH TOÁN CHUẨN ERP */}
        <div style={{ fontSize: '0.71rem', color: '#475569', lineHeight: 1.4, marginBottom: '0.85rem', backgroundColor: '#f8fafc', padding: '0.55rem 0.85rem', borderRadius: '5px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.15rem' }}>ĐIỀU KHOẢN THƯƠNG MẠI & NGHĨA VỤ:</div>
          <div>1. <strong>Giao hàng:</strong> Trong vòng 02 - 05 ngày làm việc kể từ thời điểm Tổng Giám Đốc phê duyệt đơn.</div>
          <div>2. <strong>Quy cách:</strong> 100% hàng mới chính hãng nguyên seal, tem NSX, vượt qua bài kiểm tra của Phòng Kiểm Định Chất Lượng.</div>
          <div>3. <strong>Thanh toán:</strong> Chuyển khoản ngân hàng trong vòng 30 ngày sau khi nhận đủ hàng, phiếu nhập kho GRN và hóa đơn GTGT.</div>
        </div>

        {/* KHU VỰC 4 CHỮ KÝ VÀ DẤU MỘC MINH CHỨNG */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '0.65rem', textAlign: 'center', fontSize: '0.73rem', position: 'relative', minHeight: '120px' }}>
          
          <div>
            <strong style={{ display: 'block', textTransform: 'uppercase', color: '#0f172a' }}>ĐẠI DIỆN NHÀ CUNG CẤP</strong>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>(Ký, họ tên & đóng dấu)</span>
            <div style={{ marginTop: '2.8rem', fontWeight: 700, color: '#0f172a' }}>{supplierName}</div>
          </div>

          <div>
            <strong style={{ display: 'block', textTransform: 'uppercase', color: '#0f172a' }}>TRƯỞNG PHÒNG THU MUA</strong>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>(Người đề xuất)</span>
            <div style={{ marginTop: '1.6rem', color: '#2563eb', fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '1.2rem', transform: 'rotate(-4deg)' }}>
              Trần Hoàng Long
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>Trần Hoàng Long</div>
          </div>

          <div>
            <strong style={{ display: 'block', textTransform: 'uppercase', color: '#0f172a' }}>KẾ TOÁN TRƯỞNG</strong>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>(Kiểm soát ngân sách)</span>
            <div style={{ marginTop: '1.6rem', color: '#0f766e', fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '1.2rem', transform: 'rotate(-3deg)' }}>
              Lê Thị Mai
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>Lê Thị Mai</div>
          </div>

          {/* Ô CHỮ KÝ CEO VÀ CON DẤU MỘC ĐỎ */}
          <div style={{ position: 'relative' }}>
            <strong style={{ display: 'block', textTransform: 'uppercase', color: '#1e3a8a' }}>TỔNG GIÁM ĐỐC</strong>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>(Phê duyệt chính thức)</span>

            {signedState ? (
              <div style={{ position: 'relative', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Con Dấu Tròn Đỏ Chuẩn Doanh Nghiệp */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    width: '115px',
                    height: '115px',
                    borderRadius: '50%',
                    border: '2.5px solid #dc2626',
                    outline: '1.5px dashed #dc2626',
                    outlineOffset: '-5px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    textAlign: 'center',
                    transform: 'rotate(-9deg)',
                    backgroundColor: 'rgba(254, 242, 242, 0.65)',
                    boxShadow: '0 0 6px rgba(220, 38, 38, 0.15)',
                    animation: 'stampPop 0.4s ease-out forwards',
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{ fontSize: '0.48rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3px', maxWidth: '85px', lineHeight: 1.1 }}>
                    CÔNG TY CP KLTN ERP
                  </div>
                  <div style={{ fontSize: '0.58rem', fontWeight: 900, margin: '1px 0', borderTop: '1px solid #dc2626', borderBottom: '1px solid #dc2626', padding: '1px 2px', letterSpacing: '0.3px' }}>
                    ★ ĐÃ PHÊ DUYỆT ★
                  </div>
                  <div style={{ fontSize: '0.46rem', fontWeight: 800 }}>
                    MST: 0317896542
                  </div>
                  <div style={{ fontSize: '0.42rem', color: '#991b1b' }}>
                    {dateStr}
                  </div>
                </div>

                {/* Chữ ký tay uốn lượn SVG */}
                <div style={{ marginTop: '1.2rem', zIndex: 1, color: '#1e3a8a', fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '1.35rem', transform: 'rotate(-6deg)' }}>
                  Nguyễn Văn An
                </div>
                <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
                  Nguyễn Văn An
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '2.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                (Chờ Tổng Giám Đốc ký duyệt)
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
