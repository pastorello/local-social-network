from django.urls import path

from . import api

urlpatterns = [
    path('', api.ricetta_list, name='ricetta_list'),
    path('mine/', api.ricetta_mine, name='ricetta_mine'),
    path('<uuid:pk>/', api.ricetta_detail, name='ricetta_detail'),
]
