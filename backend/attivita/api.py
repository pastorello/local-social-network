from django.db import transaction
from django.db.models import Count
from django.db.models.functions import Lower
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from account.models import User
from common.pagination import StandardPagination
from content.api_helpers import (
    parse_availability,
    parse_points,
    remove_images,
    replace_points,
    require_authenticated,
    require_author_or_admin,
    require_original_published,
    save_availability,
    save_images,
    start_translation,
)
from content.models import Card

from .models import Attivita
from .serializers import AttivitaReadSerializer, AttivitaWriteSerializer

# A business has exactly one fixed pin, like a luogo (ADR-0010) — the shared
# point-parsing, capped at 1.
MAX_PINS = 1


def _filter_by_kind(queryset, request):
    # An unknown kind is an empty list, not an error, as an unknown genre is.
    kind = request.query_params.get('kind')
    return queryset.filter(kind=kind) if kind else queryset


def _base_queryset():
    return Attivita.objects.select_related(
        'card', 'card__author', 'card__translation_of',
        # A translation shows its original's kind (attivita/serializers.py).
        'card__translation_of__attivita',
        # What is known about getting in is the original's (ADR-0008, T5).
        'card__availability', 'card__translation_of__availability',
    ).prefetch_related(
        'card__images', 'card__map_features',
        'card__translation_of__images', 'card__translation_of__map_features',
    ).order_by(
        # The only order there is (cosa-fare.md CF40, ADR-0010): alphabetical by
        # title, capitals aside — never by date, by kind or by anything a
        # business could ask to have moved. The title itself and the id break
        # ties, so two pages never disagree about where a row is.
        Lower('card__title'), 'card__title', 'pk',
    )


@api_view(['GET', 'POST'])
@permission_classes([])
def attivita_list(request):
    if request.method == 'POST':
        require_authenticated(request)

        write_serializer = AttivitaWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        data = write_serializer.validated_data
        pins = parse_points(request.data.get('pins'), max_points=MAX_PINS)
        availability = parse_availability(request.data.get('availability'))

        with transaction.atomic():
            card = Card.objects.create(
                title=data['title'], body_html=data['body_html'],
                author=request.user, is_published=data['is_published'],
            )
            attivita = Attivita.objects.create(
                card=card, kind=data['kind'], how_to_get_there=data['how_to_get_there'],
            )
            save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))
            replace_points(card, pins)
            save_availability(card, availability)

        attivita = _base_queryset().get(pk=attivita.pk)
        return Response(AttivitaReadSerializer(attivita, context={'request': request}).data, status=201)

    paginator = StandardPagination()
    # One thing in the world, one row (spec translations.md): the public list
    # shows originals only; `mine/` below deliberately does not.
    queryset = _base_queryset().filter(card__is_published=True, card__translation_of__isnull=True)
    page = paginator.paginate_queryset(_filter_by_kind(queryset, request), request)
    return paginator.get_paginated_response(
        AttivitaReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET'])
@permission_classes([])
def kind_list(request):
    """The three kinds, in code's order, with how many published businesses
    are of each — the list's headings, and the form's choices. Unpaginated,
    like luoghi's genres; unlike them it is not a table, so nothing here can
    add a fourth."""
    counts = dict(
        Attivita.objects
        .filter(card__is_published=True, card__translation_of__isnull=True)
        .order_by()
        .values_list('kind')
        .annotate(count=Count('pk'))
    )
    return Response([
        # A kind reads the same as a heading and as a choice: "Dove si beve".
        {'slug': slug, 'name': name, 'name_plural': name, 'count': counts.get(slug, 0)}
        for slug, name in Attivita.KIND_CHOICES
    ])


@api_view(['GET'])
def attivita_mine(request):
    # Collaborators are not Django-admin staff (spec C1), so this is the only
    # way they find their own drafts again.
    paginator = StandardPagination()
    queryset = _base_queryset().filter(card__author=request.user)
    page = paginator.paginate_queryset(_filter_by_kind(queryset, request), request)
    return paginator.get_paginated_response(
        AttivitaReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([])
def attivita_detail(request, pk):
    attivita = get_object_or_404(_base_queryset(), pk=pk)

    if request.method == 'GET':
        is_owner = request.user.is_authenticated and (
            attivita.card.author_id == request.user.id or request.user.role == User.ADMIN
        )
        if not attivita.card.is_published and not is_owner:
            # A draft is invisible to anyone but its author/admin, same
            # reasoning as feste_detail.
            raise Http404
        return Response(AttivitaReadSerializer(attivita, context={'request': request}).data)

    require_author_or_admin(request, attivita)

    if request.method == 'DELETE':
        attivita.card.delete()
        return Response(status=204)

    write_serializer = AttivitaWriteSerializer(data=request.data, partial=True)
    write_serializer.is_valid(raise_exception=True)
    data = write_serializer.validated_data
    pins = parse_points(request.data.get('pins'), max_points=MAX_PINS)
    availability = parse_availability(request.data.get('availability'))

    with transaction.atomic():
        card = attivita.card
        require_original_published(card, data.get('is_published', False))
        for field in ('title', 'body_html', 'is_published'):
            if field in data:
                setattr(card, field, data[field])
        card.save()

        for field in ('kind', 'how_to_get_there'):
            if field in data:
                setattr(attivita, field, data[field])
        attivita.save()
        save_availability(card, availability)

        remove_images(card, request.data.get('remove_image_ids'))
        save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))
        replace_points(card, pins)

    attivita = _base_queryset().get(pk=attivita.pk)
    return Response(AttivitaReadSerializer(attivita, context={'request': request}).data)


@api_view(['POST'])
def attivita_translate(request, pk):
    attivita = get_object_or_404(_base_queryset(), pk=pk)
    language = request.data.get('language')
    # The kind is not optional on the row, so the translation carries the
    # original's — which is also what it shows (attivita/serializers.py).
    new_card = start_translation(
        request, attivita.card, Attivita, language,
        extra_defaults={'kind': attivita.kind, 'how_to_get_there': ''},
    )
    translation = _base_queryset().get(pk=new_card.pk)
    return Response(AttivitaReadSerializer(translation, context={'request': request}).data, status=201)
