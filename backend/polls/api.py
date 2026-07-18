from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Case, Count, IntegerField, Prefetch, Q, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotAuthenticated, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from account.models import User

from .models import Poll, PollOption, Vote
from .serializers import PollCreateSerializer, PollSerializer


class PollPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _poll_queryset():
    now = timezone.now()
    return (
        Poll.objects.select_related('created_by')
        .prefetch_related(
            Prefetch(
                'options',
                # annotate() drops Meta.ordering on GROUP BY queries, so the
                # position order must be restated explicitly.
                queryset=PollOption.objects.annotate(
                    votes_count=Count('votes')
                ).order_by('position'),
            )
        )
        # Spec F3.4: open polls first, then closed; newest first within each.
        .annotate(
            closed_rank=Case(
                When(Q(is_closed=True) | Q(closes_at__lte=now), then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        .order_by('closed_rank', '-created_at')
    )


def _serializer_context(request, polls):
    votes_by_poll = {}
    if request.user.is_authenticated:
        votes_by_poll = dict(
            Vote.objects.filter(
                user=request.user, poll__in=[poll.id for poll in polls]
            ).values_list('poll_id', 'option_id')
        )
    return {
        'votes_by_poll': votes_by_poll,
        'is_admin': request.user.is_authenticated and request.user.role == User.ADMIN,
    }


def _require_admin(request):
    if not request.user.is_authenticated:
        raise NotAuthenticated()
    if request.user.role != User.ADMIN:
        raise PermissionDenied('Solo gli amministratori possono gestire i sondaggi.')


def _poll_response(request, pk, status=200):
    poll = _poll_queryset().get(pk=pk)
    serializer = PollSerializer(poll, context=_serializer_context(request, [poll]))
    return Response(serializer.data, status=status)


@api_view(['GET', 'POST'])
@permission_classes([])
def poll_list(request):
    # GET is open to visitors (spec §3); POST is admin-only (F3.1).
    if request.method == 'POST':
        _require_admin(request)

        serializer = PollCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        poll = serializer.save(created_by=request.user)

        return _poll_response(request, poll.pk, status=201)

    paginator = PollPagination()
    page = paginator.paginate_queryset(_poll_queryset(), request)
    serializer = PollSerializer(page, many=True, context=_serializer_context(request, page))
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([])
def poll_detail(request, pk):
    poll = get_object_or_404(_poll_queryset(), pk=pk)
    serializer = PollSerializer(poll, context=_serializer_context(request, [poll]))
    return Response(serializer.data)


@api_view(['POST'])
def poll_vote(request, pk):
    # Spec F3.2: exactly one option, and the vote is final.
    poll = get_object_or_404(Poll, pk=pk)

    if poll.is_currently_closed:
        raise PermissionDenied('Il sondaggio è chiuso.')

    option_id = request.data.get('option', '')
    try:
        option = poll.options.get(pk=option_id)
    except (PollOption.DoesNotExist, DjangoValidationError, ValueError):
        raise ValidationError({'option': ['Scegli una delle opzioni del sondaggio.']})

    try:
        with transaction.atomic():
            Vote.objects.create(user=request.user, poll=poll, option=option)
    except IntegrityError:
        raise PermissionDenied('Hai già votato in questo sondaggio.')

    return _poll_response(request, poll.pk)


@api_view(['PATCH'])
def poll_close(request, pk):
    # Spec §8: closing is an admin action; closing twice is a no-op.
    _require_admin(request)
    poll = get_object_or_404(Poll, pk=pk)

    if not poll.is_closed:
        poll.is_closed = True
        poll.save(update_fields=('is_closed',))

    return _poll_response(request, poll.pk)
