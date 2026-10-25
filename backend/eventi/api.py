import json
from datetime import time

from django.db import transaction
from django.db.models import Prefetch
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from account.models import User
from common.images import ImageRejected, validate_image
from common.pagination import StandardPagination
from common.when import WINDOWS, dates_problems, tourist_day, window_bounds
from content.api_helpers import require_authenticated
from content.models import Card, MapFeature
from feste.models import Edizione
from maps.api import VENUE_TYPES

from .models import Evento
from .rules import place_problem, publish_problem, state_problem
from .serializers import (
    EdizioneItemSerializer,
    EventoSerializer,
    EventoWriteSerializer,
    PlaceSerializer,
)


def _venue_cards():
    return Card.objects.select_related(*VENUE_TYPES).prefetch_related(
        Prefetch('map_features', queryset=MapFeature.objects.filter(kind=MapFeature.POINT))
    )


def _base_queryset():
    return Evento.objects.select_related('author').prefetch_related(
        Prefetch('card', queryset=_venue_cards())
    )


def _when(item):
    """«In ordine di data e ora» (D9): the first day, then the hour — an event
    with no hour, and a feast's edition, first among the day's, like a
    calendar's all-day row — then the title, so that a tie is never decided
    by anything a reader could take for a ranking."""
    start_time = getattr(item, 'start_time', None)
    title = item.title if isinstance(item, Evento) else item.festa.card.title
    return (item.start_date, start_time is not None, start_time or time.min, title.lower(), str(item.pk))


def _items(window):
    """What is on, events and feasts' editions together, in date order.

    Without a window, everything published that is not over yet — the list a
    reader browses, where a cancelled event stays, struck through, until its
    date passes (CF28). With one, what falls in it: not over yet and with a
    day inside, and never a cancelled event — a window is a proposal, and the
    archive does not propose what is not happening (CF28). "Not over" is
    a comparison made on each request, never a job (CF26)."""
    today = tourist_day()
    events = _base_queryset().filter(is_published=True, end_date__gte=today)
    editions = Edizione.objects.select_related('festa__card').prefetch_related(
        'festa__card__translations',
    ).filter(
        festa__card__is_published=True, festa__card__translation_of__isnull=True,
        end_date__gte=today,
    )
    if window:
        # A day inside the window: it begins by the window's last day and ends
        # on or after its first, which is today — so a festival that began
        # last week is in today's window (D9).
        _first, last = window_bounds(window, today)
        events = events.filter(start_date__lte=last).exclude(state=Evento.ANNULLATO)
        editions = editions.filter(start_date__lte=last)
    return sorted([*events, *editions], key=_when)


def _serialize(item, context):
    if isinstance(item, Evento):
        return EventoSerializer(item, context=context).data
    return EdizioneItemSerializer(item, context=context).data


def _parse_place(raw):
    """`place` arrives as a JSON-encoded object beside the multipart form. None
    when absent — leave the stored place alone — or the validated values, with
    the venue's card fetched."""
    if raw is None:
        return None
    try:
        value = json.loads(raw)
    except (TypeError, ValueError):
        raise ValidationError({'place': ['Posto non valido.']}) from None
    if not isinstance(value, dict):
        raise ValidationError({'place': ['Posto non valido.']})
    serializer = PlaceSerializer(data=value)
    if not serializer.is_valid():
        raise ValidationError({'place': ['Posto non valido.']})
    data = dict(serializer.validated_data)
    if data['card'] is not None:
        data['card'] = _venue_cards().filter(pk=data['card']).first()
        if data['card'] is None:
            raise ValidationError({'place': ['Il posto scelto non esiste.']})
    return data


def _apply_place(evento, place):
    # Exactly what was sent, both halves: `place_problem` refuses a card and a
    # point together rather than one silently winning.
    if place is None:
        return
    evento.card = place['card']
    evento.lat, evento.lng, evento.place_label = place['lat'], place['lng'], place['label']


def _save_poster(evento, request):
    upload = request.FILES.get('poster')
    if upload is not None:
        try:
            evento.poster = validate_image(upload)
        except ImageRejected as exc:
            raise ValidationError({'poster': [str(exc)]}) from exc
    elif str(request.data.get('remove_poster', '')).lower() == 'true':
        evento.poster = None


def _check(evento, stored):
    """Every rule at once, each under its field — the API's half of what
    `Evento.clean` is for Django admin."""
    errors = {
        field: [message]
        for field, message in dates_problems(
            evento.start_date, evento.end_date,
            (stored.start_date, stored.end_date) if stored else None,
        ).items()
    }
    for field, problem in (
        ('place', place_problem(evento.card, evento.lat, evento.lng, evento.place_label)),
        ('state', state_problem(stored, evento.state)),
        ('is_published', publish_problem(evento.is_published, evento.card)),
    ):
        if problem:
            errors[field] = [problem]
    if errors:
        raise ValidationError(errors)


def _is_owner(request, evento):
    user = request.user
    return user.is_authenticated and (evento.author_id == user.id or user.role == User.ADMIN)


@api_view(['GET', 'POST'])
@permission_classes([])
def evento_list(request):
    """`GET`: what is on, events and feasts' editions together (D9), in date
    order — never ranked, and the page says so. `?finestra=oggi|settimana`
    narrows it to Gaeta's day or to it and the six after (`common/when.py`,
    CF2's tourist day). Public, and paginated like every list; a window is a
    week of things somebody typed by hand.

    `POST`: a collaborator files an event."""
    if request.method == 'POST':
        return _create(request)

    window = request.query_params.get('finestra')
    if window is not None and window not in WINDOWS:
        raise ValidationError({'finestra': ['Valore non valido: oggi o settimana.']})
    paginator = StandardPagination()
    page = paginator.paginate_queryset(_items(window), request)
    context = {'request': request}
    return paginator.get_paginated_response([_serialize(item, context) for item in page])


def _create(request):
    require_authenticated(request)
    serializer = EventoWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    place = _parse_place(request.data.get('place'))

    evento = Evento(
        title=data['title'], start_date=data['start_date'], start_time=data['start_time'],
        end_date=data['end_date'] or data['start_date'], description=data['description'],
        link=data['link'], is_published=data['is_published'], author=request.user,
    )
    _apply_place(evento, place or {'card': None, 'lat': None, 'lng': None, 'label': ''})
    _check(evento, None)
    _save_poster(evento, request)
    with transaction.atomic():
        evento.save()

    evento = _base_queryset().get(pk=evento.pk)
    return Response(EventoSerializer(evento, context={'request': request}).data, status=201)


@api_view(['GET'])
def evento_mine(request):
    """A collaborator's own events, drafts and past ones included. **Ordered by
    when they happen, not by when they were written** — the one list in the
    archive that is (CF34): an archive ordered by when things were written
    cannot show anyone a mistake about when things happen. The next ahead
    first, then what is over, the latest first, each flagged `is_over`."""
    events = list(_base_queryset().filter(author=request.user))
    ahead = sorted((e for e in events if not e.is_over), key=_when)
    over = sorted((e for e in events if e.is_over), key=_when, reverse=True)
    paginator = StandardPagination()
    page = paginator.paginate_queryset([*ahead, *over], request)
    context = {'request': request}
    return paginator.get_paginated_response(EventoSerializer(page, many=True, context=context).data)


@api_view(['GET', 'PATCH'])
@permission_classes([])
def evento_detail(request, pk):
    """No DELETE (CF26): nothing removes an event from the record. A
    collaborator who should not have written one unpublishes it."""
    evento = get_object_or_404(_base_queryset(), pk=pk)

    if request.method == 'GET':
        # A draft 404s for anyone but its author and the admins, as a card's
        # does. A past event stays readable at its address (CF26).
        if not evento.is_published and not _is_owner(request, evento):
            raise Http404
        return Response(EventoSerializer(evento, context={'request': request}).data)

    require_authenticated(request)
    if not _is_owner(request, evento):
        raise PermissionDenied('Puoi modificare solo i tuoi eventi.')

    serializer = EventoWriteSerializer(data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    place = _parse_place(request.data.get('place'))

    stored = Evento.objects.get(pk=evento.pk)
    for field in ('title', 'start_date', 'start_time', 'description', 'link', 'is_published', 'state'):
        if field in data:
            setattr(evento, field, data[field])
    if 'end_date' in data:
        evento.end_date = data['end_date'] or evento.start_date
    elif stored.end_date == stored.start_date:
        # A one-day event whose day moved is still a one-day event.
        evento.end_date = evento.start_date
    _apply_place(evento, place)
    _check(evento, stored)
    _save_poster(evento, request)
    with transaction.atomic():
        evento.save()

    evento = _base_queryset().get(pk=evento.pk)
    return Response(EventoSerializer(evento, context={'request': request}).data)
