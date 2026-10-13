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
from common.coordinates import CoordinateField
from common.images import ImageRejected, validate_image

from .fields import PlainTextField
from .models import Availability, Card, CardImage, MapFeature

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

    lat = CoordinateField('lat')
    lng = CoordinateField('lng')
    label = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    # The stored pin this entry is, as the read side gave it (TD-50); absent
    # for a pin added in this edit. Read only by `replace_points`, and only as
    # a hint: an id that is not one of this card's pins makes a new pin.
    id = serializers.JSONField(required=False, default=None)


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


def require_original_published(card, is_published):
    """A translation is published after its original, never before: a reader
    of a published translation sees the original's title, photographs and
    place (T5), so publishing it first showed an Italian draft to everyone.
    Every type's update path calls this before it writes `is_published`."""
    if is_published and card.translation_of_id is not None and not card.translation_of.is_published:
        raise ValidationError({
            'is_published': ['Si pubblica dopo la scheda originale, che è ancora in bozza.']
        })


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


MEDIA_BELONGS_TO_ORIGINAL = (
    'Le fotografie e la mappa appartengono alla scheda originale.'
)


def reject_media_on_translation(card, field_name='images'):
    """A translation shows the original's photographs and geometry rather than
    owning any (spec translations.md, 2026-09-09 — see
    content/serializers.py::media_source), so a write that would give it its own
    is refused here, once, for every type app.

    Loud rather than ignored: an upload that silently vanished would read as a
    rejected file, and the author would go looking at image sizes.
    """
    if card.translation_of_id is not None:
        raise ValidationError({field_name: [MEDIA_BELONGS_TO_ORIGINAL]})


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
    if files or raw_order is not None:
        reject_media_on_translation(card)

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
    reject_media_on_translation(card)
    try:
        ids = json.loads(raw_ids)
    except (TypeError, ValueError):
        raise ValidationError({'remove_image_ids': ['Valore non valido.']}) from None
    # A CardImage's pk is an integer, which the SPA may send as a number or as
    # a string. Anything else — `["a"]`, an object — made the ORM raise a
    # ValueError the error handler does not know: a 500.
    def as_id(value):
        if isinstance(value, int) and not isinstance(value, bool):
            return value
        if isinstance(value, str) and value.isdecimal():
            return int(value)
        raise ValidationError({'remove_image_ids': ['Valore non valido.']})

    if not isinstance(ids, list):
        raise ValidationError({'remove_image_ids': ['Valore non valido.']})
    card.images.filter(id__in=[as_id(value) for value in ids]).delete()


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


def _pin_id(value):
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    if isinstance(value, str) and value.isdecimal():
        return int(value)
    return None


def replace_points(card, points):
    """Make the card's pins exactly `points`, in that order — as a diff by id,
    not a delete-and-recreate (TD-50). A pin sent back with its id stays the
    same row, so a tour stop that names it still does after the author removes
    a pin before it or corrects its coordinates; a pin left out is deleted, and
    the stops on it fall back to the card's first pin (`Stop.point` is
    SET_NULL). An id that is not one of this card's pins, or one already used
    in this request, is a new pin: like `image_order`, the order arranges and
    never reaches another card's rows."""
    if points is None:
        return
    reject_media_on_translation(card, field_name='pins')
    existing = {feature.pk: feature for feature in card.map_features.filter(kind=MapFeature.POINT)}
    kept, created = [], []
    for position, point in enumerate(points):
        feature = existing.pop(_pin_id(point.get('id')), None)
        if feature is None:
            feature = MapFeature(card=card, kind=MapFeature.POINT)
            created.append(feature)
        else:
            kept.append(feature)
        feature.position = position
        feature.lat, feature.lng, feature.label = point['lat'], point['lng'], point['label']
    MapFeature.objects.filter(pk__in=existing).delete()
    MapFeature.objects.bulk_update(kept, ['position', 'lat', 'lng', 'label'])
    MapFeature.objects.bulk_create(created)


class AvailabilitySerializer(serializers.ModelSerializer):
    """One `availability` JSON object beside the multipart form, like `pins`.
    `hours_updated` is not in it: the server sets it (ADR-0008)."""

    hours = PlainTextField(max_length=2000, required=False, allow_blank=True, default='')

    class Meta:
        model = Availability
        fields = ('state', 'hours', 'keeper', 'keeper_phone')


def parse_availability(raw):
    """`availability` arrives as a JSON-encoded object. None when the field is
    absent — leave the stored row alone — or the validated dict."""
    if raw is None:
        return None
    try:
        value = json.loads(raw)
    except (TypeError, ValueError):
        raise ValidationError({'availability': ['Valore non valido.']}) from None
    if not isinstance(value, dict):
        raise ValidationError({'availability': ['Valore non valido.']})
    serializer = AvailabilitySerializer(data=value)
    if not serializer.is_valid():
        raise ValidationError({'availability': [
            message for messages in serializer.errors.values() for message in messages
        ]})
    return serializer.validated_data


AVAILABILITY_BELONGS_TO_ORIGINAL = 'Gli orari e il custode appartengono alla scheda originale.'


def save_availability(card, data):
    """Write what a card's form sent about getting in (ADR-0008). Refused on a
    translation, which shows its original's (T5), and on a church marked as
    having no door. Absent `data` leaves the row alone."""
    if data is None:
        return
    if card.translation_of_id is not None:
        raise ValidationError({'availability': [AVAILABILITY_BELONGS_TO_ORIGINAL]})
    if data['state'] == Availability.NO_DOOR and hasattr(card, 'chiese'):
        raise ValidationError({'availability': ['Una chiesa ha sempre una porta.']})
    row = Availability.objects.filter(card=card).first() or Availability(card=card)
    for field, value in data.items():
        setattr(row, field, value)
    row.save()
