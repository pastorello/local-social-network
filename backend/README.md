# Backend

Django + Django REST Framework API. With Docker, `docker compose up` from the repo root builds and runs it against PostgreSQL — nothing else to do. The steps below are for running it bare-metal (SQLite).

## Project Setup

From the **repo root** (the venv lives at `<repo>/.venv`):

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt   # runtime + pytest/ruff

cd backend
export DJANGO_DEBUG=true      # once per shell — see below
python manage.py migrate
```

Configuration is environment-driven; see [.env.example](../.env.example) at the repo root for the available variables (secret key, hosts, CORS, database).

`DJANGO_DEBUG` defaults to **false** so that a forgotten variable fails safe rather than serving tracebacks, and outside debug the app refuses to start without `DJANGO_SECRET_KEY` — it is the JWT signing key (TD-11). Bare-metal development therefore opts in explicitly with `export DJANGO_DEBUG=true`; `docker compose` already passes it for you.

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

Tests are pytest-style — `python manage.py test` exits 0 but runs nothing.

```sh
python -m pytest                          # all apps
python -m pytest account/tests.py -k collaborate   # subset
python -m ruff check .                    # lint (must be clean)
```
