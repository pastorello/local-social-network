from django.contrib.auth.forms import PasswordChangeForm
from django.http import JsonResponse
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .forms import ProfileForm, SignupForm
from .models import User
from .serializers import UserSerializer


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

    if query:
        users = User.objects.filter(name__icontains=query)
    else:
        users = User.objects.all()

    serializer = UserSerializer(users, many=True)

    return JsonResponse(serializer.data, safe=False)

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
def editpassword(request):
    form = PasswordChangeForm(data=request.POST, user=request.user)

    if not form.is_valid():
        raise ValidationError(_form_errors(form))

    form.save()
    return Response({'detail': 'Password aggiornata.'})
