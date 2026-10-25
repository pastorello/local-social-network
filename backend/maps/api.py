from django.db.models import Q
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.models import User
from content.models import MapFeature

from .models import Overlay, Zona, ZonaAlias
from .serializers import OverlaySerializer
from .zones import zones_containing_any, zones_of_feature

# The map's layers. Reverse OneToOne accessor -> the key the SPA uses for the
# layer and for the card's own route (`/chiese/<id>`). dialetto and libri are
# absent on purpose: the spec's footprint table gives them none, so they never
# reach this endpoint.
CARD_TYPES = ('feste', 'chiese', 'ricette', 'personaggi', 'luoghi', 'attivita')

# The types a tour's stop may be (spec itinerari.md I3) — a second list, not
# CARD_TYPES again: until 2026-10-25 the map's layers *were* the definition of
# a stop, the trap cosa-fare.md I3 named, where the one line that puts a type
# on the map makes it a legal stop. Every layer but the businesses: a tour
# that picked one bar among many would be the ranking CF40 forbids, and the
# archive shows them all instead (ADR-0010).
STOP_TYPES = ('feste', 'chiese', 'ricette', 'personaggi', 'luoghi')

# The rows of «Cosa si può fare qui» (spec cosa-fare.md Part −1, D3): the places
# one goes to. A zone's count is of these, not of every card it holds.
ZONE_PLACE_TYPES = ('chiese', 'luoghi')


def _card_type(card):
    for type_key in CARD_TYPES:
        if hasattr(card, type_key):
            return type_key
    return None


def _visible_to(user):
    published = Q(card__is_published=True)
    if not user.is_authenticated:
        return published
    if user.role == User.ADMIN:
        return Q()
    return published | Q(card__author=user)


@api_view(['GET'])
@permission_classes([])
def map_features(request):
    """Every published card that has a place, in one unpaginated payload
    (spec map.md M2) — the same shape of call `/api/reports/map/` already is
    for the reports layer, which keeps its own endpoint and its own filters.

    Translations are excluded: a translated card is a second `Card` row, so
    including it would put two pins on the same doorstep. The map indexes
    places, and the reader picks a language once inside the card (C4).

    Each entry carries its `cover` — the card's first image (spec/design.md
    D5), which is what the mobile home's sheet lists cards with. It is a
    prefetch rather than a second round trip per card, and it is `null` for a
    card with no images at all; the SPA draws a type-coloured placeholder
    then, because a list of bare titles is dreary.

    **The drafts this reader may already read come too** (spec map.md M5): an
    author's own, and every draft for an admin — the rule a draft's own page
    follows, which 404s for anyone else. Each entry says `is_published`, and
    an anonymous reader gets what they always got.
    """
    features = (
        MapFeature.objects
        .filter(_visible_to(request.user), card__translation_of__isnull=True)
        .select_related(
            'card', *(f'card__{type_key}' for type_key in CARD_TYPES),
            # «Cosa si può fare qui» files a luogo under an activity by its
            # genre and shows what is known about getting in (cosa-fare.md
            # Part −1, D3/D4; ADR-0008) — joined here, not a query per row.
            'card__luoghi__genre', 'card__availability',
        )
        .prefetch_related('card__images')
        .order_by('card_id', 'position', 'id')
    )

    cards = {}
    for feature in features:
        card = feature.card
        entry = cards.get(card.id)
        if entry is None:
            type_key = _card_type(card)
            if type_key is None:
                continue
            # `.all()[:1]` rather than `.first()`: the prefetch is already in
            # memory, and .first() would hit the database once per card.
            cover = next(iter(card.images.all()), None)
            luogo = getattr(card, 'luoghi', None)
            attivita = getattr(card, 'attivita', None)
            availability = getattr(card, 'availability', None)
            entry = cards[card.id] = {
                'id': str(card.id), 'type': type_key, 'title': card.title,
                'is_published': card.is_published,
                'cover': cover.get_image_url() if cover else None,
                'points': [], 'route': [],
                'genre': luogo.genre.slug if luogo else None,
                # A business's kind files it under «Bere» or «Mangiare» on «Cosa
                # si può fare qui» (ADR-0010), as a luogo's genre files it.
                'kind': attivita.kind if attivita else None,
                # The state only, and only when known: the hours are read on
                # the card itself, always with their date (ADR-0008).
                'access': availability.state
                if availability and availability.state != availability.UNKNOWN else None,
            }
        target = 'route' if feature.kind == MapFeature.ROUTE else 'points'
        entry[target].append({'lat': feature.lat, 'lng': feature.lng, 'label': feature.label})

    # Which editorial zones each card is in (D2), so the SPA can compose a
    # zone's page from this one payload it already holds.
    zones = list(Zona.objects.all())
    for entry in cards.values():
        entry['zones'] = zones_of_feature(zones, entry['type'], entry['points'], entry['route'])

    return Response(list(cards.values()))


@api_view(['GET'])
@permission_classes([])
def zone_list(request):
    """The editorial zones (spec cosa-fare.md Part −1, D2), in the author's
    order, each with its outline and how many published places — chiese and
    luoghi, D3's rows — are in it. Unpaginated: a handful of rows, read whole
    by the zone chips. A zone with no place still comes back; the page decides
    how to say it is empty."""
    zones = list(Zona.objects.all())
    places = (
        MapFeature.objects
        .filter(
            kind=MapFeature.POINT, card__is_published=True, card__translation_of__isnull=True,
        )
        .select_related(*(f'card__{type_key}' for type_key in ZONE_PLACE_TYPES))
    )
    points_by_card = {}
    for feature in places:
        # Only the two types it selected: asking about the other three would
        # be a query per pin.
        if any(hasattr(feature.card, type_key) for type_key in ZONE_PLACE_TYPES):
            points_by_card.setdefault(feature.card_id, []).append({'lat': feature.lat, 'lng': feature.lng})
    counts = dict.fromkeys((zone.slug for zone in zones), 0)
    for points in points_by_card.values():
        for slug in zones_containing_any(zones, points):
            counts[slug] += 1
    return Response([
        {
            'slug': zone.slug, 'name': zone.name, 'geometry': zone.geometry,
            'count': counts[zone.slug],
        }
        for zone in zones
    ])


@api_view(['GET'])
@permission_classes([])
def zone_alias_list(request):
    """The names behind «Dove sei?» (review of 2026-10-22, decision 3): what a
    guest calls the place they stand in, and the zone's slug, in the author's
    order. Unpaginated, like the zones: a few dozen rows the field reads whole
    and matches in the browser, so nothing a reader types ever leaves it."""
    aliases = ZonaAlias.objects.select_related('zona')
    return Response([{'name': alias.name, 'zone': alias.zona.slug} for alias in aliases])


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([])
def overlay_list(request):
    """Public endpoint, per-user contents — see `Overlay.objects.visible_to`.

    JWT authentication is declared explicitly because `permission_classes([])`
    alone would still authenticate, but this endpoint's whole behaviour turns
    on *who* is asking, so the dependency is worth stating rather than
    inheriting from the global default.
    """
    overlays = Overlay.objects.visible_to(request.user)
    return Response(OverlaySerializer(overlays, many=True).data)
