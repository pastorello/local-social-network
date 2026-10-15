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
from content.models import Card, CardImage, MapFeature
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
        'is_published': True,
        'cover': None,
        'points': [{'lat': GAETA_LAT, 'lng': GAETA_LNG, 'label': 'Ingresso'}],
        'route': [],
        'genre': None,
        'access': None,
        # The map's default centre falls in the seeded draft of Porto Salvo.
        'zones': ['porto-salvo'],
    }]


def test_map_features_returns_a_feste_route_in_order(api_client, make_card):
    card = make_card(title='Processione di San Erasmo')
    Feste.objects.create(card=card)
    add_route(card, [(41.21, 13.56), (41.22, 13.57), (41.23, 13.58)])

    entry = api_client.get('/api/map/features/').json()[0]

    assert entry['type'] == 'feste'
    assert [point['lat'] for point in entry['route']] == [41.21, 41.22, 41.23]
    assert entry['points'] == []


def test_map_features_hides_drafts_from_an_anonymous_reader(api_client, make_card):
    card = make_card(is_published=False)
    Chiesa.objects.create(card=card)
    add_point(card)

    assert api_client.get('/api/map/features/').json() == []


# --- M5: drafts for whoever may already read them ---------------------------

def draft_with_a_pin(make_card, title='Bozza'):
    card = make_card(is_published=False, title=title)
    Chiesa.objects.create(card=card)
    add_point(card)
    return card


def test_an_author_sees_their_own_draft_marked_as_one(make_client, other_citizen, make_card):
    draft = draft_with_a_pin(make_card)

    entries = make_client(other_citizen).get('/api/map/features/').json()

    assert [(entry['id'], entry['is_published']) for entry in entries] == [(str(draft.id), False)]


def test_another_collaborator_does_not_see_someone_elses_draft(make_client, citizen, make_card):
    # The rule a draft's own page follows: it 404s for them, so the map must
    # not show them its title either.
    draft_with_a_pin(make_card)

    assert make_client(citizen).get('/api/map/features/').json() == []


def test_an_admin_sees_every_draft(make_client, admin, make_card):
    draft = draft_with_a_pin(make_card)

    entries = make_client(admin).get('/api/map/features/').json()

    assert [entry['id'] for entry in entries] == [str(draft.id)]


def test_a_draft_translation_stays_off_the_map_for_its_author_too(make_client, other_citizen, make_card):
    original = draft_with_a_pin(make_card, title='Chiesa')
    translation = make_card(is_published=False, title='Church', translation_of=original, language='en')
    Chiesa.objects.create(card=translation)

    entries = make_client(other_citizen).get('/api/map/features/').json()

    assert [entry['id'] for entry in entries] == [str(original.id)]


def test_a_draft_never_moves_a_zone_count_not_even_for_its_author(make_client, other_citizen, admin, make_card):
    draft_with_a_pin(make_card)

    for client in (make_client(other_citizen), make_client(admin)):
        counts = {zone['slug']: zone['count'] for zone in client.get('/api/map/zone/').json()}
        assert set(counts.values()) == {0}


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
    Termine.objects.create(card=termine, meaning='Ammuffito')

    assert api_client.get('/api/map/features/').json() == []


def test_map_features_carries_the_first_image_as_the_cover(api_client, make_card):
    # spec/design.md D5: the first image of a card is its cover — no new field,
    # no migration; the mobile sheet lists cards with it.
    card = make_card()
    Chiesa.objects.create(card=card)
    add_point(card)
    CardImage.objects.create(card=card, image=image_upload(name='seconda.jpg'), position=1)
    CardImage.objects.create(card=card, image=image_upload(name='prima.jpg'), position=0)

    entry = api_client.get('/api/map/features/').json()[0]

    assert entry['cover'] is not None
    assert entry['cover'].endswith(card.images.order_by('position').first().image.url)


def test_map_features_stays_one_query(api_client, make_card, django_assert_num_queries):
    # The map is the landing view: it must not scale its query count with the
    # number of cards on it. The cover prefetch is why `.first()` is not used
    # per card.
    for index in range(4):
        card = make_card(title=f'Chiesa {index}')
        Chiesa.objects.create(card=card)
        add_point(card)
        CardImage.objects.create(card=card, image=image_upload(), position=0)

    # The features, the image prefetch, and the zones — read once, not per card.
    with django_assert_num_queries(3):
        assert len(api_client.get('/api/map/features/').json()) == 4


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
            'position': 0, 'opacity': 0.6, 'color': '#0f5f73',
            'south': 41.20, 'west': 13.55, 'north': 41.23, 'east': 13.58,
        },
        files={'image': SimpleUploadedFile('exploit.png', b'<svg/>', content_type='image/png')},
    )

    assert not form.is_valid()
    assert 'image' in form.errors


# --- The author's own path: the boundaries and the scans (roadmap item 4) ---
#
# These were written after walking that path through Django admin with files
# shaped like the real ones, which is where each of them came from.

GAETA_QUARTIERE = {
    'type': 'FeatureCollection',
    'features': [{
        'type': 'Feature',
        'properties': {'name': 'Sant’Erasmo'},
        'geometry': {'type': 'Polygon', 'coordinates': [[
            [13.5720, 41.2100], [13.5760, 41.2100], [13.5760, 41.2140], [13.5720, 41.2100],
        ]]},
    }],
}


def noisy_jpeg_over(size):
    """A JPEG that will not compress below `size` — a stand-in for a scan."""
    import random

    random.seed(1)
    for side in (2600, 3200, 4000, 5000):
        image = Image.new('RGB', (side, side))
        image.putdata([
            (random.randrange(256), random.randrange(256), random.randrange(256))
            for _ in range(side * side // 400)
        ] * 400)
        buffer = BytesIO()
        image.save(buffer, format='JPEG', quality=100, subsampling=0)
        if buffer.tell() > size:
            return buffer.getvalue()
    raise AssertionError('could not build a JPEG over the cap')


def swap(geojson):
    """The same file with latitude first — the mistake this is all about."""
    ring = geojson['features'][0]['geometry']['coordinates'][0]
    swapped = json.loads(json.dumps(geojson))
    swapped['features'][0]['geometry']['coordinates'] = [[[p[1], p[0]] for p in ring]]
    return swapped


def test_a_boundary_file_for_gaeta_is_accepted():
    Overlay(name='Quartieri', kind=Overlay.VECTOR, geojson=GAETA_QUARTIERE).full_clean()


def test_a_swapped_boundary_file_is_refused_and_says_why():
    with pytest.raises(ValidationError) as excinfo:
        Overlay(
            name='Quartieri', kind=Overlay.VECTOR, geojson=swap(GAETA_QUARTIERE)
        ).full_clean()

    message = ' '.join(excinfo.value.message_dict['geojson'])
    # The message has to name the order, because the file is not "invalid" in
    # any way the author can see — it saved happily until this check existed,
    # and the only symptom was a layer that drew nothing.
    assert '[longitudine, latitudine]' in message


def test_a_multipolygon_is_read_too():
    """A real municipal export splits an area cut by a road or a bay."""
    geojson = json.loads(json.dumps(GAETA_QUARTIERE))
    ring = geojson['features'][0]['geometry']['coordinates']
    geojson['features'][0]['geometry'] = {'type': 'MultiPolygon', 'coordinates': [ring, ring]}
    Overlay(name='Serapo', kind=Overlay.VECTOR, geojson=geojson).full_clean()

    geojson['features'][0]['geometry']['coordinates'] = [
        [[[p[1], p[0]] for p in ring[0]]], ring,
    ]
    with pytest.raises(ValidationError):
        Overlay(name='Serapo', kind=Overlay.VECTOR, geojson=geojson).full_clean()


def test_the_too_big_message_says_the_limit_and_what_to_do():
    huge = {'type': 'Polygon', 'coordinates': [[[13.561234, 41.211234]] * 90_000]}

    with pytest.raises(ValidationError) as excinfo:
        Overlay(name='Quartieri', kind=Overlay.VECTOR, geojson=huge).full_clean()

    message = ' '.join(excinfo.value.message_dict['geojson'])
    assert '2 MB' in message and 'Semplifica' in message


def test_an_oversized_scan_is_refused_once_not_twice():
    """The second message used to be false, and pointed somewhere else.

    A rejected upload never reaches `cleaned_data`, so the model's own check
    saw an empty image field and added "una sovrapposizione raster ha bisogno
    di un’immagine" underneath the real reason — telling the author to attach
    the file he had just attached.
    """
    from maps.admin import OverlayAdminForm

    # A *real* JPEG over the cap, not random bytes: with those, Django's own
    # "not a valid image" fires first and the case under test never happens —
    # which is how the first version of this test passed for the wrong reason.
    oversized = SimpleUploadedFile(
        'scan-1820.jpg', noisy_jpeg_over(5 * 1024 * 1024), content_type='image/jpeg'
    )
    form = OverlayAdminForm(
        data={
            'name': 'Gaeta 1820', 'kind': Overlay.RASTER, 'visibility': Overlay.PUBLIC,
            'position': 0, 'opacity': 0.6, 'color': '#0f5f73',
            'south': 41.20, 'west': 13.55, 'north': 41.23, 'east': 13.58,
        },
        files={'image': oversized},
    )

    assert not form.is_valid()
    assert len(form.errors['image']) == 1
    assert '5 MB' in form.errors['image'][0]

