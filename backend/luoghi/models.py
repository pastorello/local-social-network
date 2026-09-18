import uuid

from django.db import models

from content.models import Card


class Genre(models.Model):
    """What kind of place a luogo is (spec content.md, 2026-09-11).

    An admin-managed list — the same shape as the reports' categories — seeded
    from the place taxonomy Google Maps publishes, restricted to what Gaeta
    has. A collaborator picks one; they cannot type a new one, which is what
    keeps luoghi from becoming the drawer `tradizioni` would have been.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('nome', max_length=100, unique=True)
    # The reader meets genres as headings ("Spiagge", "Musei"), the form as a
    # choice ("Spiaggia"), so both forms are stored rather than derived.
    name_plural = models.CharField('nome al plurale', max_length=100)
    # What the list filter and the SPA's links carry: stable, readable, and
    # not the UUID a URL would otherwise have to spell.
    slug = models.SlugField(max_length=100, unique=True)
    position = models.PositiveIntegerField('posizione', default=0)

    class Meta:
        ordering = ('position', 'name')
        verbose_name = 'genere'
        verbose_name_plural = 'generi'

    def __str__(self):
        return self.name


class Luogo(models.Model):
    # primary_key=True: a Luogo's id IS its card's id, same pattern as Feste.
    card = models.OneToOneField(
        Card, related_name='luoghi', on_delete=models.CASCADE, primary_key=True
    )
    # PROTECT: removing a genre that places still use would leave them with no
    # kind at all; the admin has to move them first.
    genre = models.ForeignKey(
        Genre, related_name='luoghi', on_delete=models.PROTECT, verbose_name='genere'
    )
    # "A piedi dal centro", "in auto, parcheggio sulla Flacca": the first thing
    # a visitor asks about a beach, and not something a pin answers.
    how_to_get_there = models.TextField('come arrivarci', blank=True, default='')

    class Meta:
        ordering = ('-card__created_at',)
        verbose_name = 'luogo'
        verbose_name_plural = 'luoghi'

    def __str__(self):
        return self.card.title
