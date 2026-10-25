from rest_framework import serializers

from account.serializers import UserSerializer
from content.serializers import (
    CardImageSerializer, TranslationSerializer, has_english, media_source, visible_translations,
)
from content.fields import PlainTextField
from content.sanitize import sanitize_html

from .models import Termine


class TermineReadSerializer(serializers.ModelSerializer):
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
    translations = serializers.SerializerMethodField()
    has_en = serializers.SerializerMethodField()
    original_title = serializers.SerializerMethodField()

    def get_images(self, obj):
        return CardImageSerializer(media_source(obj.card).images.all(), many=True).data

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
        model = Termine
        fields = (
            'id', 'title', 'body_html', 'author', 'is_published',
            'meaning', 'example_usage', 'images',
            'language', 'translation_of', 'original_title', 'translations', 'has_en',
            'created_at', 'updated_at',
        )


class TermineWriteSerializer(serializers.Serializer):
    """No map handling here at all (spec content.md: dialetto's map footprint
    is 'none') — this app never imports content.api_helpers's point functions."""

    title = serializers.CharField(max_length=200)
    body_html = serializers.CharField(allow_blank=True)
    meaning = PlainTextField()
    example_usage = PlainTextField(required=False, allow_blank=True, default='')
    is_published = serializers.BooleanField(required=False, default=False)

    def validate_body_html(self, value):
        return sanitize_html(value)
