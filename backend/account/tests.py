from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from account.models import User
from common.testing import PASSWORD

pytestmark = pytest.mark.django_db


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


# --- token refresh hardening (M4, spec §6/A2) ---


def test_refresh_rotates_and_blacklists_the_old_token(api_client, citizen):
    login = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    )
    old_refresh = login.json()['refresh']

    refreshed = api_client.post('/api/users/refresh/', {'refresh': old_refresh})

    assert refreshed.status_code == 200
    data = refreshed.json()
    assert data['access']
    assert data['refresh'] and data['refresh'] != old_refresh  # rotation is on

    # the rotated-out token is blacklisted and cannot be replayed
    reused = api_client.post('/api/users/refresh/', {'refresh': old_refresh})
    assert reused.status_code == 401


# --- F1.4 avatar upload hardening (TD-12) ---


def make_avatar(fmt='JPEG', name='avatar.jpg', size=(60, 40), with_gps=True):
    buffer = BytesIO()
    image = Image.new('RGB', size, 'blue')
    if with_gps:
        exif = Image.Exif()
        exif[274] = 6  # orientation
        # GPSInfo — the tag that turns a selfie into a home address.
        exif[34853] = {1: 'N', 2: (41.0, 13.0, 0.0), 3: 'E', 4: (13.0, 33.0, 0.0)}
        image.save(buffer, format=fmt, exif=exif.tobytes())
    else:
        image.save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


def stored_avatar(user):
    user.refresh_from_db()
    with user.avatar.open('rb') as handle:
        return Image.open(BytesIO(handle.read()))


def test_editprofile_strips_gps_from_the_avatar(auth_client, citizen):
    """The headline of TD-12: avatars are public via GET /api/reports/."""
    response = auth_client.post(
        '/api/users/editprofile/',
        {'name': citizen.name, 'email': citizen.email, 'avatar': make_avatar()},
        format='multipart',
    )

    assert response.status_code == 200
    assert len(stored_avatar(citizen).getexif()) == 0


def test_editprofile_applies_avatar_orientation_before_dropping_exif(auth_client, citizen):
    auth_client.post(
        '/api/users/editprofile/',
        {'name': citizen.name, 'email': citizen.email, 'avatar': make_avatar(size=(60, 40))},
        format='multipart',
    )

    assert stored_avatar(citizen).size == (40, 60)


def test_editprofile_rejects_a_non_image_extension(auth_client, citizen):
    """Django's own `validate_image_file_extension` handles the blunt case."""
    response = auth_client.post(
        '/api/users/editprofile/',
        {
            'name': citizen.name,
            'email': citizen.email,
            'avatar': make_avatar(fmt='PNG', name='pwned.html', with_gps=False),
        },
        format='multipart',
    )

    assert response.status_code == 400
    assert 'avatar' in response.json()['fields']
    citizen.refresh_from_db()
    assert not citizen.avatar


def test_editprofile_normalises_a_confusable_avatar_extension(auth_client, citizen):
    """`.pdf` passes Django's validator — Pillow knows the extension — and used
    to be stored as-is, so the avatar was served as `application/pdf`."""
    auth_client.post(
        '/api/users/editprofile/',
        {
            'name': citizen.name,
            'email': citizen.email,
            'avatar': make_avatar(fmt='PNG', name='payload.pdf', with_gps=False),
        },
        format='multipart',
    )

    citizen.refresh_from_db()
    assert citizen.avatar.name.endswith('.png')
    assert '.pdf' not in citizen.avatar.name


def test_editprofile_rejects_an_oversized_avatar(auth_client, citizen):
    huge = SimpleUploadedFile('grande.png', b'x' * (5 * 1024 * 1024 + 1))

    response = auth_client.post(
        '/api/users/editprofile/',
        {'name': citizen.name, 'email': citizen.email, 'avatar': huge},
        format='multipart',
    )

    assert response.status_code == 400
    assert 'avatar' in response.json()['fields']


def test_editprofile_rejects_an_avatar_outside_the_allowlist(auth_client, citizen):
    response = auth_client.post(
        '/api/users/editprofile/',
        {
            'name': citizen.name,
            'email': citizen.email,
            'avatar': make_avatar(fmt='GIF', name='animata.gif', with_gps=False),
        },
        format='multipart',
    )

    assert response.status_code == 400
    assert 'avatar' in response.json()['fields']


def test_editprofile_leaves_an_unchanged_avatar_alone(auth_client, citizen):
    """Guards the UploadedFile check: a profile edit must not re-encode the
    stored avatar on every save."""
    auth_client.post(
        '/api/users/editprofile/',
        {'name': citizen.name, 'email': citizen.email, 'avatar': make_avatar()},
        format='multipart',
    )
    citizen.refresh_from_db()
    original_name = citizen.avatar.name
    original_bytes = citizen.avatar.read()

    response = auth_client.post(
        '/api/users/editprofile/',
        {'name': 'Nome Nuovo', 'email': citizen.email},
        format='multipart',
    )

    assert response.status_code == 200
    citizen.refresh_from_db()
    assert citizen.name == 'Nome Nuovo'
    assert citizen.avatar.name == original_name
    assert citizen.avatar.read() == original_bytes


# --- TD-18: rate limiting on the credential endpoints ---


def signup_payload(n):
    return {
        'email': f'nuovo{n}@example.com',
        'name': f'Nuovo {n}',
        'password1': PASSWORD,
        'password2': PASSWORD,
    }


def test_login_is_throttled(api_client, citizen):
    """An unthrottled credential endpoint is a free password oracle — and every
    attempt costs a full PBKDF2 hash, so it is a CPU amplifier too."""
    bad = {'email': citizen.email, 'password': 'sbagliata'}
    codes = [api_client.post('/api/users/login/', bad).status_code for _ in range(12)]

    assert 429 in codes, codes
    assert codes.count(401) <= 10


def test_a_throttled_login_explains_itself_in_italian(api_client, citizen):
    bad = {'email': citizen.email, 'password': 'sbagliata'}
    for _ in range(12):
        response = api_client.post('/api/users/login/', bad)
        if response.status_code == 429:
            break

    assert response.status_code == 429
    assert 'Troppi tentativi' in response.json()['detail']


def test_signup_is_throttled(api_client):
    codes = [
        api_client.post('/api/users/signup/', signup_payload(n)).status_code
        for n in range(12)
    ]

    assert 429 in codes, codes


def test_editpassword_is_throttled(auth_client, citizen):
    wrong = {'old_password': 'sbagliata', 'new_password1': PASSWORD, 'new_password2': PASSWORD}
    codes = [
        auth_client.post('/api/users/editpassword/', wrong).status_code for _ in range(8)
    ]

    assert 429 in codes, codes


def test_throttling_does_not_leak_between_tests(api_client, citizen):
    """Guards the conftest cache reset: without it, the tests above would
    poison every later login in the session."""
    response = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    )

    assert response.status_code == 200


# --- F1.3: role is admin-assigned only (TD-17) ---


def test_signup_ignores_a_self_assigned_role(api_client):
    """One token — adding 'role' to SignupForm.Meta.fields — would hand every
    citizen admin authority over report statuses and poll creation, with the
    whole suite still green. Nothing pinned that until this test."""
    response = api_client.post('/api/users/signup/', {
        'email': 'furbo@example.com',
        'name': 'Furbo',
        'password1': PASSWORD,
        'password2': PASSWORD,
        'role': User.ADMIN,
    })

    assert response.status_code == 201
    assert User.objects.get(email='furbo@example.com').role == User.CITIZEN


def test_editprofile_ignores_a_self_assigned_role(auth_client, citizen):
    response = auth_client.post('/api/users/editprofile/', {
        'name': citizen.name,
        'email': citizen.email,
        'role': User.ADMIN,
    })

    assert response.status_code == 200
    citizen.refresh_from_db()
    assert citizen.role == User.CITIZEN
