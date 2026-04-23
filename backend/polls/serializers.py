from rest_framework import serializers

from .models import Question, Choice

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ('id', 'choice_text', 'votes')

class QuestionSerializer(serializers.ModelSerializer):
    created_at_formatted = serializers.SerializerMethodField(source='created_at_formatted')
    choices = ChoiceSerializer(many=True, read_only=True, source='choice_set')

    print(choices)

    def get_created_at_formatted(self, obj):
        return obj.created_at_formatted()

    def get_was_published_recently(self, obj):
        return obj.was_published_recently()
    
    class Meta: 
        model = Question
        fields = ('id', 'question_text', 'pub_date', 'was_published_recently', 'created_at_formatted', 'choices')