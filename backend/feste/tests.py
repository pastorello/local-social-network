import json
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from common.testing import PASSWORD
from content.models import Card, CardImage, MapFeature
from feste.models import Feste

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
def make_feste(citizen):
    def _make(
        author=None, is_published=False, title="Festa di Sant'Erasmo",
        body_html='<p>Una festa antica.</p>', recurrence='Ogni 9 giugno', programme='',
    ):
        card = Card.objects.create(
            title=title, body_html=body_html, author=author or citizen, is_published=is_published,
        )
        return Feste.objects.create(card=card, recurrence=recurrence, programme=programme)

    return _make


def make_image_upload(fmt='JPEG', name='foto.jpg'):
    buffer = BytesIO()
    Image.new('RGB', (50, 50), 'blue').save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


def route_payload(n=3):
    return json.dumps([
        {'lat': GAETA_LAT + i * 0.001, 'lng': GAETA_LNG + i * 0.001, 'label': f'Tappa {i}'}
        for i in range(n)
    ])


def valid_payload(**overrides):
    payload = {
        'title': 'Festa della Madonna di Porto Salvo',
        'body_html': '<p>Testo <strong>ricco</strong>.</p>',
        'recurrence': 'Ogni 8 settembre',
        'programme': 'Processione serale lungo il corso.',
    }
    payload.update(overrides)
    return payload


# --- create (auth-only) ---


def test_feste_create_requires_auth(api_client):
    response = api_client.post('/api/feste/', valid_payload())
    assert response.status_code == 401


def test_feste_create_makes_a_draft_by_default(auth_client):
    response = auth_client.post('/api/feste/', valid_payload())

    assert response.status_code == 201
    data = response.json()
    assert data['is_published'] is False
    assert data['recurrence'] == 'Ogni 8 settembre'
    card = Card.objects.get(pk=data['id'])
    assert card.is_published is False


def test_feste_create_sanitizes_the_body_end_to_end(auth_client):
    response = auth_client.post('/api/feste/', valid_payload(
        body_html='<p>Testo</p><script>alert(1)</script>'
    ))

    assert response.status_code == 201
    assert '<script>' not in response.json()['body_html']
    card = Card.objects.get(pk=response.json()['id'])
    assert '<script>' not in card.body_html


def test_feste_create_accepts_images_and_a_route(auth_client):
    response = auth_client.post(
        '/api/feste/',
        {
            **valid_payload(is_published='true'),
            'images': [make_image_upload(name='a.jpg'), make_image_upload(name='b.jpg')],
            'route': route_payload(3),
        },
        format='multipart',
    )

    assert response.status_code == 201
    data = response.json()
    assert len(data['images']) == 2
    assert len(data['route']) == 3
    assert data['route'][0]['label'] == 'Tappa 0'
    assert data['is_published'] is True


def test_feste_create_rejects_an_oversized_route(auth_client):
    oversized = json.dumps([{'lat': GAETA_LAT, 'lng': GAETA_LNG} for _ in range(51)])

    response = auth_client.post(
        '/api/feste/', {**valid_payload(), 'route': oversized}, format='multipart',
    )

    assert response.status_code == 400
    assert 'route' in response.json()['fields']


def test_feste_create_rejects_a_malformed_route(auth_client):
    response = auth_client.post(
        '/api/feste/', {**valid_payload(), 'route': 'not-json'}, format='multipart',
    )

    assert response.status_code == 400
    assert 'route' in response.json()['fields']


# --- draft/publish visibility ---


def test_a_draft_404s_for_an_anonymous_visitor(api_client, make_feste):
    feste = make_feste(is_published=False)

    response = api_client.get(f'/api/feste/{feste.pk}/')

    assert response.status_code == 404


def test_a_draft_is_visible_to_its_author(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen, is_published=False)

    response = auth_client.get(f'/api/feste/{feste.pk}/')

    assert response.status_code == 200


def test_a_draft_is_visible_to_an_admin(make_client, admin, make_feste):
    feste = make_feste(is_published=False)

    response = make_client(admin).get(f'/api/feste/{feste.pk}/')

    assert response.status_code == 200


def test_a_published_feste_is_public(api_client, make_feste):
    feste = make_feste(is_published=True)

    response = api_client.get(f'/api/feste/{feste.pk}/')

    assert response.status_code == 200


def test_list_only_returns_published_feste(api_client, make_feste):
    make_feste(is_published=True, title='Pubblicata')
    make_feste(is_published=False, title='Bozza')

    response = api_client.get('/api/feste/')

    titles = [item['title'] for item in response.json()['results']]
    assert titles == ['Pubblicata']


def test_list_is_paginated(api_client, make_feste):
    for n in range(25):
        make_feste(is_published=True, title=f'Festa {n}')

    body = api_client.get('/api/feste/').json()

    assert body['count'] == 25
    assert len(body['results']) == 20
    assert body['next']


# --- mine/ ---


def test_mine_requires_auth(api_client):
    assert api_client.get('/api/feste/mine/').status_code == 401


def test_mine_returns_the_requesters_drafts_and_published(auth_client, citizen, other_citizen, make_feste):
    make_feste(author=citizen, is_published=False, title='Mia bozza')
    make_feste(author=citizen, is_published=True, title='Mia pubblicata')
    make_feste(author=other_citizen, is_published=True, title='Non mia')

    body = auth_client.get('/api/feste/mine/').json()
    titles = {item['title'] for item in body['results']}

    assert titles == {'Mia bozza', 'Mia pubblicata'}


# --- edit / delete permissions ---


def test_only_the_author_or_admin_can_edit(make_client, other_citizen, make_feste):
    feste = make_feste()

    response = make_client(other_citizen).patch(
        f'/api/feste/{feste.pk}/', {'title': 'Rubata'}, format='multipart',
    )

    assert response.status_code == 403


def test_the_author_can_edit_their_own_feste(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)

    response = auth_client.patch(
        f'/api/feste/{feste.pk}/', {'title': 'Titolo aggiornato'}, format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['title'] == 'Titolo aggiornato'


def test_an_admin_can_edit_someone_elses_feste(make_client, admin, make_feste):
    feste = make_feste()

    response = make_client(admin).patch(
        f'/api/feste/{feste.pk}/', {'title': 'Corretta da admin'}, format='multipart',
    )

    assert response.status_code == 200


def test_only_the_author_or_admin_can_delete(make_client, other_citizen, make_feste):
    feste = make_feste()

    response = make_client(other_citizen).delete(f'/api/feste/{feste.pk}/')

    assert response.status_code == 403
    assert Card.objects.filter(pk=feste.pk).exists()


def test_the_author_can_delete_their_own_feste(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)

    response = auth_client.delete(f'/api/feste/{feste.pk}/')

    assert response.status_code == 204
    assert not Card.objects.filter(pk=feste.pk).exists()


# --- images: add / remove on edit ---


def test_patch_appends_new_images(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)

    response = auth_client.patch(
        f'/api/feste/{feste.pk}/', {'images': [make_image_upload()]}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['images']) == 1


def test_patch_removes_named_images(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)
    image = CardImage.objects.create(card=feste.card, image=make_image_upload(), position=0)

    response = auth_client.patch(
        f'/api/feste/{feste.pk}/',
        {'remove_image_ids': json.dumps([str(image.id)])},
        format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['images'] == []


# --- route: replace on edit ---


def test_patch_replaces_the_route(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)
    MapFeature.objects.create(card=feste.card, kind=MapFeature.ROUTE, position=0, lat=GAETA_LAT, lng=GAETA_LNG)

    response = auth_client.patch(
        f'/api/feste/{feste.pk}/', {'route': route_payload(2)}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['route']) == 2
    assert MapFeature.objects.filter(card=feste.card, kind=MapFeature.ROUTE).count() == 2


def test_patch_without_a_route_field_leaves_the_existing_route_alone(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)
    MapFeature.objects.create(card=feste.card, kind=MapFeature.ROUTE, position=0, lat=GAETA_LAT, lng=GAETA_LNG)

    response = auth_client.patch(
        f'/api/feste/{feste.pk}/', {'title': 'Solo il titolo'}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['route']) == 1


# --- translations (spec translations.md T1/T2) ---


def test_translate_requires_auth(api_client, make_feste):
    feste = make_feste(is_published=True)

    response = api_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'})

    assert response.status_code == 401


def test_translate_requires_author_or_admin(make_client, other_citizen, make_feste):
    feste = make_feste(is_published=True)

    response = make_client(other_citizen).post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'})

    assert response.status_code == 403


def test_translate_creates_an_empty_draft_linked_to_the_source(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen, is_published=True, title='Festa di Sant’Erasmo')

    response = auth_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'})

    assert response.status_code == 201
    data = response.json()
    assert data['title'] == ''
    assert data['body_html'] == ''
    assert data['recurrence'] == ''
    assert data['is_published'] is False
    assert data['language'] == 'en'
    assert data['translation_of'] == str(feste.pk)


def test_translate_rejects_an_unsupported_language(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)

    response = auth_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'fr'})

    assert response.status_code == 400


def test_translate_rejects_the_source_cards_own_language(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)

    response = auth_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'it'})

    assert response.status_code == 400


def test_translate_rejects_a_second_translation_in_the_same_language(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)
    auth_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'})

    response = auth_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'})

    assert response.status_code == 400


def test_translate_rejects_translating_a_translation(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen)
    translation_id = auth_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'}).json()['id']

    response = auth_client.post(f'/api/feste/{translation_id}/traduci/', {'language': 'it'})

    assert response.status_code == 400


def test_translations_list_hides_draft_translations_from_the_public(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen, is_published=True)
    auth_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'})

    # A fresh, unauthenticated client — auth_client shares api_client's
    # instance when both are requested by the same test, so it can't stand
    # in for "an anonymous visitor" here.
    response = APIClient().get(f'/api/feste/{feste.pk}/')

    assert response.json()['translations'] == []


def test_translations_list_shows_the_authors_own_draft_translation(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen, is_published=True)
    auth_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'})

    response = auth_client.get(f'/api/feste/{feste.pk}/')

    translations = response.json()['translations']
    assert len(translations) == 1
    assert translations[0]['language'] == 'en'
    assert translations[0]['is_published'] is False


def test_translations_list_is_visible_on_the_translation_itself_once_published(auth_client, citizen, make_feste):
    feste = make_feste(author=citizen, is_published=True)
    translation_id = auth_client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'}).json()['id']
    auth_client.patch(
        f'/api/feste/{translation_id}/',
        {'title': 'Saint Erasmus Feast', 'body_html': '<p>Text</p>', 'is_published': 'true'},
        format='multipart',
    )

    response = APIClient().get(f'/api/feste/{translation_id}/')

    translations = response.json()['translations']
    assert len(translations) == 1
    assert translations[0]['id'] == str(feste.pk)
    assert translations[0]['language'] == 'it'
