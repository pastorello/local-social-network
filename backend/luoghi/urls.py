from django.urls import path

from . import api

urlpatterns = [
    path('', api.luogo_list, name='luogo_list'),
    path('generi/', api.genre_list, name='luogo_genre_list'),
    path('mine/', api.luogo_mine, name='luogo_mine'),
    path('<uuid:pk>/', api.luogo_detail, name='luogo_detail'),
    path('<uuid:pk>/traduci/', api.luogo_translate, name='luogo_translate'),
]
