# NAFNet-NCKH

lên docker hub tìm image tuananh64bit/nafnet-api

kéo về mà chạy

khỏi cảm ơn !!!

<img width="1536" height="866" alt="image" src="https://github.com/user-attachments/assets/910b91ba-350a-4ebc-8a6e-c84a92541900" />

# Hướng dẫn sử dụng API (API Documentation)

Server cung cấp một API chính để xử lý ảnh (khử nhiễu hoặc làm nét). Dưới đây là thông số chi tiết để tích hợp hoặc kiểm thử.

## 1. Endpoint xử lý ảnh

* **URL:** `/api/process`
* **Method:** `POST`
* **Content-Type:** `multipart/form-data`
* 
## 2. Sử dụng Giao diện Web (Web Interface)

Server đã tích hợp sẵn một giao diện người dùng đơn giản (UI) để bạn có thể kiểm tra nhanh các tính năng mà không cần dùng code hay Postman.

### Cách truy cập:
1. Mở trình duyệt web (Chrome, Edge, Firefox,...).
2. Truy cập địa chỉ: **[http://localhost:8000](http://localhost:8000)** (tùy vào port ae chạy docker mà sửa nhé)

### Chức năng trên web:
* **Upload ảnh:** Chọn ảnh từ máy tính của bạn.
* **Chọn Task:** Lựa chọn giữa `deblur` (Làm nét) hoặc `denoise` (Khử nhiễu).
* **Xem kết quả:** Nhấn nút xử lý và xem ảnh kết quả hiển thị trực tiếp trên trình duyệt.
  
### Tham số (Body Parameters)

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả | Giá trị cho phép |
| :--- | :--- | :---: | :--- | :--- |
| `file` | File (Binary) | ✅ | File ảnh cần xử lý. | `.png`, `.jpg`, `.jpeg` |
| `task` | String | ❌ | Loại tác vụ muốn thực hiện. <br>*(Mặc định: deblur)* | `deblur` (Làm nét)<br>`denoise` (Khử nhiễu) |

### Phản hồi (Response)

* **Thành công (200 OK):** Trả về file ảnh định dạng `.png` đã được xử lý.
* **Lỗi (400/500):** Trả về JSON chứa thông báo lỗi.
