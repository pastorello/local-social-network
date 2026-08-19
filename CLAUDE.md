# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is pivoting from a generic social network into a **civic engagement platform for small cities** (map-based issue reports + polls; pilot city: Gaeta). The authoritative spec is [docs/mvp-spec.md](docs/mvp-spec.md) — read it before making product decisions; scope changes start by editing the spec (§10, spec-first workflow). Every work session gets a log in `docs/ai-log/YYYY-MM-DD-topic.md` and commits reference it.

Milestone state: **the MVP is closed (2026-07-20) — M0 through M4 are all done**, per spec §11/§13. M4 delivered the Gaeta Partecipa rebrand, full Italian copy sweep, auth hardening, deploy prep (docs/deploy.md), and README/AI-log-index/LinkedIn docs. See `docs/ai-log/` for what happened in each session. The hosting decision + live demo URL (spec §6) and publishing the LinkedIn draft were **explicitly descoped from the MVP** (author decision, spec §13) — they're now **item 2** in `docs/roadmap.md`, the post-MVP scope doc, and were **parked on 2026-08-19** (no domain, no Python host, no public database — author decision). The **active workstream is item 1**: the technical-debt register in [docs/tech-debt.md](docs/tech-debt.md), audited twice on 2026-08-19 (measurement, then code-reading). Read it before proposing work — it carries four P0 security items that must land before the demo is unparked. The old `posts` and `notifications` apps were **removed in M2** (their patterns live on in `reports`); the tutorial `Question`/`Choice` polls were **replaced in M3** by the spec §7 `Poll`/`PollOption`/`Vote` schema.

Standing decisions (recorded in the spec and audit): no chat/DM; no email activation (signup creates active accounts); anonymous visitors get read access to map/reports/polls in M2, but the user directory and profile pages stay login-only; user e-mails are returned only to their owner via `/api/users/me/` and are never serialized elsewhere; UI copy is Italian (fully swept in M4), code/docs are English; the product brand is **Gaeta Partecipa** (M4) while repo/package names stay `local-social-network`.

## Architecture

Two apps: `backend/` (Django REST API) and `frontend/` (Vue 3 SPA), talking over plain HTTP. `docker compose up --build` runs the whole stack (Postgres 17 + backend :8000 + frontend :5173). Bare-metal: backend falls back to SQLite, frontend defaults its API base URL to `http://127.0.0.1:8000` (`VITE_API_BASE_URL` to override); both servers must run for the app to work end to end.

Configuration is env-driven with dev-safe defaults — see `.env.example` (root, used by compose) and `frontend/.env.example`. `backend/backend/settings.py` reads `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, CORS/CSRF origins, `WEBSITE_URL`, and switches to Postgres when `POSTGRES_HOST` is set.

### Backend (`backend/`)

Django 6 + DRF, four apps:

- `account` — custom `User` (UUID pk, email login, no username; `role` = `citizen`|`admin`, default citizen, promoted via Django admin per spec F1.3). `AUTH_USER_MODEL = 'account.User'`. Signup creates an **active** user immediately.
- `reports` — the core domain: `Category` (admin-managed, seeded with 7 Gaeta defaults in a data migration), `IssueReport` (status workflow `open→acknowledged→resolved`, `rejected`; transitions in `ALLOWED_TRANSITIONS`, admin-only via `role`), `Upvote` (unique user+report, denormalized `upvotes_count`). Photo uploads go through `reports/images.py` (≤5MB, JPEG/PNG/WEBP by content, EXIF stripped). List/detail/map/categories are **public** (`@permission_classes([])`) — JWT still identifies the user for `upvoted_by_me`.
- `polls` — spec §7 rebuild (M3): `Poll` (question ≤200, `closes_at?`, manual `is_closed`; *effectively* closed when either applies — see `is_currently_closed`), `PollOption` (ordered by `position`), `Vote` (unique user+poll, final — no changes). List/detail are **public**; create/close are admin-only; results (`votes_count`/`total_votes`) serialize as `null` until visible per F3.3 (voted / closed / requester is admin). List orders open polls first (F3.4) via a `closed_rank` annotation. Gotcha: the options prefetch must restate `.order_by('position')` because `annotate()` drops `Meta.ordering`.

Conventions: `models.py` / `serializers.py` / `api.py` (DRF `@api_view` function-based views) / `urls.py` per app; routing mounted under `/api/users/`, `/api/polls/` and `/api/` (reports: `/api/categories/`, `/api/reports/...`) in `backend/backend/urls.py`. UUID pks everywhere. Errors follow `{detail, fields}` via the global handler in `backend/backend/exceptions.py` — raise DRF exceptions, don't hand-roll error JSON. Reports and polls lists are paginated (DRF, 20/page); `GET /api/reports/map/` returns unpaginated slim pins for the map.

Auth is JWT (`rest_framework_simplejwt`): global `IsAuthenticated` default, so new endpoints are locked down unless you add `@authentication_classes([])`/`@permission_classes([])` (see `account.api.signup`). Hardened in M4: access tokens 60 minutes, refresh 30 days with rotation + blacklist (`token_blacklist` app installed — its migrations must run); the SPA refreshes transparently via the 401 interceptor in `frontend/src/lib/auth.ts` (single-flight, one retry per request). Production serving: whitenoise + `STATIC_ROOT`/`collectstatic`, gunicorn pinned, HTTPS hardening block active when `DJANGO_DEBUG=false` (see docs/deploy.md). Never put `email` into `UserSerializer` — it's intentionally omitted (spec F1.4); `/api/users/me/` is the only place a user sees their own email/role.

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
python manage.py migrate
python manage.py runserver                            # http://127.0.0.1:8000

python -m pytest                                      # canonical test runner
python -m pytest account/tests.py -k signup           # subset
python -m ruff check .                                # lint (must be clean)
```

`python manage.py test` exits 0 but runs nothing (tests are pytest-style) — use pytest.

**Gotcha (TD-10):** the local `.venv` was copied from another project, so its
`bin/pip` shebang points elsewhere and `python` may not resolve after
`activate`. If the commands above fail with `command not found: python`, call the
interpreter directly — `.venv/bin/python -m pytest` from `backend/` — or recreate
the venv from `backend/requirements-dev.txt`.

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
(oxlint + eslint + vitest + build, Node 22). It must stay green. Two things to
know before editing it: the linters run **check-only** there, because
`npm run lint` applies `--fix` and would let CI pass by rewriting files; and
Cypress is deliberately not wired up until TD-16 (a spec red since M4) is fixed.

Definition of done for a feature (spec §9): spec section referenced, pytest + Vitest green, ruff + eslint clean, `npm run build` green, self-review notes in the PR/commit description, session log in `docs/ai-log/`, commits reference the log.

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
`tasks/todo.md` at the repo root — **don't**. The spec is the only scope
authority, post-MVP scope goes in [docs/roadmap.md](docs/roadmap.md), and
per-session planning belongs in that session's `docs/ai-log/` entry.

**Definition of done** stays the project's own (spec §9): pytest + ruff + Vitest
+ eslint + `npm run build`. A skill's generic checklist does not replace it.

**Language.** Both packs write English by default; UI copy in this app is Italian
(N4). Any copy a skill proposes for the SPA must be translated before it lands.

**Scope guard.** `/impeccable audit` and agent-skills' `frontend-ui-engineering`
both push for a full WCAG pass. N5 scopes that out of the MVP and the roadmap
places it before a real public launch — treat those findings as advisory, not as
work to start.

**Skills not to use here.** Enabling the pack loads all 24 skills, so the
exclusions are rules rather than missing files:

- `spec-driven-development` and `planning-and-task-breakdown` — this project's
  spec system is `docs/mvp-spec.md` + `docs/roadmap.md` + `docs/ai-log/`. Two
  overlapping spec systems produce inconsistent behaviour between sessions. If
  the pack's version ever looks better, replace ours deliberately and record the
  decision — do not run both. (Same call the author made in the
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
