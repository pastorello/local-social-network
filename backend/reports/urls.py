from django.urls import path

from . import api

urlpatterns = [
    path('categories/', api.category_list, name='category_list'),
    path('reports/', api.report_list, name='report_list'),
    path('reports/map/', api.report_map, name='report_map'),
    path('reports/<uuid:pk>/', api.report_detail, name='report_detail'),
    path('reports/<uuid:pk>/upvote/', api.report_upvote, name='report_upvote'),
    path('reports/<uuid:pk>/status/', api.report_status, name='report_status'),
]
