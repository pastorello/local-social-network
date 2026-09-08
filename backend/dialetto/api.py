from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404

from account.models import User
from common.pagination import StandardPagination
from content.api_helpers import (
    remove_images,
    require_authenticated,
    require_author_or_admin,
    save_images,
    start_translation,
)
from content.models import Card

from .models import Termine
from .serializers import TermineReadSerializer, TermineWriteSerializer


def _base_queryset():
    return Termine.objects.select_related('card', 'card__author').prefetch_related('card__images')


@api_view(['GET', 'POST'])
@permission_classes([])
def termine_list(request):
    if request.method == 'POST':
        require_authenticated(request)

        write_serializer = TermineWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        data = write_serializer.validated_data

        with transaction.atomic():
            card = Card.objects.create(
                title=data['title'], body_html=data['body_html'],
                author=request.user, is_published=data['is_published'],
            )
            termine = Termine.objects.create(
                card=card, term=data['term'], meaning=data['meaning'],
                example_usage=data['example_usage'],
            )
            save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))

        termine = _base_queryset().get(pk=termine.pk)
        return Response(TermineReadSerializer(termine, context={'request': request}).data, status=201)

    paginator = StandardPagination()
    queryset = _base_queryset().filter(card__is_published=True)
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(
        TermineReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET'])
def termine_mine(request):
    # Collaborators are not Django-admin staff (spec C1), so this is the only
    # way they find their own drafts again.
    paginator = StandardPagination()
    queryset = _base_queryset().filter(card__author=request.user)
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(
        TermineReadSerializer(page, many=True, context={'request': request}).data
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([])
def termine_detail(request, pk):
    termine = get_object_or_404(_base_queryset(), pk=pk)

    if request.method == 'GET':
        is_owner = request.user.is_authenticated and (
            termine.card.author_id == request.user.id or request.user.role == User.ADMIN
        )
        if not termine.card.is_published and not is_owner:
            # A draft is invisible to anyone but its author/admin, same
            # reasoning as feste_detail.
            raise Http404
        return Response(TermineReadSerializer(termine, context={'request': request}).data)

    require_author_or_admin(request, termine)

    if request.method == 'DELETE':
        termine.card.delete()
        return Response(status=204)

    write_serializer = TermineWriteSerializer(data=request.data, partial=True)
    write_serializer.is_valid(raise_exception=True)
    data = write_serializer.validated_data

    with transaction.atomic():
        card = termine.card
        for field in ('title', 'body_html', 'is_published'):
            if field in data:
                setattr(card, field, data[field])
        card.save()

        for field in ('term', 'meaning', 'example_usage'):
            if field in data:
                setattr(termine, field, data[field])
        termine.save()

        remove_images(card, request.data.get('remove_image_ids'))
        save_images(card, request.FILES.getlist('images'), request.data.get('image_order'))

    termine = _base_queryset().get(pk=termine.pk)
    return Response(TermineReadSerializer(termine, context={'request': request}).data)


@api_view(['POST'])
def termine_translate(request, pk):
    termine = get_object_or_404(_base_queryset(), pk=pk)
    language = request.data.get('language')
    new_card = start_translation(
        request, termine.card, Termine, language,
        extra_defaults={'term': '', 'meaning': '', 'example_usage': ''},
    )
    translation = _base_queryset().get(pk=new_card.pk)
    return Response(TermineReadSerializer(translation, context={'request': request}).data, status=201)
