# Thiết kế dữ liệu và luồng nghiệp vụ: Course Service + Quiz Service

## 1. Nguyên tắc

- Mỗi service có **database riêng** trên cùng một PostgreSQL instance (`courses_db`, `quizzes_db`), mỗi database có role riêng (`courses_app`, `quizzes_app`). Không service nào đọc database của service khác.
- Các bảng của hai service liên kết với nhau bằng **ID logic** (không có khóa ngoại xuyên database), vì thế mọi kiểm tra chéo đi qua API nội bộ.
- Danh tính người dùng (`user_id`) luôn lấy từ JWT, không nhận từ body.

## 2. Sơ đồ dữ liệu

```mermaid
erDiagram
    languages ||--o{ courses : "language_code"
    courses ||--o{ lessons : "course_id"
    courses ||--o{ enrollments : "course_id"
    courses ||--o{ payment_receipts : "course_id"
    lessons ||--o{ lesson_progress : "lesson_id"

    quizzes ||--o{ questions : "quiz_id"
    questions ||--o{ answer_options : "question_id"
    quizzes ||--o{ quiz_attempts : "quiz_id"
    quiz_attempts ||--o{ quiz_answers : "attempt_id"
    questions ||--o{ quiz_answers : "question_id"

    languages { varchar code PK }
    courses { int id PK
              varchar level "A1..C1"
              bigint price "VND, 0 = free" }
    lessons { int id PK
              int position "unique per course"
              int quiz_id "logical link to Quiz Service" }
    enrollments { uuid id PK
                  uuid user_id "from JWT"
                  varchar source "free | payment"
                  uuid payment_id }
    lesson_progress { uuid user_id PK
                      int lesson_id PK }
    payment_receipts { uuid payment_id PK
                       bigint amount }
    quizzes { int id PK
              int course_id "logical link to Course Service"
              int lesson_id }
    questions { int id PK
                varchar kind "single_choice | fill_blank"
                text correct_answer
                int points }
    answer_options { int question_id PK
                     varchar option_id PK }
    quiz_attempts { uuid id PK
                    uuid user_id
                    int score
                    int max_score }
    quiz_answers { uuid attempt_id PK
                   int question_id PK
                   bool is_correct }
```

Liên kết logic giữa hai database: `lessons.quiz_id` → `quizzes.id`, `quizzes.course_id` / `quizzes.lesson_id` → `courses.id` / `lessons.id`, `enrollments.user_id` và `quiz_attempts.user_id` → người dùng của User Service.

Ràng buộc chính: `UNIQUE(user_id, course_id)` ở `enrollments` (không đăng ký trùng); `UNIQUE(course_id, position)` ở `lessons`; `UNIQUE(quiz_id, position)` ở `questions`; `CHECK price >= 0`, `CHECK currency = 'VND'`, `CHECK level IN (A1..C1)`.

Migration nằm ở `services/*/migrations/001_initial.sql`. Hệ thống ghi checksum vào `schema_migrations`; **không sửa file đã áp dụng**, muốn đổi cấu trúc thì thêm `002_...sql`.

## 3. Dữ liệu demo

| Khóa | Cấp độ | Giá | Quiz |
| --- | --- | --- | --- |
| English First Steps | A1 | Miễn phí | 1 |
| Everyday English | A2 | 149.000 VND | 2 |
| English at Work | B1 | 249.000 VND | 3 |
| 5 khóa A1–C1 bổ sung | A1–C1 | Miễn phí | 4–8 (10 câu/quiz) |

Tổng: 8 khóa, 21 bài, 8 quiz, 56 câu. Có cả khóa miễn phí và trả phí để demo đủ luồng. Seed chỉ thêm bản ghi còn thiếu (`ON CONFLICT DO NOTHING`).

## 4. Quy tắc truy cập

| Hành động | Ai được phép |
| --- | --- |
| Xem danh sách/chi tiết khóa, mục lục bài | Mọi người |
| Xem nội dung bài, đánh dấu hoàn thành | Người đã có `enrollment` của khóa (admin: luôn được) |
| Xem đề, nộp bài, xem kết quả | Người đã có `enrollment` của khóa chứa quiz |
| Tạo khóa/bài/quiz | Admin |

Quiz Service hỏi Course Service `GET /internal/courses/{id}/access?user_id=` (kèm `X-Service-Token`) để biết người dùng đã đăng ký chưa. Nếu Course Service không phản hồi, Quiz Service trả `503`, **không** tự cho phép truy cập.

## 5. Quy tắc thanh toán và mở quyền học

```mermaid
sequenceDiagram
    participant U as Learner
    participant C as Course Service
    participant P as Payment Service
    U->>C: POST /api/enrollments {course_id}
    alt khóa miễn phí
        C-->>U: 201 enrollment (source=free)
    else khóa trả phí
        C-->>U: 402 payment_required
        U->>P: POST /api/payments {course_id}
        P->>C: GET /internal/courses/{id}/purchase (lấy giá)
        P-->>U: giao dịch PENDING
        Note over P: mô phỏng kết quả SUCCESS / FAILED
        P->>C: POST /internal/enrollments/confirm-payment (chỉ khi SUCCESS)
        C-->>P: enrollment (source=payment)
        U->>C: truy cập bài học / quiz thành công
    end
```

- Khóa trả phí **chỉ** mở quyền khi Payment Service báo `SUCCESS`. Giao dịch `FAILED` không tạo enrollment.
- Course Service tự kiểm tra `amount` và `currency` khớp giá khóa học, không tin hoàn toàn Payment Service.
- `confirm-payment` an toàn khi gọi lặp (cùng `payment_id` trả `replayed: true`).
- Mọi giao dịch là mô phỏng, không có dữ liệu thẻ.

## 6. Xử lý lỗi

| Tình huống | Kết quả |
| --- | --- |
| Chưa đăng nhập / token sai hoặc hết hạn | `401` |
| Học bài hoặc làm quiz khi chưa đăng ký | `403 enrollment_required` |
| Đăng ký khóa trả phí khi chưa thanh toán | `402 payment_required` |
| Nộp bài thiếu/thừa câu, sai đáp án không thuộc lựa chọn, gửi kèm `score` | `422`, không lưu |
| Số tiền thanh toán không khớp giá | `409 payment_mismatch` |
| Course Service ngừng hoạt động khi làm quiz | `503 course_service_unavailable` |
