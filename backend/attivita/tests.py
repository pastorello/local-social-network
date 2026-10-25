import json
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from attivita.models import Attivita
from chiese.models import Chiesa
from common.testing import PASSWORD
from content.models import Availability, Card, CardImage, MapFeature
from itinerari.models import Itinerario, Stop
from itinerari.rules import stop_card_problem
from maps.api import CARD_TYPES, STOP_TYPES

pytestmark = pytest.mark.django_db

GAETA_LAT = 41.2172608
GAETA_LNG = 13.5625165
# Inside Serapo's outline (maps/migrations/0006), as seed_e2e's beach is.
SERAPO_LAT = 41.2105
SERAPO_LNG = 13.5640


@pytest.fixture
def auth_client(api_client, citizen):
    response = api_client.post(
        '/api/users/login/', {'email': citizen.email, 'password': PASSWORD}
    )
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.json()['access'])
    return api_client


@pytest.fixture
def make_attivita(citizen):
    def _make(author=None, is_published=False, title='Bar del porto', kind=Attivita.BEVE,
              body_html='<p>Il caffè sul molo.</p>', pin=None):
        card = Card.objects.create(
            title=title, body_html=body_html, author=author or citizen, is_published=is_published,
        )
        attivita = Attivita.objects.create(card=card, kind=kind)
        if pin:
            MapFeature.objects.create(card=card, kind=MapFeature.POINT, position=0, lat=pin[0], lng=pin[1])
        return attivita

    return _make


def make_image_upload(fmt='JPEG', name='foto.jpg'):
    buffer = BytesIO()
    Image.new('RGB', (50, 50), 'blue').save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


def pins_payload(n=1, lat=GAETA_LAT, lng=GAETA_LNG):
    return json.dumps([
        {'lat': lat + i * 0.001, 'lng': lng + i * 0.001, 'label': f'Punto {i}'}
        for i in range(n)
    ])


def valid_payload(**overrides):
    payload = {
        'title': 'Forno di Gaeta',
        'body_html': '<p>La tiella <strong>come si deve</strong>.</p>',
        'kind': 'compra',
    }
    payload.update(overrides)
    return payload


def titles(response):
    return [row['title'] for row in response.json()['results']]


# --- (a) the kind is closed in code (ADR-0010) ---


def test_a_fourth_kind_is_refused_not_stored(auth_client):
    response = auth_client.post('/api/attivita/', valid_payload(kind='stabilimento-balneare'))

    assert response.status_code == 400
    assert 'kind' in response.json()['fields']
    assert not Attivita.objects.exists()


def test_a_fourth_kind_is_refused_on_an_edit_too(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen)

    response = auth_client.patch(
        f'/api/attivita/{attivita.pk}/', {'kind': 'catena'}, format='multipart',
    )

    assert response.status_code == 400
    attivita.refresh_from_db()
    assert attivita.kind == Attivita.BEVE


def test_the_kinds_are_code_not_a_table_an_admin_could_add_to(api_client):
    """K5's trap was a `Ristorante` genre: one admin form, no PR. The kinds are
    choices on a CharField, not rows of a model."""
    field = Attivita._meta.get_field('kind')

    assert not field.is_relation
    assert [slug for slug, _ in field.choices] == ['beve', 'mangia', 'compra']
    response = api_client.get('/api/attivita/kinds/')
    assert response.status_code == 200
    assert [kind['slug'] for kind in response.json()] == ['beve', 'mangia', 'compra']
    assert response.json()[0]['name'] == 'Dove si beve'
    # The reader's English, closed in code beside them (review PR-19a).
    assert [kind['name_en'] for kind in response.json()] == [
        'Where to drink', 'Where to eat', 'Where to buy',
    ]


def test_create_requires_a_kind(auth_client):
    payload = valid_payload()
    del payload['kind']

    response = auth_client.post('/api/attivita/', payload)

    assert response.status_code == 400
    assert 'kind' in response.json()['fields']


# --- (b) the public order is alphabetical, and nothing else (CF40) ---


def test_the_public_list_is_alphabetical_whatever_order_they_were_written_in(api_client, make_attivita):
    # Written newest-first and in no order a reader could guess, mixed case:
    # the list must not be by date, by kind, or by capital letters first.
    make_attivita(is_published=True, title='Zi Teresa', kind=Attivita.MANGIA)
    make_attivita(is_published=True, title='bar Ariana', kind=Attivita.BEVE)
    make_attivita(is_published=True, title='Antico forno', kind=Attivita.COMPRA)
    make_attivita(is_published=True, title='Cantina del Borgo', kind=Attivita.BEVE)

    response = api_client.get('/api/attivita/')

    assert titles(response) == ['Antico forno', 'bar Ariana', 'Cantina del Borgo', 'Zi Teresa']


def test_no_query_parameter_can_reorder_the_list(api_client, make_attivita):
    make_attivita(is_published=True, title='Zi Teresa')
    make_attivita(is_published=True, title='Antico forno')

    for query in ('?ordering=-title', '?ordering=-created_at', '?order=random', '?sort=kind'):
        assert titles(api_client.get(f'/api/attivita/{query}')) == ['Antico forno', 'Zi Teresa'], query


def test_a_kind_filtered_list_is_alphabetical_too(api_client, make_attivita):
    make_attivita(is_published=True, title='Vineria', kind=Attivita.BEVE)
    make_attivita(is_published=True, title='Trattoria', kind=Attivita.MANGIA)
    make_attivita(is_published=True, title='Enoteca', kind=Attivita.BEVE)

    response = api_client.get('/api/attivita/?kind=beve')

    assert titles(response) == ['Enoteca', 'Vineria']


def test_an_unknown_kind_filter_is_an_empty_list_not_an_error(api_client, make_attivita):
    make_attivita(is_published=True)

    response = api_client.get('/api/attivita/?kind=non-esiste')

    assert response.status_code == 200
    assert response.json()['results'] == []


# --- (c) a business is never a stop of a tour (CF40, ADR-0010) ---


def test_the_map_layers_and_the_stop_types_are_two_lists():
    """The trap cosa-fare.md I3 named: one tuple was both the map's layers and
    the definition of a stop, so putting a type on the map made it a stop."""
    assert 'attivita' in CARD_TYPES
    assert 'attivita' not in STOP_TYPES
    assert set(STOP_TYPES) <= set(CARD_TYPES)


def test_a_business_cannot_be_a_stop_of_a_tour(auth_client, make_attivita):
    attivita = make_attivita(is_published=True, pin=(GAETA_LAT, GAETA_LNG))

    response = auth_client.post('/api/itinerari/', {
        'title': 'Aperitivo al porto',
        'body_html': '<p>Un giro.</p>',
        'form': 'raccolta',
        'stops': json.dumps([{'card': str(attivita.pk)}]),
    })

    assert response.status_code == 400
    assert 'è un’attività' in response.json()['fields']['stops'][0]
    assert not Itinerario.objects.exists()


def test_a_business_is_not_a_stop_even_beside_a_church(auth_client, citizen, make_attivita):
    """Not a card with no place either: it has one, and the message says why
    it is refused rather than that it is missing."""
    attivita = make_attivita(is_published=True, pin=(GAETA_LAT, GAETA_LNG))
    chiesa = Card.objects.create(title='Duomo', body_html='<p>.</p>', author=citizen, is_published=True)
    Chiesa.objects.create(card=chiesa)
    MapFeature.objects.create(card=chiesa, kind=MapFeature.POINT, position=0, lat=41.2087, lng=13.5868)

    response = auth_client.post('/api/itinerari/', {
        'title': 'Il centro', 'body_html': '<p>Un giro.</p>', 'form': 'percorso',
        'stops': json.dumps([{'card': str(chiesa.pk)}, {'card': str(attivita.pk)}]),
    })

    assert response.status_code == 400
    assert stop_card_problem(attivita.card) is not None
    assert 'non ha un luogo' not in stop_card_problem(attivita.card)
    assert stop_card_problem(chiesa) is None
    assert not Stop.objects.exists()


# --- (d) a draft moves no public count (map.md M5) ---


def test_a_draft_business_moves_no_public_count_not_even_for_its_author(auth_client, api_client, make_attivita, citizen):
    before = {
        'counts': api_client.get('/api/content/counts/').json(),
        'zones': api_client.get('/api/map/zone/').json(),
        'kinds': api_client.get('/api/attivita/kinds/').json(),
        'intents': api_client.get('/api/itinerari/intenti/').json(),
    }
    make_attivita(author=citizen, is_published=False, title='Bar in bozza', pin=(SERAPO_LAT, SERAPO_LNG))

    for client in (api_client, auth_client):
        assert client.get('/api/content/counts/').json() == before['counts']
        assert client.get('/api/content/counts/').json()['attivita'] == 0
        assert client.get('/api/map/zone/').json() == before['zones']
        assert client.get('/api/attivita/kinds/').json() == before['kinds']
        assert client.get('/api/itinerari/intenti/').json() == before['intents']
        assert client.get('/api/content/stats/').json()['published'] == 0


def test_a_published_business_is_counted_under_its_kind_and_type_but_not_as_a_zones_place(
    api_client, make_attivita
):
    """The zones count places — chiese and luoghi — as they did (cosa-fare.md
    Part −1 D3): a zone is not bigger for holding more bars."""
    make_attivita(is_published=True, kind=Attivita.MANGIA, pin=(SERAPO_LAT, SERAPO_LNG))

    kinds = {kind['slug']: kind['count'] for kind in api_client.get('/api/attivita/kinds/').json()}
    zones = {zone['slug']: zone['count'] for zone in api_client.get('/api/map/zone/').json()}

    assert kinds == {'beve': 0, 'mangia': 1, 'compra': 0}
    assert api_client.get('/api/content/counts/').json()['attivita'] == 1
    assert zones['serapo'] == 0


def test_the_kind_counts_leave_out_translations(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen, is_published=True)
    translation_id = auth_client.post(
        f'/api/attivita/{attivita.pk}/traduci/', {'language': 'en'}
    ).json()['id']
    Card.objects.filter(pk=translation_id).update(is_published=True, title='Harbour bar')

    counts = {kind['slug']: kind['count'] for kind in APIClient().get('/api/attivita/kinds/').json()}

    assert counts['beve'] == 1


# --- create (auth-only) ---


def test_create_requires_auth(api_client):
    response = api_client.post('/api/attivita/', valid_payload())
    assert response.status_code == 401


def test_create_makes_a_draft_by_default(auth_client):
    response = auth_client.post('/api/attivita/', valid_payload())

    assert response.status_code == 201
    data = response.json()
    assert data['is_published'] is False
    assert data['kind'] == 'compra'
    assert data['kind_label'] == 'Dove si compra'


def test_create_sanitizes_the_body_end_to_end(auth_client):
    response = auth_client.post('/api/attivita/', valid_payload(
        body_html='<p>Testo</p><script>alert(1)</script>'
    ))

    assert response.status_code == 201
    assert '<script>' not in response.json()['body_html']
    assert '<script>' not in Card.objects.get(pk=response.json()['id']).body_html


def test_create_stores_how_to_get_there_without_the_browsers_crlf(auth_client):
    response = auth_client.post(
        '/api/attivita/', valid_payload(how_to_get_there='In fondo al molo.\r\nDietro la fontana.'),
    )

    assert response.status_code == 201
    # A textarea's CRLF is the browser's, not the author's (TD-36).
    assert response.json()['how_to_get_there'] == 'In fondo al molo.\nDietro la fontana.'


def test_create_accepts_an_image_and_its_one_pin(auth_client):
    response = auth_client.post(
        '/api/attivita/',
        {**valid_payload(is_published='true'), 'images': [make_image_upload()], 'pins': pins_payload(1)},
        format='multipart',
    )

    assert response.status_code == 201
    data = response.json()
    assert len(data['images']) == 1
    assert len(data['pins']) == 1


def test_create_rejects_a_second_pin(auth_client):
    response = auth_client.post(
        '/api/attivita/', {**valid_payload(), 'pins': pins_payload(2)}, format='multipart',
    )

    assert response.status_code == 400
    assert 'pins' in response.json()['fields']


# --- draft/publish visibility ---


def test_a_draft_404s_for_an_anonymous_visitor(api_client, make_attivita):
    attivita = make_attivita(is_published=False)

    assert api_client.get(f'/api/attivita/{attivita.pk}/').status_code == 404


def test_a_draft_404s_for_another_collaborator(make_client, other_citizen, make_attivita):
    attivita = make_attivita(is_published=False)

    assert make_client(other_citizen).get(f'/api/attivita/{attivita.pk}/').status_code == 404


def test_a_draft_is_visible_to_its_author_and_to_an_admin(auth_client, make_client, admin, citizen, make_attivita):
    attivita = make_attivita(author=citizen, is_published=False)

    assert auth_client.get(f'/api/attivita/{attivita.pk}/').status_code == 200
    assert make_client(admin).get(f'/api/attivita/{attivita.pk}/').status_code == 200


def test_list_only_returns_published_originals(auth_client, citizen, make_attivita):
    published = make_attivita(author=citizen, is_published=True, title='Pubblicata')
    make_attivita(is_published=False, title='Bozza')
    translation_id = auth_client.post(
        f'/api/attivita/{published.pk}/traduci/', {'language': 'en'}
    ).json()['id']
    Card.objects.filter(pk=translation_id).update(is_published=True, title='Published')

    assert titles(APIClient().get('/api/attivita/')) == ['Pubblicata']


# --- mine/ ---


def test_mine_requires_auth(api_client):
    assert api_client.get('/api/attivita/mine/').status_code == 401


def test_mine_returns_the_requesters_drafts_and_published(auth_client, citizen, other_citizen, make_attivita):
    make_attivita(author=citizen, is_published=False, title='Mia bozza')
    make_attivita(author=citizen, is_published=True, title='Mia pubblicata')
    make_attivita(author=other_citizen, is_published=True, title='Non mia')

    body = auth_client.get('/api/attivita/mine/').json()

    assert {item['title'] for item in body['results']} == {'Mia bozza', 'Mia pubblicata'}


# --- edit / delete permissions ---


def test_only_the_author_or_admin_can_edit(make_client, other_citizen, make_attivita):
    attivita = make_attivita()

    response = make_client(other_citizen).patch(
        f'/api/attivita/{attivita.pk}/', {'title': 'Rubata'}, format='multipart',
    )

    assert response.status_code == 403


def test_the_author_can_edit_title_and_kind(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen)

    response = auth_client.patch(
        f'/api/attivita/{attivita.pk}/', {'title': 'Enoteca', 'kind': 'mangia'}, format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['title'] == 'Enoteca'
    assert response.json()['kind'] == 'mangia'


def test_only_the_author_or_admin_can_delete(make_client, other_citizen, make_attivita):
    attivita = make_attivita()

    assert make_client(other_citizen).delete(f'/api/attivita/{attivita.pk}/').status_code == 403
    assert Card.objects.filter(pk=attivita.pk).exists()


def test_the_author_can_delete_their_own(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen)

    assert auth_client.delete(f'/api/attivita/{attivita.pk}/').status_code == 204
    assert not Card.objects.filter(pk=attivita.pk).exists()


def test_patch_removes_named_images(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen)
    image = CardImage.objects.create(card=attivita.card, image=make_image_upload(), position=0)

    response = auth_client.patch(
        f'/api/attivita/{attivita.pk}/',
        {'remove_image_ids': json.dumps([str(image.id)])},
        format='multipart',
    )

    assert response.status_code == 200
    assert response.json()['images'] == []


def test_patch_without_a_pins_field_leaves_the_existing_pin_alone(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen, pin=(GAETA_LAT, GAETA_LNG))

    response = auth_client.patch(
        f'/api/attivita/{attivita.pk}/', {'title': 'Solo il titolo'}, format='multipart',
    )

    assert response.status_code == 200
    assert len(response.json()['pins']) == 1


# --- the hours: dated testimony, and only that (ADR-0008, ADR-0010) ---


def test_a_business_has_hours_dated_by_the_server(auth_client):
    response = auth_client.post('/api/attivita/', {
        **valid_payload(),
        'availability': json.dumps({'state': 'unknown', 'hours': 'Tutti i giorni dalle 7', 'hours_updated': '2000-01-01'}),
    }, format='multipart')

    assert response.status_code == 201
    availability = response.json()['availability']
    assert availability['hours'] == 'Tutti i giorni dalle 7'
    assert availability['hours_updated'] not in (None, '2000-01-01')


def test_a_business_is_never_said_to_be_open_or_given_a_keeper(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen)

    for availability in (
        {'state': 'services', 'hours': ''},
        {'state': 'on_request', 'hours': ''},
        {'state': 'no_door', 'hours': ''},
        {'state': 'unknown', 'hours': '', 'keeper': 'Il titolare'},
        {'state': 'unknown', 'hours': '', 'keeper_phone': '0771 000000'},
    ):
        response = auth_client.patch(
            f'/api/attivita/{attivita.pk}/', {'availability': json.dumps(availability)}, format='multipart',
        )
        assert response.status_code == 400, availability
        assert 'availability' in response.json()['fields']
    assert not Availability.objects.exists()


def test_no_row_is_unknown_not_open(api_client, make_attivita):
    attivita = make_attivita(is_published=True)

    assert api_client.get(f'/api/attivita/{attivita.pk}/').json()['availability']['state'] == 'unknown'


# --- translations (spec translations.md T1/T2/T5) ---


def test_translate_requires_author_or_admin(make_client, other_citizen, make_attivita):
    attivita = make_attivita(is_published=True)

    response = make_client(other_citizen).post(f'/api/attivita/{attivita.pk}/traduci/', {'language': 'en'})

    assert response.status_code == 403


def test_translate_creates_an_empty_draft_linked_to_the_source(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen, is_published=True)

    response = auth_client.post(f'/api/attivita/{attivita.pk}/traduci/', {'language': 'en'})

    assert response.status_code == 201
    data = response.json()
    assert data['title'] == ''
    assert data['language'] == 'en'
    assert data['translation_of'] == str(attivita.pk)


def test_translate_rejects_translating_a_translation(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen)
    translation_id = auth_client.post(f'/api/attivita/{attivita.pk}/traduci/', {'language': 'en'}).json()['id']

    response = auth_client.post(f'/api/attivita/{translation_id}/traduci/', {'language': 'it'})

    assert response.status_code == 400


def test_a_translation_shows_its_originals_kind_pin_and_hours(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen, kind=Attivita.BEVE, pin=(GAETA_LAT, GAETA_LNG))
    Availability.objects.create(card=attivita.card, hours='Dalle 18')
    translation_id = auth_client.post(f'/api/attivita/{attivita.pk}/traduci/', {'language': 'en'}).json()['id']
    Attivita.objects.filter(pk=attivita.pk).update(kind=Attivita.MANGIA)

    data = auth_client.get(f'/api/attivita/{translation_id}/').json()

    assert data['kind'] == 'mangia'
    assert data['kind_label'] == 'Dove si mangia'
    assert len(data['pins']) == 1
    assert data['availability']['hours'] == 'Dalle 18'


def test_a_translation_is_not_published_before_its_original(auth_client, citizen, make_attivita):
    attivita = make_attivita(author=citizen, is_published=False)
    translation_id = auth_client.post(f'/api/attivita/{attivita.pk}/traduci/', {'language': 'en'}).json()['id']

    response = auth_client.patch(
        f'/api/attivita/{translation_id}/', {'title': 'Bar', 'is_published': 'true'}, format='multipart',
    )

    assert response.status_code == 400
    assert 'is_published' in response.json()['fields']


# --- the map (spec map.md: one layer per type that has a place) ---


def test_a_published_business_reaches_the_map_as_its_own_layer_with_its_kind(api_client, make_attivita):
    make_attivita(is_published=True, kind=Attivita.MANGIA, pin=(SERAPO_LAT, SERAPO_LNG))

    entries = api_client.get('/api/map/features/').json()

    assert [(entry['type'], entry['kind'], entry['zones']) for entry in entries] == [
        ('attivita', 'mangia', ['serapo']),
    ]
    assert entries[0]['access'] is None


def test_the_zone_it_is_in_comes_by_name(api_client, make_attivita):
    attivita = make_attivita(is_published=True, pin=(SERAPO_LAT, SERAPO_LNG))

    zones = api_client.get(f'/api/attivita/{attivita.pk}/').json()['zones']

    assert zones == [{'slug': 'serapo', 'name': 'Serapo', 'name_en': ''}]
