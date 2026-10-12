import json

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from account.models import User
from common.pagination import StandardPagination
from content.api_helpers import (
    parse_points,
    reject_media_on_translation,
    remove_images,
    require_authenticated,
    require_original_published,
    require_author_or_admin,
    save_images,
    start_translation,
)
from content.models import Card, MapFeature
from maps.api import CARD_TYPES

from .models import Intent, Itinerario, Stop
from .rules import publish_problem, stop_card_problem
from .serializers import IntentSerializer, ItinerarioReadSerializer, ItinerarioWriteSerializer

# A generous cap: a day out with forty stops is not a day out, and the limit
# keeps a malformed request from writing a thousand rows.
MAX_STOPS = 40
MAX_PATH_POINTS = 500


def _stops_queryset():
    return Stop.objects.select_related(
        'card', *(f'card__{type_key}' for type_key in CARD_TYPES)
    ).prefetch_related('card__map_features')


def _base_queryset():
    return Itinerario.objects.select_related(
        'card', 'card__author', 'card__translation_of', 'card__translation_of__itinerari',
    ).prefetch_related(
        'intents', 'card__images', 'card__map_features',
        # visible_translations reads the card group's members; without these
        # it cost a query per tour in the list.
        'card__translations', 'card__translation_of__translations',
        Prefetch('stops', queryset=_stops_queryset()),
        # A translation shows the original's tour (itinerari/serializers.py).
        'card__translation_of__images', 'card__translation_of__map_features',
        'card__translation_of__itinerari__intents',
        Prefetch('card__translation_of__itinerari__stops', queryset=_stops_queryset()),
    )


def _filter_by_intent(queryset, request):
    # An unknown intent is an empty list, not an error: a printed link must land
    # somewhere even after the admin has renamed an intent.
    intent = request.query_params.get('intento')
    return queryset.filter(intents__slug=intent) if intent else queryset


def _parse_intents(raw):
    if raw in (None, ''):
        return None
    try:
        slugs = json.loads(raw)
    except (TypeError, ValueError):
        raise ValidationError({'intents': ['Intenti non validi.']}) from None
    if not isinstance(slugs, list) or not all(isinstance(slug, str) for slug in slugs):
        raise ValidationError({'intents': ['Intenti non validi.']})
    intents = list(Intent.objects.filter(slug__in=slugs))
    if len(intents) != len(set(slugs)):
        raise ValidationError({'intents': ['Uno degli intenti non esiste.']})
    return intents


def _parse_stops(raw, user, kept=()):
    """Stops arrive as JSON: `[{card, point_index?, note?}]`, in order. Every
    stop is a card of the archive that has a place (spec itinerari.md I3) — an
    original, since a translation is the same place under another name.

    A stop is a card the writer may open: a published one, one of their own
    drafts, or any card for an admin. Anything else answers exactly as a card
    that does not exist, so a draft's title and place never come back to
    someone who could not read it (the rule every type's detail follows).
    `kept` is the card ids the tour already has as stops — a card unpublished
    by its author after it became a stop does not make the tour unsavable."""
    if raw in (None, ''):
        return None
    try:
        entries = json.loads(raw)
    except (TypeError, ValueError):
        raise ValidationError({'stops': ['Tappe non valide.']}) from None
    if not isinstance(entries, list) or len(entries) > MAX_STOPS:
        raise ValidationError({'stops': [f'Le tappe devono essere una lista di al massimo {MAX_STOPS}.']})

    ids = []
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get('card'), str):
            raise ValidationError({'stops': ['Tappe non valide.']})
        ids.append(entry['card'])
    try:
        cards = {
            str(card.pk): card
            for card in Card.objects.filter(pk__in=ids)
            .select_related(*CARD_TYPES)
            .prefetch_related('map_features')
        }
    except DjangoValidationError:
        # A malformed UUID: the ORM raises before any row is read.
        raise ValidationError({'stops': ['Una delle schede non esiste.']}) from None

    stops = []
    for position, entry in enumerate(entries):
        card = cards.get(entry['card'])
        visible = card is not None and (
            card.is_published
            or card.author_id == user.id
            or user.role == User.ADMIN
            or str(card.pk) in kept
        )
        if not visible:
            raise ValidationError({'stops': ['Una delle schede non esiste.']})
        problem = stop_card_problem(card)
        if problem:
            raise ValidationError({'stops': [problem]})
        points = [f for f in card.map_features.all() if f.kind == MapFeature.POINT]
        point_index = entry.get('point_index')
        if point_index is not None and (
            not isinstance(point_index, int) or isinstance(point_index, bool)
            or point_index < 0 or point_index >= len(points)
        ):
            raise ValidationError({'stops': [f'Il punto scelto per «{card.title}» non esiste.']})
        note = entry.get('note') or ''
        if not isinstance(note, str) or len(note) > 2000:
            raise ValidationError({'stops': ['Nota della tappa non valida.']})
        note = note.replace('\r\n', '\n').replace('\r', '\n')
        point = points[point_index] if point_index is not None else None
        stops.append(Stop(position=position, card=card, point=point, note=note))
    return stops


def _require_publishable(is_published, stops):
    """I4: a tour is published only when every one of its stops can be opened
    by the reader it is published to."""
    problem = publish_problem(is_published, [stop.card for stop in stops])
    if problem:
        raise ValidationError({'is_published': [problem]})


def _replace_stops(itinerario, stops):
    reject_media_on_translation(itinerario.card, field_name='stops')
    itinerario.stops.all().delete()
    for stop in stops:
        stop.itinerario = itinerario
    Stop.objects.bulk_create(stops)


def _replace_path(card, points):
    reject_media_on_translation(card, field_name='route')
    card.map_features.filter(kind=MapFeature.ROUTE).delete()
    MapFeature.objects.bulk_create([
        MapFeature(card=card, kind=MapFeature.ROUTE, position=i, lat=p['lat'], lng=p['lng'], label=p['label'])
        for i, p in enumerate(points)
    ])


@api_view(['GET', 'POST'])
@permission_classes([])
def itinerario_list(request):
    if request.method == 'POST':
        require_authenticated(request)

        write_serializer = ItinerarioWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        data = write_serializer.validated_data
        stops = _parse_stops(request.data.get('stops'), request.user) or []
        intents = _parse_intents(request.data.get('intents')) or []
        path = parse_points(request.data.get('route'), field_name='route', max_points=MAX_PATH_POINTS)
        _require_publishable(data['is_published'], stops)

        with transaction.atomic():
            card = Card.objects.create(
                title=data['title'], body_html=data['body_html'],
                author=request.user, is_published=data['is_published'],
            )
            itinerario = Itinerario.objects.create(card=card, form=data['form'], duration=data['duration'])
            itinerario.intents.set(intents)
            _replace_stops(itinerario, stops)
            # I2: only a percorso has a drawn path.
            if data['form'] == Itinerario.PERCORSO and path:
                _replace_path(card, path)
            save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))

        itinerario = _base_queryset().get(pk=itinerario.pk)
        return Response(ItinerarioReadSerializer(itinerario, context={'request': request}).data, status=201)

    paginator = StandardPagination()
    # One tour, one row (translations.md T6): originals only.
    queryset = _base_queryset().filter(card__is_published=True, card__translation_of__isnull=True)
    page = paginator.paginate_queryset(_filter_by_intent(queryset, request), request)
    return paginator.get_paginated_response(
        ItinerarioReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET'])
@permission_classes([])
def intent_list(request):
    """Every intent, in the admin's order, with how many published tours carry
    it — the landing shows only those that lead somewhere (I5)."""
    # Ordering restated: Django drops Meta.ordering from an aggregating query.
    intents = Intent.objects.annotate(
        count=Count(
            'itinerari',
            filter=Q(itinerari__card__is_published=True, itinerari__card__translation_of__isnull=True),
        )
    ).order_by('position', 'name')
    return Response(IntentSerializer(intents, many=True).data)


@api_view(['GET'])
def itinerario_mine(request):
    paginator = StandardPagination()
    queryset = _base_queryset().filter(card__author=request.user)
    page = paginator.paginate_queryset(_filter_by_intent(queryset, request), request)
    return paginator.get_paginated_response(
        ItinerarioReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([])
def itinerario_detail(request, pk):
    itinerario = get_object_or_404(_base_queryset(), pk=pk)

    if request.method == 'GET':
        is_owner = request.user.is_authenticated and (
            itinerario.card.author_id == request.user.id or request.user.role == User.ADMIN
        )
        if not itinerario.card.is_published and not is_owner:
            raise Http404
        return Response(ItinerarioReadSerializer(itinerario, context={'request': request}).data)

    require_author_or_admin(request, itinerario)

    if request.method == 'DELETE':
        itinerario.card.delete()
        return Response(status=204)

    write_serializer = ItinerarioWriteSerializer(data=request.data, partial=True)
    write_serializer.is_valid(raise_exception=True)
    data = write_serializer.validated_data
    kept = {str(card_id) for card_id in itinerario.stops.values_list('card_id', flat=True)}
    stops = _parse_stops(request.data.get('stops'), request.user, kept)
    intents = _parse_intents(request.data.get('intents'))
    path = parse_points(request.data.get('route'), field_name='route', max_points=MAX_PATH_POINTS)

    card = itinerario.card
    is_published = data.get('is_published', card.is_published)
    form = data.get('form', itinerario.form)
    # The stops a publication would show: the new ones if any came, else the
    # current ones — publishing an unchanged tour checks what it already has.
    _require_publishable(is_published, stops if stops is not None else list(itinerario.stops.all()))
    require_original_published(card, data.get('is_published', False))

    with transaction.atomic():
        for field in ('title', 'body_html', 'is_published'):
            if field in data:
                setattr(card, field, data[field])
        card.save()

        for field in ('form', 'duration'):
            if field in data:
                setattr(itinerario, field, data[field])
        itinerario.save()

        if intents is not None:
            itinerario.intents.set(intents)
        if stops is not None:
            _replace_stops(itinerario, stops)
        if form == Itinerario.RACCOLTA:
            card.map_features.filter(kind=MapFeature.ROUTE).delete()
        elif path is not None:
            _replace_path(card, path)

        remove_images(card, request.data.get('remove_image_ids'))
        save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))

    itinerario = _base_queryset().get(pk=itinerario.pk)
    return Response(ItinerarioReadSerializer(itinerario, context={'request': request}).data)


@api_view(['POST'])
def itinerario_translate(request, pk):
    itinerario = get_object_or_404(_base_queryset(), pk=pk)
    language = request.data.get('language')
    new_card = start_translation(
        request, itinerario.card, Itinerario, language,
        extra_defaults={'form': itinerario.form, 'duration': ''},
    )
    translation = _base_queryset().get(pk=new_card.pk)
    return Response(ItinerarioReadSerializer(translation, context={'request': request}).data, status=201)
