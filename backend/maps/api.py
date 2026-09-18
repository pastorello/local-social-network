from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from content.models import MapFeature

from .models import Overlay
from .serializers import OverlaySerializer

# Reverse OneToOne accessor -> the key the SPA uses for the layer and for the
# card's own route (`/chiese/<id>`). dialetto and libri are absent on purpose:
# the spec's footprint table gives them none, so they never reach this endpoint.
CARD_TYPES = ('feste', 'chiese', 'ricette', 'personaggi', 'luoghi')


def _card_type(card):
    for type_key in CARD_TYPES:
        if hasattr(card, type_key):
            return type_key
    return None


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
    """
    features = (
        MapFeature.objects
        .filter(card__is_published=True, card__translation_of__isnull=True)
        .select_related('card', *(f'card__{type_key}' for type_key in CARD_TYPES))
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
            entry = cards[card.id] = {
                'id': str(card.id), 'type': type_key, 'title': card.title,
                'cover': cover.get_image_url() if cover else None,
                'points': [], 'route': [],
            }
        target = 'route' if feature.kind == MapFeature.ROUTE else 'points'
        entry[target].append({'lat': feature.lat, 'lng': feature.lng, 'label': feature.label})

    return Response(list(cards.values()))


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
