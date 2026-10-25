"""Read-side serializer shared by every type app (ADR-0004) — content has no
urls.py/api.py of its own, but this mirrors api_helpers.py's role for the
write path: one implementation instead of one per type."""

from rest_framework import serializers

from account.models import User

from .models import Availability, Card, CardImage


class CardImageSerializer(serializers.ModelSerializer):
    imageURL = serializers.SerializerMethodField()

    def get_imageURL(self, obj):
        return obj.get_image_url()

    class Meta:
        model = CardImage
        fields = ('id', 'imageURL', 'position', 'caption')


def media_source(card):
    """The card that owns the photographs and the map features of this card's
    group — the original, whichever member of the group you are holding.

    Decided with the author on 2026-09-09 (spec translations.md): a photograph
    of the Santuario is the same photograph in every language, and uploading it
    once per language is how two copies of one picture drift apart. The map had
    already taken the same decision for geometry in C5 — `/api/map/features/`
    excludes translations so one doorstep gets one pin — and this is that rule
    applied to the rest of a card's media.

    Before it, a translation started empty *and stayed* empty of pictures: the
    English archive, which is the whole point of translating, had none.
    """
    return card if card.translation_of_id is None else card.translation_of


class TranslationSerializer(serializers.Serializer):
    """One entry of a card's `translations` list — the sibling versions a
    reader's language switch (T1) or a collaborator's "traduci" control (T2)
    can link to. Deliberately slim, same reasoning as FestePinSerializer."""

    id = serializers.UUIDField()
    language = serializers.CharField()
    title = serializers.CharField()
    is_published = serializers.BooleanField()


def visible_translations(card, request):
    """Every other language version of `card`'s card group, visible to
    `request`'s caller: published-only for anyone else, everything (including
    drafts) for the group's author or an admin — so the "traduci" control can
    show a collaborator their own in-progress translation.

    The group is the original plus all its translations, whichever of those
    `card` itself is — a translation never has translations of its own
    (`start_translation` forbids it), so this never needs to recurse.
    """
    original = card if card.translation_of_id is None else card.translation_of
    siblings = [original, *original.translations.all()]
    siblings = [sibling for sibling in siblings if sibling.id != card.id]

    is_owner = (
        request is not None and request.user.is_authenticated and (
            original.author_id == request.user.id or request.user.role == User.ADMIN
        )
    )
    if not is_owner:
        siblings = [sibling for sibling in siblings if sibling.is_published]

    return siblings


def has_english(card):
    """Whether a reader in English finds `card` in English (review PR-19b,
    translations.md T10): its group has a **published** English version — the
    «EN» a list marks it with, and what its page shows at the original's
    address. A draft does not count, whoever is asking: the mark is a promise
    to every reader, and an author's own drafts are in `translations`, never
    here. Reads `translations.all()`, so a list that prefetches
    `card__translations` pays no query per row."""
    return any(
        version.language == 'en' and version.is_published
        for version in media_source(card).translations.all()
    )


def availability_of(card):
    """What a reader sees about getting in (ADR-0008): the original's row, in
    every language (T5). A card with no row reads exactly like a row nobody
    has filled — `unknown`, empty, no date — so "no row" can never be read as
    anything but *we do not know*."""
    row = getattr(media_source(card), 'availability', None)
    if row is None:
        return {
            'state': Availability.UNKNOWN, 'hours': '', 'hours_updated': None,
            'keeper': '', 'keeper_phone': '',
        }
    return {
        'state': row.state,
        'hours': row.hours,
        'hours_updated': row.hours_updated.isoformat() if row.hours_updated else None,
        'keeper': row.keeper,
        'keeper_phone': row.keeper_phone,
    }


class MyCardSerializer(serializers.ModelSerializer):
    """One row of *Le mie schede* (review PR-13): enough to find a card again
    and open it — its type, which is also its route segment, whether it is
    still a draft, and for a translation its language and the Italian name it
    is filed under (T7)."""

    type = serializers.SerializerMethodField()
    original_title = serializers.SerializerMethodField()

    def get_type(self, obj):
        # The reverse one-to-one is how a card's type is found (ADR-0004): no
        # stored discriminator to drift. Selected with the card, so no query.
        return next((key for key in self.context['type_keys'] if hasattr(obj, key)), None)

    def get_original_title(self, obj):
        return obj.translation_of.title if obj.translation_of_id else obj.title

    class Meta:
        model = Card
        fields = (
            'id', 'type', 'title', 'original_title', 'is_published', 'language', 'translation_of',
            'updated_at',
        )
