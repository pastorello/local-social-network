import uuid

from django.db import models

from content.models import Card, MapFeature


class Intent(models.Model):
    """"Che cosa ti va di fare?" (spec itinerari.md I5): the choices on the
    landing page. Data, not code — an admin-managed list seeded with three, so
    a fourth is an admin edit rather than a deploy."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('nome', max_length=100, unique=True)
    # The name in the reader's English (review PR-19a, translations.md T9);
    # blank, the Italian stands in.
    name_en = models.CharField('nome in inglese', max_length=100, blank=True, default='')
    slug = models.SlugField(max_length=100, unique=True)
    # The line under the choice on the landing page ("Le spiagge, da Serapo a
    # Sant'Agostino"), as the itinerari canvas drew it. Optional: an intent
    # without one shows only its name and its count.
    description = models.CharField('descrizione', max_length=200, blank=True, default='')
    position = models.PositiveIntegerField('posizione', default=0)

    class Meta:
        ordering = ('position', 'name')
        verbose_name = 'intento'
        verbose_name_plural = 'intenti'

    def __str__(self):
        return self.name


class Itinerario(models.Model):
    """A curated tour (spec itinerari.md): a card, like every other type (I1),
    whose stops are other cards (I3)."""

    # I2: a raccolta is a set with no order and no path (the seven beaches — a
    # day at the sea is one of them); a percorso is a day out in sequence, the
    # only form with a drawn path and a guided mode.
    RACCOLTA = 'raccolta'
    PERCORSO = 'percorso'
    FORM_CHOICES = ((RACCOLTA, 'Raccolta'), (PERCORSO, 'Percorso'))

    card = models.OneToOneField(
        Card, related_name='itinerari', on_delete=models.CASCADE, primary_key=True
    )
    form = models.CharField('forma', max_length=10, choices=FORM_CHOICES, default=PERCORSO)
    # Free text, like Feste.recurrence: "mezza giornata" is not a number.
    duration = models.CharField('durata indicativa', max_length=100, blank=True, default='')
    intents = models.ManyToManyField(Intent, related_name='itinerari', blank=True, verbose_name='intenti')

    class Meta:
        ordering = ('-card__created_at',)
        verbose_name = 'itinerario'
        verbose_name_plural = 'itinerari'

    def __str__(self):
        return self.card.title


class Stop(models.Model):
    """One stop: a card from the archive (I3), optionally one of that card's
    own points ("the tiella, *at this bakery*"), and a note from the tour's
    author — why stop here, on this walk."""

    itinerario = models.ForeignKey(Itinerario, related_name='stops', on_delete=models.CASCADE)
    position = models.PositiveIntegerField(default=0)
    # CASCADE: a card that is deleted takes its stops with it, so a tour never
    # points at a card that does not exist (I4). A card that is only
    # unpublished stays a stop, and the read side skips it for readers.
    card = models.ForeignKey(
        Card, related_name='itinerary_stops', on_delete=models.CASCADE, verbose_name='scheda'
    )
    # Which of the card's point pins — that pin, not a position in the card's
    # list, so removing an earlier pin or correcting this one does not move
    # the stop (TD-50; `replace_points` keeps a pin's row when the form sends
    # its id back). Null is the card's first point (or, for a festa, the start
    # of its route), which is also where a stop lands when its pin is deleted.
    # The API still speaks `point_index`, resolved here on write and back on
    # read, because that is what the form's select holds.
    point = models.ForeignKey(
        MapFeature, related_name='stops', null=True, blank=True,
        on_delete=models.SET_NULL, verbose_name='punto',
    )
    note = models.TextField('nota', blank=True, default='')

    class Meta:
        ordering = ('position', 'id')
        verbose_name = 'tappa'
        verbose_name_plural = 'tappe'

    def __str__(self):
        return f'{self.position + 1}. {self.card.title}'
