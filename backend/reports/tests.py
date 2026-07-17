import os
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from account.models import User
from reports.models import Category, IssueReport, Upvote

pytestmark = pytest.mark.django_db

PASSWORD = 'GaetaTest2026!'

GAETA_LAT = 41.2172608
GAETA_LNG = 13.5625165


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def citizen():
    return User.objects.create_user(
        name='Cittadino Uno', email='cittadino@example.com', password=PASSWORD
    )


@pytest.fixture
def other_citizen():
    return User.objects.create_user(
        name='Cittadino Due', email='altro@example.com', password=PASSWORD
    )


@pytest.fixture
def admin():
    user = User.objects.create_user(
        name='Amministratore', email='admin@example.com', password=PASSWORD
    )
    user.role = User.ADMIN
    user.save(update_fields=('role',))
    return user


@pytest.fixture
def make_client():
    def _make(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _make


@pytest.fixture
def category():
    return Category.objects.create(name='Categoria Test', color='#123456')


@pytest.fixture
def make_report(citizen, category):
    def _make(author=None, **overrides):
        fields = {
            'author': author or citizen,
            'category': category,
            'title': 'Buca in via Indipendenza',
            'description': 'Una buca profonda vicino al civico 12.',
            'lat': GAETA_LAT,
            'lng': GAETA_LNG,
        }
        fields.update(overrides)
        return IssueReport.objects.create(**fields)

    return _make


def make_image_upload(fmt='JPEG', name='foto.jpg', with_exif=False):
    buffer = BytesIO()
    image = Image.new('RGB', (50, 50), 'red')
    if with_exif:
        exif = Image.Exif()
        exif[274] = 6  # orientation
        image.save(buffer, format=fmt, exif=exif.tobytes())
    else:
        image.save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


def valid_payload(category, **overrides):
    payload = {
        'title': 'Lampione spento',
        'description': 'Il lampione davanti alla scuola non funziona da giorni.',
        'lat': GAETA_LAT,
        'lng': GAETA_LNG,
        'category': str(category.id),
    }
    payload.update(overrides)
    return payload


# --- categories ---


def test_categories_are_public_and_only_active(api_client, category):
    Category.objects.create(name='Disattivata', is_active=False)

    response = api_client.get('/api/categories/')

    assert response.status_code == 200
    names = [item['name'] for item in response.json()]
    assert 'Categoria Test' in names
    assert 'Disattivata' not in names
    # seeded Gaeta categories from the data migration are present
    assert 'Strade e marciapiedi' in names


# --- list & filters (F2.5) ---


def test_report_list_is_public_and_paginated(api_client, make_report):
    make_report()

    response = api_client.get('/api/reports/')

    assert response.status_code == 200
    data = response.json()
    assert data['count'] == 1
    assert len(data['results']) == 1
    item = data['results'][0]
    assert item['title'] == 'Buca in via Indipendenza'
    assert item['category']['name'] == 'Categoria Test'
    assert item['author']['name'] == 'Cittadino Uno'
    assert 'email' not in item['author']
    assert item['upvoted_by_me'] is False


def test_report_list_filters(api_client, make_report, citizen):
    other_category = Category.objects.create(name='Altra', color='#000000')
    make_report(title='Buca pericolosa')
    make_report(title='Panchina rotta', category=other_category)
    make_report(title='Strada allagata', status=IssueReport.RESOLVED)

    by_category = api_client.get('/api/reports/', {'category': str(other_category.id)})
    assert [r['title'] for r in by_category.json()['results']] == ['Panchina rotta']

    by_status = api_client.get('/api/reports/', {'status': 'resolved'})
    assert [r['title'] for r in by_status.json()['results']] == ['Strada allagata']

    by_text = api_client.get('/api/reports/', {'q': 'buca'})
    assert [r['title'] for r in by_text.json()['results']] == ['Buca pericolosa']

    by_author = api_client.get('/api/reports/', {'author': str(citizen.id)})
    assert by_author.json()['count'] == 3


def test_report_map_returns_slim_pins(api_client, make_report):
    make_report()

    response = api_client.get('/api/reports/map/')

    assert response.status_code == 200
    pins = response.json()
    assert len(pins) == 1
    assert set(pins[0].keys()) == {'id', 'title', 'lat', 'lng', 'status', 'category_id'}


# --- create (F2.2) ---


def test_create_requires_auth(api_client, category):
    response = api_client.post('/api/reports/', valid_payload(category))

    assert response.status_code == 401


def test_citizen_creates_report(make_client, citizen, category):
    client = make_client(citizen)

    response = client.post('/api/reports/', valid_payload(category))

    assert response.status_code == 201
    data = response.json()
    assert data['status'] == 'open'
    assert data['author']['name'] == citizen.name
    assert data['category']['id'] == str(category.id)
    assert IssueReport.objects.filter(author=citizen).count() == 1


def test_create_validation_errors_use_detail_fields_shape(make_client, citizen, category):
    client = make_client(citizen)

    response = client.post(
        '/api/reports/',
        valid_payload(category, title='', lat=999),
    )

    assert response.status_code == 400
    data = response.json()
    assert data['detail']
    assert 'title' in data['fields']
    assert 'lat' in data['fields']


def test_create_rejects_title_over_100_chars(make_client, citizen, category):
    client = make_client(citizen)

    response = client.post('/api/reports/', valid_payload(category, title='x' * 101))

    assert response.status_code == 400
    assert 'title' in response.json()['fields']


def test_create_rejects_unknown_category(make_client, citizen, category):
    client = make_client(citizen)

    payload = valid_payload(category)
    payload['category'] = '00000000-0000-0000-0000-000000000000'

    response = client.post('/api/reports/', payload)

    assert response.status_code == 400
    assert 'category' in response.json()['fields']


def test_create_with_photo_strips_exif(make_client, citizen, category):
    client = make_client(citizen)
    photo = make_image_upload(with_exif=True)

    response = client.post(
        '/api/reports/', {**valid_payload(category), 'photo': photo}, format='multipart'
    )

    assert response.status_code == 201
    assert response.json()['photoURL']

    report = IssueReport.objects.get()
    with report.photo.open('rb') as stored:
        stored_exif = Image.open(stored).getexif()
    assert len(stored_exif) == 0


def test_create_rejects_oversized_photo(make_client, citizen, category):
    client = make_client(citizen)
    # incompressible noise → a PNG comfortably above the 5 MB cap
    noise = Image.frombytes('RGB', (1400, 1400), os.urandom(1400 * 1400 * 3))
    buffer = BytesIO()
    noise.save(buffer, format='PNG')
    assert buffer.tell() > 5 * 1024 * 1024
    photo = SimpleUploadedFile('grande.png', buffer.getvalue(), content_type='image/png')

    response = client.post(
        '/api/reports/', {**valid_payload(category), 'photo': photo}, format='multipart'
    )

    assert response.status_code == 400
    assert 'photo' in response.json()['fields']


def test_create_rejects_unsupported_image_format(make_client, citizen, category):
    client = make_client(citizen)
    photo = make_image_upload(fmt='GIF', name='animata.gif')

    response = client.post(
        '/api/reports/', {**valid_payload(category), 'photo': photo}, format='multipart'
    )

    assert response.status_code == 400
    assert 'photo' in response.json()['fields']


# --- detail (F2.6) ---


def test_detail_is_public(api_client, make_report):
    report = make_report()

    response = api_client.get(f'/api/reports/{report.id}/')

    assert response.status_code == 200
    data = response.json()
    assert data['title'] == report.title
    assert data['description'] == report.description
    assert data['author']['name'] == 'Cittadino Uno'
    assert data['upvotes_count'] == 0


def test_detail_unknown_report_is_404_with_detail(api_client):
    response = api_client.get('/api/reports/00000000-0000-0000-0000-000000000000/')

    assert response.status_code == 404
    assert 'detail' in response.json()


# --- edit/delete own while open (F2.8) ---


def test_author_edits_own_open_report(make_client, citizen, make_report):
    report = make_report()
    client = make_client(citizen)

    response = client.patch(f'/api/reports/{report.id}/', {'title': 'Titolo corretto'})

    assert response.status_code == 200
    report.refresh_from_db()
    assert report.title == 'Titolo corretto'


def test_author_cannot_edit_once_acknowledged(make_client, citizen, make_report):
    report = make_report(status=IssueReport.ACKNOWLEDGED)
    client = make_client(citizen)

    response = client.patch(f'/api/reports/{report.id}/', {'title': 'Troppo tardi'})

    assert response.status_code == 403


def test_non_author_cannot_edit(make_client, other_citizen, make_report):
    report = make_report()
    client = make_client(other_citizen)

    response = client.patch(f'/api/reports/{report.id}/', {'title': 'Non mio'})

    assert response.status_code == 403


def test_anonymous_cannot_edit(api_client, make_report):
    report = make_report()

    response = api_client.patch(f'/api/reports/{report.id}/', {'title': 'Anonimo'})

    assert response.status_code == 401


def test_author_deletes_own_open_report(make_client, citizen, make_report):
    report = make_report()
    client = make_client(citizen)

    response = client.delete(f'/api/reports/{report.id}/')

    assert response.status_code == 204
    assert not IssueReport.objects.filter(pk=report.pk).exists()


def test_non_author_cannot_delete(make_client, other_citizen, make_report):
    report = make_report()
    client = make_client(other_citizen)

    response = client.delete(f'/api/reports/{report.id}/')

    assert response.status_code == 403
    assert IssueReport.objects.filter(pk=report.pk).exists()


# --- upvote toggle (F2.7) ---


def test_upvote_requires_auth(api_client, make_report):
    report = make_report()

    response = api_client.post(f'/api/reports/{report.id}/upvote/')

    assert response.status_code == 401


def test_upvote_toggles(make_client, other_citizen, make_report):
    report = make_report()
    client = make_client(other_citizen)

    first = client.post(f'/api/reports/{report.id}/upvote/')
    assert first.status_code == 200
    assert first.json() == {'upvoted': True, 'upvotes_count': 1}

    second = client.post(f'/api/reports/{report.id}/upvote/')
    assert second.json() == {'upvoted': False, 'upvotes_count': 0}
    assert Upvote.objects.count() == 0


def test_upvotes_accumulate_across_users(make_client, citizen, other_citizen, make_report):
    report = make_report()

    # the author can upvote their own report (F2.7)
    make_client(citizen).post(f'/api/reports/{report.id}/upvote/')
    response = make_client(other_citizen).post(f'/api/reports/{report.id}/upvote/')

    assert response.json()['upvotes_count'] == 2

    report.refresh_from_db()
    assert report.upvotes_count == 2


def test_upvote_flag_in_list_for_authenticated_user(make_client, other_citizen, make_report):
    report = make_report()
    client = make_client(other_citizen)
    client.post(f'/api/reports/{report.id}/upvote/')

    listed = client.get('/api/reports/').json()['results'][0]

    assert listed['upvoted_by_me'] is True


# --- status transitions (F2.3, admin only) ---


def test_citizen_cannot_change_status(make_client, citizen, make_report):
    report = make_report()
    client = make_client(citizen)

    response = client.patch(f'/api/reports/{report.id}/status/', {'status': 'acknowledged'})

    assert response.status_code == 403


def test_anonymous_cannot_change_status(api_client, make_report):
    report = make_report()

    response = api_client.patch(f'/api/reports/{report.id}/status/', {'status': 'acknowledged'})

    assert response.status_code == 401


def test_admin_moves_report_forward(make_client, admin, make_report):
    report = make_report()
    client = make_client(admin)

    response = client.patch(f'/api/reports/{report.id}/status/', {'status': 'acknowledged'})

    assert response.status_code == 200
    assert response.json()['status'] == 'acknowledged'

    onward = client.patch(f'/api/reports/{report.id}/status/', {'status': 'resolved'})
    assert onward.json()['status'] == 'resolved'


def test_admin_cannot_move_backwards_or_from_terminal(make_client, admin, make_report):
    report = make_report(status=IssueReport.RESOLVED)
    client = make_client(admin)

    response = client.patch(f'/api/reports/{report.id}/status/', {'status': 'open'})

    assert response.status_code == 400
    assert 'status' in response.json()['fields']


def test_admin_rejects_invalid_status_value(make_client, admin, make_report):
    report = make_report()
    client = make_client(admin)

    response = client.patch(f'/api/reports/{report.id}/status/', {'status': 'in_progress'})

    assert response.status_code == 400
    assert 'status' in response.json()['fields']
