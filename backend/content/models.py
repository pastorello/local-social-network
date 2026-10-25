import uuid
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from account.models import User


class Card(models.Model):
    """The core every content type wraps via a OneToOneField (ADR-0004).

    Deliberately has no type-discriminator field: a card's type is found by
    which reverse relation exists (`hasattr(card, 'feste')`, etc.), matching
    Django's own lightweight-inheritance idiom rather than a field that could
    drift out of sync with the actual OneToOne rows.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    # Always pre-sanitized (content.sanitize.sanitize_html) — never raw
    # collaborator input. This is the one field RichText.vue renders via v-html.
    body_html = models.TextField()
    # PROTECT: losing an author's account must not silently delete published
    # cultural content.
    author = models.ForeignKey(User, related_name='cards', on_delete=models.PROTECT)
    is_published = models.BooleanField(default=False)

    # Translations (C4, spec translations.md): a translation is a second Card
    # pointing at its original. It is published only after it (T8, enforced in
    # api_helpers.require_original_published) and comes down with it (save()).
    language = models.CharField(max_length=10, default='it')
    translation_of = models.ForeignKey(
        'self', null=True, blank=True, related_name='translations', on_delete=models.SET_NULL
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # T8 (decided 2026-09-19): unpublishing an original takes its
        # translations down too — a published translation shows the original's
        # title, photographs and place, so it cannot outlive it. Here rather
        # than in each type's API so Django admin obeys it as well. A queryset
        # `.update()` bypasses save() and this with it.
        if not self.is_published and self.translation_of_id is None:
            self.translations.filter(is_published=True).update(is_published=False)


@receiver(pre_delete, sender=Card)
def _unpublish_translations_of_a_deleted_original(sender, instance, **kwargs):
    # `translation_of` is SET_NULL: deleting an original would otherwise leave
    # its translations standing as published originals of their own, with no
    # photographs or place. They are unpublished, not deleted — a collaborator's
    # translated text is theirs to discard.
    if instance.translation_of_id is None:
        instance.translations.filter(is_published=True).update(is_published=False)


class CardImage(models.Model):
    card = models.ForeignKey(Card, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='card_images')
    position = models.PositiveIntegerField(default=0)
    caption = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ('position', 'created_at')

    created_at = models.DateTimeField(auto_now_add=True)

    def get_image_url(self):
        return settings.WEBSITE_URL + self.image.url


class MapFeature(models.Model):
    """A card's map footprint (spec content.md: "point pins, ordered routes").

    One model for both: consecutive `ROUTE` rows ordered by `position` form a
    polyline (an optionally-labeled vertex is a named stop along it); a
    `POINT` row is an independent pin (a chiesa's single pin, a ricetta's
    "sold here" pins). This covers every type in the spec's table without a
    schema change per type.
    """

    POINT = 'point'
    ROUTE = 'route'

    KIND_CHOICES = (
        (POINT, 'Point'),
        (ROUTE, 'Route'),
    )

    card = models.ForeignKey(Card, related_name='map_features', on_delete=models.CASCADE)
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    position = models.PositiveIntegerField(default=0)
    label = models.CharField(max_length=200, blank=True, default='')
    lat = models.FloatField()
    lng = models.FloatField()

    class Meta:
        ordering = ('position',)


# The card types that have a door (ADR-0008): the only ones that may carry an
# Availability row. Type knowledge in the core, by name, in the same
# `hasattr(card, type)` idiom `maps.CARD_TYPES` uses — the core must not import
# its types (ADR-0004).
ACCESS_TYPES = ('chiese', 'luoghi', 'attivita')

# Of those, the ones whose door is a business's (ADR-0010): what is known is
# its opening hours and nothing else. «Si entra solo durante le funzioni» and
# «chi ha le chiavi» are a church's and a monument's, not a bar's.
HOURS_ONLY_TYPES = ('attivita',)
HOURS_ONLY = "Di un'attività si scrivono solo gli orari."


def hours_only_problem(card, state, keeper, keeper_phone):
    """The message when a business is given more than its hours, or None."""
    if not any(hasattr(card, type_key) for type_key in HOURS_ONLY_TYPES):
        return None
    if state != Availability.UNKNOWN or keeper or keeper_phone:
        return HOURS_ONLY
    return None

GAETA = ZoneInfo('Europe/Rome')


def today_in_gaeta():
    """The date in Gaeta, by name: until `TIME_ZONE` became Europe/Rome (CF1,
    review PR-27) `localdate()` was yesterday in Gaeta between midnight and two
    in the summer (cosa-fare.md Part I §4), and the calendar day of a place's
    hours does not depend on that setting staying put."""
    return timezone.now().astimezone(GAETA).date()


class Availability(models.Model):
    """What is known about getting into a place — ADR-0008, read it before
    changing anything here. Its invariants are the point: no row means
    *unknown*, never open; nothing in it is a time the code reads; `hours` is
    a dated testimony shown with its date, never parsed, never a filter.

    One row per card, owned by the original (spec translations.md T5): a
    translation shows its original's and has none of its own."""

    UNKNOWN = 'unknown'
    SERVICES = 'services'
    ON_REQUEST = 'on_request'
    WORKS = 'works'
    NO_DOOR = 'no_door'

    # None of these means "open", and none may ever be added that does.
    STATE_CHOICES = (
        (UNKNOWN, 'Non sappiamo'),
        (SERVICES, 'Si entra solo durante le funzioni'),
        (ON_REQUEST, 'Si visita su richiesta'),
        (WORKS, 'Chiuso per lavori'),
        (NO_DOOR, "All'aperto, senza porta"),
    )

    card = models.OneToOneField(
        Card, related_name='availability', on_delete=models.CASCADE, primary_key=True
    )
    state = models.CharField(max_length=16, choices=STATE_CHOICES, default=UNKNOWN)
    hours = models.TextField('orari', blank=True, default='')
    # Set by `save()` whenever `hours` changes, never written by a form: it is
    # what turns an old line into an old fact rather than a stale promise.
    hours_updated = models.DateField('orari segnalati il', null=True, blank=True, editable=False)
    keeper = models.CharField('chi ha le chiavi', max_length=140, blank=True, default='')
    keeper_phone = models.CharField(
        'telefono', max_length=32, blank=True, default='',
        validators=[RegexValidator(r'^[0-9+()./\s-]*$', 'Numero di telefono non valido.')],
    )

    class Meta:
        verbose_name = 'accesso'
        verbose_name_plural = 'accessi'

    def __str__(self):
        return f'{self.card.title}: {self.get_state_display()}'

    def clean(self):
        card = self.card
        if not any(hasattr(card, type_key) for type_key in ACCESS_TYPES):
            raise ValidationError('Solo chiese, luoghi e attività hanno orari.')
        if card.translation_of_id is not None:
            raise ValidationError('Gli orari e il custode appartengono alla scheda originale.')
        if self.state == self.NO_DOOR and hasattr(card, 'chiese'):
            raise ValidationError({'state': 'Una chiesa ha sempre una porta.'})
        problem = hours_only_problem(card, self.state, self.keeper, self.keeper_phone)
        if problem:
            raise ValidationError(problem)

    def save(self, *args, **kwargs):
        previous = (
            Availability.objects.filter(pk=self.pk).values_list('hours', flat=True).first()
            if self.pk else None
        )
        if not self.hours.strip():
            self.hours = ''
            self.hours_updated = None
        elif self.hours != previous:
            self.hours_updated = today_in_gaeta()
        super().save(*args, **kwargs)
