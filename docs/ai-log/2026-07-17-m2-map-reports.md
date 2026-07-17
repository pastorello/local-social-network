# M2 — Map & issue reports

> **Date:** 2026-07-17
> **Milestone:** M2 (spec §11) — "Map, report CRUD, filters, upvotes, moderation. Exit: F2 complete + tests green."
> **Branch:** `m2-map-reports` (off `main` after PR #2 squash-merge)

## Scope interpretation (stated in chat before building, author did not object)

The M0 decision "repurpose posts as the IssueReport foundation" (chosen over "keep as a parallel feature"), combined with spec §4 having no feed/likes/comments requirement, means M2 **replaces** the posts feature: its patterns (author FK, attachment handling, denormalized counters) live on in `reports`, and the `posts` + `notifications` apps and the feed UI are removed. Nav is now Mappa / Sondaggi / Utenti.

## Changes

### Backend
- New `reports` app per spec §7: `Category` (admin-managed, color, active flag; **seed migration with 7 Gaeta starter categories**), `IssueReport` (UUID, author, category `PROTECT`, title ≤100, description ≤2000, lat/lng validated, optional photo, status), `Upvote` (unique user+report).
- Status workflow (F2.3): forward-only `open → acknowledged → resolved`, `rejected` allowed from open/acknowledged; encoded in `ALLOWED_TRANSITIONS`, validated server-side.
- API (spec §8): `GET /api/categories/` · `GET|POST /api/reports/` (filters `category/status/q/author`, DRF pagination 20/page, `page_size` ≤100) · **`GET /api/reports/map/`** (spec addition: unpaginated slim pins payload for the map) · `GET|PATCH|DELETE /api/reports/:id/` (owner-only while `open`, F2.8) · `POST .../upvote/` toggle (F2.7) · `PATCH .../status/` (**admin-only — first `role` consumer**).
- Anonymous read access (decision from M0): list/detail/map/categories are public; JWT still identifies the user when present (`upvoted_by_me`).
- Photos (F2.2 + N6): ≤5 MB, JPEG/PNG/WEBP validated by content (Pillow), **EXIF stripped** with orientation applied first (`reports/images.py`).
- Error convention (spec §8): global DRF exception handler emits `{detail, fields}`; **account endpoints converted too** (signup 201/400, editprofile/editpassword 200/400, user detail 404s instead of 500ing).
- `posts` + `notifications` apps deleted; `User.posts_count` dropped (migration `account.0006`). Existing dev DBs keep orphaned `posts_*` tables — recreate the compose volume (`docker compose down -v`) for a clean schema.
- **29 new endpoint tests** (see `reports/tests.py`), including: EXIF actually stripped from the stored file, >5 MB and GIF rejected, permission matrix for edit/delete/status, upvote toggle/accumulation, filters, pagination shape, `{detail, fields}` bodies. Total backend suite: **45**.

### Frontend
- `ReportsMap.vue`: status-colored `circleMarker`s in a `leaflet.markercluster` group (F2.4), tooltip + click→detail, click-to-place mode with a draft marker. Deliberate **default import of leaflet** (namespace import can lose the runtime-registered `markerClusterGroup` in production bundles).
- `HomeView`: reports hub — CTA "Segnala un problema" (anonymous users get a toast + login redirect), placing flow with `ReportForm` (title/description/category/photo with preview, Italian copy), filters panel (text/category/status → server-side) + status legend.
- `ReportDetailView` (`/reports/:id`, public): all F2.6 fields, upvote toggle with auth prompt, owner Modifica/Elimina while open (form reuse for PATCH), admin Moderazione panel with per-status transition buttons.
- `ProfileView` reworked: shows the user's reports (`?author=`) instead of the dead posts endpoint.
- Router: `/` and `/reports/:id` public; user pages stay auth-only (M1 decision). Feed UI, `CityMap`, post interfaces deleted; `User` interface drops `posts_count`.
- Tests: StatusBadge (label + color), ReportForm (render, client-side validation blocks submit, cancel emit); cypress smoke updated (anonymous map + auth redirect for `/users`). Vitest total: **15**.

## F2 status

F2.1 map ✅ (full-width panel; "full-screen" reading deferred to M4 layout polish) · F2.2 create ✅ · F2.3 statuses ✅ · F2.4 colored clustered pins ✅ · F2.5 filters ✅ · F2.6 detail ✅ · F2.7 upvote toggle ✅ · F2.8 own edit/delete while open ✅ · anonymous browse ✅

## Gates

`pytest` 45/45 · `ruff` clean · `manage.py check` + `makemigrations --check` clean · `npm run build` / `lint` / `test:unit` (15/15) green · live compose + browser verification recorded below.

## Post-verification fix (author bug report, same day)

Clicking the map in placing mode did nothing (and the existing pin didn't render). Two stacked causes, found by instrumenting the live app: (1) `use-global-leaflet="false"` makes vue-leaflet load its **own second copy** of Leaflet (`leaflet-src.esm`), and layers built from our CJS instance can't attach to a map built from the other — fixed by assigning our (markercluster-augmented) instance to `globalThis.L` and switching to `use-global-leaflet="true"`; (2) the map container could be measured at **width 0** before the grid layout settled, giving degenerate bounds (markercluster renders nothing, click coordinates broken) — fixed with `map.invalidateSize()` on ready plus a `ResizeObserver` on the wrapper (also covers the layout shift when the filter panel toggles). Verified fixed by the author on a real browser.

## Review notes for the author

- `/api/reports/map/` is a pragmatic spec §8 addition (documented there) — the paginated list would otherwise cap the map at one page.
- Report edit (F2.8) does not allow moving the pin (lat/lng editable via API, not exposed in the edit form) — kept minimal; add if citizens ask.
- Notifications: removed rather than wired (no spec requirement, no producers left after posts removal). If M3+ wants "your report was resolved" notifications, that's a fresh, purposeful build.
- The polls area is untouched and still login-only; it opens up with the M3 rebuild.
