# Backend

## Project Setup

- create venv for python `python3 -m venv .env`
- activate venv for python `source .env/bin/activate`
- install modules `pip install -r requirements.txt`
- create migrations `python manage.py makemigrations`
- do the migration `python manage.py migrate`
- create your superuser in order to manage your db

```sh
from account.models import User
user = User.objects.create_superuser(email="admin@example.com", password="password123", name="admin")
user.save()
exit()
```

## Run the server

- run `python manage.py runserver`
