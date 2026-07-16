from django.urls import path

from . import api

app_name = "polls"
urlpatterns = [
    path("list/", api.polls_list, name="polls_list"),
]
