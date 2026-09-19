from rest_framework import serializers

from account.models import User
from account.serializers import UserSerializer
from content.fields import PlainTextField
from content.models import MapFeature
from content.sanitize import sanitize_html
from content.serializers import CardImageSerializer, TranslationSerializer, media_source, visible_translations
from maps.api import CARD_TYPES

from .models import Intent, Itinerario


def card_type(card):
    """The key the SPA routes a card by — the same lookup as the map's, over
    the types that have a place, since only those can be stops (I3)."""
    for type_key in CARD_TYPES:
        if hasattr(card, type_key):
            return type_key
    return None


def _live_point_index(stop):
    """The stop's chosen point, if the card still has it. Its author may have
    removed that pin since; `stop_point` then shows the first one, and handing
    back the old index would make the form send it again and every save of the
    tour fail with "il punto scelto non esiste"."""
    if stop.point_index is None:
        return None
    points = [f for f in stop.card.map_features.all() if f.kind == MapFeature.POINT]
    return stop.point_index if stop.point_index < len(points) else None


def _stop_places(stop):
    points = [f for f in stop.card.map_features.all() if f.kind == MapFeature.POINT]
    index = _live_point_index(stop)
    chosen = [points[index]] if index is not None else points
    if not chosen:
        # A festa has no pins, only its route: its place is where it starts.
        start = stop_point(stop.card, None)
        return [start] if start else []
    return [{'lat': f.lat, 'lng': f.lng, 'label': f.label} for f in chosen]


def stop_point(card, point_index):
    """Where a stop is: the card's chosen point, else its first point, else —
    for a festa — the start of its route. The card's own map features, in
    their stored order (prefetched by the caller)."""
    features = list(card.map_features.all())
    points = [f for f in features if f.kind == MapFeature.POINT]
    route = [f for f in features if f.kind == MapFeature.ROUTE]
    if point_index is not None and point_index < len(points):
        chosen = points[point_index]
    elif points:
        chosen = points[0]
    elif route:
        chosen = route[0]
    else:
        return None
    return {'lat': chosen.lat, 'lng': chosen.lng, 'label': chosen.label}


def _is_owner(request, card):
    user = getattr(request, 'user', None)
    return bool(
        user and user.is_authenticated and (card.author_id == user.id or user.role == User.ADMIN)
    )


class IntentSerializer(serializers.ModelSerializer):
    # How many published itineraries carry it: the landing shows only the
    # intents that lead somewhere (I5). `name_plural` is the same string, so
    # the generic list's filter can read intents the way it reads genres.
    count = serializers.IntegerField(read_only=True)
    name_plural = serializers.CharField(source='name', read_only=True)

    class Meta:
        model = Intent
        fields = ('slug', 'name', 'name_plural', 'description', 'count')


class ItinerarioReadSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pk', read_only=True)
    title = serializers.CharField(source='card.title')
    body_html = serializers.CharField(source='card.body_html')
    author = UserSerializer(source='card.author', read_only=True)
    is_published = serializers.BooleanField(source='card.is_published')
    created_at = serializers.DateTimeField(source='card.created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='card.updated_at', read_only=True)
    language = serializers.CharField(source='card.language', read_only=True)
    translation_of = serializers.PrimaryKeyRelatedField(source='card.translation_of', read_only=True)
    form = serializers.SerializerMethodField()
    intents = serializers.SerializerMethodField()
    intent_labels = serializers.SerializerMethodField()
    stops = serializers.SerializerMethodField()
    route = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    translations = serializers.SerializerMethodField()
    original_title = serializers.SerializerMethodField()

    # A translation shows its original's stops, path, form and intents, as it
    # shows its original's photographs (translations.md T5): the tour is the
    # same walk in every language; only the words change.
    def _original(self, obj):
        source = media_source(obj.card)
        return obj if source.pk == obj.card.pk else source.itinerari

    def get_form(self, obj):
        return self._original(obj).form

    def get_intents(self, obj):
        return [intent.slug for intent in self._original(obj).intents.all()]

    def get_intent_labels(self, obj):
        return [intent.name for intent in self._original(obj).intents.all()]

    def get_stops(self, obj):
        """I4: a reader never meets a stop they cannot open — a stop whose card
        has since been unpublished is left out for them, and kept, flagged,
        for the tour's author and for admins, who have to fix it."""
        request = self.context.get('request')
        owner = _is_owner(request, obj.card)
        stops = []
        for stop in self._original(obj).stops.all():
            if not stop.card.is_published and not owner:
                continue
            stops.append({
                'card': str(stop.card_id),
                'type': card_type(stop.card),
                'title': stop.card.title,
                'is_published': stop.card.is_published,
                'point_index': _live_point_index(stop),
                'point': stop_point(stop.card, stop.point_index),
                # Every place the stop stands for: the chosen one, or — with no
                # choice made — all of the card's pins, so a raccolta can list
                # each bakery a dish is sold at (decided 2026-09-19).
                'places': _stop_places(stop),
                # A luogo says how to reach it; the raccolta shows it per stop.
                'how_to_get_there': getattr(getattr(stop.card, 'luoghi', None), 'how_to_get_there', ''),
                'note': stop.note,
            })
        return stops

    def get_route(self, obj):
        # The walked path between the stops (I8), stored as the card's route
        # like a festa's. A raccolta has none.
        # Filtered in Python, not with .filter(): the features are prefetched,
        # and a query here ran once per tour in the list.
        route = [f for f in media_source(obj.card).map_features.all() if f.kind == MapFeature.ROUTE]
        return [{'lat': p.lat, 'lng': p.lng, 'label': p.label} for p in route]

    def get_images(self, obj):
        return CardImageSerializer(media_source(obj.card).images.all(), many=True).data

    def get_original_title(self, obj):
        return media_source(obj.card).title

    def get_translations(self, obj):
        request = self.context.get('request')
        return TranslationSerializer(visible_translations(obj.card, request), many=True).data

    class Meta:
        model = Itinerario
        fields = (
            'id', 'title', 'body_html', 'author', 'is_published',
            'form', 'duration', 'intents', 'intent_labels', 'stops', 'route',
            'images', 'language', 'translation_of', 'original_title', 'translations',
            'created_at', 'updated_at',
        )


class ItinerarioWriteSerializer(serializers.Serializer):
    """Plain Serializer, like every type's: it writes across Card+Itinerario at
    once. Stops, intents and the path arrive as JSON strings beside the
    multipart images and are handled by the view (itinerari/api.py)."""

    title = serializers.CharField(max_length=200)
    body_html = serializers.CharField(allow_blank=True)
    form = serializers.ChoiceField(choices=Itinerario.FORM_CHOICES, required=False, default=Itinerario.PERCORSO)
    duration = PlainTextField(max_length=100, required=False, allow_blank=True, default='')
    is_published = serializers.BooleanField(required=False, default=False)

    def validate_body_html(self, value):
        return sanitize_html(value)
