from django.urls import path

from . import api

urlpatterns = [
    path('counts/', api.card_counts, name='card_counts'),
    path('mine/', api.my_cards, name='my_cards'),
]
