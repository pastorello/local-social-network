# Gaeta Partecipa

A civic engagement platform for small cities. Citizens report local problems as
pins on a shared map, upvote each other's reports, and vote in polls opened by
the city administration — one place for problems and opinions, instead of a
comune's Facebook comments. Built around a pilot city, Gaeta (LT).

> The repository is still named `local-social-network`: the project started as a
> generic social-network tutorial app and was rebuilt into this. The UI is in
> Italian; code, comments and docs are in English.

## Features

- **Issue reports on a map** — geolocated, with category, photo and a moderated
  status workflow (`open → acknowledged → resolved`, or `rejected`). Pins are
  clustered and colored by status; filters by category, status and free text;
  one-click upvotes.
- **Polls** — admins open a poll with 2–10 options and an optional closing date.
  Citizens cast one final vote. Results stay hidden until you have voted or the
  poll closes, so early results cannot steer later ones.
- **Roles** — anonymous visitors read the map, reports and polls. Citizens
  contribute. Admins moderate statuses and manage polls, and are promoted
  through the Django admin.
- **Privacy by default** — uploaded photos are re-encoded and stripped of EXIF
  (including GPS) before storage; e-mail addresses are returned only to their
  owner and are never serialized anywhere else.

## Quick start

```sh
git clone https://github.com/pastorello/local-social-network.git
cd local-social-network
docker compose up --build
```

- SPA: http://localhost:5173
- API: http://127.0.0.1:8000
- Django admin: http://127.0.0.1:8000/admin/

The compose stack runs PostgreSQL 17. `.env` is optional — the defaults are
development-safe. For bare-metal runs (SQLite fallback) see
[backend/README.md](./backend/README.md) and
[frontend/README.md](./frontend/README.md).

Create the first admin:

```sh
docker compose exec backend python manage.py shell -c "from account.models import User; User.objects.create_superuser(email='admin@example.com', password='password123', name='admin')"
```

## Commands

Backend commands assume the repo-root venv is active and `DJANGO_DEBUG=true` is
exported — the variable defaults to *off* so that forgetting it in a deployment
fails safe (see [ADR-0002](./docs/adr/0002-debug-off-secret-key-required.md)).

| Command | What it does |
|---|---|
| `docker compose up --build` | Postgres + API :8000 + SPA :5173 |
| `python -m pytest` | Backend tests — **128**, ~3s (from `backend/`) |
| `python -m ruff check .` | Backend lint |
| `npm run dev` | Vite dev server on :5173 (from `frontend/`) |
| `npm run test:unit -- run` | Frontend unit tests — **32** |
| `npm run test:e2e` | Cypress against a production build — **3** |
| `npm run lint` | oxlint then eslint, both with `--fix` |
| `npm run build` | Type-check (`vue-tsc`) + production build |

All of the above run on every push and pull request — see
[.github/workflows/ci.yml](./.github/workflows/ci.yml).

## Architecture

Two applications talking over plain HTTP + CORS.

| Layer | Choice |
|---|---|
| Frontend | Vue 3 (Composition API), TypeScript `strict`, Vite, Pinia, Vue Router, Tailwind v4, Leaflet + markercluster |
| Backend | Django 6, Django REST Framework, JWT (`simplejwt`, rotating refresh tokens) |
| Database | PostgreSQL 17; SQLite fallback for bare-metal development |
| Tests | pytest (API) · Vitest + Vue Test Utils (SPA) · Cypress (e2e) |

The backend is four Django apps — `account` (custom user, UUID pk, e-mail
login), `reports` (the core domain), `polls`, and `common` (shared upload
hardening, not an app). Endpoints live in `api.py` per app and follow a single
error convention, `{detail, fields}`.

Deeper notes, gotchas and conventions live in [CLAUDE.md](./CLAUDE.md), which is
also what coding agents read. Decisions that would be expensive to reverse are
in [docs/adr/](./docs/adr/README.md).

## Project documentation

| Document | What it holds |
|---|---|
| [docs/mvp-spec.md](./docs/mvp-spec.md) | Product spec — functional requirements, non-goals, data model |
| [docs/roadmap.md](./docs/roadmap.md) | What is planned and in what order |
| [docs/tech-debt.md](./docs/tech-debt.md) | Measured debt register, with what is fixed and what is not |
| [docs/adr/](./docs/adr/README.md) | Architecture decision records |
| [docs/deploy.md](./docs/deploy.md) | Deployment notes — not yet exercised, see the roadmap |
| [CLAUDE.md](./CLAUDE.md) | Architecture, conventions and gotchas for humans and agents |

## Status

The feature set specified in `docs/mvp-spec.md` is implemented and tested; the
security and test-infrastructure debt found in the 2026-08-19 audit is largely
paid down. It has **not** been deployed anywhere, and it is not yet designed as
a product someone else could adopt — see the roadmap for what stands between
here and a public instance.
