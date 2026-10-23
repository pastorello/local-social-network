"""Editorial zones (spec cosa-fare.md Part −1, D2): drawn once, a card in a zone
by where it is, never by a choice; a zone counts the places a reader can go
to (D3)."""

import json

import pytest
from django.core.exceptions import ValidationError
from django.db import connection
from django.test.utils import CaptureQueriesContext

from chiese.models import Chiesa
from content.models import Card, MapFeature
from feste.models import Feste
from itinerari.models import Itinerario, Stop
from luoghi.models import Genre, Luogo
from maps.models import Zona
from maps.zones import geometry_contains
from ricette.models import Ricetta

pytestmark = pytest.mark.django_db

# A point inside each zone, from OpenStreetMap's nodes and beaches, in the
# zones' own order (0005's six, then the two 0006 added).
INSIDE = {
    'gaeta-medievale': (41.2085529, 13.5865835),
    'serapo': (41.2119628, 13.5637889),
    'monte-orlando': (41.2070426, 13.5767251),
    'montagna-spaccata': (41.2047639, 13.5702449),
    'porto-salvo': (41.2304464, 13.566365),
    'piana-di-sant-agostino': (41.2337326, 13.4946062),
    'ariana': (41.2132, 13.5418),
    'arenauta': (41.2190, 13.5315),
}
# Monte Lauro, on the hills inside the comune: no zone reaches it.
NOWHERE = (41.2484, 13.5426)


def _card(author, title, is_published=True, **extra):
    return Card.objects.create(title=title, body_html='<p>Testo.</p>', author=author, is_published=is_published, **extra)


def _pin(card, lat, lng):
    MapFeature.objects.create(card=card, kind=MapFeature.POINT, position=0, lat=lat, lng=lng)


def _chiesa(author, title, where, **extra):
    card = _card(author, title, **extra)
    Chiesa.objects.create(card=card)
    _pin(card, *where)
    return card


# --- the geometry ---


SQUARE = [[13.0, 41.0], [14.0, 41.0], [14.0, 42.0], [13.0, 42.0], [13.0, 41.0]]
HOLE = [[13.4, 41.4], [13.6, 41.4], [13.6, 41.6], [13.4, 41.6], [13.4, 41.4]]


def test_a_polygon_holds_what_is_inside_and_not_its_hole():
    polygon = {'type': 'Polygon', 'coordinates': [SQUARE, HOLE]}

    assert geometry_contains(polygon, 41.2, 13.2)
    assert not geometry_contains(polygon, 41.5, 13.5)  # in the hole
    assert not geometry_contains(polygon, 40.5, 13.5)  # outside


def test_a_multipolygon_holds_what_any_of_its_parts_does():
    far = [[c[0] + 2, c[1]] for c in SQUARE]
    multi = {'type': 'MultiPolygon', 'coordinates': [[SQUARE], [far]]}

    assert geometry_contains(multi, 41.5, 15.5)
    assert not geometry_contains(multi, 41.5, 14.5)


# --- the seeded zones ---


def test_the_eight_zones_are_seeded_and_each_holds_its_own_place():
    zones = list(Zona.objects.all())

    assert [zone.slug for zone in zones] == list(INSIDE)
    for zone in zones:
        holding = [slug for slug, (lat, lng) in INSIDE.items() if geometry_contains(zone.geometry, lat, lng)]
        assert holding == [zone.slug], zone.slug
        zone.full_clean()


# --- the admin's write path ---


@pytest.mark.parametrize('geometry, message', [
    ({'type': 'Feature', 'geometry': {'type': 'Polygon', 'coordinates': [SQUARE]}}, 'Polygon'),
    ({'type': 'Polygon', 'coordinates': [[[13.5, 41.2], [13.6, 41.2], [13.5, 41.2]]]}, 'quattro punti'),
    ({'type': 'Polygon', 'coordinates': [[[41.2, 13.5], [41.3, 13.5], [41.3, 13.6], [41.2, 13.5]]]}, 'longitudine'),
])
def test_a_zone_refuses_a_shape_that_is_not_one_outline_of_this_town(geometry, message):
    zone = Zona(slug='prova', name='Prova', geometry=geometry)

    with pytest.raises(ValidationError) as caught:
        zone.full_clean()

    assert message in str(caught.value)


# --- membership on the map's payload ---


def test_a_place_is_in_the_zone_its_pin_is_in(api_client, citizen):
    _chiesa(citizen, 'Duomo', INSIDE['gaeta-medievale'])
    _chiesa(citizen, 'Altrove', NOWHERE)

    zones = {entry['title']: entry['zones'] for entry in api_client.get('/api/map/features/').json()}

    assert zones == {'Duomo': ['gaeta-medievale'], 'Altrove': []}


def test_a_festa_is_in_every_zone_its_procession_stops_in(api_client, citizen):
    card = _card(citizen, 'Porto Salvo')
    Feste.objects.create(card=card)
    for position, where in enumerate((INSIDE['porto-salvo'], INSIDE['serapo'])):
        MapFeature.objects.create(card=card, kind=MapFeature.ROUTE, position=position, lat=where[0], lng=where[1])

    entry = api_client.get('/api/map/features/').json()[0]

    assert entry['zones'] == ['serapo', 'porto-salvo']


# --- membership on a place's own card (review PR-3, «Dove si trova») ---


def test_a_church_names_the_zone_its_pin_is_in(api_client, citizen):
    duomo = _chiesa(citizen, 'Duomo', INSIDE['gaeta-medievale'])
    altrove = _chiesa(citizen, 'Altrove', NOWHERE)

    assert api_client.get(f'/api/chiese/{duomo.pk}/').json()['zones'] == [
        {'slug': 'gaeta-medievale', 'name': 'Gaeta Medievale'},
    ]
    assert api_client.get(f'/api/chiese/{altrove.pk}/').json()['zones'] == []


def test_a_place_names_the_zone_its_pin_is_in(api_client, citizen):
    card = _card(citizen, 'Spiaggia di Serapo')
    Luogo.objects.create(card=card, genre=Genre.objects.get(slug='spiaggia'))
    _pin(card, *INSIDE['serapo'])

    assert api_client.get(f'/api/luoghi/{card.pk}/').json()['zones'] == [{'slug': 'serapo', 'name': 'Serapo'}]


def test_a_festa_names_the_zones_its_procession_stops_in(api_client, citizen):
    # The eyebrow over its page (review PR-23) links each zone to «Cosa fare»,
    # so a festa carries them named, like a place; by vertex, as on the map.
    card = _card(citizen, 'Porto Salvo')
    Feste.objects.create(card=card)
    for position, where in enumerate((INSIDE['porto-salvo'], NOWHERE, INSIDE['serapo'])):
        MapFeature.objects.create(card=card, kind=MapFeature.ROUTE, position=position, lat=where[0], lng=where[1])
    english = _card(citizen, 'Porto Salvo (EN)', translation_of=card, language='en')
    Feste.objects.create(card=english)

    assert api_client.get(f'/api/feste/{card.pk}/').json()['zones'] == [
        {'slug': 'serapo', 'name': 'Serapo'},
        {'slug': 'porto-salvo', 'name': 'Porto Salvo'},
    ]
    # A translation walks its original's route (T5).
    assert [z['slug'] for z in api_client.get(f'/api/feste/{english.pk}/').json()['zones']] == [
        'serapo', 'porto-salvo',
    ]


def test_a_festa_without_a_route_is_in_no_zone(api_client, citizen):
    card = _card(citizen, 'Senza percorso')
    Feste.objects.create(card=card)

    assert api_client.get(f'/api/feste/{card.pk}/').json()['zones'] == []


def test_a_translation_is_in_its_originals_zone(api_client, citizen):
    # It has no pin of its own (T5): it stands where the original stands.
    original = _chiesa(citizen, 'Annunziata', INSIDE['gaeta-medievale'])
    english = _card(citizen, 'Annunziata (EN)', translation_of=original, language='en')
    Chiesa.objects.create(card=english)

    assert [z['slug'] for z in api_client.get(f'/api/chiese/{english.pk}/').json()['zones']] == ['gaeta-medievale']


def test_the_church_list_reads_the_zones_once(api_client, citizen):
    for index in range(4):
        _chiesa(citizen, f'Chiesa {index}', INSIDE['serapo'])
    with CaptureQueriesContext(connection) as queries:
        rows = api_client.get('/api/chiese/').json()['results']

    assert [[z['slug'] for z in row['zones']] for row in rows] == [['serapo']] * 4
    assert sum(Zona._meta.db_table in query['sql'] for query in queries.captured_queries) == 1


# --- the zone list ---


def test_a_zone_counts_published_places_only(api_client, citizen):
    _chiesa(citizen, 'Duomo', INSIDE['gaeta-medievale'])
    _chiesa(citizen, 'In bozza', INSIDE['gaeta-medievale'], is_published=False)
    original = _chiesa(citizen, 'Annunziata', INSIDE['gaeta-medievale'])
    _chiesa(citizen, 'Annunziata (EN)', INSIDE['gaeta-medievale'], translation_of=original, language='en')
    luogo = _card(citizen, 'Serapo')
    Luogo.objects.create(card=luogo, genre=Genre.objects.get(slug='spiaggia'))
    _pin(luogo, *INSIDE['serapo'])
    # A dish is not a door (D3): a ricetta's pin is a shop, and it is not counted.
    tiella = _card(citizen, 'Tiella')
    Ricetta.objects.create(card=tiella)
    _pin(tiella, *INSIDE['serapo'])

    body = api_client.get('/api/map/zone/').json()
    counts = {zone['slug']: zone['count'] for zone in body}

    assert counts == {
        'gaeta-medievale': 2, 'serapo': 1, 'monte-orlando': 0,
        'montagna-spaccata': 0, 'porto-salvo': 0, 'piana-di-sant-agostino': 0,
        'ariana': 0, 'arenauta': 0,
    }
    assert body[0]['name'] == 'Gaeta Medievale'
    assert body[0]['geometry']['type'] == 'Polygon'


# --- tours ---


def _tour(author, form, stops):
    tour = Itinerario.objects.create(card=_card(author, f'Giro {form}'), form=form)
    for position, card in enumerate(stops):
        Stop.objects.create(itinerario=tour, card=card, position=position)
    return tour


def test_a_percorso_is_in_the_zone_where_it_starts(api_client, citizen):
    tour = _tour(citizen, Itinerario.PERCORSO, [
        _chiesa(citizen, 'Prima', INSIDE['serapo']),
        _chiesa(citizen, 'Seconda', INSIDE['gaeta-medievale']),
    ])

    assert api_client.get(f'/api/itinerari/{tour.pk}/').json()['zones'] == ['serapo']


def test_a_raccolta_is_wherever_any_of_its_published_stops_is(api_client, citizen):
    tour = _tour(citizen, Itinerario.RACCOLTA, [
        _chiesa(citizen, 'Una', INSIDE['serapo']),
        _chiesa(citizen, 'Due', INSIDE['gaeta-medievale']),
        _chiesa(citizen, 'In bozza', INSIDE['porto-salvo'], is_published=False),
    ])

    zones = api_client.get(f'/api/itinerari/{tour.pk}/').json()['zones']

    assert zones == ['gaeta-medievale', 'serapo']


def test_the_tour_list_reads_the_zones_once(api_client, citizen, django_assert_max_num_queries):
    for index in range(4):
        _tour(citizen, Itinerario.PERCORSO, [_chiesa(citizen, f'Tappa {index}', INSIDE['serapo'])])

    with django_assert_max_num_queries(12):
        rows = api_client.get('/api/itinerari/').json()['results']

    assert [row['zones'] for row in rows] == [['serapo']] * 4
    assert json.dumps(rows)  # serializable as it stands


# --- what the page files a place by (D3/D4, ADR-0008) ---


def test_a_feature_carries_its_genre_and_a_known_access_only(api_client, citizen):
    from content.models import Availability

    serapo = _card(citizen, 'Spiaggia di Serapo')
    Luogo.objects.create(card=serapo, genre=Genre.objects.get(slug='spiaggia'))
    _pin(serapo, *INSIDE['serapo'])
    duomo = _chiesa(citizen, 'Duomo', INSIDE['gaeta-medievale'])
    Availability.objects.create(card=duomo, state=Availability.SERVICES, hours='Domenica alle 11.')
    _chiesa(citizen, 'Senza niente', INSIDE['gaeta-medievale'])

    entries = {e['title']: e for e in api_client.get('/api/map/features/').json()}

    assert (entries['Spiaggia di Serapo']['genre'], entries['Spiaggia di Serapo']['access']) == ('spiaggia', None)
    assert (entries['Duomo']['genre'], entries['Duomo']['access']) == (None, 'services')
    # Unknown is not sent as a state: absence and "we do not know" are one thing.
    assert entries['Senza niente']['access'] is None
    # The hours are never on the map's payload: they belong with their date.
    assert 'hours' not in entries['Duomo']
