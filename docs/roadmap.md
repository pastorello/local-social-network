# Roadmap

What is planned and in what order. Ordered by what is **active**. The product
authority is [spec (v2)](./spec/README.md) (v2, 2026-08-21); this file only
sequences the work.

**Where things stand (2026-08-27).** The v2 build order is complete: C1
through C5, each proven before the next (the record is item 5 below). Every
feature the spec asks for exists and is tested. Nothing that remains is a
feature — what stands between this and a site a tourist can use is design,
coverage, deployment, and content. Those are items 1 to 4, in the order the
author chose on 2026-08-27.

The open question that used to sit here — *"decide what publishable means"* —
was answered on 2026-08-21 by the v2 spec: the product recenters as a curated
cultural map-archive of Gaeta, written by a small circle of approved
collaborators, read by everyone, ultimately aimed at tourists.

## 1. Design — **active** (chosen 2026-08-27)

**Nobody has styled this product.** Every view is default Tailwind panels in a
two-column grid; it looks like what it is, a working app nobody has designed.
The spec's audience is *tourists, including foreign ones, who want an
instrument to live the city fully* — and the spec is honest that this is a bet,
not an observed need. The design pass is where that bet is either honored or
lost, which is why it goes first.

**It starts with an interview, not with CSS.** Same as v2 did: who is the
person opening this map, what do they need to understand in the first five
seconds, what do they do next. The output is a spec area file
(`docs/spec/design.md`) — scope changes start by editing the spec, and a design
direction is scope.

**Why ahead of TD-04 (item 2).** Writing Cypress specs now would pin selectors
and copy on screens that are about to be redrawn — exactly the mistake that
deferring TD-04 through C2–C5 was avoiding. Coverage follows the redesign by
one step, not the other way round.

**Constraints the design inherits, already decided:**

- **WCAG 2.1 AA, whole app** ([ADR-0005](./adr/0005-wcag-2.1-aa-accessibility-bar.md)).
  Contrast ≥4.5:1 checked with the relative-luminance formula rather than
  eyeballed, one `<h1>` per view, every label associated, focus visible. A
  palette that fails contrast is not a candidate, however good it looks.
- **The map is the landing view** ([map.md](./spec/map.md) M1). C5 deliberately
  did *not* build M1's "minimal top menu" as a chrome redesign — the layer
  toggles live in the panel beside the map and the nav kept C3's `SchedeMenu`.
  **A full-bleed map with floating chrome belongs to this phase**, where it is
  a design decision rather than something smuggled into a phase about geometry.
- **Italian copy** (N4), and the brand is **Vivere Gaeta** (v2).

**Two known flags, both product calls rather than defects:**

- `SiteTitle.vue`'s purple gradient is impeccable's classic "AI-generated UI"
  tell. It is the M4 brand, so replacing it is a decision to take deliberately
  in this phase — not a detector finding to silence.
- `PanelBox` is `h-full`: a stacked column needs `self-start` on its grid item
  or every panel stretches to the row height. Whatever replaces the panel
  layout should make that impossible rather than remember it.

**Tooling.** The `impeccable` plugin (user scope, currently disabled) is built
for exactly this and should be enabled per session during the pass; its
detector baseline is recorded in `CLAUDE.md`, including one known false
positive (the `PollCard.vue` ternary). agent-skills' `frontend-ui-engineering`
is the process counterpart. Note that CLAUDE.md's scope guard — treat their
WCAG findings as advisory — was written when the accessibility question was
open. **It is no longer open** (ADR-0005), so their contrast and
keyboard findings now land against a bar this project has accepted.

## 2. Coverage: TD-04 and the deferred accessibility work — after item 1

Two things that were deferred for the same reason (the screens kept changing)
and are unblocked by the same event (they will have stopped):

- **TD-04 (e2e).** The suite is still one spec, `login.cy.ts`, whose home-map
  assertions were updated for C5 and nothing more. The v2 flows now worth
  covering: the "Collabora con noi" request → invite → first login, authoring
  and publishing a card, translating it, and the map with its layers and
  overlays. Note the CI e2e job runs **no backend** — a spec that talks to the
  API needs a service added to `.github/workflows/ci.yml` first.
- **The three items ADR-0005 deferred:** full map-widget operability for
  screen-reader and keyboard users (C5 added layer toggles and an opacity
  slider, plus the "Luoghi sulla mappa" list as the keyboard path a pin does
  not have — the widget itself is still the gap), error-to-field ARIA wiring
  on forms, and an accessibility gate in CI.

## 3. Deploy readiness — prerequisites now, deploy on the author's signal

Unchanged in substance, restated as a checklist because it is now the only
thing between a finished build and a public URL:

- **Media serving** ([ADR-0003](./adr/0003-media-on-local-filesystem.md)) —
  photos, card images and the overlay rasters 404 on any deploy made today.
  This is the one that must be *designed*, not configured.
- A durable disk for uploads, and a shared cache so the credential rate limits
  (TD-18) actually hold across processes.
- **SMTP** — invites and password resets need a real sender and a sender
  domain (spec §11.3); development uses the console backend.
- `VITE_API_BASE_URL` is baked at build time, so the SPA build is
  environment-specific.
- **TD-06** (remaining dependency drift) rides along here as ordinary
  maintenance; axios, the security-relevant half, was done 2026-08-20.

## 4. Content and input — the author's own, in parallel

Not engineering, but the archive is empty and no amount of building fixes
that. Two of these are the spec's own open questions, and C5 turned them from
build questions into input ones:

- The **quartieri and seggi boundaries** (GeoJSON) — the overlay mechanism
  exists and is gated; it has no data.
- The **georeferenced historical scans** (1820, 1600…) and their bounding
  boxes. Note `common/images.py` caps uploads at 5 MB and 40 Mpx, raster
  overlays included — a large scan wants downsampling before georeferencing.
- The **first real cards**, in every type, and their English translations —
  which is also the only way to find out whether the authoring flow is
  pleasant to use for someone who is not its author.

## 5. Build v2 — **complete (2026-08-27)**

The spec's build order ([spec/README.md](./spec/README.md#suggested-build-order)),
one phase per PR, each proven before the next:

1. **C1 — accounts — delivered (2026-08-21).** "Collabora con noi" request
   (honeypot + timing anti-spam, not a third-party CAPTCHA — see the
   [accounts.md](./spec/accounts.md) A1 note), admin approval, invite e-mail
   with single-use setup link, password reset. Reverses v1's open-signup
   decision; brings e-mail back as real configuration (`FRONTEND_URL` +
   `EMAIL_BACKEND` in settings.py). The **steering capability** landed here as
   an admin-set flag (spec [politics.md](./spec/politics.md)) — its tooling
   does not.
2. **C2 — content core + feste end-to-end — delivered (2026-08-22)**:
   sanitized rich text (the ADR-0001 revision landed with it, not after —
   `content/sanitize.py` is the chokepoint, `RichText.vue` the one `v-html`),
   images, translations plumbing (`Card.language`/`translation_of`, unused
   until C4), a procession route on the map, a published card readable
   anonymously. The richest type first, to prove the core. **Did not** include
   an accessibility-bar decision at the time — that followed two days later,
   see item 6 below.
3. **C3 — the remaining thin type apps — delivered (2026-08-22)**: chiese,
   ricette, personaggi, dialetto, each a small diff over the proven core
   (ADR-0004). Extracted `content/api_helpers.py`/`content/serializers.py`
   (shared image/point-pin/permission logic) once a second type app needed
   what feste had inlined, and one generic config-driven frontend
   `TypeForm`/`TypeListView`/`TypeDetailView`/`TypeCreateView` set instead of
   four more `Feste*.vue` copies — both extend the "days not weeks" bar to
   the frontend, not just the backend.
4. **C4 — translations — delivered (2026-08-22)**: per-card translations
   (English first) over the `Card.language`/`translation_of` plumbing C2 left
   unused, a collaborator's "traduci questo articolo in…" control
   (`content/api_helpers.py::start_translation` — one write path every type
   app's new `<type>_translate` endpoint calls; translating a translation is
   refused, so the group is always original-plus-translations, never a tree),
   and the reader's language switch (`content/serializers.py::visible_translations`,
   published-only unless you're the card group's author/admin). No new
   frontend routes: `LanguageSwitch.vue`/`TranslateControl.vue` are shared by
   `TypeDetailView.vue` and `FesteDetailView.vue`, navigating straight to the
   new translation's own detail id.
5. **C5 — the map: layers & overlays — delivered (2026-08-27)**: one
   toggleable layer per card type over a single aggregated
   `/api/map/features/` endpoint (translations excluded — one pin per place,
   not per language), the v1 reports layer beside them, and overlays in both
   kinds: quartieri/seggi GeoJSON polygons and georeferenced historical
   rasters with a live opacity control. The seggi overlay is confidential **by
   construction**: `Overlay.visibility` defaults to the steering tier,
   `Overlay.objects.visible_to()` is the single gate, and `visibility` is
   never serialized — [ADR-0006](./adr/0006-overlay-visibility-gate.md).
   Overlays are authored in Django admin (the author supplies the boundaries
   and the scans), so the spec's open questions 1 and 2 (where the
   boundaries and the georeferenced scans come from) are now *input*
   questions, not build ones. `ReportsMap.vue` became `GaetaMap.vue` — it draws more than
   reports now.

**With C5, the v2 build order is complete** — C1 through C5, each proven
before the next. What comes after it is items 1 to 4 above; whatever comes
after *those* starts by editing the spec, not this file.

The debt register that ran alongside this build order —
[tech-debt.md](./tech-debt.md) — is down to **TD-04** (item 2) and **TD-06**
(item 3). TD-02, the double Leaflet bundle it had reserved for a session of
its own, was paid at the head of C5 and verified in a production build with
clustered pins on screen.

## 6. Accessibility — decided (2026-08-22): WCAG 2.1 AA, whole app

Recorded in [ADR-0005](./adr/0005-wcag-2.1-aa-accessibility-bar.md), not just
here: v1 scoped WCAG out (N5); the v2 tourist audience reopened the question at
C2, and it went unanswered through that phase. Now decided, and a first
remediation pass landed with the decision — see the ADR's Consequences for
exactly what was fixed (label/input associations app-wide, icon accessible
names, duplicate/missing page headings, several color-contrast failures, and
the two Critical keyboard-only map interactions) versus what's deliberately
deferred (full map-widget screen-reader operability, error-to-field ARIA
wiring, a CI accessibility gate). C3's four remaining card types inherit the
bar from day one.

## 7. Explicitly not planned

The spec's non-goals (§10): mass signup, reader comments, notifications,
machine translation, multilingual UI (until translated content exists),
election-operations tooling, new work on polls.
