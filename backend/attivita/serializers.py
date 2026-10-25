from rest_framework import serializers

from account.serializers import UserSerializer
from content.fields import PlainTextField
from content.models import MapFeature
from content.sanitize import sanitize_html
from content.serializers import (
    CardImageSerializer, TranslationSerializer, availability_of, media_source, visible_translations,
)
from maps.serializers import named_zones_of

from .models import Attivita


def _map_point(feature):
    # The id goes back with the pin when the form saves, so the pin stays the
    # same row (TD-50).
    return {'id': feature.pk, 'lat': feature.lat, 'lng': feature.lng, 'label': feature.label}


class AttivitaReadSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pk', read_only=True)
    title = serializers.CharField(source='card.title')
    body_html = serializers.CharField(source='card.body_html')
    author = UserSerializer(source='card.author', read_only=True)
    is_published = serializers.BooleanField(source='card.is_published')
    created_at = serializers.DateTimeField(source='card.created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='card.updated_at', read_only=True)
    language = serializers.CharField(source='card.language', read_only=True)
    translation_of = serializers.PrimaryKeyRelatedField(source='card.translation_of', read_only=True)
    kind = serializers.SerializerMethodField()
    kind_label = serializers.SerializerMethodField()
    kind_label_en = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    pins = serializers.SerializerMethodField()
    translations = serializers.SerializerMethodField()
    original_title = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    zones = serializers.SerializerMethodField()

    def get_availability(self, obj):
        return availability_of(obj.card)

    # A translation shows the original's kind, as it shows the original's pin
    # (spec translations.md T5): what a place is belongs to the place.
    def _kind(self, obj):
        source = media_source(obj.card)
        return obj if source.pk == obj.card.pk else source.attivita

    def get_kind(self, obj):
        return self._kind(obj).kind

    def get_kind_label(self, obj):
        return self._kind(obj).get_kind_display()

    def get_kind_label_en(self, obj):
        return Attivita.KIND_NAMES_EN[self._kind(obj).kind]

    def get_images(self, obj):
        return CardImageSerializer(media_source(obj.card).images.all(), many=True).data

    def get_pins(self, obj):
        points = media_source(obj.card).map_features.filter(kind=MapFeature.POINT)
        return [_map_point(p) for p in points]

    def get_zones(self, obj):
        # Where it is, by its pin — the original's, for a translation (T5) —
        # named, as a luogo's are. Filtered in Python: the features are
        # prefetched.
        points = [f for f in media_source(obj.card).map_features.all() if f.kind == MapFeature.POINT]
        return named_zones_of([{'lat': p.lat, 'lng': p.lng} for p in points], self.context)

    def get_original_title(self, obj):
        return media_source(obj.card).title

    def get_translations(self, obj):
        request = self.context.get('request')
        return TranslationSerializer(visible_translations(obj.card, request), many=True).data

    class Meta:
        model = Attivita
        fields = (
            'id', 'title', 'body_html', 'author', 'is_published',
            'kind', 'kind_label', 'kind_label_en', 'how_to_get_there', 'availability',
            'images', 'pins', 'zones', 'language', 'translation_of', 'original_title', 'translations',
            'created_at', 'updated_at',
        )


class AttivitaWriteSerializer(serializers.Serializer):
    """Plain Serializer, not a ModelSerializer — same reasoning as
    FesteWriteSerializer: it writes across Card+Attivita at once, and
    images/pins are handled by the view (see attivita/api.py)."""

    title = serializers.CharField(max_length=200)
    body_html = serializers.CharField(allow_blank=True)
    # Closed in code (ADR-0010): anything but the three is a 400, never a new kind.
    kind = serializers.ChoiceField(choices=Attivita.KIND_CHOICES)
    how_to_get_there = PlainTextField(required=False, allow_blank=True, default='')
    is_published = serializers.BooleanField(required=False, default=False)

    def validate_body_html(self, value):
        return sanitize_html(value)
