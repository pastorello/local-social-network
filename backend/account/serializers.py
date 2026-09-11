from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt import serializers as jwt_serializers

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


class TokenRefreshSerializer(jwt_serializers.TokenRefreshSerializer):
    """simplejwt's refresh, with a deleted account answered as a 401 (TD-43).

    simplejwt 5.5.1 looks the user up with `objects.get()` and lets
    `DoesNotExist` escape, so a token outliving its account was a 500. The SPA
    ends a session only on a 401 (TD-42), which made that 500 a collaborator
    left looking signed in. The lookup happens before any rotation, so nothing
    has been written when this is raised. Wired in via SIMPLE_JWT's
    `TOKEN_REFRESH_SERIALIZER`; drop it once upstream catches the exception.
    """

    def validate(self, attrs):
        try:
            return super().validate(attrs)
        except User.DoesNotExist as exc:
            # Same answer as a deactivated account: to the caller, both are
            # simply no account behind this token.
            raise AuthenticationFailed(
                self.error_messages['no_active_account'], 'no_active_account'
            ) from exc