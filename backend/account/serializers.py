from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    avatarURL = serializers.SerializerMethodField(source='get_avatar')

    def get_avatarURL(self, obj):
        return obj.get_avatar()

    class Meta:
        model = User
        # No email here on purpose: user e-mail addresses are private and only
        # returned to the owner via /api/users/me/ (spec F1.4).
        fields = ('id', 'name', 'avatarURL')


class MeSerializer(UserSerializer):
    """The owner's own record: the one place email and role are exposed.

    `me` used to hand-build this dict and spell the avatar field `avatar`, which
    is why the SPA carried two names for one value (TD-27).
    """

    class Meta(UserSerializer.Meta):
        fields = (*UserSerializer.Meta.fields, 'email', 'role')