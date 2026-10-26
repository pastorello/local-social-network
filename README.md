# Vivere Gaeta

A cultural map of Gaeta (LT), in the making: the feasts and their processional
routes, the churches, the recipes and where to buy them, the historical
figures, the dialect — rich-text cards written by a small circle of approved
collaborators, drawn on a shared map, readable by anyone. Built for the people
who love this city, and ultimately for the tourists who visit it.

It grew out of (and still contains) a civic-reporting platform: geolocated
issue reports with a moderated status workflow, and polls. Those remain — the
reports as one of the map's layers, now collaborator-authored. The product
direction is [docs/spec/](./docs/spec/README.md) (v2, 2026-08-21).

> The repository is still named `local-social-network`: the project started as a
> generic social-network tutorial app and was rebuilt into this. The reader's UI
> is in Italian and English, the collaborator's in Italian; code, comments and
> docs are in English.

## Features

- **A front door that asks** — the home is «Che cosa ti va di fare?», the
  first step of a short wizard (the beach, the town, eating, a drink, what is
  on this week) that ends on «Cosa si può fare qui»: a zone of town and what
  there is to do in it. The address printed on the B&B cards, `/benvenuto`,
  leads there; the map is `/mappa`.
- **A map under every page** — one Leaflet map of Gaeta is the ground of the
  whole app; every page opens as a panel over it, and the map moves to show
  what the page is about. One toggleable layer per card type that has a place,
  plus the reports layer, and overlays (district boundaries, georeferenced
  historical maps) behind a visibility gate.
- **Cards in nine types, in two menus** — *Esplora*: luoghi (churches among
  them), **itinerari** — curated tours built from the other cards, followed
  one stop at a time, with each leg handed to Google Maps — and attività, the
  businesses worth knowing, never ranked; *Tradizioni*: feste (with their
  processional routes and dated editions), ricette, personaggi storici,
  dialetto, libri consigliati. Plus **events**, dated and with their posters.
  Rich text is sanitized on the server; every card can be translated, and the
  reader's interface speaks Italian and English («IT · EN»).
- **Collaborators by invitation only** — no public signup. "Collabora con noi"
  files a request, the author approves it in Django admin, and the invite
  arrives by e-mail. Collaborators write and publish; drafts are invisible to
  everyone else.
- **Issue reports and polls** (from v1), for collaborators only since
  2026-10-22 and 2026-10-24 — geolocated reports with a moderated status
  workflow and upvotes; polls whose results stay hidden until you have voted
  or the poll closes.
- **Accessible and private by default** — WCAG 2.1 AA is the bar
  ([ADR-0005](./docs/adr/0005-wcag-2.1-aa-accessibility-bar.md)), gated in CI;
  uploaded photos are re-encoded and stripped of EXIF (including GPS); e-mail
  addresses are returned only to their owner.

## Quick start

```sh
git clone https://github.com/pastorello/local-social-network.git
cd local-social-network
docker compose up --build --renew-anon-volumes
```

- SPA: http://localhost:5173
- API: http://127.0.0.1:8000
- Django admin: http://127.0.0.1:8000/admin/

The compose stack runs PostgreSQL 17. `.env` is optional — the defaults are
development-safe.

**Without Docker**, once the venv and `node_modules` exist, one command starts
both halves and one Ctrl-C stops them:

```sh
scripts/dev
```

It runs on the SQLite fallback, applies pending migrations first, and refuses
to start if either port is already taken — move them with
`API_PORT=8001 WEB_PORT=5174 scripts/dev`. Per-half detail is in
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
| `scripts/dev` | API :8000 + SPA :5173 bare metal, one Ctrl-C stops both |
| `docker compose up --build --renew-anon-volumes` | Postgres + API :8000 + SPA :5173 — `-V` so a dependency change reaches the SPA's `node_modules` (TD-51) |
| `python -m pytest` | Backend tests — **547**, a few seconds (from `backend/`) |
| `python -m ruff check .` | Backend lint |
| `npm run dev` | Vite dev server on :5173 (from `frontend/`) |
| `npm run test:unit -- run` | Frontend unit tests — **268** |
| `npm run test:e2e` | Cypress against a production build — **47** (needs the API running, seeded by `seed_e2e`; see CLAUDE.md) |
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

The backend is fifteen Django apps: `account` (custom user, UUID pk, e-mail
login, the invite flow), `content` (the shared card core — sanitized rich text,
images, map features, translations), one thin app per card type (`feste`,
`chiese`, `ricette`, `personaggi`, `dialetto`, `libri`, `luoghi`, `attivita`,
`itinerari`), `eventi` (dated events, which are not cards), `maps` (layers and
overlays), and v1's `reports` and `polls`; `common` holds the shared upload
hardening, media serving and Gaeta's clock, and is not an app. Endpoints live in `api.py` per app and follow a single error convention,
`{detail, fields}`.

Deeper notes, gotchas and conventions live in [CLAUDE.md](./CLAUDE.md), which is
also what coding agents read. Decisions that would be expensive to reverse are
in [docs/adr/](./docs/adr/README.md).

## Project documentation

| Document | What it holds |
|---|---|
| [docs/spec/](./docs/spec/README.md) | **Product spec (v2)** — the cultural map: content types, roles, non-goals |
| [docs/roadmap.md](./docs/roadmap.md) | What is planned and in what order — **what is still ahead** |
| [docs/tech-debt.md](./docs/tech-debt.md) | Measured debt register — **what is still open** |
| [docs/adr/](./docs/adr/README.md) | Architecture decision records |
| [docs/deploy.md](./docs/deploy.md) | Deployment guide — the runbook of viveregaeta.it, live since 2026-10-22 |
| [docs/overlays-howto.md](./docs/overlays-howto.md) | How to upload the map's overlays — boundaries and historical scans |
| [CLAUDE.md](./CLAUDE.md) | Architecture, conventions and gotchas for humans and agents |
| [docs/archive/](./docs/archive/README.md) | **Not live — records only** (2026-10-26): the v1 spec, the roadmap's and the debt register's closed halves, the UX review of 2026-10-22. Read them for *why*, never to plan |

## Status

**Release 2.0.0 is live at [viveregaeta.it](https://viveregaeta.it)** (tag
`v2.0.0`, 2026-10-26). Everything the v2 spec asks for is built and tested —
the five build phases (accounts, the content core, the card types,
translations, the map), the design pass, the map under every page, luoghi and
itinerari, «Cosa si può fare qui», businesses and events, the wizard «Cosa fare
adesso», and the reader's interface in English — and the UX review of
2026-10-22 is closed. The debt register keeps three items open: two on
purpose, and the author's decision on what was hidden before the release
(TD-55). What is missing is **content**: the archive is empty until its
collaborators write it. See [docs/roadmap.md](./docs/roadmap.md).
