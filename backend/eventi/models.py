import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from account.models import User
from common.when import dates_problems, tourist_day
from content.models import Card


class Evento(models.Model):
    """Something that happens on a date in Gaeta (spec cosa-fare.md Part −1
    D9): the live music at a bar on a Friday, or a one-off that lasts — the
    Festival della pizza, the Luminarie — with an end date. Read D9 and CF25–
    CF34 before changing anything here.

    **Not a card** (CF25). Every rule the content core carries is about a
    document that endures; an event stops being current and is never rewritten
    into something else. So: no rich text, no gallery, no translations, not a
    layer of the map, not a stop of a tour, not in any menu of types.

    **Never deleted, never expired by a job** (CF26). "Current" is a
    comparison made when a request arrives (`common/when.py`); a past event
    stays published and readable at its own address, and simply stops being
    proposed. The API has no DELETE: unpublishing is how a collaborator says
    "I should not have written this", and Django admin is the author's.

    A feast's yearly date is not an event: it is an edition of its own card
    (`feste.Edizione`, K2), which already carries its procession and places.
    """

    IN_PROGRAMMA = 'in_programma'
    ANNULLATO = 'annullato'
    RINVIATO = 'rinviato'
    STATE_CHOICES = (
        (IN_PROGRAMMA, 'In programma'),
        (ANNULLATO, 'Annullato'),
        (RINVIATO, 'Rinviato'),
    )
    # CF28, constrained the way `reports.IssueReport.ALLOWED_TRANSITIONS` is.
    # Cancelled is final: an event that comes back is a new announcement, and
    # the record keeps that this one was called off. A postponed event goes
    # back to «in programma» once its new date is typed.
    ALLOWED_TRANSITIONS = {
        IN_PROGRAMMA: {RINVIATO, ANNULLATO},
        RINVIATO: {IN_PROGRAMMA, ANNULLATO},
        ANNULLATO: set(),
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField('titolo', max_length=200)
    # A day and an hour on a wall in Gaeta, never a DateTimeField (CF25):
    # «il concerto è alle 21:00» is a promise about that wall clock, and an
    # instant would move it whenever a time-zone database or a server setting
    # changed. Nothing converts these; they are read and printed as typed.
    start_date = models.DateField('giorno')
    start_time = models.TimeField('ora', null=True, blank=True)
    # The last day, the same as the first for a one-day event — set by `save()`
    # when left empty, so "not over yet" is one comparison (CF26).
    end_date = models.DateField('fino al', blank=True)
    # One line, plain text: no sanitizer and no second `v-html` (ADR-0001's
    # amendment stays untouched). The poster carries the programme.
    description = models.CharField('una riga', max_length=300, blank=True, default='')
    # The event's own poster (CF30 as amended by D9): optional, through
    # `common/images.py` like every upload, and shown so it can be enlarged.
    poster = models.ImageField('locandina', upload_to='event_posters', blank=True)
    # CF32: where the organiser announces it, never a checkout.
    link = models.URLField('programma e conferme', max_length=500, blank=True, default='')

    # Where it is held: a card that has a place (`maps.api.VENUE_TYPES`), or
    # one labelled point (CF31) — never both. SET_NULL: deleting the venue's
    # card must not delete the town's record of what happened there.
    card = models.ForeignKey(
        Card, related_name='events', null=True, blank=True,
        on_delete=models.SET_NULL, verbose_name='scheda del posto',
    )
    place_label = models.CharField('nome del posto', max_length=140, blank=True, default='')
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)

    # CF28: beside `is_published` and meaning something else on purpose —
    # `is_published` is "should this be readable", the state is "is this still
    # happening".
    state = models.CharField('stato', max_length=16, choices=STATE_CHOICES, default=IN_PROGRAMMA)
    # PROTECT, like a card's: losing an account must not delete the record.
    author = models.ForeignKey(User, related_name='events', on_delete=models.PROTECT)
    is_published = models.BooleanField('pubblicato', default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('start_date', 'start_time', 'title')
        verbose_name = 'evento'
        verbose_name_plural = 'eventi'

    def __str__(self):
        return self.title

    def can_transition_to(self, state):
        return state == self.state or state in self.ALLOWED_TRANSITIONS.get(self.state, set())

    @property
    def is_over(self):
        return self.end_date < tourist_day()

    def get_poster_url(self):
        return settings.WEBSITE_URL + self.poster.url if self.poster else None

    def clean(self):
        # The rules the API applies, for the other write path: Django admin
        # (the lesson of TD-49). Imported here, not at the top: they read the
        # map's lists of types, which load the API.
        from .rules import place_problem, publish_problem, state_problem

        stored = Evento.objects.filter(pk=self.pk).first() if not self._state.adding else None
        errors = dates_problems(
            self.start_date, self.end_date or self.start_date,
            (stored.start_date, stored.end_date) if stored else None,
        )
        problem = place_problem(self.card, self.lat, self.lng, self.place_label)
        if problem:
            errors['card'] = problem
        problem = state_problem(stored, self.state)
        if problem:
            errors['state'] = problem
        problem = publish_problem(self.is_published, self.card)
        if problem:
            errors['is_published'] = problem
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.end_date is None:
            self.end_date = self.start_date
        super().save(*args, **kwargs)
