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

- **I6 — One public landing page, the same for everyone.** A stable public URL
  — "Che cosa ti va di fare?", the intents, and a way out to the map. The same
  address for every B&B: **no per-B&B codes, no greeting by name, no tracking
  of who came from where** — TD-30 removed third parties that follow visitors,
  and a business's name at the top of our page is the kind of presence D10
  keeps out. **The printed card is the B&Bs' business, not the product's**:
  the product's whole obligation is that the address never moves.

  *Counter-case, rejected:* a code per B&B, which gives a host a reason to hand
  the card out ("Benvenuti da Casa Rossa") and would show which hosts bring
  readers — evidence for a future patronage conversation.

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
  places, not the businesses on them.
- **A QR code per B&B** — see I6.
- **English at launch** — see I9.
- **Opening hours and "open now"** — already declined in design.md for the
  same reason: a wrong opening time is worse than none.

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
  optional `point_index` into that card's pins, and a plain-text note.
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
  tour can be assembled there before the collaborator's editor exists.

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

