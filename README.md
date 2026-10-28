# Nền tảng học trực tuyến theo kiến trúc Microservices

## Giới thiệu đồ án

Đồ án cuối kỳ môn Điện toán đám mây của nhóm 3 thành viên. Mục tiêu là xây dựng nền tảng học trực tuyến với các chức năng đăng ký, đăng nhập, quản lý khóa học, làm bài kiểm tra và thanh toán mô phỏng.

Hệ thống gồm frontend React + Vite và 4 microservices FastAPI: User, Course, Quiz, Payment; sử dụng PostgreSQL, Docker Compose và Nginx.

Hiện dự án là bộ khung ban đầu với dữ liệu demo; các chức năng nghiệp vụ sẽ được phát triển theo phân công bên dưới.

## Phân công công việc

| Thành viên | Phụ trách | Công việc chính |
| --- | --- | --- |
| Người 1 | Frontend + User Service | Xây dựng giao diện; đăng ký, đăng nhập, xác thực và thông tin người dùng; kết nối giao diện với API. |
| Người 2 | Course Service + Quiz Service | Quản lý khóa học và đăng ký học; xây dựng bài kiểm tra, xử lý nộp bài, chấm điểm và lưu kết quả. |
| Người 3 | Payment Service + Cloud/DevOps | Xây dựng thanh toán mô phỏng; cấu hình Docker Compose, Nginx; chuẩn bị triển khai lên AWS EC2 hoặc Google Compute Engine. |

Cả nhóm cùng thống nhất API, kiểm thử tích hợp và chuẩn bị báo cáo, kịch bản demo.

## Hướng dẫn chạy

Cài Git và Docker Desktop, chọn Linux containers và bật Docker trước khi chạy. Các lệnh dưới đây dùng PowerShell.

**1. Clone repository**

```powershell
git clone https://github.com/moseking/CloudComputing_OLP.git
cd CloudComputing_OLP
```

Nếu đã có source trên máy, mở terminal tại thư mục chứa `docker-compose.yml`.

**2. Tạo cấu hình môi trường**

```powershell
Copy-Item .env.example .env
```

Mở `.env`, thay cả 5 giá trị `CHANGE_ME_*` bằng mật khẩu riêng. Không commit file `.env`.

**3. Khởi chạy hệ thống**

```powershell
docker compose up --build -d --wait
```

Mở giao diện tại [http://localhost:8080](http://localhost:8080).

Swagger API: [User](http://localhost:8080/services/users/docs) · [Course](http://localhost:8080/services/courses/docs) · [Quiz](http://localhost:8080/services/quizzes/docs) · [Payment](http://localhost:8080/services/payments/docs).

**4. Dừng hệ thống**

```powershell
docker compose down
```

## Làm việc trên nhánh riêng

Trước khi làm một tính năng mới, cập nhật `main` rồi tạo nhánh riêng:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/user-frontend
```

Dùng tên nhánh theo phần phụ trách: Người 1 `feature/user-frontend`, Người 2 `feature/course-quiz`, Người 3 `feature/payment-cloud`.
Nếu nhánh đã có trên máy, dùng `git switch <tên-nhánh>` thay cho lệnh tạo nhánh.

Sau khi sửa code, kiểm tra các file thay đổi rồi commit và push lên đúng nhánh:

```powershell
git status
git add .
git commit -m "feat: add user registration"
git push -u origin feature/user-frontend
```

Đổi tên nhánh và nội dung commit cho đúng công việc. Các lần push tiếp theo trên nhánh đã liên kết chỉ cần `git push`.
Sau khi push, tạo Pull Request từ nhánh của mình vào `main` để cả nhóm review trước khi merge.
