# Roadmap

What is planned and in what order. Ordered by what is **active**. The product
authority is [spec (v2)](./spec/README.md) (v2, 2026-08-21); this file only
sequences the work.

**Where things stand (2026-08-31).** Item 1 is complete; item 2 is active.
The paragraph below is the standing picture, written when the v2 build order
closed.

**Where things stand (2026-08-27).** The v2 build order is complete: C1
through C5, each proven before the next (the record is item 6 below). Every
feature the spec asks for exists and is tested. Nothing that remains is a
feature — what stands between this and a site a tourist can use is design,
coverage, deployment, and content. Those are items 1 to 4, in the order the
author chose on 2026-08-27; item 5 records two phases named that day and not
scheduled.

The open question that used to sit here — *"decide what publishable means"* —
was answered on 2026-08-21 by the v2 spec: the product recenters as a curated
cultural map-archive of Gaeta, written by a small circle of approved
collaborators, read by everyone, ultimately aimed at tourists.

## 1. Design — **complete (2026-08-31)**

**Done, 2026-08-27 to 2026-08-31**, in the order the spec set: the palette and
the type as tokens, the reader's home small-first, the card as an article, the
lists as a grid of covers, the collaborator's authoring forms, and last the two
pieces that closed it — the site footer D11 asks for, and `ReportDetailView`,
the one v1 screen a reader reaches from a pin on the redesigned home.
`spec/design.md`'s four open questions are all answered, and its foot records
what the pass deliberately left in v1 clothes (`/polls`, `/users`, `/profile`,
the auth forms and `ReportForm`) with the reason for each. **Item 2 is now
active.**

The requirements the pass was measured against, and the reasoning behind them,
stay below — they are what the next person checks a change against.

**Nobody has styled this product.** Every view is default Tailwind panels in a
two-column grid; it looks like what it is, a working app nobody has designed.
The spec's audience is *tourists, including foreign ones, who want an
instrument to live the city fully* — and the spec is honest that this is a bet,
not an observed need. The design pass is where that bet is either honored or
lost, which is why it goes first.

**It started with an interview, not with CSS** — same as v2 did. That interview
happened on **2026-08-27** and its confirmed output is
[spec/design.md](./spec/design.md): the two audiences and which one wins, the
mobile home (full-bleed map + bottom sheet), the register, the palette from
Gaeta with the purple retired, colour in tokens, and the rule that sponsor
presence is earned rather than bought. **Read it before touching a stylesheet**;
what was open there when this was written (actual palette values, typography,
whether the authoring screens are restyled in the same pass) is what the pass
decided — all four questions are answered in that file, dated.

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

## 2. Coverage: TD-04 and the deferred accessibility work — **active (2026-08-31)**

Two things that were deferred for the same reason (the screens kept changing)
and are unblocked by the same event (they will have stopped):

- ~~**TD-04 (e2e).**~~ **Largely paid 2026-08-30**: four spec files, 17 tests,
  against a real API that CI now starts beside the production build. Covered:
  the map and its layers, a draft staying invisible, the confidential overlay
  staying *absent*, reading a card on desktop and through the mobile sheet,
  and the collaborator's whole loop — log in, write, publish, draft, translate.
  **The v1 flows this register first pointed at — filing a report, upvoting,
  voting in a poll — landed 2026-09-04** in `v1-flows.cy.ts`, which needed two
  fixtures and a clean-up rule in `seed_e2e` (a report someone else wrote, an
  open poll, and the collaborator's votes and upvotes cleared between runs,
  since a vote is final and an upvote is a toggle). **One named gap is left,
  on purpose:** the leg after an admin approves a collaboration request —
  accepting an invite needs the token out of an e-mail, so it wants a test hook
  chosen deliberately rather than bolted on.
- **The three items ADR-0005 deferred**, of which two are now paid:
  - ~~an accessibility gate in CI~~ — **done 2026-08-31**:
    `frontend/cypress/e2e/a11y.cy.ts` runs axe-core over eleven surfaces at
    ADR-0005's own four WCAG tags, inside the existing e2e job, against the
    production build. It found no violation on any of them at the time it
    landed, which is a floor and not a certificate — see the ADR for what it
    deliberately does not check.
  - full map-widget operability for screen-reader and keyboard users (C5 added
    layer toggles and an opacity slider, plus the "Luoghi sulla mappa" list as
    the keyboard path a pin does not have — the widget itself is still the
    gap, and the gate excludes `.leaflet-container` to say so honestly).
  - ~~error-to-field ARIA wiring on the **auth and profile forms**~~ —
    **done 2026-08-31**, which closes this item outright: all seven moved onto
    `FormField`, validation is attributed to the field that failed rather than
    prefixed with its label, and API errors are kept per field so Django's
    password validators land under the box they are about. Worth noting that
    the gate could not have prompted any of it — an input takes an accessible
    name from its `placeholder`, so axe passed those forms while their labels
    were unassociated. The ADR was the reason; the gate is not a substitute
    for it.

## 3. Deploy readiness — prerequisites now, deploy on the author's signal

Unchanged in substance, restated as a checklist because it is now the only
thing between a finished build and a public URL:

- ~~**Media serving**~~ — **decided and built 2026-08-30**,
  [ADR-0007](./adr/0007-serving-media-from-the-app.md), which amends ADR-0003.
  The app serves its own media through one hardened view, on any host, with no
  object storage and no web server in front: an extension allowlist that the
  `Content-Type` comes from, `nosniff`, and a sandboxing CSP. Decided this way
  *because* the host is unknown — the author confirmed on 2026-08-30 that he
  has only Docker locally — so waiting for a provider was not deferring a
  configuration step, it was leaving the product undeployable behind a decision
  nobody was close to taking. **A persistent disk is still required** so
  uploads survive a redeploy; what changed is that a disk is now sufficient.
- ~~A shared cache so the credential rate limits (TD-18) hold across
  processes.~~ **Done 2026-08-30**: the database cache outside dev and tests —
  shared by every worker and container, and needing no service the deployment
  does not already have, which matters while no host is chosen. Verified by
  three processes counting 1, 2, 3 through it where `LocMemCache` gave each of
  them 1. `createcachetable` joined the release commands.
- ~~**SMTP** settings shape.~~ **Half done 2026-08-30**: the `MAILERS`
  migration (TD-34) landed, so the configuration is in its final shape. What
  remains is genuinely an input rather than code — a provider and a sender
  domain (spec §11.3).
- `VITE_API_BASE_URL` is baked at build time, so the SPA build is
  environment-specific.
- ~~**TD-06** (remaining dependency drift)~~ — **minors done 2026-08-30**,
  backend and frontend, each in its own PR. What is left is the majors and
  **TD-33** (pin the ruff rule set, so a linter bump stops being a way to
  change the lint policy by accident).

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

## 5. Named but not scheduled

Two phases the design interview surfaced (2026-08-27). Both are recorded so the
direction is not lost, neither is scheduled, and **both are non-goals of item
1** — the design enables them, it does not build them.

- **Geolocation** — "you are here" plus what is around you while walking
  Gaeta. The author wants it and it fits the product; it is a **feature, not a
  style**: browser permission, HTTPS (so it depends on item 3), sane handling
  of a denied permission and of GPS that is 50 m wrong inside the old town,
  and a spatial endpoint — `/api/map/features/` returns everything, unfiltered.
  Its own phase, its own spec section.
- **Multi-city and the superadmin** — the larger ambition: once Gaeta is the
  worked example, offer the same instrument to other towns, with an admin who
  can change palette, name and city centre. Item 1's D8 (colour in tokens, never
  in a component) is what keeps this from costing a second redesign. The other
  things hard-coded to Gaeta, for whoever picks it up: the map centre in
  `composables/useLeafletMap.ts` and `GaetaMap.vue`, the product name, and an
  Italian-only UI (which the v2 spec still lists as a non-goal until translated
  content exists).

## 6. Build v2 — **complete (2026-08-27)**

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
   see item 7 below.
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

## 7. Accessibility — decided (2026-08-22): WCAG 2.1 AA, whole app

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

## 8. Explicitly not planned

The spec's non-goals (§10): mass signup, reader comments, notifications,
machine translation, multilingual UI (until translated content exists),
election-operations tooling, new work on polls.
