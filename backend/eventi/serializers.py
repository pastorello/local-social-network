from urllib.parse import urlparse

from rest_framework import serializers

from account.models import User
from account.serializers import UserSerializer
from common.coordinates import CoordinateField
from content.fields import PlainTextField
from content.serializers import has_english
from feste.models import Edizione
from maps.serializers import named_zones_of

from .models import Evento
from .rules import venue_point, venue_type


def _can_read_draft(request, card):
    user = getattr(request, 'user', None)
    return bool(user and user.is_authenticated and (card.author_id == user.id or user.role == User.ADMIN))


def place_of(evento, request):
    """Where an event is held, the same shape either way: `card` is the venue's
    card (its type and id are the link to its page) or None for CF31's one
    labelled point. A venue's card a reader may not open is no venue for them,
    since its title is part of the draft — the publish rule keeps this rare."""
    card = evento.card
    if card is not None:
        point = venue_point(card)
        if point is None or (not card.is_published and not _can_read_draft(request, card)):
            return None
        return {
            'card': {'id': str(card.id), 'type': venue_type(card), 'title': card.title},
            'label': card.title,
            'lat': point.lat,
            'lng': point.lng,
        }
    if evento.lat is None or evento.lng is None:
        # Its venue's card was deleted (`card` is SET_NULL): the event stays,
        # without a place.
        return None
    return {'card': None, 'label': evento.place_label, 'lat': evento.lat, 'lng': evento.lng}


class EventoSerializer(serializers.ModelSerializer):
    """An event as a reader and its author read it. `kind` tells it apart from a
    feast's edition in the lists that hold both (`/api/eventi/`)."""

    kind = serializers.SerializerMethodField()
    start_time = serializers.TimeField(format='%H:%M', allow_null=True)
    poster = serializers.SerializerMethodField()
    place = serializers.SerializerMethodField()
    zones = serializers.SerializerMethodField()
    is_over = serializers.BooleanField(read_only=True)
    author = UserSerializer(read_only=True)

    def get_kind(self, obj):
        return 'evento'

    def get_poster(self, obj):
        return obj.get_poster_url()

    def get_place(self, obj):
        return place_of(obj, self.context.get('request'))

    def get_zones(self, obj):
        # The editorial zone it is in, by name, for the eyebrow over its page —
        # a place's own rule (D2), by its point.
        place = self.get_place(obj)
        return named_zones_of([place], self.context) if place else []

    class Meta:
        model = Evento
        fields = (
            'kind', 'id', 'title', 'start_date', 'start_time', 'end_date', 'description',
            'poster', 'link', 'place', 'zones', 'state', 'is_published', 'is_over', 'author',
            'created_at', 'updated_at',
        )


class EdizioneItemSerializer(serializers.ModelSerializer):
    """A feast's edition in a list of what is on: its card's title and the
    link to it, since the card is what it is about (D9, K2)."""

    kind = serializers.SerializerMethodField()
    title = serializers.CharField(source='festa.card.title')
    festa = serializers.UUIDField(source='festa_id')
    # The feast's card in English, for an English reader's «EN» (review
    # PR-19b). An event has no translation, and so no such field.
    has_en = serializers.SerializerMethodField()

    def get_kind(self, obj):
        return 'edizione'

    def get_has_en(self, obj):
        return has_english(obj.festa.card)

    class Meta:
        model = Edizione
        fields = ('kind', 'id', 'title', 'festa', 'has_en', 'start_date', 'end_date', 'note')


class PlaceSerializer(serializers.Serializer):
    """The `place` JSON object a write sends beside the multipart form, like a
    card's pins: `{card}` for a card of the archive, `{lat, lng, label}` for
    one labelled point (CF31). Which one, and the rest, is `rules.place_problem`."""

    card = serializers.UUIDField(required=False, allow_null=True, default=None)
    lat = CoordinateField('lat', required=False, allow_null=True, default=None)
    lng = CoordinateField('lng', required=False, allow_null=True, default=None)
    label = PlainTextField(max_length=140, required=False, allow_blank=True, default='')


class EventoWriteSerializer(serializers.Serializer):
    """Plain, like the type apps': the poster and the place are handled by the
    view (eventi/api.py). `state` is read on an update only — a new event is
    in programma (CF28)."""

    title = serializers.CharField(max_length=200)
    start_date = serializers.DateField()
    start_time = serializers.TimeField(required=False, allow_null=True, default=None)
    end_date = serializers.DateField(required=False, allow_null=True, default=None)
    description = PlainTextField(max_length=300, required=False, allow_blank=True, default='')
    link = serializers.URLField(max_length=500, required=False, allow_blank=True, default='')
    is_published = serializers.BooleanField(required=False, default=False)
    state = serializers.ChoiceField(choices=Evento.STATE_CHOICES, required=False)

    def validate_link(self, value):
        # A plain `<a>` on our page (CF32): the web's own schemes only.
        if value and urlparse(value).scheme not in ('http', 'https'):
            raise serializers.ValidationError('Un indirizzo che comincia con https://.')
        return value
