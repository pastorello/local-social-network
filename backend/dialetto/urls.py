from django.urls import path

from . import api

urlpatterns = [
    path('', api.termine_list, name='termine_list'),
    path('mine/', api.termine_mine, name='termine_mine'),
    path('<uuid:pk>/', api.termine_detail, name='termine_detail'),
    path('<uuid:pk>/traduci/', api.termine_translate, name='termine_translate'),
]
