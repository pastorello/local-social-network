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
| **Dialetto** | meaning, example usage | none |
| **Libri consigliati** | book author, year, publisher | none |

The bar: **a sixth type costs days, not a module.** The fifth was invented
mid-interview; more will come — and the sixth arrived on 2026-09-09, which is
the section at the foot of this file.

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
- ~~**`Termine` duplicates the card's title on every entry.**~~ **Answered
  2026-09-09: `term` is gone, the title is the word.** A dialect card was
  titled "Sciuscià" and then its first field said *Termine: Sciuscià* — the
  same word twice, both visible to the reader, on every entry. The author's
  answer was the short one: "il titolo basta". The column is dropped
  (`dialetto/migrations/0002`), the form's title placeholder now says what the
  field is for on this type ("Es. Sciuscià"), and `Termine.__str__` reads the
  card's title. Nothing was lost: the one row in the development archive had a
  `term` identical to its title, which was checked before the migration ran
  rather than assumed.
- Worth recording as *working*, since nobody had checked: plain-text fields
  keep their line breaks for the reader (`white-space: pre-line`), free-text
  dates take "sec. XI — 1119" as intended, dialetto has no map anywhere (form
  or article, as the table above says), and the create routes follow each
  type's gender — `/personaggi/nuovo`, `/ricette/nuova`.


## The sixth type: libri consigliati — 2026-09-09, **delivered the same day**

A section of **recommended books** about Gaeta: what to read to understand the
city, each with the reason a collaborator recommends it. Proposed by the author
on 2026-09-09, written down here before any code — per this repo's rule that
scope changes start in the spec — and built once he had read it and answered
the one question that was blocking (an entry is **a paragraph**, which settles
the list surface: the same `CardGrid` every other type uses).

**It arrived beside a second idea, `tradizioni`** — generic cards for the city's
customs — **and that one was dropped the same day, by the author**: every
candidate he could name fell into feste or ricette already, so the type had no
material of its own, only a name. That is recorded rather than deleted, because
the next person to propose a generic card type should meet the argument first: a
type with no material becomes the drawer everything ambiguous goes into, and
then the typed variants that are the point of v2 stop meaning anything. What
survived the conversation is narrower and **not currently wanted** — `racconti`,
an account of something that happened once. It is a different shape from a usage
that repeats, so if it is ever built it is its own type, not a drawer.

### It is a card, not a page

The cheaper-looking alternative — one editorial page listing the titles, which
the author maintains himself — was considered and rejected. It is only cheaper
until you count what it does *not* inherit: it would need its own editor (or
Django admin, which collaborators cannot reach — C1 made them non-`is_staff`),
and it would be the one content surface in the archive with no draft state, no
translation, and no author. Everything a collaborator writes here is a card;
a book recommendation is something a collaborator writes.

The length of an entry does not change this. A two-line recommendation is a
card with a short body. What a short entry *would* change is the **list
surface**: `CardGrid` is a grid of covers, and fifteen short entries read better
as a list than as a wall of tiles. That is a design question for the day it is
built, not a modelling one — see the open questions below.

### Fields

| Field | Kind | Why |
|---|---|---|
| `book_author` | free text | **Not `author`** — `Card.author` is the collaborator who wrote the card, and the two would be read as the same thing by everyone who came after. The name is deliberately ugly so it cannot be confused. |
| `year` | free text | Same rationale as `Feste.recurrence` and `Personaggio.life_dates`: editions and reprints ("1987, rist. 2004") are not a number. |
| `publisher` | free text | |

The body (rich text, sanitized like every other card) is **the recommendation** —
why this book, what it gives a reader of this archive. It is not a blurb copied
from the jacket.

**Map footprint: none**, like `dialetto`. A book is not a place. The library or
the bookshop where you find one *is* a place, but a card with that pin is a card
about the library — and under C5's rule ("if you add a layer to the map, it needs
a row in a list too") a sixth map layer is a real cost for a weak reason.

**Translations come free**, as they do for every type — and they matter here more
than the field list suggests: a foreign reader wants to know which books exist
about this city even when the books themselves are in Italian.

### Covers — decided 2026-09-09: the publisher's, never a scan

Book covers are protected images, and this type is the first that invites
uploading one. The archive's own images are photographs its collaborators took;
a scanned jacket is not. **The rule is the cover the publisher supplies for
promotional use, or no image at all** — a card with no image already gets a tint
of its layer colour (design.md D7), so nothing looks broken.

Nothing in code can tell a scan from a press image, so the rule lives where it
is acted on rather than only here: the images field on a `libri` form carries
it as its hint ("Usa la copertina fornita dall'editore, non una scansione"),
attached to the input with `aria-describedby` rather than floating beside it.
That is the whole enforcement, and it is honest about being a convention —
`imagesHint` on the type's config, one line, available to any later type with a
rule of its own about what may be uploaded.

### Open at the time of writing

1. ~~**How long is an entry?**~~ **Answered 2026-09-09: a paragraph.** So the
   list is `CardGrid` like every other type, and nothing special was built.
2. ~~**Covers?**~~ **Answered 2026-09-09**: the publisher's image or none —
   see the section above for what carries the rule, since no code can.
3. **A "dove trovarlo" field** — the *Biblioteca comunale*, a bookshop — as free
   text rather than a pin. Cheap; nobody has asked for it. **Still open**, and
   the only thing on this list that is.
4. Not proposed, and listed so it is not silently smuggled in later: **no
   purchase links**. The footer of this product says presence is chosen on
   editorial merit and nothing is bought; an affiliate link to a shop is the
   first crack in that.

### What it cost — the ADR-0004 bar, measured a sixth time

Built 2026-09-09, in one sitting: a `libri` app that is models/serializers/api/
urls/admin/migration/tests, its shape taken from `dialetto` because that is the
other type with no map; on the frontend one interface, one entry in
`typeConfigs.ts`, three routes, one icon, and the two places that list the
types (the nav's `SchedeMenu` and the footer). No new component and no new
view: `TypeForm`/`TypeListView`/`TypeDetailView` already do this, which is what
C3 bought. 23 backend tests, all of them derived from dialetto's.

The one thing that was not a copy is the **field name**. `book_author` next to
`Card.author` is ugly on purpose — see the table above.
