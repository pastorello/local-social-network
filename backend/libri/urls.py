from django.urls import path

from . import api

urlpatterns = [
    path('', api.libro_list, name='libro_list'),
    path('mine/', api.libro_mine, name='libro_mine'),
    path('<uuid:pk>/', api.libro_detail, name='libro_detail'),
    path('<uuid:pk>/traduci/', api.libro_translate, name='libro_translate'),
]
