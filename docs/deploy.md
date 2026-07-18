# Deployment guide (demo)

> Status: **prep done, platform not chosen yet** (decision 2026-07-18 — spec §6).
> The app is production-ready; this guide is platform-agnostic. When a platform
> is picked, record it in spec §6 and add the concrete steps here.

## What gets deployed

| Piece | Artifact | Serves |
|---|---|---|
| API | Django + gunicorn (`backend/`) | `/api/...`, `/admin/`, uploaded media |
| Frontend | static Vite build (`frontend/dist/`) | the SPA, from any static host/CDN |
| Database | PostgreSQL 17 | set `POSTGRES_*` env vars |

The two apps talk over plain HTTP + CORS: the SPA reads its API base URL from
`VITE_API_BASE_URL` **at build time**, the backend allowlists the SPA origin via
`CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`.

## Backend checklist

Environment (see `.env.example`):

- `DJANGO_SECRET_KEY` — fresh random value, never the repo default
- `DJANGO_DEBUG=false` — also enables the HTTPS hardening block in
  `settings.py` (HSTS, secure cookies, SSL redirect behind `X-Forwarded-Proto`)
- `DJANGO_ALLOWED_HOSTS` — the API hostname
- `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` — the SPA origin (https)
- `WEBSITE_URL` — public base URL of the API (absolute media URLs)
- `POSTGRES_HOST/PORT/DB/USER/PASSWORD`

Release commands:

```sh
python manage.py migrate
python manage.py collectstatic --noinput   # whitenoise serves the result
gunicorn backend.wsgi --bind 0.0.0.0:8000 --workers 2
```

Static files (Django admin) are served by **whitenoise** — no web server needed
in front for them. **Media uploads** (report photos, avatars) land on the local
filesystem (`MEDIA_ROOT`): give the service a persistent disk, or move media to
S3-compatible storage if the platform has no disks (spec §6 anticipates this).

Create the first admin (spec F1.3 — promotion happens via Django admin):

```python
# python manage.py shell
from account.models import User
User.objects.create_superuser(email="...", password="...", name="admin")
```

## Frontend checklist

```sh
VITE_API_BASE_URL=https://api.example.org npm run build   # emits frontend/dist/
```

Deploy `dist/` to any static host. Configure the host to rewrite unknown paths
to `/index.html` (the router uses HTML5 history mode).

## Platform sketches

- **PaaS (e.g. Render free tier):** managed Postgres + a Docker/Python web
  service running the release commands above + a static site building the
  frontend. Free instances sleep when idle — acceptable for a showcase.
- **Single VPS:** `docker compose` with a reverse proxy (Caddy auto-HTTPS)
  in front of gunicorn and the built SPA; Postgres in a volume. The dev
  `docker-compose.yml` is **not** production-ready (runserver, Vite dev server,
  published DB port) — write a separate `docker-compose.prod.yml` when this
  path is chosen.
