from django.urls import path

from . import views
from . import api

app_name = "polls"
urlpatterns = [
    path("", api.polls_list, name="polls_list"),
    path("<int:pk>/", views.DetailView.as_view(), name="detail"),
    path("<int:pk>/results/", views.ResultsView.as_view(), name="results"),
    path("<int:question_id>/vote/", views.vote, name="vote"),
]