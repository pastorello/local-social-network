"""Read-side serializer shared by every type app (ADR-0004) — content has no
urls.py/api.py of its own, but this mirrors api_helpers.py's role for the
write path: one implementation instead of one per type."""

from rest_framework import serializers

from .models import CardImage


class CardImageSerializer(serializers.ModelSerializer):
    imageURL = serializers.SerializerMethodField()

    def get_imageURL(self, obj):
        return obj.get_image_url()

    class Meta:
        model = CardImage
        fields = ('id', 'imageURL', 'position', 'caption')
