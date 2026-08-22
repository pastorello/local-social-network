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
    require_authenticated,
    require_author_or_admin,
    save_images,
    remove_images,
    start_translation,
)
from content.models import Card, MapFeature

from .models import Feste
from .serializers import FesteReadSerializer, FesteWriteSerializer, RoutePointSerializer

MAX_ROUTE_POINTS = 50


def _base_queryset():
    return Feste.objects.select_related('card', 'card__author').prefetch_related(
        'card__images', 'card__map_features'
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
    card.map_features.filter(kind=MapFeature.ROUTE).delete()
    MapFeature.objects.bulk_create([
        MapFeature(card=card, kind=MapFeature.ROUTE, position=i, lat=p['lat'], lng=p['lng'], label=p['label'])
        for i, p in enumerate(points)
    ])


@api_view(['GET', 'POST'])
@permission_classes([])
def feste_list(request):
    if request.method == 'POST':
        require_authenticated(request)

        write_serializer = FesteWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        data = write_serializer.validated_data
        route = _parse_route(request.data.get('route'))

        with transaction.atomic():
            card = Card.objects.create(
                title=data['title'], body_html=data['body_html'],
                author=request.user, is_published=data['is_published'],
            )
            feste = Feste.objects.create(
                card=card, recurrence=data['recurrence'], programme=data['programme'],
            )
            save_images(card, request.FILES.getlist('images'))
            _replace_route(card, route)

        feste = _base_queryset().get(pk=feste.pk)
        return Response(FesteReadSerializer(feste, context={'request': request}).data, status=201)

    paginator = StandardPagination()
    queryset = _base_queryset().filter(card__is_published=True)
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

    with transaction.atomic():
        card = feste.card
        for field in ('title', 'body_html', 'is_published'):
            if field in data:
                setattr(card, field, data[field])
        card.save()

        for field in ('recurrence', 'programme'):
            if field in data:
                setattr(feste, field, data[field])
        feste.save()

        remove_images(card, request.data.get('remove_image_ids'))
        save_images(card, request.FILES.getlist('images'))
        _replace_route(card, route)

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
