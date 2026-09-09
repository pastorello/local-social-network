from django.db import models

from content.models import Card


class Libro(models.Model):
    card = models.OneToOneField(
        Card, related_name='libri', on_delete=models.CASCADE, primary_key=True
    )
    # Not `author`: Card.author is the collaborator who wrote the card, and one
    # model carrying both under names a reader has to keep apart is how the two
    # get confused (spec content.md, 2026-09-09).
    book_author = models.CharField(max_length=200)
    # Free text for the same reason as Feste.recurrence and
    # Personaggio.life_dates: "1987, rist. 2004" is not a number.
    year = models.CharField(max_length=100, blank=True, default='')
    publisher = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ('-card__created_at',)
        verbose_name = 'libro'
        verbose_name_plural = 'libri'

    def __str__(self):
        return self.card.title
