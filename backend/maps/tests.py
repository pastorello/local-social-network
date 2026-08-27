"""Spec map.md (M2/M3/M4) and politics.md — the overlay visibility gate.

The tests that matter most here are the negative ones: a reader who is not in
the steering tier must not see a steering overlay, and no response may leak
that such a tier exists.
"""

import json
from io import BytesIO

import pytest
from PIL import Image
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from chiese.models import Chiesa
from content.models import Card, MapFeature
from dialetto.models import Termine
from feste.models import Feste
from maps.models import Overlay

pytestmark = pytest.mark.django_db

GAETA_LAT = 41.2172608
GAETA_LNG = 13.5625165

QUARTIERI_GEOJSON = {
    'type': 'FeatureCollection',
    'features': [{
        'type': 'Feature',
        'properties': {'name': 'Sant’Erasmo'},
        'geometry': {'type': 'Polygon', 'coordinates': [[[13.56, 41.21], [13.57, 41.21], [13.57, 41.22], [13.56, 41.21]]]},
    }],
}


@pytest.fixture
def steering(citizen):
    citizen.is_steering = True
    citizen.save(update_fields=('is_steering',))
    return citizen


@pytest.fixture
def make_card(other_citizen):
    def _make(is_published=True, title='Scheda', translation_of=None, language='it'):
        return Card.objects.create(
            title=title, body_html='<p>Testo.</p>', author=other_citizen,
            is_published=is_published, translation_of=translation_of, language=language,
        )

    return _make


def add_point(card, lat=GAETA_LAT, lng=GAETA_LNG, label='', position=0):
    return MapFeature.objects.create(
        card=card, kind=MapFeature.POINT, lat=lat, lng=lng, label=label, position=position
    )


def add_route(card, points):
    for position, (lat, lng) in enumerate(points):
        MapFeature.objects.create(
            card=card, kind=MapFeature.ROUTE, lat=lat, lng=lng, position=position
        )


def make_overlay(**overrides):
    payload = {
        'name': 'Quartieri', 'kind': Overlay.VECTOR,
        'visibility': Overlay.PUBLIC, 'geojson': QUARTIERI_GEOJSON,
    }
    payload.update(overrides)
    return Overlay.objects.create(**payload)


def image_upload(fmt='JPEG', name='mappa1820.jpg'):
    buffer = BytesIO()
    Image.new('RGB', (40, 40), 'sienna').save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


# --- M2: the layers ---------------------------------------------------------

def test_map_features_is_public_and_groups_points_by_card(api_client, make_card):
    card = make_card(title='Chiesa di Sant’Erasmo')
    Chiesa.objects.create(card=card)
    add_point(card, label='Ingresso')

    response = api_client.get('/api/map/features/')

    assert response.status_code == 200
    assert response.json() == [{
        'id': str(card.id), 'type': 'chiese', 'title': 'Chiesa di Sant’Erasmo',
        'points': [{'lat': GAETA_LAT, 'lng': GAETA_LNG, 'label': 'Ingresso'}],
        'route': [],
    }]


def test_map_features_returns_a_feste_route_in_order(api_client, make_card):
    card = make_card(title='Processione di San Erasmo')
    Feste.objects.create(card=card)
    add_route(card, [(41.21, 13.56), (41.22, 13.57), (41.23, 13.58)])

    entry = api_client.get('/api/map/features/').json()[0]

    assert entry['type'] == 'feste'
    assert [point['lat'] for point in entry['route']] == [41.21, 41.22, 41.23]
    assert entry['points'] == []


def test_map_features_hides_drafts(api_client, make_card):
    card = make_card(is_published=False)
    Chiesa.objects.create(card=card)
    add_point(card)

    assert api_client.get('/api/map/features/').json() == []


def test_map_features_hides_translations(api_client, make_card):
    original = make_card(title='Chiesa')
    Chiesa.objects.create(card=original)
    add_point(original)

    translation = make_card(title='Church', translation_of=original, language='en')
    Chiesa.objects.create(card=translation)
    add_point(translation)

    entries = api_client.get('/api/map/features/').json()

    # One pin per place, not one per language (C4 left the language choice
    # inside the card).
    assert [entry['id'] for entry in entries] == [str(original.id)]


def test_map_features_skips_a_card_with_no_type_row(api_client, make_card):
    # A dialetto term has no map footprint at all, and a bare Card should not
    # reach the map either — neither has a type key the SPA could route to.
    bare = make_card()
    add_point(bare)
    termine = make_card()
    Termine.objects.create(card=termine, term='Muffato', meaning='Ammuffito')

    assert api_client.get('/api/map/features/').json() == []


# --- M3/M4: the overlays and the gate ---------------------------------------

def test_anonymous_reader_sees_only_public_overlays(api_client):
    make_overlay(name='Quartieri', visibility=Overlay.PUBLIC)
    make_overlay(name='Interna', visibility=Overlay.COLLABORATORS)
    make_overlay(name='Seggi elettorali', visibility=Overlay.STEERING)

    body = api_client.get('/api/map/overlays/').json()

    assert [overlay['name'] for overlay in body] == ['Quartieri']


def test_collaborator_sees_internal_overlays_but_not_the_seggi(make_client, citizen):
    make_overlay(name='Quartieri', visibility=Overlay.PUBLIC, position=0)
    make_overlay(name='Interna', visibility=Overlay.COLLABORATORS, position=1)
    make_overlay(name='Seggi elettorali', visibility=Overlay.STEERING, position=2)

    body = make_client(citizen).get('/api/map/overlays/').json()

    assert [overlay['name'] for overlay in body] == ['Quartieri', 'Interna']


def test_steering_member_sees_the_seggi_overlay(make_client, steering):
    make_overlay(name='Seggi elettorali', visibility=Overlay.STEERING)

    body = make_client(steering).get('/api/map/overlays/').json()

    assert [overlay['name'] for overlay in body] == ['Seggi elettorali']


def test_admin_sees_every_overlay(make_client, admin):
    make_overlay(name='Quartieri', visibility=Overlay.PUBLIC, position=0)
    make_overlay(name='Seggi elettorali', visibility=Overlay.STEERING, position=1)

    body = make_client(admin).get('/api/map/overlays/').json()

    assert [overlay['name'] for overlay in body] == ['Quartieri', 'Seggi elettorali']


def test_the_payload_never_mentions_visibility(make_client, steering):
    make_overlay(name='Seggi elettorali', visibility=Overlay.STEERING)

    body = json.dumps(make_client(steering).get('/api/map/overlays/').json())

    # Confidentiality is enforced by omission (spec politics.md): a reader who
    # is not in the tier must not even learn the vocabulary.
    assert 'visibility' not in body
    assert Overlay.STEERING not in body


def test_a_new_overlay_is_confidential_until_an_admin_says_otherwise():
    # M4: making a layer public is one explicit decision, never a side effect
    # of creating it.
    assert Overlay(name='Nuova').visibility == Overlay.STEERING


def test_a_promoted_user_loses_nothing(make_client, citizen):
    # The gate reads the database on every request, not a claim from the
    # client: flipping the flag is enough to change what the same account sees.
    make_overlay(name='Seggi elettorali', visibility=Overlay.STEERING)
    client = make_client(citizen)
    assert client.get('/api/map/overlays/').json() == []

    citizen.is_steering = True
    citizen.save(update_fields=('is_steering',))

    assert len(client.get('/api/map/overlays/').json()) == 1


def test_raster_overlay_serializes_bounds_and_url(api_client):
    overlay = Overlay.objects.create(
        name='Gaeta 1820', kind=Overlay.RASTER, visibility=Overlay.PUBLIC,
        image=image_upload(), south=41.20, west=13.55, north=41.23, east=13.58, opacity=0.5,
    )

    body = api_client.get('/api/map/overlays/').json()[0]

    assert body['kind'] == 'raster'
    assert body['bounds'] == [[41.20, 13.55], [41.23, 13.58]]
    assert body['imageURL'].endswith(overlay.image.url)
    assert body['opacity'] == 0.5


# --- model validation (the admin is the write path) -------------------------

def test_vector_overlay_requires_valid_geojson():
    with pytest.raises(ValidationError) as excinfo:
        Overlay(name='Quartieri', kind=Overlay.VECTOR, geojson={'type': 'Nonsense'}).full_clean()

    assert 'geojson' in excinfo.value.message_dict


def test_raster_overlay_requires_image_and_coherent_bounds():
    with pytest.raises(ValidationError) as excinfo:
        Overlay(
            name='Gaeta 1600', kind=Overlay.RASTER, image=image_upload(),
            south=41.23, west=13.55, north=41.20, east=13.58,
        ).full_clean()

    assert 'south' in excinfo.value.message_dict


def test_opacity_must_be_a_fraction():
    with pytest.raises(ValidationError) as excinfo:
        Overlay(
            name='Quartieri', kind=Overlay.VECTOR, geojson=QUARTIERI_GEOJSON, opacity=4,
        ).full_clean()

    assert 'opacity' in excinfo.value.message_dict


def test_admin_form_rejects_a_non_image_upload():
    from maps.admin import OverlayAdminForm

    form = OverlayAdminForm(
        data={
            'name': 'Gaeta 1820', 'kind': Overlay.RASTER, 'visibility': Overlay.PUBLIC,
            'position': 0, 'opacity': 0.6, 'color': '#7c3aed',
            'south': 41.20, 'west': 13.55, 'north': 41.23, 'east': 13.58,
        },
        files={'image': SimpleUploadedFile('exploit.png', b'<svg/>', content_type='image/png')},
    )

    assert not form.is_valid()
    assert 'image' in form.errors
