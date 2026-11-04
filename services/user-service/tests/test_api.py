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
    assert response.json() == {'service':'user-service','status':'ok','version':'1.0.0','database':'not_checked'}


def test_swagger_and_openapi_available():
    assert client.get('/docs').status_code == 200
    schema = client.get('/openapi.json').json()
    assert schema['info']['title'] == 'user-service'
    assert '/ready' in schema['paths']


def test_unknown_route_has_structured_error():
    response = client.get('/not-a-route')
    assert response.status_code == 404 and response.json()['error']['code'] == 'http_error'


def test_protected_endpoint_requires_authentication():
    response = client.get('/api/users/me')
    assert response.status_code == 401
    assert client.get('/api/users/me',headers={'Authorization':'Bearer broken'}).status_code == 401


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

def test_registration_rejects_admin_role():
    response=client.post('/api/users/register',json={'email':'demo@example.com','password':'demo-only-123','display_name':'Demo','role':'admin'})
    assert response.status_code==422


def test_validation_does_not_echo_password():
    response=client.post('/api/users/register',json={'email':'invalid','password':'secret-sensitive'})
    assert response.status_code==422 and 'secret-sensitive' not in response.text


def test_password_hash_is_salted_and_verifies():
    from app.security import hasher,verify_password
    password='temporary-unit-test-password'
    first,second=hasher.hash(password),hasher.hash(password)
    assert first != second and first.startswith('$argon2id$') and password not in first
    assert verify_password(first,password)
    assert not verify_password(first,'wrong-password')


def test_profile_rejects_duplicate_languages_and_role(learner):
    body={'display_name':'Learner','language_preferences':[{'language_code':'en','level':'A1'},{'language_code':'en','level':'A2'}]}
    assert client.put('/api/users/me',json=body).status_code==422
    assert client.put('/api/users/me',json={'display_name':'Learner','role':'admin'}).status_code==422
