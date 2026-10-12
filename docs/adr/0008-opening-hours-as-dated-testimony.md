# ADR-0008: Opening hours enter the archive as dated testimony, never as a schedule

## Status

Accepted. Amends [design.md](../spec/design.md)'s *Considered and not taken*
entry on "Open now" and opening hours, and the restatement of it in
[itinerari.md](../spec/itinerari.md).

## Date

2026-10-12 — the author's decision is of 2026-09-24
([cosa-fare.md](../spec/cosa-fare.md) §0.2b); this record was written when he
made the module it serves the next phase.

## Context

design.md refused opening hours outright: *a wrong opening time is worse than
none — a tourist walks to a church that is shut*. The same file names that
scene, standing in front of a closed church, as the moment the product is
for. The refusal was sound for the model it imagined: hours imported from
somewhere, stored as a schedule, rotting while the page went on asserting them.

Three things are now known that it did not know:

- **The scene is routine.** The author confirmed that a visitor finding a Gaeta
  church shut is a real, known problem, not a hypothetical.
- **There is nothing to import.** Google's Places policy forbids storing what
  it returns except the place ID, so its hours could only be fetched live, per
  place and per page view, from the reader's browser (the third-party request
  TD-30 and design.md D6b removed) or from our server, paid per row. Of the
  sources that may be kept, OSM is the only one with an hours field, and on
  2026-09-22 it held hours for **1 of Gaeta's 42 places of worship**. Every hour
  in this archive will be one a person went and got. The refusal's real risk
  was never sourcing; it is editorial.
- **The thing does not have a schedule.** The Cattedrale publishes no opening
  hours: it republishes a calendar of openings **every month**, on Facebook.
  Celebrations are suspended at three of the five churches in the archive.
  Gaeta's churches open when someone with the keys is there.

And one decision, the author's (2026-09-24): *«non posso andare a chiedere gli
orari, l'importante è che nel modulo ci sia la possibilità di inserirli, poi
col tempo riempiremo tutti i contenuti.»* Nobody will collect hours as a
project. The archive needs a place to write them down the day a collaborator
happens to know them, and it must be correct while empty.

## Decision

**A card of a type with a door may carry what is known about getting in, as
free text with the date it was written. The archive never computes from it,
never filters on it, and never claims anything is open now.**

1. **Where.** One row per card in the content core, beside `MapFeature`:
   `content.Availability`, a `OneToOneField` to `Card`. It is a core model
   rather than a field on each type because two types share it, and a third
   would otherwise be a third copy (ADR-0004). The types that may have one are
   listed once, in `CARD_TYPES`' shape: **chiese and luoghi**. Like a card's
   pins and photographs (spec translations.md T5), the row belongs to the
   **original** and a translation shows the original's.

2. **What.** Five fields, each with one job:
   - `state`: what kind of access the place has. `unknown` is the default and
     is what a card with no row means. The others say how you get in, or why
     you can't: only during services, on request, closed for works, or
     no door at all. **None of them means "open"**, and `no_door` is refused on
     a church, which always has one.
   - `hours`: **free text**, a plain-text field like `recurrence` and
     `life_dates`, written the way a person would say it aloud. Never parsed.
   - `hours_updated`: a date the **server** sets whenever `hours` changes.
     No form writes it and no collaborator maintains it.
   - `keeper` and `keeper_phone`: who holds the keys, and how to reach them.
     The one fact that answers a funeral or a restoration, which no schedule
     reaches.

3. **How it is shown.** Hours are always printed with their date — *«Orari
   segnalati il 12 marzo 2026 — telefona per sicurezza»* — and never without
   it. A card with nothing known shows **nothing**: no heading, no placeholder,
   no apology repeated on every card. A date makes a line an old fact instead
   of a stale promise. *«Orari che ci ha dato la parrocchia il 12 marzo»* stays
   true however long ago it was, and design.md's objection was to a claim of
   being current.

4. **The invariants.** They are the decision. A change that breaks one
   reverses this ADR and needs its own:
   - **Absence is unknown, never open.** A card with no row, an empty `hours`,
     and `state = unknown` all mean the same thing: we do not know. Tests are
     named after the mistake a later contributor will make
     (`test_no_row_is_unknown_not_open`).
   - **Nothing computes or renders "aperto ora"**, nor any equivalent: "open
     today", "closes at", a green dot. `hours` is never parsed into times.
   - **Hours never remove a card from a list, rank it, or filter it.** The
     index that *Che si fa a Gaeta?* builds shows availability; it does not act
     on it. That is arithmetic as much as caution: with one church in sixteen
     filled, a filter would remove nothing and imply a completeness the archive
     does not have.
   - **The date is shown, never used as a gate.** No TTL, no expiry, no "stale"
     banner, no reminder or job that asks a collaborator to re-verify. An old
     date is information for the reader, not a task for us.
   - **Provenance is a person.** Hours come from a door, a telephone call or
     the keeper's own page. **Never from Google Maps**, in either direction:
     not copied off the app by a collaborator, and not imported.

5. **The extension path, so it is not taken by accident.** A structured copy
   of the hours (closed days, time ranges) may follow, designed against real
   strings once there are enough of them, and only as closures. A filter on
   it, or any claim that a place is open, is a new ADR that supersedes this
   one, not an amendment to it.

## Alternatives considered

- **Keep the refusal.** It leaves the scene design.md names unanswered, and it
  rested on an import-and-rot model that, it turns out, cannot happen. The
  author has decided the archive should hold what its collaborators know.
- **Google Places as the source.** Its policy permits storing only the place
  ID, so hours could only be fetched live and paid per row, from the reader's
  browser or on our critical path. The project has already twice removed the
  first of those (TD-30, D6b). Further licence clauses are reported to forbid
  showing Places content beside a non-Google map, which this app is on every
  route. They are not cited here because their text could not be fetched and
  verified. The storage rule alone decides it.
- **Import from an open source** (OSM, Wikidata, Foursquare and Overture
  Places). Storing is allowed, but coverage is 1 of 42 places of worship, and
  that one value is reported to be half an hour wrong.
- **A structured weekly schedule** (a grid, or OSM's `opening_hours` grammar).
  Its shape is a lie about the thing: it cannot hold a monthly calendar,
  *«la mattina, e il pomeriggio solo d'estate»* or *«quando c'è il
  sacrestano»*. It also asks a collaborator on a phone to type expert syntax.
  design.md already recorded the same failure in another city's map, whose
  structured copy of its hours lost information.
- **Closures only, with no field for an opening time** (the draft's own answer
  of 2026-09-22, cosa-fare.md §0.3). It made "open" structurally impossible to
  say, but a collaborator who knew the hours had nowhere to write them. The
  author relaxed it. Its state values survive as `state`, and its invariant
  survives too, because nothing here can say "open" either.
- **Verified hours with a review cycle** (verification dates, a TTL, staleness
  banners, reminders). Four to five days to build, then an afternoon a year
  for ever, and a chore whose skipping makes the page lie. The rendered date
  gives the reader the same information and asks nothing of us.
- **Mass times as a proxy for opening.** Celebrations are suspended at three of
  the five churches, and the CEI widget would be a third-party request in the
  reader's browser.

## Consequences

- **design.md's entry is amended, not deleted.** It points here, and so does
  itinerari.md's restatement. Its objection, a wrong opening time, still
  holds in full: this ADR stores no times, only a dated sentence that does not
  claim to be current.
- **Being empty is the normal state, not a degraded one.** On the day it ships
  no card has hours, and a year later a few may. Whatever is built on this,
  *Che si fa a Gaeta?* first, must be useful and honest with no row filled,
  and anything whose value depends on the archive being complete is out of
  scope.
- **The closed church is still answered mostly by prose**, which is the spec's
  business, not this ADR's: what to see from outside (*«Se la trovi
  chiusa»*), a standing paragraph that church hours are not kept, and the
  keeper's telephone. A visitor who came to go *in* still may not, and the
  copy must not pretend otherwise.
- **The accepted risk.** An old testimony can still send someone to a shut
  door. What this decision offers against that is the date beside it, the
  telephone number, and *«telefona per sicurezza»*, not a guarantee. That is
  the trade the author chose over leaving the field out.
- **Translations.** The row is the original's, so an English reader sees the
  Italian `hours` text under a translated label and date. Whether `hours` gets
  a per-language copy is left to the translations spec, on the day a
  translated card needs one.
- **Cost.** Half a day to a day for the model, its admin and API fields, the
  form controls and the tests — the estimate is cosa-fare.md §7's. Nothing
  recurs.
