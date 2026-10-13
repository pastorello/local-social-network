from django.db import models

from content.models import Card


class Chiesa(models.Model):
    # primary_key=True: a Chiesa's id IS its card's id, same pattern as Feste.
    card = models.OneToOneField(
        Card, related_name='chiese', on_delete=models.CASCADE, primary_key=True
    )
    # «Se la trovi chiusa» (cosa-fare.md D7): for the reader already at the
    # door — what is in front of them, what is fifty metres away. Never hours
    # (ADR-0008 keeps those in content.Availability, dated). Per card, so a
    # translation has its own.
    from_outside = models.TextField('se la trovi chiusa', blank=True, default='')

    class Meta:
        ordering = ('-card__created_at',)

    def __str__(self):
        return self.card.title
