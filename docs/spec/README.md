# Vivere Gaeta — Product spec (v2: the cultural map)

> **This is the product authority** (2026-08-21), superseding
> [../mvp-spec.md](../mvp-spec.md). v1 (map reports + polls) was delivered and
> remains in the codebase; nothing here un-builds it. Scope changes start by
> editing these files.
>
> Provenance: the confirmed output of an intent interview with the author on
> 2026-08-21, extended the same day with the steering tier. Where a section
> records a bet rather than an observed need, it says so.
>
> The spec is split by area because there is a lot in flight; this file is the
> overview and index, each linked file is one area.

## What this becomes

**Vivere Gaeta** (renamed from *Gaeta Partecipa*, 2026-08-21) recenters from *"help fix what is broken in my city"* to
*"this is my city — here is what we are."* A curated cultural map-archive of
Gaeta: feasts and their processions, churches, recipes and where to buy them,
historical figures, the dialect. Written by a small circle of trusted
collaborators, readable by everyone without an account.

The mass public it is ultimately for is **tourists**, including foreign ones,
who want an instrument to live the city fully. That is a bet, not an observed
need — it is why translations are in scope and why content quality outranks
feature count.

The map is the heart: opening the app, logged in or not, shows a large map of
Gaeta with a minimal menu. But **the map is the index of what has a place, not
the container of everything** — recipes and polls live without it.

## The name

The product is **Vivere Gaeta**. It was *Gaeta Partecipa* through v1 and was
renamed on 2026-08-21, with this spec: "Partecipa" is an imperative aimed at a
citizen who must *do* something — report, vote — which is the v1 product.
"Vivere" describes what this one is: an archive that lets you live the city,
and that speaks equally to someone here for a week.

The repository and package names stay `local-social-network` (unchanged since
v1 — renaming them buys nothing and breaks links).

## The role model

Four tiers. The first three are the visible product; the fourth is
confidential (see [politics.md](./politics.md) for what that means and does
not mean).

| Role | Who | Can |
|---|---|---|
| **Reader** | anyone, no account | see the map and published cards, switch card language, browse recipes |
| **Collaborator** | approved personally by the admin | author and translate cards, file reports, see internal overlays |
| **Admin** | the author | approve/reject collaboration requests; everything below; manage categories and overlays |
| **Steering** *(confidential)* | admin-selected trusted people who also do city politics | everything a collaborator can, plus the seggi overlay and future political tooling — with **no public sign that this tier exists** |

## Areas

| Area | File | Status |
|---|---|---|
| Accounts & the "Collabora con noi" flow | [accounts.md](./accounts.md) | delivered (C1, 2026-08-21) |
| Content core + typed cards | [content.md](./content.md) | delivered (core + feste C2, 2026-08-22; chiese/ricette/personaggi/dialetto C3, 2026-08-22); sixth type libri consigliati 2026-09-09; seventh, luoghi, 2026-09-18 |
| Translations | [translations.md](./translations.md) | delivered (C4, 2026-08-22) |
| The map: layers & overlays | [map.md](./map.md) | delivered (C5, 2026-08-27) |
| Reports & polls (from v1) | [reports-and-polls.md](./reports-and-polls.md) | delivered; reports change author |
| Steering tier & political tooling | [politics.md](./politics.md) | tier delivered (C1); its first consumer is C5's seggi overlay (2026-08-27); the tooling is future, out of current build |
| Design & visual direction | [design.md](./design.md) | interviewed 2026-08-27, built 2026-08-31; **layout reopened 2026-09-11** (D13–D21), built 2026-09-18 |
| Itinerari — curated tours for a visitor's stay | [itinerari.md](./itinerari.md) | decided 2026-09-11; built 2026-09-18 — backend, the guest's pages and the collaborator's editor |
| *Che si fa a Gaeta?* — *«Cosa si può fare qui»*: what there is to do in a zone of town | [cosa-fare.md](./cosa-fare.md) | **decided 2026-10-13** (its Part −1: zones and activities, no day picker yet); availability in [ADR-0008](../adr/0008-opening-hours-as-dated-testimony.md); **built 2026-10-13** (#99–#102) — the zones are drafts waiting on the author |

## Architecture (shared across areas)

- **One content core, thin type apps** — a `content` app owns rich text
  (sanitized), images, translations, map features and publication; `feste`,
  `chiese`, `ricette`, `personaggi`, `dialetto`, `libri` each add only their
  fields — `luoghi` and `itinerari` too (both built 2026-09-18).
  Rationale: [../adr/0004-content-core-thin-type-apps.md](../adr/0004-content-core-thin-type-apps.md).
  Honors the author's requirement that modules be separable and reusable
  without rebuilding rich text five times.
- **Map**: Leaflet, as today. Routes are polylines, zone overlays are GeoJSON
  polygons, historical maps are `ImageOverlay` rasters. TD-02 (double bundle)
  was paid at the head of C5, before the map gained layers, as planned.
- **Auth**: JWT as today ([../adr/0001-jwt-in-localstorage.md](../adr/0001-jwt-in-localstorage.md),
  amended for rich text in C2 and for the map's tooltips on 2026-09-18). The collaboration flow adds models and admin
  UI, not a new auth system.
- **Quality bar unchanged**: v1's gates (pytest, ruff, Vitest, ESLint, build,
  Cypress in CI) and working agreement carry over.

## Non-goals of this phase

Confirmed explicitly by the author, 2026-08-21:

- mass/public signup — the collaboration gate **is** the product decision
- reader comments
- notifications ("per il momento penso siano inutili")
- machine translation
- multilingual UI (later phase, after translated content exists)
- **election-operations tooling** (the real-time exit-poll tool and anything
  like it) — the steering tier and the seggi overlay exist now; the tools
  built on them are future work with their own spec ([politics.md](./politics.md))
- new work on polls

## Open questions

Two of the four are answered; the two that remain are **inputs the author
supplies**, not build questions — C5 shipped the mechanism that consumes them
(see [map.md](./map.md)).

1. **Open — input.** Source and format of quartiere and seggio boundaries. The
   `Overlay` model takes GeoJSON and Django admin is the write path; it has no
   data yet. **The format-and-workflow half is answered**:
   [overlays-howto.md](../overlays-howto.md), written on 2026-09-05 by walking
   the admin with files shaped like the real ones. What remains open is the
   source — where the boundaries come from.
2. **Open — input.** Georeferencing workflow for historical map images: the
   scan plus its south/west/north/east bounds. Note `common/images.py` caps
   uploads at 5 MB and 40 Mpx, raster overlays included — so a scanner's output
   of a large sheet needs downsampling first, which the how-to above says how to
   check.
3. ~~**Still open, deploy-time.** SMTP provider and sender domain for
   invite/reset e-mail; development uses the console backend.~~ **Answered
   2026-10-21** ([ADR-0009](../adr/0009-where-it-runs.md)): Brevo's free plan,
   sending as `noreply@viveregaeta.it`; development still uses the console
   backend.
4. ~~When the accessibility question (v1 N5) gets answered.~~ **Answered
   2026-08-22**: WCAG 2.1 AA, whole app
   ([ADR-0005](../adr/0005-wcag-2.1-aa-accessibility-bar.md)), with a first
   remediation pass landed alongside the decision.

**The visual direction is written down and built** — [design.md](./design.md),
interviewed 2026-08-27, delivered 2026-08-31. Its four open questions (palette
values, typography, whether the authoring screens were restyled in the same
pass, and the desktop counterpart of the mobile bottom sheet) are **all
answered and dated in that file**, and its closing note records which surfaces
the pass deliberately left in v1 clothes.

**The layout was reopened on 2026-09-11** — not the palette or the type. The
map becomes the ground of every page, every page opens over it as a panel,
the map reacts to what is opened, and the map under the collaborator's form
becomes their editor: design.md D13–D21, **built 2026-09-18**. A reader's
itinerary handed off to Google Maps was named in the same session and was
redecided the same day as curated tours — [itinerari.md](./itinerari.md),
also built 2026-09-18.

Two ambitions were named in that interview and deliberately **not** folded into
the design phase — **geolocation** and a **multi-city superadmin**. Both are
features rather than styling; they are recorded in design.md's non-goals and
sequenced in [roadmap item 5](../roadmap.md), and each gets its own spec
section when its day comes.

## Suggested build order

Dependency-honest, one phase per PR, each proven before the next:

1. **C1 — delivered (2026-08-21).** Accounts: request form → admin approval →
   invite → reset; the steering flag lands here as a capability, its tooling
   does not.
2. **C2 — delivered (2026-08-22).** Content core + feste end-to-end (the
   richest type, to prove the core): sanitized rich text, images, a procession
   route, a card readable anonymously.
3. **C3 — delivered (2026-08-22).** The remaining thin type apps: chiese,
   ricette, personaggi, dialetto — each over the same `content` core, proving
   ADR-0004's "days not weeks" bar with four types at once.
4. **C4 — delivered (2026-08-22).** Translations: per-card translations
   (English first), the collaborator's "traduci questo articolo in…" control,
   and the reader's language switch — over the `language`/`translation_of`
   plumbing C2 already laid down on `Card`.
5. **C5 — delivered (2026-08-27).** The map: a toggleable layer per card type
   over one aggregated `/api/map/features/` endpoint, and overlays in both
   kinds — quartieri/seggi polygons and georeferenced historical rasters with
   an opacity control. The seggi overlay is confidential by construction: a new
   overlay defaults to the steering tier and `visibility` is never serialized
   ([ADR-0006](../adr/0006-overlay-visibility-gate.md)). TD-02 (the double
   Leaflet bundle) was paid first, as the roadmap asked, and verified in a
   production build with clustered pins on screen.
