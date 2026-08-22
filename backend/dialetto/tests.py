import json
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from common.testing import PASSWORD
from content.models import Card, CardImage
from dialetto.models import Termine

pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client(api_client, citizen):
    response = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    )
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.json()['access'])
    return api_client


@pytest.fixture
def make_termine(citizen):
    def _make(
        author=None, is_published=False, title='Muffato', body_html='<p>Un termine gaetano.</p>',
        term='Muffato', meaning='Confuso, rimbambito', example_usage='"Che si’ muffato?"',
    ):
        card = Card.objects.create(
            title=title, body_html=body_html, author=author or citizen, is_published=is_published,
        )
        return Termine.objects.create(
            card=card, term=term, meaning=meaning, example_usage=example_usage,
        )

    return _make


def make_image_upload(fmt='JPEG', name='foto.jpg'):
    buffer = BytesIO()
    Image.new('RGB', (50, 50), 'blue').save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


def valid_payload(**overrides):
    payload = {
        'title': 'Sciù',
        'body_html': '<p>Testo <strong>ricco</strong>.</p>',
        'term': 'Sciù',
        'meaning': 'Su, sopra',
        'example_usage': '"Vai sciù."',
    }
    payload.update(overrides)
    return payload


# --- create (auth-only) ---


def test_termine_create_requires_auth(api_client):
    response = api_client.post('/api/dialetto/', valid_payload())
    assert response.status_code == 401


def test_termine_create_makes_a_draft_by_default(auth_client):
    response = auth_client.post('/api/dialetto/', valid_payload())

    assert response.status_code == 201
    data = response.json()
    assert data['is_published'] is False
    assert data['term'] == 'Sciù'
    assert data['meaning'] == 'Su, sopra'
    card = Card.objects.get(pk=data['id'])
    assert card.is_published is False


def test_termine_create_sanitizes_the_body_end_to_end(auth_client):
    response = auth_client.post('/api/dialetto/', valid_payload(
        body_html='<p>Testo</p><script>alert(1)</script>'
    ))

    assert response.status_code == 201
    assert '<script>' not in response.json()['body_html']
    card = Card.objects.get(pk=response.json()['id'])
    assert '<script>' not in card.body_html


def test_termine_create_requires_term_and_meaning(auth_client):
    response = auth_client.post('/api/dialetto/', {**valid_payload(), 'term': '', 'meaning': ''})

    assert response.status_code == 400


def test_termine_create_accepts_images(auth_client):
    response = auth_client.post(
        '/api/dialetto/',
        {**valid_payload(is_published='true'), 'images': [make_image_upload()]},
        format='multipart',
    )

    assert response.status_code == 201
    data = response.json()
    assert len(data['images']) == 1
    assert data['is_published'] is True
    assert 'pins' not in data
    assert 'route' not in data


# --- draft/publish visibility ---


def test_a_draft_404s_for_an_anonymous_visitor(api_client, make_termine):
    termine = make_termine(is_published=False)

    response = api_client.get(f'/api/dialetto/{termine.pk}/')

    assert response.status_code == 404


def test_a_draft_is_visible_to_its_author(auth_client, citizen, make_termine):
    termine = make_termine(author=citizen, is_published=False)

    response = auth_client.get(f'/api/dialetto/{termine.pk}/')

    assert response.status_code == 200


def test_a_published_termine_is_public(api_client, make_termine):
    termine = make_termine(is_published=True)

    response = api_client.get(f'/api/dialetto/{termine.pk}/')

    assert response.status_code == 200


def test_list_only_returns_published_termini(api_client, make_termine):
    make_termine(is_published=True, title='Pubblicato', term='Uno')
    make_termine(is_published=False, title='Bozza', term='Due')

    response = api_client.get('/api/dialetto/')

    titles = [item['title'] for item in response.json()['results']]
    assert titles == ['Pubblicato']


# --- mine/ ---


def test_mine_requires_auth(api_client):
    assert api_client.get('/api/dialetto/mine/').status_code == 401


def test_mine_returns_the_requesters_drafts_and_published(auth_client, citizen, other_citizen, make_termine):
    make_termine(author=citizen, is_published=False, title='Mia bozza', term='Uno')
    make_termine(author=citizen, is_published=True, title='Mia pubblicata', term='Due')
    make_termine(author=other_citizen, is_published=True, title='Non mia', term='Tre')

    body = auth_client.get('/api/dialetto/mine/').json()
    titles = {item['title'] for item in body['results']}

    assert titles == {'Mia bozza', 'Mia pubblicata'}


# --- edit / delete permissions ---


def test_only_the_author_or_admin_can_edit(make_client, other_citizen, make_termine):
    termine = make_termine()

    response = make_client(other_citizen).patch(
        f'/api/dialetto/{termine.pk}/', {'term': 'Rubato'}, format='multipart',
    )

    assert response.status_code == 403


def test_the_author_can_edit_their_own_termine(auth_client, citizen, make_termine):
    termine = make_termine(author=citizen)

    response = auth_client.patch(
        f'/api/dialetto/{termine.pk}/', {'meaning': 'Significato aggiornato'}, format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['meaning'] == 'Significato aggiornato'


def test_only_the_author_or_admin_can_delete(make_client, other_citizen, make_termine):
    termine = make_termine()

    response = make_client(other_citizen).delete(f'/api/dialetto/{termine.pk}/')

    assert response.status_code == 403
    assert Card.objects.filter(pk=termine.pk).exists()


def test_the_author_can_delete_their_own_termine(auth_client, citizen, make_termine):
    termine = make_termine(author=citizen)

    response = auth_client.delete(f'/api/dialetto/{termine.pk}/')

    assert response.status_code == 204
    assert not Card.objects.filter(pk=termine.pk).exists()


# --- images: add / remove on edit ---


def test_patch_appends_new_images(auth_client, citizen, make_termine):
    termine = make_termine(author=citizen)

    response = auth_client.patch(
        f'/api/dialetto/{termine.pk}/', {'images': [make_image_upload()]}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['images']) == 1


def test_patch_removes_named_images(auth_client, citizen, make_termine):
    termine = make_termine(author=citizen)
    image = CardImage.objects.create(card=termine.card, image=make_image_upload(), position=0)

    response = auth_client.patch(
        f'/api/dialetto/{termine.pk}/',
        {'remove_image_ids': json.dumps([str(image.id)])},
        format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['images'] == []
