# OELP – Nền tảng học trực tuyến theo kiến trúc Microservices

## 1. Giới thiệu đồ án

OELP (Online English Learning Platform) là nền tảng học tiếng Anh trực tuyến được xây dựng trong khuôn khổ đồ án cuối kỳ môn Điện toán đám mây của nhóm 3 thành viên.

Hệ thống cung cấp các chức năng chính như đăng ký, đăng nhập, quản lý khóa học, bài học, làm bài kiểm tra, theo dõi tiến độ và thanh toán mô phỏng.

Đồ án sử dụng kiến trúc Microservices với frontend React + Vite và 4 dịch vụ backend FastAPI độc lập: User Service, Course Service, Quiz Service và Payment Service. Hệ thống sử dụng PostgreSQL để lưu trữ dữ liệu, Nginx làm API Gateway và Docker Compose để triển khai các dịch vụ.

## 2. Công nghệ sử dụng

| Thành phần       | Công nghệ                          |
| ---------------- | ---------------------------------- |
| Frontend         | React, Vite, Tailwind CSS          |
| Backend          | Python, FastAPI                    |
| Database         | PostgreSQL                         |
| Authentication   | JWT (RS256)                        |
| API Gateway      | Nginx                              |
| Containerization | Docker, Docker Compose             |
| Cloud dự kiến    | AWS EC2 hoặc Google Compute Engine |

## 3. Phân công công việc

| Thành viên | Phụ trách                      | Công việc chính                                                                                                   |
| ---------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Người 1    | Frontend + User Service        | Xây dựng giao diện; đăng ký, đăng nhập, xác thực và quản lý thông tin người dùng; kết nối frontend với API.       |
| Người 2    | Course Service + Quiz Service  | Quản lý khóa học, bài học, đăng ký học, tiến độ; xây dựng bài kiểm tra, xử lý nộp bài và chấm điểm.               |
| Người 3    | Payment Service + Cloud/DevOps | Xây dựng chức năng thanh toán mô phỏng; cấu hình Docker Compose, Nginx và chuẩn bị triển khai hệ thống lên Cloud. |

Cả nhóm cùng phối hợp thống nhất API, tích hợp các dịch vụ, kiểm thử hệ thống, hoàn thiện báo cáo và chuẩn bị demo.

## 4. Hướng dẫn cài đặt và chạy chương trình

### 4.1. Yêu cầu môi trường

- Git
- Docker Desktop
- Docker Compose
- Docker Desktop đã bật chế độ Linux containers.

Các lệnh bên dưới sử dụng PowerShell trên Windows.

### 4.2. Clone repository

```powershell
git clone https://github.com/moseking/CloudComputing_OLP.git
cd CloudComputing_OLP
```

Nếu đã có source code trên máy, mở terminal tại thư mục chứa file `docker-compose.yml`.

### 4.3. Cấu hình môi trường

Máy mới cần Python 3.13/3.14. Từ thư mục gốc repo, tạo cấu hình demo và cặp khóa JWT bằng script có sẵn:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe scripts/setup_demo.py
docker compose config --quiet
```

Script tạo `.env` với giá trị riêng và khóa trong `.secrets/`; `.env.example` chỉ là mẫu placeholder. Nếu đã có `.env` và khóa, giữ nguyên; chỉ dùng `scripts/setup_demo.py --extend` khi cần bổ sung biến còn thiếu. Không chia sẻ hoặc commit `.env` và private key lên GitHub.

### 4.4. Khởi chạy hệ thống

Chạy lệnh:

```powershell
docker compose up --build -d --wait
```

Sau khi các container khởi động thành công, truy cập:

- **Website:** http://localhost:8080
- **Health Check:** http://localhost:8080/health
- **User Service:** http://localhost:8080/services/users/docs
- **Course Service:** http://localhost:8080/services/courses/docs
- **Quiz Service:** http://localhost:8080/services/quizzes/docs
- **Payment Service:** http://localhost:8080/services/payments/docs

### 4.5. Một số lệnh Docker hữu ích

Kiểm tra trạng thái container:

```powershell
docker compose ps
```

Xem log hệ thống:

```powershell
docker compose logs -f
```

Dừng hệ thống:

```powershell
docker compose down
```

Lưu ý: Không sử dụng `docker compose down -v` nếu muốn giữ lại dữ liệu database.

## 5. Làm việc trên các nhánh Git

Mỗi thành viên làm việc trên nhánh riêng tương ứng với phần được phân công.

| Thành viên | Tên nhánh               |
| ---------- | ----------------------- |
| Người 1    | `feature/user-frontend` |
| Người 2    | `feature/course-quiz`   |
| Người 3    | `feature/payment-cloud` |

Trước khi bắt đầu công việc mới, cập nhật nhánh `main`:

```bash
git switch main
git pull --ff-only origin main
```

Tạo nhánh mới cho công việc:

```bash
git switch -c feature/user-frontend
```

Sau khi hoàn thành, kiểm tra và đẩy thay đổi lên GitHub:

```bash
git status
git add .
git commit -m "feat: add user registration"
git push -u origin feature/user-frontend
```

Thay tên nhánh và nội dung commit cho phù hợp với công việc thực tế.

Sau khi push, tạo Pull Request từ nhánh cá nhân vào `main` để các thành viên cùng kiểm tra trước khi merge.

## 6. Nội dung học thử và ngôn ngữ giao diện

Ngoài 3 khóa demo ban đầu, có thêm 5 khóa miễn phí A1–C1; mỗi khóa có 3 bài học và 1 Quiz tổng kết 10 câu. Mỗi bài gồm đoạn đọc tiếng Anh, 6 từ vựng, ngữ pháp, bài tự luyện và nguồn tham khảo British Council/VOA. Nội dung do OELP biên soạn để demo, tham chiếu mức độ CEFR; không phải khóa học được chứng nhận.

| Cấp độ | Khóa mới |
| --- | --- |
| A1 | English for Daily Life |
| A2 | Travel with Confidence |
| B1 | Stories and Decisions |
| B2 | Communication and Ideas |
| C1 | Academic and Professional English |

Dùng bộ chọn Tiếng Việt / English ở đầu trang để đổi ngôn ngữ giao diện; lựa chọn được lưu trên trình duyệt. Phần nội dung học vẫn giữ bài đọc tiếng Anh và phần giải nghĩa phục vụ người học Việt Nam. Trong bài, mở mục Lý thuyết để đọc/nghe; mở Từ vựng để nghe phát âm. Audio là giọng máy Anh–Anh và Anh–Mỹ tạo sẵn, có chọn tốc độ và ẩn transcript; không ghi âm hoặc chấm phát âm. Các MP3 được phục vụ cùng frontend nên không cần API key hay giọng hệ thống.

Dữ liệu nằm trong app/learning_content.json của Course Service và Quiz Service, được seed khi DEMO_MODE=true và SEED_DEMO=true. Seed chỉ thêm bản ghi còn thiếu, giữ nguyên các khóa/dữ liệu cũ. Máy mới cần khởi động cả hai service; máy đang chạy cần rebuild Course, Quiz và frontend để nhận data/audio mới. Sửa JSON không ghi đè dữ liệu đã seed; cần thống nhất cách cập nhật nội dung với Người 2 khi muốn sửa bản ghi đang tồn tại. Không xóa volume để nạp dữ liệu.

Kiểm tra dữ liệu từ thư mục gốc repo, sau khi đã cài requirements-dev:

```powershell
.\.venv\Scripts\python.exe scripts/validate_learning_content.py
```

Nguồn tham khảo chủ điểm: [British Council grammar](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2), [British Council listening](https://learnenglish.britishcouncil.org/en/listen-and-watch), [VOA Learning English](https://learningenglish.voanews.com/p/5644.html), [CEFR levels](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions). Mỗi bài có liên kết tham khảo tương ứng; đoạn đọc và câu hỏi không chép nguyên bộ bài từ các trang này.
