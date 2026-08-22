from django.urls import path

from . import api

urlpatterns = [
    path('', api.personaggio_list, name='personaggio_list'),
    path('mine/', api.personaggio_mine, name='personaggio_mine'),
    path('<uuid:pk>/', api.personaggio_detail, name='personaggio_detail'),
]
