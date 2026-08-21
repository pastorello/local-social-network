# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is **Gaeta Partecipa**, recentering (v2, 2026-08-21) from a civic-reporting app into a **curated cultural map-archive of Gaeta**: rich-text cards in typed variants (feste with processional routes, chiese, ricette, personaggi storici, dialetto), written by a small circle of admin-approved collaborators, readable by anyone, ultimately aimed at tourists. The authoritative spec is [docs/spec/README.md](docs/spec/README.md) — read it before making product decisions; scope changes start by editing it. [docs/mvp-spec.md](docs/mvp-spec.md) remains the record of the delivered v1 (map reports + polls — all still in the codebase). Decisions that would be expensive to reverse go in [docs/adr/](docs/adr/README.md); measured debt goes in [docs/tech-debt.md](docs/tech-debt.md); planned work goes in [docs/roadmap.md](docs/roadmap.md).

State: **the feature set in the spec is delivered and tested** (spec §11/§13) — M0 through M4, ending with the Gaeta Partecipa rebrand, the Italian copy sweep, auth hardening and deploy prep. A security and quality audit on 2026-08-19 produced [docs/tech-debt.md](docs/tech-debt.md); 27 of its 32 items are closed, plus all 10 documentation items — including every security finding and the whole CI story. **Read that register before proposing work.** "Delivered" is narrow: it means the spec is implemented, not that the product is ready for outside users — the design work that would make it publishable has not been done, and is item 2 of the roadmap. **Deployment is last and happens on the author's signal**, not as a milestone that unlocks; note that photos 404 on any deployment made today ([ADR-0003](docs/adr/0003-media-on-local-filesystem.md)).

Three v2 decisions with teeth, recorded in the spec: **no public signup** — the signup surface becomes a "Collabora con noi" request that the author approves person by person, so accounts are collaborator-only by construction; **rich text is coming** — the SPA currently renders no HTML anywhere and ADR-0001 leans on that, so sanitization + an ADR revision are prerequisites to the first card render, not cleanup afterwards; **one content core, thin type apps** ([ADR-0004](docs/adr/0004-content-core-thin-type-apps.md)) — a new content type must cost days, not a module. The old `posts` and `notifications` apps were **removed in M2** (their patterns live on in `reports`); the tutorial `Question`/`Choice` polls were **replaced in M3** by the spec §7 `Poll`/`PollOption`/`Vote` schema.

Standing decisions (recorded in the spec and audit): no chat/DM; no email activation (signup creates active accounts); anonymous visitors get read access to map/reports/polls in M2, but the user directory and profile pages stay login-only; user e-mails are returned only to their owner via `/api/users/me/` and are never serialized elsewhere; UI copy is Italian (fully swept in M4), code/docs are English; the product brand is **Gaeta Partecipa** (M4) while repo/package names stay `local-social-network`.

## Architecture

Two apps: `backend/` (Django REST API) and `frontend/` (Vue 3 SPA), talking over plain HTTP. `docker compose up --build` runs the whole stack (Postgres 17 + backend :8000 + frontend :5173). Bare-metal: backend falls back to SQLite, frontend defaults its API base URL to `http://127.0.0.1:8000` (`VITE_API_BASE_URL` to override); both servers must run for the app to work end to end.

Configuration is env-driven with dev-safe defaults — see `.env.example` (root, used by compose) and `frontend/.env.example`. `backend/backend/settings.py` reads `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, CORS/CSRF origins, `WEBSITE_URL`, and switches to Postgres when `POSTGRES_HOST` is set.

### Backend (`backend/`)

Django 6 + DRF, four apps:

- `account` — custom `User` (UUID pk, email login, no username; `role` = `citizen`|`admin`, default citizen, promoted via Django admin per spec F1.3). `AUTH_USER_MODEL = 'account.User'`. Signup creates an **active** user immediately.
- `reports` — the core domain: `Category` (admin-managed, seeded with 7 Gaeta defaults in a data migration), `IssueReport` (status workflow `open→acknowledged→resolved`, `rejected`; transitions in `ALLOWED_TRANSITIONS`, admin-only via `role`), `Upvote` (unique user+report, denormalized `upvotes_count`). Photo uploads go through `common/images.py` — a plain package, not an app — shared with `account` so avatars get the same treatment (TD-12): ≤5MB, JPEG/PNG/WEBP **by decoded content**, a 40 Mpx header check before `load()`, EXIF stripped after the orientation is applied, and the stored filename's extension rebuilt from the detected format (TD-13 — Django's own `validate_image_file_extension` allows 70 extensions, many of which are not `image/*`). List/detail/map/categories are **public** (`@permission_classes([])`) — JWT still identifies the user for `upvoted_by_me`.
- `polls` — spec §7 rebuild (M3): `Poll` (question ≤200, `closes_at?`, manual `is_closed`; *effectively* closed when either applies — see `is_currently_closed`), `PollOption` (ordered by `position`), `Vote` (unique user+poll, final — no changes). List/detail are **public**; create/close are admin-only; results (`votes_count`/`total_votes`) serialize as `null` until visible per F3.3 (voted / closed / requester is admin). List orders open polls first (F3.4) via a `closed_rank` annotation. Gotcha: the options prefetch must restate `.order_by('position')` because `annotate()` drops `Meta.ordering`.

Conventions: `models.py` / `serializers.py` / `api.py` (DRF `@api_view` function-based views) / `urls.py` per app; routing mounted under `/api/users/`, `/api/polls/` and `/api/` (reports: `/api/categories/`, `/api/reports/...`) in `backend/backend/urls.py`. UUID pks everywhere. Errors follow `{detail, fields}` via the global handler in `backend/backend/exceptions.py` — raise DRF exceptions, don't hand-roll error JSON. That handler also translates Django's own `ValidationError` into a 400 (TD-14 — the ORM raises it for a malformed UUID and DRF's handler doesn't know it) and rewrites throttle 429s into Italian. Credential endpoints are rate limited via `account/throttling.py` (TD-18); `backend/conftest.py` clears the cache between tests so the limits don't bleed across the suite. Every list endpoint paginates through `common/pagination.py::StandardPagination` (20/page, `page_size` capped at 100); `GET /api/reports/map/` is deliberately unpaginated and returns slim pins for the map. `django-debug-toolbar` is a dev dependency and is installed only when `DEBUG and not TESTING` (TD-24).

Auth is JWT (`rest_framework_simplejwt`): global `IsAuthenticated` default, so new endpoints are locked down unless you add `@authentication_classes([])`/`@permission_classes([])` (see `account.api.signup`). Hardened in M4: access tokens 60 minutes, refresh 30 days with rotation + blacklist (`token_blacklist` app installed — its migrations must run); the SPA refreshes transparently via the 401 interceptor in `frontend/src/lib/auth.ts` (single-flight, one retry per request). Production serving: whitenoise + `STATIC_ROOT`/`collectstatic`, gunicorn pinned, HTTPS hardening block active when `DJANGO_DEBUG=false` (see docs/deploy.md). Never put `email` into `UserSerializer` — it's intentionally omitted (spec F1.4). `/api/users/me/` is the only place a user sees their own email/role, and it goes through `MeSerializer(UserSerializer)`, which adds exactly those two fields; it used to hand-build a dict and spell the avatar `avatar` instead of `avatarURL` (TD-27). `User.get_avatar()` returns **None** when there is no upload — the SPA renders initials via `components/cards/UserAvatar.vue` (TD-30).

### Frontend (`frontend/`)

Vue 3 + Composition API, Vite, Pinia, Vue Router, Tailwind v4, zod (with Italian locale) for form validation, Leaflet via `@vue-leaflet/vue-leaflet` + `leaflet.markercluster` (`components/maps/ReportsMap.vue`, centered on Gaeta; status-colored clustered pins; **leaflet is default-imported on purpose** — a namespace import loses the runtime-registered `markerClusterGroup` in production builds).

- Everything under `src/` is TypeScript (`strict` via `@vue/tsconfig`, `noUncheckedIndexedAccess` set locally in `tsconfig.app.json`); `npm run build` type-checks and must stay green. The Pinia stores (`stores/user.ts`, `stores/toast.ts`) are typed — `user` persists auth state (tokens, profile, `role`) to `localStorage` by hand, refreshes the access token on app init, and `refreshToken()` persists the rotated refresh token (M4). `lib/auth.ts` installs the 401-refresh axios interceptor (wired in `main.ts` right after pinia).
- `router/index.ts` gates routes via `meta.requiresAuth` + a global guard; `/` (map), `/reports/:id` and `/polls` are public, `/users` and `/profile/*` stay auth-only (M1 decision). Write actions check `userStore.user.isAuthenticated` in-component and redirect to login with an Italian toast; `LoginView` honors the guard's `?redirect` query after a successful login (M4).
- `definitions/interfaces/` mirrors the DRF serializers — update these together with serializer changes (e.g. `User` has no `email`; `Report`/`ReportPin`/`ReportStatus` in `Report.ts`, `Category` in `Category.ts`; `Poll`/`PollOption` in `Poll.ts` with `null` counts while results are hidden). Status labels/colors and the admin transition map live in `lib/reportStatus.ts`; `lib/apiErrors.ts` flattens `{detail, fields}` bodies for forms.
- Polls UI is inline in `PollsView` (no detail route): `components/polls/PollCard.vue` renders every state (vote radios / result bars / login prompt / admin close), `PollForm.vue` is the admin create form. Beware `PanelBox` is `h-full` — a stacked column needs `self-start` on its grid item or every panel stretches to the row height (fixed on every stacked view in M4: `PollsView`, `HomeView`, `ReportDetailView`).
- Components emit instead of mutating props (`ReportForm` emits `saved`/`cancel`) — `vue/no-mutating-props` is lint-enforced.

## Commands

### Docker (repo root)

```sh
docker compose up --build     # Postgres + backend :8000 + frontend :5173
```

### Backend (venv at REPO ROOT: `.venv`)

```sh
python3 -m venv .venv && source .venv/bin/activate    # first time
python -m pip install -r backend/requirements-dev.txt # runtime + pytest/ruff

cd backend
export DJANGO_DEBUG=true                              # once per shell (see below)
python manage.py migrate
python manage.py runserver                            # http://127.0.0.1:8000

python -m pytest                                      # canonical test runner
python -m pytest account/tests.py -k signup           # subset
python -m ruff check .                                # lint (must be clean)
```

`python manage.py test` exits 0 but runs nothing (tests are pytest-style) — use pytest.
Shared fixtures (`api_client`, `citizen`, `other_citizen`, `admin`, `make_client`,
autouse `media_root` and a throttle-cache reset) live in `backend/conftest.py`;
`PASSWORD` is in `common/testing.py`. Under pytest, `settings.py` swaps in the MD5
password hasher (TD-05) — that is why the suite runs in ~3s rather than ~50s.

**`DJANGO_DEBUG` defaults to false (TD-11).** Forgetting the variable fails safe
instead of serving tracebacks, and outside debug/test the app raises
`ImproperlyConfigured` unless `DJANGO_SECRET_KEY` is set — it is SimpleJWT's
signing key, so a committed fallback meant anyone could mint an admin token.
Development opts in: `docker compose` passes `DJANGO_DEBUG=true`, bare-metal
shells `export` it, and pytest is exempt via the `TESTING` flag (which is also
why the HTTPS hardening block carries `and not TESTING` — without it
`SECURE_SSL_REDIRECT` answers the test client with a 301).

Create a superuser via `python manage.py shell`:

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
npm run format           # prettier --write --experimental-cli src/
npm run build            # type-check (vue-tsc) + vite build
```

### CI

`.github/workflows/ci.yml` runs the gates on every push to `main` and every pull
request: backend (ruff + pytest, Python 3.14, SQLite fallback) and frontend
(oxlint + eslint + vitest + build, Node 22). A third job runs
Cypress against a **production build** (`npm run test:e2e`, vite preview on
:4173) — not the dev server, because TD-02's double Leaflet bundle and the
default-import gotcha only appear in built output. It must stay green. Two
things to know before editing it: the linters run **check-only** there, because
`npm run lint` applies `--fix` and would let CI pass by rewriting files; and the
e2e job runs no backend, since today's specs exercise the SPA shell only — a
spec that talks to the API needs a service added.

Definition of done for a feature (spec §9): the spec section it implements is referenced, pytest + Vitest green, ruff + eslint clean, `npm run build` green. CI runs all of it on every push and pull request.

## External agent skills (agent-skills + impeccable)

Two third-party skill packs are used with this repo, installed as **Claude Code
plugins (never vendored)** so nothing of theirs is committed here:
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (engineering
process: spec → plan → build → test → review → ship) and
[pbakaus/impeccable](https://github.com/pbakaus/impeccable) (frontend design
quality; 59 deterministic detector rules, `.vue` supported). They do not conflict
with each other — one covers process, the other aesthetics — but they do carry
their own conventions, which this project overrides as follows.

**Install scopes** (2026-08-19). agent-skills is installed at **`local` scope,
pinned to this repo** — declared in `.claude/settings.local.json`, which
this repo's `.gitignore` excludes, so the marketplace reference stays out of the
public repo on every clone and the pack loads in no other project. (Until
2026-08-19 it was covered only by a machine-level `~/.config/git/ignore`, so the
guarantee did not travel — DOC-04.)

impeccable stays a **`user`-scope** install and is currently *disabled*; enable it per session when you actually want a design
pass. Manage both with `claude plugin ... --scope local` from the repo root;
`claude plugin list` shows what is active. Plugins load at process start, so a
scope change only takes effect in the next session.

**Precedence.** The project workflow wins. agent-skills injects a routing
meta-skill at every session start whose behaviours are phrased as
"non-negotiable"; where it disagrees with [docs/mvp-spec.md](docs/mvp-spec.md) §10
(spec first, one goal per session, session log, human ownership) or with the
commands above, this file is authoritative.

**Where artifacts go.** agent-skills defaults to writing `tasks/plan.md` and
`tasks/todo.md` at the repo root — **don't**. `docs/mvp-spec.md` is the scope
authority, planned work goes in [docs/roadmap.md](docs/roadmap.md), debt in
[docs/tech-debt.md](docs/tech-debt.md), and expensive-to-reverse decisions in
[docs/adr/](docs/adr/README.md). Per-task planning files are churn: this repo
has no session logs, by decision (2026-08-20).

**Definition of done** stays the project's own (spec §9): pytest + ruff + Vitest
+ eslint + `npm run build`. A skill's generic checklist does not replace it.

**Language.** Both packs write English by default; UI copy in this app is Italian
(N4). Any copy a skill proposes for the SPA must be translated before it lands.

**Scope guard.** `/impeccable audit` and agent-skills' `frontend-ui-engineering`
both push for a full WCAG pass. N5 scoped that out of the delivered feature set;
roadmap item 2 reopens it as an open question, not as scheduled work. Treat
those findings as advisory until that question is answered.

**Adopted from the pack:** `documentation-and-adrs` — its README structure
(name, one-paragraph description, Quick Start, Commands, Architecture) and its
ADR format and rules on when one is worth writing. See `docs/adr/README.md`.

**Skills not to use here.** Enabling the pack loads all 24 skills, so the
exclusions are rules rather than missing files:

- `spec-driven-development` and `planning-and-task-breakdown` — **evaluated
  2026-08-20 and not adopted**, deliberately, as this file's own rule required.
  The reason is worth keeping: the six areas of the pack's spec template are
  Objective, Commands, Project Structure, Code Style, Testing Strategy and
  Boundaries — five of which are *this file*. It overlaps CLAUDE.md, not
  `docs/mvp-spec.md`, and it has no equivalent of a product spec (F1/F2/F3,
  non-goals). It also mandates `tasks/plan.md` + `tasks/todo.md` per task. So:
  `docs/mvp-spec.md` stays the product spec, CLAUDE.md stays the working
  agreement. Do not run both systems. (Same call the author made in the
  `next-cmp-settings` project, for the same reason.)
- `browser-testing-with-devtools` — requires the `chrome-devtools` MCP server,
  which this setup does not have; use the built-in browser preview instead.
- `performance-optimization` — premature here. Measure after the demo is live
  and only against a real complaint.

`ci-cd-and-automation` is the one worth reaching for next: roadmap item #1 is the
technical-debt register and its first entry is TD-01, which is CI. Deployment is
parked, so `shipping-and-launch` waits until item 2 is unparked. Do not enable
agent-skills' optional `simplify-ignore` or `sdd-cache` hooks: the first rewrites files on disk with placeholders while a
session runs.

**impeccable specifics.** `.impeccable/` is gitignored (live-mode config + cache).
`/impeccable live` temporarily injects a script into `frontend/index.html` —
never commit that inject. If `/impeccable init` writes a root `PRODUCT.md`, it
carries design-facing context only; product scope stays in the spec.
Detector baseline at setup time (2026-08-19), **one real finding, one false
positive** (re-checked in the 2026-08-19 deep audit):

- Real: `SiteTitle.vue` uses a purple gradient, flagged as the classic
  "AI-generated UI" tell — it is the M4 brand, so changing it is a deliberate
  product call, not a defect.
- **False positive:** the reported `text-gray-600` on `bg-green-100` in
  `PollCard.vue:91` does not exist. That line is a ternary and the pairs that
  actually render are `bg-gray-200 text-gray-600` and `bg-green-100
  text-green-700`; the detector combined classes across the `?:`. Do not spend a
  session on it, and treat ternary class bindings as a known blind spot of the
  contrast rule.
