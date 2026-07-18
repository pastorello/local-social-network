# Gaeta Partecipa

**A civic engagement platform for small cities** (pilot: Gaeta, LT). Citizens
report local issues as pins on a shared map, support each other's reports, and
vote in polls opened by the city administration — one transparent place for
problems and opinions.

The repo is also a documented **case study of structured AI-assisted
development**: a spec-first workflow where every working session is logged,
reviewed and traceable from commit to decision (see
[How this project is built](#how-this-project-is-built)).

> Repo name note: the project started life as a generic "local social network"
> tutorial app and was progressively rebuilt into Gaeta Partecipa — the history
> of that pivot is part of the case study.

## Features

- 🗺️ **Issue reports on a map** — geolocated reports with category, photo
  (EXIF-stripped) and a moderated status workflow (`open → acknowledged →
  resolved`, `rejected`); clustered, status-colored pins; category/status/text
  filters; one-click upvotes
- 🗳️ **Polls** — admins open polls (2–10 options, optional closing date);
  citizens cast one final vote; results stay hidden until you vote or the poll
  closes
- 👤 **Roles** — anonymous visitors browse everything public; citizens
  contribute; admins moderate and manage polls (promoted via Django admin)
- 🇮🇹 UI in Italian, codebase and docs in English (spec N4)

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vue 3 (Composition API) + TypeScript `strict`, Vite, Pinia, Tailwind v4, Leaflet |
| Backend | Django 6 + Django REST Framework, JWT auth (rotating refresh tokens) |
| Database | PostgreSQL 17 (SQLite fallback for bare-metal dev) |
| Testing | pytest (backend API) · Vitest + Vue Testing Library (frontend) · Cypress (e2e) |

## Quickstart (Docker)

```sh
cp .env.example .env   # optional — the defaults work for local development
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://127.0.0.1:8000
- Django admin: http://127.0.0.1:8000/admin/

The compose stack runs PostgreSQL; bare-metal runs fall back to SQLite
automatically — see the [backend](./backend/README.md) and
[frontend](./frontend/README.md) guides.

Deploying a public demo: [docs/deploy.md](./docs/deploy.md).

## Quality gates

```sh
cd backend && python -m pytest && python -m ruff check .   # 76 API tests
cd frontend && npm run test:unit && npm run lint && npm run build   # 32 tests + vue-tsc
```

Definition of done for every feature (spec §9): spec section referenced, tests
green, lint clean, session logged.

## How this project is built

1. **Spec first** — [docs/mvp-spec.md](./docs/mvp-spec.md) precedes
   implementation; scope changes start by editing the spec.
2. **Session cycle** — planning prompt → implementation with Claude Code →
   human code review with written notes.
3. **Traceability** — every session is logged in
   [docs/ai-log/](./docs/ai-log/README.md) (index) and commits reference the log.
4. **Human ownership** — the AI proposes, the author reviews and decides.

## Status

M0 (recovery & audit) → M1 (auth & roles) → M2 (map & reports) → M3 (polls)
are **done**; M4 (showcase: rebrand, auth hardening, deploy prep, docs) is in
progress — demo URL coming with the platform decision (spec §6).
