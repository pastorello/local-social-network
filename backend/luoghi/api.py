from django.db import transaction
from django.db.models import Count, Q
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

from .models import Genre, Luogo
from .serializers import GenreSerializer, LuogoReadSerializer, LuogoWriteSerializer

# A luogo has exactly one fixed pin, like a church (spec content.md) — the
# shared point-parsing, capped at 1.
MAX_PINS = 1


def _filter_by_genre(queryset, request):
    # The reader's headings — Spiagge, Musei, Monumenti — are this filter. An
    # unknown genre is an empty list, not an error: a link to a genre the
    # admin has since removed should land somewhere, not on a 400.
    genre = request.query_params.get('genere')
    return queryset.filter(genre__slug=genre) if genre else queryset


def _base_queryset():
    return Luogo.objects.select_related(
        'card', 'card__author', 'card__translation_of', 'genre',
        # A translation shows its original's genre (luoghi/serializers.py).
        'card__translation_of__luoghi__genre',
        # What is known about getting in is the original's (ADR-0008, T5).
        'card__availability', 'card__translation_of__availability',
    ).prefetch_related(
        'card__translations', 'card__images', 'card__map_features',
        'card__translation_of__images', 'card__translation_of__map_features',
    )


@api_view(['GET', 'POST'])
@permission_classes([])
def luogo_list(request):
    if request.method == 'POST':
        require_authenticated(request)

        write_serializer = LuogoWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        data = write_serializer.validated_data
        pins = parse_points(request.data.get('pins'), max_points=MAX_PINS)
        availability = parse_availability(request.data.get('availability'))

        with transaction.atomic():
            card = Card.objects.create(
                title=data['title'], body_html=data['body_html'],
                author=request.user, is_published=data['is_published'],
            )
            luogo = Luogo.objects.create(
                card=card, genre=data['genre'], how_to_get_there=data['how_to_get_there'],
            )
            save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))
            replace_points(card, pins)
            save_availability(card, availability)

        luogo = _base_queryset().get(pk=luogo.pk)
        return Response(LuogoReadSerializer(luogo, context={'request': request}).data, status=201)

    paginator = StandardPagination()
    # One thing in the world, one row (spec translations.md): the public list
    # shows originals only; `mine/` below deliberately does not.
    queryset = _base_queryset().filter(card__is_published=True, card__translation_of__isnull=True)
    page = paginator.paginate_queryset(_filter_by_genre(queryset, request), request)
    return paginator.get_paginated_response(
        LuogoReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET'])
@permission_classes([])
def genre_list(request):
    """Every genre, in the admin's order, with how many published places carry
    it. Unpaginated: it is a short, admin-managed list — the form's choices and
    the list's headings both read it whole."""
    # The order is restated: Django drops Meta.ordering from a query that
    # aggregates, the same trap CLAUDE.md records for the polls' prefetch.
    genres = Genre.objects.annotate(
        count=Count(
            'luoghi',
            filter=Q(luoghi__card__is_published=True, luoghi__card__translation_of__isnull=True),
        )
    ).order_by('position', 'name')
    return Response(GenreSerializer(genres, many=True).data)


@api_view(['GET'])
def luogo_mine(request):
    # Collaborators are not Django-admin staff (spec C1), so this is the only
    # way they find their own drafts again.
    paginator = StandardPagination()
    queryset = _base_queryset().filter(card__author=request.user)
    page = paginator.paginate_queryset(_filter_by_genre(queryset, request), request)
    return paginator.get_paginated_response(
        LuogoReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([])
def luogo_detail(request, pk):
    luogo = get_object_or_404(_base_queryset(), pk=pk)

    if request.method == 'GET':
        is_owner = request.user.is_authenticated and (
            luogo.card.author_id == request.user.id or request.user.role == User.ADMIN
        )
        if not luogo.card.is_published and not is_owner:
            # A draft is invisible to anyone but its author/admin, same
            # reasoning as feste_detail.
            raise Http404
        return Response(LuogoReadSerializer(luogo, context={'request': request}).data)

    require_author_or_admin(request, luogo)

    if request.method == 'DELETE':
        luogo.card.delete()
        return Response(status=204)

    write_serializer = LuogoWriteSerializer(data=request.data, partial=True)
    write_serializer.is_valid(raise_exception=True)
    data = write_serializer.validated_data
    pins = parse_points(request.data.get('pins'), max_points=MAX_PINS)
    availability = parse_availability(request.data.get('availability'))

    with transaction.atomic():
        card = luogo.card
        require_original_published(card, data.get('is_published', False))
        for field in ('title', 'body_html', 'is_published'):
            if field in data:
                setattr(card, field, data[field])
        card.save()

        for field in ('genre', 'how_to_get_there'):
            if field in data:
                setattr(luogo, field, data[field])
        luogo.save()
        save_availability(card, availability)

        remove_images(card, request.data.get('remove_image_ids'))
        save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))
        replace_points(card, pins)

    luogo = _base_queryset().get(pk=luogo.pk)
    return Response(LuogoReadSerializer(luogo, context={'request': request}).data)


@api_view(['POST'])
def luogo_translate(request, pk):
    luogo = get_object_or_404(_base_queryset(), pk=pk)
    language = request.data.get('language')
    # The genre is not optional on the row, so the translation carries the
    # original's — which is also what it shows (luoghi/serializers.py).
    new_card = start_translation(
        request, luogo.card, Luogo, language,
        extra_defaults={'genre': luogo.genre, 'how_to_get_there': ''},
    )
    translation = _base_queryset().get(pk=new_card.pk)
    return Response(LuogoReadSerializer(translation, context={'request': request}).data, status=201)
