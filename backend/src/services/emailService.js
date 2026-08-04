const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../../logs');
if (!fs.existsSync(LOGS_DIR)) {
  try { fs.mkdirSync(LOGS_DIR, { recursive: true }); } catch (e) {}
}
const LOGS_FILE = path.join(LOGS_DIR, 'email_logs.json');

// Helper to save log
const logEmail = (emailData) => {
  try {
    let logs = [];
    if (fs.existsSync(LOGS_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8') || '[]');
    }
    logs.unshift(emailData);
    if (logs.length > 100) logs = logs.slice(0, 100);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('[EmailService] Error writing log file:', err);
  }
};

const getEmailLogs = () => {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8') || '[]');
    }
  } catch (err) {
    console.error('[EmailService] Error reading log file:', err);
  }
  return [];
};

// Map status to Vietnamese friendly label
const STATUS_LABELS = {
  'PENDING': 'Chờ Xử Lý',
  'WAITING_PAYMENT': 'Chờ Thanh Toán',
  'CONFIRMED': 'Đã Xác Nhận & Đủ Hàng',
  'PACKED': 'Đã Đóng Gói',
  'PROCESSING': 'Đang Lắp Ráp / Xử Lý',
  'AWAITING_STOCK': 'Tạm Giữ (Chờ Nhập Hàng)',
  'READY_TO_SHIP': 'Sẵn Sàng Giao Hàng',
  'SHIPPED': 'Đang Vận Chuyển',
  'DELIVERED': 'Đã Giao Hàng Thành Công',
  'COMPLETED': 'Hoàn Tất Đơn Hàng',
  'CANCELLED': 'Đã Hủy Đơn Hàng',
  'FAILED_DELIVERY': 'Giao Thất Bại',
  'RETURN_REQUESTED': 'Yêu Cầu Đổi / Trả',
  'RETURNING': 'Đang Thu Hồi Hàng',
  'RETURNED': 'Đã Nhận Hàng Hoàn',
  'REFUNDED': 'Đã Hoàn Tiền'
};

// Create nodemailer transporter - supports Gmail App Password & generic SMTP
const getTransporter = () => {
  // Option 1: Gmail with App Password (GMAIL_USER + GMAIL_APP_PASSWORD)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') // Remove spaces from App Password
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }
  // Option 2: Generic SMTP (SMTP_HOST + SMTP_USER)
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

// Get the sender email address
const getSenderEmail = () => {
  return process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@aether-erp.vn';
};


/**
 * Gửi email xác nhận đơn hàng khi khách hàng hoàn tất thanh toán/đặt hàng
 */
const sendOrderConfirmationEmail = async ({ toEmail, customerName, orderId, items, totalAmount, paymentMethod, shippingAddress }) => {
  const formattedTotal = Number(totalAmount).toLocaleString('vi-VN') + ' đ';
  
  const itemsHtml = (items || []).map((item, idx) => {
    const price = Number(item.price || item.totalPrice || 0);
    const qty = Number(item.quantity || 1);
    const itemTotal = price * qty;
    const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    return `
      <tr style="background-color: ${bgRow}; border-bottom: 1px solid #edf2f7;">
        <td style="padding: 12px 10px; color: #0f172a; font-weight: 600; font-size: 13px; line-height: 1.4; word-break: break-word;">
          ${item.name || item.productName || 'Linh kiện máy tính'}
          ${item.selectedSpec ? `<div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">Cấu hình: ${typeof item.selectedSpec === 'object' ? JSON.stringify(item.selectedSpec) : item.selectedSpec}</div>` : ''}
        </td>
        <td style="padding: 12px 6px; text-align: center; color: #475569; font-weight: 700; font-size: 13px; white-space: nowrap;">x${qty}</td>
        <td style="padding: 12px 10px; text-align: right; color: #334155; font-size: 12.5px; white-space: nowrap;">${price.toLocaleString('vi-VN')} đ</td>
        <td style="padding: 12px 10px; text-align: right; color: #2563eb; font-weight: 800; font-size: 13px; white-space: nowrap;">${itemTotal.toLocaleString('vi-VN')} đ</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác nhận đơn hàng #${orderId}</title>
      <style>
        @media only screen and (max-width: 480px) {
          .email-card { border-radius: 12px !important; margin: 0 auto !important; width: 100% !important; }
          .header-banner { padding: 24px 14px !important; }
          .header-title { font-size: 19px !important; }
          .body-content { padding: 18px 14px !important; }
          .summary-table td { padding: 4px 0 !important; font-size: 12.5px !important; }
          .total-box { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; text-align: left !important; }
          .total-amount { font-size: 20px !important; }
          .cta-btn { padding: 12px 20px !important; font-size: 13px !important; width: 100% !important; box-sizing: border-box !important; display: block !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 16px 8px; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <div class="email-card" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); border: 1px solid #e2e8f0;">
        
        <!-- Header Banner with Super High Contrast Badge -->
        <div class="header-banner" style="background: linear-gradient(135deg, #1d4ed8 0%, #1e293b 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; background-color: #ffffff; color: #1e3a8a; border: 1px solid #93c5fd; padding: 4px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
            ⚡ AETHER COMPUTER ERP
          </div>
          <h1 class="header-title" style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.3px; color: #ffffff; line-height: 1.3;">
            XÁC NHẬN ĐƠN HÀNG THÀNH CÔNG
          </h1>
          <p style="margin: 6px 0 0 0; color: #e2e8f0; font-size: 13px;">Cảm ơn bạn đã lựa chọn mua sắm tại Aether PC!</p>
        </div>

        <!-- Body Content -->
        <div class="body-content" style="padding: 24px 20px;">
          
          <p style="font-size: 14.5px; color: #1e293b; margin-top: 0; line-height: 1.5;">
            Xin chào <strong style="color: #0f172a;">${customerName || 'Quý khách hàng'}</strong>,
          </p>
          <p style="font-size: 13.5px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
            Đơn hàng <strong style="color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 6px; border: 1px solid #dbeafe;">#${orderId}</strong> của bạn đã được ghi nhận thành công và đang được bộ phận Kho &amp; Bán hàng xử lý.
          </p>

          <!-- Order Summary Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #2563eb; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              📋 Thông Tin Đơn Hàng
            </div>
            <table class="summary-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="color: #64748b; padding: 4px 0; width: 38%;">Mã đơn hàng:</td>
                <td style="font-weight: 800; color: #0f172a; text-align: right;">#${orderId}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Thời gian:</td>
                <td style="font-weight: 600; color: #334155; text-align: right;">${new Date().toLocaleString('vi-VN')}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Thanh toán:</td>
                <td style="font-weight: 700; color: #0f172a; text-align: right;">
                  ${paymentMethod === 'BANK_TRANSFER' ? '<span style="color:#0284c7;">Chuyển khoản VietQR</span>' : '<span style="color:#16a34a;">COD (Tiền mặt)</span>'}
                </td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Địa chỉ nhận:</td>
                <td style="font-weight: 600; color: #0f172a; text-align: right; word-break: break-word;">${shippingAddress || 'TP. Hồ Chí Minh'}</td>
              </tr>
            </table>
          </div>

          <!-- Product Table (Mobile Fluid Responsive) -->
          <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
            📦 Danh Sách Sản Phẩm Đặt Mua
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow-x: auto; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; min-width: 100%;">
              <thead>
                <tr style="background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">
                  <th style="padding: 9px 10px; text-align: left;">Sản phẩm</th>
                  <th style="padding: 9px 6px; text-align: center; width: 35px;">SL</th>
                  <th style="padding: 9px 10px; text-align: right; width: 85px;">Đơn giá</th>
                  <th style="padding: 9px 10px; text-align: right; width: 95px;">Tổng</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Grand Total Table (100% Email Client Compatible Layout) -->
          <table style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1.5px solid #bbf7d0; border-radius: 12px; margin-bottom: 22px;">
            <tr>
              <td style="padding: 16px 18px; vertical-align: middle;">
                <div style="font-size: 11.5px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.8px;">TỔNG CỘNG THANH TOÁN</div>
                <div style="font-size: 11px; color: #15803d; margin-top: 2px;">(Đã bao gồm VAT &amp; phí vận chuyển)</div>
              </td>
              <td style="padding: 16px 18px; text-align: right; vertical-align: middle; white-space: nowrap;">
                <div style="font-size: 22px; font-weight: 900; color: #dc2626; letter-spacing: -0.5px;">
                  ${formattedTotal}
                </div>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 24px 0 8px 0;">
            <a href="http://localhost:3000/my-orders" class="cta-btn" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 800; font-size: 13.5px; padding: 13px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 6px 16px rgba(37,99,235,0.25);">
              Tra Cứu Đơn Hàng Ngay →
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 20px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
          <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">AETHER COMPUTER JOINT STOCK COMPANY</p>
          <p style="margin: 0 0 3px 0;">📞 Hotline CSKH: <strong style="color: #2563eb;">1900 6868</strong> | ✉️ Email: <strong style="color: #2563eb;">support@aether-erp.vn</strong></p>
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">Giờ làm việc: 8:00 - 21:00 (Tất cả các ngày trong tuần)</p>
        </div>

      </div>
    </body>
    </html>
  `;

  const emailData = {
    id: `MAIL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    type: 'ORDER_CONFIRMATION',
    toEmail: toEmail || 'khachhang@gmail.com',
    customerName: customerName || 'Khách hàng',
    orderId,
    subject: `[Aether ERP] Xác nhận đơn hàng thành công #${orderId}`,
    html: htmlContent,
    sentAt: new Date().toISOString()
  };

  logEmail(emailData);

  const transporter = getTransporter();
  if (transporter) {
    try {
      const senderEmail = getSenderEmail();
      await transporter.sendMail({
        from: `"AetherPC - Hệ Thống ERP" <${senderEmail}>`,
        to: emailData.toEmail,
        subject: emailData.subject,
        html: htmlContent
      });
      console.log(`[EmailService] ✅ Gửi email xác nhận đơn hàng #${orderId} tới ${emailData.toEmail} thành công!`);
    } catch (err) {
      console.error('[EmailService] ❌ Lỗi gửi email:', err.message);
      if (err.message.includes('Invalid login') || err.message.includes('Username and Password')) {
        console.error('[EmailService] Gợi ý: Hãy kiểm tra lại GMAIL_USER và GMAIL_APP_PASSWORD trong file .env');
      }
    }
  } else {
    console.log(`[EmailService] ⚠️ Chưa cài SMTP. Email xác nhận đơn hàng ${orderId} đã được log vào file.`);
  }

  return emailData;
};

/**
 * Gửi email thông báo cập nhật trạng thái đơn hàng (CONFIRMED, SHIPPED, DELIVERED, CANCELLED,...)
 */
const sendOrderStatusUpdateEmail = async ({ toEmail, customerName, orderId, status, note, items, totalAmount }) => {
  const statusVN = STATUS_LABELS[status] || status;
  const formattedTotal = totalAmount ? (Number(totalAmount).toLocaleString('vi-VN') + ' đ') : '';

  let statusBg = '#eff6ff';
  let statusColor = '#2563eb';
  let statusBorder = '#bfdbfe';
  let statusIcon = '🔄';

  if (['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(status)) {
    statusBg = '#ecfdf5';
    statusColor = '#059669';
    statusBorder = '#a7f3d0';
    statusIcon = '🚚';
  } else if (['CANCELLED', 'FAILED_DELIVERY'].includes(status)) {
    statusBg = '#fef2f2';
    statusColor = '#dc2626';
    statusBorder = '#fecaca';
    statusIcon = '❌';
  } else if (['AWAITING_STOCK', 'WAITING_PAYMENT'].includes(status)) {
    statusBg = '#fffbe6';
    statusColor = '#d97706';
    statusBorder = '#fef08a';
    statusIcon = '⏳';
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cập nhật trạng thái đơn hàng #${orderId}</title>
      <style>
        @media only screen and (max-width: 480px) {
          .email-card { border-radius: 12px !important; width: 100% !important; }
          .header-banner { padding: 24px 14px !important; }
          .header-title { font-size: 19px !important; }
          .body-content { padding: 18px 14px !important; }
          .cta-btn { padding: 12px 20px !important; font-size: 13px !important; width: 100% !important; box-sizing: border-box !important; display: block !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 16px 8px; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <div class="email-card" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); border: 1px solid #e2e8f0;">
        
        <!-- Header Banner with Super High Contrast Badge -->
        <div class="header-banner" style="background: linear-gradient(135deg, #1d4ed8 0%, #1e293b 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; background-color: #ffffff; color: #1e3a8a; border: 1px solid #93c5fd; padding: 4px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
            ⚡ AETHER COMPUTER ERP
          </div>
          <h1 class="header-title" style="margin: 0; font-size: 21px; font-weight: 900; letter-spacing: -0.3px; color: #ffffff; line-height: 1.3;">
            CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
          </h1>
          <p style="margin: 6px 0 0 0; color: #e2e8f0; font-size: 13px;">Hành trình đơn hàng của bạn được cập nhật realtime</p>
        </div>

        <!-- Body Content -->
        <div class="body-content" style="padding: 24px 20px;">
          
          <p style="font-size: 14.5px; color: #1e293b; margin-top: 0; line-height: 1.5;">
            Xin chào <strong style="color: #0f172a;">${customerName || 'Quý khách hàng'}</strong>,
          </p>
          <p style="font-size: 13.5px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
            Đơn hàng <strong style="color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 6px; border: 1px solid #dbeafe;">#${orderId}</strong> vừa có tiến trình cập nhật trạng thái mới nhất:
          </p>

          <!-- Status Highlight Card -->
          <div style="background-color: ${statusBg}; border: 1.5px solid ${statusBorder}; border-radius: 14px; padding: 20px 16px; text-align: center; margin-bottom: 20px;">
            <div style="font-size: 30px; margin-bottom: 4px;">${statusIcon}</div>
            <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Trạng Thái Mới Nhất</div>
            <div style="font-size: 21px; font-weight: 900; color: ${statusColor}; margin-top: 3px; letter-spacing: -0.3px;">${statusVN}</div>
            ${note ? `<div style="margin-top: 10px; font-size: 13px; color: #334155; font-style: italic; background: rgba(255,255,255,0.7); padding: 8px 12px; border-radius: 8px; border: 1px solid ${statusBorder};">"${note}"</div>` : ''}
          </div>

          <!-- Metadata Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #64748b; padding: 4px 0; width: 40%;">Mã đơn hàng:</td>
                <td style="font-weight: 800; color: #0f172a; text-align: right;">#${orderId}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Thời gian:</td>
                <td style="font-weight: 600; color: #334155; text-align: right;">${new Date().toLocaleString('vi-VN')}</td>
              </tr>
              ${formattedTotal ? `
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Tổng tiền đơn hàng:</td>
                <td style="font-weight: 800; color: #2563eb; text-align: right;">${formattedTotal}</td>
              </tr>` : ''}
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 24px 0 8px 0;">
            <a href="http://localhost:3000/my-orders" class="cta-btn" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 800; font-size: 13.5px; padding: 13px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 6px 16px rgba(37,99,235,0.25);">
              Xem Chi Tiết Đơn Hàng →
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 20px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
          <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">AETHER COMPUTER JOINT STOCK COMPANY</p>
          <p style="margin: 0 0 3px 0;">📞 Hotline CSKH: <strong style="color: #2563eb;">1900 6868</strong> | ✉️ Email: <strong style="color: #2563eb;">support@aether-erp.vn</strong></p>
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">Giờ làm việc: 8:00 - 21:00 (Tất cả các ngày trong tuần)</p>
        </div>

      </div>
    </body>
    </html>
  `;

  const emailData = {
    id: `MAIL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    type: 'STATUS_UPDATE',
    toEmail: toEmail || 'khachhang@gmail.com',
    customerName: customerName || 'Khách hàng',
    orderId,
    status,
    statusVN,
    subject: `[Aether ERP] Cập nhật trạng thái đơn hàng #${orderId}: ${statusVN}`,
    html: htmlContent,
    sentAt: new Date().toISOString()
  };

  logEmail(emailData);

  const transporter = getTransporter();
  if (transporter) {
    try {
      const senderEmail = getSenderEmail();
      await transporter.sendMail({
        from: `"AetherPC - Hệ Thống ERP" <${senderEmail}>`,
        to: emailData.toEmail,
        subject: emailData.subject,
        html: htmlContent
      });
      console.log(`[EmailService] ✅ Gửi email cập nhật trạng thái #${orderId} → ${statusVN} tới ${emailData.toEmail} thành công!`);
    } catch (err) {
      console.error('[EmailService] ❌ Lỗi gửi email cập nhật trạng thái:', err.message);
    }
  } else {
    console.log(`[EmailService] ⚠️ Chưa cài SMTP. Email cập nhật trạng thái đơn ${orderId} đã được log.`);
  }

  return emailData;
};

/**
 * Gửi email chào mừng khi khách hàng đăng ký tài khoản thành công
 */
const sendWelcomeEmail = async ({ toEmail, customerName }) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Chào mừng bạn đến với Aether Computer ERP</title>
      <style>
        @media only screen and (max-width: 480px) {
          .email-card { border-radius: 12px !important; width: 100% !important; }
          .header-banner { padding: 24px 14px !important; }
          .header-title { font-size: 19px !important; }
          .body-content { padding: 18px 14px !important; }
          .cta-btn { padding: 12px 20px !important; font-size: 13px !important; width: 100% !important; box-sizing: border-box !important; display: block !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 16px 8px; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div class="email-card" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); border: 1px solid #e2e8f0;">
        
        <!-- Header Banner -->
        <div class="header-banner" style="background: linear-gradient(135deg, #1d4ed8 0%, #1e293b 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; background-color: #ffffff; color: #1e3a8a; border: 1px solid #93c5fd; padding: 4px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 12px;">
            ⚡ AETHER COMPUTER ERP
          </div>
          <h1 class="header-title" style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
            CHÀO MỪNG THÀNH VIÊN MỚI!
          </h1>
          <p style="margin: 6px 0 0 0; color: #e2e8f0; font-size: 13px;">Tài khoản mua sắm của bạn đã được khởi tạo thành công</p>
        </div>

        <!-- Body Content -->
        <div class="body-content" style="padding: 24px 20px;">
          <p style="font-size: 14.5px; color: #1e293b; margin-top: 0;">
            Xin chào <strong style="color: #0f172a;">${customerName || 'Quý khách hàng'}</strong>,
          </p>
          <p style="font-size: 13.5px; color: #475569; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký tài khoản tại <strong>Aether Computer ERP</strong>. Bây giờ bạn có thể trải nghiệm mua sắm linh kiện máy tính cao cấp, tích lũy điểm thưởng thành viên và theo dõi tiến trình đơn hàng realtime!
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: #2563eb; margin-bottom: 8px;">
              🎁 Đặc Quyền Thành Viên Của Bạn:
            </div>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.7;">
              <li>Tích lũy 1 điểm cho mỗi 10.000đ chi tiêu (nâng hạng Bạc, Vàng, Kim Cương).</li>
              <li>Nhận mã giảm giá độc quyền dành riêng cho thành viên.</li>
              <li>Nhận email tự động cập nhật tiến trình đóng gói &amp; giao hàng tức thì.</li>
              <li>Yêu cầu bảo hành &amp; đổi trả 1-click dễ dàng.</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 24px 0 8px 0;">
            <a href="http://localhost:3000" class="cta-btn" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 800; font-size: 13.5px; padding: 13px 28px; border-radius: 10px; text-decoration: none;">
              Khám Phá Sản Phẩm Ngay →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 20px; text-align: center; color: #64748b; font-size: 12px;">
          <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">AETHER COMPUTER JOINT STOCK COMPANY</p>
          <p style="margin: 0;">📞 Hotline: <strong style="color: #2563eb;">1900 6868</strong> | ✉️ Support: <strong style="color: #2563eb;">support@aether-erp.vn</strong></p>
        </div>

      </div>
    </body>
    </html>
  `;

  const emailData = {
    id: `MAIL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    type: 'WELCOME',
    toEmail: toEmail || 'khachhang@gmail.com',
    customerName: customerName || 'Khách hàng',
    subject: `[Aether ERP] Chào mừng ${customerName || 'thành viên mới'} đến với Aether PC!`,
    html: htmlContent,
    sentAt: new Date().toISOString()
  };

  logEmail(emailData);

  const transporter = getTransporter();
  if (transporter) {
    try {
      const senderEmail = getSenderEmail();
      await transporter.sendMail({
        from: `"AetherPC - Hệ Thống ERP" <${senderEmail}>`,
        to: emailData.toEmail,
        subject: emailData.subject,
        html: htmlContent
      });
      console.log(`[EmailService] ✅ Gửi email chào mừng thành công tới ${emailData.toEmail}`);
    } catch (err) {
      console.error('[EmailService] ❌ Lỗi gửi email chào mừng:', err.message);
    }
  }

  return emailData;
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendWelcomeEmail,
  getEmailLogs
};
