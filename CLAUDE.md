# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is pivoting from a generic social network into a **civic engagement platform for small cities** (map-based issue reports + polls; pilot city: Gaeta). The authoritative spec is [docs/mvp-spec.md](docs/mvp-spec.md) — read it before making product decisions; scope changes start by editing the spec (§10, spec-first workflow). Every work session gets a log in `docs/ai-log/YYYY-MM-DD-topic.md` and commits reference it.

Milestone state: **M0 (recovery & audit), M1 (auth & roles) and M2 (map & issue reports) are done** — see `docs/ai-log/` for what happened in each. The old `posts` and `notifications` apps were **removed in M2** (their patterns live on in `reports`). Next: **M3 (polls)** — rebuild `polls` on the spec §7 schema (`Poll`/`PollOption`/`Vote` with per-user votes; the current tutorial-style `Question`/`Choice` has no vote attribution) and open poll reading to visitors.

Standing decisions (recorded in the spec and audit): no chat/DM; no email activation (signup creates active accounts); anonymous visitors get read access to map/reports/polls in M2, but the user directory and profile pages stay login-only; user e-mails are returned only to their owner via `/api/users/me/` and are never serialized elsewhere; UI copy is Italian (currently mixed — full sweep planned in M4), code/docs are English.

## Architecture

Two apps: `backend/` (Django REST API) and `frontend/` (Vue 3 SPA), talking over plain HTTP. `docker compose up --build` runs the whole stack (Postgres 17 + backend :8000 + frontend :5173). Bare-metal: backend falls back to SQLite, frontend defaults its API base URL to `http://127.0.0.1:8000` (`VITE_API_BASE_URL` to override); both servers must run for the app to work end to end.

Configuration is env-driven with dev-safe defaults — see `.env.example` (root, used by compose) and `frontend/.env.example`. `backend/backend/settings.py` reads `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, CORS/CSRF origins, `WEBSITE_URL`, and switches to Postgres when `POSTGRES_HOST` is set.

### Backend (`backend/`)

Django 6 + DRF, four apps:

- `account` — custom `User` (UUID pk, email login, no username; `role` = `citizen`|`admin`, default citizen, promoted via Django admin per spec F1.3). `AUTH_USER_MODEL = 'account.User'`. Signup creates an **active** user immediately.
- `reports` — the core domain: `Category` (admin-managed, seeded with 7 Gaeta defaults in a data migration), `IssueReport` (status workflow `open→acknowledged→resolved`, `rejected`; transitions in `ALLOWED_TRANSITIONS`, admin-only via `role`), `Upvote` (unique user+report, denormalized `upvotes_count`). Photo uploads go through `reports/images.py` (≤5MB, JPEG/PNG/WEBP by content, EXIF stripped). List/detail/map/categories are **public** (`@permission_classes([])`) — JWT still identifies the user for `upvoted_by_me`.
- `polls` — tutorial-style `Question`/`Choice`, integer pks, one `POST /api/polls/list/` endpoint; slated for a full M3 rebuild (`views.py` is a stub).

Conventions: `models.py` / `serializers.py` / `api.py` (DRF `@api_view` function-based views) / `urls.py` per app; routing mounted under `/api/users/`, `/api/polls/` and `/api/` (reports: `/api/categories/`, `/api/reports/...`) in `backend/backend/urls.py`. UUID pks everywhere except `polls`. Errors follow `{detail, fields}` via the global handler in `backend/backend/exceptions.py` — raise DRF exceptions, don't hand-roll error JSON. Reports list is paginated (DRF, 20/page); `GET /api/reports/map/` returns unpaginated slim pins for the map.

Auth is JWT (`rest_framework_simplejwt`): global `IsAuthenticated` default, so new endpoints are locked down unless you add `@authentication_classes([])`/`@permission_classes([])` (see `account.api.signup`). Access tokens 30 days, refresh 180 (hardening deferred to M4). Never put `email` into `UserSerializer` — it's intentionally omitted (spec F1.4); `/api/users/me/` is the only place a user sees their own email/role.

### Frontend (`frontend/`)

Vue 3 + Composition API, Vite, Pinia, Vue Router, Tailwind v4, zod (with Italian locale) for form validation, Leaflet via `@vue-leaflet/vue-leaflet` + `leaflet.markercluster` (`components/maps/ReportsMap.vue`, centered on Gaeta; status-colored clustered pins; **leaflet is default-imported on purpose** — a namespace import loses the runtime-registered `markerClusterGroup` in production builds).

- Everything under `src/` is TypeScript (`strict` + `noUncheckedIndexedAccess` via `@vue/tsconfig`); `npm run build` type-checks and must stay green. The Pinia stores (`stores/user.ts`, `stores/toast.ts`) are typed — `user` persists auth state (tokens, profile, `role`) to `localStorage` by hand and refreshes the access token on app init.
- `router/index.ts` gates routes via `meta.requiresAuth` + a global guard; `/` (map) and `/reports/:id` are public, `/users` and `/profile/*` stay auth-only (M1 decision). Write actions check `userStore.user.isAuthenticated` in-component and redirect to login with an Italian toast.
- `definitions/interfaces/` mirrors the DRF serializers — update these together with serializer changes (e.g. `User` has no `email`; `Report`/`ReportPin`/`Category` in `Report.ts`). Status labels/colors and the admin transition map live in `lib/reportStatus.ts`.
- Components emit instead of mutating props (`ReportForm` emits `saved`/`cancel`) — `vue/no-mutating-props` is lint-enforced.

## Commands

### Docker (repo root)

```sh
docker compose up --build     # Postgres + backend :8000 + frontend :5173
```

### Backend (venv at REPO ROOT: `.venv`)

```sh
python3 -m venv .venv && source .venv/bin/activate    # first time
pip install -r backend/requirements-dev.txt           # runtime + pytest/ruff

cd backend
python manage.py migrate
python manage.py runserver                            # http://127.0.0.1:8000

python -m pytest                                      # canonical test runner
python -m pytest account/tests.py -k signup           # subset
python -m ruff check .                                # lint (must be clean)
```

`python manage.py test` exits 0 but runs nothing (tests are pytest-style) — use pytest. Create a superuser via `python manage.py shell`:

```python
from account.models import User
User.objects.create_superuser(email="admin@example.com", password="password123", name="admin")
```

### Frontend (run from `frontend/`)

```sh
npm install
npm run dev              # Vite dev server on :5173

npm run test:unit        # Vitest
npm run test:unit -- src/stores/__tests__/user.spec.ts   # single file
npm run test:e2e:dev     # Cypress against the Vite dev server
npm run test:e2e         # Cypress against a production build (build first)

npm run lint             # oxlint --fix, then eslint --fix --cache
npm run format           # prettier --write src/
npm run build            # type-check (vue-tsc) + vite build
```

Definition of done for a feature (spec §9): spec section referenced, pytest + Vitest green, ruff + eslint clean, session log in `docs/ai-log/`, commits reference the log.
