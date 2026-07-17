# Backend

Django + Django REST Framework API. With Docker, `docker compose up` from the repo root builds and runs it against PostgreSQL — nothing else to do. The steps below are for running it bare-metal (SQLite).

## Project Setup

From the **repo root** (the venv lives at `<repo>/.venv`):

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd backend
python manage.py migrate
```

Configuration is environment-driven with development defaults; see [.env.example](../.env.example) at the repo root for the available variables (secret key, hosts, CORS, database).

## Create a superuser

```sh
python manage.py shell
```

```python
from account.models import User
User.objects.create_superuser(email="admin@example.com", password="password123", name="admin")
```

## Run the server

```sh
python manage.py runserver
```

## Tests

```sh
python manage.py test            # all apps
python manage.py test posts      # single app
```
