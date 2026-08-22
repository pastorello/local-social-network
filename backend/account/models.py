from datetime import timedelta

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, UserManager
from django.utils import timezone
from django.conf import settings
import uuid

from common.tokens import generate_raw_token, hash_token

class CustomUserManager(UserManager):
    def _create_user(self, name, email, password, **extra_fields):
        if not email:
            raise ValueError("You have not provided a valid e-mail address")
        
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user
    
    def create_user(self, name=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(name, email, password, **extra_fields)
    
    def create_superuser(self, name=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self._create_user(name, email, password, **extra_fields)
    
class User(AbstractBaseUser, PermissionsMixin):
    CITIZEN = 'citizen'
    ADMIN = 'admin'

    ROLE_CHOICES = (
        (CITIZEN, 'Citizen'),
        (ADMIN, 'Admin'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, null=True, default='')
    avatar = models.ImageField(upload_to='avatars', blank=True, null=True)
    # Spec F1.3: admins are promoted via the Django admin, not self-service.
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=CITIZEN)

    # Steering tier (spec politics.md): a capability flag on an already-approved
    # account, admin-set only. Confidentiality is enforced by omission — this
    # field must never appear in a serializer, not even MeSerializer for the
    # owner's own record. No consumer exists yet (that's the C5 seggi overlay).
    is_steering = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(blank=True, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = []

    def get_avatar(self):
        """Absolute URL of the uploaded avatar, or None (TD-30).

        This used to fall back to picsum.photos, which serves a *different*
        random image per request — so the same citizen had a different face in
        the header, in their card and on every reload. It also sent every
        visitor's IP to a third party. Callers render initials instead.
        """
        if not self.avatar:
            return None
        return settings.WEBSITE_URL + self.avatar.url


class CollaborationRequest(models.Model):
    """Spec A1/A2: the public "Collabora con noi" form and its admin review.

    The actual vetting (looking the person up, talking to them) happens off-app
    — this model only records the request and the admin's decision.
    """

    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'

    STATUS_CHOICES = (
        (PENDING, 'Pending'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    def __str__(self):
        return f'{self.name} <{self.email}> ({self.status})'


class AccountToken(models.Model):
    """A single-use, expiring token (spec A3 invite / A4 password reset).

    One model for both purposes: the shape and the verify/consume logic are
    identical, and duplicating them per purpose would only be two copies of the
    same bug waiting to diverge. Only the hash is stored — the raw token lives
    in the e-mail link and nowhere else, so a leaked row can't be replayed.
    """

    INVITE = 'invite'
    RESET = 'reset'

    PURPOSE_CHOICES = (
        (INVITE, 'Invite'),
        (RESET, 'Reset'),
    )

    INVITE_TTL = timedelta(days=7)
    RESET_TTL = timedelta(hours=1)

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    purpose = models.CharField(max_length=10, choices=PURPOSE_CHOICES)
    token_hash = models.CharField(max_length=64, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    @classmethod
    def create_for(cls, user, purpose):
        """Issue a fresh token, invalidating any prior unused one of the same
        purpose — so requesting a new reset link retires the old e-mail."""
        cls.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(
            used_at=timezone.now()
        )

        ttl = cls.INVITE_TTL if purpose == cls.INVITE else cls.RESET_TTL
        raw_token = generate_raw_token()
        token = cls.objects.create(
            user=user,
            purpose=purpose,
            token_hash=hash_token(raw_token),
            expires_at=timezone.now() + ttl,
        )
        return token, raw_token

    @classmethod
    def find_valid(cls, raw_token, purpose):
        """Look up an unused, unexpired token, or return None.

        Deliberately does not mark it used — callers validate the rest of the
        request (e.g. the new password) before spending a single-use token on
        a request that is going to fail anyway.
        """
        try:
            token = cls.objects.select_related('user').get(
                token_hash=hash_token(raw_token), purpose=purpose
            )
        except cls.DoesNotExist:
            return None

        if token.used_at is not None or token.expires_at < timezone.now():
            return None

        return token

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=('used_at',))
