from rest_framework import serializers

from account.serializers import UserSerializer
from common.coordinates import CoordinateField
from content.models import MapFeature
from content.serializers import CardImageSerializer, TranslationSerializer, media_source, visible_translations
from content.fields import PlainTextField
from content.sanitize import sanitize_html
from maps.serializers import named_zones_of

from .models import Feste


def _map_point(feature):
    return {'lat': feature.lat, 'lng': feature.lng, 'label': feature.label}


class RoutePointSerializer(serializers.Serializer):
    """Validates one entry of the `route` JSON array a create/update request
    sends alongside the multipart form (see feste/api.py)."""

    lat = CoordinateField('lat')
    lng = CoordinateField('lng')
    label = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')


class FesteReadSerializer(serializers.ModelSerializer):
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
    route = serializers.SerializerMethodField()
    pins = serializers.SerializerMethodField()
    translations = serializers.SerializerMethodField()
    original_title = serializers.SerializerMethodField()
    zones = serializers.SerializerMethodField()

    def get_images(self, obj):
        return CardImageSerializer(media_source(obj.card).images.all(), many=True).data

    def get_route(self, obj):
        points = media_source(obj.card).map_features.filter(kind=MapFeature.ROUTE).order_by('position')
        return [_map_point(p) for p in points]

    def get_pins(self, obj):
        points = media_source(obj.card).map_features.filter(kind=MapFeature.POINT)
        return [_map_point(p) for p in points]

    def get_zones(self, obj):
        # The zones its procession stops in, by name — D2's rule for a festa,
        # as on the map (maps/zones.py::zones_of_feature) — for the eyebrow
        # over its page (review PR-23). A translation walks its original's
        # route (T5), so it is where the original is.
        return named_zones_of(self.get_route(obj), self.context)

    def get_original_title(self, obj):
        # The card group's name, which is the original's title (2026-09-09):
        # a reader of the English version needs the Italian name, because the
        # signs in Gaeta are in Italian and a fully translated title is how a
        # tourist fails to find the place. For an original this is its own
        # title, so callers need no special case.
        return media_source(obj.card).title

    def get_translations(self, obj):
        request = self.context.get('request')
        return TranslationSerializer(visible_translations(obj.card, request), many=True).data

    class Meta:
        model = Feste
        fields = (
            'id', 'title', 'body_html', 'author', 'is_published',
            'recurrence', 'programme', 'images', 'route', 'pins',
            'language', 'translation_of', 'original_title', 'translations', 'zones',
            'created_at', 'updated_at',
        )


class FestePinSerializer(serializers.Serializer):
    """Slim payload for a future map layer (C5) — kept tiny on purpose, mirrors
    reports' ReportPinSerializer."""

    id = serializers.UUIDField(source='pk')
    title = serializers.CharField(source='card.title')


class FesteWriteSerializer(serializers.Serializer):
    """Plain Serializer, not a ModelSerializer: it writes across two models
    (Card + Feste) at once, and images/route are handled by the view (see
    feste/api.py) rather than fought into this serializer's multipart handling."""

    title = serializers.CharField(max_length=200)
    body_html = serializers.CharField(allow_blank=True)
    recurrence = PlainTextField(max_length=200, required=False, allow_blank=True, default='')
    programme = PlainTextField(required=False, allow_blank=True, default='')
    is_published = serializers.BooleanField(required=False, default=False)

    def validate_body_html(self, value):
        return sanitize_html(value)
