from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Path
from pydantic import Field, model_validator

from .core import Actor, Admin, InputModel, Name, call_course, create_app, fail
from .database import connect
from .grading import grade
from .seed import seed

app = create_app('quiz-service', seed)
PositiveId = Annotated[int, Path(gt=0)]


class Option(InputModel):
    id: str = Field(min_length=1,max_length=30)
    text: str = Field(min_length=1,max_length=2000)


class Question(InputModel):
    kind: Literal['single_choice','fill_blank']
    prompt: str = Field(min_length=1,max_length=5000)
    options: list[Option] = Field(default_factory=list,max_length=6)
    correct_answer: str = Field(min_length=1,max_length=1000)
    points: int = Field(default=1,ge=1,le=10)

    @model_validator(mode='after')
    def valid_answer(self):
        ids = {option.id for option in self.options}
        if len(ids) != len(self.options):
            raise ValueError('Mã lựa chọn phải duy nhất.')
        if self.kind == 'single_choice' and (len(ids)<2 or self.correct_answer not in ids):
            raise ValueError('Trắc nghiệm cần ít nhất hai lựa chọn và một mã đáp án hợp lệ.')
        if self.kind == 'fill_blank' and self.options:
            raise ValueError('Câu điền từ không có danh sách lựa chọn.')
        return self


class QuizRequest(InputModel):
    course_id: int = Field(gt=0)
    lesson_id: int | None = Field(default=None,gt=0)
    title: Name
    questions: list[Question] = Field(min_length=1,max_length=100)


class SubmissionRequest(InputModel):
    answers: dict[str, Annotated[str, Field(min_length=1,max_length=1000)]] = Field(min_length=1,max_length=100)


def quiz_row(db,quiz_id):
    row = db.execute('SELECT * FROM quizzes WHERE id=%s',(quiz_id,)).fetchone()
    if not row:
        fail(404,'quiz_not_found','Không tìm thấy bài kiểm tra.')
    return row


def access(course_id,actor):
    result = call_course(f'/internal/courses/{course_id}/access','QUIZ_SERVICE_TOKEN',params={'user_id':str(actor['id'])})
    if actor['role'] != 'admin' and not result['enrolled']:
        fail(403,'enrollment_required','Bạn cần đăng ký khóa học trước khi làm bài kiểm tra.')
    return result


def questions(db,quiz_id):
    rows = db.execute('SELECT * FROM questions WHERE quiz_id=%s ORDER BY position',(quiz_id,)).fetchall()
    for row in rows:
        row['options'] = db.execute('SELECT option_id AS id,text FROM answer_options WHERE question_id=%s ORDER BY option_id',(row['id'],)).fetchall()
    return rows


@app.get('/api/quizzes/my-results')
def my_results(actor: Actor):
    with connect() as db:
        rows = db.execute('''SELECT a.*,q.title,q.course_id FROM quiz_attempts a JOIN quizzes q ON q.id=a.quiz_id
                             WHERE a.user_id=%s ORDER BY a.submitted_at DESC''',(actor['id'],)).fetchall()
    return {'items':rows}


@app.post('/api/quizzes',status_code=201)
def create_quiz(body: QuizRequest, actor: Admin):
    permission = access(body.course_id,actor)
    if body.lesson_id is not None and body.lesson_id not in permission['lesson_ids']:
        fail(422,'lesson_course_mismatch','Bài học không thuộc khóa học đã chọn.')
    with connect() as db:
        quiz = db.execute('INSERT INTO quizzes(course_id,lesson_id,title) VALUES (%s,%s,%s) RETURNING *',
                          (body.course_id,body.lesson_id,body.title)).fetchone()
        for position,question in enumerate(body.questions,1):
            row = db.execute('''INSERT INTO questions(quiz_id,kind,prompt,correct_answer,points,position)
                                 VALUES (%s,%s,%s,%s,%s,%s) RETURNING id''',
                             (quiz['id'],question.kind,question.prompt,question.correct_answer,question.points,position)).fetchone()
            for option in question.options:
                db.execute('INSERT INTO answer_options(question_id,option_id,text) VALUES (%s,%s,%s)',(row['id'],option.id,option.text))
    return {'quiz':quiz}


@app.get('/api/quizzes/{quiz_id}')
def get_quiz(quiz_id: PositiveId, actor: Actor):
    with connect() as db:
        quiz = quiz_row(db,quiz_id)
        access(quiz['course_id'],actor)
        rows = questions(db,quiz_id)
    quiz['questions'] = [{key:value for key,value in row.items() if key not in ('correct_answer','quiz_id')}
                         for row in rows]
    return {'quiz':quiz}


@app.post('/api/quizzes/{quiz_id}/submit',status_code=201)
def submit(quiz_id: PositiveId, body: SubmissionRequest, actor: Actor):
    with connect() as db:
        quiz = quiz_row(db,quiz_id)
        access(quiz['course_id'],actor)
        try:
            graded = grade(questions(db,quiz_id),body.answers)
        except ValueError as error:
            fail(422,'invalid_answers',str(error))
        attempt = db.execute('''INSERT INTO quiz_attempts(id,user_id,quiz_id,score,max_score,correct_count)
                                VALUES (%s,%s,%s,%s,%s,%s) RETURNING *''',
                             (uuid4(),actor['id'],quiz_id,graded['score'],graded['max_score'],graded['correct_count'])).fetchone()
        for row in graded['answers']:
            db.execute('''INSERT INTO quiz_answers(attempt_id,question_id,submitted_answer,correct_answer,is_correct,awarded_points)
                          VALUES (%s,%s,%s,%s,%s,%s)''',
                       (attempt['id'],row['question_id'],row['submitted_answer'],row['correct_answer'],row['is_correct'],row['awarded_points']))
    return {'attempt':attempt,'answers':graded['answers']}


@app.get('/api/quizzes/{quiz_id}/results')
def results(quiz_id: PositiveId, actor: Actor):
    with connect() as db:
        quiz = quiz_row(db,quiz_id)
        access(quiz['course_id'],actor)
        attempts = db.execute('SELECT * FROM quiz_attempts WHERE user_id=%s AND quiz_id=%s ORDER BY submitted_at DESC',(actor['id'],quiz_id)).fetchall()
        for row in attempts:
            row['answers'] = db.execute('''SELECT a.question_id,a.submitted_answer,a.correct_answer,a.is_correct,a.awarded_points,q.prompt
                                          FROM quiz_answers a JOIN questions q ON q.id=a.question_id
                                          WHERE a.attempt_id=%s ORDER BY q.position''',(row['id'],)).fetchall()
    return {'quiz':quiz,'items':attempts}
