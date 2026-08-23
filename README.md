# 📊 Tool Cào & Báo Cáo Phân Tích Đánh Giá (Rating & Comment) Google Play & App Store

Ứng dụng web tự động cào đánh giá và bình luận từ **Google Play (Android)** và **App Store (iOS)**, tự động phân tích nhóm chủ đề ý kiến phản hồi người dùng và xuất báo cáo file Excel 3 Sheet chuyên nghiệp.

---

## 🌟 Các tính năng nổi bật

1. **Xem trước 3 Tab linh hoạt**:
   - **📊 Tổng hợp**: Bảng phân tích 11+ nhóm chủ đề ý kiến (Xếp hạng, Chủ đề, Số ý kiến, Trạng thái ✅ Tốt / ⚠️ Chưa tốt, Trích dẫn phản hồi tiêu biểu).
   - **🤖 Google Play (Android)**: Danh sách đánh giá chi tiết từ Android.
   - **🍎 App Store (iOS)**: Danh sách đánh giá chi tiết từ iOS (hỗ trợ phân trang API Apple Storefront chính xác 100%).
2. **Xuất Báo Cáo Excel Tự Động (`tong_hop_rating_comment.xlsx`)**:
   - Gồm **3 Worksheets (3 Sheet)**: `Tổng hợp`, `Google Play (Android)`, `App Store (iOS)`.
   - Trình bày định dạng chuẩn, tô màu tiêu đề, tự động căn chỉnh độ rộng cột.
3. **Sắp xếp & Lọc thông minh**:
   - Tự động sắp xếp ngày mới nhất lên đầu (`Newest First`).
   - Sắp xếp tương tác trực tiếp theo cột `Số sao` và `Ngày`.
4. **Lưu Cấu Hình**:
   - Tự động ghi nhớ đường dẫn App Android và iOS cho các lần sử dụng sau.

---

## 🚀 Hướng dẫn cài đặt & Chạy trên mọi máy tính

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18 trở lên (Tải tại: [https://nodejs.org](https://nodejs.org))
- **Git** (Tải tại: [https://git-scm.com](https://git-scm.com))

---

### 2. Các bước chạy Tool

#### Bước 1: Tải mã nguồn từ GitHub về máy
Mở Terminal / PowerShell / Command Prompt và chạy lệnh:
```bash
git clone https://github.com/nhatvuminh/get-rating-comment-on-store.git
cd get-rating-comment-on-store
```

#### Bước 2: Cài đặt thư viện dependencies
```bash
npm install
```

#### Bước 3: Khởi chạy Server
```bash
npm start
```
*Hoặc:*
```bash
node server.js
```

#### Bước 4: Trải nghiệm ứng dụng
Mở trình duyệt web (Chrome, Edge, Firefox, Brave,...) và truy cập:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Cấu trúc thư mục

```
get-rating-comment-on-store/
├── api/
│   └── index.js          # Express API server, scraper engine & Excel generator
├── public/
│   ├── index.html        # Giao diện Web (HTML5, Tabs, UI Controls)
│   ├── style.css         # CSS Modern Dark/Light Theme styling
│   └── app.js            # Frontend Web App Javascript logic
├── output/               # Thư mục chứa file Excel được tạo tự động
├── server.js             # Entrypoint khởi chạy ứng dụng Node.js
├── package.json          # Dependencies & npm scripts
└── README.md             # Hướng dẫn sử dụng
```

---

## 🛡️ License
MIT License. Được phát triển để tự động hóa báo cáo trải nghiệm khách hàng ứng dụng di động.
