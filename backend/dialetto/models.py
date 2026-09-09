from django.db import models

from content.models import Card


class Termine(models.Model):
    card = models.OneToOneField(
        Card, related_name='dialetto', on_delete=models.CASCADE, primary_key=True
    )
    # No `term`: the card's title is the word (decided 2026-09-09). It used to
    # be both, and a reader saw "Sciuscià" as the heading and then "Termine:
    # Sciuscià" as the first field, every time.
    meaning = models.TextField()
    example_usage = models.TextField(blank=True, default='')

    class Meta:
        ordering = ('-card__created_at',)

    def __str__(self):
        return self.card.title
