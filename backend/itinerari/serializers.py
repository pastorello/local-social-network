import html
import re

from django.utils.html import strip_tags
from rest_framework import serializers

from account.models import User
from account.serializers import UserSerializer
from content.fields import PlainTextField
from content.models import ACCESS_TYPES, MapFeature
from content.sanitize import sanitize_html
from content.serializers import (
    CardImageSerializer,
    TranslationSerializer,
    availability_of,
    has_english,
    media_source,
    visible_translations,
)
from maps.api import STOP_TYPES
from maps.models import Zona
from maps.zones import named_zones_containing_any, zones_containing_any

from .models import Intent, Itinerario


def card_type(card):
    """The key the SPA routes a card by — the same lookup as the map's, over
    the types that can be stops (I3): those with a place, but a business."""
    for type_key in STOP_TYPES:
        if hasattr(card, type_key):
            return type_key
    return None


def _card_points(card):
    # Filtered in Python: the features are prefetched with the stop's card.
    return [f for f in card.map_features.all() if f.kind == MapFeature.POINT]


def _chosen_point(stop, points):
    """The pin the stop names, found among the card's prefetched pins rather
    than through `stop.point`, which would be a query per stop. None when no
    pin was chosen or the chosen one was deleted since (`SET_NULL`)."""
    if stop.point_id is None:
        return None
    return next((f for f in points if f.pk == stop.point_id), None)


def _live_point_index(stop):
    """What the form's select holds: the chosen pin's place in the card's list
    *now*, which moves when an earlier pin is removed (TD-50) — the stop does
    not. None when the pin is gone, so the form sends nothing stale back."""
    points = _card_points(stop.card)
    chosen = _chosen_point(stop, points)
    return points.index(chosen) if chosen is not None else None


def _stop_places(stop):
    points = _card_points(stop.card)
    chosen = _chosen_point(stop, points)
    if chosen is not None:
        points = [chosen]
    if not points:
        # A festa has no pins, only its route: its place is where it starts.
        start = stop_point(stop.card)
        return [start] if start else []
    return [{'lat': f.lat, 'lng': f.lng, 'label': f.label} for f in points]


def stop_point(card, chosen=None):
    """Where a stop is: the card's chosen pin, else its first point, else —
    for a festa — the start of its route. The card's own map features, in
    their stored order (prefetched by the caller)."""
    features = list(card.map_features.all())
    points = [f for f in features if f.kind == MapFeature.POINT]
    route = [f for f in features if f.kind == MapFeature.ROUTE]
    if chosen is None:
        chosen = points[0] if points else route[0] if route else None
    if chosen is None:
        return None
    return {'lat': chosen.lat, 'lng': chosen.lng, 'label': chosen.label}


# What the guided mode reads at a stop before «Leggi la scheda» (review PR-7):
# the opening of the card's body, at most this many characters.
EXCERPT_LENGTH = 400
# Where a block ends a line ends, so a heading does not run into its paragraph.
_BLOCK_END = re.compile(r'</(?:p|h2|h3|li|blockquote)>|<br\s*/?>|<hr\s*/?>')


def excerpt(body_html, limit=EXCERPT_LENGTH):
    """The opening of a card's body as plain text — no markup, one line per
    block — cut at a word and closed with an ellipsis when there is more. Plain
    text on purpose: the SPA renders it as text, so `RichText.vue` stays the
    one place a body is rendered as HTML (ADR-0001's amendment)."""
    text = html.unescape(strip_tags(_BLOCK_END.sub('\n', body_html)))
    text = '\n'.join(filter(None, (' '.join(line.split()) for line in text.splitlines())))
    if len(text) <= limit:
        return text
    cut = text[:limit]
    word_end = max(cut.rfind(' '), cut.rfind('\n'))
    if word_end > 0:
        cut = cut[:word_end]
    return cut.rstrip(' \n,;:.') + '…'


def _cover(card):
    # D5: a card's first image is its cover. From the prefetched images.
    first = next(iter(card.images.all()), None)
    return CardImageSerializer(first).data if first is not None else None


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
    name_plural_en = serializers.CharField(source='name_en', read_only=True)

    class Meta:
        model = Intent
        fields = (
            'slug', 'name', 'name_plural', 'name_en', 'name_plural_en', 'description',
            'description_en', 'count',
        )


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
    intent_labels_en = serializers.SerializerMethodField()
    stops = serializers.SerializerMethodField()
    route = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    translations = serializers.SerializerMethodField()
    has_en = serializers.SerializerMethodField()
    original_title = serializers.SerializerMethodField()
    zones = serializers.SerializerMethodField()

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

    # In the same order, each blank where the author has not written one: the
    # SPA reads the Italian beside it then (review PR-19a).
    def get_intent_labels_en(self, obj):
        return [intent.name_en for intent in self._original(obj).intents.all()]

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
            type_key = card_type(stop.card)
            point = stop_point(stop.card, _chosen_point(stop, _card_points(stop.card)))
            stops.append({
                'card': str(stop.card_id),
                'type': type_key,
                'title': stop.card.title,
                'is_published': stop.card.is_published,
                'point_index': _live_point_index(stop),
                'point': point,
                # Every place the stop stands for: the chosen one, or — with no
                # choice made — all of the card's pins, so a raccolta can list
                # each bakery a dish is sold at (decided 2026-09-19).
                'places': _stop_places(stop),
                # A luogo says how to reach it; the raccolta shows it per stop.
                'how_to_get_there': getattr(getattr(stop.card, 'luoghi', None), 'how_to_get_there', ''),
                'note': stop.note,
                # What the guided mode shows of the stop itself (review PR-7),
                # so a guest reads it without a second tap: the cover if there
                # is one, the body's opening, and — for a place with a door —
                # what is known about getting in (ADR-0008: `unknown` when
                # nothing is, never "open").
                'cover': _cover(stop.card),
                'excerpt': excerpt(stop.card.body_html),
                'availability': availability_of(stop.card) if type_key in ACCESS_TYPES else None,
                # The zones the stop's own point is in, by name: the last
                # stop's first one is where «Cosa c'è qui intorno» leads.
                'zones': named_zones_containing_any(self._zones(), [point]) if point else [],
            })
        return stops

    def _zones(self):
        # Read once per response, not once per tour or per stop.
        if 'zones' not in self.context:
            self.context['zones'] = list(Zona.objects.all())
        return self.context['zones']

    def get_zones(self, obj):
        """The editorial zones the tour belongs to (spec cosa-fare.md Part −1,
        D2), from the stops a reader is shown: a percorso where it *starts*, a
        raccolta wherever *any* of its stops is — a raccolta has no order, so
        its "first" stop is only the one clicked first."""
        zones = self._zones()
        tour = self._original(obj)
        stops = [stop for stop in tour.stops.all() if stop.card.is_published]
        if not stops:
            return []
        if tour.form == Itinerario.PERCORSO:
            start = stops[0]
            point = stop_point(start.card, _chosen_point(start, _card_points(start.card)))
            return zones_containing_any(zones, [point] if point else [])
        return zones_containing_any(zones, [place for stop in stops for place in _stop_places(stop)])

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

    def get_has_en(self, obj):
        return has_english(obj.card)

    def get_translations(self, obj):
        request = self.context.get('request')
        return TranslationSerializer(visible_translations(obj.card, request), many=True).data

    class Meta:
        model = Itinerario
        fields = (
            'id', 'title', 'body_html', 'author', 'is_published',
            'form', 'duration', 'intents', 'intent_labels', 'intent_labels_en', 'stops', 'route',
            'images', 'language', 'translation_of', 'original_title', 'translations', 'has_en',
            'zones',
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
