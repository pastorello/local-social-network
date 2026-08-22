from django.db import models

from content.models import Card


class Chiesa(models.Model):
    # primary_key=True: a Chiesa's id IS its card's id, same pattern as Feste.
    card = models.OneToOneField(
        Card, related_name='chiese', on_delete=models.CASCADE, primary_key=True
    )

    class Meta:
        ordering = ('-card__created_at',)

    def __str__(self):
        return self.card.title
