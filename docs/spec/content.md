# Content core + typed cards

> Phase C2 (core + first type) and C3 (the rest). Architecture rationale:
> [../adr/0004-content-core-thin-type-apps.md](../adr/0004-content-core-thin-type-apps.md).

## The card

Every cultural entry is a **card**. The `content` app owns what they all share:

- title, **rich-text body** (sanitized), images, author, draft/published state
- zero or more **map features**: point pins, ordered routes (polylines)
- **translations** ([translations.md](./translations.md))

Images go through the existing `common/images.py` pipeline unchanged.

## Rich text — the security prerequisite

This is the one requirement that reverses a standing decision. The SPA renders
**no HTML anywhere** today, and the audit marked that as load-bearing for
keeping JWTs in `localStorage`
([../adr/0001-jwt-in-localstorage.md](../adr/0001-jwt-in-localstorage.md)).
Cards therefore require, as prerequisites to the first card ever rendering —
not as cleanup after:

- server-side sanitization to a strict allowlist (no `<script>`, no event
  handlers, no `<iframe>`), applied on write;
- rendering with no escape hatch that could reintroduce raw HTML;
- a **revision of ADR-0001** recording that the XSS-free assumption no longer
  holds unconditionally and what now guards it.

## Types (C3)

Each type is a **thin app** adding only its fields on top of the core.

| Type | Extra fields | Map footprint |
|---|---|---|
| **Feste** | recurrence (e.g. every 9 August), programme text | ordered route + stop pins (Scalzi → via Indipendenza → the sea → Punta Stendardo) |
| **Chiese** | — | one fixed pin |
| **Ricette** | ingredients, servings ("per 8 persone"), procedure | zero or more "sold here" pins |
| **Personaggi storici** | life dates | optional pins (birthplace, monument) |
| **Dialetto** | term, meaning, example usage | none |

The bar: **a sixth type costs days, not a module.** The fifth was invented
mid-interview; more will come.

## Build note

Build **feste first, end to end** — it is the richest (recurrence *and* a
route), so it exercises the core hardest before four thinner types lean on it.

## What writing one of each turned up — 2026-09-08

The four remaining types were written through the collaborator's own editor,
with real content: a recipe with a multi-line ingredient list and three "sold
here" pins, a procession with a route and a programme, a dialect entry, a
historical figure with uncertain dates. Three of the four were fine. What the
exercise was for:

- **A feste's route had no way to reorder its stops.** For a route the order is
  not a preference, it is the data — consecutive stops are what the polyline
  joins — so a stop entered out of sequence drew the procession going the wrong
  way, and the only remedy was removing every stop after it. Fixed the same day,
  with the same buttons the images strip got: `lib/reorder.ts::moveItem` is now
  the one implementation behind both.
- **`Termine` duplicates the card's title on every entry.** A dialect card is
  titled "Sciuscià" and then its first field says *Termine: Sciuscià*. The two
  are the same word every time, and the reader sees both. Whether the type
  should drop `term` and let the title carry it — or whether the title is meant
  to be something else, like the term plus a gloss — is a modelling question
  this file should answer before the archive fills with the redundancy.
- Worth recording as *working*, since nobody had checked: plain-text fields
  keep their line breaks for the reader (`white-space: pre-line`), free-text
  dates take "sec. XI — 1119" as intended, dialetto has no map anywhere (form
  or article, as the table above says), and the create routes follow each
  type's gender — `/personaggi/nuovo`, `/ricette/nuova`.

