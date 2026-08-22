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

from .models import CardImage, MapFeature

MAX_POINTS = 50


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


def require_author_or_admin(request, instance):
    """`instance` is any type's model instance — Feste/Chiesa/Ricetta/
    Personaggio/Termine — all of which expose `.card`."""
    require_authenticated(request)
    if instance.card.author_id != request.user.id and request.user.role != User.ADMIN:
        raise PermissionDenied('Puoi modificare solo le tue schede.')


def save_images(card, files):
    if not files:
        return
    next_position = card.images.count()
    for offset, upload in enumerate(files):
        try:
            cleaned = validate_image(upload)
        except ImageRejected as exc:
            raise ValidationError({'images': [str(exc)]}) from exc
        CardImage.objects.create(card=card, image=cleaned, position=next_position + offset)


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
