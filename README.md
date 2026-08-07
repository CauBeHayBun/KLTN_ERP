# Xây Dựng Hệ Thống Quản Trị Doanh Nghiệp (ERP) Thông Minh Tích Hợp Trí Tuệ Nhân Tạo (AI) Và WebSocket Realtime Trong Quản Lý Và Lắp Ráp Máy Tính

> **Dự án Khóa Luận Tốt Nghiệp (KLTN) — Trường Đại Học Công Nghiệp TP. Hồ Chí Minh (IUH)**  
> **Chuyên Ngành**: Hệ Thống Thông Tin — Khoa Công Nghệ Thông Tin  
> **Tên Đề Tài**: Xây dựng Hệ thống ERP Quản lý Bán lẻ Linh kiện Máy tính kết hợp Website Thương mại Điện tử, Trợ lý AI và Kênh Chat CSKH Realtime bằng WebSocket (**AetherPC ERP & Storefront**).

---

## 📋 MỤC LỤC

1. [🌟 1. Tổng Quan Hệ Thống & Bối Cảnh Đề Tài](#-1-tổng-quan-hệ-thống--bối-cảnh-đề-tài)
2. [🏗️ 2. Kiến Trúc Hệ Thống & Sơ Đồ Khối (System Architecture)](#️-2-kiến-trúc-hệ-thống--sơ-đồ-khối-system-architecture)
3. [👥 3. Danh Sách 14 Actors & Ma Trận Phân Quyền (RBAC Matrix)](#-3-danh-sách-14-actors--ma-trận-phân-quyền-rbac-matrix)
4. [🔄 4. Mô Tả Chi Tiết Quy Trình Vận Hành Các Phân Hệ (Workflow Processes)](#-4-mô-tả-chi-tiết-quy-trình-vận-hành-các-phân-hệ-workflow-processes)
5. [💎 5. Mô Tả Chi Tiết Tính Năng 11 Phân Hệ ERP & Storefront](#-5-mô-tả-chi-tiết-tính-năng-11-phân-hệ-erp--storefront)
6. [📐 6. Thuật Toán & Công Thức Toán Học Trong Hệ Thống](#-6-thuật-toán--công-thức-toán-học-trong-hệ-thống)
7. [🔌 7. Danh Mục RESTful APIs & WebSocket Protocol](#-7-danh-mục-restful-apis--websocket-protocol)
8. [🧪 8. Bộ Kịch Bản Kiểm Thử Chi Tiết (Comprehensive Test Suite)](#-8-bộ-kịch-bản-kiểm-thử-chi-tiết-comprehensive-test-suite)
9. [💻 9. Công Nghệ Sử Dụng (Tech Stack)](#-9-công-nghệ-sử-dụng-tech-stack)
10. [📂 10. Cấu Trúc Thư Mục Dự Án (Project Structure)](#-10-cấu-trúc-thư-mục-dự-án-project-structure)
11. [🚀 11. Hướng Dẫn Khởi Chạy Hệ Thống (Deployment)](#-11-hướng-dẫn-khởi-chạy-hệ-thống-deployment)
12. [🔑 12. Danh Sách 14 Tài Khoản Demo Hệ Thống](#-12-danh-sách-14-tài-khoản-demo-hệ-thống)

---

## 🌟 1. Tổng Quan Hệ Thống & Bối Cảnh Đề Tài

Thị trường kinh doanh linh kiện máy tính và lắp ráp PC theo yêu cầu (Custom PC / Gaming Workstation) tại Việt Nam đòi hỏi khả năng xử lý dữ liệu phức tạp: hàng ngàn mã sản phẩm (SKU) với thông số kỹ thuật đa dạng (Socket CPU, Bus RAM, Form Factor Mainboard, Công suất TDP), biến động giá liên tục từ nhiều Nhà cung cấp, cùng các dịch vụ giá trị gia tăng như lắp ráp kỹ thuật, bảo hành và chăm sóc khách hàng.

**AetherPC ERP** được nghiên cứu và phát triển nhằm giải quyết triệt để các thách thức trên thông qua một **Hệ thống ERP Hợp nhất (Unified Enterprise Resource Planning)**, kết nối trực tiếp **Website Thương mại Điện tử (E-Commerce Storefront)**, **Trợ lý AI Tự động hóa (Google Gemini AI SDK)** và **Kênh Chat CSKH Realtime (WebSocket Server)**.

### 🎯 Các Mục Tiêu Cốt Lõi:
1. **Tự động hóa luồng Procure-to-Pay (P2P)**: Đánh giá và chọn báo giá Nhà cung cấp tối ưu nhất bằng Thuật toán Ma trận Giá ($P_{\text{save}}$).
2. **Chuẩn hóa luồng Order-to-Cash (O2C)**: Tích hợp bán lẻ POS tại quầy, thanh toán QR Code VietQR, quy trình lắp ráp PC 5 bước kỹ thuật và giao hàng có minh chứng thực tế (Proof of Delivery).
3. **Chăm sóc khách hàng Realtime**: Xây dựng server WebSocket hai chiều hai kênh ($< 1\text{ms}$), phân định lịch sử trò chuyện độc lập theo từng tài khoản (`session_user_<slug>`).
4. **Quản trị Tài chính & Nhân sự**: Tính lương tự động theo 26 ngày công chuẩn Việt Nam, khấu trừ $10.5\%$ bảo hiểm và hạch toán Sổ Nhật ký Tài chính VAS.

---

## 🏗️ 2. Kiến Trúc Hệ Thống & Sơ Đồ Khối (System Architecture)

Hệ thống thiết kế theo kiến trúc 3 tầng (3-Tier Architecture) hiện đại, đảm bảo tính mở rộng, bảo mật và hiệu năng cao.

```mermaid
graph TD
    subgraph Tầng Trình Biểu (Presentation Layer)
        UI1[E-Commerce Storefront / AI PC Builder]
        UI2[Sales POS / Thu Ngân]
        UI3[Admin ERP Dashboard 11 Phân Hệ]
        UI4[Supplier Portal Cổng Báo Giá]
    end

    subgraph Tầng Xử Lý Nghiệp Vụ (Application / Backend Layer)
        API[Express.js RESTful API Server]
        WS[WebSocket Server /ws/cskh]
        AI[Google Gemini AI Engine & Knowledge Base]
        SCH[Order & Stock Scheduler]
    end

    subgraph Tầng Dữ Liệu & Tích Hợp (Data & Integration Layer)
        DB[(PostgreSQL Database)]
        ORM[Prisma ORM Client v6.19.3]
        SMTP[Nodemailer SMTP Gmail Service]
        QR[VietQR Payment Gateway]
    end

    UI1 <-->|HTTPS / REST API| API
    UI1 <-->|WebSocket Realtime| WS
    UI2 <-->|HTTPS / REST API| API
    UI3 <-->|HTTPS / REST API| API
    UI3 <-->|WebSocket CSKH Staff| WS
    UI4 <-->|HTTPS / REST API| API

    API <--> ORM <--> DB
    API <--> AI
    API <--> SMTP
    API <--> QR
    SCH <--> ORM
```

---

## 👥 3. Danh Sách 14 Actors & Ma Trận Phân Quyền (RBAC Matrix)

Hệ thống triển khai cơ chế Phân quyền dựa trên Vai trò (Role-Based Access Control - RBAC) nghiêm ngặt với 14 nhóm người dùng:

| STT | Mã Vai Trò (Role) | Chức Danh Phân Nhiệm | Mô Tả Quyền Hạn & Chức Năng Chi Tiết |
| :---: | :--- | :--- | :--- |
| 1 | **`ceo`** | Giám Đốc Điều Hành (CEO) | Quyền tối cao: Xem Executive Dashboard realtime, duyệt báo giá Mua hàng PO, duyệt giải ngân Bảng lương hàng tháng. |
| 2 | **`admin`** | Quản Trị Hệ Thống | Cấu hình hệ thống, quản lý tài khoản người dùng, xem nhật ký truy cập Audit Logs, cấp lại mật khẩu. |
| 3 | **`sales_manager`** | Quản Lý Bán Hàng | Quản lý danh mục đơn hàng bán lẻ POS & E-Commerce, duyệt hủy đơn, xem phân tích biểu đồ doanh số. |
| 4 | **`sales`** | Nhân Viên Bán Hàng POS | Bán hàng tại quầy, tìm kiếm/quét mã vạch sản phẩm, in hóa đơn thu ngân, nhận thanh toán VietQR. |
| 5 | **`warehouse_manager`**| Quản Lý Kho Bãi | Quản lý 1.580 mã linh kiện PC, kiểm kê tồn kho, thiết lập ngưỡng an toàn (Safe/Warning/Out of stock). |
| 6 | **`warehouse`** | Thủ Kho | Thực hiện Phiếu nhập kho (GRN) từ PO mua hàng, Phiếu xuất kho linh kiện cho đơn bán lẻ và đơn lắp ráp. |
| 7 | **`purchasing`** | Nhân Viên Mua Hàng | Khởi tạo Yêu cầu Báo giá (RFQ) gửi đa NCC, xem Ma trận So sánh Báo giá, sinh đơn Mua hàng PO. |
| 8 | **`supplier`** | Cổng Nhà Cung Cấp (Portal) | Truy cập Supplier Portal tiếp nhận RFQ từ AetherPC, nhập đơn giá và cam kết ngày giao hàng. |
| 9 | **`assembly`** | Kỹ Thuật Viên Lắp Ráp | Nhận Job lắp ráp PC bộ, thực hiện Quy trình Checklist 5 bước kỹ thuật (Socket, Tản nhiệt, Đi dây, BIOS, Stress Test). |
| 10 | **`hr`** | Quản Lý Nhân Sự | Quản lý hồ sơ nhân viên, tính bảng lương tự động hàng tháng (Khấu trừ $10.5\%$ bảo hiểm, thưởng Sales $1\%$, thưởng lắp ráp $150k$). |
| 11 | **`accounting`** | Kế Toán Tài Chính | Quản lý Sổ Nhật ký Tài chính VAS (`INCOME`/`EXPENSE`), kiểm tra hóa đơn NCC (Vendor Bill), báo cáo P&L. |
| 12 | **`cskh`** | Chăm Sóc Khách Hàng | Quản lý Ticket bảo hành, tư vấn Live Chat WebSocket thời gian thực với khách hàng, duyệt Yêu cầu Đổi trả. |
| 13 | **`delivery`** | Nhân Viên Giao Hàng | Nhận đơn vận chuyển, tải ảnh minh chứng thực tế (`FileReader` Base64) khi giao thành công, ghi nhận 6 lý do thất bại. |
| 14 | **`customer`** | Khách Hàng Cuối (Online) | Mua sắm linh kiện, tự cấu hình PC với AI kiểm tra xung đột phần cứng, tra cứu vận đơn, chat tư vấn với CSKH. |

---

## 🔄 4. Mô Tả Chi Tiết Quy Trình Vận Hành Các Phân Hệ (Workflow Processes)

### 4.1. Quy Trình Mua Hàng & So Sánh Báo Giá NCC (Procure-to-Pay — P2P)

```mermaid
sequenceDiagram
    autonumber
    actor NV Kho/Mua Hàng
    actor NCC (Supplier Portal)
    actor CEO (Giám Đốc)
    actor Thủ Kho
    actor Kế Toán

    NV Kho/Mua Hàng->>NCC (Supplier Portal): Tạo Yêu cầu Báo giá (RFQ) cho linh kiện thiếu hụt
    NCC (Supplier Portal)->>Hệ Thống ERP: Gửi Báo giá chi tiết (Đơn giá, ngày giao)
    Hệ Thống ERP->>CEO (Giám Đốc): Tổng hợp Ma trận So sánh Báo giá & Badge ★ BÁO GIÁ RẺ NHẤT
    CEO (Giám Đốc)->>Hệ Thống ERP: Phê duyệt Báo giá tối ưu -> Sinh Đơn mua hàng (PO)
    Hệ Thống ERP->>Thủ Kho: Thông báo tạo Phiếu Nhập Kho (GRN)
    Thủ Kho->>Hệ Thống ERP: Kiểm đếm linh kiện & Nhập kho (Tăng tồn kho)
    Hệ Thống ERP->>Kế Toán: Gửi Hóa đơn Mua hàng (Vendor Bill) -> Lập bút toán Chi (EXPENSE)
```

1. **Phát hiện nhu cầu**: Tồn kho linh kiện $\le 5$ tự động cảnh báo `WARNING`. Nhân viên Mua hàng (`purchasing`) khởi tạo **Yêu cầu Báo giá (RFQ)** tới 2+ Nhà cung cấp.
2. **Nhập báo giá trực tuyến**: Các Nhà cung cấp (`supplier`) truy cập **Supplier Portal** điền đơn giá và ngày giao hàng.
3. **Phân tích Ma trận Giá**: Hệ thống tự động so sánh báo giá, hiển thị phần trăm tiết kiệm $P_{\text{save}}$ và gắn nhãn `★ BÁO GIÁ RẺ NHẤT`.
4. **Phê duyệt PO & Nhập kho GRN**: CEO (`ceo`) phê duyệt -> Chuyển thành Đơn mua hàng (PO) chính thức. Thủ kho (`warehouse`) tạo Phiếu nhập kho (GRN) và cập nhật số lượng tồn.
5. **Thanh toán & Hạch toán**: Kế toán (`accounting`) kiểm tra khớp 3 bên (PO - GRN - Bill) và lập bút toán Chi (`EXPENSE`) vào Sổ Nhật ký Tài chính VAS.

---

### 4.2. Quy Trình Bán Hàng, Lắp Ráp & Giao Hàng (Order-to-Cash — O2C)

```mermaid
sequenceDiagram
    autonumber
    actor Khách Hàng / POS
    actor Kỹ Thuật Viên
    actor Shipper (Delivery)
    actor Kế Toán

    Khách Hàng / POS->>Hệ Thống ERP: Đặt đơn hàng linh kiện / PC bộ (POS / Storefront)
    Hệ Thống ERP->>Kỹ Thuật Viên: Tự động sinh Job Lắp Ráp (nếu có máy bộ/nhiều linh kiện)
    Kỹ Thuật Viên->>Hệ Thống ERP: Thực hiện Checklist 5 bước -> Bấm "Hoàn Tất Lắp Ráp"
    Hệ Thống ERP->>Shipper (Delivery): Chuyển đơn sang trạng thái sẵn sàng giao (READY_TO_SHIP)
    Shipper (Delivery)->>Hệ Thống ERP: Giao hàng & Tải ảnh minh chứng thực tế (Base64) -> DELIVERED
    Hệ Thống ERP->>Kế Toán: Tự động ghi nhận Bút toán Thu (INCOME) vào Sổ Kế Toán
```

1. **Khởi tạo đơn hàng**: Khách hàng đặt mua trực tuyến hoặc Thu ngân lập đơn POS tại quầy.
2. **Khởi tạo Lệnh Lắp Ráp**: Đơn hàng chứa máy bộ tự động sinh Job cho Kỹ thuật viên (`assembly`).
3. **Thực hiện Checklist 5 Bước Kỹ Thuật**:
   - **Bước 1**: Kiểm tra tương thích Socket CPU (LGA1700, AM5) & Mainboard.
   - **Bước 2**: Tra keo tản nhiệt tiêu chuẩn & lắp đặt tản nhiệt.
   - **Bước 3**: Đi dây nguồn (Cable Management) gọn gàng trong Case.
   - **Bước 4**: Cấu hình BIOS & Boot thử nghiệm hệ điều hành.
   - **Bước 5**: Chạy Stress Test kiểm tra nhiệt độ CPU/GPU & độ ổn định.
4. **Giao hàng & Minh chứng**: Shipper (`delivery`) tiếp nhận đơn, thực hiện giao hàng và tải ảnh minh chứng thực tế (`FileReader` Base64) kèm ghi chú người nhận.
5. **Hạch toán doanh thu**: Kế toán ghi nhận bút toán Thu (`INCOME`) vào Sổ Nhật ký Tài chính.

---

### 4.3. Quy Trình Tư Vấn CSKH Realtime Qua WebSocket

```mermaid
sequenceDiagram
    autonumber
    actor Khách Hàng (Website)
    participant WebSocket Server (/ws/cskh)
    actor NV CSKH (Admin Panel)

    Khách Hàng (Website)->>WebSocket Server (/ws/cskh): Kết nối WebSocket & gửi tin nhắn (session_user_<slug>)
    WebSocket Server (/ws/cskh)->>NV CSKH (Admin Panel): Broadcast sự kiện UPDATE_SESSIONS (< 1ms)
    NV CSKH (Admin Panel)->>WebSocket Server (/ws/cskh): Chọn phiên chat, nhập phản hồi / Mẫu câu nhanh
    WebSocket Server (/ws/cskh)->>Khách Hàng (Website): Phát tin nhắn phản hồi tức thì tới khung Chatbot
```

1. **Kết nối hai chiều**: Khách hàng mở Chatbot CSKH trên Storefront -> Tự động kết nối WebSocket Server tại `ws://localhost:5000/ws/cskh`.
2. **Phân định Session ID**: Mỗi người dùng sở hữu Session ID nhất quán (`session_user_<cleanUserSlug>`), giúp bảo tồn toàn bộ lịch sử tư vấn khi đăng nhập lại trên bất kỳ thiết bị nào.
3. **Xử lý Admin CSKH Panel**: Nhân viên CSKH (`cskh`) quản lý danh sách 3 tab chuẩn hóa:
   - 🎧 **Khiếu Nại & Hỗ Trợ**: Xử lý ticket bảo hành / sự cố.
   - 💬 **Chat Tư Vấn CSKH**: Chat 1-1 realtime, sử dụng câu trả lời mẫu, xóa phiên chat cũ (`🗑️ Xóa phiên chat này`).
   - 🔄 **Yêu Cầu Đổi Trả**: Phê duyệt yêu cầu đổi trả linh kiện từ khách hàng.

---

## 💎 5. Mô Tả Chi Tiết Tính Năng 11 Phân Hệ ERP & Storefront

### 5.1. Phân Hệ Ban Giám Đốc (Executive Dashboard)
- **KPIs Doanh Số Thời Gian Thực**: Tổng doanh thu, tổng đơn hàng, tỷ lệ hoàn tất, doanh số POS vs E-Commerce.
- **Biểu Đồ Phân Phối Danh Mục Việt Hóa**: Biểu đồ tròn thể hiện cơ cấu linh kiện bán ra (CPU, VGA, Mainboard, RAM,...).
- **Bộ Lọc Khoảng Thời Gian Thống Nhất (`Từ ngày — Đến ngày`)**: Tự động đồng bộ tất cả chỉ số theo khoảng ngày chọn.
- **Drilldown Modals**: Bấm vào thẻ KPI để xem danh sách chi tiết đơn hàng đóng góp.

### 5.2. Phân Hệ Quản Lý Bán Hàng (Sales POS)
- **Giao Diện Thu Ngân POS**: Tìm kiếm linh kiện theo tên/SKU, quét mã vạch sản phẩm.
- **Tích Hợp Thanh Toán VietQR**: Tiền mặt, chuyển khoản QR Code VietQR tự động.
- **Sổ Đăng Ký Đơn Hàng**: Bộ lọc trạng thái và khoảng thời gian `Từ ngày — Đến ngày`.

### 5.3. Phân Hệ Quản Lý Kho (Warehouse Management)
- **Quản Lý 1.580 Linh Kiện PC**: Phân loại 3 ngưỡng rủi ro:
  - **1.000 SP An Toàn (SAFE)**: $Stock \ge 15$.
  - **250 SP Cảnh Báo (WARNING)**: $1 \le Stock \le 5$.
  - **330 SP Hết Hàng (OUT_OF_STOCK)**: $Stock = 0$.
- **Stock Movement Audit Logs**: Theo dõi lịch sử giao dịch Nhập kho (IN) và Xuất kho (OUT).
- **Khung Bảng Cố Định Chống Nhảy Màn Hình**: Thiết lập `minHeight: 380px` ổn định giao diện.

### 5.4. Phân Hệ Mua Hàng & So Sánh Báo Giá NCC (Purchasing & RFQ)
- **Ma Trận So Sánh Báo Giá Đa NCC (Price Matrix)**: Tự động so sánh báo giá từ 2+ Nhà cung cấp.
- **Thuật Toán Chọn Báo Giá Rẻ Nhất**: Gắn nhãn badge `★ BÁO GIÁ RẺ NHẤT` cho phương án tiết kiệm nhất.
- **Thanh Bộ Lọc 2 Hàng Độc Lập**: Hàng 1 chứa ô tìm kiếm + nút trạng thái; Hàng 2 chứa bộ lọc khoảng thời gian `Từ ngày — Đến ngày`.

### 5.5. Phân Hệ Quản Lý Lắp Ráp PC (Custom PC Assembly)
- **Lệnh Lắp Ráp Động**: Tự động sinh Job lắp ráp khi đơn hàng chứa máy tính bộ.
- **Checklist Kỹ Thuật 5 Bước**: Quản lý quy trình lắp ráp từ Socket, Keo tản nhiệt, Đi dây, BIOS đến Stress Test.

### 5.6. Phân Hệ Quản Lý Nhân Sự & Bảng Lương (HR & Payroll)
- **Quy Chuẩn 26 Ngày Công**: Tính lương theo công thức hợp đồng chuẩn Việt Nam.
- **Khấu Trừ & Thưởng**: Khấu trừ $10.5\%$ bảo hiểm, cộng thưởng Sales ($1\%$) và thưởng lắp ráp ($150k$/máy).
- **MyPayroll Portal**: Cho phép nhân viên tra cứu phiếu lương cá nhân.

### 5.7. Phân Hệ Kế Toán Tài Chính (Financial Accounting)
- **Sổ Nhật Ký Tài Chính (VAS Ledger)**: Quản lý toàn bộ thu nhập (`INCOME`) và chi phí (`EXPENSE`).
- **Báo Cáo P&L (Profit & Loss)**: Doanh thu thực nhận trừ Giá vốn hàng bán (COGS) và Chi phí vận hành (OPEX).

### 5.8. Phân Hệ Giao Hàng & Vận Chuyển (Delivery Logistics)
- **Minh Chứng Giao Hàng Thành Công**: Tải trực tiếp ảnh minh chứng thực tế từ máy (`FileReader` Base64) kèm ghi chú người nhận.
- **Ghi Nhận Giao Thất Bại**: Chọn 1 trong 6 lý do phổ biến kèm ghi chú chi tiết.

### 5.9. Phân Hệ Chăm Sóc Khách Hàng (CSKH / CRM)
- **Tư Vấn Live Chat WebSocket**: Chat 1-1 realtime qua WebSocket Server `ws://localhost:5000/ws/cskh`.
- **Quản lý Ticket & Đổi Trả**: Quản lý ticket khiếu nại bảo hành và phê duyệt đơn đổi trả.

### 5.10. Storefront Online & Trợ Lý AI Antigravity
- **Tự Build PC Thông Minh**: Tự động kiểm tra xung đột Socket CPU/Mainboard và công suất nguồn PSU ($\le 80\%$ TDP).
- **Trợ Lý AI Chatbot**: Google Gemini AI SDK tư vấn cấu hình PC theo ngân sách và nhu cầu sử dụng.

---

## 📐 6. Thuật Toán & Công Thức Toán Học Trong Hệ Thống

### 6.1. Thuật Toán So Sánh Báo Giá Nhà Cung Cấp ($P_{\text{save}}$)
Cho tập hợp các báo giá $T = \{T_1, T_2, \dots, T_n\}$ gửi từ các Nhà cung cấp cho cùng một yêu cầu RFQ:
$$T_{\min} = \min(T), \quad T_{\max} = \max(T)$$
Tỷ lệ chi phí tiết kiệm được khi phê duyệt phương án rẻ nhất được tính theo công thức:
$$P_{\text{save}} = \left( \frac{T_{\max} - T_{\min}}{T_{\max}} \right) \times 100\%$$

### 6.2. Công Thức Tính Bảng Lương Hàng Tháng (Payroll Model)
Lương thực nhận ($L_{\text{net}}$) của nhân viên trong tháng được xác định theo quy chuẩn 26 ngày công:
$$L_{\text{gross}} = \left( L_{\text{cơ bản}} \times \frac{D_{\text{công}}}{26} \right) + K_{\text{sales}} \cdot 1\% + N_{\text{lắp ráp}} \cdot 150.000\text{đ}$$
$$L_{\text{khấu trừ}} = L_{\text{gross}} \times 10.5\% \quad (8\% \text{ BHXH} + 1.5\% \text{ BHYT} + 1\% \text{ BHTN})$$
$$L_{\text{net}} = L_{\text{gross}} - L_{\text{khấu trừ}}$$

### 6.3. Thuật Toán Kiểm Tra Công Suất Nguồn PSU Khi Build PC
Để hệ thống máy tính hoạt động bền bỉ, tổng điện năng tiêu thụ (TDP) của tất cả linh kiện không được vượt quá $80\%$ công suất danh định của Nguồn PSU:
$$P_{\text{tổng TDP}} = \text{TDP}_{\text{CPU}} + \text{TDP}_{\text{GPU}} + \text{TDP}_{\text{Mainboard}} + \text{TDP}_{\text{Khác}}$$
$$P_{\text{PSU khuyến nghị}} \ge \frac{P_{\text{tổng TDP}}}{0.80}$$

---

## 🔌 7. Danh Mục RESTful APIs & WebSocket Protocol

### 7.1. RESTful APIs Endpoints Base URL: `http://localhost:5000/api/v1`

| Phân Hệ | Phương Thức | Endpoint | Mô Tả Chức Năng |
| :--- | :---: | :--- | :--- |
| **Auth** | `POST` | `/auth/login` | Đăng nhập tài khoản Khách hàng / Nhân viên |
| **Auth** | `GET` | `/auth/me` | Lấy thông tin tài khoản hiện tại từ JWT Token |
| **Products** | `GET` | `/products` | Lấy danh sách 1.580 linh kiện PC kèm bộ lọc/tìm kiếm |
| **Orders** | `POST` | `/orders` | Tạo đơn hàng mới (POS / Storefront) |
| **Orders** | `PATCH` | `/orders/:id/delivery-proof` | Tải ảnh minh chứng giao hàng & cập nhật trạng thái |
| **Purchasing**| `POST` | `/purchasing/rfq` | Khởi tạo Yêu cầu Báo giá (RFQ) tới đa NCC |
| **Purchasing**| `GET` | `/purchasing/matrix` | Lấy Ma trận So sánh Báo giá Nhà cung cấp |
| **HR** | `GET` | `/hr/payroll` | Tự động tính toán Bảng lương hàng tháng |
| **Chat CSKH** | `GET` | `/chat/cskh/sessions` | Lấy danh sách phiên chat tư vấn CSKH |

### 7.2. Giao Thức WebSocket Realtime: `ws://localhost:5000/ws/cskh`

| Tên Sự Kiện (Type) | Chi Chiều Gửi | Payload Cấu Trúc | Mô Tả Tác Vụ |
| :--- | :---: | :--- | :--- |
| `INIT_SESSIONS` | Server $\rightarrow$ Client | `{ sessions: Array }` | Gửi toàn bộ dữ liệu các phiên chat khi mới kết nối |
| `CUSTOMER_SEND_MSG` | Customer $\rightarrow$ Server | `{ sessionId, text, customerName }` | Khách hàng gửi tin nhắn mới tới Server |
| `STAFF_SEND_MSG` | Staff $\rightarrow$ Server | `{ sessionId, text }` | NV CSKH phản hồi tin nhắn cho khách hàng |
| `UPDATE_SESSIONS` | Server $\rightarrow$ All Clients | `{ sessions: Array, newMsg }` | Phát thông điệp cập nhật tin nhắn tức thì ($< 1\text{ms}$) |
| `DELETE_SESSION` | Staff $\rightarrow$ Server | `{ sessionId }` | Xóa hoàn toàn 1 phiên chat cũ khỏi Server |

---

## 🧪 8. Bộ Kịch Bản Kiểm Thử Chi Tiết (Comprehensive Test Suite)

### 8.1. Phân Hệ Ban Giám Đốc (Executive Dashboard)

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-DASH-01`** | Lọc dữ liệu KPI theo khoảng thời gian tùy chỉnh | 1. Đăng nhập tài khoản `ceo`.<br>2. Tại Dashboard, chọn bộ lọc thời gian từ `01/08/2026` đến `04/08/2026`.<br>3. Quan sát các thẻ KPI. | Doanh thu, số đơn hàng và biểu đồ danh mục tự động cập nhật chính xác theo dữ liệu phát sinh trong khoảng thời gian đã chọn. |
| **`TC-DASH-02`** | Xem danh sách chi tiết khi click thẻ KPI | 1. Click vào thẻ KPI "Tổng Doanh Thu".<br>2. Quan sát Modal danh sách đơn đóng góp. | Modal hiển thị danh sách đơn hàng tương ứng, có mã đơn, tên khách và giá trị chính xác. |

### 8.2. Phân Hệ Quản Lý Bán Hàng (Sales POS)

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-POS-01`** | Lập đơn bán lẻ & Thanh toán QR Code tại quầy | 1. Đăng nhập tài khoản `sales`.<br>2. Tìm và thêm SP `VGA ASUS RTX 3080` vào giỏ.<br>3. Chọn phương thức "Chuyển khoản QR".<br>4. Nhấn "Thanh Toán". | Hệ thống hiển thị mã QR Code chuyển khoản, sau khi xác nhận đơn hàng thành công, tự động giảm tồn kho VGA đi 1 và ghi nhận doanh thu POS. |

### 8.3. Phân Hệ Quản Lý Kho (Warehouse)

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-WH-01`** | Lọc Lịch Sử Biến Động Kho (IN/OUT) | 1. Đăng nhập tài khoản `warehouse_manager`.<br>2. Vào tab "Lịch Sử Biến Động Xuất Nhập Kho".<br>3. Chọn Từ ngày `01/08/2026` Đến ngày `04/08/2026` và chọn loại `↓ Nhập kho (IN)`. | Bảng chỉ hiển thị lịch sử nhập kho trong khoảng ngày. Nút lọc và bộ lọc thời gian nằm trên **cùng 1 hàng ngang**, không bị đẩy xuống dòng. |
| **`TC-WH-02`** | Kiểm tra ổn định khung bảng khi không có dữ liệu | 1. Chọn khoảng ngày trong tương lai (ví dụ: `10/08/2026` đến `15/08/2026`). | Bảng hiển thị "Chưa có lịch sử biến động kho nào ghi nhận", chiều cao khung bảng vẫn duy trì `380px`, không gây nảy trang. |

### 8.4. Phân Hệ Quản Lý Mua Hàng (Purchasing & RFQ)

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-PUR-01`** | Khởi tạo YCBG (RFQ) Đa NCC & So Giá | 1. Đăng nhập tài khoản `purchasing`.<br>2. Bấm "Tạo Yêu Cầu Báo Giá (RFQ)".<br>3. Chọn 2 NCC: Mai Hoàng & Viễn Sơn cho SP `Core i9-13900K`.<br>4. Nhấn "Gửi RFQ". | Hệ thống sinh 2 đơn RFQ tương ứng gửi đến 2 Nhà cung cấp. |
| **`TC-PUR-02`** | Phê duyệt Báo giá Tối ưu qua Ma Trận So Giá | 1. Đăng nhập tài khoản `ceo`.<br>2. Mở "Ma Trận So Sánh Báo Giá NCC".<br>3. Quan sát nhãn `★ BÁO GIÁ RẺ NHẤT`.<br>4. Bấm "Phê Duyệt Báo Giá Này". | Báo giá được chọn tự động chuyển thành Đơn mua hàng (PO) chính thức; báo giá thua thầu tự động chuyển sang `CANCELLED`. |

### 8.5. Phân Hệ Quản Lý Lắp Ráp PC (Assembly)

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-ASS-01`** | Tiếp nhận và thực hiện Checklist Lắp Ráp | 1. Đăng nhập tài khoản `assembly`.<br>2. Chọn một Job lắp ráp ở trạng thái `PENDING`.<br>3. Đánh dấu tích đủ 5 mục Checklist kỹ thuật.<br>4. Bấm "Hoàn Tất Lắp Ráp". | Trạng thái Job chuyển thành `COMPLETED`, đơn hàng tự động chuyển sang sẵn sàng giao (`READY_TO_SHIP`), cộng $150.000$đ thưởng kỹ thuật cho nhân viên. |

### 8.6. Phân Hệ Quản Lý Nhân Sự & Bảng Lương (HR & Payroll)

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-HR-01`** | Tính bảng lương tự động hàng tháng | 1. Đăng nhập tài khoản `hr`.<br>2. Vào phân hệ Bảng Lương, bấm "Tính Lương Tháng 08/2026". | Lương thực nhận tự động khấu trừ $10.5\%$ bảo hiểm bắt buộc, cộng thưởng Sales ($1\%$) và thưởng lắp ráp ($150k$/máy). |
| **`TC-HR-02`** | Phê duyệt giải ngân lương & hạch toán kế toán | 1. Đăng nhập tài khoản `ceo`.<br>2. Kiểm tra và bấm "Duyệt Giải Ngân Bảng Lương". | Trạng thái chuyển sang `PAID`, Sổ nhật ký tài chính tự động phát sinh bút toán Chi (`EXPENSE`) lương nhân viên. |

### 8.7. Phân Hệ Kế Toán Tài Chính (Accounting)

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-ACC-01`** | Tra cứu Sổ Nhật Ký Tài Chính (VAS Ledger) | 1. Đăng nhập tài khoản `accounting`.<br>2. Chọn lọc loại giao dịch `Khoản Thu` và lọc khoảng thời gian từ `01/08/2026` đến `04/08/2026`. | Hiển thị toàn bộ các bút toán Thu tiền từ bán lẻ POS và E-Commerce. Khung bảng không bị nhảy chiều cao. |

### 8.8. Phân Hệ Giao Hàng & Vận Chuyển (Delivery Logistics)

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-DEL-01`** | Giao hàng thành công & Tải ảnh minh chứng từ máy | 1. Đăng nhập tài khoản `delivery`.<br>2. Tại đơn hàng đang giao, bấm nút **`Đã Giao`**.<br>3. Bấm vào khung tải ảnh, chọn 1 file ảnh từ máy tính/điện thoại.<br>4. Nhập ghi chú "Anh Nam nhận thay".<br>5. Bấm "Xác Nhận Giao Thành Công". | Hệ thống lưu ảnh Base64 & ghi chú vào hồ sơ đơn hàng. Nút hiển thị nhãn **`Đã Giao`**. Thẻ đơn hàng hiển thị khung minh chứng xanh lá. |
| **`TC-DEL-02`** | Ghi nhận sự cố giao hàng thất bại | 1. Tại đơn hàng đang giao, bấm nút **`Thất Bại`**.<br>2. Chọn lý do `Khách không nghe máy (Gọi 3 lần)`.<br>3. Bấm "Xác Nhận Thất Bại". | Trạng thái đơn chuyển thành `SHIPPING_FAILED`, thẻ đơn hàng hiển thị hộp cảnh báo màu đỏ ghi rõ lý do. |

### 8.9. Phân Hệ Chăm Sóc Khách Hàng (CSKH & WebSocket Chat)

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-CSKH-01`** | Chat trực tuyến WebSocket 2 chiều | 1. Đăng nhập Storefront tài khoản `Nguyễn Văn Ninh`.<br>2. Mở Chatbot bấm "Gặp NV CSKH" và nhập "chào em".<br>3. Mở trang Admin CSKH tại `localhost:3000/admin/cskh?tab=livechat`. | Màn hình Admin CSKH xuất hiện phiên chat `Nguyễn Văn Ninh (Khách Hàng)` tức thì trong $< 1\text{ms}$. Nhân viên bấm phản hồi -> Chatbot khách nhận được tin nhắn lập tức. |
| **`TC-CSKH-02`** | Bảo tồn lịch sử chat & Xóa phiên chat | 1. Tài khoản `Nguyễn Văn Ninh` đăng xuất rồi đăng nhập lại.<br>2. Mở khung chat CSKH.<br>3. Tại Admin CSKH, bấm nút `🗑️ Xóa phiên chat này`. | 1. Toàn bộ lịch sử chat cũ của anh Ninh hiển thị đầy đủ.<br>2. Khi bấm xóa, phiên chat bị xóa sạch khỏi Server và danh sách Admin. |

### 8.10. Storefront E-Commerce & AI Build PC

| Test ID | Tên Kịch Bản Test | Các Bước Thực Hiện | Kết Quả Kỳ Vọng |
| :---: | :--- | :--- | :--- |
| **`TC-STORE-01`** | Kiểm tra xung đột phần cứng khi Tự Build PC | 1. Truy cập trang `/build-pc`.<br>2. Chọn CPU `Intel Core i9-13900K` (Socket LGA1700).<br>3. Chọn Mainboard `AM5` (Socket AM5). | Hệ thống đưa ra cảnh báo đỏ xung đột Socket CPU & Mainboard không tương thích. |
| **`TC-STORE-02`** | Tư vấn cấu hình PC qua Trợ lý AI Antigravity | 1. Mở cửa sổ AI Chatbot góc dưới trang.<br>2. Nhập câu hỏi: "Tư vấn cho tôi dàn PC 25 triệu chơi mượt GTA V và Render 4K". | Trợ lý AI phản hồi cấu hình chi tiết kèm các linh kiện hiện có trong kho hàng AetherPC. |

---

## 💻 9. Công Nghệ Sử Dụng (Tech Stack)

### Frontend
- **Core Framework**: React.js (v18) xây dựng trên nền Vite bundling tool.
- **Styling**: Vanilla CSS Custom Variables, hiệu ứng Glassmorphic UI cao cấp, font chữ **Inter**.
- **Realtime Sync**: WebSocket Client & Inter-tab BroadcastChannel API.
- **Icons & UI**: Lucide React Icons, Chart.js / React-Chartjs-2.
- **State Management**: `ERPContext`, `CartContext`, `AuthContext`.

### Backend
- **Framework**: Node.js & Express.js RESTful API.
- **Realtime Engine**: WebSocket Server (`ws` library) khởi chạy trên `ws://localhost:5000/ws/cskh`.
- **Database & ORM**: PostgreSQL v15 & Prisma ORM (Client v6.19.3).
- **Security & Auth**: JSON Web Token (JWT) & bcryptjs password hashing.
- **AI Integration**: Google Generative AI SDK (`@google/generative-ai` - Gemini 1.5 Flash).

### Deployment & Tools
- **Docker Compose**: Containerization trọn gói Frontend, Backend và PostgreSQL Database.
- **Data Generator**: Script Python cào và chuẩn hóa 1.580 dữ liệu linh kiện PC thực tế.

---

## 📂 10. Cấu Trúc Thư Mục Dự Án (Project Structure)

```
ERP_AetherPC/
├── backend/                  # Server Node.js (Express + Prisma ORM + WebSocket Server + Gmail SMTP)
│   ├── prisma/               # Schema cơ sở dữ liệu Prisma & Seed migration
│   ├── scripts/              # Helper scripts cho backend (Stock allocation, seeds)
│   └── src/
│       ├── config/           # Cấu hình JWT, Database & Nodemailer SMTP
│       ├── controllers/      # Bộ xử lý nghiệp vụ Order, Purchasing, HR, ERP, Chat CSKH
│       ├── middlewares/      # Phân quyền RBAC, AuthToken JWT validation
│       ├── routes/           # REST API endpoints (Orders, Purchasing, Delivery, Chat CSKH)
│       └── services/         # WebSocket Service (ws/cskh), Email service (Gmail SMTP)
├── frontend/                 # Client Single Page Application (React + Vite + Lucide)
│   └── src/
│       ├── components/       # UI Components tái sử dụng (Layout, Modals, Chatbot AI/CSKH)
│       ├── context/          # React Context State (AuthContext, CartContext, ERPContext)
│       ├── pages/            # Các trang phân hệ ERP & Storefront
│       │   ├── Admin/        # 11 Phân hệ Quản trị ERP (SalesPOS, Purchasing, Warehouse, CustomerService...)
│       │   ├── Storefront/   # 12 Trang cửa hàng Online & AI PC Builder
│       │   └── SupplierPortal/ # Cổng tương tác báo giá cho Nhà Cung Cấp
│       └── services/         # Axios/Fetch API Client & helper utilities
├── database/                 # SQL Schema chuẩn & script khởi tạo Seed DB
├── docs/                     # Tài liệu Khóa luận Tốt nghiệp IUH (.docx) & Sơ đồ UML/BPMN
├── scraper/                  # Python Scraper cào & làm sạch 1.580 linh kiện PC thực tế
├── scripts/                  # Scripts hỗ trợ xuất báo cáo luận văn IUH
└── docker-compose.yml        # Cấu hình containerization trọn gói (Frontend, Backend, Postgres)
```

---

## 🚀 11. Hướng Dẫn Khởi Chạy Hệ Thống (Deployment)

### Cách 1: Chạy Nhanh Bằng Docker Compose (Khuyên dùng)

1. **Khởi tạo file cấu hình `backend/.env`**:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@postgres:5432/kltn_erp?schema=public"
   PORT=5000
   JWT_SECRET="kltn_erp_secret_key_2026"
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

2. **Chạy Docker Compose**:
   ```bash
   docker-compose up --build -d
   ```

3. **Truy cập ứng dụng**:
   - **Storefront & Admin ERP**: `http://localhost:3000`
   - **Backend REST API**: `http://localhost:5000`
   - **WebSocket Realtime CSKH**: `ws://localhost:5000/ws/cskh`

---

## 🔑 12. Danh Sách 14 Tài Khoản Demo Hệ Thống

Đăng nhập tại trang `/login` bằng các tài khoản demo (Mật khẩu mặc định: `123456`):

| STT | Vai Trò (Role) | Chức Danh Phân Nhiệm | Username | Mật khẩu mẫu |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **`ceo`** | Giám Đốc Điều Hành (CEO) | `ceo` | `123456` |
| 2 | **`admin`** | Quản Trị Hệ Thống | `admin` | `123456` |
| 3 | **`sales_manager`** | Quản Lý Bán Hàng | `sales_manager` | `123456` |
| 4 | **`sales`** | Nhân Viên Bán Hàng POS | `sales` | `123456` |
| 5 | **`warehouse_manager`**| Quản Lý Kho Bãi | `warehouse_manager` | `123456` |
| 6 | **`warehouse`** | Thủ Kho | `warehouse` | `123456` |
| 7 | **`purchasing`** | Nhân Viên Mua Hàng | `purchasing` | `123456` |
| 8 | **`supplier`** | Nhà Cung Cấp Đối Tác | `supplier` | `123456` |
| 9 | **`assembly`** | Kỹ Thuật Lắp Ráp PC | `assembly` | `123456` |
| 10 | **`hr`** | Quản Lý Nhân Sự | `hr` | `123456` |
| 11 | **`accounting`** | Kế Toán Tài Chính | `accounting` | `123456` |
| 12 | **`cskh`** | Chăm Sóc Khách Hàng | `cskh` | `123456` |
| 13 | **`delivery`** | Nhân Viên Giao Hàng | `delivery` | `123456` |
| 14 | **`customer_b2b`** | Khách Hàng Doanh Nghiệp | `customer_b2b` | `123456` |

---

## 📄 File Báo Cáo Khóa Luận Tốt Nghiệp (.docx)

👉 **[Bao_Cao_Khoa_Luan_Tot_Nghiep_IUH_AetherPC_ERP.docx](file:///c:/Users/mynh/Desktop/ERP_AetherPC/docs/Bao_Cao_Khoa_Luan_Tot_Nghiep_IUH_AetherPC_ERP.docx)**

---

## 📝 Bản Quyền
Dự án hoàn thiện phục vụ Khóa luận Tốt nghiệp Đại học chuyên ngành Hệ thống Thông tin — Khoa CNTT — Trường Đại học Công nghiệp TP. Hồ Chí Minh (IUH). All rights reserved © 2026.
