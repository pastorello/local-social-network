"""Read-side serializer shared by every type app (ADR-0004) — content has no
urls.py/api.py of its own, but this mirrors api_helpers.py's role for the
write path: one implementation instead of one per type."""

from rest_framework import serializers

from account.models import User

from .models import CardImage


class CardImageSerializer(serializers.ModelSerializer):
    imageURL = serializers.SerializerMethodField()

    def get_imageURL(self, obj):
        return obj.get_image_url()

    class Meta:
        model = CardImage
        fields = ('id', 'imageURL', 'position', 'caption')


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
