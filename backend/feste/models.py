from django.db import models

from content.models import Card


class Feste(models.Model):
    # primary_key=True: a Feste's id IS its card's id (classic Django
    # one-to-one-as-subtype pattern) — one uuid identifies the card everywhere,
    # including in `/api/feste/<uuid:pk>/`.
    card = models.OneToOneField(
        Card, related_name='feste', on_delete=models.CASCADE, primary_key=True
    )
    # Free text, not a computed calendar rule — the spec's own example
    # ("every 9 August") is prose, not a recurrence expression.
    recurrence = models.CharField(max_length=200, blank=True, default='')
    programme = models.TextField(blank=True, default='')

    class Meta:
        ordering = ('-card__created_at',)

    def __str__(self):
        return self.card.title
