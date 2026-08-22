from django.db import models

from content.models import Card


class Termine(models.Model):
    card = models.OneToOneField(
        Card, related_name='dialetto', on_delete=models.CASCADE, primary_key=True
    )
    term = models.CharField(max_length=200)
    meaning = models.TextField()
    example_usage = models.TextField(blank=True, default='')

    class Meta:
        ordering = ('-card__created_at',)

    def __str__(self):
        return self.term
