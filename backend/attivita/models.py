from django.db import models

from content.models import Card


class Attivita(models.Model):
    """A business in the archive — a bar, a table, a bottega — on the editors'
    merit and never ranked (ADR-0010: read it before changing anything here).
    A luogo's shape plus its kind."""

    # The three kinds live in code, not in an admin-managed table (ADR-0010):
    # a fourth — a chain, a beach club "as such" — is a PR and a spec edit,
    # never one Django admin form, which is the trap cosa-fare.md K5 named for
    # a `Ristorante` genre in luoghi. The labels are what a reader reads as a
    # heading, so they are whole phrases.
    BEVE = 'beve'
    MANGIA = 'mangia'
    COMPRA = 'compra'
    KIND_CHOICES = (
        (BEVE, 'Dove si beve'),
        (MANGIA, 'Dove si mangia'),
        # The bottega and the bakery that sell typical products to take away,
        # with nowhere to sit.
        (COMPRA, 'Dove si compra'),
    )
    # The same headings in the reader's English (review PR-19a, translations.md
    # T9), closed in code beside them: what Zona, Genre and Intent keep in a
    # `name_en` column, a kind keeps here, where a fourth would have to be
    # written anyway.
    KIND_NAMES_EN = {
        BEVE: 'Where to drink',
        MANGIA: 'Where to eat',
        COMPRA: 'Where to buy',
    }

    # primary_key=True: an Attivita's id IS its card's id, same pattern as Feste.
    card = models.OneToOneField(
        Card, related_name='attivita', on_delete=models.CASCADE, primary_key=True
    )
    kind = models.CharField('tipo', max_length=10, choices=KIND_CHOICES)
    # As on a luogo: the first thing a visitor asks, and not something a pin
    # answers ("in fondo al molo, dietro la fontana").
    how_to_get_there = models.TextField('come arrivarci', blank=True, default='')

    class Meta:
        # Alphabetical, and nothing else (cosa-fare.md CF40): the archive chooses
        # between places, never between businesses. The API restates it without
        # regard to case (attivita/api.py).
        ordering = ('card__title',)
        verbose_name = 'attività'
        verbose_name_plural = 'attività'

    def __str__(self):
        return self.card.title
