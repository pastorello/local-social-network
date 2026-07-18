from django.urls import path

from . import api

urlpatterns = [
    path('', api.poll_list, name='poll_list'),
    path('<uuid:pk>/', api.poll_detail, name='poll_detail'),
    path('<uuid:pk>/vote/', api.poll_vote, name='poll_vote'),
    path('<uuid:pk>/close/', api.poll_close, name='poll_close'),
]
