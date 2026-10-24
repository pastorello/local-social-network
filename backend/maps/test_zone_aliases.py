"""«Dove sei?» (review of 2026-10-22, decision 3; spec cosa-fare.md Part −1,
D6): the names a guest uses for where they stand, each with the zone it is in.
The names are data, so these tests are about the data being right — a name in
the wrong zone sends a guest to the wrong side of town."""

import importlib

import pytest
from django.apps import apps
from django.db.models import ProtectedError

from maps.models import Zona, ZonaAlias
from maps.zones import geometry_contains

pytestmark = pytest.mark.django_db

seeded = importlib.import_module('maps.migrations.0008_seed_zone_aliases')
# The two names 0008 left to the author, decided on 2026-10-24.
decided = importlib.import_module('maps.migrations.0009_seed_porto_and_molo')
NAMES = [name for name, _ in seeded.ALIASES] + [name for name, _, _ in decided.ALIASES]

# Where each seeded name is, as OpenStreetMap has it (Nominatim, one lookup per
# name, 2026-10-24): a node, or the centre of the outline or the street the
# name is for. © OpenStreetMap contributors, ODbL 1.0.
WHERE = {
    'i 300 gradini': (41.2234090, 13.5246074),  # the steps, way 1288338939
    'Arenauta': (41.2228369, 13.5241738),  # the beach, way 67401491
    'Ariana': (41.2132201, 13.5427281),  # the beach, way 67398641
    'il Borgo': (41.2240234, 13.5684817),  # Vico 1 Borgo Vecchio, node 8795873417
    'il castello': (41.2075170, 13.5845538),  # Castello Angioino-Aragonese, node 7976652885
    'la Cattedrale': (41.2089371, 13.5868749),  # way 220099304
    'Corso Cavour': (41.2143078, 13.5670372),  # way 332924858
    'il Duomo': (41.2089602, 13.5870904),  # its campanile, way 220099305
    'Fontania': (41.2084864, 13.5527468),  # the beach, way 67405739
    'la Grotta del Turco': (41.2048523, 13.5714093),  # node 1271857086
    'il mausoleo di Planco': (41.2070458, 13.5773248),  # way 72592353
    'la Montagna Spaccata': (41.2047639, 13.5702449),  # node 4924644901
    'Monte Orlando': (41.2070926, 13.5767251),  # the summit, node 4924653002
    'Piazza Commestibili': (41.2088736, 13.5843132),  # way 231984355
    'Piazza Traniello': (41.2092401, 13.5845088),  # way 189574777
    'Piazza XIX Maggio': (41.2132759, 13.5726401),  # the gardens, way 157539641
    'i Quaranta Remi': (41.2108989, 13.5444895),  # the beach, way 67405737
    'San Vito': (41.2246812, 13.5118547),  # the beach, way 67404742
    "Sant'Agostino": (41.2311990, 13.4964416),  # the beach, way 67404749
    'la Santissima Annunziata': (41.2119541, 13.5813461),  # way 454852274
    'il Santuario della Trinità': (41.2053337, 13.5706024),  # way 111681084
    'Serapo': (41.2095070, 13.5683383),  # the beach's access no. 3, way 430057602
    'il Tempio di San Francesco': (41.2108487, 13.5809506),  # way 454852270
    'Via Indipendenza': (41.2236472, 13.5686683),  # way 333224954
    'Villa delle Sirene': (41.2207848, 13.5696561),  # way 333224959
    # Decided by the author on 2026-10-24 (0009), placed the same way.
    'il molo': (41.2094723, 13.5878922),  # the pier of the harbour of Santa Maria, way 1382988502
    'il porto': (41.2165218, 13.5729608),  # Porto di Gaeta, the marina, node 8922784305
}


def _zones_holding(lat, lng):
    return {zone.slug for zone in Zona.objects.all() if geometry_contains(zone.geometry, lat, lng)}


# --- the data ---


def test_every_name_is_seeded_and_points_at_a_zone_that_exists():
    slugs = set(Zona.objects.values_list('slug', flat=True))

    aliases = list(ZonaAlias.objects.select_related('zona'))

    assert sorted(alias.name for alias in aliases) == sorted(NAMES)
    for alias in aliases:
        assert alias.zona.slug in slugs, alias.name


def test_every_name_lies_in_the_zone_it_points_at_and_in_no_other():
    # The review's own examples first: «castello» shows Gaeta Medievale, and
    # Piazza XIX Maggio — where three zones meet — Porto Salvo, as D2 says.
    assert ZonaAlias.objects.get(name='il castello').zona.slug == 'gaeta-medievale'
    assert ZonaAlias.objects.get(name='Piazza XIX Maggio').zona.slug == 'porto-salvo'
    assert ZonaAlias.objects.get(name='Serapo').zona.slug == 'serapo'

    assert set(WHERE) == set(NAMES)
    for alias in ZonaAlias.objects.select_related('zona'):
        assert _zones_holding(*WHERE[alias.name]) == {alias.zona.slug}, alias.name


def test_a_name_that_runs_along_two_zones_is_not_seeded():
    # «il lungomare Caboto» runs from the Annunziata to Formia, and Via Firenze
    # is Serapo's border. Either would send half the guests who type it to the
    # wrong zone, so it is left out — decided by the author on 2026-10-24: a
    # guest there chooses from the chips.
    lungomare = _zones_holding(41.2397803, 13.5724349) | _zones_holding(41.2132372, 13.5767311)
    via_firenze = set().union(*(
        _zones_holding(lat, lng)
        for lng, lat in ([13.5731592, 41.2131089], [13.5720278, 41.2123936],
                         [13.571453, 41.2114914], [13.5713826, 41.2106588])
    ))
    assert lungomare == {'porto-salvo', 'gaeta-medievale'}
    assert via_firenze == {'porto-salvo', 'serapo'}

    names = {name.lower() for name in NAMES}
    assert not names & {'il lungomare caboto', 'lungomare caboto', 'via firenze'}


def test_the_port_and_the_pier_go_where_the_author_decided():
    # Gaeta has two harbours, in two zones — the marina on Lungomare Caboto and
    # the harbour of Santa Maria — which is why 0008 left «il porto» and «il
    # molo» out. The author decided on 2026-10-24: «il porto» is the marina,
    # in Porto Salvo; «il molo» is Santa Maria's pier, in Gaeta Medievale.
    two_harbours = _zones_holding(41.2165218, 13.5729608) | _zones_holding(41.2093986, 13.5878467)
    assert two_harbours == {'porto-salvo', 'gaeta-medievale'}

    assert ZonaAlias.objects.get(name='il porto').zona.slug == 'porto-salvo'
    assert ZonaAlias.objects.get(name='il molo').zona.slug == 'gaeta-medievale'
    # Between 0008's names, in their alphabetical order.
    order = list(ZonaAlias.objects.order_by('position').values_list('name', flat=True))
    assert order.index('il mausoleo di Planco') < order.index('il molo') < order.index('la Montagna Spaccata')
    assert order.index('Piazza XIX Maggio') < order.index('il porto') < order.index('i Quaranta Remi')


def test_the_decision_leaves_a_name_the_author_already_set():
    ZonaAlias.objects.filter(name__in=['il porto', 'il molo']).delete()
    ZonaAlias.objects.create(name='il porto', zona=Zona.objects.get(slug='gaeta-medievale'), position=7)

    decided.seed(apps, None)

    porto = ZonaAlias.objects.get(name='il porto')
    assert (porto.zona.slug, porto.position) == ('gaeta-medievale', 7)
    assert ZonaAlias.objects.get(name='il molo').zona.slug == 'gaeta-medievale'


def test_the_reverse_takes_back_only_what_it_seeded():
    moved = ZonaAlias.objects.get(name='Corso Cavour')
    moved.zona = Zona.objects.get(slug='serapo')
    moved.save()
    ZonaAlias.objects.create(name='la Villa Comunale', zona=Zona.objects.get(slug='porto-salvo'))

    seeded.unseed(apps, None)

    # 0009's names are not 0008's to take back.
    assert sorted(ZonaAlias.objects.values_list('name', flat=True)) == [
        'Corso Cavour', 'il molo', 'il porto', 'la Villa Comunale',
    ]


def test_the_decisions_reverse_takes_back_only_what_it_seeded():
    moved = ZonaAlias.objects.get(name='il porto')
    moved.zona = Zona.objects.get(slug='gaeta-medievale')
    moved.save()

    decided.unseed(apps, None)

    assert ZonaAlias.objects.filter(name='il porto').exists()
    assert not ZonaAlias.objects.filter(name='il molo').exists()


def test_a_zone_with_names_cannot_be_deleted_from_under_them():
    with pytest.raises(ProtectedError):
        Zona.objects.get(slug='gaeta-medievale').delete()


# --- the endpoint ---


def test_anyone_reads_the_names_with_their_zone_in_the_authors_order(api_client):
    ZonaAlias.objects.filter(name='Serapo').update(position=1)

    response = api_client.get('/api/map/zone/alias/')

    assert response.status_code == 200
    body = response.json()
    assert body[0] == {'name': 'Serapo', 'zone': 'serapo'}
    assert {'name': 'il castello', 'zone': 'gaeta-medievale'} in body
    assert len(body) == len(NAMES)
    # Unpaginated, and nothing else in a row: no geometry, no id.
    assert all(set(row) == {'name', 'zone'} for row in body)


def test_the_names_cost_one_query(api_client, django_assert_num_queries):
    with django_assert_num_queries(1):
        api_client.get('/api/map/zone/alias/')
