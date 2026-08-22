from django.urls import path

from . import api

urlpatterns = [
    path('', api.feste_list, name='feste_list'),
    path('mine/', api.feste_mine, name='feste_mine'),
    path('<uuid:pk>/', api.feste_detail, name='feste_detail'),
]
