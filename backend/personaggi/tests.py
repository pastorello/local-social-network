import json
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from common.testing import PASSWORD
from content.models import Card, CardImage, MapFeature
from personaggi.models import Personaggio

pytestmark = pytest.mark.django_db

GAETA_LAT = 41.2172608
GAETA_LNG = 13.5625165


@pytest.fixture
def auth_client(api_client, citizen):
    response = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    )
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.json()['access'])
    return api_client


@pytest.fixture
def make_personaggio(citizen):
    def _make(
        author=None, is_published=False, title='Erasmo di Formia',
        body_html='<p>Un personaggio storico.</p>', life_dates='sec. III – 303',
    ):
        card = Card.objects.create(
            title=title, body_html=body_html, author=author or citizen, is_published=is_published,
        )
        return Personaggio.objects.create(card=card, life_dates=life_dates)

    return _make


def make_image_upload(fmt='JPEG', name='foto.jpg'):
    buffer = BytesIO()
    Image.new('RGB', (50, 50), 'blue').save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


def pins_payload(n=2):
    return json.dumps([
        {'lat': GAETA_LAT + i * 0.001, 'lng': GAETA_LNG + i * 0.001, 'label': f'Luogo {i}'}
        for i in range(n)
    ])


def valid_payload(**overrides):
    payload = {
        'title': 'Gelasio II',
        'body_html': '<p>Testo <strong>ricco</strong>.</p>',
        'life_dates': '1060 – 1119',
    }
    payload.update(overrides)
    return payload


# --- create (auth-only) ---


def test_personaggio_create_requires_auth(api_client):
    response = api_client.post('/api/personaggi/', valid_payload())
    assert response.status_code == 401


def test_personaggio_create_makes_a_draft_by_default(auth_client):
    response = auth_client.post('/api/personaggi/', valid_payload())

    assert response.status_code == 201
    data = response.json()
    assert data['is_published'] is False
    assert data['life_dates'] == '1060 – 1119'
    card = Card.objects.get(pk=data['id'])
    assert card.is_published is False


def test_personaggio_create_sanitizes_the_body_end_to_end(auth_client):
    response = auth_client.post('/api/personaggi/', valid_payload(
        body_html='<p>Testo</p><script>alert(1)</script>'
    ))

    assert response.status_code == 201
    assert '<script>' not in response.json()['body_html']
    card = Card.objects.get(pk=response.json()['id'])
    assert '<script>' not in card.body_html


def test_personaggio_create_accepts_images_and_pins(auth_client):
    response = auth_client.post(
        '/api/personaggi/',
        {
            **valid_payload(is_published='true'),
            'images': [make_image_upload()],
            'pins': pins_payload(2),
        },
        format='multipart',
    )

    assert response.status_code == 201
    data = response.json()
    assert len(data['images']) == 1
    assert len(data['pins']) == 2
    assert data['is_published'] is True


def test_personaggio_create_rejects_too_many_pins(auth_client):
    oversized = json.dumps([{'lat': GAETA_LAT, 'lng': GAETA_LNG} for _ in range(6)])

    response = auth_client.post(
        '/api/personaggi/', {**valid_payload(), 'pins': oversized}, format='multipart',
    )

    assert response.status_code == 400
    assert 'pins' in response.json()['fields']


# --- draft/publish visibility ---


def test_a_draft_404s_for_an_anonymous_visitor(api_client, make_personaggio):
    personaggio = make_personaggio(is_published=False)

    response = api_client.get(f'/api/personaggi/{personaggio.pk}/')

    assert response.status_code == 404


def test_a_draft_is_visible_to_its_author(auth_client, citizen, make_personaggio):
    personaggio = make_personaggio(author=citizen, is_published=False)

    response = auth_client.get(f'/api/personaggi/{personaggio.pk}/')

    assert response.status_code == 200


def test_a_published_personaggio_is_public(api_client, make_personaggio):
    personaggio = make_personaggio(is_published=True)

    response = api_client.get(f'/api/personaggi/{personaggio.pk}/')

    assert response.status_code == 200


def test_list_only_returns_published_personaggi(api_client, make_personaggio):
    make_personaggio(is_published=True, title='Pubblicato')
    make_personaggio(is_published=False, title='Bozza')

    response = api_client.get('/api/personaggi/')

    titles = [item['title'] for item in response.json()['results']]
    assert titles == ['Pubblicato']


# --- mine/ ---


def test_mine_requires_auth(api_client):
    assert api_client.get('/api/personaggi/mine/').status_code == 401


def test_mine_returns_the_requesters_drafts_and_published(auth_client, citizen, other_citizen, make_personaggio):
    make_personaggio(author=citizen, is_published=False, title='Mia bozza')
    make_personaggio(author=citizen, is_published=True, title='Mia pubblicata')
    make_personaggio(author=other_citizen, is_published=True, title='Non mia')

    body = auth_client.get('/api/personaggi/mine/').json()
    titles = {item['title'] for item in body['results']}

    assert titles == {'Mia bozza', 'Mia pubblicata'}


# --- edit / delete permissions ---


def test_only_the_author_or_admin_can_edit(make_client, other_citizen, make_personaggio):
    personaggio = make_personaggio()

    response = make_client(other_citizen).patch(
        f'/api/personaggi/{personaggio.pk}/', {'title': 'Rubato'}, format='multipart',
    )

    assert response.status_code == 403


def test_the_author_can_edit_their_own_personaggio(auth_client, citizen, make_personaggio):
    personaggio = make_personaggio(author=citizen)

    response = auth_client.patch(
        f'/api/personaggi/{personaggio.pk}/', {'life_dates': '1200 – 1270'}, format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['life_dates'] == '1200 – 1270'


def test_only_the_author_or_admin_can_delete(make_client, other_citizen, make_personaggio):
    personaggio = make_personaggio()

    response = make_client(other_citizen).delete(f'/api/personaggi/{personaggio.pk}/')

    assert response.status_code == 403
    assert Card.objects.filter(pk=personaggio.pk).exists()


def test_the_author_can_delete_their_own_personaggio(auth_client, citizen, make_personaggio):
    personaggio = make_personaggio(author=citizen)

    response = auth_client.delete(f'/api/personaggi/{personaggio.pk}/')

    assert response.status_code == 204
    assert not Card.objects.filter(pk=personaggio.pk).exists()


# --- images: add / remove on edit ---


def test_patch_appends_new_images(auth_client, citizen, make_personaggio):
    personaggio = make_personaggio(author=citizen)

    response = auth_client.patch(
        f'/api/personaggi/{personaggio.pk}/', {'images': [make_image_upload()]}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['images']) == 1


def test_patch_removes_named_images(auth_client, citizen, make_personaggio):
    personaggio = make_personaggio(author=citizen)
    image = CardImage.objects.create(card=personaggio.card, image=make_image_upload(), position=0)

    response = auth_client.patch(
        f'/api/personaggi/{personaggio.pk}/',
        {'remove_image_ids': json.dumps([str(image.id)])},
        format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['images'] == []


# --- pins: replace on edit ---


def test_patch_replaces_the_pins(auth_client, citizen, make_personaggio):
    personaggio = make_personaggio(author=citizen)
    MapFeature.objects.create(card=personaggio.card, kind=MapFeature.POINT, position=0, lat=GAETA_LAT, lng=GAETA_LNG)

    response = auth_client.patch(
        f'/api/personaggi/{personaggio.pk}/', {'pins': pins_payload(1)}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['pins']) == 1
    assert MapFeature.objects.filter(card=personaggio.card, kind=MapFeature.POINT).count() == 1


def test_patch_without_a_pins_field_leaves_the_existing_pins_alone(auth_client, citizen, make_personaggio):
    personaggio = make_personaggio(author=citizen)
    MapFeature.objects.create(card=personaggio.card, kind=MapFeature.POINT, position=0, lat=GAETA_LAT, lng=GAETA_LNG)

    response = auth_client.patch(
        f'/api/personaggi/{personaggio.pk}/', {'title': 'Solo il titolo'}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['pins']) == 1
