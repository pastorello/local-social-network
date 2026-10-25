"""The rules an event obeys, in one place for both write paths — the API
(`api.py`) and Django admin (`Evento.clean`) — as itinerari's stops have been
since TD-49. Each returns the message to show, or None. The dates' rules are
in `common/when.py`, shared with the feasts' editions."""

from maps.api import VENUE_TYPES


def venue_type(card):
    for type_key in VENUE_TYPES:
        if hasattr(card, type_key):
            return type_key
    return None


def venue_point(card):
    """The pin an event held at `card` is on: the card's own, the only one a
    venue type has (`max_points=1`) — which is why an event names a card and
    no position among its pins."""
    return next(
        (feature for feature in card.map_features.all() if feature.kind == feature.POINT), None
    )


def place_problem(card, lat, lng, label):
    """D9/CF31: held at a card that has a place, or at one labelled point,
    never both and never neither. The card is an original — a translation is
    the same place under another name — of a type with a door."""
    has_point = lat is not None or lng is not None
    if card is not None and (has_point or label):
        return 'Scegli un posto dell’archivio oppure un altro posto, non tutti e due.'
    if card is not None:
        if card.translation_of_id is not None:
            return f'«{card.title}» è una traduzione: scegli la scheda originale.'
        if venue_type(card) is None:
            return f'«{card.title}» non è un posto dove si tiene un evento.'
        if venue_point(card) is None:
            return f'«{card.title}» non ha un luogo sulla mappa.'
        return None
    if lat is None or lng is None:
        return 'Scegli dove si tiene: un posto dell’archivio, o un punto sulla mappa.'
    if not label.strip():
        return 'Un punto sulla mappa ha bisogno di un nome: «Piazza XIX Maggio», «il molo».'
    return None


def state_problem(stored, state):
    """CF28: a new event is in programma; afterwards the state moves only along
    `Evento.ALLOWED_TRANSITIONS`, where the one way that is closed is out of
    «annullato»."""
    from .models import Evento

    if stored is None:
        return None if state == Evento.IN_PROGRAMMA else 'Un evento nuovo è in programma.'
    if not stored.can_transition_to(state):
        return 'Un evento annullato resta annullato: se torna, è un evento nuovo.'
    return None


def publish_problem(is_published, card):
    """A published event held at a card that is a draft would send its reader
    to a page that 404s — I4's rule for tours, applied to a venue."""
    if is_published and card is not None and not card.is_published:
        return f'Si pubblica quando il posto è pubblicato: «{card.title}» è ancora in bozza.'
    return None
