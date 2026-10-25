from django.urls import path

from . import api

urlpatterns = [
    path('', api.attivita_list, name='attivita_list'),
    path('kinds/', api.kind_list, name='attivita_kind_list'),
    path('mine/', api.attivita_mine, name='attivita_mine'),
    path('<uuid:pk>/', api.attivita_detail, name='attivita_detail'),
    path('<uuid:pk>/traduci/', api.attivita_translate, name='attivita_translate'),
]
