from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import Header, HTTPException, Response
from psycopg.errors import UniqueViolation
from pydantic import Field

from .core import Actor, Admin, InputModel, call_course, create_app, enabled, fail
from .database import connect

app = create_app('payment-service')


class PaymentRequest(InputModel):
    course_id: int = Field(gt=0)


class SimulationRequest(InputModel):
    scenario: Literal['success','failure']


def payment_row(db,payment_id):
    row = db.execute('SELECT * FROM transactions WHERE id=%s',(payment_id,)).fetchone()
    if not row:
        fail(404,'payment_not_found','Không tìm thấy giao dịch.')
    return row


def existing_request(db,user_id,key,course_id):
    row = db.execute('SELECT * FROM transactions WHERE user_id=%s AND idempotency_key=%s',(user_id,key)).fetchone()
    if row and row['course_id'] != course_id:
        fail(409,'idempotency_conflict','Idempotency-Key đã được dùng cho khóa học khác.')
    return row


@app.get('/api/payments/my-transactions')
def my_transactions(actor: Actor):
    with connect() as db:
        return {'items':db.execute('SELECT * FROM transactions WHERE user_id=%s ORDER BY created_at DESC',(actor['id'],)).fetchall()}


@app.post('/api/payments',status_code=201)
def create_payment(body: PaymentRequest, actor: Actor, response: Response,
                   idempotency_key: Annotated[UUID,Header(alias='Idempotency-Key')]):
    with connect() as db:
        previous = existing_request(db,actor['id'],idempotency_key,body.course_id)
    if previous:
        response.status_code = 200
        return {'transaction':previous,'replayed':True}
    quote = call_course(f'/internal/courses/{body.course_id}/purchase','PAYMENT_SERVICE_TOKEN',
                        params={'user_id':str(actor['id'])})
    if quote['is_free']:
        fail(400,'free_course','Khóa học miễn phí có thể đăng ký trực tiếp.')
    if quote.get('enrolled'):
        fail(409,'already_enrolled','Bạn đã có quyền học khóa học này.')
    try:
        with connect() as db:
            row = db.execute('''INSERT INTO transactions(id,user_id,course_id,course_title,amount,currency,idempotency_key)
                                 VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
                             (uuid4(),actor['id'],body.course_id,quote['title'],quote['price'],quote['currency'],idempotency_key)).fetchone()
            db.execute("INSERT INTO payment_events(payment_id,event_type) VALUES (%s,'PENDING')",(row['id'],))
    except UniqueViolation:
        with connect() as db:
            row = existing_request(db,actor['id'],idempotency_key,body.course_id)
        response.status_code = 200
        return {'transaction':row,'replayed':True}
    return {'transaction':row,'replayed':False}


@app.get('/api/payments/{payment_id}')
def get_payment(payment_id: UUID, actor: Actor):
    with connect() as db:
        row = payment_row(db,payment_id)
    if row['user_id'] != actor['id'] and actor['role'] != 'admin':
        fail(403,'payment_forbidden','Bạn không có quyền xem giao dịch này.')
    return {'transaction':row}


@app.post('/api/payments/{payment_id}/simulate-result')
def simulate_result(payment_id: UUID, body: SimulationRequest, _actor: Admin, response: Response):
    if not enabled('DEMO_MODE'):
        fail(403,'demo_disabled','Mô phỏng chỉ được bật trong môi trường demo.')
    target = {'success':'SUCCESS','failure':'FAILED'}[body.scenario]
    with connect() as db:
        row = db.execute('SELECT * FROM transactions WHERE id=%s FOR UPDATE',(payment_id,)).fetchone()
        if not row:
            fail(404,'payment_not_found','Không tìm thấy giao dịch.')
        if row['status'] != 'PENDING' and row['status'] != target:
            fail(409,'terminal_payment','Giao dịch đã có kết quả cuối cùng khác.')
        db.execute('UPDATE transactions SET status=%s,updated_at=now() WHERE id=%s',(target,payment_id))
        db.execute('INSERT INTO payment_events(payment_id,event_type) VALUES (%s,%s) ON CONFLICT DO NOTHING',(payment_id,target))
        row = payment_row(db,payment_id)
    # Persist the result before cross-service I/O. Retrying SUCCESS safely redelivers the callback.
    if row['status'] == 'SUCCESS':
        payload = {'payment_id':str(row['id']),'user_id':str(row['user_id']),
                   'course_id':row['course_id'],'amount':row['amount'],'currency':row['currency']}
        try:
            call_course('/internal/enrollments/confirm-payment','PAYMENT_SERVICE_TOKEN',method='POST',body=payload)
        except HTTPException:
            response.status_code = 202
            return {'transaction':row,'access_status':'pending_confirmation','retry_allowed':True}
        with connect() as db:
            db.execute('UPDATE transactions SET enrollment_confirmed=true,updated_at=now() WHERE id=%s',(payment_id,))
            db.execute("INSERT INTO payment_events(payment_id,event_type) VALUES (%s,'ENROLLMENT_GRANTED') ON CONFLICT DO NOTHING",(payment_id,))
            row = payment_row(db,payment_id)
    return {'transaction':row,'access_status':'granted' if row['enrollment_confirmed'] else 'not_granted'}
