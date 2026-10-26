# Local Social Network — MVP Specification

> **Archived on 2026-10-26** — a closed record in `docs/archive/`, not a live file of the project: read it for *why*, never to plan ([README.md](./README.md)).

> **Superseded as product authority on 2026-08-21 by [spec/README.md](../spec/README.md)**
> (the v2 pivot: cultural map-archive, collaborator-only accounts). This
> document remains the record of the delivered v1 — everything in it was
> built, tested and remains in the codebase. The product was called *Gaeta
> Partecipa* at the time; it is **Vivere Gaeta** from v2 on. Mentions of the old
> name below are left as written — this is a record of what happened.


> **Status:** v0.3 — **MVP closed** (code-complete, all milestones done); see §13
> **Author:** Luca Pastorello (spec developed with AI assistance, reviewed and approved by the author)
> **Last update:** 2026-07-20

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
- **N2 — Testing:** unit tests on business logic and API integration tests. No numeric coverage gate — see §9 for what is actually required.
- **N3 — Responsive:** usable on mobile (map interactions included); desktop-first layout is acceptable.
- **N4 — Language:** UI copy in Italian; codebase and docs in English.
- **N5 — Accessibility:** semantic HTML, keyboard-accessible forms, alt text on images. Full WCAG audit is out of scope.
- **N6 — Privacy:** photos are the only user-generated media; EXIF GPS data stripped on upload. No tracking/analytics in MVP.

## 6. Architecture and stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Vue 3 (Composition API) + TypeScript strict** | ≈⅔ of SFCs already TS; the 2 Pinia stores + 9 script blocks are converted in M0 (A6) |
| State | Pinia | Confirmed (A3); stores become typed TS in M0 |
| Map | **Leaflet + OpenStreetMap tiles** | `components/maps/ReportsMap.vue` + markercluster, centered on Gaeta (the pre-MVP `CityMap.vue` was replaced in M2; v2's C5 renamed this one `GaetaMap.vue`, since it draws more than reports) |
| Backend | **Django + Django REST Framework** | Existing |
| DB | PostgreSQL from M0 (Docker Compose) | SQLite fallback for bare-metal dev; plain lat/lng columns; PostGIS is overkill for MVP |
| Auth | **JWT via djangorestframework-simplejwt (existing — keep)** | Decided after audit (A2); hardened in M4: 60-min access, 30-day rotating refresh + blacklist, transparent 401-refresh in the SPA |
| Media | Django media storage (local in dev; S3-compatible in prod if needed) | |
| Dev env | Docker Compose (db + backend + frontend) | |
| Deploy (demo) | Single VPS or PaaS free tier, one public URL | Prep done in M4 (gunicorn + whitenoise + [deploy guide](../deploy.md)); platform still to be chosen |

## 7. Data model (draft)

```
User          id, email, password, name, avatar?, role, date_joined
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
POST   /api/users/editprofile/       POST   /api/users/editpassword/
GET    /api/users/list/?q=           GET    /api/users/:id/          (both auth-only, F1.4)

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

Migration tasks recorded by the audit: existing list endpoints implemented as `POST .../list/` move to `GET` + query params when their area is touched (users → done in M1, keeping the `/list/` path segment; polls → done in M3); ad-hoc error shapes converged to `{detail, fields}` in M2 (global DRF exception handler + account endpoints on real 4xx codes).

## 9. Quality plan

- **Frontend:** Vitest + Vue Test Utils. Every store/composable with logic has unit tests; each view has at least one rendering test. Cypress covers end-to-end flows against a production build. Target: meaningful coverage of logic, not a vanity %.
- **Backend:** pytest + DRF test client. Every endpoint: happy path + auth/permission failure + validation failure.
- **Linting:** oxlint then ESLint (`vueTsConfigs.recommended` + `eslint-plugin-vue` essential), plus Prettier; ruff for Python. CI runs both linters check-only — `npm run lint` applies `--fix`.
- **Definition of done** for a feature: the spec section it implements is referenced, pytest + Vitest green, ruff + ESLint + Prettier (`--check`) clean, `npm run build` green. All of it runs in CI on every push and pull request.

## 10. Working agreement

1. **Spec first for product scope.** This document decides what the product
   does. Adding or cutting a feature starts by editing it, not by writing code.
2. **Decisions that are expensive to reverse** go in `docs/adr/`; known debt goes
   in `docs/tech-debt.md`; conventions and gotchas go in `CLAUDE.md`.
3. **Every merge is reviewed by the author.** Most of the code here is written
   with Claude Code; that changes who types it, not who is responsible for it.

## 11. Milestones

| # | Milestone | Content | Exit criteria |
|---|---|---|---|
| M0 | **Recovery & audit** | Project runs locally (Docker); AI-generated tech-debt report; dead code (friend-request remnants, broken polls views) removed | `docker compose up` works; audit committed; `npm run build`, `npm run lint`, `npm run test:unit`, `python -m pytest` all exit 0 |
| M1 | **Auth & roles** | Consolidated login, roles, profile; auth tests | F1 complete + tests green |
| M2 | **Map & reports** | Map, report CRUD, filters, upvotes, moderation | F2 complete + tests green |
| M3 | **Polls** | Poll creation, voting, results | F3 complete + tests green |
| M4 | **Polish** | Rebrand to Gaeta Partecipa, Italian copy sweep, auth hardening, deploy notes, README | Complete ✅. Deployment was never part of it — see §13 |

## 12. Assumptions — RESOLVED

Validated in the M0 audit (2026-07-16, including a runtime smoke test):

- **A1** Login works end-to-end (runtime-verified). Registration worked but was gated on a console-only activation email (**dropped by decision**) and had a broken success redirect; profile editing was broken — both fixed in M0.
- **A2** Auth is **JWT via djangorestframework-simplejwt** — kept as-is; hardening deferred to M4.
- **A3** State management is **Pinia** — confirmed.
- **A4** Polls = Django-tutorial code with no per-user voting and dead template views (removed in M0) → F3 is a rebuild on the §7 schema. Posts = the most complete feature → becomes the **IssueReport foundation** (F2 note).
- **A5** Dev DB was SQLite with clean, in-sync migrations; **Postgres from M0** via Docker Compose.
- **A6** Real TS coverage is **≈⅔ of SFCs**, not ~10% (GitHub language stats count `.vue` files as Vue); the remaining 2 stores + 9 script blocks are converted in M0.

## 13. Delivery status

**The feature set specified above is delivered** (2026-07-20). All five
milestones in §11 are done: F1–F3 implemented and tested, N1–N6 met. A security
and quality audit followed on 2026-08-19 and its findings are tracked in
[tech-debt.md](../tech-debt.md).

Read "delivered" narrowly: it means *this document* is implemented. It does not
mean the product is ready for people outside the project to use. Hosting was
never part of it — `docs/deploy.md` makes the app deployable, but choosing where
and paying for it is a decision the author takes when the product is worth it.
When this was written, the design work that would make it worth it had not been
done; it was item 1 of the [roadmap](../roadmap.md), and it was **completed
2026-08-31** (the record is in
[roadmap-archive.md](./roadmap-archive.md)). What still stands between the app
and a public URL is roadmap item 3 — a host, a mail provider, a sender domain —
and item 4, the content. Both are deliberately named there rather than hidden
behind "MVP complete".
