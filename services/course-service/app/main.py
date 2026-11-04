"""Course catalog, access rights and idempotent progress/payment confirmation."""
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import Depends, Path
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb
from pydantic import Field

from .core import Actor, Admin, InputModel, Level, Name, create_app, fail, service_guard
from .database import connect
from .seed import seed

app = create_app('course-service', seed)
PositiveId = Annotated[int, Path(gt=0)]
payment_guard = service_guard('PAYMENT_SERVICE_TOKEN')
quiz_guard = service_guard('QUIZ_SERVICE_TOKEN')


class CourseRequest(InputModel):
    language_code: str = Field(min_length=2,max_length=12)
    level: Level
    title: Name
    description: str = Field(min_length=1,max_length=5000)
    price: int = Field(ge=0,le=1_000_000_000)
    currency: str = Field(default='VND',pattern='^VND$')
    prerequisites: str = Field(default='',max_length=2000)
    learning_goals: str = Field(default='',max_length=2000)


class Vocabulary(InputModel):
    term: Name
    ipa: str = Field(default='',max_length=200)
    meaning: str = Field(min_length=1,max_length=1000)
    example: str = Field(min_length=1,max_length=1000)


class Grammar(InputModel):
    pattern: str = Field(min_length=1,max_length=500)
    explanation: str = Field(min_length=1,max_length=2000)
    examples: list[str] = Field(min_length=1,max_length=20)


class Practice(InputModel):
    prompt: str = Field(min_length=1,max_length=2000)
    example: str = Field(default='',max_length=2000)


class LessonRequest(InputModel):
    title: Name
    position: int = Field(gt=0)
    theory: str = Field(min_length=1,max_length=20000)
    vocabulary: list[Vocabulary] = Field(default_factory=list,max_length=100)
    grammar: list[Grammar] = Field(default_factory=list,max_length=30)
    practice: list[Practice] = Field(default_factory=list,max_length=30)
    quiz_id: int | None = Field(default=None,gt=0)


class EnrollmentRequest(InputModel):
    course_id: int = Field(gt=0)


class PaymentConfirmation(InputModel):
    payment_id: UUID
    user_id: UUID
    course_id: int = Field(gt=0)
    amount: int = Field(gt=0,le=1_000_000_000)
    currency: str = Field(pattern='^VND$')


def get_course(db, course_id):
    course = db.execute('''SELECT c.*,l.name AS language FROM courses c JOIN languages l
                           ON l.code=c.language_code WHERE c.id=%s''', (course_id,)).fetchone()
    if not course:
        fail(404, 'course_not_found', 'Không tìm thấy khóa học.')
    course['is_free'] = course['price'] == 0
    return course


def ensure_access(db, course_id, actor):
    if actor['role'] == 'admin':
        return
    exists = db.execute('SELECT id FROM enrollments WHERE user_id=%s AND course_id=%s', (actor['id'],course_id)).fetchone()
    if not exists:
        fail(403, 'enrollment_required', 'Bạn cần đăng ký khóa học trước khi truy cập nội dung.')


def enrollment(db, user_id, course_id, source, payment_id=None):
    db.execute('''INSERT INTO enrollments(id,user_id,course_id,source,payment_id) VALUES (%s,%s,%s,%s,%s)
                  ON CONFLICT(user_id,course_id) DO NOTHING''', (uuid4(),user_id,course_id,source,payment_id))
    return db.execute('SELECT * FROM enrollments WHERE user_id=%s AND course_id=%s', (user_id,course_id)).fetchone()


@app.get('/api/languages')
def languages():
    with connect() as db:
        return {'items':db.execute('SELECT code,name FROM languages ORDER BY name').fetchall()}


@app.get('/api/courses')
def courses(level: Level | None = None, language_code: str | None = None):
    with connect() as db:
        rows = db.execute('''SELECT c.*,l.name AS language FROM courses c JOIN languages l ON l.code=c.language_code
                             WHERE (%s::text IS NULL OR level=%s) AND (%s::text IS NULL OR language_code=%s)
                             ORDER BY c.id''', (level,level,language_code,language_code)).fetchall()
    for row in rows:
        row['is_free'] = row['price'] == 0
    return {'items':rows,'total':len(rows)}


@app.get('/api/courses/{course_id}')
def course_detail(course_id: PositiveId):
    with connect() as db:
        return {'course':get_course(db,course_id)}


@app.post('/api/courses',status_code=201)
def create_course(body: CourseRequest, _actor: Admin):
    with connect() as db:
        if not db.execute('SELECT code FROM languages WHERE code=%s',(body.language_code,)).fetchone():
            fail(422,'unknown_language','Ngôn ngữ chưa có trong danh mục.')
        row = db.execute('''INSERT INTO courses(language_code,level,title,description,price,currency,prerequisites,learning_goals)
                             VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id''',
                         (body.language_code,body.level,body.title,body.description,body.price,body.currency,body.prerequisites,body.learning_goals)).fetchone()
        return {'course':get_course(db,row['id'])}


@app.get('/api/courses/{course_id}/lessons')
def course_lessons(course_id: PositiveId):
    with connect() as db:
        get_course(db,course_id)
        return {'items':db.execute('SELECT id,course_id,title,position,quiz_id FROM lessons WHERE course_id=%s ORDER BY position',(course_id,)).fetchall()}


@app.post('/api/courses/{course_id}/lessons',status_code=201)
def create_lesson(course_id: PositiveId, body: LessonRequest, _actor: Admin):
    try:
        with connect() as db:
            get_course(db,course_id)
            row = db.execute('''INSERT INTO lessons(course_id,title,position,theory,vocabulary,grammar,practice,quiz_id)
                                 VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id,course_id,title,position,quiz_id''',
                             (course_id,body.title,body.position,body.theory,Jsonb([x.model_dump() for x in body.vocabulary]),
                              Jsonb([x.model_dump() for x in body.grammar]),Jsonb([x.model_dump() for x in body.practice]),body.quiz_id)).fetchone()
    except UniqueViolation:
        fail(409,'lesson_position_exists','Vị trí bài học đã được sử dụng trong khóa học.')
    return {'lesson':row}


@app.get('/api/lessons/{lesson_id}')
def lesson_detail(lesson_id: PositiveId, actor: Actor):
    with connect() as db:
        lesson = db.execute('SELECT * FROM lessons WHERE id=%s',(lesson_id,)).fetchone()
        if not lesson:
            fail(404,'lesson_not_found','Không tìm thấy bài học.')
        ensure_access(db,lesson['course_id'],actor)
        lesson['completed'] = bool(db.execute('SELECT 1 FROM lesson_progress WHERE user_id=%s AND lesson_id=%s',(actor['id'],lesson_id)).fetchone())
        return {'lesson':lesson}


@app.put('/api/lessons/{lesson_id}')
def update_lesson(lesson_id: PositiveId,body: LessonRequest,_actor: Admin):
    try:
        with connect() as db:
            row = db.execute('''UPDATE lessons SET title=%s,position=%s,theory=%s,vocabulary=%s,grammar=%s,practice=%s,quiz_id=%s
                                WHERE id=%s RETURNING id,course_id,title,position,quiz_id''',
                             (body.title,body.position,body.theory,Jsonb([x.model_dump() for x in body.vocabulary]),
                              Jsonb([x.model_dump() for x in body.grammar]),Jsonb([x.model_dump() for x in body.practice]),body.quiz_id,lesson_id)).fetchone()
            if not row:
                fail(404,'lesson_not_found','Không tìm thấy bài học.')
    except UniqueViolation:
        fail(409,'lesson_position_exists','Vị trí bài học đã được sử dụng trong khóa học.')
    return {'lesson':row}


@app.post('/api/enrollments',status_code=201)
def enroll(body: EnrollmentRequest, actor: Actor):
    with connect() as db:
        course = get_course(db,body.course_id)
        if not course['is_free']:
            fail(402,'payment_required','Khóa học trả phí cần giao dịch thanh toán được xác nhận.')
        return {'enrollment':enrollment(db,actor['id'],body.course_id,'free')}


@app.get('/api/enrollments/my-courses')
def my_courses(actor: Actor):
    with connect() as db:
        rows = db.execute('''SELECT e.*,c.title,c.language_code,c.level,c.price,c.currency,
                                  count(l.id)::integer AS total_lessons,
                                  count(p.lesson_id)::integer AS completed_lessons
                             FROM enrollments e JOIN courses c ON c.id=e.course_id
                             LEFT JOIN lessons l ON l.course_id=c.id
                             LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.user_id=e.user_id
                             WHERE e.user_id=%s GROUP BY e.id,c.id ORDER BY e.created_at DESC''',(actor['id'],)).fetchall()
    for row in rows:
        row['progress_percent'] = round(100*row['completed_lessons']/row['total_lessons'],2) if row['total_lessons'] else 0
    return {'items':rows}


@app.post('/api/lessons/{lesson_id}/complete')
def complete_lesson(lesson_id: PositiveId, actor: Actor):
    with connect() as db:
        lesson = db.execute('SELECT course_id FROM lessons WHERE id=%s',(lesson_id,)).fetchone()
        if not lesson:
            fail(404,'lesson_not_found','Không tìm thấy bài học.')
        ensure_access(db,lesson['course_id'],actor)
        db.execute('INSERT INTO lesson_progress(user_id,lesson_id) VALUES (%s,%s) ON CONFLICT DO NOTHING',(actor['id'],lesson_id))
        return {'progress':db.execute('SELECT lesson_id,completed_at FROM lesson_progress WHERE user_id=%s AND lesson_id=%s',(actor['id'],lesson_id)).fetchone()}


@app.get('/internal/courses/{course_id}/purchase',dependencies=[Depends(payment_guard)])
def purchase_quote(course_id: PositiveId,user_id: UUID):
    with connect() as db:
        row = get_course(db,course_id)
        enrolled = bool(db.execute('SELECT id FROM enrollments WHERE user_id=%s AND course_id=%s',(user_id,course_id)).fetchone())
        return {'id':row['id'],'title':row['title'],'price':row['price'],'currency':row['currency'],
                'is_free':row['is_free'],'enrolled':enrolled}


@app.get('/internal/courses/{course_id}/access',dependencies=[Depends(quiz_guard)])
def quiz_access(course_id: PositiveId,user_id: UUID):
    with connect() as db:
        course = get_course(db,course_id)
        enrolled = bool(db.execute('SELECT id FROM enrollments WHERE user_id=%s AND course_id=%s',(user_id,course_id)).fetchone())
        lessons = db.execute('SELECT id FROM lessons WHERE course_id=%s',(course_id,)).fetchall()
        return {'course_id':course['id'],'enrolled':enrolled,'lesson_ids':[row['id'] for row in lessons]}


@app.post('/internal/enrollments/confirm-payment',dependencies=[Depends(payment_guard)])
def confirm_payment(body: PaymentConfirmation):
    with connect() as db:
        # Serialize duplicate notifications for one payment without relying on process memory.
        db.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',(str(body.payment_id),))
        previous = db.execute('SELECT * FROM payment_receipts WHERE payment_id=%s',(body.payment_id,)).fetchone()
        if previous:
            if any(previous[key] != getattr(body,key) for key in ('user_id','course_id','amount','currency')):
                fail(409,'payment_conflict','Mã giao dịch đã được dùng với thông tin khác.')
            return {'enrollment':enrollment(db,body.user_id,body.course_id,'payment',body.payment_id),'replayed':True}
        course = get_course(db,body.course_id)
        if course['price'] <= 0 or body.amount != course['price'] or body.currency != course['currency']:
            fail(409,'payment_mismatch','Số tiền hoặc tiền tệ không khớp khóa học.')
        db.execute('INSERT INTO payment_receipts(payment_id,user_id,course_id,amount,currency) VALUES (%s,%s,%s,%s,%s)',
                   (body.payment_id,body.user_id,body.course_id,body.amount,body.currency))
        return {'enrollment':enrollment(db,body.user_id,body.course_id,'payment',body.payment_id),'replayed':False}
