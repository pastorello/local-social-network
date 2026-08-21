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
