import datetime

from django.utils import timezone
from polls.models import Question

# Requested setting INSTALLED_APPS, but settings are not configured. You must either define the environment 
# variable DJANGO_SETTINGS_MODULE or call settings.configure() before accessing settings.

def add_example_question():
    # Create a new Question object.
    q = Question(question_text="What's new?", pub_date=timezone.now())

    # Save the object into the database. You have to call save() explicitly.
    q.save()

    # Now it has an ID.
    print(q.id, q.question_text, q.pub_date)
    
    # Change values by changing the attributes, then calling save().
    q.question_text = "What's up?"
    q.save()

    # objects.all() displays all the questions in the database.
    print(Question.objects.all())

def filters_example():
    # filer by id
    Question.objects.filter(id=1)
    
    # filter by field
    Question.objects.filter(question_text__startswith="What")
    
    # filter by date range
    current_year = timezone.now().year
    Question.objects.get(pub_date__year=current_year)

    # filter by primary key
    Question.objects.get(pk=1)

def add_choiches():
    from polls.models import Choice
    q = Question.objects.get(pk=1)
    # Create three choices.
    q.choice_set.create(choice_text="Not much", votes=0)
    q.choice_set.create(choice_text="The sky", votes=0)
    c = q.choice_set.create(choice_text="Just hacking again", votes=0)
    
    # Display any choices from the related object set -- none so far.
    print("risposte correlate alla domanda", q.choice_set.all())
    # Choice objects have API access to their related Question objects.
    print("domanda a cui appartiene la scelta", c.question)

    # And vice versa: Question objects get access to Choice objects.
    print("numero di scelte correlate alla domanda", q.choice_set.count())

    c.delete() # delete a choice
