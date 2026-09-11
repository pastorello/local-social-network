import logging
import time

from django.contrib.auth import password_validation
from django.contrib.auth.forms import PasswordChangeForm
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from common.pagination import StandardPagination

from .forms import CollaborationRequestForm, ProfileForm
from .models import AccountToken, User
from .serializers import MeSerializer, UserSerializer
from .services import send_password_reset_email
from .throttling import (
    CollaborationRequestRateThrottle,
    InviteRateThrottle,
    PasswordChangeRateThrottle,
    PasswordResetRateThrottle,
)

logger = logging.getLogger(__name__)

# A4: the request form is public, so a bot can fill it in well under a human's
# reaction time — the honeypot catches the ones that autofill every field, this
# catches the ones that skip the honeypot but still submit instantly (spec A1:
# "its job is spam, not identity").
MIN_FORM_FILL_SECONDS = 3


def _looks_like_spam(data):
    if data.get('website'):
        return True

    try:
        rendered_at = int(data.get('rendered_at', 0)) / 1000
    except (TypeError, ValueError):
        return True

    return (time.time() - rendered_at) < MIN_FORM_FILL_SECONDS


def _blacklist_all_tokens(user):
    """Revoke every refresh token outstanding for this user (TD-20)."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


def _form_errors(form):
    """Django form errors → the spec §8 fields dict."""
    return {
        ('non_field_errors' if field == '__all__' else field): list(errors)
        for field, errors in form.errors.items()
    }


def _set_new_password(user, data):
    """Shared by invite-accept and reset-confirm: validate a password1/password2
    pair against Django's validators and save it on `user`. Raises ValidationError."""
    password1 = data.get('password1', '')
    password2 = data.get('password2', '')

    if password1 != password2:
        raise ValidationError({'password2': ['Le due password non corrispondono.']})

    try:
        password_validation.validate_password(password1, user=user)
    except DjangoValidationError as exc:
        raise ValidationError({'password1': list(exc.messages)}) from exc

    user.set_password(password1)
    user.save(update_fields=('password',))


@api_view(['GET'])
def me(request):
    return Response(MeSerializer(request.user).data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
@throttle_classes([CollaborationRequestRateThrottle])
def collaborate(request):
    data = request.data

    if not _looks_like_spam(data):
        form = CollaborationRequestForm({
            'name': data.get('name'),
            'email': data.get('email'),
            'message': data.get('message'),
        })
        if not form.is_valid():
            raise ValidationError(_form_errors(form))
        form.save()

    # Same response whether a request was actually stored or silently dropped
    # as spam — telling a bot its honeypot tripped would teach it not to (A1).
    return Response({'detail': 'Richiesta inviata.'}, status=201)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
@throttle_classes([InviteRateThrottle])
def acceptinvite(request):
    token = AccountToken.find_valid(request.data.get('token', ''), AccountToken.INVITE)
    if token is None:
        raise ValidationError({'token': ['Link non valido o scaduto.']})

    _set_new_password(token.user, request.data)
    token.mark_used()

    return Response({'detail': 'Password impostata. Ora puoi accedere.'})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
@throttle_classes([PasswordResetRateThrottle])
def requestpasswordreset(request):
    email = request.data.get('email', '')
    user = User.objects.filter(email=email, is_active=True).first()
    if user is not None and user.has_usable_password():
        try:
            with transaction.atomic():
                token, raw_token = AccountToken.create_for(user, AccountToken.RESET)
                send_password_reset_email(user, raw_token)
        except OSError:
            # The same reply as always, even though nothing was sent. Until
            # 2026-09-10 a mail server that did not answer turned this into a
            # 500 for a registered address and a 200 for an unknown one — the
            # enumeration the fixed reply below exists to prevent, open for as
            # long as mail is down. The address is not logged: the log is where
            # an operator looks, not a list of who asked.
            logger.exception('Password-reset e-mail could not be sent.')

    # Always the same response, whether or not the address is registered —
    # anything else would let a caller enumerate collaborator e-mails.
    return Response({'detail': "Se l'indirizzo esiste, riceverai un'e-mail."})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
@throttle_classes([PasswordResetRateThrottle])
def confirmpasswordreset(request):
    token = AccountToken.find_valid(request.data.get('token', ''), AccountToken.RESET)
    if token is None:
        raise ValidationError({'token': ['Link non valido o scaduto.']})

    _set_new_password(token.user, request.data)
    token.mark_used()

    # Same reasoning as editpassword: a reset is exactly the moment a session
    # might be compromised, so every existing refresh token dies with it (TD-20).
    _blacklist_all_tokens(token.user)

    return Response({'detail': 'Password aggiornata. Ora puoi accedere.'})


@api_view(['GET'])
def user(request, pk):
    return Response(UserSerializer(get_object_or_404(User, pk=pk)).data)

@api_view(['GET'])
def user_list(request):
    query = request.GET.get('q', '')

    users = User.objects.all()
    if query:
        users = users.filter(name__icontains=query)

    # Paginated like every other list endpoint (TD-25): this used to return
    # every row, and the SPA rendered all of them as avatar cards.
    paginator = StandardPagination()
    page = paginator.paginate_queryset(users.order_by('name'), request)
    return paginator.get_paginated_response(UserSerializer(page, many=True).data)

@api_view(['POST'])
def editprofile(request):
    user = request.user
    email = request.data.get('email')

    if User.objects.exclude(id=user.id).filter(email=email).exists():
        raise ValidationError({'email': ['Questa e-mail è già in uso.']})

    form = ProfileForm(request.data, request.FILES, instance=user)
    if not form.is_valid():
        raise ValidationError(_form_errors(form))

    form.save()
    return Response({'detail': 'Profilo aggiornato.', 'user': UserSerializer(user).data})


@api_view(['POST'])
@throttle_classes([PasswordChangeRateThrottle])
def editpassword(request):
    form = PasswordChangeForm(data=request.data, user=request.user)

    if not form.is_valid():
        raise ValidationError(_form_errors(form))

    form.save()

    # A password change has to end the sessions that the old password could have
    # opened — refresh tokens live 30 days, so without this "I think I was
    # compromised" buys nothing (TD-20). The caller is logged out too, which is
    # why the SPA sends them back to the login screen.
    _blacklist_all_tokens(request.user)

    return Response({'detail': 'Password aggiornata. Accedi di nuovo.'})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def logout(request):
    """Blacklist the presented refresh token (TD-20).

    Without this the SPA only forgets the token; the server keeps honouring it
    for its full lifetime.

    No bearer token required, on purpose (2026-09-10). The SPA now ends the
    local session *before* telling the server — a logout that waited for the
    answer left the session behind whenever the page reloaded or closed in
    between — so this request goes out with no access token. Possessing the
    refresh token is the proof that matters: blacklisting it can only end that
    one session. It also closes a gap the old shape had: with an expired access
    token the 401 interceptor used to refresh first — rotating the token — and
    then blacklist the old one, leaving the new one valid for thirty days.
    """
    token = request.data.get('refresh')

    try:
        RefreshToken(token).blacklist()
    except TokenError as exc:
        raise ValidationError({'refresh': ['Token non valido.']}) from exc

    return Response({'detail': 'Sessione chiusa.'})
