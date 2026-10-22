from rest_framework import serializers

from .models import Overlay, Zona
from .zones import named_zones_containing_any


def named_zones_of(points, context):
    """The editorial zones a place's pins are in (spec cosa-fare.md Part −1,
    D2), as `{slug, name}`, for a type's Read serializer. The zones are read
    once per response and kept in the serializer's context, as itinerari's
    are, so a list does not query them once per row."""
    if 'zones' not in context:
        context['zones'] = list(Zona.objects.all())
    return named_zones_containing_any(context['zones'], points)


class OverlaySerializer(serializers.ModelSerializer):
    """Note what is *not* here: `visibility`.

    The queryset already decided what this reader may see (spec politics.md:
    "no API field ever reveals that the tier exists"), so the field would only
    tell the client something it must not act on anyway — the gate is
    server-side, and a client that never learns the vocabulary cannot leak it.
    """

    imageURL = serializers.SerializerMethodField()
    bounds = serializers.SerializerMethodField()

    def get_imageURL(self, obj):
        return obj.get_image_url()

    def get_bounds(self, obj):
        return obj.bounds

    class Meta:
        model = Overlay
        fields = ('id', 'name', 'kind', 'position', 'geojson', 'color', 'imageURL', 'bounds', 'opacity')
