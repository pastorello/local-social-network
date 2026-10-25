from rest_framework import serializers

from account.serializers import UserSerializer
from content.models import MapFeature
from content.serializers import (
    CardImageSerializer, TranslationSerializer, has_english, media_source, visible_translations,
)
from content.fields import PlainTextField
from content.sanitize import sanitize_html

from .models import Personaggio


def _map_point(feature):
    # The id goes back with the pin when the form saves, so the pin stays the
    # same row and a tour stop on it stays on it (TD-50).
    return {'id': feature.pk, 'lat': feature.lat, 'lng': feature.lng, 'label': feature.label}


class PersonaggioReadSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pk', read_only=True)
    title = serializers.CharField(source='card.title')
    body_html = serializers.CharField(source='card.body_html')
    author = UserSerializer(source='card.author', read_only=True)
    is_published = serializers.BooleanField(source='card.is_published')
    created_at = serializers.DateTimeField(source='card.created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='card.updated_at', read_only=True)
    language = serializers.CharField(source='card.language', read_only=True)
    translation_of = serializers.PrimaryKeyRelatedField(source='card.translation_of', read_only=True)
    images = serializers.SerializerMethodField()
    pins = serializers.SerializerMethodField()
    translations = serializers.SerializerMethodField()
    has_en = serializers.SerializerMethodField()
    original_title = serializers.SerializerMethodField()

    def get_images(self, obj):
        return CardImageSerializer(media_source(obj.card).images.all(), many=True).data

    def get_pins(self, obj):
        points = media_source(obj.card).map_features.filter(kind=MapFeature.POINT)
        return [_map_point(p) for p in points]

    def get_original_title(self, obj):
        # The card group's name, which is the original's title (2026-09-09):
        # a reader of the English version needs the Italian name, because the
        # signs in Gaeta are in Italian and a fully translated title is how a
        # tourist fails to find the place. For an original this is its own
        # title, so callers need no special case.
        return media_source(obj.card).title

    def get_has_en(self, obj):
        return has_english(obj.card)

    def get_translations(self, obj):
        request = self.context.get('request')
        return TranslationSerializer(visible_translations(obj.card, request), many=True).data

    class Meta:
        model = Personaggio
        fields = (
            'id', 'title', 'body_html', 'author', 'is_published',
            'life_dates', 'images', 'pins', 'language', 'translation_of', 'original_title', 'translations',
            'has_en',
            'created_at', 'updated_at',
        )


class PersonaggioWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    body_html = serializers.CharField(allow_blank=True)
    life_dates = PlainTextField(max_length=200, required=False, allow_blank=True, default='')
    is_published = serializers.BooleanField(required=False, default=False)

    def validate_body_html(self, value):
        return sanitize_html(value)
