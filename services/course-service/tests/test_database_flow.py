"""Integration tests that use a real PostgreSQL database.

They are skipped by default so `pytest` still works without a database.
Run them against a throwaway database only (see services/course-service/README.md):

    RUN_DB_TESTS=1 DB_HOST=localhost DB_PORT=5432 DB_NAME=courses_db \
    DB_USER=courses_app DB_PASSWORD=... python -m pytest tests/test_database_flow.py -v
"""
import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app import core, database
from app.main import app
from app.seed import seed

pytestmark = pytest.mark.skipif(not os.getenv('RUN_DB_TESTS'), reason='Set RUN_DB_TESTS=1 with a test database.')

client = TestClient(app)
FREE_COURSE, PAID_COURSE = 1, 2          # seeded: A1 free, A2 149000 VND
FREE_LESSON, PAID_LESSON = 11, 21
SERVICE_HEADERS = {'X-Service-Token': 'test-payment-token-not-a-secret'}


@pytest.fixture(scope='module', autouse=True)
def prepared_database():
    database.migrate()
    seed()


@pytest.fixture(autouse=True)
def service_token(monkeypatch):
    monkeypatch.setenv('PAYMENT_SERVICE_TOKEN', SERVICE_HEADERS['X-Service-Token'])


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def login_as(role='learner'):
    identity = uuid4()
    app.dependency_overrides[core.current_user] = lambda: {'id': identity, 'role': role}
    return identity


# ---------- Catalog ----------
def test_list_courses_returns_seeded_catalog_with_free_flag():
    body = client.get('/api/courses').json()
    assert body['total'] >= 8 and len(body['items']) == body['total']
    by_id = {row['id']: row for row in body['items']}
    assert by_id[FREE_COURSE]['is_free'] is True
    assert by_id[PAID_COURSE]['is_free'] is False and by_id[PAID_COURSE]['price'] == 149000


def test_filter_courses_by_level_and_language():
    items = client.get('/api/courses?level=A2').json()['items']
    assert items and all(row['level'] == 'A2' for row in items)
    assert client.get('/api/courses?language_code=xx').json()['total'] == 0


def test_course_detail_and_not_found():
    assert client.get(f'/api/courses/{FREE_COURSE}').json()['course']['title'] == 'English First Steps'
    response = client.get('/api/courses/999999')
    assert response.status_code == 404 and response.json()['error']['code'] == 'course_not_found'


def test_lessons_of_course_are_ordered():
    items = client.get(f'/api/courses/{FREE_COURSE}/lessons').json()['items']
    assert [row['position'] for row in items] == sorted(row['position'] for row in items) and len(items) >= 2
    assert 'theory' not in items[0]   # content is only returned by the protected lesson endpoint


# ---------- Enrollment ----------
def test_enroll_free_course_is_idempotent():
    login_as()
    first = client.post('/api/enrollments', json={'course_id': FREE_COURSE})
    second = client.post('/api/enrollments', json={'course_id': FREE_COURSE})
    assert first.status_code == second.status_code == 201
    assert first.json()['enrollment']['id'] == second.json()['enrollment']['id']
    assert first.json()['enrollment']['source'] == 'free'


def test_paid_course_cannot_be_enrolled_without_payment():
    login_as()
    response = client.post('/api/enrollments', json={'course_id': PAID_COURSE})
    assert response.status_code == 402 and response.json()['error']['code'] == 'payment_required'


def test_enroll_unknown_course_and_invalid_body():
    login_as()
    assert client.post('/api/enrollments', json={'course_id': 999999}).status_code == 404
    assert client.post('/api/enrollments', json={'course_id': 0}).status_code == 422
    assert client.post('/api/enrollments', json={}).status_code == 422


# ---------- Access rule + progress ----------
def test_lesson_requires_enrollment_but_admin_bypasses():
    login_as()
    response = client.get(f'/api/lessons/{FREE_LESSON}')
    assert response.status_code == 403 and response.json()['error']['code'] == 'enrollment_required'
    login_as('admin')
    assert client.get(f'/api/lessons/{FREE_LESSON}').status_code == 200


def test_enrolled_learner_reads_lesson_and_progress_is_tracked():
    login_as()
    client.post('/api/enrollments', json={'course_id': FREE_COURSE})
    lesson = client.get(f'/api/lessons/{FREE_LESSON}').json()['lesson']
    assert all(key in lesson for key in ('theory', 'vocabulary', 'grammar', 'practice')) and lesson['completed'] is False
    assert client.post(f'/api/lessons/{FREE_LESSON}/complete').status_code == 200
    assert client.post(f'/api/lessons/{FREE_LESSON}/complete').status_code == 200   # idempotent
    mine = {row['course_id']: row for row in client.get('/api/enrollments/my-courses').json()['items']}
    assert mine[FREE_COURSE]['completed_lessons'] == 1
    assert 0 < mine[FREE_COURSE]['progress_percent'] <= 100


def test_progress_is_private_per_user():
    login_as()
    client.post('/api/enrollments', json={'course_id': FREE_COURSE})
    client.post(f'/api/lessons/{FREE_LESSON}/complete')
    login_as()   # another user
    client.post('/api/enrollments', json={'course_id': FREE_COURSE})
    mine = {row['course_id']: row for row in client.get('/api/enrollments/my-courses').json()['items']}
    assert mine[FREE_COURSE]['completed_lessons'] == 0


def test_unknown_lesson_returns_404():
    login_as()
    assert client.get('/api/lessons/999999').status_code == 404
    assert client.post('/api/lessons/999999/complete').status_code == 404


# ---------- Payment -> enrollment (called by Payment Service) ----------
def payment_body(user, **changes):
    return {'payment_id': str(uuid4()), 'user_id': str(user), 'course_id': PAID_COURSE,
            'amount': 149000, 'currency': 'VND', **changes}


def test_confirmed_payment_unlocks_paid_course_and_is_replay_safe():
    user = login_as()
    assert client.get(f'/api/lessons/{PAID_LESSON}').status_code == 403
    body = payment_body(user)
    first = client.post('/internal/enrollments/confirm-payment', headers=SERVICE_HEADERS, json=body)
    again = client.post('/internal/enrollments/confirm-payment', headers=SERVICE_HEADERS, json=body)
    assert first.status_code == again.status_code == 200
    assert first.json()['replayed'] is False and again.json()['replayed'] is True
    assert client.get(f'/api/lessons/{PAID_LESSON}').status_code == 200


def test_payment_with_wrong_amount_or_reused_id_is_rejected():
    user = login_as()
    bad = client.post('/internal/enrollments/confirm-payment', headers=SERVICE_HEADERS,
                      json=payment_body(user, amount=1))
    assert bad.status_code == 409 and bad.json()['error']['code'] == 'payment_mismatch'
    assert client.get(f'/api/lessons/{PAID_LESSON}').status_code == 403   # still locked
    good = payment_body(user)
    client.post('/internal/enrollments/confirm-payment', headers=SERVICE_HEADERS, json=good)
    conflict = client.post('/internal/enrollments/confirm-payment', headers=SERVICE_HEADERS,
                           json={**good, 'user_id': str(uuid4())})
    assert conflict.status_code == 409 and conflict.json()['error']['code'] == 'payment_conflict'


def test_admin_can_create_course_but_learner_cannot():
    body = {'language_code': 'en', 'level': 'B2', 'title': f'Test {uuid4().hex[:6]}', 'description': 'x', 'price': 0}
    login_as()
    assert client.post('/api/courses', json=body).status_code == 403
    login_as('admin')
    created = client.post('/api/courses', json=body)
    assert created.status_code == 201 and created.json()['course']['id'] >= 100
    assert client.post('/api/courses', json={**body, 'language_code': 'zz'}).status_code == 422
