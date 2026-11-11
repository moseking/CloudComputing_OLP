"""Integration tests that use a real PostgreSQL database.

The call to Course Service is replaced by a fake so Quiz Service can be tested alone.
Skipped by default; run against a throwaway database only (see services/quiz-service/README.md):

    RUN_DB_TESTS=1 DB_HOST=localhost DB_PORT=5432 DB_NAME=quizzes_db \
    DB_USER=quizzes_app DB_PASSWORD=... python -m pytest tests/test_database_flow.py -v
"""
import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app import core, database, main
from app.main import app
from app.seed import seed

pytestmark = pytest.mark.skipif(not os.getenv('RUN_DB_TESTS'), reason='Set RUN_DB_TESTS=1 with a test database.')

client = TestClient(app)
QUIZ_ID = 1               # seeded: course 1 (free), questions 11 (single_choice, 'a') and 12 (fill_blank, 'from')
CORRECT = {'11': 'a', '12': 'from'}


@pytest.fixture(scope='module', autouse=True)
def prepared_database():
    database.migrate()
    seed()


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def enrolled(monkeypatch):
    """Course Service says the user is enrolled (course 1 owns lessons 12 and so on)."""
    state = {'enrolled': True}
    monkeypatch.setattr(main, 'call_course', lambda *a, **k: {'course_id': 1, 'enrolled': state['enrolled'], 'lesson_ids': [11, 12]})
    return state


def login_as(role='learner'):
    identity = uuid4()
    app.dependency_overrides[core.current_user] = lambda: {'id': identity, 'role': role}
    return identity


def submit(answers, quiz_id=QUIZ_ID):
    return client.post(f'/api/quizzes/{quiz_id}/submit', json={'answers': answers})


# ---------- Reading a quiz ----------
def test_get_quiz_never_exposes_correct_answers(enrolled):
    login_as()
    quiz = client.get(f'/api/quizzes/{QUIZ_ID}').json()['quiz']
    assert [q['position'] for q in quiz['questions']] == [1, 2]
    assert 'correct_answer' not in str(quiz)
    assert {o['id'] for o in quiz['questions'][0]['options']} == {'a', 'b', 'c'}


def test_get_quiz_requires_enrollment(enrolled):
    login_as()
    enrolled['enrolled'] = False
    response = client.get(f'/api/quizzes/{QUIZ_ID}')
    assert response.status_code == 403 and response.json()['error']['code'] == 'enrollment_required'
    login_as('admin')
    assert client.get(f'/api/quizzes/{QUIZ_ID}').status_code == 200


def test_unknown_quiz_returns_404(enrolled):
    login_as()
    assert client.get('/api/quizzes/999999').status_code == 404


# ---------- Grading ----------
def test_all_correct_gets_full_score_and_fill_blank_is_normalised(enrolled):
    login_as()
    body = submit({'11': 'a', '12': '  FROM '}).json()
    assert body['attempt']['score'] == body['attempt']['max_score'] == 2
    assert body['attempt']['correct_count'] == 2 and all(row['is_correct'] for row in body['answers'])


def test_wrong_answers_get_zero_and_partial_gets_partial(enrolled):
    login_as()
    assert submit({'11': 'b', '12': 'wrong'}).json()['attempt']['score'] == 0
    partial = submit({'11': 'a', '12': 'wrong'}).json()
    assert partial['attempt']['score'] == 1 and partial['attempt']['correct_count'] == 1


def test_invalid_submissions_are_rejected_with_422(enrolled):
    login_as()
    assert submit({'11': 'a'}).status_code == 422                                   # missing question
    assert submit({**CORRECT, '999': 'x'}).status_code == 422                       # extra question
    assert submit({'11': 'zzz', '12': 'from'}).status_code == 422                   # option not in list
    assert submit({}).status_code == 422                                            # empty
    assert client.post(f'/api/quizzes/{QUIZ_ID}/submit', json={'answers': CORRECT, 'score': 999}).status_code == 422
    assert client.post(f'/api/quizzes/{QUIZ_ID}/submit', json={'answers': {'11': ['a'], '12': 'from'}}).status_code == 422
    assert client.post(f'/api/quizzes/{QUIZ_ID}/submit', content=b'not json',
                       headers={'Content-Type': 'application/json'}).status_code == 422


def test_cannot_submit_without_enrollment(enrolled):
    login_as()
    enrolled['enrolled'] = False
    assert submit(CORRECT).status_code == 403


def test_rejected_submission_is_not_stored(enrolled):
    login_as()
    submit({'11': 'a'})   # invalid
    assert client.get('/api/quizzes/my-results').json()['items'] == []


# ---------- Results ----------
def test_results_are_stored_and_private_to_each_user(enrolled):
    login_as()
    submit({'11': 'b', '12': 'wrong'})
    submit(CORRECT)
    results = client.get(f'/api/quizzes/{QUIZ_ID}/results').json()
    assert len(results['items']) == 2 and results['items'][0]['answers'][0]['prompt']
    assert len(client.get('/api/quizzes/my-results').json()['items']) == 2
    login_as()   # a different learner sees nothing
    assert client.get(f'/api/quizzes/{QUIZ_ID}/results').json()['items'] == []
    assert client.get('/api/quizzes/my-results').json()['items'] == []


# ---------- Admin authoring ----------
QUIZ_BODY = {'course_id': 1, 'lesson_id': 11, 'title': 'Test quiz', 'questions': [
    {'kind': 'single_choice', 'prompt': 'Pick a', 'options': [{'id': 'a', 'text': 'A'}, {'id': 'b', 'text': 'B'}],
     'correct_answer': 'a', 'points': 3},
    {'kind': 'fill_blank', 'prompt': 'Type x', 'correct_answer': 'x'}]}


def test_admin_creates_quiz_and_it_is_graded_with_points(enrolled):
    login_as()
    assert client.post('/api/quizzes', json=QUIZ_BODY).status_code == 403
    login_as('admin')
    created = client.post('/api/quizzes', json=QUIZ_BODY)
    assert created.status_code == 201
    quiz_id = created.json()['quiz']['id']
    login_as()
    questions = client.get(f'/api/quizzes/{quiz_id}').json()['quiz']['questions']
    answers = {str(questions[0]['id']): 'a', str(questions[1]['id']): 'x'}
    assert submit(answers, quiz_id).json()['attempt']['max_score'] == 4


def test_quiz_authoring_validation(enrolled):
    login_as('admin')
    bad_answer = {**QUIZ_BODY, 'questions': [{**QUIZ_BODY['questions'][0], 'correct_answer': 'z'}]}
    assert client.post('/api/quizzes', json=bad_answer).status_code == 422
    assert client.post('/api/quizzes', json={**QUIZ_BODY, 'questions': []}).status_code == 422
    wrong_lesson = {**QUIZ_BODY, 'lesson_id': 4242}
    assert client.post('/api/quizzes', json=wrong_lesson).status_code == 422
