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
| **Itinerari** *(specified 2026-09-11, built 2026-09-18)* | form, indicative duration, intents; ordered stops, each a card | a drawn path and numbered stops — see [itinerari.md](./itinerari.md) |
| **Attività** *(decided 2026-10-23 in [ADR-0010](../adr/0010-businesses-in-the-archive.md), built 2026-10-25)* | kind (*beve*, *mangia*, *compra*, closed in code), how to get there | one fixed pin |

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
| Luogo naturale | `natural_feature` | the Grotta del Turco |
| Museo | `museum`, `history_museum` | |
| Punto panoramico | `scenic_spot` | |
| Area per passeggiate | `hiking_area` | the paths on Monte Orlando |
| Parco | `park` | the Monte Orlando regional park |

The genres are an **admin-managed list, seeded with the table above** — the
same shape as the reports' categories — so the day a lighthouse or a cave
needs one, it is an admin edit and not a deploy. A collaborator picks a genre;
they cannot type a new one.

*Luogo naturale* is the ninth, decided by the author on 2026-10-23 and seeded
by `luoghi/migrations/0005`: caves, rocks, hills, an oasis — what is worth
seeing by nature and not by hand. Beaches, parks and viewpoints stay where
they are, and «Cosa si può fare qui» files it beside the viewpoints, under
«Scoprire la città».

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
*(Superseded 2026-10-23 by [ADR-0010](../adr/0010-businesses-in-the-archive.md):
businesses enter as their own type, `attivita`, on editorial merit, and a lido
is one like any other, through its bar or its kitchen. The beaches stay these
seven places. A beach card is public land and never presents a lido as its
owner or its part.)*

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
  that is about to be replaced. *(Since 2026-10-23 the menu leaves Chiese to
  this chip — see "The menu" below.)*
- **A translation shows its original's genre**, as it shows its original's pin
  (translations.md T5): what kind of place it is belongs to the place.
- **The layer colour is magenta**, `--color-layer-luoghi: #be185d` — the one hue
  family no other layer used; 5.65:1 on the page ground, 6.04:1 on white.

### «Dove si trova» gives the way there — 2026-10-23 (review PR-3)

A place's card now answers the reader already in town, not only the one on
the sofa ([review](../archive/review-2026-10-22.md) P-03, L-06). On a luogo or a
chiesa, *Dove si trova* reads, in order: the editorial zone its pin is in
(cosa-fare.md Part −1 D2); the luogo's `how_to_get_there`; **Come arrivarci
(apre Google Maps)** as the section's primary button; and, on a phone, *Allarga
la mappa* — the strip's own `?mappa=1` step, offered again where the reader is
reading. A festa's *Il percorso* gets **Portami alla partenza**, to the first
point of its route. A card with no pin has no such section. Nothing here is
wayfinding of ours (design.md, "Not a wayfinding app"): it is the plain
outbound anchor itinerari.md I7 and cosa-fare.md 0.1 already allow — no key,
nothing of Google's loaded on our page, Google computing the way when the
link is opened.

What the review left to the build, decided here:

- **One function builds every such link**: `lib/directions.ts::directionsUrl`,
  which is the tour's `lib/tours.ts::legDirections` moved out and generalised
  (older text in cosa-fare.md names it by its old address). On foot, from
  wherever the reader is — no origin — unless a tour's leg passes one;
  `target="_blank" rel="noopener"`. *(apre Google Maps)* is printed on the
  button, not only read to a screen reader: a tourist who lands in another app
  unannounced has lost the page.
- **Chiese and luoghi Read serializers carry `zones` as `{slug, name}`**
  (`maps/serializers.py::named_zones_of`, the zone table read once per
  response), the shape review PR-23 asks of them — its eyebrow builds on this
  field rather than reshaping it. `/api/map/features/` and itinerari keep
  their lists of slugs. The zone is plain text here; linking it to
  `/cosa-fare?zona=` is the eyebrow's job. *(It does since 2026-10-23, and
  feste carry their zones the same way, by their procession's stops;
  itinerari kept their slugs — design.md "Where the reader is".)*
- **A card with several pins gives each its own way there** — a ricetta's
  shops, a personaggio's birthplace and monument — one *Come arrivarci* beside
  each pin's label (or *Punto N*), since one button would have to choose a
  shop for the reader. *Dove si trova* is the same `TypeDetailView` section for
  every type with pins, so "a card with a place has the way there" holds for
  all four of them, not only the two the review named.
- **`how_to_get_there` moved under *Dove si trova*** through
  `FieldConfig.inPlace`; on a luogo still without a pin it stays among the
  facts, where it was, rather than disappear with the section.

### «Dove» before the text — 2026-10-24 (review PR-24)

The review's proposal 2 (2026-10-22), approved by the author on 2026-10-23:
a place's card opens with what the reader standing in town needs first. On a chiesa or a luogo with its pin, **one line sits under
the title and the cover, before the text**: «Dove», the first sentence of the
luogo's `how_to_get_there` (chiese have no such field), and *Come arrivarci
(apre Google Maps)*. The zone is not repeated there, because the panel's
eyebrow above the title carries it. *Dove si trova* stays at the end with the
whole text, the button and *Allarga la mappa*, as built above.

- **Not on ricette or personaggi**, whose pins are places the card has rather
  than the place it is: the line is for a type with one fixed pin
  (`maxPoints: 1`). Not on a card with no pin either.
- **On a translation** the link is the original's pin (translations.md T5)
  and the sentence is the translation's own `how_to_get_there`, written in
  its language, as under *Dove si trova*. Without one, the line is the link
  alone.

The look, and what the build decided about «the first sentence», are in
design.md, "A place's card opens on «Dove»".

### The menu: *Chiese* under *Luoghi*, and a count on every heading — 2026-10-23 (review PR-9)

The review found *Chiese* in two places a reader chooses from — an entry of
the *Schede* menu and a chip on `/luoghi` — and seven headings with no sign of
which have anything under them ([review](../archive/review-2026-10-22.md) P-06, L-04,
L-12). It offered two cures, one of them conditional on this file; **the
decision of 2026-09-11 above already takes it**: the reader meets one heading,
*Luoghi*, with the churches under it, and the chip on `/luoghi` is that
grouping "on the surface where a reader actually chooses". So **the menu no
longer names *Chiese*, and the chip stays** — one place, not two. Nothing
about the type changes: `/chiese`, its layer, its list and its cards are where
they were, and a church's page still lights the menu's button.

What the review left to the build, decided here:

- **Every heading carries its published count**, right-aligned and heard as
  «Luoghi, 9 schede». It comes from `GET /api/content/counts/` — one query,
  published originals only (translations are not a second card, as on every
  public list), the same for everyone: a draft never moves it, not even for
  its author, and it asks for no token. The types are **found, not listed**:
  every one-to-one row a type app adds to a `Card` (ADR-0004 — the core does
  not know its types), so a ninth type is counted the day it exists. It is
  `content`'s first endpoint; the menu asks for it each time it opens.
- **The number beside an entry is the number its page lists.** *Luoghi*
  counts the luoghi, not the churches with them: `/luoghi` opens on *Tutti*,
  which lists luoghi, and a menu that promised fourteen in front of nine would
  be wrong on arrival. The list's own line under its title now says the same
  number — the API's total, not the twenty cards a page holds.
- **An empty heading stays a link**, in the muted ink — the count, *0*, says
  it too, so the colour is never the only sign — and its list reads *Ancora
  nessuna scheda.* (*Ancora nessuna festa.* on `/feste`): the archive is
  growing, not missing.
- **The order is the reader's**: Luoghi, Feste, Ricette, Personaggi storici,
  Dialetto, Libri consigliati — the review's, without *Chiese*.
- **The chip is the way to the churches from the menu**, so `/luoghi` now
  shows *Tutti* and *Chiese* even while no genre has a published place;
  before, the whole row hid with the genres.
- **On a phone the menu hangs from the button's right edge.** From its left
  edge it ran twenty pixels past a 360 px screen, unnoticed while that side of
  it was empty; the counts sit there now.
- ***Il progetto* still lists every type, *Chiese* included.** It is the
  site's index, not a choice between headings, and the review's PR-12 redraws
  it; `ProjectView.spec.ts` keeps asserting every type's path is there.

### Why this is not `tradizioni` again

The argument that dropped `tradizioni` on 2026-09-09 (above) is that a generic
type with no material of its own becomes the drawer everything ambiguous goes
into. Luoghi has the material before it has the code — seven beaches, a
castle, a mausoleum, a park and its paths — and its genre is a **closed list
an admin controls**, so nothing lands in it by default: a card that fits no
genre is a sign it belongs to another type.

## The ninth type: attività — decided 2026-10-23, **built 2026-10-25**

The businesses a visitor goes to: where one drinks, where one eats, where one
buys a typical product to take away. The decision, its reasons and what it
turned down are [ADR-0010](../adr/0010-businesses-in-the-archive.md); this
section is what the type is. It exists for the evening the wizard had no
answer to (the review's study 10), on the rule design.md D10 wrote for a
bakery: presence is earned, not bought.

### Fields and footprint

| Field | Kind | Why |
|---|---|---|
| `kind` | one of three, **closed in code** | *Dove si beve*, *dove si mangia*, *dove si compra* — `beve`, `mangia`, `compra`. Choices on the model, not an admin table: a fourth (a chain, a beach club "as such") is a PR and an edit of this file, never one Django admin form, which is the trap cosa-fare.md K5 named. |
| `how_to_get_there` | plain text, optional | As on a luogo. |

Beside them, what every place has: **one fixed pin**, the rich-text body —
where the editorial reason for its presence is written — and its opening
hours as dated testimony (ADR-0008). A business gets **a map layer of its own,
with the list C5 requires**, an entry in *Esplora* and on *Il progetto* (the
two lists by hand), and translations like every card.

### What the build decided — 2026-10-25

Details the ADR left "to the build", recorded so they are not re-argued:

- **The order is alphabetical, everywhere, and printed.** `GET /api/attivita/`
  orders by title with capitals aside, then by title and id so that two pages
  never disagree; no query parameter changes it, and a test sends four that
  try. `mine/` is alphabetical too. `/attivita` says so under its title, with
  why the businesses are there: «In ordine alfabetico. Ci sono perché la
  redazione le ritiene degne di nota: nessuna paga per esserci.» — CF40's
  printed order and D10's "from how the page is built" in one line, the
  `listNote` of its `typeConfigs.ts` entry.
- **The kinds come from the model.** `GET /api/attivita/kinds/` lists the
  three, in code's order, each with its published count, in the shape of
  luoghi's genres (`{slug, name, name_plural, count}`), so the form's select
  and the list's chips needed nothing new; the list filters with `?kind=beve`
  (the API's parameter and the reader's address alike), and an unknown kind
  is an empty list, not an error.
- **A business is never a stop of a tour.** A tour that picked one bar among
  many would be the ranking CF40 forbids. `maps.CARD_TYPES` was both the map's
  layers and the definition of a stop — cosa-fare.md I3's trap — so it is now
  two lists: `CARD_TYPES`, the layers, with `attivita`, and `STOP_TYPES`, what
  a stop may be, without it. `itinerari/rules.py` refuses a business by what it
  is («… è un'attività: un itinerario non sceglie fra le attività…»), in the
  API and in Django admin alike; the SPA keeps the same split in
  `lib/mapLayers.ts::STOP_TYPES`, so the stops editor neither lists a business
  nor draws its pin while it picks.
- **Its hours, and nothing else.** `attivita` is in `content.models.ACCESS_TYPES`
  and in `HOURS_ONLY_TYPES`: «si entra solo durante le funzioni», «si visita su
  richiesta», the open-air state and «chi ha le chiavi» belong to a church or
  a monument. The API and the admin refuse them on a business; the form's tab
  is *Orari* and asks for the hours alone, and the card heads them *Orari*,
  their date beside them as always. A business's `access` on the map is
  therefore always null.
- **The layer is teal**, `--color-layer-attivita: #0f766e`, the one gap left on
  the wheel that no layer and no report status holds: 5.12:1 on the page,
  5.47:1 on white, 3.99:1 on its own tint. Its icon is a shopfront.
- **In the menu it comes second, under *Luoghi***: the other type a guest goes
  to. On *Il progetto* it follows *Chiese*, and so on *Le mie schede*, whose
  `MyCardsView.vue` turned out to be a third list of the types by hand —
  without it a collaborator's draft business would have been on no page.
- **A translation shows its original's kind**, pin and hours, as a luogo shows
  its genre (translations.md T5).
- **Counted like every type, by no zone.** The menu's counts and the archive's
  line find it as they find every type, and a draft moves neither — nor the
  kinds' counts — not even for its author (map.md M5). A zone's count stays
  its places, chiese and luoghi: a zone is not bigger for holding more bars.
  How «Cosa si può fare qui» lists them is in cosa-fare.md's note of the same
  day.
- **Demo and fixtures.** `seed_demo` adds three `[DEMO]` businesses, one of
  each kind, in Serapo, Gaeta Medievale and Porto Salvo; `seed_e2e` a
  published bar on Serapo's beach, with its hours.
- **Left open, as the ADR leaves it:** whether a ricetta's "sold here" pin
  becomes a link to an `attivita` card. CF36 still forbids reading those pins.

## The archive's line — 2026-10-24 (review PR-18)

The archive starts nearly empty and grows, and nothing told a reader it is
alive. The author approved on 2026-10-22 one line about the archive, never one
per card ([review](../archive/review-2026-10-22.md), decision 8): **«127 schede,
l'ultima aggiornata il 3 marzo 2026»**. It is on the home, under the
presentation in both layouts, and on *Il progetto*.

What the review left to the build, decided here:

- **`GET /api/content/stats/` counts what the menu counts** — published cards
  of a type, translations left out (one thing in the world, one row) — so its
  `published` is the menu's numbers added up, and a test says so. The prompt
  also asked for `language='it'`: by T1 ([translations.md](./translations.md))
  every original is Italian already, so that filter would add nothing but a
  way for the line and the menu to disagree over a card Django admin made
  against T1. A card with no type row is on no page and in no count. Public,
  no token, the same for everyone.
- **`last_updated` is the latest `updated_at` among the same cards**, so
  neither a draft nor a translation ever moves the date or the number, not
  even for their author — like every public count (map.md M5), and a test
  says that too. A card has no `published_at`, but publishing is a save: a
  card written three weeks ago and published today is dated today. Correcting
  an old card dates the archive as well, which is what «l'ultima aggiornata»
  says. If a `published_at` ever arrives, `content/api.py::_archive_stats` is
  the one place that changes.
- **The day is Gaeta's.** The API turns the instant into a calendar date in
  `Europe/Rome`, as `today_in_gaeta` dates a place's hours, and the SPA prints
  it with `lib/availability.ts::formatDay` — the formatter that already prints
  those hours, which reads a calendar day so no time zone can move it to the
  day before. (The prompt named `Intl.DateTimeFormat` with `timeZone:
  'Europe/Rome'` on the client; the day is Europe/Rome's either way, and one
  formatter for the two dates a reader meets keeps them alike.)
- **Cached for five minutes** in the default cache — the database cache in
  production, shared by every worker (settings.py `CACHES`) — because the home
  asks on every visit and a line about the archive's life can be a few minutes
  behind it. Nothing invalidates it on a publish.
- **The words are `lib/archiveLine.ts::archiveLine`.** Many: «N schede,
  l'ultima aggiornata il …». One: «1 scheda, aggiornata il …» — the latest of
  one is no latest. None: **no line at all**, never «0 schede». A request that
  fails prints nothing, and the page is otherwise the same.
- **On the home it arrives with the doors** (design.md D3's note of
  2026-10-23): it sits between the presentation and them, so whichever
  answered second would push the other down, and the home draws the two
  together. At the sheet's lowest stop it stays below the edge — what shows
  there is still the presentation's two lines.
- **On *Il progetto* it sits under the title for now**, its line held while
  it is asked for so the words beneath do not jump. Review PR-12 writes that
  page's own presentation and **moves the line under it**, where the prompt
  puts it; nothing else about the line changes then. *(Moved 2026-10-24:
  it closes the page's two paragraphs — design.md "*Il progetto* as a page".)*
- *Left to the author:* on the phone's home the line («22 schede») and the
  sheet's own count of the map («Luoghi sulla mappa · 16 schede») are two
  numbers in *schede* on one screen — the archive, and what the map draws.
  They are left as they are. *(Decided 2026-10-24, confirmed by the author —
  review PR-25: the sheet counts places, «Luoghi sulla mappa · 16 luoghi»;
  «schede» stays the line's word.)*

## Seeding the archive from public sources — 2026-09-11

> **Withdrawn 2026-10-22.** The author judged the seeded drafts a trial, not
> material to publish, the day the site went live — so both batches below and
> `seed_drafts` were removed from the repository, and production was born
> empty. What stays is the record, and the rules on *writing* from published
> sources (own words, *Fonti* and *Da verificare*, no images, no invented
> geometry, the types that cannot be seeded), which hold for any card written
> that way in the app. The rules on *loading* (drafts signed by *Redazione*,
> a command, files in git) went with the drafts.

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
- ~~**Kept in git, loaded by a command** (2026-10-14).~~ *Removed
  2026-10-22, with the drafts — see the note at the head of this section.*
  The first batch lived
  only in one developer's SQLite file, so a broken database would have taken
  it along. Every seeded draft is now a JSON file under
  `backend/content/drafts/<type>/`, and `python manage.py seed_drafts` turns
  them into cards: drafts only, signed by *Redazione*, and **never over a card
  that already exists** — same type and title is skipped whoever wrote it, so
  a correction made in the app survives every later run. It is not DEBUG-only,
  because a production database is meant to be born with these drafts. The
  files are the drafts *as seeded*; once a card is edited in the app, the app
  holds the truth and the file is only its origin. The command refuses what
  the rules below forbid — images, routes, dialect, tours, a published flag,
  a body without *Fonti* and *Da verificare*.
- **The second batch, 2026-10-14: ten luoghi**, one or more in every zone of
  «Cosa si può fare qui» that had no real place — the castle, the mausoleum
  and the park of Monte Orlando, the Grotta del Turco, and six beaches from
  Serapo to Sant'Agostino. Pins from OpenStreetMap, credited in each card's
  *Fonti*; access state left unknown except "all'aperto, senza porta" on
  three public beaches, flagged for confirmation; no hours, because none came
  from a source that could date them (ADR-0008). What it found: the beaches
  are documented almost only by bathing establishments' own pages, so their
  cards say little on purpose; sources confuse Quaranta Remi with Arenauta,
  and OSM has two beaches named Arenauta; and the genres have nothing for a
  sea cave, so the Grotta del Turco went in as a *punto panoramico* until the
  author decides whether a genre is missing. *(Decided 2026-10-23: one is,
  luogo naturale — see the genres' table.)*
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
