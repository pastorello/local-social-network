import uuid

from django.db import models
from django.utils import timezone

from account.models import User


class Poll(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.CharField(max_length=200)
    created_by = models.ForeignKey(User, related_name='polls', on_delete=models.CASCADE)
    closes_at = models.DateTimeField(blank=True, null=True)
    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return self.question

    @property
    def is_currently_closed(self):
        # A poll closes manually (is_closed) or when its closing date passes.
        if self.is_closed:
            return True
        return self.closes_at is not None and self.closes_at <= timezone.now()


class PollOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    poll = models.ForeignKey(Poll, related_name='options', on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    position = models.IntegerField(default=0)

    class Meta:
        ordering = ('position',)

    def __str__(self):
        return self.text


class Vote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, related_name='votes', on_delete=models.CASCADE)
    poll = models.ForeignKey(Poll, related_name='votes', on_delete=models.CASCADE)
    option = models.ForeignKey(PollOption, related_name='votes', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(fields=('user', 'poll'), name='unique_user_poll_vote'),
        )
