from django.db import models

from content.models import Card


class Personaggio(models.Model):
    card = models.OneToOneField(
        Card, related_name='personaggi', on_delete=models.CASCADE, primary_key=True
    )
    # Free text, not two date fields — same rationale as Feste.recurrence:
    # historical dates are often uncertain ("sec. XV") rather than exact.
    life_dates = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ('-card__created_at',)

    def __str__(self):
        return self.card.title
