# NAFNet — Image Restoration System

> Dự án Nghiên cứu Khoa học ứng dụng mô hình **NAFNet** (Nonlinear Activation Free Network) vào bài toán phục hồi hình ảnh: **Khử mờ (Deblurring)** và **Khử nhiễu (Denoising)**.

---

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| **Giao diện Light / Dark Mode** | UI học thuật, tối giản, chuyển đổi sáng–tối bằng một nút bấm |
| **Drag & Drop Upload** | Kéo thả ảnh trực tiếp vào trình duyệt để xử lý |
| **Before / After Slider** | So sánh trực quan ảnh gốc và ảnh sau khi AI phục hồi |
| **Thread-safe Inference** | Sử dụng `threading.Lock` để xử lý an toàn khi có nhiều request đồng thời |
| **Auto Cleanup** | `BackgroundTasks` tự động xóa file tạm sau khi trả kết quả |
| **Docker Ready** | Đóng gói toàn bộ hệ thống thành Docker Image, chạy 1 lệnh duy nhất |

---

## 🚀 Bắt đầu nhanh

### Cách 1: Dùng Docker (Khuyến nghị)

Không cần cài Python hay thư viện gì cả. Chỉ cần có [Docker](https://docs.docker.com/get-docker/):

```bash
# Build image (tự động tải model ~750MB)
docker build -t nafnet .

# Chạy container
docker run -p 8000:8000 nafnet
```

Mở trình duyệt: **http://localhost:8000**

### Cách 2: Chạy trực tiếp (Development)

**Yêu cầu:** Python 3.10

```bash
# 1. Tạo môi trường ảo
python3.10 -m venv .venv
source .venv/bin/activate

# 2. Cài thư viện
pip install -r requirements.txt

# 3. Tải model (~750MB)
python download_models.py

# 4. Chạy server
python server.py
```

Mở trình duyệt: **http://localhost:8000**

---

## 📁 Cấu trúc dự án

```
NAFNet/
├── server.py              # API Server (FastAPI + ThreadPool + AI Lock)
├── download_models.py     # Script tải model từ Google Drive
├── requirements.txt       # Danh sách thư viện Python
├── Dockerfile             # Đóng gói Docker Image
├── .dockerignore          # Loại trừ file không cần thiết khi build Docker
│
├── static/                # Giao diện Frontend
│   ├── index.html         # Trang chính (Tailwind CSS)
│   ├── script.js          # Logic Drag&Drop, Theme Toggle, Slider
│   └── style.css          # Custom styles
│
├── options/               # Cấu hình kiến trúc model
│   ├── deblur.yml         # Config cho task Deblurring (GoPro)
│   └── denoise.yml        # Config cho task Denoising (SIDD)
│
├── basicsr/               # Core AI Engine (PyTorch)
│   ├── models/            # Model definitions
│   ├── utils/             # Tiện ích xử lý ảnh
│   └── ...
│
└── experiments/
    └── pretrained_models/ # Thư mục chứa file trọng số (.pth)
        ├── deblur.pth     # ~260MB (tải bằng download_models.py)
        └── denoise.pth    # ~470MB (tải bằng download_models.py)
```

---

## 🔧 Cấu hình kỹ thuật

### Backend (server.py)
- **Framework:** FastAPI + Uvicorn
- **AI Engine:** PyTorch 1.11 (CPU mode)
- **Concurrency:** `threading.Lock` chống OOM khi nhiều request đồng thời
- **Security:** CORS middleware, Content-Type validation, File size limit (10MB)
- **Cleanup:** `BackgroundTasks` tự động xóa file upload/result sau khi xử lý

### Frontend
- **CSS Framework:** Tailwind CSS (CDN)
- **Font:** Inter (Google Fonts)
- **Theme:** Light / Dark mode toggle (lưu vào localStorage)

---

## 📝 Giấy phép

Mã nguồn NAFNet gốc thuộc [MIT License](LICENSE). Các tùy chỉnh hệ thống Web Inference thuộc phạm vi tài liệu nghiên cứu.
