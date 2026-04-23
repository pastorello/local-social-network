from django.conf import settings
from django.contrib.auth.forms import PasswordChangeForm
from django.http import JsonResponse
from django.core.mail import EmailMultiAlternatives
from urllib.parse import urlencode

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from django.db.models import Q

from .models import Question, Choice
from .serializers import QuestionSerializer

@api_view(['POST'])
def polls_list(request):
    query = request.data.get('query', '')

    if query:
        users = Question.objects.filter(
            Q(question_text__icontains=query)
        )
    else:
        users = Question.objects.all()

    serializer = QuestionSerializer(users, many=True)

    return JsonResponse(serializer.data, safe=False)

