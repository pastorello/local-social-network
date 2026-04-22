from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    avatarURL = serializers.SerializerMethodField(source='get_avatar')

    def get_avatarURL(self, obj):
        return obj.get_avatar()

    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'avatarURL',)