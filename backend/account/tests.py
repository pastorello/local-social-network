import pytest
from rest_framework.test import APIClient

from account.models import User

pytestmark = pytest.mark.django_db

PASSWORD = 'GaetaTest2026!'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def citizen():
    return User.objects.create_user(
        name='Cittadino Uno', email='cittadino@example.com', password=PASSWORD
    )


@pytest.fixture
def auth_client(api_client, citizen):
    response = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    )
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.json()['access'])
    return api_client


# --- F1.1 signup ---


def test_signup_creates_active_citizen(api_client):
    response = api_client.post(
        '/api/users/signup/',
        {
            'email': 'nuovo@example.com',
            'name': 'Nuovo Utente',
            'password1': PASSWORD,
            'password2': PASSWORD,
        },
    )

    assert response.status_code == 201
    assert 'detail' in response.json()

    user = User.objects.get(email='nuovo@example.com')
    assert user.is_active is True  # no e-mail activation in the MVP
    assert user.role == User.CITIZEN
    assert user.is_staff is False


def test_signup_rejects_duplicate_email(api_client, citizen):
    response = api_client.post(
        '/api/users/signup/',
        {
            'email': citizen.email,
            'name': 'Impostore',
            'password1': PASSWORD,
            'password2': PASSWORD,
        },
    )

    assert response.status_code == 400
    assert 'email' in response.json()['fields']
    assert User.objects.filter(email=citizen.email).count() == 1


def test_signup_rejects_password_mismatch(api_client):
    response = api_client.post(
        '/api/users/signup/',
        {
            'email': 'mismatch@example.com',
            'name': 'Password Sbagliata',
            'password1': PASSWORD,
            'password2': PASSWORD + 'x',
        },
    )

    assert response.status_code == 400
    assert 'password2' in response.json()['fields']
    assert not User.objects.filter(email='mismatch@example.com').exists()


# --- F1.2 login ---


def test_login_returns_token_pair(api_client, citizen):
    response = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    )

    assert response.status_code == 200
    data = response.json()
    assert data['access']
    assert data['refresh']


def test_login_rejects_wrong_password(api_client, citizen):
    response = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': 'wrong-password'}
    )

    assert response.status_code == 401


# --- /me ---


def test_me_requires_auth(api_client):
    assert api_client.get('/api/users/me/').status_code == 401


def test_me_returns_profile_with_role(auth_client, citizen):
    response = auth_client.get('/api/users/me/')

    assert response.status_code == 200
    data = response.json()
    assert data['id'] == str(citizen.id)
    assert data['email'] == citizen.email
    assert data['name'] == citizen.name
    assert data['role'] == User.CITIZEN
    assert data['avatar']


# --- F1.4 profile editing ---


def test_editprofile_requires_auth(api_client):
    assert api_client.post('/api/users/editprofile/', {}).status_code == 401


def test_editprofile_updates_name_and_email(auth_client, citizen):
    response = auth_client.post(
        '/api/users/editprofile/',
        {'name': 'Nome Nuovo', 'email': 'nuova-mail@example.com'},
    )

    assert response.status_code == 200
    assert 'detail' in response.json()

    citizen.refresh_from_db()
    assert citizen.name == 'Nome Nuovo'
    assert citizen.email == 'nuova-mail@example.com'


def test_editprofile_rejects_taken_email(auth_client):
    User.objects.create_user(
        name='Altro Utente', email='occupata@example.com', password=PASSWORD
    )

    response = auth_client.post(
        '/api/users/editprofile/',
        {'name': 'Cittadino Uno', 'email': 'occupata@example.com'},
    )

    assert response.status_code == 400
    assert 'email' in response.json()['fields']


def test_editpassword_changes_password(auth_client, api_client, citizen):
    new_password = 'NuovaPassword2026!'
    response = auth_client.post(
        '/api/users/editpassword/',
        {
            'old_password': PASSWORD,
            'new_password1': new_password,
            'new_password2': new_password,
        },
    )

    assert response.status_code == 200
    assert 'detail' in response.json()

    relogin = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': new_password}
    )
    assert relogin.status_code == 200


def test_editpassword_rejects_wrong_old_password(auth_client):
    response = auth_client.post(
        '/api/users/editpassword/',
        {
            'old_password': 'not-the-password',
            'new_password1': 'NuovaPassword2026!',
            'new_password2': 'NuovaPassword2026!',
        },
    )

    assert response.status_code == 400
    assert 'old_password' in response.json()['fields']


# --- user list / detail privacy (F1.4: e-mail only via /me) ---


def test_user_list_requires_auth(api_client):
    assert api_client.get('/api/users/list/').status_code == 401


def test_user_list_searches_by_name_and_hides_email(auth_client):
    User.objects.create_user(
        name='Sindaco Gaeta', email='sindaco@example.com', password=PASSWORD
    )

    response = auth_client.get('/api/users/list/', {'q': 'Sindaco'})

    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]['name'] == 'Sindaco Gaeta'
    assert 'email' not in results[0]


def test_user_list_no_longer_accepts_post(auth_client):
    assert auth_client.post('/api/users/list/', {'query': 'x'}).status_code == 405


def test_user_detail_hides_email(auth_client, citizen):
    response = auth_client.get(f'/api/users/{citizen.id}/')

    assert response.status_code == 200
    data = response.json()
    assert data['name'] == citizen.name
    assert 'email' not in data
