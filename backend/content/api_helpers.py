"""Write-path helpers shared by every type app's api.py (ADR-0004).

Extracted out of feste/api.py once a second consumer (chiese) needed the same
image handling and a new point-pin equivalent of feste's route parsing — the
same reasoning the content core itself exists for: copying security-sensitive
upload/permission logic per type is how TD-12 (avatars silently missing
controls report photos had) happened.
"""

import json

from rest_framework.exceptions import NotAuthenticated, PermissionDenied, ValidationError
from rest_framework import serializers

from account.models import User
from common.images import ImageRejected, validate_image

from .models import Card, CardImage, MapFeature

MAX_POINTS = 50

# T1/T3 (spec translations.md): English first, machine translation is a later
# phase — this is the whole target-language set for now. Keyed by code so a
# future language is one more entry, not a new code path.
TRANSLATABLE_LANGUAGES = {'en': 'English'}


class PointSerializer(serializers.Serializer):
    """Validates one entry of a `pins` JSON array a create/update request
    sends alongside the multipart form — same shape as feste's own
    RoutePointSerializer, shared here since chiese/ricette/personaggi all
    need it and feste's route stays a different (ordered/connected) kind."""

    lat = serializers.FloatField(min_value=-90.0, max_value=90.0)
    lng = serializers.FloatField(min_value=-180.0, max_value=180.0)
    label = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')


def require_authenticated(request):
    if not request.user.is_authenticated:
        raise NotAuthenticated()


def require_author_or_admin_for_card(request, card):
    require_authenticated(request)
    if card.author_id != request.user.id and request.user.role != User.ADMIN:
        raise PermissionDenied('Puoi modificare solo le tue schede.')


def require_author_or_admin(request, instance):
    """`instance` is any type's model instance — Feste/Chiesa/Ricetta/
    Personaggio/Termine — all of which expose `.card`."""
    require_author_or_admin_for_card(request, instance.card)


def start_translation(request, card, type_model, language, extra_defaults=None):
    """Creates the empty target-language sibling card T2 describes ("traduci
    questo articolo in…" opens an empty version alongside the source) — the
    write is generic (Card + a blank type row), only the type row's shape
    (`type_model`, `extra_defaults`) varies per caller.

    Only an original can be translated: chaining translation_of would make
    "the reader's language switch" ambiguous about which card is the source,
    and the spec's translation unit is one card, not a tree of them.
    """
    require_author_or_admin_for_card(request, card)

    if language not in TRANSLATABLE_LANGUAGES:
        raise ValidationError({'language': ['Valore non valido.']})
    if card.translation_of_id is not None:
        raise ValidationError({'detail': 'Non è possibile tradurre una traduzione.'})
    if language == card.language:
        raise ValidationError({'language': ['La scheda è già in questa lingua.']})
    if card.translations.filter(language=language).exists():
        raise ValidationError({'detail': 'Esiste già una traduzione in questa lingua.'})

    new_card = Card.objects.create(
        title='', body_html='', author=request.user, is_published=False,
        language=language, translation_of=card,
    )
    type_model.objects.create(card=new_card, **(extra_defaults or {}))
    return new_card


def save_images(card, files, raw_order=None):
    """Store the uploads, then put every image of this card in the order the
    author arranged (`image_order`).

    Order is editorial, not incidental: D5 makes the **first** image the card's
    cover, so "which one is first" is a decision the author takes while writing
    — and until 2026-09-07 the only way to change it was to remove every image
    and pick them again in the right sequence.

    `image_order` is a list of tokens: an existing image's id, or `new:<n>` for
    the n-th file in this request's `images`. Mixing the two is the point —
    a photograph being uploaded now can be made the cover in the same save,
    without a round trip.
    """
    created = []
    if files:
        next_position = card.images.count()
        for offset, upload in enumerate(files):
            try:
                cleaned = validate_image(upload)
            except ImageRejected as exc:
                raise ValidationError({'images': [str(exc)]}) from exc
            created.append(
                CardImage.objects.create(
                    card=card, image=cleaned, position=next_position + offset
                )
            )

    if raw_order is not None:
        _apply_image_order(card, raw_order, created)

    return created


def _apply_image_order(card, raw_order, created):
    try:
        order = json.loads(raw_order)
    except (TypeError, ValueError):
        raise ValidationError({'image_order': ['Valore non valido.']}) from None
    if not isinstance(order, list):
        raise ValidationError({'image_order': ['Valore non valido.']})

    images = list(card.images.all())
    by_token = {str(image.id): image for image in images}
    for index, image in enumerate(created):
        by_token[f'new:{index}'] = image

    ordered, taken = [], set()
    for token in order:
        image = by_token.get(str(token))
        if image is not None and image.id not in taken:
            ordered.append(image)
            taken.add(image.id)

    # An image the client did not mention is not an error — it keeps its
    # previous relative order, after the ones that were arranged. A form that
    # sends a partial order is arranging what it knows about, not deleting.
    ordered += [image for image in images if image.id not in taken]

    for position, image in enumerate(ordered):
        if image.position != position:
            image.position = position
            image.save(update_fields=('position',))


def remove_images(card, raw_ids):
    if not raw_ids:
        return
    try:
        ids = json.loads(raw_ids)
    except (TypeError, ValueError):
        raise ValidationError({'remove_image_ids': ['Valore non valido.']}) from None
    card.images.filter(id__in=ids).delete()


def parse_points(raw, field_name='pins', max_points=MAX_POINTS):
    """`pins` arrives as a JSON-encoded string alongside the multipart form,
    same reasoning as feste's `_parse_route`. Returns None when the field is
    absent (leave the existing pins alone), or a validated list otherwise."""
    if raw is None:
        return None

    try:
        points = json.loads(raw)
    except (TypeError, ValueError):
        raise ValidationError({field_name: ['Valore non valido.']}) from None

    if not isinstance(points, list) or len(points) > max_points:
        raise ValidationError({field_name: ['Valore non valido.']})

    serializer = PointSerializer(data=points, many=True)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def replace_points(card, points):
    if points is None:
        return
    card.map_features.filter(kind=MapFeature.POINT).delete()
    MapFeature.objects.bulk_create([
        MapFeature(card=card, kind=MapFeature.POINT, position=i, lat=p['lat'], lng=p['lng'], label=p['label'])
        for i, p in enumerate(points)
    ])
