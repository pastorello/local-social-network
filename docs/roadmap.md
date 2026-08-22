# Roadmap

What is planned and in what order. Ordered by what is **active**. The product
authority is [spec (v2)](./spec/README.md) (v2, 2026-08-21); this file only sequences
the work.

The open question that used to sit here — *"decide what publishable means"* —
was answered on 2026-08-21 by the v2 spec: the product recenters as a curated
cultural map-archive of Gaeta, written by a small circle of approved
collaborators, read by everyone, ultimately aimed at tourists. The old item 2
is therefore gone; its accessibility sub-question survives below.

## 1. Build v2 — **active**

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
4. **C4 — translations** authoring and the reader's language switch.
5. **C5 — overlays**: quartieri + seggi polygons (**seggi confidential /
   steering-only by default**), then georeferenced historical rasters.

## 2. Residual technical debt — fold into item 1

Three entries remain in [tech-debt.md](./tech-debt.md), and the v2 work
changes their weight:

- **TD-02** (double Leaflet bundle) — *graduates*: the map is about to gain
  layers, routes and raster overlays, so pay it early in phase C5 work, with
  the browser-verification session it always needed.
- **TD-04** (e2e coverage) — still deferred, now with a date attached: the
  flows to cover are the v2 flows, so write them per phase as each lands, not
  retroactively for screens about to change.
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
