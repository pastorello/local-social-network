# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is **Vivere Gaeta** (called *Gaeta Partecipa* through v1, renamed 2026-08-21), recentering (v2, 2026-08-21) from a civic-reporting app into a **curated cultural map-archive of Gaeta**: rich-text cards in typed variants (feste with processional routes, chiese, ricette, personaggi storici, dialetto), written by a small circle of admin-approved collaborators, readable by anyone, ultimately aimed at tourists. The authoritative spec is [docs/spec/README.md](docs/spec/README.md) — read it before making product decisions; scope changes start by editing it. [docs/mvp-spec.md](docs/mvp-spec.md) remains the record of the delivered v1 (map reports + polls — all still in the codebase). Decisions that would be expensive to reverse go in [docs/adr/](docs/adr/README.md); measured debt goes in [docs/tech-debt.md](docs/tech-debt.md); planned work goes in [docs/roadmap.md](docs/roadmap.md).

State: **the v1 feature set is delivered and tested** (spec §11/§13) — M0 through M4, ending with the Gaeta Partecipa rebrand (renamed **Vivere Gaeta** in v2), the Italian copy sweep, auth hardening and deploy prep. A security and quality audit on 2026-08-19 produced [docs/tech-debt.md](docs/tech-debt.md); 28 of its 32 items are closed, plus all 10 documentation items — including every security finding and the whole CI story. **Read that register before proposing work.** **v2 phase C1 (accounts) is delivered** (2026-08-21): the "Collabora con noi" request/approve/invite flow and password reset replace v1's open signup — see the `account` bullet below. **Phase C2 (content core + feste) is delivered** (2026-08-22): sanitized rich-text cards, images, a procession-route map, draft/publish — see the `content`/`feste` bullets below and [ADR-0001](docs/adr/0001-jwt-in-localstorage.md)'s amendment. **Vivere Gaeta targets WCAG 2.1 Level AA, whole app** ([ADR-0005](docs/adr/0005-wcag-2.1-aa-accessibility-bar.md), 2026-08-22) — a target with a remediation plan, not a claim of present conformance; the ADR's Consequences section is the source of truth for what's fixed versus deliberately deferred. **Phase C3 (the remaining thin type apps) is delivered** (2026-08-22): `chiese`, `ricette`, `personaggi`, `dialetto` — see the bullets below and `content/api_helpers.py`. **Phase C4 (translations) is delivered** (2026-08-22): per-card translations (English first), the collaborator's "traduci questo articolo in…" control, and the reader's language switch — see `content/api_helpers.py::start_translation`/`visible_translations` and the `content`/`feste` bullets below. **Phase C5 (the map: layers & overlays) is delivered** (2026-08-27), completing the v2 build order: the new `maps` app, one toggleable layer per card type, and overlays in both kinds with the confidentiality gate [ADR-0006](docs/adr/0006-overlay-visibility-gate.md) records — see the `maps` bullet below. TD-02 (double Leaflet bundle) was paid at the head of that phase and is closed. "Delivered" is narrow: it means the spec is implemented, not that the product is ready for outside users — nobody has styled this product, and TD-04's e2e coverage is still one spec. **The next phase is the design pass** ([docs/roadmap.md](docs/roadmap.md) item 1, chosen 2026-08-27). Its interview is done and its spec is written — **[docs/spec/design.md](docs/spec/design.md), read it before touching a stylesheet**: two audiences with opposite postures (logged-out reader mobile-first and primary; logged-in collaborator desktop-first and secondary), the mobile home as a full-bleed map with a bottom sheet, a register of "cultural magazine, not tourist brochure", the palette taken from Gaeta with the purple retired, and **colour in tokens, never in a component** — which is also what keeps the author's multi-city ambition from costing a second redesign. TD-04's e2e coverage deliberately follows this pass rather than pinning selectors on screens about to be redrawn. **Deployment is last and happens on the author's signal**, not as a milestone that unlocks; note that photos 404 on any deployment made today ([ADR-0003](docs/adr/0003-media-on-local-filesystem.md)).

Three v2 decisions with teeth, recorded in the spec: **no public signup** — the signup surface becomes a "Collabora con noi" request that the author approves person by person, so accounts are collaborator-only by construction (**built in C1**); **rich text is coming** — the SPA currently renders no HTML anywhere and ADR-0001 leans on that, so sanitization + an ADR revision are prerequisites to the first card render, not cleanup afterwards (**built in C2** — `content/sanitize.py` + the ADR-0001 amendment); **one content core, thin type apps** ([ADR-0004](docs/adr/0004-content-core-thin-type-apps.md)) — a new content type must cost days, not a module (**core + first type, `feste`, built in C2**). The old `posts` and `notifications` apps were **removed in M2** (their patterns live on in `reports`); the tutorial `Question`/`Choice` polls were **replaced in M3** by the spec §7 `Poll`/`PollOption`/`Vote` schema.

Standing decisions (recorded in the spec and audit): no chat/DM; no e-mail confirmation loop (an account is created active — first by v1 signup, now by admin approval in C1 — never by a "confirm your address" click); anonymous visitors get read access to map/reports/polls in M2, but the user directory and profile pages stay login-only; user e-mails are returned only to their owner via `/api/users/me/` and are never serialized elsewhere; UI copy is Italian (fully swept in M4), code/docs are English; the product brand is **Vivere Gaeta** (v2; it was Gaeta Partecipa in M4) while repo/package names stay `local-social-network`.

## Architecture

Two apps: `backend/` (Django REST API) and `frontend/` (Vue 3 SPA), talking over plain HTTP. `docker compose up --build` runs the whole stack (Postgres 17 + backend :8000 + frontend :5173). Bare-metal: backend falls back to SQLite, frontend defaults its API base URL to `http://127.0.0.1:8000` (`VITE_API_BASE_URL` to override); both servers must run for the app to work end to end.

Configuration is env-driven with dev-safe defaults — see `.env.example` (root, used by compose) and `frontend/.env.example`. `backend/backend/settings.py` reads `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, CORS/CSRF origins, `WEBSITE_URL`, `FRONTEND_URL` (C1 — the SPA's own base URL, used to build invite/password-reset links; distinct from `WEBSITE_URL`, which is the API's), and switches to Postgres when `POSTGRES_HOST` is set. `EMAIL_BACKEND` follows the same `TESTING`/`DEBUG` gating as everything else: `locmem` under pytest, the console backend in dev, real SMTP (`EMAIL_HOST`/`EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD`/`EMAIL_USE_TLS`) otherwise.

### Backend (`backend/`)

Django 6 + DRF, eleven apps:

- `account` — custom `User` (UUID pk, email login, no username; `role` = `citizen`|`admin`, default citizen, promoted via Django admin per spec F1.3; the internal `citizen` identifier is unchanged even though the v2 spec calls this tier "Collaborator" — a vocabulary shift, not a rename). `AUTH_USER_MODEL = 'account.User'`. **C1 (spec accounts.md):** there is no public signup — `POST /api/users/collaborate/` (public, honeypot + timing anti-spam, no CAPTCHA) files a `CollaborationRequest`; a `CollaborationRequestAdmin` action in Django admin approves or rejects it (approving creates the `User` with `set_unusable_password()` and e-mails a single-use invite link) or rejects it. `AccountToken` is one model shared by invite and reset (`purpose`, hashed token, `expires_at`, `used_at`; `AccountToken.create_for()` retires any prior unused token of the same purpose) — `POST /api/users/acceptinvite/` and `POST /api/users/requestpasswordreset/` + `/api/users/confirmpasswordreset/` consume it (reset requests always return 200, existing e-mail or not, to avoid enumeration). `User.is_steering` (spec politics.md) is a confidential capability flag, admin-settable only via `UserAdmin` — it must never be added to `UserSerializer`/`MeSerializer`. Its one consumer is C5's seggi overlay, read through `maps`' visibility gate ([ADR-0006](docs/adr/0006-overlay-visibility-gate.md)) — never through a serialized field.
- `content` — **C2 (spec content.md, ADR-0004):** the shared core every card type wraps, not an API of its own (no `urls.py`/`api.py` — a plain library app, like `common/` but with models). `Card` (UUID pk, `title`, `body_html` — always pre-sanitized, `author` FK `PROTECT`, `is_published`, plus `language`/`translation_of`, wired up in **C4**) has no type-discriminator field — a card's type is found via the reverse OneToOne (`hasattr(card, 'feste')`), not a stored field that could drift out of sync. `CardImage` (ordered, `common/images.py` unchanged) and `MapFeature` (`kind` = `point`|`route`, `position`, optional `label` — consecutive `route` rows form a polyline; `point` rows are independent pins) cover every type's map footprint in the spec's table without a schema change per type. `content/sanitize.py::sanitize_html` (`nh3`, strict allowlist, h2/h3 only — a card's own title is the page's h1) is the **one chokepoint** every type's write path calls; see the ADR-0001 amendment for why this is safe to render via `v-html`. **C3** added `content/api_helpers.py` (image save/remove, point-pin parse/replace, author-or-admin permission checks) and `content/serializers.py` (the shared `CardImageSerializer`) — extracted once a second type app needed the same write-path logic feste had inlined, so every type app (feste included, for images) now shares one implementation rather than one copy each. **C4 (spec translations.md):** `content/api_helpers.py::start_translation` is the single write path every type's new `<type>_translate` view calls — it forbids translating a translation (no chaining: the group is always original-plus-its-translations, never a tree) and creates the empty target-language `Card` + blank type row T2 describes ("traduci questo articolo in…" opens an empty version alongside the source), English (`en`) being the only entry in `TRANSLATABLE_LANGUAGES` so far (T1/T3 — more languages and machine-translation assistance are later work). `content/serializers.py::visible_translations` is the matching read-side helper — published-only for anyone but the card group's author/admin — that every type's Read serializer calls for its `translations` field (a `TranslationSerializer` list) alongside plain `language`/`translation_of` fields.
- `feste` — **C2, the first (and richest) thin type app**, proving the core per ADR-0004's "days not weeks" bar: `Feste` (`card` OneToOneField as `primary_key=True` — a Feste's id **is** its card's id, the classic Django one-to-one-as-subtype pattern), `recurrence` (free text, e.g. "Ogni 9 giugno" — not a computed calendar rule), `programme` (plain text, not rich). `FesteWriteSerializer` is a plain `Serializer`, not a `ModelSerializer`: it writes across `Card`+`Feste` at once, and images/route are handled in `feste/api.py` (`request.FILES.getlist('images')`, a JSON-encoded `route` string) rather than fought into DRF's multipart+nested-list handling. `GET /api/feste/mine/` exists because collaborators are not Django-admin `is_staff` (C1) — it's the only way they find their own drafts again. A draft 404s (not 403s) for anyone but its author/admin, so an outsider can't distinguish "doesn't exist" from "exists but hidden".
- `chiese`, `ricette`, `personaggi`, `dialetto` — **C3, the remaining four thin type apps**, each following feste's shape (models/serializers/api/urls/admin/migrations/tests) but calling `content/api_helpers.py` instead of re-implementing it: `Chiesa` (no extra fields; map footprint is one fixed pin, so its write path caps the shared point-parsing at `max_points=1` rather than a bespoke scalar field), `Ricetta` (`ingredients`/`servings`/`procedure`, all plain text; zero-or-more "sold here" pins), `Personaggio` (`life_dates` as free text — same rationale as `recurrence`, historical dates are often uncertain, e.g. "sec. XV" — plus a small-capped optional pins list for birthplace/monument), `dialetto`'s `Termine` (`term`/`meaning`/`example_usage`; **no map handling at all** — its `api.py` never imports the point helpers, matching the spec's "none" footprint for this type). Mounted at `/api/chiese/`, `/api/ricette/`, `/api/personaggi/`, `/api/dialetto/`.
- `maps` — **C5 (spec map.md, ADR-0006):** the map's own app, mounted at `/api/map/`. Two public endpoints: `features/` returns every **published, non-translated** card that has a `MapFeature`, grouped one entry per card (`{id, type, title, points, route}`) so the SPA draws all four card layers from one unpaginated call — translations are excluded because a translated card is a second `Card` row and would put two pins on one doorstep. `overlays/` returns what *this reader* may see. `Overlay` is one model for both kinds the spec asks for (`kind` = `vector`, a GeoJSON document, or `raster`, a georeferenced image plus its `south`/`west`/`north`/`east` bounds), validated in `clean()` because the write path is Django admin — there is no collaborator-facing overlay editor, the author supplies the boundaries and the scans. **The gate:** `Overlay.objects.visible_to(user)` is the only place `visibility` (`public`|`collaborators`|`steering`) is read, it defaults to **`steering`** (the most restrictive tier — publishing an overlay is one explicit admin edit, never a side effect of creating one), and `OverlaySerializer` **must never serialize it** — a test asserts the word never appears in a response body. This is `User.is_steering`'s first consumer; read ADR-0006 before touching any of it.
- `reports` — the core domain: `Category` (admin-managed, seeded with 7 Gaeta defaults in a data migration), `IssueReport` (status workflow `open→acknowledged→resolved`, `rejected`; transitions in `ALLOWED_TRANSITIONS`, admin-only via `role`), `Upvote` (unique user+report, denormalized `upvotes_count`). Photo uploads go through `common/images.py` — a plain package, not an app — shared with `account` (and now `content`) so every upload gets the same treatment (TD-12): ≤5MB, JPEG/PNG/WEBP **by decoded content**, a 40 Mpx header check before `load()`, EXIF stripped after the orientation is applied, and the stored filename's extension rebuilt from the detected format (TD-13 — Django's own `validate_image_file_extension` allows 70 extensions, many of which are not `image/*`). List/detail/map/categories are **public** (`@permission_classes([])`) — JWT still identifies the user for `upvoted_by_me`.
- `polls` — spec §7 rebuild (M3): `Poll` (question ≤200, `closes_at?`, manual `is_closed`; *effectively* closed when either applies — see `is_currently_closed`), `PollOption` (ordered by `position`), `Vote` (unique user+poll, final — no changes). List/detail are **public**; create/close are admin-only; results (`votes_count`/`total_votes`) serialize as `null` until visible per F3.3 (voted / closed / requester is admin). List orders open polls first (F3.4) via a `closed_rank` annotation. Gotcha: the options prefetch must restate `.order_by('position')` because `annotate()` drops `Meta.ordering`.

Conventions: `models.py` / `serializers.py` / `api.py` (DRF `@api_view` function-based views) / `urls.py` per app; routing mounted under `/api/users/`, `/api/feste/`, `/api/map/`, `/api/polls/` and `/api/` (reports: `/api/categories/`, `/api/reports/...`) in `backend/backend/urls.py` — `content` has no mount point of its own (see above). UUID pks everywhere. Errors follow `{detail, fields}` via the global handler in `backend/backend/exceptions.py` — raise DRF exceptions, don't hand-roll error JSON. That handler also translates Django's own `ValidationError` into a 400 (TD-14 — the ORM raises it for a malformed UUID and DRF's handler doesn't know it) and rewrites throttle 429s into Italian. Credential endpoints are rate limited via `account/throttling.py` (TD-18); `backend/conftest.py` clears the cache between tests so the limits don't bleed across the suite. Every list endpoint paginates through `common/pagination.py::StandardPagination` (20/page, `page_size` capped at 100); `GET /api/reports/map/` is deliberately unpaginated and returns slim pins for the map. `django-debug-toolbar` is a dev dependency and is installed only when `DEBUG and not TESTING` (TD-24).

Auth is JWT (`rest_framework_simplejwt`): global `IsAuthenticated` default, so new endpoints are locked down unless you add `@authentication_classes([])`/`@permission_classes([])` (see `account.api.collaborate`). Hardened in M4: access tokens 60 minutes, refresh 30 days with rotation + blacklist (`token_blacklist` app installed — its migrations must run); the SPA refreshes transparently via the 401 interceptor in `frontend/src/lib/auth.ts` (single-flight, one retry per request). Production serving: whitenoise + `STATIC_ROOT`/`collectstatic`, gunicorn pinned, HTTPS hardening block active when `DJANGO_DEBUG=false` (see docs/deploy.md). Never put `email` into `UserSerializer` — it's intentionally omitted (spec F1.4). `/api/users/me/` is the only place a user sees their own email/role, and it goes through `MeSerializer(UserSerializer)`, which adds exactly those two fields; it used to hand-build a dict and spell the avatar `avatar` instead of `avatarURL` (TD-27). `User.get_avatar()` returns **None** when there is no upload — the SPA renders initials via `components/cards/UserAvatar.vue` (TD-30).

### Frontend (`frontend/`)

Vue 3 + Composition API, Vite, Pinia, Vue Router, Tailwind v4 (+ `@tailwindcss/typography` since C2, for `.prose` on rendered rich text), zod (with Italian locale) for form validation, Leaflet via `@vue-leaflet/vue-leaflet` + `leaflet.markercluster` (`components/maps/GaetaMap.vue`, centered on Gaeta; **leaflet is default-imported on purpose** — a namespace import loses the runtime-registered `markerClusterGroup` in production builds; `vite.config.ts` also aliases `leaflet/dist/leaflet-src.esm` onto the same entry, which is TD-02's fix and keeps vue-leaflet's fallback import from resolving to a second, unaugmented copy), Tiptap (`@tiptap/vue-3` + `@tiptap/starter-kit`, since C2) for rich-text authoring.

- **C2 content components** (`components/content/`): `RichTextEditor.vue` wraps Tiptap (`StarterKit.configure({ heading: { levels: [2, 3] }, link: {...} })` — StarterKit already bundles Link in Tiptap v3, a separate `@tiptap/extension-link` would just duplicate it); `RichText.vue` is the **only `v-html` in the codebase** (ADR-0001's amendment) — it must only ever render `card.body_html` as returned by the API, never anything else, since its safety argument depends on there being exactly one sanitizing chokepoint (`backend/content/sanitize.py`) feeding exactly one render path. `FesteRouteEditor.vue` (click-to-add-stop route editor, `readonly` prop reused for the public display) is built on `composables/useLeafletMap.ts`, a new composable extracting the default-import/`globalThis.L`/resize-observer init glue — **`GaetaMap.vue` (`ReportsMap.vue` at the time) was deliberately left as-is** rather than migrated onto it, to avoid touching a working, Cypress-covered map component for internal tidiness alone; C5 extended it instead of migrating it, for the same reason. No unit test mounts a real Leaflet map anywhere in this codebase (jsdom can't resolve Leaflet's marker-icon PNG imports) — `GaetaMap.vue` never had one and `FesteRouteEditor.vue` follows the same precedent; `FesteForm.spec.ts` and `HomeView.spec.ts` stub the map out instead.

- **C3 generic type components**: `chiese`/`ricette`/`personaggi`/`dialetto` share one config-driven `TypeForm.vue`/`TypeListView.vue`/`TypeDetailView.vue`/`TypeCreateView.vue` set (in `components/content/` and `views/`) instead of four literal copies of the `Feste*.vue` files — each route passes its `definitions/typeConfigs.ts` entry (`endpoint`, `routeNames`, `extraFields`, `mapMode`) as a `config` prop. `feste` keeps its own dedicated views; its route editor and `recurrence`/`programme` fields don't generalize cleanly and weren't worth disturbing (same call as leaving the home map alone when `useLeafletMap` shipped). `MapPinsEditor.vue` is the pin-editing counterpart to `FesteRouteEditor.vue` for the capped/unordered case (chiese's single pin, ricette/personaggi's multiple) — a separate component, not a prop on `FesteRouteEditor.vue`, since ordered-route-with-polyline and capped-unordered-bag diverge too much to share past the `useLeafletMap` composable and the manual lat/lng/label a11y fallback. `AppHeader.vue`'s nav replaced the flat "Feste" `MenuButton` with `SchedeMenu.vue`, a keyboard-operable disclosure menu (`aria-haspopup`/`aria-expanded`, closes on Escape/outside-click/route change) listing all five card types — five flat nav items plus Utenti would have overflowed the nav row.

- **C4 translations** (`components/content/`): `LanguageSwitch.vue` (reader-facing) and `TranslateControl.vue` (the "traduci questo articolo in…" collaborator control, T2) are shared across `TypeDetailView.vue` and `FesteDetailView.vue` — both read the same `translations`/`language`/`translation_of` fields every type's Read serializer now carries, so no per-type copy was needed. `TranslateControl` posts to `<type>/<id>/traduci/`, then `router.push`es straight to the new (empty) translation's own detail route with `?edit=1`; the target-language set is `lib/languages.ts::TRANSLATABLE_LANGUAGES` (English only today, per T1/T3). Both detail views gained a `watch(() => route.params.id, …)` for this: navigating card-detail-to-card-detail keeps the same route record, so Vue Router reuses the component instance instead of remounting it, and `editing` has to drop to `false` before the refetch resolves — `TypeForm.vue`/`FesteForm.vue` only read their `item`/`feste` prop once at setup, so flipping straight to edit mode would otherwise mount the form with the still-stale previous card.

- **C5 the map** (spec map.md): `components/maps/GaetaMap.vue` is the one map — reports (clustered, status colors), the four card layers, and both overlay kinds. It only draws what it is handed: `HomeView.vue` owns which layers are on and passes filtered `pins`/`features`/`overlays`, so the toggles are plain computed filters and not map state. Overlays are added and removed **by id**, never rebuilt as a group, because the opacity slider fires continuously while dragged and a rebuild per tick makes a raster flash; they also get their own Leaflet panes (`z-index` 350/380, between the tiles and everything clickable) so a polygon can't swallow a pin's click. `lib/mapLayers.ts` holds the layer list (key, label, color, route) — `key` is deliberately both the API's `type` and the card's route segment, so a pin knows where it links without a per-type lookup. The left panel's "Luoghi sulla mappa" list is the keyboard path a clickable pin does not have (ADR-0005 defers full map-widget operability). `definitions/interfaces/MapData.ts` mirrors the two `maps` endpoints and, like the API, **has no `visibility` field** — do not add one.
- **The design pass** (spec [design.md](docs/spec/design.md), roadmap item 1, in progress since 2026-08-27): **colour and type live in `assets/main.css` as `@theme static` tokens and nowhere else** (D8) — no component writes a hex or names a font family, and `lib/tokens.ts::readToken` reads them back for the handful of callers that must hand a real colour string to Leaflet, each with the same value as a fallback so a token that fails to cascade degrades visibly rather than to `undefined`. `static` is deliberate: Tailwind otherwise emits only the properties its generated utilities reference, so a token the layout has not reached yet would vanish from the document. **Fonts are self-hosted** (D6b) — a Google Fonts `<link>` would reintroduce exactly what TD-30 and accounts.md A1 removed, and the app ships one `@font-face` with the latin subset rather than `@fontsource`'s three. **`HomeView.vue` is two layouts** (D2/D3/D4), switched in JS at 1024px via `composables/useBreakpoint.ts` rather than with `lg:hidden` on both — only one is ever in the DOM, because two copies mean two `id="layer-chiese"` and two Leaflet maps; `LayerToggles.vue`/`PlacesList.vue` are shared by both, `MapSheet.vue`/`MapChrome.vue` are the small-first pair. `AppHeader.vue` measures itself and publishes `--header-h`, which the shell's padding and the map's height both read — a hard-coded clearance put the map under the header. **`components/content/CardArticle.vue` is the one reading surface** and **`CardGrid.vue` the one list surface**: `TypeDetailView`/`FesteDetailView` wear the first, `TypeListView`/`FesteListView` the second, because a feast and a church are the same *article* (and the same list row) to a reader — restyling that twice is how the two drift apart. `CardGrid` takes a normalised `{id, title, summary, cover, isPublished, to}` and knows nothing about card types; a card with no image gets a **tint** of its layer colour via `color-mix`, not the saturated colour, which D7 reserves for the map.
- Everything under `src/` is TypeScript (`strict` via `@vue/tsconfig`, `noUncheckedIndexedAccess` set locally in `tsconfig.app.json`); `npm run build` type-checks and must stay green. The Pinia stores (`stores/user.ts`, `stores/toast.ts`) are typed — `user` persists auth state (tokens, profile, `role`) to `localStorage` by hand, refreshes the access token on app init, and `refreshToken()` persists the rotated refresh token (M4). `lib/auth.ts` installs the 401-refresh axios interceptor (wired in `main.ts` right after pinia).
- `router/index.ts` gates routes via `meta.requiresAuth` + a global guard; `/` (the map — C5's landing view, h1 "La mappa di Gaeta"), `/reports/:id` and `/polls` are public, `/users` and `/profile/*` stay auth-only (M1 decision). Write actions check `userStore.user.isAuthenticated` in-component and redirect to login with an Italian toast; `LoginView` honors the guard's `?redirect` query after a successful login (M4). **C1:** `/signup` is gone — `/collabora` (`CollaboraView.vue`) is the public request form, `/invito/:token` / `/reimposta-password/:token` read the token from `route.params` and complete the invite/reset, `/password-dimenticata` requests one. All four are public routes; there is no admin-review UI in the SPA (Django admin is the reviewer, per spec A2). **C2:** `/feste` (list, public) and `/feste/:id` (detail, public — the route guard doesn't gate drafts, the `feste_detail` endpoint's own 404 does) plus `/feste/nuova` (`requiresAuth: true`); `FesteDetailView.vue` edits in place exactly like `ReportDetailView.vue` (an `editing` ref swaps to `FesteForm.vue`), rather than a separate edit route.
- `definitions/interfaces/` mirrors the DRF serializers — update these together with serializer changes (e.g. `User` has no `email`; `Report`/`ReportPin`/`ReportStatus` in `Report.ts`, `Category` in `Category.ts`; `Poll`/`PollOption` in `Poll.ts` with `null` counts while results are hidden; `Feste`/`RoutePoint`/`CardImage` in `Feste.ts`, since C2). Since C3, `Content.ts` holds the shared `CardBase`/`MapPoint`/`CardImage`/`ContentItem` shapes the four generic type apps build on (`Chiesa.ts`/`Ricetta.ts`/`Personaggio.ts`/`Termine.ts` each extend `CardBase`) — `Feste.ts` keeps its own literal copy rather than being retrofitted onto it. Since C4, `CardBase` (and `Feste.ts`'s own copy) also carries `language`/`translation_of`/`translations` (`TranslationRef`, defined in both files for the same reason). Status labels/colors and the admin transition map live in `lib/reportStatus.ts`; `lib/apiErrors.ts` flattens `{detail, fields}` bodies for forms.
- Polls UI is inline in `PollsView` (no detail route): `components/polls/PollCard.vue` renders every state (vote radios / result bars / login prompt / admin close), `PollForm.vue` is the admin create form. Beware `PanelBox` is `h-full` — a stacked column needs `self-start` on its grid item or every panel stretches to the row height (fixed on every stacked view in M4: `PollsView`, `HomeView`, `ReportDetailView`).
- Components emit instead of mutating props (`ReportForm` emits `saved`/`cancel`) — `vue/no-mutating-props` is lint-enforced.
- **Accessibility conventions (ADR-0005, since 2026-08-22):** every `<label>` pairs with its input via `for`/`id` — the old `<label>Text</label><br />` followed by a separate `<FormInput>`/`<textarea>`/`<select>` with no association is the pattern being retired, not one to copy into new forms. Purely decorative icons (nav icons next to visible text, the search-icon SVG) get `aria-hidden="true"`; icon-only or ambiguous-text buttons (route/image remove `✕`, the rich-text toolbar's single-letter buttons) get `aria-label`, and toggle buttons get `:aria-pressed`. Each view has exactly one `<h1>` — `MainTitle.vue` — never `SiteTitle.vue`'s header wordmark, which is chrome on every route, not page content. Status/semantic colors must clear 4.5:1 against their text (checked via the WCAG relative-luminance formula, not eyeballed) — see `lib/reportStatus.ts`'s comment for the shades this ruled out.

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

Two entries in `.claude/launch.json` for the in-app browser: `frontend` (Vite
dev server, :5173) and **`frontend-preview`** (:4173, `vite preview` over
`dist/`). Verify anything Leaflet-related against the **preview**, not the dev
server — the default-import gotcha and TD-02's bundling only show in built
output, which is also why CI runs Cypress there.

`npm run format` is `prettier --write src/`. The tree **is** prettier-clean as
of 2026-08-27 (`npx prettier --check .` passes, `eslint.config.ts` included),
so running it now touches only what you changed — it used to rewrite ~30
unrelated files, which is why it is still not part of the definition of done.
Keep it that way: if a formatting sweep ever becomes necessary again, it goes
in its own commit, never mixed into a feature diff.

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

**Scope guard — lifted 2026-08-22.** `/impeccable audit` and agent-skills'
`frontend-ui-engineering` both push for a full WCAG pass. That used to be
advisory here, because v1's N5 had scoped it out and the question was still
open. It is **decided now**: WCAG 2.1 AA, whole app
([ADR-0005](docs/adr/0005-wcag-2.1-aa-accessibility-bar.md)), so their contrast
and keyboard findings land against a bar this project has accepted — check them
against the ADR's Consequences, which says what is already fixed and what is
deliberately deferred, rather than dismissing them as out of scope.

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

**Which pack skill is worth reaching for next** (as of 2026-08-27, with the v2
build order complete): `frontend-ui-engineering`, because roadmap item 1 is the
design pass. Its `interview-me` phase is already done — the confirmed output is
[docs/spec/design.md](docs/spec/design.md), so start from that file rather than
re-interviewing the author. `ci-cd-and-automation` is done (TD-01 shipped
CI on 2026-08-19); `shipping-and-launch` waits on roadmap item 3, the deploy
prerequisites, and on the author's signal. Do not enable
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
