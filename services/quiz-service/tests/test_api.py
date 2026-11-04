from uuid import UUID
import pytest
from fastapi.testclient import TestClient
from app import core
from app.main import app

client = TestClient(app)
IDENTITY = UUID('00000000-0000-4000-8000-000000000001')


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def learner():
    app.dependency_overrides[core.current_user] = lambda: {'id':IDENTITY,'role':'learner'}


def test_health_identifies_process_without_claiming_database_readiness():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'service':'quiz-service','status':'ok','version':'1.0.0','database':'not_checked'}


def test_swagger_and_openapi_available():
    assert client.get('/docs').status_code == 200
    schema = client.get('/openapi.json').json()
    assert schema['info']['title'] == 'quiz-service'
    assert '/ready' in schema['paths']


def test_unknown_route_has_structured_error():
    response = client.get('/not-a-route')
    assert response.status_code == 404 and response.json()['error']['code'] == 'http_error'


def test_protected_endpoint_requires_authentication():
    response = client.get('/api/quizzes/my-results')
    assert response.status_code == 401
    assert client.get('/api/quizzes/my-results',headers={'Authorization':'Bearer broken'}).status_code == 401


def test_learner_cannot_self_promote_via_signed_claims(tmp_path,monkeypatch):
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    from datetime import datetime,timedelta,timezone
    import jwt
    key = rsa.generate_private_key(public_exponent=65537,key_size=2048)
    public = tmp_path/'public.pem'
    public.write_bytes(key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo))
    monkeypatch.setenv('JWT_PUBLIC_KEY_PATH',str(public))
    now = datetime.now(timezone.utc)
    private = key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption())
    payload = {'sub':str(IDENTITY),'role':'learner','iat':now,'nbf':now,'exp':now+timedelta(minutes=5),'iss':'oelp-users','aud':'oelp'}
    token = jwt.encode(payload,private,algorithm='RS256')
    from fastapi.security import HTTPAuthorizationCredentials
    actor = core.current_user(HTTPAuthorizationCredentials(scheme='Bearer',credentials=token))
    assert actor['role']=='learner' and actor['id']==IDENTITY
    parts=token.split('.')
    import base64,json
    claims=json.loads(base64.urlsafe_b64decode(parts[1]+'==='))
    claims['role']='admin'
    parts[1]=base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    with pytest.raises(Exception) as error:
        core.current_user(HTTPAuthorizationCredentials(scheme='Bearer',credentials='.'.join(parts)))
    assert error.value.status_code==401
    expired=jwt.encode({**payload,'exp':now-timedelta(seconds=1)},private,algorithm='RS256')
    with pytest.raises(Exception) as error:
        core.current_user(HTTPAuthorizationCredentials(scheme='Bearer',credentials=expired))
    assert error.value.status_code==401

def test_single_choice_and_fill_blank_are_graded_on_backend():
    from app.grading import grade
    questions=[{'id':1,'kind':'single_choice','correct_answer':'b','points':2,'options':[{'id':'a'},{'id':'b'}]},
               {'id':2,'kind':'fill_blank','correct_answer':'New York','points':1,'options':[]}]
    result=grade(questions,{'1':'b','2':'  NEW   YORK '})
    assert result['score']==3 and result['max_score']==3 and result['correct_count']==2
    assert grade(questions,{'1':'a','2':'wrong'})['score']==0


def test_missing_extra_and_invalid_answers_rejected():
    from app.grading import grade
    questions=[{'id':1,'kind':'single_choice','correct_answer':'a','points':1,'options':[{'id':'a'},{'id':'b'}]}]
    for body in ({},{'1':'a','2':'extra'},{'1':'unlisted'}):
        with pytest.raises(ValueError): grade(questions,body)


def test_submission_rejects_client_score_and_identity(learner):
    for field,value in [('score',100),('user_id',str(IDENTITY)),('correct_answer','a')]:
        assert client.post('/api/quizzes/1/submit',json={'answers':{'11':'a'},field:value}).status_code==422


def test_static_results_route_is_not_parsed_as_quiz_id():
    assert client.get('/api/quizzes/my-results').status_code==401
