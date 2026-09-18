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
| **Luoghi** | genre (admin-managed), how to get there | one fixed pin |
| **Itinerari** *(specified 2026-09-11, not built)* | form, indicative duration, intents; ordered stops, each a card | a drawn path and numbered stops — see [itinerari.md](./itinerari.md) |

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
3. ~~**A "dove trovarlo" field**~~ — the *Biblioteca comunale*, a bookshop, as
   free text. **Decided 2026-09-10: not now.** Nobody has asked for it, and a
   field nobody fills is a blank line under every book. Cheap to add the day a
   collaborator wants it.
4. Not proposed, and listed so it is not silently smuggled in later: **no
   purchase links**. The footer of this product says presence is chosen on
   editorial merit and nothing is bought; an affiliate link to a shop is the
   first crack in that.

**The footer keeps its five subjects** — decided 2026-09-10. Its line
("feste, chiese, ricette, personaggi e dialetto") names what the archive tells
*about the city*; recommended books are about the city rather than part of it,
so the sentence stays as it is. The footer's *Schede* column links to `/libri`
like every other type, which is where a reader actually looks for it.

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

## The seventh type: luoghi — specified 2026-09-11, **built 2026-09-18**

The places a visitor goes that are not churches: the beaches, the castle, the
monuments, the museums, the viewpoints, the walks on Monte Orlando. It exists
because of a decision in [itinerari.md](./itinerari.md) (I3): **a stop on an
itinerary is always a card**, and until now half the stops a tour of Gaeta
needs had no type to be a card of — the castle, drawn on the first sketch of a
tour, had to be labelled with a type that did not exist.

### A genre, from a vocabulary that already exists

Each luogo has a **genre**. The list is not invented: it is taken from the
place taxonomy Google Maps uses (the Places API's published place types),
restricted to what Gaeta actually has, and translated. The author pointed at
it himself — on Google Maps the castle is filed as *castello*, and *area per
passeggiate* is a category of its own.

| Genre | Google place type | In Gaeta, for instance |
|---|---|---|
| Spiaggia | `beach` | the seven beaches |
| Castello | `castle` | the Castello angioino-aragonese |
| Monumento | `monument` | the Mausoleum of Lucius Munatius Plancus |
| Luogo storico | `historical_place` | |
| Museo | `museum`, `history_museum` | |
| Punto panoramico | `scenic_spot` | |
| Area per passeggiate | `hiking_area` | the paths on Monte Orlando |
| Parco | `park` | the Monte Orlando regional park |

The genres are an **admin-managed list, seeded with the table above** — the
same shape as the reports' categories — so the day a lighthouse or a cave
needs one, it is an admin edit and not a deploy. A collaborator picks a genre;
they cannot type a new one.

### The churches stay a type of their own

A church is a place, and the author's first description put *chiese* in the
list beside beaches, museums and monuments. **Decided 2026-09-11: that is how
the reader sees it, not how it is stored.** In the menu and on the map the
reader meets one heading, *Luoghi*, divided into Spiagge, Chiese, Musei,
Monumenti and the rest; underneath, `chiese` stays the type it has been since
C3, and luoghi's genres simply do not include one for churches. The grouping
is presentation.

*Counter-case, rejected:* fold churches into luoghi as a genre — one write
path for "a text and a pin", and one place for a tour's author to choose stops
from. It costs a data migration, the `/chiese` addresses, a map layer and a
share of the Cypress suite, for no difference a reader could see.

### Fields and footprint

| Field | Kind | Why |
|---|---|---|
| `genre` | admin-managed choice | See above. |
| `how_to_get_there` | plain text, optional | "A piedi dal centro", "in auto, parcheggio sulla Flacca": the first thing a visitor asks about a beach or a viewpoint, and not something a pin answers. |

**Map footprint: one fixed pin**, like a church. Luoghi get **a layer of their
own with the list C5 requires**; the churches keep theirs, and the layer
toggles show the two side by side under one *Luoghi* heading. The layer colour
is a new token, checked against D9 like every other.

**Beaches are the seven places, not the businesses on them**: Serapo,
Fontania, Quaranta Remi, Ariana, San Vito, Arenauta, Sant'Agostino. No beach
clubs — the archive lists places, and a *stabilimento* is a business.

### What the build decided — 2026-09-18

Details the spec above left to whoever built it, recorded so they are not
re-argued:

- **The genres are a model, not choices in code** — `luoghi.Genre`, seeded by a
  data migration with the eight rows of the table above (each migration row
  notes its Google place type), editable and reorderable in Django admin. A
  genre still in use cannot be deleted (`PROTECT`).
- **A genre is addressed by its slug** — `spiaggia`, `luogo-storico` — on the
  wire and in the SPA's URLs, not by its UUID: `/luoghi?genere=spiaggia` is a
  link a person can read. `GET /api/luoghi/generi/` returns every genre in the
  admin's order with the count of published places carrying it.
- **The reader's headings are a filter on the list.** `/luoghi` shows one chip
  per genre that has something in it (an empty heading is noise; the active one
  always stays), *Tutti*, and **a *Chiese* chip that links to `/chiese`** —
  that is the "churches grouped under Luoghi" of the decision above, on the
  surface where a reader actually chooses. The page's heading becomes the
  genre's plural (*Spiagge*).
- **The menu does not carry the genres yet.** *Luoghi* sits right above
  *Chiese* in the Schede menu and in the footer; the full *Luoghi* heading with
  its genres belongs to the menu design.md D14 redraws, rather than to a menu
  that is about to be replaced.
- **A translation shows its original's genre**, as it shows its original's pin
  (translations.md T5): what kind of place it is belongs to the place.
- **The layer colour is magenta**, `--color-layer-luoghi: #be185d` — the one hue
  family no other layer used; 5.65:1 on the page ground, 6.04:1 on white.

### Why this is not `tradizioni` again

The argument that dropped `tradizioni` on 2026-09-09 (above) is that a generic
type with no material of its own becomes the drawer everything ambiguous goes
into. Luoghi has the material before it has the code — seven beaches, a
castle, a mausoleum, a park and its paths — and its genre is a **closed list
an admin controls**, so nothing lands in it by default: a card that fits no
genre is a sign it belongs to another type.

## Seeding the archive from public sources — 2026-09-11

The archive is empty, and the author asked for it to be seeded from what is
already published about Gaeta. It was — into the **development database
only**, eleven drafts on the first day (two feste, five chiese, a ricetta, a
personaggio, two libri) — under rules that are written here because the next
batch, and whoever publishes these, needs them:

- **Drafts, always.** Nothing seeded is ever published by the seeding.
  Publishing means someone who knows Gaeta has read it; the landing page of
  [itinerari.md](./itinerari.md) promises the visitor exactly that. The drafts
  are signed by a dedicated *Redazione* account with no usable password, not
  by a person, until a person has read them.
- **Written, not copied.** The sources are other people's prose — a diocese's,
  an encyclopedia's, other sites about Gaeta. Those sites are leads for
  *topics* (which feste, places and books exist); the facts are then confirmed
  on primary sources, and no text or image is lifted from anyone.
- **Every seeded card ends with "Fonti" and "Da verificare".** The sources
  stay — an archive that cites is better than one that does not. *Da
  verificare* goes before publication, and it lists every fact found in a
  single source or in sources that disagree.
- **No images.** Rights are unknown for anything found on the web.
- **No invented geometry.** A church's pin can come from its published
  coordinates. A procession's route cannot be reconstructed from "through the
  main streets": it is drawn by someone who has walked it, and until then the
  route stays empty.
- **Not every type can be seeded.** Dialect words found on the web are not
  reliable, and a recommended book that does not exist is the worst mistake
  this archive could make. Dialetto is written by people who speak it (with
  *Gaeta in parole* as the reference the author owns), and a book is seeded
  only when the author vouches that it exists.

What the first batch found is the reason for the rules. **Sources contradict
each other** — the cathedral's consecration is 22 January 1106 in one and
3 February in another, and the cathedral's own site calls Erasmo a bishop of
Formia where the wider tradition makes him a bishop of Antioch martyred there.
**Searches mix Gaeta with its neighbours** — Formia holds a feast of
Sant'Erasmo too, and there is a San Giovanni a Mare in Naples. And **the
authoritative detail is often missing from every source**: no page names the
streets a procession takes. The one route that may already be known is the
example in the types table above — the Scalzi, via Indipendenza, the sea,
Punta Stendardo, "every 9 August" — which matches what the sources say of the
Porto Salvo procession; the author can confirm it, and that is the point.
