from django.urls import path

from . import api

urlpatterns = [
    path('', api.chiesa_list, name='chiesa_list'),
    path('mine/', api.chiesa_mine, name='chiesa_mine'),
    path('<uuid:pk>/', api.chiesa_detail, name='chiesa_detail'),
    path('<uuid:pk>/traduci/', api.chiesa_translate, name='chiesa_translate'),
]
