from django.contrib.auth.forms import PasswordChangeForm
from django.http import JsonResponse
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

from .forms import ProfileForm, SignupForm
from .models import User
from .serializers import UserSerializer
from .throttling import PasswordChangeRateThrottle, SignupRateThrottle


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


@api_view(['GET'])
def me(request):
    return JsonResponse({
        'id': request.user.id,
        'name': request.user.name,
        'email': request.user.email,
        'role': request.user.role,
        'avatar': request.user.get_avatar()
    })


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
@throttle_classes([SignupRateThrottle])
def signup(request):
    data = request.data

    form = SignupForm({
        'email': data.get('email'),
        'name': data.get('name'),
        'password1': data.get('password1'),
        'password2': data.get('password2'),
    })

    if not form.is_valid():
        raise ValidationError(_form_errors(form))

    form.save()
    return Response({'detail': 'Account creato.'}, status=201)


@api_view(['GET'])
def user(request, pk):
    user = get_object_or_404(User, pk=pk)

    return JsonResponse(UserSerializer(user).data, safe=False)

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

    form = ProfileForm(request.POST, request.FILES, instance=user)
    if not form.is_valid():
        raise ValidationError(_form_errors(form))

    form.save()
    return Response({'detail': 'Profilo aggiornato.', 'user': UserSerializer(user).data})


@api_view(['POST'])
@throttle_classes([PasswordChangeRateThrottle])
def editpassword(request):
    form = PasswordChangeForm(data=request.POST, user=request.user)

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
def logout(request):
    """Blacklist the presented refresh token (TD-20).

    Without this the SPA only forgets the token; the server keeps honouring it
    for its full lifetime.
    """
    token = request.data.get('refresh')

    try:
        RefreshToken(token).blacklist()
    except TokenError as exc:
        raise ValidationError({'refresh': ['Token non valido.']}) from exc

    return Response({'detail': 'Sessione chiusa.'})
