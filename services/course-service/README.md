# Course Service

Quản lý khóa học, bài học, đăng ký học, tiến độ học và quyền truy cập nội dung. FastAPI + PostgreSQL (`courses_db`). Người phụ trách: Đào Văn Khoa

## Chạy

Chạy cả hệ thống theo README ở thư mục gốc (`docker compose up --build -d --wait`). Qua Nginx:

- Swagger: `http://localhost:8080/services/courses/docs`
- Health: `http://localhost:8080/services/courses/health` (tiến trình sống) và `/ready` (kết nối được database)

Service chỉ truy cập database `courses_db` của chính nó. Khi khởi động nó tự chạy `migrations/*.sql` và (nếu `DEMO_MODE=true`, `SEED_DEMO=true`) nạp dữ liệu demo.

## Biến môi trường

| Biến | Ý nghĩa |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Kết nối `courses_db` |
| `JWT_PUBLIC_KEY_PATH`, `JWT_ISSUER`, `JWT_AUDIENCE` | Xác minh JWT RS256 do User Service ký (service chỉ giữ khóa công khai) |
| `PAYMENT_SERVICE_TOKEN` | Bí mật dùng chung với Payment Service cho API `/internal/...` |
| `QUIZ_SERVICE_TOKEN` | Bí mật dùng chung với Quiz Service để kiểm tra quyền học |
| `ROOT_PATH` | Tiền tố khi chạy sau Nginx (`/services/courses`) |
| `DEMO_MODE`, `SEED_DEMO` | Nạp dữ liệu demo (chỉ dùng khi demo) |

Giá trị thật nằm trong `.env` (tạo bằng `scripts/setup_demo.py`), không commit lên GitHub.

## API công khai (qua Nginx, đường dẫn `/api/...`)

| Method | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/languages` | Công khai | Danh sách ngôn ngữ |
| GET | `/api/courses?level=&language_code=` | Công khai | Danh sách khóa học, có `is_free` |
| GET | `/api/courses/{id}` | Công khai | Chi tiết khóa học |
| GET | `/api/courses/{id}/lessons` | Công khai | Mục lục bài học (không có nội dung) |
| POST | `/api/enrollments` | Đăng nhập | Đăng ký khóa **miễn phí**. Khóa trả phí trả `402 payment_required` |
| GET | `/api/enrollments/my-courses` | Đăng nhập | Khóa đã đăng ký + tiến độ % |
| GET | `/api/lessons/{id}` | Đã đăng ký (hoặc admin) | Nội dung bài học |
| POST | `/api/lessons/{id}/complete` | Đã đăng ký | Đánh dấu hoàn thành (idempotent) |
| POST | `/api/courses`, `/api/courses/{id}/lessons`; PUT `/api/lessons/{id}` | Admin | Quản trị nội dung |

`user_id` **không bao giờ** nằm trong body: service lấy danh tính từ JWT (`Authorization: Bearer <token>`). Body có trường lạ trả `422`.

## API nội bộ (không ra Internet; Nginx trả 404)

Cần header `X-Service-Token`. Chỉ các service trong mạng Docker gọi được.

| Method | Đường dẫn | Người gọi | Mục đích |
| --- | --- | --- | --- |
| GET | `/internal/courses/{id}/purchase?user_id=` | Payment | Lấy giá, tiền tệ, đã đăng ký chưa |
| POST | `/internal/enrollments/confirm-payment` | Payment | Mở quyền học khi giao dịch `SUCCESS` |
| GET | `/internal/courses/{id}/access?user_id=` | Quiz | Người dùng đã đăng ký chưa, danh sách `lesson_ids` |

`confirm-payment` kiểm tra số tiền/tiền tệ khớp giá khóa học (`409 payment_mismatch`), an toàn khi gửi lặp (`replayed: true`) và từ chối `payment_id` bị dùng lại với thông tin khác (`409 payment_conflict`).

## Ví dụ

```text
POST /api/enrollments   {"course_id": 2}            -> 402
{"error":{"code":"payment_required","message":"Khóa học trả phí cần giao dịch thanh toán được xác nhận."}}

POST /api/enrollments   {"course_id": 1}            -> 201
{"enrollment":{"id":"…","user_id":"…","course_id":1,"source":"free","payment_id":null,"created_at":"…"}}

GET  /api/lessons/21    (chưa đăng ký khóa 2)       -> 403
{"error":{"code":"enrollment_required","message":"Bạn cần đăng ký khóa học trước khi truy cập nội dung."}}
```

Lỗi luôn có dạng `{"error":{"code","message"}}`; lỗi kiểm tra dữ liệu có thêm `fields`.

## Dữ liệu

Xem `docs/course-quiz-design.md` (sơ đồ ER, quy tắc nghiệp vụ). Migration: `migrations/001_initial.sql` (không sửa file đã áp dụng, thêm file mới `002_...sql`). Dữ liệu demo: `app/seed.py` + `app/learning_content.json` (8 khóa, 21 bài). Seed chỉ thêm bản ghi còn thiếu.

## Kiểm thử

```bash
cd services/course-service
pip install -r requirements-dev.txt
python -m pytest -q                     # test không cần database (9 test)
```

Test dùng database thật (14 test thêm: danh sách/chi tiết khóa học, đăng ký, quyền truy cập, tiến độ, xác nhận thanh toán). **Chỉ chạy trên database thử nghiệm**, vì test ghi dữ liệu:

```bash
# ví dụ: bật postgres của docker compose ở cổng 5432 hoặc dùng một DB rỗng riêng
RUN_DB_TESTS=1 DB_HOST=localhost DB_PORT=5432 DB_NAME=courses_db \
DB_USER=courses_app DB_PASSWORD=<mật khẩu thử nghiệm> python -m pytest -v
```

Kiểm thử toàn luồng qua Nginx: `python scripts/acceptance_test.py --base-url http://127.0.0.1:8080 --output acceptance-result.json`.
