from io import BytesIO
from datetime import timedelta

import pytest
from PIL import Image
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from account.models import AccountToken, CollaborationRequest, User
from common.testing import PASSWORD

pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client(api_client, citizen):
    response = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    )
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.json()['access'])
    return api_client


@pytest.fixture
def admin_request(admin):
    """A fake admin request, enough to drive an admin action directly (no
    admin UI/URLs under test — `message_user` needs a messages backend)."""
    from django.contrib.messages.storage.fallback import FallbackStorage
    from django.test import RequestFactory

    request = RequestFactory().post('/admin/account/collaborationrequest/')
    request.user = admin
    request.session = {}
    request._messages = FallbackStorage(request)
    return request


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
    # None until the user uploads one — no third-party placeholder (TD-30).
    assert data['avatarURL'] is None


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
    results = response.json()['results']
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


def test_collaborate_is_throttled(api_client):
    codes = [
        api_client.post(
            '/api/users/collaborate/', collaborate_payload(email=f'nuovo{n}@example.com')
        ).status_code
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


def test_editprofile_ignores_a_self_assigned_role(auth_client, citizen):
    response = auth_client.post('/api/users/editprofile/', {
        'name': citizen.name,
        'email': citizen.email,
        'role': User.ADMIN,
    })

    assert response.status_code == 200
    citizen.refresh_from_db()
    assert citizen.role == User.CITIZEN


# --- TD-20: logging out must actually end the session ---


def test_logout_blacklists_the_refresh_token(api_client, citizen):
    login = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    ).json()
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + login['access'])

    response = api_client.post('/api/users/logout/', {'refresh': login['refresh']})

    assert response.status_code == 200
    replay = api_client.post('/api/users/refresh/', {'refresh': login['refresh']})
    assert replay.status_code == 401


def test_logout_requires_authentication(api_client):
    assert api_client.post('/api/users/logout/', {'refresh': 'x'}).status_code == 401


def test_logout_rejects_a_token_that_is_not_a_refresh_token(auth_client):
    response = auth_client.post('/api/users/logout/', {'refresh': 'non-un-token'})

    assert response.status_code == 400


def test_changing_the_password_evicts_existing_sessions(api_client, citizen):
    """'I changed my password because I think I was compromised' has to mean
    something — refresh tokens live 30 days."""
    login = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    ).json()
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + login['access'])

    response = api_client.post('/api/users/editpassword/', {
        'old_password': PASSWORD,
        'new_password1': 'NuovaPassword2026!',
        'new_password2': 'NuovaPassword2026!',
    })

    assert response.status_code == 200
    replay = api_client.post('/api/users/refresh/', {'refresh': login['refresh']})
    assert replay.status_code == 401


# --- TD-25: the user directory is unbounded ---


def test_user_list_is_paginated(auth_client, citizen):
    for n in range(25):
        User.objects.create_user(name=f'Utente {n}', email=f'u{n}@example.com', password=PASSWORD)

    body = auth_client.get('/api/users/list/').json()

    assert body['count'] == 26
    assert len(body['results']) == 20
    assert body['next']


def test_user_list_search_still_works_and_is_paginated(auth_client):
    for n in range(3):
        User.objects.create_user(name=f'Mario {n}', email=f'm{n}@example.com', password=PASSWORD)
    User.objects.create_user(name='Giulia', email='g@example.com', password=PASSWORD)

    body = auth_client.get('/api/users/list/', {'q': 'mario'}).json()

    assert body['count'] == 3
    assert all('Mario' in u['name'] for u in body['results'])


# --- TD-27: /api/users/me/ used to invent a fourth user shape ---


def test_me_uses_the_same_avatar_field_name_as_every_other_endpoint(auth_client, citizen):
    body = auth_client.get('/api/users/me/').json()

    # It used to return `avatar` while UserSerializer returned `avatarURL`, and
    # the SPA carried both spellings as a result.
    assert 'avatarURL' in body
    assert 'avatar' not in body


def test_me_returns_the_owner_email_and_role(auth_client, citizen):
    body = auth_client.get('/api/users/me/').json()

    assert body['email'] == citizen.email
    assert body['role'] == citizen.role
    assert body['id'] == str(citizen.id)


# --- TD-30: the placeholder avatar was a third-party random image ---


def test_a_user_without_an_avatar_reports_no_url(auth_client, citizen):
    """It used to return picsum.photos, which serves a *different* image per
    request — the same citizen had a different face on every reload, and every
    page view leaked visitor IPs to a third party."""
    assert citizen.get_avatar() is None
    assert auth_client.get('/api/users/me/').json()['avatarURL'] is None


# --- TD-28: the account endpoints forced multipart on a JSON API ---


def test_editpassword_accepts_a_json_body(auth_client, citizen):
    response = auth_client.post(
        '/api/users/editpassword/',
        {
            'old_password': PASSWORD,
            'new_password1': 'NuovaPassword2026!',
            'new_password2': 'NuovaPassword2026!',
        },
        format='json',
    )

    assert response.status_code == 200
    citizen.refresh_from_db()
    assert citizen.check_password('NuovaPassword2026!')


def test_editprofile_accepts_a_json_body(auth_client, citizen):
    response = auth_client.post(
        '/api/users/editprofile/',
        {'name': 'Nome Aggiornato', 'email': citizen.email},
        format='json',
    )

    assert response.status_code == 200
    citizen.refresh_from_db()
    assert citizen.name == 'Nome Aggiornato'


# --- A1: "Collabora con noi" request form (public) ---


def collaborate_payload(**overrides):
    now_ms = int(timezone.now().timestamp() * 1000)
    payload = {
        'name': 'Aspirante Collaboratore',
        'email': 'aspirante@example.com',
        'message': 'Vorrei raccontare le feste patronali della città.',
        'website': '',
        'rendered_at': now_ms - 5000,
    }
    payload.update(overrides)
    return payload


def test_collaborate_creates_a_pending_request(api_client):
    response = api_client.post('/api/users/collaborate/', collaborate_payload())

    assert response.status_code == 201
    request = CollaborationRequest.objects.get(email='aspirante@example.com')
    assert request.status == CollaborationRequest.PENDING


def test_collaborate_silently_drops_a_filled_honeypot(api_client):
    response = api_client.post(
        '/api/users/collaborate/', collaborate_payload(website='http://spam.example')
    )

    assert response.status_code == 201
    assert not CollaborationRequest.objects.exists()


def test_collaborate_silently_drops_a_too_fast_submission(api_client):
    now_ms = int(timezone.now().timestamp() * 1000)
    response = api_client.post(
        '/api/users/collaborate/', collaborate_payload(rendered_at=now_ms)
    )

    assert response.status_code == 201
    assert not CollaborationRequest.objects.exists()


def test_collaborate_still_validates_a_genuine_submission(api_client):
    response = api_client.post(
        '/api/users/collaborate/', collaborate_payload(email='non-una-email')
    )

    assert response.status_code == 400
    assert 'email' in response.json()['fields']


# --- A2/A3: admin review → invite e-mail ---


def make_collaboration_request(**overrides):
    payload = {
        'name': 'Aspirante Collaboratore',
        'email': 'aspirante@example.com',
        'message': 'Vorrei collaborare.',
    }
    payload.update(overrides)
    return CollaborationRequest.objects.create(**payload)


def _admin_site():
    from django.contrib.admin.sites import AdminSite

    return AdminSite()


def test_approve_creates_an_active_user_with_no_usable_password(admin_request):
    from account.admin import CollaborationRequestAdmin

    collab_request = make_collaboration_request()
    admin_obj = CollaborationRequestAdmin(CollaborationRequest, _admin_site())

    admin_obj.approve_requests(admin_request, CollaborationRequest.objects.filter(pk=collab_request.pk))

    user = User.objects.get(email='aspirante@example.com')
    assert user.is_active is True
    assert user.has_usable_password() is False
    assert user.role == User.CITIZEN

    collab_request.refresh_from_db()
    assert collab_request.status == CollaborationRequest.APPROVED
    assert collab_request.reviewed_by == admin_request.user

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ['aspirante@example.com']

    token = AccountToken.objects.get(user=user, purpose=AccountToken.INVITE)
    assert token.used_at is None


def test_approve_skips_a_request_whose_email_already_has_an_account(admin_request, citizen):
    collab_request = make_collaboration_request(email=citizen.email)
    from account.admin import CollaborationRequestAdmin

    admin_obj = CollaborationRequestAdmin(CollaborationRequest, _admin_site())
    admin_obj.approve_requests(admin_request, CollaborationRequest.objects.filter(pk=collab_request.pk))

    collab_request.refresh_from_db()
    assert collab_request.status == CollaborationRequest.PENDING
    assert len(mail.outbox) == 0


def test_approve_skips_a_non_pending_request(admin_request):
    collab_request = make_collaboration_request(status=CollaborationRequest.REJECTED)
    from account.admin import CollaborationRequestAdmin

    admin_obj = CollaborationRequestAdmin(CollaborationRequest, _admin_site())
    admin_obj.approve_requests(admin_request, CollaborationRequest.objects.filter(pk=collab_request.pk))

    assert not User.objects.filter(email=collab_request.email).exists()
    assert len(mail.outbox) == 0


def test_reject_sets_status_and_sends_no_email(admin_request):
    collab_request = make_collaboration_request()
    from account.admin import CollaborationRequestAdmin

    admin_obj = CollaborationRequestAdmin(CollaborationRequest, _admin_site())
    admin_obj.reject_requests(admin_request, CollaborationRequest.objects.filter(pk=collab_request.pk))

    collab_request.refresh_from_db()
    assert collab_request.status == CollaborationRequest.REJECTED
    assert not User.objects.filter(email=collab_request.email).exists()
    assert len(mail.outbox) == 0



def _refuse(*args, **kwargs):
    # What smtplib raises when EMAIL_HOST is empty or the server is down.
    raise ConnectionRefusedError(61, 'Connection refused')


def _capture_messages(monkeypatch, admin_obj):
    sent = []
    monkeypatch.setattr(
        admin_obj, 'message_user',
        lambda request, message, level=None, *args, **kwargs: sent.append((level, message)),
    )
    return sent


def test_approve_rolls_everything_back_when_the_invite_cannot_be_sent(admin_request, monkeypatch, caplog):
    # Found on the running production stack, 2026-09-10: with no SMTP the user
    # was created, the send raised a 500 and the request stayed pending, so a
    # second approval answered "esiste già un account" for ever.
    from django.contrib import messages

    from account import admin as account_admin
    from account.admin import CollaborationRequestAdmin

    monkeypatch.setattr(account_admin, 'send_invite_email', _refuse)
    collab_request = make_collaboration_request()
    admin_obj = CollaborationRequestAdmin(CollaborationRequest, _admin_site())
    sent = _capture_messages(monkeypatch, admin_obj)

    admin_obj.approve_requests(admin_request, CollaborationRequest.objects.filter(pk=collab_request.pk))

    assert not User.objects.filter(email=collab_request.email).exists()
    assert not AccountToken.objects.exists()
    collab_request.refresh_from_db()
    assert collab_request.status == CollaborationRequest.PENDING
    # The author is told, in words, and the operator gets the traceback.
    assert [level for level, _ in sent] == [messages.ERROR]
    assert 'invito non inviato' in sent[0][1]
    assert 'could not be sent' in caplog.text


def test_a_request_whose_invite_failed_can_be_approved_once_mail_works(admin_request, monkeypatch):
    from account import admin as account_admin
    from account.admin import CollaborationRequestAdmin

    collab_request = make_collaboration_request()
    admin_obj = CollaborationRequestAdmin(CollaborationRequest, _admin_site())

    def this_request():
        # A fresh queryset per call, as the admin builds one per POST. A reused
        # one would hand back its cached row, whose in-memory status the
        # rolled-back attempt had already set — a test artifact, not the product.
        return CollaborationRequest.objects.filter(pk=collab_request.pk)

    monkeypatch.setattr(account_admin, 'send_invite_email', _refuse)
    _capture_messages(monkeypatch, admin_obj)
    admin_obj.approve_requests(admin_request, this_request())
    monkeypatch.undo()

    admin_obj.approve_requests(admin_request, this_request())

    collab_request.refresh_from_db()
    assert collab_request.status == CollaborationRequest.APPROVED
    assert User.objects.filter(email=collab_request.email).exists()
    assert len(mail.outbox) == 1

# --- A3: accepting an invite ---


def make_invited_user():
    user = User(email='invitato@example.com', name='Invitato')
    user.set_unusable_password()
    user.save()
    _token, raw_token = AccountToken.create_for(user, AccountToken.INVITE)
    return user, raw_token


def test_acceptinvite_sets_the_password_and_consumes_the_token(api_client):
    user, raw_token = make_invited_user()

    response = api_client.post('/api/users/acceptinvite/', {
        'token': raw_token, 'password1': PASSWORD, 'password2': PASSWORD,
    })

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password(PASSWORD)

    replay = api_client.post('/api/users/acceptinvite/', {
        'token': raw_token, 'password1': PASSWORD, 'password2': PASSWORD,
    })
    assert replay.status_code == 400
    assert 'token' in replay.json()['fields']


def test_acceptinvite_rejects_an_expired_token(api_client):
    user, raw_token = make_invited_user()
    AccountToken.objects.filter(user=user).update(expires_at=timezone.now() - timedelta(seconds=1))

    response = api_client.post('/api/users/acceptinvite/', {
        'token': raw_token, 'password1': PASSWORD, 'password2': PASSWORD,
    })

    assert response.status_code == 400
    assert not user.has_usable_password()


def test_acceptinvite_rejects_mismatched_passwords(api_client):
    user, raw_token = make_invited_user()

    response = api_client.post('/api/users/acceptinvite/', {
        'token': raw_token, 'password1': PASSWORD, 'password2': PASSWORD + 'x',
    })

    assert response.status_code == 400
    assert 'password2' in response.json()['fields']
    # a failed password check must not burn the single-use token
    user.refresh_from_db()
    assert AccountToken.objects.get(user=user).used_at is None


def test_acceptinvite_rejects_a_weak_password(api_client):
    user, raw_token = make_invited_user()

    response = api_client.post('/api/users/acceptinvite/', {
        'token': raw_token, 'password1': '12345678', 'password2': '12345678',
    })

    assert response.status_code == 400
    assert 'password1' in response.json()['fields']


def test_acceptinvite_is_throttled(api_client):
    codes = [
        api_client.post('/api/users/acceptinvite/', {'token': 'x', 'password1': 'a', 'password2': 'b'}).status_code
        for _ in range(12)
    ]

    assert 429 in codes, codes


# --- A4: password reset ---


def test_requestpasswordreset_always_returns_200(api_client, citizen):
    for email in (citizen.email, 'non-esiste@example.com'):
        response = api_client.post('/api/users/requestpasswordreset/', {'email': email})
        assert response.status_code == 200


def test_requestpasswordreset_sends_an_email_only_for_a_real_active_user(api_client, citizen):
    api_client.post('/api/users/requestpasswordreset/', {'email': 'non-esiste@example.com'})
    assert len(mail.outbox) == 0

    api_client.post('/api/users/requestpasswordreset/', {'email': citizen.email})
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [citizen.email]


def test_requestpasswordreset_skips_a_user_with_no_usable_password(api_client):
    user, _raw_token = make_invited_user()  # unusable password, invite not yet accepted

    api_client.post('/api/users/requestpasswordreset/', {'email': user.email})

    assert len(mail.outbox) == 0



def test_requestpasswordreset_answers_200_even_when_mail_cannot_be_sent(api_client, citizen, monkeypatch, caplog):
    # With mail down, a 500 for a registered address and a 200 for an unknown
    # one is an enumeration oracle — seen on the running stack, 2026-09-10.
    from account import api as account_api

    monkeypatch.setattr(account_api, 'send_password_reset_email', _refuse)

    for email in (citizen.email, 'non-esiste@example.com'):
        response = api_client.post('/api/users/requestpasswordreset/', {'email': email})
        assert response.status_code == 200

    assert not AccountToken.objects.filter(user=citizen, purpose=AccountToken.RESET).exists()
    assert 'could not be sent' in caplog.text
    assert citizen.email not in caplog.text

def test_confirmpasswordreset_sets_password_and_evicts_sessions(api_client, citizen):
    login = api_client.post('/api/users/login/', {'email': citizen.email, 'password': PASSWORD}).json()
    _token, raw_token = AccountToken.create_for(citizen, AccountToken.RESET)
    new_password = 'NuovaPassword2026!'

    response = api_client.post('/api/users/confirmpasswordreset/', {
        'token': raw_token, 'password1': new_password, 'password2': new_password,
    })

    assert response.status_code == 200
    citizen.refresh_from_db()
    assert citizen.check_password(new_password)

    replay = api_client.post('/api/users/refresh/', {'refresh': login['refresh']})
    assert replay.status_code == 401


def test_confirmpasswordreset_rejects_an_expired_or_used_token(api_client, citizen):
    _token, raw_token = AccountToken.create_for(citizen, AccountToken.RESET)
    AccountToken.objects.filter(user=citizen).update(expires_at=timezone.now() - timedelta(seconds=1))

    response = api_client.post('/api/users/confirmpasswordreset/', {
        'token': raw_token, 'password1': PASSWORD, 'password2': PASSWORD,
    })

    assert response.status_code == 400
    assert 'token' in response.json()['fields']


def test_requesting_a_new_reset_token_retires_the_old_one(api_client, citizen):
    _first_token, first_raw = AccountToken.create_for(citizen, AccountToken.RESET)
    _second_token, _second_raw = AccountToken.create_for(citizen, AccountToken.RESET)

    response = api_client.post('/api/users/confirmpasswordreset/', {
        'token': first_raw, 'password1': PASSWORD, 'password2': PASSWORD,
    })

    assert response.status_code == 400
    assert 'token' in response.json()['fields']


def test_requestpasswordreset_is_throttled(api_client, citizen):
    codes = [
        api_client.post('/api/users/requestpasswordreset/', {'email': citizen.email}).status_code
        for _ in range(8)
    ]

    assert 429 in codes, codes


# --- politics.md: the steering flag is never serialized ---


def test_is_steering_never_appears_in_me_or_user_serializers(auth_client, citizen):
    citizen.is_steering = True
    citizen.save(update_fields=('is_steering',))

    me_body = auth_client.get('/api/users/me/').json()
    detail_body = auth_client.get(f'/api/users/{citizen.id}/').json()

    assert 'is_steering' not in me_body
    assert 'is_steering' not in detail_body
