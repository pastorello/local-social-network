# Itinerari — curated tours for a visitor's stay

> **Decided 2026-09-11. Built 2026-09-18** — backend, then the reader's pages
> and the collaborator's editor (see "What the build decided" at the end). The confirmed output of a session with the
> author, one question at a time, each a committed guess against the strongest
> case for the opposite; every requirement below records the case that lost.
> It needs a new card type, **luoghi**, which is specified in
> [content.md](./content.md#the-seventh-type-luoghi--specified-2026-09-11-built-2026-09-18)
> because it is a type like the others, not part of this feature. Both sit on
> top of the layout decided the same day ([design.md](./design.md#the-map-under-every-page),
> D13–D21), and this file **supersedes the reader-built itinerary** that
> design.md scheduled after the layout — see the note there.

## Why this exists

The case the author started from:

1. A B&B in Gaeta hosts guests who are staying for fifteen days.
2. They do not know how to spend them.
3. The host leaves a card with a QR code that opens this app.
4. The guest picks what they feel like doing — **going to the beach**,
   **eating**, or **seeing the town**.
5. Each choice leads to itineraries written by someone who knows the place:
   the seven beaches, where the typical dishes are made, walks through the old
   town. The guest's problem is not getting there — Google Maps does that —
   but not knowing *what there is to see and in what order*.

That is the product's own line from design.md ("Google Maps is for going
somewhere; Vivere Gaeta is for knowing the place") turned into a feature: the
archive knows the place, a collaborator composes a day out of it, and the
walking directions are handed to the app that already does them.

## Requirements

- **I1 — An itinerary is a card.** An eighth type, `itinerari`, on the content
  core like the others (ADR-0004): a title, a rich-text introduction, a cover,
  draft and publication, an author, translations. Nothing about it needs a
  surface of its own that a card does not already have. It comes after the
  seventh, luoghi, because a tour cannot exist before its places do (I3).

- **I2 — Two forms: a raccolta and a percorso.** A **raccolta** is a curated
  set with no order and no path: *Le 7 spiagge di Gaeta* is one, because
  nobody does seven beaches in a day — a day at the sea is one beach, and the
  guest picks which. A **percorso** is a day out in sequence, with stops of
  **any type**: "a slice of tiella here, then a walk there, then this museum".
  Which stops and in what order is the collaborator's editorial choice. Only a
  percorso has a drawn path and the guided mode (I7).

  *Counter-case, rejected:* no raccolta at all — "Andare al mare" opening the
  beaches' genre list (see content.md), which is free and grows by itself. It
  loses what a raccolta is for: choosing which ones, an order of
  recommendation, and a note on each ("the quiet one", "by car only").

- **I3 — A stop is always a card from the archive.** Never a free point with
  two lines of text: the value of a tour is the story at each stop, and a pin
  with a caption is what Google Maps already has. A stop is **a card plus,
  optionally, one of that card's own points** — "eat the tiella *here*"
  means one particular bakery among the ricetta's "sold here" pins. Each stop
  may carry a short plain-text note from the tour's author — *why stop here,
  on this walk* — while the card itself tells the story.

  *Counter-case, rejected:* free stops, so a tour can be published before its
  places are written up. It would let tours ship sooner and leave the archive
  empty behind them; requiring cards is what makes a tour grow the archive.
  This is why luoghi exists (content.md).

- **I4 — A published itinerary never shows a stop the reader cannot open.** A
  tour can be published only when every stop's card is published. How a stop
  whose card is later unpublished or deleted is handled — skipped for readers
  and flagged to the tour's author is the obvious shape — is left to the build,
  but the rule above is not.

- **I5 — "Per chi vuole…": the intents are data, not code.** The three choices
  on the landing page are an **admin-managed list**, seeded with *Andare al
  mare*, *Mangiare* and *Scoprire la città*; a collaborator tags each itinerary
  with one or more. The landing shows only intents that have at least one
  published itinerary. A fourth intent is an admin edit, not a deploy.

  *Amended 2026-10-25 (review PR-21): an intent is offered when anything is
  behind it — a published tour, a place or a business filed under it, a dish
  for «Mangiare» — since the landing became the wizard's first step and an
  answer leads to «Cosa si può fare qui», not only to the tours. See "The
  welcome page is the wizard's first step" at the end.*

- **I6 — One public landing page, the same for everyone.** A stable public URL
  — "Che cosa ti va di fare?", the intents, and a way out to the map. The same
  address for every B&B: **no per-B&B codes, no greeting by name, no tracking
  of who came from where** — TD-30 removed third parties that follow visitors,
  and a business's name at the top of our page is the kind of presence D10
  keeps out. **The printed card is the B&Bs' business, not the product's**:
  the product's whole obligation is that the address never moves.
  *(2026-10-26: the page became the site's home, `/`, by the author's
  decision; `/benvenuto` leads there with its query, so the printed address
  keeps working — the obligation, not the page — and the wizard's second
  step is `/?intento=`. design.md D3's note of that day.)*

  *Counter-case, rejected:* a code per B&B, which gives a host a reason to hand
  the card out ("Benvenuti da Casa Rossa") and would show which hosts bring
  readers — evidence for a future patronage conversation.

  *2026-10-25 (review PR-21): `/benvenuto` is the first step of the wizard
  «Cosa fare adesso», on the same address — the obligation is the address,
  not the page. See "The welcome page is the wizard's first step" at the
  end.*

- **I7 — Following a percorso, one stop at a time.** "Inizia il tour" opens a
  guided mode: *Tappa 3 di 5*, the stop's note, **Come arrivarci** — a Google
  Maps link for **that leg only**, on foot, built from our coordinates (a plain
  URL: no key, nothing of Google loaded on our page, per TD-30 and D6b) — **Leggi
  la scheda**, and previous/next. On the map the leg to walk is highlighted,
  walked legs fade (D16).

  **No GPS** — the stop advances when the guest taps it; geolocation is its
  own phase (design.md non-goals). **Nothing about the guest is stored:** the
  position in the tour lives in the URL (a stop number), so a reload or a
  shared link lands in the same place, and there is no account to remember
  anything else — there is no public signup.

- **I8 — The collaborator builds it on the map.** D19's editor at work: the
  background map is where stops are added, with two modes — **the stops**
  (click a card's pin; it becomes the next stop) and **the path** (draw the
  walked route between stops, as a festa's route is drawn, so it follows real
  streets rather than joining stops in straight lines). The keyboard path is
  an "add a stop by choosing a card" search by title, and the manual
  coordinates D19 keeps for every map editor. The fields an itinerary adds to
  a card are only: the **form** (raccolta / percorso), an **indicative
  duration** (free text — "mezza giornata"), and its **intents** (I5).

- **I9 — Italian first; English later.** The tourist path ships in Italian,
  like the rest of the UI (N4). Itineraries are translatable from day one
  because the content core already is, so the content will be ready the day
  the interface speaks English — which is a phase of its own, decided when
  there is a reason to (who actually scans the card).

  *Counter-case, rejected:* English on the tourist path only (landing, tours,
  guided mode — about forty strings) at launch, because a foreign guest who
  meets buttons they cannot read closes the page on the first tap.

- **I10 — Only curated itineraries.** The guest chooses among itineraries a
  collaborator wrote; they do not assemble their own. A guest has no account,
  so there is nothing to remember a home-made tour with, and the case this
  exists for is precisely a guest who would not know what to put in one.

  *Counter-case, rejected:* keep design.md's reader-built planner as a bridge,
  since it is frontend-only and needs nobody to write anything — whereas a
  curated tour exists only once every one of its stops has been written and
  published.

- **I11 — Where it lives in the layout.** D14's reserved menu item arrives as
  **Itinerari**, with this phase. Itineraries are **not a map layer**: a tour
  is not a place, and C5's rule is that a layer needs a list of its own. An
  open itinerary draws its path and its numbered stops on the map (D16), and
  the landing and the menu are how one is found.

## Considered and not taken

- **A reader-built itinerary** — see I10; it was design.md's plan until this
  session.
- **Free stops** — see I3.
- **"The tour of the seven beaches" as a percorso** — nobody does it; it is a
  raccolta (I2).
- **Beach clubs** (*stabilimenti balneari*). The archive lists the beaches as
  places, not the businesses on them. *(Superseded 2026-10-23 by
  [ADR-0010](../adr/0010-businesses-in-the-archive.md): a lido may enter as an
  `attivita` through its bar or its kitchen. The beach stays public land, and
  a tour stop at it is the beach, not a lido.)*
- **A QR code per B&B** — see I6.
- **English at launch** — see I9.
- **Opening hours and "open now"** — already declined in design.md for the
  same reason: a wrong opening time is worse than none. *(Since 2026-10-12,
  [ADR-0008](../adr/0008-opening-hours-as-dated-testimony.md): a card may show
  dated, free-text hours, but a tour still never filters, orders or times
  itself by them, and "open now" stays refused.)*

## Left to the build

- The landing page's address (`/benvenuto` was the working name) — the one
  thing that must then never change, since it is printed on cards the product
  does not control.
- The mechanism behind I4 when a stop's card is unpublished or deleted.
- **Feste during the stay.** A guest staying fifteen days wants to know whether
  a procession falls in them. Today a festa's recurrence is free text on
  purpose; this would need a structured date beside it. A separate decision.
- Whether the guided mode shows a walking time between stops, or leaves that
  to Google Maps.

## What the build decided — backend, 2026-09-18

The `itinerari` app (`/api/itinerari/`), and the details the requirements
left open:

- **Models.** `Itinerario` is a card type (I1) with `form`
  (`raccolta`/`percorso`), `duration` (free text) and `intents` (many-to-many);
  `Intent` is the admin-managed list, seeded with the three (I5) and addressed
  by slug (`?intento=mare`); `Stop` is an ordered row holding a card, an
  optional chosen pin of that card, and a plain-text note. *(The pin is held
  by reference, not by its position in the card's list, since 2026-10-12 —
  TD-50: removing an earlier pin used to move the stop onto its neighbour. The
  API still exchanges it as `point_index`.)*
- **A stop must have a place.** I3 says "any type"; a dialect word or a book
  has nothing to walk to, nothing for *Come arrivarci* to point at, so a card
  with no map feature is refused as a stop ("non ha un luogo sulla mappa").
  A translation is refused too — the stop is the original. A stop's point is
  the one chosen, else the card's first pin, else the start of a festa's
  route.
- **I4, both halves.** Publishing is refused while any stop's card is a draft,
  naming the drafts. A stop whose card is unpublished *later* stays in the
  tour: the reader never sees it, the author and admins see it flagged
  (`is_published: false` on the stop). A stop whose card is **deleted**
  disappears with it (`CASCADE`), without notice — the admin list of stops is
  where that shows.
- **The walked path** is the itinerary card's own route (`MapFeature`,
  `kind=route`), like a festa's. A raccolta has none: switching a tour to
  raccolta deletes it.
- **A translation shows the original's tour** — stops, their notes, the path,
  the form and the intents — as it shows the original's photographs (T5);
  writing stops or a path to a translation is refused. The notes are therefore
  Italian in every language until the English interface phase (I9) decides
  otherwise.
- **Not a map layer** (I11): `/api/map/features/` does not include tours; a
  test says so.
- **Django admin** has an inline for the stops (with card autocomplete), so a
  tour can be assembled there before the collaborator's editor exists. *(Since
  2026-10-12 — TD-49 — it obeys the same stop rules and I4 as the API, through
  `itinerari/rules.py`, and so does publishing a tour from the generic card
  form.)*

## What the build decided — frontend, 2026-09-18

- **The landing page is `/benvenuto`** — the working name kept, and from now
  on the one address that must not change (see "Left to the build"). It asks
  "Che cosa ti va di fare?" and lists only the intents with a published tour,
  each linking to `/itinerari?intento=…`; with none, it says the tours are in
  preparation and points at the map. No greeting per host, nothing stored.
- **The list is the generic one.** `/itinerari` is `TypeListView` with
  `itinerarioConfig`, the intents as its filter chips — `IntentSerializer`
  carries a `name_plural` equal to `name` so the list reads intents the way it
  reads luoghi's genres.
- **Itinerari is in the menu**, between Schede and Il progetto (and in the
  phone's Menu): a tour is how a guest starts, not one card type among
  eight, so it is not a Schede entry.
- **The guided mode's position is in the URL** (`?tappa=N`): a reload or a
  shared link lands on the same stop, and nothing about the guest is kept.
  Only a percorso is guided — a raccolta has no order to follow. Each stop
  shows its note, *Come arrivarci* (a Google Maps walking link from the
  previous stop, or from wherever the guest is for the first) and *Leggi la
  scheda*. **No walking time** is shown: Google computes it when the link is
  opened, and a number of ours would be a second, worse estimate.
- **The map shows the tour** (I11) through the same focus every card uses:
  numbered stops, and the drawn path — or, for a percorso without one, the
  stops joined in order. In the guided mode, only the leg being walked.
- **The editor is the map** (D19, I8). The form's *Tappe* tab lends the map a
  `stops` editor: a click on any card's pin makes it the next stop, and the
  map does not dim the other cards while it does, since they are what is
  being chosen from. The keyboard path is a list of every card with a place,
  grouped by type (WCAG 2.1.1). A stop whose card has several pins gets a
  "Dove" choice; each stop a note, ↑/↓ and remove. *Il tragitto* (percorso
  only) draws the path with the same field a festa's route uses. At most 40
  stops.


## What the canvas still asked for — built 2026-09-19

The itinerari canvas drew four things the first build left out; the author
asked for them on 2026-09-19.

- **A line under each intent** on `/benvenuto` ("Le spiagge, da Serapo a
  Sant'Agostino"): `Intent.description`, admin-edited, seeded with the
  canvas's three lines where empty.
- **The list says what a tour is**: "Mezza giornata · 5 tappe", or "· 7
  luoghi" for a raccolta (`typeConfigs.ts`'s `summaryOf`).
- **Each stop says what it is** under its title — Chiesa, Festa, Ricetta,
  Personaggio storico, Luogo. Not the luogo's genre: a stop does not carry it.
- **A raccolta gives every place its own way there** (decided with the author:
  no new field). A stop whose *Dove* is left empty stands for **every** place
  its card has, so "Tiella di Gaeta" lists each bakery with its own *Portami*;
  choosing a *Dove* narrows it to that one, as before. A luogo's *Come
  arrivarci* text shows under it ("In autobus dalla stazione"). *Portami*
  leaves the travel mode to Google — a beach may be reached by car or bus;
  the guided mode of a percorso stays on foot. A percorso does not change: a
  walk needs one point per stop. **Limit:** the map marks such a stop at its
  first place only.

## The guided mode tells the stop — 2026-10-23 (review PR-7)

The review of 2026-10-22 ([review-2026-10-22.md](../archive/review-2026-10-22.md):
P-05, L-07, L-08, M-08) found the guided mode two-thirds empty, *Inizia il
tour* under the whole list of stops, three equal ways out of a stop, and
nothing after the last one. What changed, with the details the prompt left to
the build:

- **A stop tells itself, without a second tap.** Under *Come arrivarci* and
  *Leggi la scheda*: the card's cover if it has one — and nothing in its place
  if not, since an empty block tells a guest nothing — then the opening of its
  body, a luogo's own *come arrivarci* text, and *Visitare* for a place with a
  door. *Leggi la scheda* is for the rest.
  - The opening is the body's first **400 characters as plain text**, one line
    per block, cut on a word and closed with "…". The API makes it
    (`itinerari/serializers.py::excerpt`): a card has no summary field, and a
    body cut as HTML would need a second `v-html` beside `RichText.vue`.
  - *Visitare* is the card's own `VisitInfo`, so ADR-0008 holds unchanged: it
    shows nothing when nothing is known, never "open", and the hours only with
    their date. The prompt said "for a church"; it shows for **chiese and
    luoghi**, the two types with a door (`content.models.ACCESS_TYPES`), since a
    museum's hours on its card and not at its stop would be one fact in one
    place and missing in the other.
- **The stop's page.** The eyebrow is the position alone, *Tappa 1 di 3*; the
  tour's name sits under the title, small. *(Since 2026-10-23 both are the
  panel's eyebrow, «Giro del centro · Tappa 1 di 3», with the tour's name as
  the way up to it, and nothing sits under the title — design.md "Where the
  reader is".)* *Tappa successiva →* is the one
  primary button, full width; *← Precedente* and *Torna all'itinerario* are
  links in a row under it, and the first stop has no *Precedente*. When the
  pressed control goes away, focus moves to the stop's heading (WCAG 2.4.3), as
  before.
- **«Inizia il tour» comes before the stops**, right after *Durata indicativa*
  and *Per chi vuole*, and again under the list.
- **After the last stop** (the after-tour approved on 2026-10-22): *Hai finito
  il giro* takes the place of *Tappa successiva*, with up to three ways on, each
  shown only when something is behind it — `lib/doors.ts`'s rule, no door onto
  an empty room:
  - *Un altro itinerario* goes to the list for the first of the tour's intents
    that has another published tour, else to every tour, and is not offered
    when this tour is the only one;
  - *Cosa c'è qui intorno* goes to `/cosa-fare?zona=` for the first zone **the
    last stop's own point** is in — the chosen bakery, not every shop the dish
    is sold in — and is not offered when that point is in no zone;
  - *Da mangiare* goes to `/ricette` once a ricetta is published.

  The three counts are asked for when the guest reaches the last stop, not
  before, and a count that fails offers nothing. `lib/tours.ts::afterTour`
  holds the rule.
- **Stops on one spot share one marker** carrying all their numbers, "1 · 2",
  instead of two labels drawn one over the other (L-07). The prompt offered a
  6 px offset per number, which still overlaps at the width of a number, or a
  "3 tappe" marker, which loses which three. One spot is the same point to
  about a metre (`lib/tours.ts::stopsByPlace`): stops a few metres apart keep
  their own markers and may still touch at zoom 16. A cluster that regroups
  with the zoom was not worth it for that.
- **A stop in the API** carries four more fields for this: `cover`, `excerpt`,
  `availability` (null for a type without a door, `unknown` when nothing is
  known) and `zones`, by name. `seed_e2e`'s tour gained a third stop (the beach
  in Serapo) and the archive a published ricetta, so `itinerari.cy.ts` walks
  stop 1 → 2 → 3 → the end.

## The welcome page says what it is — 2026-10-23 (review PR-14)

The review of 2026-10-22 ([review-2026-10-22.md](../archive/review-2026-10-22.md):
P-07, M-09) found `/benvenuto` asking its question without saying what the
site is, its intents white panels of text, and its way out a small button.
The address is untouched — I6's one obligation — and so is what the page
offers; what changed is how it reads:

- **Under «Benvenuti a Gaeta» and the question, the home's own line**: «Gaeta
  raccontata da chi ci vive: luoghi, chiese, feste, ricette, itinerari.»,
  from the constant the home reads (`definitions/copy.ts`). The line that
  was there, «Itinerari scritti da chi Gaeta la conosce: scegli da dove
  cominciare.», stays under it.
- **Each intent wears a tint of its own colour and an icon** — the sea, the
  town, the walk, the table — where a cover will go once the archive has
  photographs. The colours are tokens (`--color-intent-*`, design.md D8); an
  intent added in the admin (I5) shows grey with the tours' map icon until
  it is given its own, so a fifth intent is still an admin edit, not a
  deploy. The zone card wears the home's pin.
- **The way out is a link, «Oppure vai alla mappa»** — not «esplora»: the
  menu's *Esplora* is on the same screen, and the review chose «Vai alla
  mappa» for the wizard's exit for that reason (its PR-23 point 4, PR-21
  point 6). This page is to become the wizard's first step (review PR-21);
  nothing here anticipates it.

The reasons and the measured contrasts are in design.md, "The welcome page,
and the whole screen on a phone — 2026-10-23".

## The welcome page is the wizard's first step — 2026-10-25 (review PR-21)

The review of 2026-10-22 asked, in its study 10, for a guided path that ends
in a choice — what, then where, then here is what there is — and the author
confirmed the flow on 2026-10-23 as written, with «Bere» and «Oggi» /
«Questa settimana» decided the same day ([review-2026-10-22.md](../archive/review-2026-10-22.md),
*Decisioni del 23 ottobre 2026*). The wizard is `/benvenuto` and
`/cosa-fare` in a row, one question a screen, and **the address on the
cards does not move** (I6):

- **Step 1 is `/benvenuto`**: «Che cosa ti va di fare?», under it the
  presentation line, then the answers — big cards a thumb can take, one
  column on a phone, and links: choosing is going on, so there is no
  «Avanti». The intents that have something behind them, in the admin's
  order (I5 as amended above); then, apart under *In calendario*, «Oggi»
  and «Questa settimana» when something falls in them ([cosa-fare.md](./cosa-fare.md)
  Part −1 D9); then «Oppure guarda cosa c'è in una zona» (D6 of the same
  file, its D8 rule unchanged); last, «Non lo so: fammi vedere la mappa».
  *(2026-10-26, the author's decision: the zones' answer is gone — it said
  what the last one says, and the menu's «Cosa fare» is that door — and
  «Camminare» folded into «Scoprire la città»: cosa-fare.md D4's and D6's
  notes of that day.)*
  With one intent the question is still asked — it is the first
  impression.
- **Step 2 is the same address with `?intento=`**: «Hai scelto: …» with a
  link back, «Dove?», the field «Dove sei?» of review PR-20, the zones that
  hold something of the intent — each naming the first two things there —
  and «Ovunque a Gaeta».
- **Step 3 is `/cosa-fare?intento=…&zona=…`** (or `?intento=` alone for
  «Ovunque»), described in cosa-fare.md.

**The rules, held by a test** (`lib/wizard.ts`, `lib/__tests__/wizard.spec.ts`):

- **An answer only with something behind it**, counted on what the public
  reads (map.md M5): a collaborator's drafts never open one. «Bere» needs a
  published business *dove si beve*; «Mangiare» answers with a published
  dish too, since the dishes are for all of Gaeta (cosa-fare.md D3).
- **A step with one possible answer is skipped**, and the links of the step
  before already point past it: when no zone holds anything of the intent
  (the dishes are in none) step 1 leads straight to «Ovunque a Gaeta»; when
  one zone holds all of it, straight to that zone. A step 2 opened from a
  link is skipped the same way, with `replace`, so Back goes to the step
  before.
- **The answers are the address**: Back is the step before, and a link
  reopens the same result (`wizard.cy.ts` walks to step 3 and compares it
  with the same address opened cold).
- **The focus is on the question at every step**, its one h1 (ADR-0005). A
  step reached from another page gets it from the panel, which now focuses
  a heading marked `data-panel-focus` rather than itself; between steps 1
  and 2, only the query changes, and the page hands it over.
- **Never «aperto adesso»** (ADR-0008), **and no question about time**: a
  tour's duration is its author's words (cosa-fare.md Part −1, D1).

**Decided by the build**, where the review left it open:

- **«Oggi» and «Questa settimana» lead to «Gli eventi che conosciamo»**
  (`/eventi?finestra=`), not through «Dove?»: the windows are the API's
  (`?finestra=`, counted in Gaeta's day), the list is not by zone, and
  CF42 keeps events out of a list of cards. They wear the feste's amber
  (`--color-intent-quando`) and the calendar.
- **The way out is an answer**, «Non lo so: fammi vedere la mappa» — the
  words of the review's PR-21, point 1 — in place of PR-14's closing link
  «Oppure vai alla mappa». The verb is still the map's, never «esplora»
  (PR-23). The home's «Vai alla mappa», the same answer on the map itself,
  is review PR-21b's: built the same day, it asks this first question over
  the map too, and this answer leads there with the question put away
  ([design.md](./design.md), D3's note of 2026-10-25).
- **The line «Itinerari scritti da chi Gaeta la conosce…» is gone**: the
  page no longer offers tours only, and PR-14 kept it until the wizard
  rewrote the page.
- **The answers land together** once every count is in — the intents, the
  tours with their zones, the zones and their names, the dishes, the two
  windows, and the map's features the shell has already asked for — under
  the question and the presentation, which paint in the first frame (TD-52).
  Nothing arrives above what is already on screen, and the map's way out is
  no longer a link drawn first and pushed down by the answers.
- `seed_e2e` publishes a castle in Gaeta Medievale, so «Scoprire la città»
  is in two zones and the e2e suite meets step 2 at all: with every intent
  in one zone, every step 2 would be skipped.
