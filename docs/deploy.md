# Deployment

Two ways to read this file. The first part is **a VPS with Docker Compose**,
end to end, because that is the closest thing to what development already uses
and it needs no platform to be learned. The second is what any *other* platform
would need, for the day one is chosen.

The stack is deliberately small: **one virtual machine, one domain, three
containers.** No object storage, no CDN, no load balancer, nothing to configure
in a cloud console.

---

## Part 1 — a VPS with Docker Compose

### What you get

| Container | What it is | Notes |
|---|---|---|
| `web` | Caddy | terminates TLS, serves the built SPA, proxies the API |
| `api` | Django + gunicorn (3 workers) | runs the release commands on every start |
| `db` | PostgreSQL 17 | on a named volume |

**Both halves share one hostname.** `https://your-domain` serves the SPA;
`/api/`, `/admin/`, `/media/` and `/static/` are proxied to Django. That is why
`VITE_API_BASE_URL` is built empty — the SPA calls relative URLs, so there is
no second hostname, no CORS to get wrong, and one certificate.

### Before you start

- A VPS with a public IP. The smallest tier of anything is enough: this is a
  small Django app and a Postgres, not a cluster.
- A domain **whose A record already points at that IP**. Do this first and let
  it propagate: Caddy asks Let's Encrypt for a certificate on first start, and
  that only works if the name already resolves to the machine.
- Ports **80 and 443** open. 80 is not optional — the certificate challenge
  uses it.
- Docker with the Compose plugin (`curl -fsSL https://get.docker.com | sh`).

### Steps

```sh
git clone https://github.com/pastorello/local-social-network.git
cd local-social-network
cp deploy/.env.example deploy/.env
```

Fill in `deploy/.env`. Generate the secret key with:

```sh
docker run --rm python:3.14-slim sh -c "pip install -q django && python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
```

Then start it:

```sh
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

First start takes a few minutes: it builds both images, waits for Postgres,
runs the migrations, creates the cache table, collects the static files, and
gets a certificate. Watch it with:

```sh
docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs -f
```

Create the first admin — there is no other way in, since v2 has no public
signup and every account is created by an admin approving a request (spec A2):

```sh
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec api \
  python manage.py shell -c "from account.models import User; User.objects.create_superuser(email='you@example.org', password='CHANGE-ME', name='admin')"
```

Then log in at `https://your-domain/admin/`, and set that user's **role to
admin** on its own record — `create_superuser` gives Django admin access, while
the product's own permissions read `User.role` (spec F1.3).

### Updating

```sh
git pull
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

Migrations, the cache table and `collectstatic` run on every start, because all
three are idempotent and forgetting one is the failure mode.

### Backups — the two things that are not in git

```sh
# database
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup-$(date +%F).sql.gz

# uploads (photos, card covers, overlay rasters)
docker run --rm -v vivere-gaeta_media:/media -v "$PWD":/out alpine \
  tar czf /out/media-$(date +%F).tar.gz -C /media .
```

Losing the `media` volume loses every photo, and nothing else has a copy. Put
both on a schedule before the archive has anything in it worth losing.

### What will bite you

- **DNS after the fact.** If the domain did not resolve at first start, Caddy
  failed the challenge and will keep retrying with a backoff. Fix the DNS, then
  `docker compose ... restart web`.
- **Rotating `DJANGO_SECRET_KEY`** logs everyone out: it also signs the JWTs.
- **No SMTP, no invitations.** Approving a collaboration request sends an
  e-mail with a single-use link, and that is the only way a collaborator ever
  sets a password. Without `EMAIL_HOST`, approval silently produces an account
  nobody can log into.
- **`docker compose down -v` deletes the volumes**, including uploads and the
  certificates. `down` without `-v` is the safe one.

---

## Part 2 — anything else

Platform-agnostic notes, still true wherever this runs.

### What gets deployed

| Piece | Artifact | Serves |
|---|---|---|
| API | Django + gunicorn (`backend/`) | `/api/...`, `/admin/`, uploaded media |
| Frontend | static Vite build (`frontend/dist/`) | the SPA, from any static host/CDN |
| Database | PostgreSQL 17 | set `POSTGRES_*` env vars |

If the two are split across hostnames, the SPA reads its API base URL from
`VITE_API_BASE_URL` **at build time**, and the backend allowlists the SPA
origin via `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`.

### Backend checklist

Environment (see `.env.example`):

- `DJANGO_SECRET_KEY` — fresh random value. **Required**: with `DJANGO_DEBUG=false`
  the app raises `ImproperlyConfigured` at startup rather than falling back to a
  shared key, because this is also what signs JWTs (TD-11)
- `DJANGO_DEBUG=false` — also enables the HTTPS hardening block in
  `settings.py` (HSTS, secure cookies, SSL redirect behind `X-Forwarded-Proto`)
- `DJANGO_ALLOWED_HOSTS` — the API hostname
- `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` — the SPA origin (https)
- `WEBSITE_URL` — public base URL of the API (absolute media URLs)
- `FRONTEND_URL` — public base URL of the SPA (invite/password-reset e-mail
  links, spec A3/A4 — these routes are in the frontend, not the API)
- `POSTGRES_HOST/PORT/DB/USER/PASSWORD`

Rate limiting (TD-18) counts through the Django cache. Outside dev and tests
`settings.py` configures the **database cache**, which is shared by every
worker and every container — verified by three separate processes counting 1,
2, 3 through it, where `LocMemCache` gave each of them 1. Swap in Redis by
pointing `CACHES` at one when there is a Redis to point at; the throttles do
not care which backend counts for them.

**`createcachetable` is part of the release, not optional.** Without the table
the first throttled request errors instead of throttling.

Release commands:

```sh
python manage.py migrate
python manage.py createcachetable          # the shared cache the throttles count in
python manage.py collectstatic --noinput   # whitenoise serves the result
gunicorn backend.wsgi --bind 0.0.0.0:8000 --workers 2
```

Static files (Django admin) are served by **whitenoise** — no web server needed
in front for them.

**Media uploads** (report photos, card images and covers, overlay rasters) are
served by the app itself — `common/media.py`, decided in
[ADR-0007](./adr/0007-serving-media-from-the-app.md). No object storage and no
web server in front are required, on any host. Only `.jpg`, `.png` and `.webp`
are served, with the `Content-Type` taken from that allowlist rather than
guessed, plus `nosniff` and a sandboxing CSP — which is what makes it
acceptable to serve uploads from the origin that holds the admin session
cookie.

**Give the service a persistent disk** (`MEDIA_ROOT`). That part of
[ADR-0003](./adr/0003-media-on-local-filesystem.md) stands: an ephemeral disk
loses every upload on redeploy.

Create the first admin (spec F1.3 — promotion happens via Django admin):

```python
# python manage.py shell
from account.models import User
User.objects.create_superuser(email="...", password="...", name="admin")
```

### Frontend checklist

```sh
VITE_API_BASE_URL=https://api.example.org npm run build   # emits frontend/dist/
```

Deploy `dist/` to any static host. Configure the host to rewrite unknown paths
to `/index.html` (the router uses HTML5 history mode).
