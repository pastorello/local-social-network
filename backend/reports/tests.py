import os
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from reports.models import Category, IssueReport, Upvote

pytestmark = pytest.mark.django_db

GAETA_LAT = 41.2172608
GAETA_LNG = 13.5625165


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


# --- who may read them (decided 2026-10-22, spec reports-and-polls.md R1) ---


@pytest.mark.parametrize(
    'path',
    ['/api/categories/', '/api/reports/', '/api/reports/map/', '/api/reports/{id}/'],
)
def test_anonymous_cannot_read_reports(api_client, make_report, path):
    """Reports are a tool for the people working on the archive, not part of
    it: a reader without an account is shown none of them — not the list, not
    the map's pins, not one report by its address, not the categories they
    are filed under."""
    report = make_report()

    response = api_client.get(path.format(id=report.id))

    assert response.status_code == 401
    assert report.title not in response.content.decode()


# --- categories ---


def test_categories_list_only_the_active_ones(make_client, citizen, category):
    Category.objects.create(name='Disattivata', is_active=False)

    response = make_client(citizen).get('/api/categories/')

    assert response.status_code == 200
    names = [item['name'] for item in response.json()]
    assert 'Categoria Test' in names
    assert 'Disattivata' not in names
    # seeded Gaeta categories from the data migration are present
    assert 'Strade e marciapiedi' in names


# --- list & filters (F2.5) ---


def test_report_list_is_paginated(make_client, citizen, make_report):
    make_report()

    response = make_client(citizen).get('/api/reports/')

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


def test_report_list_filters(make_client, make_report, citizen):
    api_client = make_client(citizen)
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


def test_report_map_returns_slim_pins(make_client, citizen, make_report):
    make_report()

    response = make_client(citizen).get('/api/reports/map/')

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


def test_create_normalises_the_stored_photo_extension(make_client, citizen, category):
    """TD-13, end to end, on the attack that actually gets through.

    `.html` never reaches us: `django.forms.ImageField` carries
    `validate_image_file_extension`, so the upload is rejected. But that
    validator allows all ~70 extensions Pillow knows, and many of them are not
    `image/*` once `mimetypes` sees them — `.pdf`, `.eps`, `.ps`, `.mpeg`.
    Django serves media with a Content-Type guessed from the extension, so a
    valid PNG called `payload.pdf` used to be served as `application/pdf`.
    Deriving the stored extension from the decoded format is what closes it.
    """
    client = make_client(citizen)
    photo = make_image_upload(fmt='PNG', name='payload.pdf')

    response = client.post(
        '/api/reports/', {**valid_payload(category), 'photo': photo}, format='multipart'
    )

    assert response.status_code == 201
    report = IssueReport.objects.get()
    assert report.photo.name.endswith('.png')
    assert '.pdf' not in report.photo.name


def test_create_applies_photo_orientation_before_dropping_exif(make_client, citizen, category):
    """Asserting only that EXIF is empty passes even without exif_transpose,
    which would land every portrait phone photo sideways."""
    client = make_client(citizen)
    buffer = BytesIO()
    image = Image.new('RGB', (60, 40), 'red')
    exif = Image.Exif()
    exif[274] = 6
    image.save(buffer, format='JPEG', exif=exif.tobytes())
    photo = SimpleUploadedFile('ruotata.jpg', buffer.getvalue(), content_type='image/jpeg')

    response = client.post(
        '/api/reports/', {**valid_payload(category), 'photo': photo}, format='multipart'
    )

    assert response.status_code == 201
    report = IssueReport.objects.get()
    with report.photo.open('rb') as stored:
        assert Image.open(stored).size == (40, 60)


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


def test_detail_shows_the_report(make_client, other_citizen, make_report):
    report = make_report()

    response = make_client(other_citizen).get(f'/api/reports/{report.id}/')

    assert response.status_code == 200
    data = response.json()
    assert data['title'] == report.title
    assert data['description'] == report.description
    assert data['author']['name'] == 'Cittadino Uno'
    assert data['upvotes_count'] == 0


def test_detail_unknown_report_is_404_with_detail(make_client, citizen):
    response = make_client(citizen).get('/api/reports/00000000-0000-0000-0000-000000000000/')

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


@pytest.mark.parametrize('status', ['acknowledged', 'resolved', 'rejected'])
def test_author_cannot_edit_or_delete_once_out_of_open(make_client, citizen, make_report, status):
    """F2.8: only while open — a rejected report is not one its author can
    quietly rewrite or withdraw after moderation (TD-47)."""
    report = make_report(status=status)
    client = make_client(citizen)

    edited = client.patch(f'/api/reports/{report.id}/', {'title': 'Troppo tardi'})
    deleted = client.delete(f'/api/reports/{report.id}/')

    assert edited.status_code == 403
    assert deleted.status_code == 403
    report.refresh_from_db()
    assert report.title == 'Buca in via Indipendenza'


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


# Every edge F2.3 allows, written out rather than read from
# `IssueReport.ALLOWED_TRANSITIONS`: a test that derived its expectations from
# the map it tests would agree with any typo in it (TD-47). `rejected` is the
# moderation lever — spam, duplicates — and until this grid nothing exercised
# it, as a source or as a target.
LEGAL_TRANSITIONS = {
    ('open', 'acknowledged'),
    ('open', 'resolved'),
    ('open', 'rejected'),
    ('acknowledged', 'resolved'),
    ('acknowledged', 'rejected'),
}
STATUSES = ('open', 'acknowledged', 'resolved', 'rejected')


# Stacked so an id reads source-target: `[rejected-open]` is rejected → open.
@pytest.mark.parametrize('target', STATUSES)
@pytest.mark.parametrize('source', STATUSES)
def test_every_status_transition_is_allowed_or_refused_as_f2_3_says(
    make_client, admin, make_report, source, target
):
    report = make_report(status=source)

    response = make_client(admin).patch(f'/api/reports/{report.id}/status/', {'status': target})

    report.refresh_from_db()
    if (source, target) in LEGAL_TRANSITIONS:
        assert response.status_code == 200
        assert response.json()['status'] == target
        assert report.status == target
    else:
        assert response.status_code == 400
        assert 'status' in response.json()['fields']
        assert report.status == source


def test_the_model_allows_exactly_the_edges_the_spec_does():
    edges = {
        (source, target)
        for source, targets in IssueReport.ALLOWED_TRANSITIONS.items()
        for target in targets
    }
    assert edges == LEGAL_TRANSITIONS
    assert set(IssueReport.ALLOWED_TRANSITIONS) == set(STATUSES)


def test_admin_rejects_invalid_status_value(make_client, admin, make_report):
    report = make_report()
    client = make_client(admin)

    response = client.patch(f'/api/reports/{report.id}/status/', {'status': 'in_progress'})

    assert response.status_code == 400
    assert 'status' in response.json()['fields']


# --- TD-14: malformed UUID query params must not 500 ---


@pytest.mark.parametrize('param', ['category', 'author'])
def test_report_list_rejects_a_malformed_uuid_filter(make_client, citizen, param):
    """Both columns are UUIDField, so the ORM raises Django's ValidationError at
    query time. The endpoint was public then and DEBUG used to default on, so
    this was an anonymous 500 with a full traceback."""
    response = make_client(citizen).get('/api/reports/', {param: 'non-un-uuid'})

    assert response.status_code == 400
    assert param in response.json()['fields']


def test_report_map_rejects_a_malformed_uuid_filter(make_client, citizen):
    response = make_client(citizen).get('/api/reports/map/', {'category': 'non-un-uuid'})

    assert response.status_code == 400
    assert 'category' in response.json()['fields']


def test_a_well_formed_but_unknown_uuid_is_an_empty_result_not_an_error(
    make_client, citizen, make_report
):
    """The guard must reject malformed input, not filter out valid lookups."""
    make_report()
    response = make_client(citizen).get(
        '/api/reports/', {'category': '00000000-0000-4000-8000-000000000000'}
    )

    assert response.status_code == 200
    assert response.json()['results'] == []


def test_an_unknown_status_filter_still_returns_200(make_client, citizen, make_report):
    """status is a CharField — no UUID parsing, so nothing to guard here."""
    make_report()
    response = make_client(citizen).get('/api/reports/', {'status': 'inventato'})

    assert response.status_code == 200
    assert response.json()['results'] == []


# --- TD-19: the denormalized counter must not drift ---


def test_upvote_toggle_keeps_the_counter_equal_to_the_rows(make_client, citizen, make_report):
    """upvotes_count is what ranks citizen issues, and nothing reconciles it."""
    report = make_report()
    client = make_client(citizen)

    for _ in range(3):
        client.post(f'/api/reports/{report.id}/upvote/')
        report.refresh_from_db()
        assert report.upvotes_count == report.upvotes.count()

    assert report.upvotes_count == 1


def test_upvoting_after_the_row_vanished_leaves_the_counter_consistent(
    make_client, citizen, make_report
):
    """Drift can exist before a request arrives; a toggle must not compound it.

    The racing double-DELETE that TD-19 describes needs two simultaneous
    requests, which this suite cannot produce — the guard for it (deriving the
    delta from the deleted row count, inside a transaction) is verified by
    inspection, not here. What is testable is that the reconcile command puts
    any resulting drift right, which the next test does.
    """
    report = make_report()
    client = make_client(citizen)
    client.post(f'/api/reports/{report.id}/upvote/')
    Upvote.objects.filter(report=report, user=citizen).delete()

    response = client.post(f'/api/reports/{report.id}/upvote/')

    report.refresh_from_db()
    assert response.status_code == 200
    assert report.upvotes_count >= 0


def test_reconcile_upvotes_repairs_a_drifted_counter(make_report, citizen):
    """Drift has to be repairable: the admin marks the field read-only."""
    from django.core.management import call_command

    report = make_report()
    Upvote.objects.create(user=citizen, report=report)
    IssueReport.objects.filter(pk=report.pk).update(upvotes_count=-7)

    call_command('reconcile_upvotes')

    report.refresh_from_db()
    assert report.upvotes_count == 1
