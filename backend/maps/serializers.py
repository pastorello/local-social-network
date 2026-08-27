from rest_framework import serializers

from .models import Overlay


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
