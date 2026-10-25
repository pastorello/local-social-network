from django.core.exceptions import ValidationError
from django.db import models

from content.models import Card


class Feste(models.Model):
    # primary_key=True: a Feste's id IS its card's id (classic Django
    # one-to-one-as-subtype pattern) — one uuid identifies the card everywhere,
    # including in `/api/feste/<uuid:pk>/`.
    card = models.OneToOneField(
        Card, related_name='feste', on_delete=models.CASCADE, primary_key=True
    )
    # Free text, not a computed calendar rule — the spec's own example
    # ("every 9 August") is prose, not a recurrence expression.
    recurrence = models.CharField(max_length=200, blank=True, default='')
    programme = models.TextField(blank=True, default='')

    class Meta:
        ordering = ('-card__created_at',)

    def __str__(self):
        return self.card.title


class Edizione(models.Model):
    """One year's date of a feast (spec cosa-fare.md Part −1 D9, K2's cheap
    shape): a row a person types — the feast, a first day, an optional last
    day, an optional note — and no recurrence rule. Porto Salvo's procession
    is the second Sunday of August and the committee confirms it in spring;
    no rule says that, and a fixed date would be wrong every other year.

    With no row ahead, the card prints its `recurrence` and «data non ancora
    confermata», never a guess. Owned by the original card, as its route is
    (spec translations.md T5): a translation shows the original's editions.
    Past editions are kept, never deleted by the form (CF26)."""

    festa = models.ForeignKey(
        Feste, related_name='editions', on_delete=models.CASCADE, verbose_name='festa'
    )
    start_date = models.DateField('dal')
    # The same as the first day for a one-day feast — set by `save()` when
    # left empty, so "not over yet" is one comparison, as for an event.
    end_date = models.DateField('al', blank=True)
    note = models.CharField('nota', max_length=200, blank=True, default='')

    class Meta:
        ordering = ('start_date',)
        verbose_name = 'edizione'
        verbose_name_plural = 'edizioni'

    def __str__(self):
        return f'{self.festa.card.title}, {self.start_date:%d/%m/%Y}'

    def clean(self):
        # Django admin's inline obeys what the festa's form obeys
        # (feste/api.py::_replace_editions).
        from common.when import dates_problems

        if self.festa_id and self.festa.card.translation_of_id is not None:
            raise ValidationError(EDITIONS_BELONG_TO_ORIGINAL)
        stored = Edizione.objects.filter(pk=self.pk).first() if not self._state.adding else None
        errors = dates_problems(
            self.start_date, self.end_date or self.start_date,
            (stored.start_date, stored.end_date) if stored else None,
        )
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.end_date is None:
            self.end_date = self.start_date
        super().save(*args, **kwargs)


EDITIONS_BELONG_TO_ORIGINAL = 'Le date delle edizioni appartengono alla scheda originale.'
