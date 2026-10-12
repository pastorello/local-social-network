"""Rules a card must meet to be published, for the one write path that does
not go through a type's API: Django admin's generic card form (TD-49).

Every type's API enforces its own rules before it writes `is_published`.
`CardAdmin` edits a bare `Card`, and the core must not know its types
(ADR-0004), so a type app that has a rule registers it here from its
`AppConfig.ready()`, and the admin form asks every registered check. A check
takes the card, as it would be saved, and returns a message or None.
"""

_checks = []


def register_publish_check(check):
    _checks.append(check)
    return check


def publish_problems(card):
    if not card.is_published:
        return []
    return [message for message in (check(card) for check in _checks) if message]


@register_publish_check
def original_published_first(card):
    """T8: a translation is published after its original, never before — the
    same rule `api_helpers.require_original_published` applies on every
    type's API."""
    if card.translation_of_id is not None and not card.translation_of.is_published:
        return 'Si pubblica dopo la scheda originale, che è ancora in bozza.'
    return None
