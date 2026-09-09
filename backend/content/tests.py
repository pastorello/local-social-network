import json
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from common.testing import PASSWORD
from content.models import CardImage
from content.sanitize import sanitize_html

# The API tests at the foot of this file need the database; the sanitize unit
# tests above do not, and a module-level mark is cheaper than repeating it.
pytestmark = pytest.mark.django_db


def test_sanitize_strips_script_tags():
    assert '<script>' not in sanitize_html('<p>Hello</p><script>alert(1)</script>')


def test_sanitize_strips_event_handlers():
    result = sanitize_html('<p onclick="alert(1)">Hello</p>')
    assert 'onclick' not in result
    assert 'Hello' in result


def test_sanitize_strips_iframes():
    assert '<iframe' not in sanitize_html('<iframe src="https://evil.example"></iframe>')


def test_sanitize_strips_javascript_urls_but_keeps_the_link_text():
    result = sanitize_html('<a href="javascript:alert(1)">click me</a>')
    assert 'javascript:' not in result
    assert 'click me' in result


def test_sanitize_keeps_the_allowlisted_tags():
    result = sanitize_html('<p>Some <strong>bold</strong> and <em>italic</em> text.</p>')
    assert result == '<p>Some <strong>bold</strong> and <em>italic</em> text.</p>'


def test_sanitize_keeps_a_safe_link_and_adds_rel():
    result = sanitize_html('<a href="https://example.com">example</a>')
    assert 'href="https://example.com"' in result
    assert 'rel="noopener noreferrer"' in result


def test_sanitize_unwraps_disallowed_tags_but_keeps_their_text():
    # h1 is deliberately excluded — a card's own title is the page's H1.
    result = sanitize_html('<h1>Not allowed</h1>')
    assert '<h1>' not in result
    assert 'Not allowed' in result


# --- media belongs to the original, not to each translation (2026-09-09) ---
#
# Decided with the author: one photograph per place, whatever the language.
# The rule lives in content/serializers.py::media_source (read) and
# content/api_helpers.py::reject_media_on_translation (write); it is tested
# here, once, through two type endpoints rather than six times over.


def _image_upload(name='foto.jpg'):
    buffer = BytesIO()
    Image.new('RGB', (40, 40), 'blue').save(buffer, format='JPEG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


@pytest.fixture
def author_client(api_client, citizen):
    response = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    )
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.json()['access'])
    return api_client


def _make_chiesa_with_photo(client):
    response = client.post(
        '/api/chiese/',
        {
            'title': 'Santuario della Montagna Spaccata',
            'body_html': '<p>Sopra la fenditura.</p>',
            'is_published': 'true',
            'images': [_image_upload()],
            'pins': json.dumps([{'lat': 41.204, 'lng': 13.533, 'label': 'Ingresso'}]),
        },
        format='multipart',
    )
    assert response.status_code == 201
    return response.json()


def _translate(client, endpoint, card_id):
    response = client.post(f'/api/{endpoint}/{card_id}/traduci/', {'language': 'en'})
    assert response.status_code == 201
    return response.json()


def test_a_translation_shows_the_originals_photographs(author_client):
    original = _make_chiesa_with_photo(author_client)

    translation = _translate(author_client, 'chiese', original['id'])

    assert [image['id'] for image in translation['images']] == [
        image['id'] for image in original['images']
    ]


def test_a_translation_shows_the_originals_pins(author_client):
    original = _make_chiesa_with_photo(author_client)

    translation = _translate(author_client, 'chiese', original['id'])

    assert translation['pins'] == original['pins']


def test_a_translation_still_shows_them_when_read_by_a_stranger(author_client, api_client):
    original = _make_chiesa_with_photo(author_client)
    translation = _translate(author_client, 'chiese', original['id'])
    author_client.patch(
        f'/api/chiese/{translation["id"]}/',
        {'title': 'Sanctuary of the Split Mountain', 'is_published': 'true'},
        format='multipart',
    )

    public = api_client.get(f'/api/chiese/{translation["id"]}/').json()

    assert len(public['images']) == 1
    assert public['pins'] == original['pins']


def test_uploading_a_photograph_to_a_translation_is_refused(author_client):
    original = _make_chiesa_with_photo(author_client)
    translation = _translate(author_client, 'chiese', original['id'])

    response = author_client.patch(
        f'/api/chiese/{translation["id"]}/',
        {'images': [_image_upload('altra.jpg')]},
        format='multipart',
    )

    assert response.status_code == 400
    assert 'originale' in json.dumps(response.json())
    assert CardImage.objects.count() == 1


def test_removing_the_originals_photograph_through_a_translation_is_refused(author_client):
    original = _make_chiesa_with_photo(author_client)
    translation = _translate(author_client, 'chiese', original['id'])

    response = author_client.patch(
        f'/api/chiese/{translation["id"]}/',
        {'remove_image_ids': json.dumps([original['images'][0]['id']])},
        format='multipart',
    )

    assert response.status_code == 400
    assert CardImage.objects.count() == 1


def test_giving_a_translation_its_own_pins_is_refused(author_client):
    original = _make_chiesa_with_photo(author_client)
    translation = _translate(author_client, 'chiese', original['id'])

    response = author_client.patch(
        f'/api/chiese/{translation["id"]}/',
        {'pins': json.dumps([{'lat': 41.3, 'lng': 13.6, 'label': 'Altrove'}])},
        format='multipart',
    )

    assert response.status_code == 400


def test_a_festes_translation_shows_the_originals_route(author_client):
    response = author_client.post(
        '/api/feste/',
        {
            'title': 'Processione di San Erasmo',
            'body_html': '<p>Ogni 2 giugno.</p>',
            'recurrence': 'Ogni 2 giugno',
            'programme': 'Ore 18: partenza',
            'is_published': 'true',
            'route': json.dumps([
                {'lat': 41.21, 'lng': 13.57, 'label': 'Scalzi'},
                {'lat': 41.22, 'lng': 13.58, 'label': 'Il mare'},
            ]),
        },
        format='multipart',
    )
    assert response.status_code == 201
    original = response.json()

    translation = _translate(author_client, 'feste', original['id'])

    assert translation['route'] == original['route']
    assert len(translation['route']) == 2


def test_giving_a_translation_its_own_route_is_refused(author_client):
    response = author_client.post(
        '/api/feste/',
        {
            'title': 'Processione di San Erasmo', 'body_html': '<p>x</p>',
            'recurrence': 'Ogni 2 giugno', 'programme': '', 'is_published': 'true',
            'route': json.dumps([{'lat': 41.21, 'lng': 13.57, 'label': 'Scalzi'}]),
        },
        format='multipart',
    )
    translation = _translate(author_client, 'feste', response.json()['id'])

    refused = author_client.patch(
        f'/api/feste/{translation["id"]}/',
        {'route': json.dumps([{'lat': 41.3, 'lng': 13.6, 'label': 'Altrove'}])},
        format='multipart',
    )

    assert refused.status_code == 400


def test_the_original_can_still_be_given_photographs_after_it_has_a_translation(author_client):
    original = _make_chiesa_with_photo(author_client)
    _translate(author_client, 'chiese', original['id'])

    response = author_client.patch(
        f'/api/chiese/{original["id"]}/',
        {'images': [_image_upload('seconda.jpg')]},
        format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['images']) == 2


# --- one thing in the world, one row (2026-09-09) ---


def _publish_translation(client, endpoint, original_id, title):
    translation = _translate(client, endpoint, original_id)
    response = client.patch(
        f'/api/{endpoint}/{translation["id"]}/',
        {'title': title, 'body_html': '<p>Above the cleft.</p>', 'is_published': 'true'},
        format='multipart',
    )
    assert response.status_code == 200
    return response.json()


def test_a_published_translation_is_not_a_second_row_in_the_public_list(author_client, api_client):
    original = _make_chiesa_with_photo(author_client)
    _publish_translation(author_client, 'chiese', original['id'], 'Sanctuary of the Split Mountain')

    listed = api_client.get('/api/chiese/').json()

    assert [row['id'] for row in listed['results']] == [original['id']]
    assert listed['count'] == 1


def test_the_translator_still_finds_their_translation_in_mine(author_client):
    original = _make_chiesa_with_photo(author_client)
    translation = _publish_translation(
        author_client, 'chiese', original['id'], 'Sanctuary of the Split Mountain'
    )

    mine = author_client.get('/api/chiese/mine/').json()

    # `mine/` is the only way back to a translation now that the public list
    # hides it — excluding it there would strand unfinished work.
    assert {row['id'] for row in mine['results']} == {original['id'], translation['id']}


def test_a_translation_carries_the_italian_name_as_original_title(author_client):
    original = _make_chiesa_with_photo(author_client)

    translation = _publish_translation(
        author_client, 'chiese', original['id'], 'Sanctuary of the Split Mountain'
    )

    # The reader of the English card needs the name written on the signs in
    # Gaeta; the English rendering is the subtitle, not the identity.
    assert translation['original_title'] == 'Santuario della Montagna Spaccata'
    assert translation['title'] == 'Sanctuary of the Split Mountain'


def test_an_original_reports_its_own_title_as_the_original_title(author_client):
    original = _make_chiesa_with_photo(author_client)

    assert original['original_title'] == original['title']
