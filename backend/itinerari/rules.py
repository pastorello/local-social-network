"""The rules a tour's stops obey, in one place for both write paths: the API
(`api.py`) and Django admin (`admin.py`). Until TD-49 only the API knew them,
so the admin's stop inline could make a dialect word a stop or publish a tour
whose stops were drafts. Each returns the message to show, or None."""

from content.models import MapFeature
from maps.api import CARD_TYPES, STOP_TYPES

from .serializers import card_type


def stop_card_problem(card):
    """I3: a stop is a card of the archive that has a place — an original,
    since a translation is the same place under another name. A card of a type
    with no place, and another tour (a drawn path, but not somewhere to go),
    are not stops. Nor is a business, which has a place: a tour that chose
    one bar among many would rank them, and CF40 forbids it (ADR-0010)."""
    if card.translation_of_id is not None:
        return f'«{card.title}» è una traduzione: la tappa è la scheda originale.'
    # On the map but not a stop. Today that is only the businesses; a type
    # that joins them here owes its own sentence.
    if any(hasattr(card, type_key) for type_key in CARD_TYPES if type_key not in STOP_TYPES):
        return (
            f'«{card.title}» è un’attività: un itinerario non sceglie fra le attività, '
            'quindi non può essere una tappa.'
        )
    if card_type(card) is None or not card.map_features.all():
        return f'«{card.title}» non ha un luogo sulla mappa, quindi non può essere una tappa.'
    return None


def stop_point_problem(card, point):
    """The chosen pin, if any, is one of this card's own point pins."""
    if point is not None and (point.card_id != card.pk or point.kind != MapFeature.POINT):
        return f'Il punto scelto per «{card.title}» non esiste.'
    return None


def publish_problem(is_published, cards):
    """I4: a tour is published only when every one of its stops can be opened
    by the reader it is published to. `cards` are the stops' cards."""
    if not is_published:
        return None
    drafts = [card.title for card in cards if not card.is_published]
    if drafts:
        return 'Si pubblica quando tutte le tappe sono pubblicate. In bozza: ' + ', '.join(f'«{t}»' for t in drafts) + '.'
    return None


def tour_publish_problem(card):
    """The check `content.publishing` runs when a card is published from Django
    admin's generic card form — where a tour's `is_published` lives, out of
    reach of the itinerario's own admin page."""
    itinerario = getattr(card, 'itinerari', None)
    if itinerario is None:
        return None
    # A translation shows its original's stops (T5); the original was checked
    # when it was published, and T8 keeps the translation behind it.
    return publish_problem(True, [stop.card for stop in itinerario.stops.select_related('card')])
