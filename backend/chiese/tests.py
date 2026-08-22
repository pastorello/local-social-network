import json
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from chiese.models import Chiesa
from common.testing import PASSWORD
from content.models import Card, CardImage, MapFeature

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
def make_chiesa(citizen):
    def _make(author=None, is_published=False, title='Chiesa di Sant’Erasmo', body_html='<p>Una chiesa antica.</p>'):
        card = Card.objects.create(
            title=title, body_html=body_html, author=author or citizen, is_published=is_published,
        )
        return Chiesa.objects.create(card=card)

    return _make


def make_image_upload(fmt='JPEG', name='foto.jpg'):
    buffer = BytesIO()
    Image.new('RGB', (50, 50), 'blue').save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


def pins_payload(n=1):
    return json.dumps([
        {'lat': GAETA_LAT + i * 0.001, 'lng': GAETA_LNG + i * 0.001, 'label': f'Punto {i}'}
        for i in range(n)
    ])


def valid_payload(**overrides):
    payload = {
        'title': 'Chiesa della Santissima Annunziata',
        'body_html': '<p>Testo <strong>ricco</strong>.</p>',
    }
    payload.update(overrides)
    return payload


# --- create (auth-only) ---


def test_chiesa_create_requires_auth(api_client):
    response = api_client.post('/api/chiese/', valid_payload())
    assert response.status_code == 401


def test_chiesa_create_makes_a_draft_by_default(auth_client):
    response = auth_client.post('/api/chiese/', valid_payload())

    assert response.status_code == 201
    data = response.json()
    assert data['is_published'] is False
    card = Card.objects.get(pk=data['id'])
    assert card.is_published is False


def test_chiesa_create_sanitizes_the_body_end_to_end(auth_client):
    response = auth_client.post('/api/chiese/', valid_payload(
        body_html='<p>Testo</p><script>alert(1)</script>'
    ))

    assert response.status_code == 201
    assert '<script>' not in response.json()['body_html']
    card = Card.objects.get(pk=response.json()['id'])
    assert '<script>' not in card.body_html


def test_chiesa_create_accepts_an_image_and_its_one_pin(auth_client):
    response = auth_client.post(
        '/api/chiese/',
        {
            **valid_payload(is_published='true'),
            'images': [make_image_upload()],
            'pins': pins_payload(1),
        },
        format='multipart',
    )

    assert response.status_code == 201
    data = response.json()
    assert len(data['images']) == 1
    assert len(data['pins']) == 1
    assert data['is_published'] is True


def test_chiesa_create_rejects_a_second_pin(auth_client):
    response = auth_client.post(
        '/api/chiese/', {**valid_payload(), 'pins': pins_payload(2)}, format='multipart',
    )

    assert response.status_code == 400
    assert 'pins' in response.json()['fields']


def test_chiesa_create_rejects_a_malformed_pins_field(auth_client):
    response = auth_client.post(
        '/api/chiese/', {**valid_payload(), 'pins': 'not-json'}, format='multipart',
    )

    assert response.status_code == 400
    assert 'pins' in response.json()['fields']


# --- draft/publish visibility ---


def test_a_draft_404s_for_an_anonymous_visitor(api_client, make_chiesa):
    chiesa = make_chiesa(is_published=False)

    response = api_client.get(f'/api/chiese/{chiesa.pk}/')

    assert response.status_code == 404


def test_a_draft_is_visible_to_its_author(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen, is_published=False)

    response = auth_client.get(f'/api/chiese/{chiesa.pk}/')

    assert response.status_code == 200


def test_a_draft_is_visible_to_an_admin(make_client, admin, make_chiesa):
    chiesa = make_chiesa(is_published=False)

    response = make_client(admin).get(f'/api/chiese/{chiesa.pk}/')

    assert response.status_code == 200


def test_a_published_chiesa_is_public(api_client, make_chiesa):
    chiesa = make_chiesa(is_published=True)

    response = api_client.get(f'/api/chiese/{chiesa.pk}/')

    assert response.status_code == 200


def test_list_only_returns_published_chiese(api_client, make_chiesa):
    make_chiesa(is_published=True, title='Pubblicata')
    make_chiesa(is_published=False, title='Bozza')

    response = api_client.get('/api/chiese/')

    titles = [item['title'] for item in response.json()['results']]
    assert titles == ['Pubblicata']


# --- mine/ ---


def test_mine_requires_auth(api_client):
    assert api_client.get('/api/chiese/mine/').status_code == 401


def test_mine_returns_the_requesters_drafts_and_published(auth_client, citizen, other_citizen, make_chiesa):
    make_chiesa(author=citizen, is_published=False, title='Mia bozza')
    make_chiesa(author=citizen, is_published=True, title='Mia pubblicata')
    make_chiesa(author=other_citizen, is_published=True, title='Non mia')

    body = auth_client.get('/api/chiese/mine/').json()
    titles = {item['title'] for item in body['results']}

    assert titles == {'Mia bozza', 'Mia pubblicata'}


# --- edit / delete permissions ---


def test_only_the_author_or_admin_can_edit(make_client, other_citizen, make_chiesa):
    chiesa = make_chiesa()

    response = make_client(other_citizen).patch(
        f'/api/chiese/{chiesa.pk}/', {'title': 'Rubata'}, format='multipart',
    )

    assert response.status_code == 403


def test_the_author_can_edit_their_own_chiesa(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)

    response = auth_client.patch(
        f'/api/chiese/{chiesa.pk}/', {'title': 'Titolo aggiornato'}, format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['title'] == 'Titolo aggiornato'


def test_an_admin_can_edit_someone_elses_chiesa(make_client, admin, make_chiesa):
    chiesa = make_chiesa()

    response = make_client(admin).patch(
        f'/api/chiese/{chiesa.pk}/', {'title': 'Corretta da admin'}, format='multipart',
    )

    assert response.status_code == 200


def test_only_the_author_or_admin_can_delete(make_client, other_citizen, make_chiesa):
    chiesa = make_chiesa()

    response = make_client(other_citizen).delete(f'/api/chiese/{chiesa.pk}/')

    assert response.status_code == 403
    assert Card.objects.filter(pk=chiesa.pk).exists()


def test_the_author_can_delete_their_own_chiesa(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)

    response = auth_client.delete(f'/api/chiese/{chiesa.pk}/')

    assert response.status_code == 204
    assert not Card.objects.filter(pk=chiesa.pk).exists()


# --- images: add / remove on edit ---


def test_patch_appends_new_images(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)

    response = auth_client.patch(
        f'/api/chiese/{chiesa.pk}/', {'images': [make_image_upload()]}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['images']) == 1


def test_patch_removes_named_images(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)
    image = CardImage.objects.create(card=chiesa.card, image=make_image_upload(), position=0)

    response = auth_client.patch(
        f'/api/chiese/{chiesa.pk}/',
        {'remove_image_ids': json.dumps([str(image.id)])},
        format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['images'] == []


# --- pins: replace on edit ---


def test_patch_replaces_the_pin(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)
    MapFeature.objects.create(card=chiesa.card, kind=MapFeature.POINT, position=0, lat=GAETA_LAT, lng=GAETA_LNG)

    response = auth_client.patch(
        f'/api/chiese/{chiesa.pk}/', {'pins': pins_payload(1)}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['pins']) == 1
    assert MapFeature.objects.filter(card=chiesa.card, kind=MapFeature.POINT).count() == 1


def test_patch_without_a_pins_field_leaves_the_existing_pin_alone(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)
    MapFeature.objects.create(card=chiesa.card, kind=MapFeature.POINT, position=0, lat=GAETA_LAT, lng=GAETA_LNG)

    response = auth_client.patch(
        f'/api/chiese/{chiesa.pk}/', {'title': 'Solo il titolo'}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['pins']) == 1
