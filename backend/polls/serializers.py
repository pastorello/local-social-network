from django.utils import timezone

from rest_framework import serializers

from account.serializers import UserSerializer

from .models import Poll, PollOption


class PollSerializer(serializers.ModelSerializer):
    """Read payload. Option counts follow the F3.3 visibility rule.

    Context keys: `votes_by_poll` (poll id → option id voted by the requesting
    user) and `is_admin`.
    """

    created_by = UserSerializer(read_only=True)
    is_closed = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    my_vote = serializers.SerializerMethodField()
    results_visible = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = (
            'id', 'question', 'created_by', 'closes_at', 'is_closed',
            'options', 'my_vote', 'results_visible', 'total_votes', 'created_at',
        )

    def _voted_option_id(self, obj):
        return self.context.get('votes_by_poll', {}).get(obj.id)

    def get_is_closed(self, obj):
        return obj.is_currently_closed

    def get_my_vote(self, obj):
        option_id = self._voted_option_id(obj)
        return str(option_id) if option_id else None

    def get_results_visible(self, obj):
        # Spec F3.3: citizens see results after voting, everyone once the poll
        # closes; admins manage polls, so they always see results (M3 log).
        return (
            obj.is_currently_closed
            or self._voted_option_id(obj) is not None
            or self.context.get('is_admin', False)
        )

    def get_options(self, obj):
        # Options come annotated with votes_count (see api._poll_queryset);
        # counts are withheld while results are hidden.
        visible = self.get_results_visible(obj)
        return [
            {
                'id': str(option.id),
                'text': option.text,
                'position': option.position,
                'votes_count': option.votes_count if visible else None,
            }
            for option in obj.options.all()
        ]

    def get_total_votes(self, obj):
        if not self.get_results_visible(obj):
            return None
        return sum(option.votes_count for option in obj.options.all())


class PollCreateSerializer(serializers.ModelSerializer):
    # Spec F3.1: 2–10 options; texts capped like the question (200 chars).
    options = serializers.ListField(
        child=serializers.CharField(max_length=200),
        min_length=2,
        max_length=10,
        error_messages={
            'min_length': 'Un sondaggio deve avere almeno 2 opzioni.',
            'max_length': 'Un sondaggio può avere al massimo 10 opzioni.',
        },
    )

    class Meta:
        model = Poll
        fields = ('question', 'options', 'closes_at')

    def validate_closes_at(self, value):
        if value is not None and value <= timezone.now():
            raise serializers.ValidationError('La data di chiusura deve essere nel futuro.')
        return value

    def validate_options(self, options):
        lowered = [text.casefold() for text in options]
        if len(set(lowered)) != len(lowered):
            raise serializers.ValidationError('Le opzioni devono essere tutte diverse.')
        return options

    def create(self, validated_data):
        option_texts = validated_data.pop('options')
        poll = Poll.objects.create(**validated_data)
        PollOption.objects.bulk_create(
            PollOption(poll=poll, text=text, position=position)
            for position, text in enumerate(option_texts)
        )
        return poll
