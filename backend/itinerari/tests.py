import json

import pytest
from rest_framework.test import APIClient

from chiese.models import Chiesa
from common.testing import PASSWORD
from content.models import Card, MapFeature
from dialetto.models import Termine
from feste.models import Feste
from itinerari.models import Intent, Itinerario, Stop
from ricette.models import Ricetta

pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client(api_client, citizen):
    response = api_client.post('/api/users/login/', {'email': citizen.email, 'password': PASSWORD})
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.json()['access'])
    return api_client


def _card(author, title, is_published=True):
    return Card.objects.create(title=title, body_html='<p>Testo.</p>', author=author, is_published=is_published)


@pytest.fixture
def places(citizen):
    """The archive a tour is made of: a church with its pin, a recipe sold at
    two bakeries, a festa with a route, and a dialect word, which has no place."""
    chiesa = Chiesa.objects.create(card=_card(citizen, 'Duomo'))
    MapFeature.objects.create(card=chiesa.card, kind=MapFeature.POINT, position=0, lat=41.2087, lng=13.5868, label='Portale')

    tiella = Ricetta.objects.create(card=_card(citizen, 'Tiella di Gaeta'))
    MapFeature.objects.create(card=tiella.card, kind=MapFeature.POINT, position=0, lat=41.2140, lng=13.5700, label='Forno A')
    MapFeature.objects.create(card=tiella.card, kind=MapFeature.POINT, position=1, lat=41.2150, lng=13.5720, label='Forno B')

    festa = Feste.objects.create(card=_card(citizen, 'Porto Salvo'))
    MapFeature.objects.create(card=festa.card, kind=MapFeature.ROUTE, position=0, lat=41.2160, lng=13.5690, label='Scalzi')
    MapFeature.objects.create(card=festa.card, kind=MapFeature.ROUTE, position=1, lat=41.2100, lng=13.5850, label='Punta Stendardo')

    parola = Termine.objects.create(card=_card(citizen, 'Sciuscià'))
    return {'chiesa': chiesa.card, 'tiella': tiella.card, 'festa': festa.card, 'parola': parola.card}


def payload(stops, **overrides):
    data = {
        'title': 'Gaeta medievale in mezza giornata',
        'body_html': '<p>Un giro <strong>a piedi</strong>.</p>',
        'form': 'percorso',
        'duration': 'Mezza giornata',
        'intents': json.dumps(['citta']),
        'stops': json.dumps(stops),
    }
    data.update(overrides)
    return data


# --- the intents (I5) ---


def test_the_seeded_intents_are_the_three_the_author_named(api_client):
    response = api_client.get('/api/itinerari/intenti/')

    assert [intent['slug'] for intent in response.json()] == ['mare', 'mangiare', 'citta']
    assert response.json()[2]['name'] == 'Scoprire la città'


def test_an_intent_counts_only_published_tours(auth_client, places):
    auth_client.post('/api/itinerari/', payload([{'card': str(places['chiesa'].pk)}], is_published='true'))
    auth_client.post('/api/itinerari/', payload([{'card': str(places['chiesa'].pk)}]))

    counts = {i['slug']: i['count'] for i in APIClient().get('/api/itinerari/intenti/').json()}

    assert counts == {'mare': 0, 'mangiare': 0, 'citta': 1}


# --- writing a tour ---


def test_create_requires_auth(api_client, places):
    assert api_client.post('/api/itinerari/', payload([])).status_code == 401


def test_create_keeps_the_stops_in_order_with_their_points_and_notes(auth_client, places):
    stops = [
        {'card': str(places['tiella'].pk), 'point_index': 1, 'note': 'Un pezzo di tiella qui.\r\nCalda.'},
        {'card': str(places['chiesa'].pk)},
        {'card': str(places['festa'].pk), 'note': 'Da qui parte la processione.'},
    ]

    response = auth_client.post('/api/itinerari/', payload(stops))

    assert response.status_code == 201
    data = response.json()
    assert data['form'] == 'percorso'
    assert data['duration'] == 'Mezza giornata'
    assert data['intents'] == ['citta']
    assert [s['title'] for s in data['stops']] == ['Tiella di Gaeta', 'Duomo', 'Porto Salvo']
    assert [s['type'] for s in data['stops']] == ['ricette', 'chiese', 'feste']
    # "The tiella, at this bakery" (I3): the chosen one of the card's pins.
    assert data['stops'][0]['point']['label'] == 'Forno B'
    assert data['stops'][0]['note'] == 'Un pezzo di tiella qui.\nCalda.'
    # No point chosen: the card's first — or, for a festa, where its route starts.
    assert data['stops'][1]['point']['label'] == 'Portale'
    assert data['stops'][2]['point']['label'] == 'Scalzi'


def test_a_stop_must_have_a_place(auth_client, places):
    response = auth_client.post('/api/itinerari/', payload([{'card': str(places['parola'].pk)}]))

    assert response.status_code == 400
    assert 'non ha un luogo' in response.json()['fields']['stops'][0]


def test_a_stop_is_an_original_not_a_translation(auth_client, citizen, places):
    translation = _card(citizen, 'Cathedral')
    translation.translation_of = places['chiesa']
    translation.language = 'en'
    translation.save()
    Chiesa.objects.create(card=translation)

    response = auth_client.post('/api/itinerari/', payload([{'card': str(translation.pk)}]))

    assert response.status_code == 400
    assert 'traduzione' in response.json()['fields']['stops'][0]


@pytest.mark.parametrize('bad', [
    [{'card': 'not-a-uuid'}],
    [{'card': '00000000-0000-4000-8000-000000000000'}],
    [{'nocard': True}],
    'not a list',
])
def test_malformed_stops_are_a_400_not_a_500(auth_client, places, bad):
    data = payload([])
    data['stops'] = json.dumps(bad)
    response = auth_client.post('/api/itinerari/', data)

    assert response.status_code == 400
    assert 'stops' in response.json()['fields']


def test_a_point_the_card_does_not_have_is_refused(auth_client, places):
    response = auth_client.post(
        '/api/itinerari/', payload([{'card': str(places['chiesa'].pk), 'point_index': 3}])
    )

    assert response.status_code == 400
    assert 'non esiste' in response.json()['fields']['stops'][0]


def test_an_unknown_intent_is_refused(auth_client, places):
    response = auth_client.post('/api/itinerari/', payload([], intents=json.dumps(['shopping'])))

    assert response.status_code == 400
    assert 'intents' in response.json()['fields']



def test_someone_elses_draft_is_not_a_stop_and_its_title_never_comes_back(
    auth_client, other_citizen, places
):
    secret = Chiesa.objects.create(card=_card(other_citizen, 'Bozza di un altro', is_published=False))
    MapFeature.objects.create(card=secret.card, kind=MapFeature.POINT, position=0, lat=41.21, lng=13.58, label='Casa')

    for extra in ({}, {'is_published': 'true'}):
        response = auth_client.post('/api/itinerari/', payload([{'card': str(secret.card.pk)}], **extra))
        assert response.status_code == 400
        # The same answer as a card that does not exist — the draft's title
        # and place must not reach someone who cannot open it.
        assert response.json()['fields']['stops'] == ['Una delle schede non esiste.']
        assert 'Bozza di un altro' not in response.content.decode()
        assert 'Casa' not in response.content.decode()


def test_an_admin_may_use_any_draft_and_an_author_their_own(make_client, admin, citizen, places):
    draft = Chiesa.objects.create(card=_card(citizen, 'La mia bozza', is_published=False))
    MapFeature.objects.create(card=draft.card, kind=MapFeature.POINT, position=0, lat=41.21, lng=13.58)

    for user in (citizen, admin):
        response = make_client(user).post('/api/itinerari/', payload([{'card': str(draft.card.pk)}]))
        assert response.status_code == 201, user


def test_a_stop_unpublished_by_its_author_does_not_lock_the_tour(
    make_client, citizen, other_citizen, places
):
    theirs = Chiesa.objects.create(card=_card(other_citizen, 'Chiesa di un altro'))
    MapFeature.objects.create(card=theirs.card, kind=MapFeature.POINT, position=0, lat=41.21, lng=13.58)
    client = make_client(citizen)
    stops = [{'card': str(places['chiesa'].pk)}, {'card': str(theirs.card.pk)}]
    tour_id = client.post('/api/itinerari/', payload(stops)).json()['id']
    Card.objects.filter(pk=theirs.card.pk).update(is_published=False)

    response = client.patch(
        f'/api/itinerari/{tour_id}/',
        {'title': 'Nuovo titolo', 'stops': json.dumps(stops)},
        format='multipart',
    )

    assert response.status_code == 200


def test_a_tour_is_not_a_stop_not_even_of_itself(auth_client, places):
    path = [{'lat': 41.21, 'lng': 13.57, 'label': ''}, {'lat': 41.212, 'lng': 13.575, 'label': ''}]
    tour_id = auth_client.post(
        '/api/itinerari/', payload([{'card': str(places['chiesa'].pk)}], route=json.dumps(path))
    ).json()['id']

    as_new_stop = auth_client.post('/api/itinerari/', payload([{'card': tour_id}]))
    as_own_stop = auth_client.patch(
        f'/api/itinerari/{tour_id}/', {'stops': json.dumps([{'card': tour_id}])}, format='multipart'
    )

    assert as_new_stop.status_code == 400
    assert as_own_stop.status_code == 400

# --- I4: a published tour never shows a stop the reader cannot open ---


def test_a_tour_cannot_be_published_with_a_draft_stop(auth_client, citizen, places):
    draft = Chiesa.objects.create(card=_card(citizen, 'Chiesa in bozza', is_published=False))
    MapFeature.objects.create(card=draft.card, kind=MapFeature.POINT, position=0, lat=41.21, lng=13.58)

    response = auth_client.post(
        '/api/itinerari/',
        payload([{'card': str(places['chiesa'].pk)}, {'card': str(draft.card.pk)}], is_published='true'),
    )

    assert response.status_code == 400
    assert '«Chiesa in bozza»' in response.json()['fields']['is_published'][0]


def test_publishing_later_checks_the_stops_it_already_has(auth_client, citizen, places):
    draft = Chiesa.objects.create(card=_card(citizen, 'Chiesa in bozza', is_published=False))
    MapFeature.objects.create(card=draft.card, kind=MapFeature.POINT, position=0, lat=41.21, lng=13.58)
    tour_id = auth_client.post('/api/itinerari/', payload([{'card': str(draft.card.pk)}])).json()['id']

    response = auth_client.patch(f'/api/itinerari/{tour_id}/', {'is_published': 'true'}, format='multipart')

    assert response.status_code == 400


def test_a_stop_unpublished_later_is_skipped_for_readers_and_flagged_for_the_author(
    auth_client, places
):
    tour_id = auth_client.post(
        '/api/itinerari/',
        payload([{'card': str(places['chiesa'].pk)}, {'card': str(places['tiella'].pk)}], is_published='true'),
    ).json()['id']
    Card.objects.filter(pk=places['tiella'].pk).update(is_published=False)

    reader_stops = APIClient().get(f'/api/itinerari/{tour_id}/').json()['stops']
    author_stops = auth_client.get(f'/api/itinerari/{tour_id}/').json()['stops']

    assert [s['title'] for s in reader_stops] == ['Duomo']
    assert [(s['title'], s['is_published']) for s in author_stops] == [
        ('Duomo', True), ('Tiella di Gaeta', False),
    ]


def test_a_deleted_card_leaves_the_tour_without_that_stop(auth_client, places):
    tour_id = auth_client.post(
        '/api/itinerari/',
        payload([{'card': str(places['chiesa'].pk)}, {'card': str(places['tiella'].pk)}]),
    ).json()['id']

    places['tiella'].delete()

    assert Stop.objects.filter(itinerario_id=tour_id).count() == 1


# --- I2: only a percorso has a drawn path ---


def test_a_percorso_keeps_its_walked_path(auth_client, places):
    path = [{'lat': 41.21, 'lng': 13.57, 'label': ''}, {'lat': 41.212, 'lng': 13.575, 'label': ''}]

    data = auth_client.post(
        '/api/itinerari/', payload([{'card': str(places['chiesa'].pk)}], route=json.dumps(path))
    ).json()

    assert len(data['route']) == 2


def test_a_raccolta_has_no_path(auth_client, places):
    path = [{'lat': 41.21, 'lng': 13.57, 'label': ''}, {'lat': 41.212, 'lng': 13.575, 'label': ''}]
    tour_id = auth_client.post(
        '/api/itinerari/', payload([{'card': str(places['chiesa'].pk)}], route=json.dumps(path))
    ).json()['id']

    data = auth_client.patch(
        f'/api/itinerari/{tour_id}/', {'form': 'raccolta'}, format='multipart'
    ).json()

    assert data['form'] == 'raccolta'
    assert data['route'] == []


# --- reading ---


def test_a_draft_404s_for_a_reader(auth_client, places):
    tour_id = auth_client.post('/api/itinerari/', payload([])).json()['id']

    assert APIClient().get(f'/api/itinerari/{tour_id}/').status_code == 404
    assert auth_client.get(f'/api/itinerari/{tour_id}/').status_code == 200


def test_the_list_filters_by_intent_and_shows_only_published(auth_client, places):
    auth_client.post('/api/itinerari/', payload([], title='Città', is_published='true'))
    auth_client.post(
        '/api/itinerari/',
        payload([], title='Mare', intents=json.dumps(['mare']), form='raccolta', is_published='true'),
    )
    auth_client.post('/api/itinerari/', payload([], title='Bozza'))

    everything = [r['title'] for r in APIClient().get('/api/itinerari/').json()['results']]
    sea = [r['title'] for r in APIClient().get('/api/itinerari/?intento=mare').json()['results']]

    assert sorted(everything) == ['Città', 'Mare']
    assert sea == ['Mare']


def test_mine_lists_the_authors_drafts(auth_client, places):
    auth_client.post('/api/itinerari/', payload([], title='Bozza'))

    assert [r['title'] for r in auth_client.get('/api/itinerari/mine/').json()['results']] == ['Bozza']


def test_only_the_author_or_admin_can_edit(make_client, other_citizen, auth_client, places):
    tour_id = auth_client.post('/api/itinerari/', payload([])).json()['id']

    response = make_client(other_citizen).patch(
        f'/api/itinerari/{tour_id}/', {'title': 'Mio'}, format='multipart'
    )

    assert response.status_code == 403


def test_itineraries_are_not_a_map_layer(auth_client, places):
    """I11: a tour is not a place — the map's features are the places."""
    tour_id = auth_client.post(
        '/api/itinerari/',
        payload(
            [{'card': str(places['chiesa'].pk)}],
            route=json.dumps([{'lat': 41.21, 'lng': 13.57, 'label': ''}, {'lat': 41.22, 'lng': 13.58, 'label': ''}]),
            is_published='true',
        ),
    ).json()['id']

    ids = [entry['id'] for entry in APIClient().get('/api/map/features/').json()]

    assert tour_id not in ids


# --- translations (T5): the same walk in every language ---


def test_a_translation_shows_the_originals_stops_and_refuses_its_own(auth_client, places):
    tour_id = auth_client.post(
        '/api/itinerari/', payload([{'card': str(places['chiesa'].pk)}])
    ).json()['id']

    translation = auth_client.post(f'/api/itinerari/{tour_id}/traduci/', {'language': 'en'}).json()
    refused = auth_client.patch(
        f'/api/itinerari/{translation["id"]}/',
        {'stops': json.dumps([{'card': str(places['tiella'].pk)}])},
        format='multipart',
    )

    assert [s['title'] for s in translation['stops']] == ['Duomo']
    assert translation['intents'] == ['citta']
    assert refused.status_code == 400


def test_the_tour_model_reads_as_its_title():
    intent = Intent.objects.get(slug='mare')
    assert str(intent) == 'Andare al mare'
    assert Itinerario._meta.verbose_name_plural == 'itinerari'


# --- the list does not cost a query per tour ---


def test_the_list_costs_the_same_queries_for_one_tour_or_six(api_client, citizen, places):
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    def make_tour(n):
        card = _card(citizen, f'Giro {n}')
        tour = Itinerario.objects.create(card=card, form=Itinerario.PERCORSO)
        Stop.objects.create(itinerario=tour, position=0, card=places['chiesa'])
        MapFeature.objects.create(card=card, kind=MapFeature.ROUTE, position=0, lat=41.21, lng=13.57)

    def count():
        with CaptureQueriesContext(connection) as queries:
            assert api_client.get('/api/itinerari/').status_code == 200
        return len(queries)

    make_tour(0)
    one = count()
    for n in range(1, 6):
        make_tour(n)

    assert count() == one


def test_a_stop_whose_pin_was_removed_does_not_lock_the_tour(auth_client, places):
    stops = [{'card': str(places['tiella'].pk), 'point_index': 1}]
    tour_id = auth_client.post('/api/itinerari/', payload(stops)).json()['id']
    # The recipe's author removes the second bakery.
    MapFeature.objects.filter(card=places['tiella'], position=1).delete()

    stop = auth_client.get(f'/api/itinerari/{tour_id}/').json()['stops'][0]
    assert stop['point_index'] is None
    assert stop['point']['label'] == 'Forno A'

    # What the form sends back is what it was given; the save must go through.
    resend = [{'card': stop['card'], 'point_index': stop['point_index']}]
    response = auth_client.patch(
        f'/api/itinerari/{tour_id}/',
        {'title': 'Nuovo titolo', 'stops': json.dumps(resend)},
        format='multipart',
    )
    assert response.status_code == 200


# --- what a raccolta shows per stop (the itinerari canvas, decided 2026-09-19) ---


def test_the_intents_carry_their_line_for_the_landing_page(api_client):
    intents = {i['slug']: i for i in api_client.get('/api/itinerari/intenti/').json()}

    assert intents['mare']['description'] == 'Le spiagge, da Serapo a Sant’Agostino'


def test_a_stop_with_no_place_chosen_stands_for_every_place_its_card_has(auth_client, places):
    from luoghi.models import Genre, Luogo

    spiaggia = Luogo.objects.create(
        card=_card(places['chiesa'].author, 'Serapo'),
        genre=Genre.objects.get(slug='spiaggia'),
        how_to_get_there='A piedi dal centro, dieci minuti.',
    )
    MapFeature.objects.create(card=spiaggia.card, kind=MapFeature.POINT, position=0, lat=41.22, lng=13.56)
    stops = [
        {'card': str(places['tiella'].pk)},
        {'card': str(places['tiella'].pk), 'point_index': 1},
        {'card': str(places['festa'].pk)},
        {'card': str(spiaggia.card.pk)},
    ]

    data = auth_client.post('/api/itinerari/', payload(stops, form='raccolta')).json()['stops']

    assert [p['label'] for p in data[0]['places']] == ['Forno A', 'Forno B']
    assert [p['label'] for p in data[1]['places']] == ['Forno B']
    assert [p['label'] for p in data[2]['places']] == ['Scalzi']
    assert data[3]['how_to_get_there'] == 'A piedi dal centro, dieci minuti.'
    assert data[0]['how_to_get_there'] == ''
