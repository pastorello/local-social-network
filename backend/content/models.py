import uuid

from django.conf import settings
from django.db import models
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
