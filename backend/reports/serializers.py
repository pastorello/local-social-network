from rest_framework import serializers

from account.serializers import UserSerializer

from .images import MAX_PHOTO_BYTES, strip_exif
from .models import Category, IssueReport


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'color')


class ReportSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    photoURL = serializers.SerializerMethodField()
    upvoted_by_me = serializers.SerializerMethodField()

    def get_photoURL(self, obj):
        return obj.get_photo_url()

    def get_upvoted_by_me(self, obj):
        upvoted_ids = self.context.get('upvoted_report_ids')
        if upvoted_ids is None:
            return False
        return obj.id in upvoted_ids

    class Meta:
        model = IssueReport
        fields = (
            'id', 'title', 'description', 'lat', 'lng', 'status',
            'category', 'author', 'photoURL', 'upvotes_count',
            'upvoted_by_me', 'created_at', 'updated_at',
        )


class ReportPinSerializer(serializers.ModelSerializer):
    """Slim payload for map pins (spec F2.4)."""

    category_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = IssueReport
        fields = ('id', 'title', 'lat', 'lng', 'status', 'category_id')


class ReportWriteSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True)
    )
    lat = serializers.FloatField(min_value=-90.0, max_value=90.0)
    lng = serializers.FloatField(min_value=-180.0, max_value=180.0)
    photo = serializers.ImageField(required=False, allow_null=True)

    def validate_photo(self, photo):
        if photo is None:
            return photo
        if photo.size > MAX_PHOTO_BYTES:
            raise serializers.ValidationError('La foto non può superare i 5 MB.')
        try:
            return strip_exif(photo)
        except ValueError:
            raise serializers.ValidationError(
                'Formato immagine non supportato: usa JPG, PNG o WebP.'
            )

    class Meta:
        model = IssueReport
        fields = ('title', 'description', 'lat', 'lng', 'category', 'photo')
