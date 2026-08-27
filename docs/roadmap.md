# Roadmap

What is planned and in what order. Ordered by what is **active** — as of
2026-08-27 that is no longer item 1: the v2 build order finished with C5, and
what remains below (the residual debt, the deploy prerequisites) is
maintenance and readiness, not feature work. The product
authority is [spec (v2)](./spec/README.md) (v2, 2026-08-21); this file only sequences
the work.

The open question that used to sit here — *"decide what publishable means"* —
was answered on 2026-08-21 by the v2 spec: the product recenters as a curated
cultural map-archive of Gaeta, written by a small circle of approved
collaborators, read by everyone, ultimately aimed at tourists. The old item 2
is therefore gone; its accessibility sub-question survives below.

## 1. Build v2 — **complete (2026-08-27)**

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
   see item 3 below.
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
before the next. What stands between this and a public site is not features:
it is the design pass (nobody has styled this product), the e2e coverage TD-04
has been deferring, and deployment, which waits on the author's signal.
Whatever comes next starts by editing the spec, not this file.

## 2. Residual technical debt — fold into item 1

Two entries remain in [tech-debt.md](./tech-debt.md) (TD-02 closed with C5),
and the v2 work changed their weight:

- ~~**TD-02**~~ (double Leaflet bundle) — **paid 2026-08-27**, at the head of
  C5 as planned, and verified in a production build with clustered pins on
  screen. The finding's cause was one step off; see the entry.
- **TD-04** (e2e coverage) — still deferred, and now the largest remaining
  gap: the v2 flows have all landed and the only spec is `login.cy.ts` (its
  home-map assertions were updated for C5, nothing more). The screens are no
  longer about to change, so the reason to wait has expired.
- **TD-06** (remaining dependency drift) — ordinary maintenance; axios (the
  security-relevant half) was done 2026-08-20.

## 3. Accessibility — decided (2026-08-22): WCAG 2.1 AA, whole app

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

## 4. Deploy — **last, on the author's signal** (unchanged)

Everything recorded before still holds: media serving must be designed first
([ADR-0003](./adr/0003-media-on-local-filesystem.md) — photos 404 on any
deploy made today), uploads need a durable disk, rate limits need a shared
cache, `VITE_API_BASE_URL` is baked at build time. New since v2: **SMTP** —
the invite and reset e-mails need a real sender (spec §11.3).

## 5. Explicitly not planned

The spec's non-goals (§10): mass signup, reader comments, notifications,
machine translation, multilingual UI (until translated content exists),
election-operations tooling, new work on polls.
