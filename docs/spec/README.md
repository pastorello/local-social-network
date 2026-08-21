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
| Accounts & the "Collabora con noi" flow | [accounts.md](./accounts.md) | to build (phase C1) |
| Content core + typed cards | [content.md](./content.md) | to build (phase C2/C3) |
| Translations | [translations.md](./translations.md) | to build (phase C4) |
| The map: layers & overlays | [map.md](./map.md) | to build (phase C5) |
| Reports & polls (from v1) | [reports-and-polls.md](./reports-and-polls.md) | delivered; reports change author |
| Steering tier & political tooling | [politics.md](./politics.md) | tier in C1; tooling is future, out of current build |

## Architecture (shared across areas)

- **One content core, thin type apps** — a `content` app owns rich text
  (sanitized), images, translations, map features and publication; `feste`,
  `chiese`, `ricette`, `personaggi`, `dialetto` each add only their fields.
  Rationale: [../adr/0004-content-core-thin-type-apps.md](../adr/0004-content-core-thin-type-apps.md).
  Honors the author's requirement that modules be separable and reusable
  without rebuilding rich text five times.
- **Map**: Leaflet, as today. Routes are polylines, zone overlays are GeoJSON
  polygons, historical maps are `ImageOverlay` rasters. TD-02 (double bundle)
  graduates from cosmetic to worth-fixing before the map gains layers.
- **Auth**: JWT as today ([../adr/0001-jwt-in-localstorage.md](../adr/0001-jwt-in-localstorage.md),
  to be revised for rich text). The collaboration flow adds models and admin
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

## Open questions (not blockers to start)

1. Source and format of quartiere and seggio boundaries — the author supplies.
2. Georeferencing workflow for historical map images.
3. SMTP provider and sender domain for invite/reset e-mail (deploy-time;
   development uses the console backend).
4. When the accessibility question (v1 N5) gets answered — a tourist-facing
   public site raises its priority; decide during content-template design.

## Suggested build order

Dependency-honest, one phase per PR, each proven before the next:

1. **C1** — accounts: request form → admin approval → invite → reset; the
   steering flag lands here as a capability, its tooling does not.
2. **C2** — content core + feste end-to-end (the richest type, to prove the
   core): sanitized rich text, images, a procession route, a card readable
   anonymously.
3. **C3** — the remaining thin type apps: chiese, ricette, personaggi, dialetto.
4. **C4** — translations.
5. **C5** — overlays: quartieri/seggi polygons (seggi confidential by default),
   then historical rasters.
