import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404

from account.models import User
from common.pagination import StandardPagination
from content.api_helpers import (
    reject_media_on_translation,
    remove_images,
    require_authenticated,
    require_author_or_admin,
    require_original_published,
    save_images,
    start_translation,
)
from common.when import dates_problems, tourist_day
from content.models import Card, MapFeature

from .models import EDITIONS_BELONG_TO_ORIGINAL, Edizione, Feste
from .serializers import (
    EdizioneWriteSerializer,
    FesteReadSerializer,
    FesteWriteSerializer,
    RoutePointSerializer,
)

MAX_ROUTE_POINTS = 50
# A feast has one edition a year; a form holding more than this many ahead is
# not one somebody typed.
MAX_EDITIONS = 20


def _base_queryset():
    return Feste.objects.select_related('card', 'card__author', 'card__translation_of').prefetch_related(
        'card__translations', 'card__images', 'card__map_features',
        # A translation shows the original's photographs and geometry
        # (content/serializers.py::media_source), so the original's are part of
        # this query rather than one extra query per row of a list.
        'card__translation_of__images', 'card__translation_of__map_features',
        # This year's date (D9), the original's in every language, likewise.
        'editions', 'card__translation_of__feste__editions',
    )


def _parse_route(raw):
    """`route` arrives as a JSON-encoded string alongside the multipart form
    (repeated image files don't mix cleanly with a nested list field) —
    parsed and validated here rather than fought into a ModelSerializer."""
    if raw is None:
        return None

    try:
        points = json.loads(raw)
    except (TypeError, ValueError):
        raise ValidationError({'route': ['Percorso non valido.']}) from None

    if not isinstance(points, list) or len(points) > MAX_ROUTE_POINTS:
        raise ValidationError({'route': ['Percorso non valido.']})

    serializer = RoutePointSerializer(data=points, many=True)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def _replace_route(card, points):
    if points is None:
        return
    reject_media_on_translation(card, field_name='route')
    card.map_features.filter(kind=MapFeature.ROUTE).delete()
    MapFeature.objects.bulk_create([
        MapFeature(card=card, kind=MapFeature.ROUTE, position=i, lat=p['lat'], lng=p['lng'], label=p['label'])
        for i, p in enumerate(points)
    ])


def _parse_editions(raw):
    """`editions` arrives as a JSON-encoded list beside the multipart form, like
    the route: `[{id?, start_date, end_date?, note?}]`. None when absent —
    leave the stored editions alone."""
    if raw is None:
        return None
    try:
        entries = json.loads(raw)
    except (TypeError, ValueError):
        raise ValidationError({'editions': ['Date non valide.']}) from None
    if not isinstance(entries, list) or len(entries) > MAX_EDITIONS:
        raise ValidationError({'editions': ['Date non valide.']})
    serializer = EdizioneWriteSerializer(data=entries, many=True)
    if not serializer.is_valid():
        raise ValidationError({'editions': ['Date non valide: scrivi il giorno per intero.']})
    return serializer.validated_data


def _edition_id(value):
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    if isinstance(value, str) and value.isdecimal():
        return int(value)
    return None


def _replace_editions(feste, entries):
    """Make the feast's editions ahead exactly `entries` — a diff by id, as a
    card's pins are (TD-50). The form only ever sees what is not over yet, so
    that is all it can change or remove: a past edition is the record of a
    year that happened (CF26) and nothing here deletes it. Each date is held
    to what an event's is (`common/when.py`): no range over 60 days, nothing
    already past unless it was already there unchanged."""
    if entries is None:
        return
    if feste.card.translation_of_id is not None:
        raise ValidationError({'editions': [EDITIONS_BELONG_TO_ORIGINAL]})
    today = tourist_day()
    ahead = {edition.pk: edition for edition in feste.editions.filter(end_date__gte=today)}
    kept, created = [], []
    for number, entry in enumerate(entries, start=1):
        start = entry['start_date']
        end = entry['end_date'] or start
        edition = ahead.pop(_edition_id(entry['id']), None)
        stored = (edition.start_date, edition.end_date) if edition else None
        problems = dates_problems(start, end, stored)
        if problems:
            message = next(iter(problems.values()))
            raise ValidationError({'editions': [f'Edizione {number}: {message}']})
        if edition is None:
            edition = Edizione(festa=feste)
            created.append(edition)
        else:
            kept.append(edition)
        edition.start_date, edition.end_date, edition.note = start, end, entry['note']
    Edizione.objects.filter(pk__in=ahead).delete()
    Edizione.objects.bulk_update(kept, ['start_date', 'end_date', 'note'])
    Edizione.objects.bulk_create(created)


@api_view(['GET', 'POST'])
@permission_classes([])
def feste_list(request):
    if request.method == 'POST':
        require_authenticated(request)

        write_serializer = FesteWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        data = write_serializer.validated_data
        route = _parse_route(request.data.get('route'))
        editions = _parse_editions(request.data.get('editions'))

        with transaction.atomic():
            card = Card.objects.create(
                title=data['title'], body_html=data['body_html'],
                author=request.user, is_published=data['is_published'],
            )
            feste = Feste.objects.create(
                card=card, recurrence=data['recurrence'], programme=data['programme'],
            )
            save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))
            _replace_route(card, route)
            _replace_editions(feste, editions)

        feste = _base_queryset().get(pk=feste.pk)
        return Response(FesteReadSerializer(feste, context={'request': request}).data, status=201)

    paginator = StandardPagination()
    # One thing in the world, one row (spec translations.md, 2026-09-09): a
    # published translation is a second Card for the same church, and listing
    # both put the same doorstep twice in the archive under two titles. The map
    # had already taken this decision in C5; the lists follow it. `mine/` below
    # deliberately does not — a collaborator needs the way back to the
    # translation they have not finished.
    queryset = _base_queryset().filter(card__is_published=True, card__translation_of__isnull=True)
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(FesteReadSerializer(page, many=True, context={'request': request}).data)


@api_view(['GET'])
def feste_mine(request):
    # Collaborators are not Django-admin staff (spec C1), so this is the only
    # way they find their own drafts again.
    paginator = StandardPagination()
    queryset = _base_queryset().filter(card__author=request.user)
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(FesteReadSerializer(page, many=True, context={'request': request}).data)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([])
def feste_detail(request, pk):
    feste = get_object_or_404(_base_queryset(), pk=pk)

    if request.method == 'GET':
        is_owner = request.user.is_authenticated and (
            feste.card.author_id == request.user.id or request.user.role == User.ADMIN
        )
        if not feste.card.is_published and not is_owner:
            # A draft is invisible to anyone but its author/admin — not merely
            # forbidden, so an outsider can't distinguish "doesn't exist" from
            # "exists but you can't see it" (same reasoning as reports' public
            # detail, generalised to a state reports don't have).
            raise Http404
        return Response(FesteReadSerializer(feste, context={'request': request}).data)

    require_author_or_admin(request, feste)

    if request.method == 'DELETE':
        feste.card.delete()
        return Response(status=204)

    write_serializer = FesteWriteSerializer(data=request.data, partial=True)
    write_serializer.is_valid(raise_exception=True)
    data = write_serializer.validated_data
    route = _parse_route(request.data.get('route'))
    editions = _parse_editions(request.data.get('editions'))

    with transaction.atomic():
        card = feste.card
        require_original_published(card, data.get('is_published', False))
        for field in ('title', 'body_html', 'is_published'):
            if field in data:
                setattr(card, field, data[field])
        card.save()

        for field in ('recurrence', 'programme'):
            if field in data:
                setattr(feste, field, data[field])
        feste.save()

        remove_images(card, request.data.get('remove_image_ids'))
        save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))
        _replace_route(card, route)
        _replace_editions(feste, editions)

    feste = _base_queryset().get(pk=feste.pk)
    return Response(FesteReadSerializer(feste, context={'request': request}).data)


@api_view(['POST'])
def feste_translate(request, pk):
    feste = get_object_or_404(_base_queryset(), pk=pk)
    language = request.data.get('language')
    new_card = start_translation(
        request, feste.card, Feste, language, extra_defaults={'recurrence': '', 'programme': ''}
    )
    translation = _base_queryset().get(pk=new_card.pk)
    return Response(FesteReadSerializer(translation, context={'request': request}).data, status=201)
