# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is mid-pivot: the existing code is a generic social network (posts, likes, comments, polls, friend-request notifications), but the project is being redirected into a **civic engagement platform for small cities** (map-based issue reports + polls). The authoritative spec for where the project is going is [docs/mvp-spec.md](docs/mvp-spec.md) — read it before making product decisions. Key implications for any nontrivial change:

- Chat/friend-request features are slated for removal, not extension.
- A new domain (`IssueReport`, `Category`, `Upvote`, geolocation) is planned but not yet implemented; posts/likes/comments are the closest existing analogue to model it after.
- The spec's "Assumptions to verify" (§12) may already be answered by reading the code (e.g. auth is JWT via `djangorestframework_simplejwt`, not sessions; DB is SQLite in dev, not Postgres; state management is Pinia). Don't assume the spec's guesses are current fact — verify against the code below.
- UI copy is Italian; code/docs are English.

## Architecture

Two independently-run apps with no shared build tooling: `backend/` (Django REST API) and `frontend/` (Vue 3 SPA). They talk over plain HTTP — `frontend/src/main.ts` hardcodes `axios.defaults.baseURL = 'http://127.0.0.1:8000'` and there is no dev-server proxy, so the backend must be running on port 8000 for the frontend to work.

### Backend (`backend/`)

Django 6 + DRF, split into four apps under `backend/`:

- `account` — custom `User` model (UUID pk, email-based login, no username), signup/login/profile endpoints. `AUTH_USER_MODEL = 'account.User'`.
- `posts` — `Post`, `Like`, `Comment`, `PostAttachment`, `Trend` (hashtag trend counter).
- `polls` — `Question`/`Choice`, the *only* app still using Django's classic template views (`views.DetailView`, `views.ResultsView`, `views.vote`) alongside a DRF `api.polls_list`; everything else is pure API.
- `notifications` — `Notification` linking `created_by`/`created_for` users to a post, typed via `type_of_notification` (friend request + post like/comment types — the friend-request types are part of the chat/social features slated for removal per the MVP spec).

Conventions across apps: each app has `models.py`, `serializers.py`, `api.py` (DRF `@api_view` function-based views, not class-based/viewsets), and `urls.py`; `views.py` exists only where legacy template views survive (currently `polls`). Most models use UUID primary keys (`account`, `posts`, `notifications`); `polls` still uses default integer pks. Routing is mounted in `backend/backend/urls.py` under `/api/users/`, `/api/posts/`, `/api/polls/`, `/api/notifications/`.

Auth is JWT (`rest_framework_simplejwt`): `DEFAULT_PERMISSION_CLASSES` is `IsAuthenticated` globally, so new endpoints are locked down by default — use `@authentication_classes([])`/`@permission_classes([])` to open one up (see `account.api.signup`). Access tokens live 30 days, refresh 180 days (`SIMPLE_JWT` in `backend/backend/settings.py`); the frontend's `stores/user.js` persists both in `localStorage` and calls `/api/users/refresh/` on app init.

Signup sends an activation email (console backend in dev) with a link to `/activateemail/`, and creates the user as `is_active = False` until clicked.

### Frontend (`frontend/`)

Vue 3 + Composition API, Vite, Pinia, Vue Router, Tailwind v4, vee-validate + zod for forms, Leaflet (`@vue-leaflet/vue-leaflet`) for maps (currently only `components/maps/CityMap.vue`, not yet wired to a reports feature).

- `stores/user.js` and `stores/toast.js` are the only Pinia stores, and are plain `.js` — not yet migrated to TypeScript despite the rest of `src` being `.ts`/`.vue`. Auth state (`isAuthenticated`, tokens, profile fields) is mirrored into `localStorage` manually (no `pinia-plugin-persistedstate`).
- `router/index.ts` gates routes via `meta.requiresAuth` + a global `beforeEach` that checks `userStore.user.isAuthenticated`; almost every route requires auth except `/login` and `/signup`.
- `definitions/interfaces/` holds hand-written TS interfaces mirroring the DRF serializers (`Post`, `Comment`, `Poll`, `User`, etc.) — update these alongside serializer changes.
- Per the MVP spec, TypeScript `strict: true` with no `any` is the target for application code, but the codebase is only partially there (the two stores, notably). Don't assume existing `.js`/loose-typed files are the pattern to replicate in new code.

## Commands

### Backend (run from `backend/`, with the venv active)

```sh
python3 -m venv .env && source .env/bin/activate   # first time only
pip install -r requirements.txt

python manage.py makemigrations
python manage.py migrate
python manage.py runserver                          # http://127.0.0.1:8000

python manage.py test                               # all tests
python manage.py test posts                         # single app
python manage.py test posts.tests.SomeTestCase       # single test case
```

Create a superuser via `python manage.py shell`:

```python
from account.models import User
user = User.objects.create_superuser(email="admin@example.com", password="password123", name="admin")
user.save()
```

### Frontend (run from `frontend/`)

```sh
npm install
npm run dev              # Vite dev server on :5173

npm run test:unit        # Vitest
npm run test:unit -- path/to/file.spec.ts   # single file (Vitest CLI passthrough)
npm run test:e2e:dev     # Cypress against the Vite dev server
npm run test:e2e         # Cypress against a production build (CI-representative)

npm run lint             # oxlint --fix, then eslint --fix --cache
npm run format           # prettier --write src/
npm run build            # type-check (vue-tsc) + vite build
```

Both the backend (`python manage.py runserver`, default :8000) and frontend dev server must be running simultaneously for the app to work end to end — there's no Docker Compose yet, despite it being called out as a target in the MVP spec (M0).
