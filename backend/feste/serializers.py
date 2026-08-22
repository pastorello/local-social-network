from rest_framework import serializers

from account.serializers import UserSerializer
from content.models import CardImage, MapFeature
from content.sanitize import sanitize_html

from .models import Feste


class CardImageSerializer(serializers.ModelSerializer):
    imageURL = serializers.SerializerMethodField()

    def get_imageURL(self, obj):
        return obj.get_image_url()

    class Meta:
        model = CardImage
        fields = ('id', 'imageURL', 'position', 'caption')


def _map_point(feature):
    return {'lat': feature.lat, 'lng': feature.lng, 'label': feature.label}


class RoutePointSerializer(serializers.Serializer):
    """Validates one entry of the `route` JSON array a create/update request
    sends alongside the multipart form (see feste/api.py)."""

    lat = serializers.FloatField(min_value=-90.0, max_value=90.0)
    lng = serializers.FloatField(min_value=-180.0, max_value=180.0)
    label = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')


class FesteReadSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pk', read_only=True)
    title = serializers.CharField(source='card.title')
    body_html = serializers.CharField(source='card.body_html')
    author = UserSerializer(source='card.author', read_only=True)
    is_published = serializers.BooleanField(source='card.is_published')
    created_at = serializers.DateTimeField(source='card.created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='card.updated_at', read_only=True)
    images = serializers.SerializerMethodField()
    route = serializers.SerializerMethodField()
    pins = serializers.SerializerMethodField()

    def get_images(self, obj):
        return CardImageSerializer(obj.card.images.all(), many=True).data

    def get_route(self, obj):
        points = obj.card.map_features.filter(kind=MapFeature.ROUTE).order_by('position')
        return [_map_point(p) for p in points]

    def get_pins(self, obj):
        points = obj.card.map_features.filter(kind=MapFeature.POINT)
        return [_map_point(p) for p in points]

    class Meta:
        model = Feste
        fields = (
            'id', 'title', 'body_html', 'author', 'is_published',
            'recurrence', 'programme', 'images', 'route', 'pins',
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
    recurrence = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    programme = serializers.CharField(required=False, allow_blank=True, default='')
    is_published = serializers.BooleanField(required=False, default=False)

    def validate_body_html(self, value):
        return sanitize_html(value)
