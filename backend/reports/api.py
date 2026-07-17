from django.db.models import F
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotAuthenticated, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from account.models import User

from .models import Category, IssueReport, Upvote
from .serializers import (
    CategorySerializer,
    ReportPinSerializer,
    ReportSerializer,
    ReportWriteSerializer,
)


class ReportPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _filtered_reports(request):
    queryset = IssueReport.objects.select_related('category', 'author').all()

    category = request.GET.get('category', '')
    if category:
        queryset = queryset.filter(category_id=category)

    status_param = request.GET.get('status', '')
    if status_param:
        queryset = queryset.filter(status=status_param)

    q = request.GET.get('q', '')
    if q:
        queryset = queryset.filter(title__icontains=q)

    author = request.GET.get('author', '')
    if author:
        queryset = queryset.filter(author_id=author)

    return queryset


def _upvoted_ids(request, reports):
    if not request.user.is_authenticated:
        return set()
    return set(
        Upvote.objects.filter(
            user=request.user, report__in=[report.id for report in reports]
        ).values_list('report_id', flat=True)
    )


def _require_authenticated(request):
    if not request.user.is_authenticated:
        raise NotAuthenticated()


@api_view(['GET'])
@permission_classes([])
def category_list(request):
    categories = Category.objects.filter(is_active=True)
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([])
def report_list(request):
    # GET is open to visitors (spec §3); POST requires a logged-in citizen.
    if request.method == 'POST':
        _require_authenticated(request)

        serializer = ReportWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save(author=request.user)

        return Response(
            ReportSerializer(report, context={'upvoted_report_ids': set()}).data,
            status=201,
        )

    paginator = ReportPagination()
    page = paginator.paginate_queryset(_filtered_reports(request), request)
    serializer = ReportSerializer(
        page, many=True, context={'upvoted_report_ids': _upvoted_ids(request, page)}
    )
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([])
def report_map(request):
    # Unpaginated slim payload for the map (spec F2.4); same filters as the list.
    serializer = ReportPinSerializer(_filtered_reports(request), many=True)
    return Response(serializer.data)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([])
def report_detail(request, pk):
    report = get_object_or_404(
        IssueReport.objects.select_related('category', 'author'), pk=pk
    )

    if request.method == 'GET':
        serializer = ReportSerializer(
            report, context={'upvoted_report_ids': _upvoted_ids(request, [report])}
        )
        return Response(serializer.data)

    # Spec F2.8: authors can edit/delete their own report while it is open.
    _require_authenticated(request)
    if report.author_id != request.user.id:
        raise PermissionDenied('Puoi modificare solo le tue segnalazioni.')
    if report.status != IssueReport.OPEN:
        raise PermissionDenied(
            'La segnalazione non è più modificabile: è già stata presa in carico.'
        )

    if request.method == 'DELETE':
        report.delete()
        return Response(status=204)

    serializer = ReportWriteSerializer(report, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    report.refresh_from_db()
    return Response(
        ReportSerializer(
            report, context={'upvoted_report_ids': _upvoted_ids(request, [report])}
        ).data
    )


@api_view(['POST'])
def report_upvote(request, pk):
    # Toggle (spec F2.7); authors may upvote their own report.
    report = get_object_or_404(IssueReport, pk=pk)

    upvote, created = Upvote.objects.get_or_create(user=request.user, report=report)
    delta = 1
    if not created:
        upvote.delete()
        delta = -1

    IssueReport.objects.filter(pk=report.pk).update(
        upvotes_count=F('upvotes_count') + delta
    )
    report.refresh_from_db()

    return Response({'upvoted': created, 'upvotes_count': report.upvotes_count})


@api_view(['PATCH'])
def report_status(request, pk):
    # Spec F2.3: status transitions are admin-only.
    if request.user.role != User.ADMIN:
        raise PermissionDenied('Solo gli amministratori possono cambiare lo stato.')

    report = get_object_or_404(
        IssueReport.objects.select_related('category', 'author'), pk=pk
    )

    new_status = request.data.get('status', '')
    valid_statuses = dict(IssueReport.STATUS_CHOICES)
    if new_status not in valid_statuses:
        raise ValidationError({'status': ['Stato non valido.']})
    if not report.can_transition_to(new_status):
        raise ValidationError(
            {'status': [f'Transizione non consentita da "{report.status}" a "{new_status}".']}
        )

    report.status = new_status
    report.save(update_fields=('status', 'updated_at'))

    return Response(
        ReportSerializer(
            report, context={'upvoted_report_ids': _upvoted_ids(request, [report])}
        ).data
    )
