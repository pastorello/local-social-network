from rest_framework import serializers

from .models import Question


class QuestionSerializer(serializers.ModelSerializer):
    created_at_formatted = serializers.SerializerMethodField(source='created_at_formatted')

    def get_created_at_formatted(self, obj):
        return obj.created_at_formatted()

    class Meta: 
        model = Question
        fields = ('id', 'question_text', 'pub_date', 'was_published_recently', 'created_at_formatted')