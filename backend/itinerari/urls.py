from django.urls import path

from . import api

urlpatterns = [
    path('', api.itinerario_list, name='itinerario_list'),
    path('intenti/', api.intent_list, name='itinerario_intent_list'),
    path('mine/', api.itinerario_mine, name='itinerario_mine'),
    path('<uuid:pk>/', api.itinerario_detail, name='itinerario_detail'),
    path('<uuid:pk>/traduci/', api.itinerario_translate, name='itinerario_translate'),
]
