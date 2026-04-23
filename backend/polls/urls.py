from django.urls import path

from . import views
from . import api

app_name = "polls"
urlpatterns = [
    path("polls/", api.polls_list, name="polls_list"),
    path("polls/<int:pk>/", views.DetailView.as_view(), name="detail"),
    path("polls/<int:pk>/results/", views.ResultsView.as_view(), name="results"),
    path("polls/<int:question_id>/vote/", views.vote, name="vote"),
]