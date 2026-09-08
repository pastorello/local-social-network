import json
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

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


# --- images: the order is the cover (D5) ---


def test_the_upload_order_is_the_stored_order(auth_client, citizen):
    """Which image is first is an editorial decision, so it has to survive."""
    response = auth_client.post(
        '/api/chiese/',
        {
            'title': 'Chiesa di Sant’Erasmo', 'body_html': '<p>Testo.</p>',
            'images': [
                make_image_upload(name='facciata.jpg'),
                make_image_upload(name='interno.jpg'),
                make_image_upload(name='dettaglio.jpg'),
            ],
            'image_order': json.dumps(['new:2', 'new:0', 'new:1']),
        },
        format='multipart',
    )

    assert response.status_code == 201
    names = [image['imageURL'].split('/')[-1] for image in response.json()['images']]
    assert names[0].startswith('dettaglio')
    assert names[1].startswith('facciata')
    assert names[2].startswith('interno')


def test_an_upload_can_become_the_cover_of_an_existing_card(auth_client, citizen, make_chiesa):
    """The whole point of tokens: arrange old and new together, in one save."""
    chiesa = make_chiesa(author=citizen)
    existing = CardImage.objects.create(
        card=chiesa.card, image=make_image_upload(name='vecchia.jpg'), position=0
    )

    response = auth_client.patch(
        f'/api/chiese/{chiesa.pk}/',
        {
            'images': [make_image_upload(name='nuova.jpg')],
            'image_order': json.dumps(['new:0', str(existing.id)]),
        },
        format='multipart',
    )

    assert response.status_code == 200
    names = [image['imageURL'].split('/')[-1] for image in response.json()['images']]
    assert names[0].startswith('nuova')
    assert names[1].startswith('vecchia')


def test_an_image_the_order_does_not_mention_keeps_its_place_at_the_end(
    auth_client, citizen, make_chiesa
):
    chiesa = make_chiesa(author=citizen)
    first = CardImage.objects.create(
        card=chiesa.card, image=make_image_upload(name='prima.jpg'), position=0
    )
    second = CardImage.objects.create(
        card=chiesa.card, image=make_image_upload(name='seconda.jpg'), position=1
    )

    # Only the second is named — a partial order arranges, it does not delete.
    response = auth_client.patch(
        f'/api/chiese/{chiesa.pk}/',
        {'image_order': json.dumps([str(second.id)])},
        format='multipart',
    )

    assert response.status_code == 200
    # `CardImage`'s pk is an integer, unlike the UUID pks elsewhere — the
    # token protocol stringifies both ends, so the ids come back as numbers.
    ids = [image['id'] for image in response.json()['images']]
    assert ids == [second.id, first.id]


def test_a_malformed_order_is_a_400_not_a_500(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)

    response = auth_client.patch(
        f'/api/chiese/{chiesa.pk}/', {'image_order': 'non-json'}, format='multipart',
    )

    assert response.status_code == 400
    assert 'image_order' in response.json()['fields']


def test_an_unknown_token_is_ignored_rather_than_fatal(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)
    image = CardImage.objects.create(
        card=chiesa.card, image=make_image_upload(), position=0
    )

    response = auth_client.patch(
        f'/api/chiese/{chiesa.pk}/',
        {'image_order': json.dumps(['new:9', 'ffffffff-ffff-4fff-8fff-ffffffffffff', str(image.id)])},
        format='multipart',
    )

    assert response.status_code == 200
    assert [i['id'] for i in response.json()['images']] == [image.id]


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


# --- translations (spec translations.md T1/T2) ---


def test_translate_requires_author_or_admin(make_client, other_citizen, make_chiesa):
    chiesa = make_chiesa(is_published=True)

    response = make_client(other_citizen).post(f'/api/chiese/{chiesa.pk}/traduci/', {'language': 'en'})

    assert response.status_code == 403


def test_translate_creates_an_empty_draft_linked_to_the_source(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen, is_published=True)

    response = auth_client.post(f'/api/chiese/{chiesa.pk}/traduci/', {'language': 'en'})

    assert response.status_code == 201
    data = response.json()
    assert data['title'] == ''
    assert data['language'] == 'en'
    assert data['translation_of'] == str(chiesa.pk)


def test_translate_rejects_a_second_translation_in_the_same_language(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)
    auth_client.post(f'/api/chiese/{chiesa.pk}/traduci/', {'language': 'en'})

    response = auth_client.post(f'/api/chiese/{chiesa.pk}/traduci/', {'language': 'en'})

    assert response.status_code == 400


def test_translate_rejects_translating_a_translation(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen)
    translation_id = auth_client.post(f'/api/chiese/{chiesa.pk}/traduci/', {'language': 'en'}).json()['id']

    response = auth_client.post(f'/api/chiese/{translation_id}/traduci/', {'language': 'it'})

    assert response.status_code == 400


def test_translations_list_hides_draft_translations_from_the_public(auth_client, citizen, make_chiesa):
    chiesa = make_chiesa(author=citizen, is_published=True)
    auth_client.post(f'/api/chiese/{chiesa.pk}/traduci/', {'language': 'en'})

    response = APIClient().get(f'/api/chiese/{chiesa.pk}/')

    assert response.json()['translations'] == []
