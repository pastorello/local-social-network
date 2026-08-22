import uuid

from django.conf import settings
from django.db import models

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

    # C4 plumbing only (spec translations.md) — nothing writes to these yet.
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
