from rest_framework import serializers

from account.serializers import UserSerializer
from content.fields import PlainTextField
from content.models import MapFeature
from content.sanitize import sanitize_html
from content.serializers import (
    CardImageSerializer, TranslationSerializer, availability_of, media_source, visible_translations,
)
from maps.serializers import named_zones_of

from .models import Genre, Luogo


def _map_point(feature):
    # The id goes back with the pin when the form saves, so the pin stays the
    # same row and a tour stop on it stays on it (TD-50).
    return {'id': feature.pk, 'lat': feature.lat, 'lng': feature.lng, 'label': feature.label}


class GenreSerializer(serializers.ModelSerializer):
    # How many published places carry the genre, so the list's filter can
    # leave out a heading with nothing under it.
    count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Genre
        fields = ('slug', 'name', 'name_plural', 'name_en', 'name_plural_en', 'count')


class LuogoReadSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pk', read_only=True)
    title = serializers.CharField(source='card.title')
    body_html = serializers.CharField(source='card.body_html')
    author = UserSerializer(source='card.author', read_only=True)
    is_published = serializers.BooleanField(source='card.is_published')
    created_at = serializers.DateTimeField(source='card.created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='card.updated_at', read_only=True)
    language = serializers.CharField(source='card.language', read_only=True)
    translation_of = serializers.PrimaryKeyRelatedField(source='card.translation_of', read_only=True)
    genre = serializers.SerializerMethodField()
    genre_label = serializers.SerializerMethodField()
    genre_label_en = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    pins = serializers.SerializerMethodField()
    translations = serializers.SerializerMethodField()
    original_title = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    zones = serializers.SerializerMethodField()

    def get_availability(self, obj):
        return availability_of(obj.card)

    # A translation shows the original's genre, as it shows the original's pin
    # (spec translations.md T5): what kind of place it is belongs to the place,
    # not to the language it is described in.
    def _genre(self, obj):
        source = media_source(obj.card)
        return obj.genre if source.pk == obj.card.pk else source.luoghi.genre

    def get_genre(self, obj):
        return self._genre(obj).slug

    def get_genre_label(self, obj):
        return self._genre(obj).name

    # Blank until the author writes it: the SPA reads the Italian then
    # (review PR-19a).
    def get_genre_label_en(self, obj):
        return self._genre(obj).name_en

    def get_images(self, obj):
        return CardImageSerializer(media_source(obj.card).images.all(), many=True).data

    def get_pins(self, obj):
        points = media_source(obj.card).map_features.filter(kind=MapFeature.POINT)
        return [_map_point(p) for p in points]

    def get_zones(self, obj):
        # Where the place is, by its pin — the original's, for a translation
        # (T5) — named for «Dove si trova» (review PR-3). Filtered in Python:
        # the features are prefetched.
        points = [f for f in media_source(obj.card).map_features.all() if f.kind == MapFeature.POINT]
        return named_zones_of([{'lat': p.lat, 'lng': p.lng} for p in points], self.context)

    def get_original_title(self, obj):
        return media_source(obj.card).title

    def get_translations(self, obj):
        request = self.context.get('request')
        return TranslationSerializer(visible_translations(obj.card, request), many=True).data

    class Meta:
        model = Luogo
        fields = (
            'id', 'title', 'body_html', 'author', 'is_published',
            'genre', 'genre_label', 'genre_label_en', 'how_to_get_there', 'availability',
            'images', 'pins', 'zones', 'language', 'translation_of', 'original_title', 'translations',
            'created_at', 'updated_at',
        )


class LuogoWriteSerializer(serializers.Serializer):
    """Plain Serializer, not a ModelSerializer — same reasoning as
    FesteWriteSerializer: it writes across Card+Luogo at once, and images/pins
    are handled by the view (see luoghi/api.py)."""

    title = serializers.CharField(max_length=200)
    body_html = serializers.CharField(allow_blank=True)
    genre = serializers.SlugRelatedField(slug_field='slug', queryset=Genre.objects.all())
    how_to_get_there = PlainTextField(required=False, allow_blank=True, default='')
    is_published = serializers.BooleanField(required=False, default=False)

    def validate_body_html(self, value):
        return sanitize_html(value)
