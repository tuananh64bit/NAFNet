# NAFNet System (Scientific Research Demo)

*Dự án Ứng dụng mô hình NAFNet (Nonlinear Activation Free Network) vào việc phục hồi hình ảnh (Image Deblurring & Denoising). Phiên bản này được tối ưu hóa đặc biệt để làm giao diện trình diễn chuẩn mực cho các công trình nghiên cứu khoa học.*

---

## ✨ Tính Năng Nổi Bật (Phiên Bản Tối Ưu Mới Nhất)
Hệ thống không chỉ là mã nguồn model khô khan, mà là một Server hoàn thiện với đầy đủ cơ chế tính toán thực tế:

- **Giao diện Học thuật (Academic UI):** Thiết kế Dark/Light mode tinh giản bằng **Tailwind CSS**, loại bỏ chi tiết rườm rà để tập trung tối đa vào việc đối chiếu kết quả hình ảnh (Before/After Slider). Hỗ trợ **kéo/thả ảnh (Drag & Drop)** thông minh.
- **Đa nhiệm không Nghẽn (Non-blocking Web Server):** Sử dụng `FastAPI` với phương pháp ThreadPool Offloading. Việc chạy AI không làm sụp/treo sự kiện (Event Loop) của web, cho phép người dùng lướt trang web dẫu AI đang load.
- **Phòng chống Vỡ RAM (OOM) hàng loạt:** Việc dự đoán AI (Inference) được cấp phát thông qua một cổng bảo vệ **`threading.Lock`**. Đảm bảo máy chủ giải quyết từng khung hình một cách an toàn mà không sợ nổ RAM nếu có lượng truy cập đột biến.
- **Tự động Dọn Rác ổ đĩa:** Các hệ thống xử lý ảnh thông thường hay tích tụ rác ngầm. Hệ thống này có chốt chặn `FastAPI BackgroundTasks` để "hủy dấu vết" (xóa tệp) liền ngay sau khi dữ liệu hình ảnh được chuyển xong về phía người dùng.
- **Mở khóa sức mạnh vi xử lý:** Phá ngục các giới hạn luồng mặc định, cho phép PyTorch vắt kiệt sức mạnh đa nhân (như Intel Core i7) để ra kết quả nhanh nhất.

## ⚙️ Hướng dẫn Cài đặt & Khởi chạy

### 1. Chuẩn bị môi trường
Yêu cầu: `Python 3.10`

Khởi tạo Virtual Environment và cài đặt bằng lệnh:
```bash
python3.10 -m venv .env
source .env/bin/activate
pip install -r requirements.txt
```
*(Nếu bạn dùng macOS, các chứng chỉ thư viện đã được loại bỏ cờ `+cpu` dư thừa tại tệp req nhằm tương thích với Homebrew).*

### 2. File Trọng số (Pre-trained Models)
Đảm bảo bạn đã tải hai tệp trọng số `deblur.pth` và `denoise.pth` (tổng dung lượng khoảng ~750 MB) vào đúng đường dẫn sau để máy chủ nhận diện:
- `experiments/pretrained_models/deblur.pth`
- `experiments/pretrained_models/denoise.pth`

### 3. Khởi Động Web Server
Khởi chạy tệp gốc:
```bash
source .env/bin/activate
python server.py
# Hoặc chạy lệnh Uvicorn: uvicorn server:app --host 0.0.0.0 --port 8000
```
Truy cập qua trình duyệt: `http://localhost:8000/`

---

## 🛠 Cấu Trúc Khung Dự Án
```text
NAFNet/
├── server.py              # Tâm điểm API, AI Lock, Model Caching
├── requirements.txt       # Tất cả Dependencies
├── static/                # Thư mục chứa giao diện (FE)
│   ├── index.html         # Khung HTML giao diện chính
│   ├── script.js          # Logic DragDrop & Before/After Validation
│   └── style.css          # Định kiểu Tailwind & Scrollbars
├── options/               # Tệp .yml mapping cấu trúc Net
├── basicsr/               # Thư viện core PyTorch của NAFNet
└── experiments/
    └── pretrained_models/ # Thư mục chứa Model parameters (.pth)
```

## 📝 Bản quyền & Giấy phép
Mã nguồn NAFNet gốc thuộc MIT License của tác giả. Thiết kế các tùy chỉnh thuật toán hệ thống Web Fast Inference này thuộc phạm vi tài liệu nghiên cứu và triển khai mở rộng.
