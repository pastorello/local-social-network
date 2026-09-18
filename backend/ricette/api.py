from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404

from account.models import User
from common.pagination import StandardPagination
from content.api_helpers import (
    MAX_POINTS,
    parse_points,
    remove_images,
    replace_points,
    require_authenticated,
    require_author_or_admin,
    require_original_published,
    save_images,
    start_translation,
)
from content.models import Card

from .models import Ricetta
from .serializers import RicettaReadSerializer, RicettaWriteSerializer


def _base_queryset():
    return Ricetta.objects.select_related('card', 'card__author', 'card__translation_of').prefetch_related(
        'card__images', 'card__map_features',
        # A translation shows the original's photographs and geometry
        # (content/serializers.py::media_source), so the original's are part of
        # this query rather than one extra query per row of a list.
        'card__translation_of__images', 'card__translation_of__map_features',
    )


@api_view(['GET', 'POST'])
@permission_classes([])
def ricetta_list(request):
    if request.method == 'POST':
        require_authenticated(request)

        write_serializer = RicettaWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        data = write_serializer.validated_data
        pins = parse_points(request.data.get('pins'), max_points=MAX_POINTS)

        with transaction.atomic():
            card = Card.objects.create(
                title=data['title'], body_html=data['body_html'],
                author=request.user, is_published=data['is_published'],
            )
            ricetta = Ricetta.objects.create(
                card=card, ingredients=data['ingredients'],
                servings=data['servings'], procedure=data['procedure'],
            )
            save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))
            replace_points(card, pins)

        ricetta = _base_queryset().get(pk=ricetta.pk)
        return Response(RicettaReadSerializer(ricetta, context={'request': request}).data, status=201)

    paginator = StandardPagination()
    # One thing in the world, one row (spec translations.md, 2026-09-09): a
    # published translation is a second Card for the same church, and listing
    # both put the same doorstep twice in the archive under two titles. The map
    # had already taken this decision in C5; the lists follow it. `mine/` below
    # deliberately does not — a collaborator needs the way back to the
    # translation they have not finished.
    queryset = _base_queryset().filter(card__is_published=True, card__translation_of__isnull=True)
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(
        RicettaReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET'])
def ricetta_mine(request):
    # Collaborators are not Django-admin staff (spec C1), so this is the only
    # way they find their own drafts again.
    paginator = StandardPagination()
    queryset = _base_queryset().filter(card__author=request.user)
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(
        RicettaReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([])
def ricetta_detail(request, pk):
    ricetta = get_object_or_404(_base_queryset(), pk=pk)

    if request.method == 'GET':
        is_owner = request.user.is_authenticated and (
            ricetta.card.author_id == request.user.id or request.user.role == User.ADMIN
        )
        if not ricetta.card.is_published and not is_owner:
            # A draft is invisible to anyone but its author/admin, same
            # reasoning as feste_detail.
            raise Http404
        return Response(RicettaReadSerializer(ricetta, context={'request': request}).data)

    require_author_or_admin(request, ricetta)

    if request.method == 'DELETE':
        ricetta.card.delete()
        return Response(status=204)

    write_serializer = RicettaWriteSerializer(data=request.data, partial=True)
    write_serializer.is_valid(raise_exception=True)
    data = write_serializer.validated_data
    pins = parse_points(request.data.get('pins'), max_points=MAX_POINTS)

    with transaction.atomic():
        card = ricetta.card
        require_original_published(card, data.get('is_published', False))
        for field in ('title', 'body_html', 'is_published'):
            if field in data:
                setattr(card, field, data[field])
        card.save()

        for field in ('ingredients', 'servings', 'procedure'):
            if field in data:
                setattr(ricetta, field, data[field])
        ricetta.save()

        remove_images(card, request.data.get('remove_image_ids'))
        save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))
        replace_points(card, pins)

    ricetta = _base_queryset().get(pk=ricetta.pk)
    return Response(RicettaReadSerializer(ricetta, context={'request': request}).data)


@api_view(['POST'])
def ricetta_translate(request, pk):
    ricetta = get_object_or_404(_base_queryset(), pk=pk)
    language = request.data.get('language')
    new_card = start_translation(
        request, ricetta.card, Ricetta, language,
        extra_defaults={'ingredients': '', 'servings': '', 'procedure': ''},
    )
    translation = _base_queryset().get(pk=new_card.pk)
    return Response(RicettaReadSerializer(translation, context={'request': request}).data, status=201)
