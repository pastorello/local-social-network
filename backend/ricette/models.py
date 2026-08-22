from django.db import models

from content.models import Card


class Ricetta(models.Model):
    card = models.OneToOneField(
        Card, related_name='ricette', on_delete=models.CASCADE, primary_key=True
    )
    ingredients = models.TextField(blank=True, default='')
    # Free text, e.g. "Per 8 persone" — not a structured serving count.
    servings = models.CharField(max_length=50, blank=True, default='')
    procedure = models.TextField(blank=True, default='')

    class Meta:
        ordering = ('-card__created_at',)

    def __str__(self):
        return self.card.title
