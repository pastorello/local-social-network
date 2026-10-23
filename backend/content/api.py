import operator
from functools import reduce

from django.db.models import Count, Q
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from common.pagination import StandardPagination

from .models import Card
from .serializers import MyCardSerializer


def type_keys():
    """Every card type, by the reverse accessor its row adds to a Card — which
    is also the type's route segment (`/chiese`) and the map's `type` key.

    Found rather than listed: the core must not know its types (ADR-0004), and
    what makes an app a type is a one-to-one row of its own on the card. The
    core's own one-to-one (`Availability`) is not one.
    """
    return [
        relation.get_accessor_name()
        for relation in Card._meta.related_objects
        if relation.one_to_one and relation.related_model._meta.app_label != Card._meta.app_label
    ]


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def card_counts(request):
    """How many published cards each type has (review PR-9, content.md): the
    menu shows them beside its entries, so a reader sees where the archive is
    growing and which headings are still empty.

    Counted like every public list — published, and translations left out
    (one thing in the world, one row) — and the same for everyone: no
    authentication, because an author's drafts never move a public count.
    One query, however many types there are.
    """
    keys = type_keys()
    totals = Card.objects.filter(is_published=True, translation_of__isnull=True).aggregate(**{
        f'count_{key}': Count('pk', filter=Q(**{f'{key}__isnull': False})) for key in keys
    })
    return Response({key: totals[f'count_{key}'] for key in keys})


@api_view(['GET'])
def my_cards(request):
    """The signed-in collaborator's own cards, every type at once (review
    PR-13, design.md "Left to the build"): *Le mie schede*, behind the avatar.
    Until then a collaborator found a draft type by type, through each list's
    *Le mie* filter, and had to remember which type it was.

    Drafts first, then the most recently changed: the page leads with what is
    unfinished, and after signing in one row is enough to know whether there
    is anything unfinished at all (the SPA's lib/landing.ts). Translations are
    in, as in every type's `mine/` — this is a collaborator's way back to an
    unfinished one. A card with no type row, which only Django admin can make,
    is no card anyone writes here, and is left out.
    """
    keys = type_keys()
    typed = reduce(operator.or_, (Q(**{f'{key}__isnull': False}) for key in keys))
    cards = (
        Card.objects.filter(typed, author=request.user)
        .select_related('translation_of', *keys)
        .order_by('is_published', '-updated_at', 'pk')
    )
    paginator = StandardPagination()
    page = paginator.paginate_queryset(cards, request)
    return paginator.get_paginated_response(
        MyCardSerializer(page, many=True, context={'type_keys': keys}).data
    )
