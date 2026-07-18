# Local Social Network — MVP Specification

> **Status:** v0.2 — validated against the codebase; audit + decisions in [docs/ai-log/2026-07-16-audit.md](./ai-log/2026-07-16-audit.md)
> **Author:** Luca Pastorello (spec developed with AI assistance, reviewed and approved by the author)
> **Last update:** 2026-07-18

## 1. Vision

A civic engagement platform for small cities (pilot: Gaeta, LT). Citizens report local issues on a shared map, support each other's reports, and vote on public polls. The goal is to give local communities and administrations a single, transparent place to collect problems and opinions. Product name: **Gaeta Partecipa** (decision 2026-07-18, M4); repo and package names keep `local-social-network`.

## 2. Goals and non-goals

### MVP goals

1. A citizen can register, log in, and manage a minimal profile.
2. A citizen can create a geolocated **issue report** (map pin + category + description + optional photo).
3. Anyone can **browse and filter** reports on the map; logged-in citizens can **upvote** them.
4. An admin can **moderate** reports (change status, remove abusive content).
5. An admin can create **polls**; citizens vote once per poll and see results.
6. The app is demo-able from a single public URL.

### Explicit non-goals (out of MVP)

- Chat / direct messaging (the audit found **no chat code in the repo**; the removable remnant is the friend-request machinery in the `notifications` app, removed in M0)
- Election-day vote counting module
- User groups and invitations
- Native mobile app
- Multi-city support (single-city configuration is fine)

## 3. Users and roles

| Role | Description | Capabilities |
|---|---|---|
| **Visitor** | Not authenticated | Browse map, view reports and poll results |
| **Citizen** | Registered user | Visitor + create reports, upvote, vote in polls |
| **Admin** | City manager / moderator | Citizen + moderate reports, manage categories, create/close polls |

## 4. Functional requirements

### F1 — Authentication and accounts

- **F1.1** Email + password registration with email uniqueness. Registration creates an **active** account immediately — no email activation in the MVP (decision 2026-07-16; the previous activation flow is removed in M0). *(Existing login flow to be consolidated, not rebuilt.)*
- **F1.2** Login / logout; session persists across page reloads.
- **F1.3** Role field on user (`citizen` | `admin`); admins are promoted via Django admin, not self-service.
- **F1.4** Minimal profile: display name, optional avatar. No public user pages in MVP — clarified 2026-07-17: the prototype's user directory and profile pages remain but are **accessible only to authenticated users** (they stay auth-only when M2 opens anonymous read access). E-mail addresses are returned only to their owner via `/api/users/me/`, never serialized elsewhere.

### F2 — Map and issue reports

> Implementation note (decision 2026-07-16): the existing `posts` app (author FK, image attachment, denormalized counters, `reported_by_users` moderation hook) is the **foundation to be evolved into `IssueReport`** — extend/rename rather than build alongside.

- **F2.1** Full-screen map of the configured city (default center/zoom in config).
- **F2.2** A citizen creates a report by picking a point on the map and filling: **title** (required, ≤ 100 chars), **description** (required, ≤ 2000 chars), **category** (required, from admin-managed list), **photo** (optional, 1 image, ≤ 5 MB, jpg/png/webp).
- **F2.3** Report statuses: `open` → `acknowledged` → `resolved` (admin-only transitions). `rejected` available for moderation.
- **F2.4** Map shows pins clustered at low zoom; pin color reflects status.
- **F2.5** Filters: by category, by status, free-text search on title.
- **F2.6** Report detail view: all fields, photo, author display name, creation date, upvote count.
- **F2.7** A citizen can upvote a report once (toggle). Authors can upvote their own reports (keep it simple).
- **F2.8** A citizen can edit/delete **their own** report while status is `open`.

### F3 — Polls

- **F3.1** Admin creates a poll: **question** (≤ 200 chars), 2–10 **options**, optional **closing date**.
- **F3.2** A citizen votes for exactly one option; the vote is final (no changes in MVP).
- **F3.3** Results (percentages + counts) are visible to a citizen only after voting, and to everyone after the poll closes. *(M3 decision: admins always see results — they create and close polls.)*
- **F3.4** Poll list: open polls first, then closed ones.

## 5. Non-functional requirements

- **N1 — Type safety:** frontend in **TypeScript `strict: true`**; no `any` in application code (lint-enforced).
- **N2 — Testing:** unit tests on business logic and API integration tests; minimum coverage gates defined in the quality plan (§9).
- **N3 — Responsive:** usable on mobile (map interactions included); desktop-first layout is acceptable.
- **N4 — Language:** UI copy in Italian; codebase and docs in English.
- **N5 — Accessibility:** semantic HTML, keyboard-accessible forms, alt text on images. Full WCAG audit is out of scope.
- **N6 — Privacy:** photos are the only user-generated media; EXIF GPS data stripped on upload. No tracking/analytics in MVP.

## 6. Architecture and stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Vue 3 (Composition API) + TypeScript strict** | ≈⅔ of SFCs already TS; the 2 Pinia stores + 9 script blocks are converted in M0 (A6) |
| State | Pinia | Confirmed (A3); stores become typed TS in M0 |
| Map | **Leaflet + OpenStreetMap tiles** | Already integrated (`CityMap.vue` on the home view, centered on Gaeta) |
| Backend | **Django + Django REST Framework** | Existing |
| DB | PostgreSQL from M0 (Docker Compose) | SQLite fallback for bare-metal dev; plain lat/lng columns; PostGIS is overkill for MVP |
| Auth | **JWT via djangorestframework-simplejwt (existing — keep)** | Decided after audit (A2); hardened in M4: 60-min access, 30-day rotating refresh + blacklist, transparent 401-refresh in the SPA |
| Media | Django media storage (local in dev; S3-compatible in prod if needed) | |
| Dev env | Docker Compose (db + backend + frontend) | |
| Deploy (demo) | Single VPS or PaaS free tier, one public URL | Prep done in M4 (gunicorn + whitenoise + [deploy guide](./deploy.md)); platform still to be chosen |

## 7. Data model (draft)

```
User          id, email, password, display_name, avatar?, role, created_at
Category      id, name, color, is_active
IssueReport   id, author→User, category→Category, title, description,
              lat, lng, photo?, status, created_at, updated_at
Upvote        id, user→User, report→IssueReport, created_at   [unique(user, report)]
Poll          id, question, created_by→User, closes_at?, is_closed, created_at
PollOption    id, poll→Poll, text, position
Vote          id, user→User, poll→Poll, option→PollOption, created_at   [unique(user, poll)]
```

## 8. API surface (draft, REST)

The existing URL prefixes are canonical (decision 2026-07-16 — smallest change): auth lives under `/api/users/`, and there is no logout endpoint (JWT — the client discards its tokens).

```
# Existing (keep)
POST   /api/users/signup/            POST   /api/users/login/        POST /api/users/refresh/
GET    /api/users/me/

# Implemented in M2
GET    /api/categories/
GET    /api/reports/?category=&status=&q=&author=     POST /api/reports/
GET    /api/reports/map/            (unpaginated slim pins for the map — M2 addition)
GET    /api/reports/:id/             PATCH  /api/reports/:id/        DELETE /api/reports/:id/
POST   /api/reports/:id/upvote/     (toggle)
PATCH  /api/reports/:id/status/     (admin)

# Implemented in M3 (replaced the tutorial polls endpoints)
GET    /api/polls/                   POST   /api/polls/              (admin)
GET    /api/polls/:id/               POST   /api/polls/:id/vote/
PATCH  /api/polls/:id/close/        (admin)
```

Conventions: JSON everywhere, pagination on list endpoints, errors as `{ "detail": string, "fields"?: {...} }`.

Migration tasks recorded by the audit: existing list endpoints implemented as `POST .../list/` move to `GET` + query params when their area is touched (users → done in M1, polls → done in M3); ad-hoc error shapes converged to `{detail, fields}` in M2 (global DRF exception handler + account endpoints on real 4xx codes).

## 9. Quality plan

- **Frontend:** Vitest + Vue Testing Library. Every store/composable with logic has unit tests; each view has at least one rendering test. Target: meaningful coverage of logic, not a vanity %.
- **Backend:** pytest + DRF test client. Every endpoint: happy path + auth/permission failure + validation failure.
- **Linting:** ESLint (with `@typescript-eslint` strict rules) + Prettier; ruff for Python.
- **Definition of done** for a feature: spec section referenced, tests green, lint clean, AI session logged (§10), self-review notes in the PR/commit description.

## 10. AI-assisted workflow (how this project is built)

This project doubles as a documented case study of structured AI-assisted development:

1. **Spec first** — this document precedes implementation; changes to scope require editing the spec.
2. **Session cycle** — each work session: a planning prompt → implementation with Claude Code → human code review with written notes (what the AI got wrong, what was changed and why).
3. **Traceability** — session logs live in `docs/ai-log/YYYY-MM-DD-topic.md`; commits reference the session file.
4. **Human ownership** — every merge is reviewed and approved by the author; the AI proposes, the author decides.

## 11. Milestones

| # | Milestone | Content | Exit criteria |
|---|---|---|---|
| M0 | **Recovery & audit** | Project runs locally (Docker); AI-generated tech-debt report; dead code (friend-request remnants, broken polls views) removed | `docker compose up` works; audit doc committed; `npm run build`, `npm run lint`, `npm run test:unit`, `python manage.py test` all exit 0 |
| M1 | **Auth & roles** | Consolidated login, roles, profile; auth tests | F1 complete + tests green |
| M2 | **Map & reports** | Map, report CRUD, filters, upvotes, moderation | F2 complete + tests green |
| M3 | **Polls** | Poll creation, voting, results | F3 complete + tests green |
| M4 | **Showcase** | Public demo, polished README, AI-log index, LinkedIn write-up | Demo URL live; docs complete |

## 12. Assumptions — RESOLVED

Validated in the M0 audit ([docs/ai-log/2026-07-16-audit.md](./ai-log/2026-07-16-audit.md), incl. a runtime smoke test):

- **A1** Login works end-to-end (runtime-verified). Registration worked but was gated on a console-only activation email (**dropped by decision**) and had a broken success redirect; profile editing was broken — both fixed in M0.
- **A2** Auth is **JWT via djangorestframework-simplejwt** — kept as-is; hardening deferred to M4.
- **A3** State management is **Pinia** — confirmed.
- **A4** Polls = Django-tutorial code with no per-user voting and dead template views (removed in M0) → F3 is a rebuild on the §7 schema. Posts = the most complete feature → becomes the **IssueReport foundation** (F2 note).
- **A5** Dev DB was SQLite with clean, in-sync migrations; **Postgres from M0** via Docker Compose.
- **A6** Real TS coverage is **≈⅔ of SFCs**, not ~10% (GitHub language stats count `.vue` files as Vue); the remaining 2 stores + 9 script blocks are converted in M0.
