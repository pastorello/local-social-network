from django.http import JsonResponse

from rest_framework.decorators import api_view
from django.db.models import Q

from .models import Question
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

