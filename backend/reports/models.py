import uuid

from django.conf import settings
from django.db import models

from account.models import User


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default='#7c3aed')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ('name',)
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class IssueReport(models.Model):
    OPEN = 'open'
    ACKNOWLEDGED = 'acknowledged'
    RESOLVED = 'resolved'
    REJECTED = 'rejected'

    STATUS_CHOICES = (
        (OPEN, 'Open'),
        (ACKNOWLEDGED, 'Acknowledged'),
        (RESOLVED, 'Resolved'),
        (REJECTED, 'Rejected'),
    )

    # Spec F2.3: open → acknowledged → resolved, forward-only; rejected is
    # available for moderation while a report is still open/acknowledged.
    ALLOWED_TRANSITIONS = {
        OPEN: {ACKNOWLEDGED, RESOLVED, REJECTED},
        ACKNOWLEDGED: {RESOLVED, REJECTED},
        RESOLVED: set(),
        REJECTED: set(),
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(User, related_name='reports', on_delete=models.CASCADE)
    category = models.ForeignKey(Category, related_name='reports', on_delete=models.PROTECT)
    title = models.CharField(max_length=100)
    description = models.TextField(max_length=2000)
    lat = models.FloatField()
    lng = models.FloatField()
    photo = models.ImageField(upload_to='report_photos', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=OPEN)

    upvotes_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return self.title

    def get_photo_url(self):
        if self.photo:
            return settings.WEBSITE_URL + self.photo.url
        return None

    def can_transition_to(self, new_status):
        return new_status in self.ALLOWED_TRANSITIONS.get(self.status, set())


class Upvote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, related_name='upvotes', on_delete=models.CASCADE)
    report = models.ForeignKey(IssueReport, related_name='upvotes', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(fields=('user', 'report'), name='unique_user_report_upvote'),
        )
