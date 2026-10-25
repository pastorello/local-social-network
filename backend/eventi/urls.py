from django.urls import path

from . import api

urlpatterns = [
    path('', api.evento_list, name='evento_list'),
    path('mine/', api.evento_mine, name='evento_mine'),
    path('<uuid:pk>/', api.evento_detail, name='evento_detail'),
]
