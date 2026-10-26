# ADR-0010: Businesses enter the archive as their own type, on editorial merit

## Status

Accepted. Supersedes the refusal of beach clubs in
[content.md](../spec/content.md) (*luoghi*) and in
[itinerari.md](../spec/itinerari.md) (*Considered and not taken*), answers K5
of [cosa-fare.md](../spec/cosa-fare.md), and amends its CF41. It leaves
design.md's D10 and D12 and cosa-fare.md's CF40 standing: they are the rules
this decision is built on. **Built 2026-10-25** (the review's PR-26): see
content.md, *The ninth type: attività*.

## Date

2026-10-23 — the author's decisions, taken in the interview that followed the
UX/UI review of 2026-10-22 ([../archive/review-2026-10-22.md](../archive/review-2026-10-22.md),
*Decisioni del 23 ottobre 2026*).

## Context

The archive has always listed places and refused businesses. content.md let
the seven beaches in and kept the *stabilimenti* out — *«the archive lists
places, and a stabilimento is a business»* — and itinerari.md refused them a
second time. The only trace of commerce in the data is a ricetta's "sold
here" pins: a coordinate and a label, unranked, and CF36 still forbids reading
them.

Three things pushed against that line:

- **The wizard has no answer to an evening.** The review's study 10 asks a
  guest what they feel like doing. «Bere» had nothing behind it, and
  «Mangiare» sends a guest to a recipe when what they want is a table. A
  drink by the harbour is probably the commonest thing a visitor does in
  Gaeta after dark.
- **The rule was already written for businesses.** design.md's own words are
  about a bakery: *«Presence is earned, not bought. A place that serves typical
  Gaetano food can be in the archive; a place serving American hamburgers
  never will be, at any price.»* D10 asks that a reader can tell *from how the
  page is built* that a listed bakery is there on editorial merit.
- **K5 named the trap.** No principle in the spec admits the trattoria and
  excludes the beach club, so the beach-club refusal could not survive
  restaurants silently. And the cheapest form, a `Ristorante` genre in
  `luoghi`, is one Django admin form that disarms the closed list content.md
  uses to justify `luoghi` at all.

## Decision

**Businesses are a type of their own, `attivita`, with a closed `kind`:**
*dove si beve*, *dove si mangia* and *dove si compra*. The last covers the
bottega and the bakery that sell typical products to take away, with nowhere
to sit. The three kinds live in code, not in an admin-managed table, so a
fourth (a chain, a beach club "as such") needs a PR and a spec edit, never a
form.

**Who enters is the editors' call, on merit, and recent places count.** The
author's words: a place that opened a year ago with a concept worth knowing
can enter, and the editors may leave out a place of poor standard. The test is
*worth knowing in Gaeta*, not age and not price. *Considered and rejected:* a
"historic places only" criterion, which the author turned down because it
would exclude exactly the new place a guest wants to find.

**A beach club is a business like any other, and the beach belongs to no
one.** A *lido* can enter as an `attivita` through its bar or its kitchen,
on the same merit. The beach is the land, public, and stays a `luoghi` card of
genre *spiaggia*. That card never presents the beach as belonging to a lido,
and never lists the lidi as its parts. They are near it, and the map and the
zones show what is near what by position, as for every other card.

**Presence is never bought, and the archive never ranks businesses.** D10 and
D12 are unchanged: no paid entry, no sponsored badge, no ad slot. CF40 holds
for this type more than for any other: where a set has more than one
business, it shows all of them, alphabetically, and says so. *L'archivio
sceglie tra luoghi, mai tra attività* now constrains a type that exists.

**What an `attivita` carries** is a luogo's shape plus its kind:
- one pin, `max_points=1`;
- `how_to_get_there`;
- the card's rich-text body, which is where the editorial reason for its
  presence is written;
- opening hours as dated testimony
  ([ADR-0008](./0008-opening-hours-as-dated-testimony.md): free text, the
  server-set date always shown, never "open now", never a filter).

It gets its own map layer and therefore its own text list (C5's rule). It also
has a place in the *Esplora* menu and on *Il progetto*: content.md's "two
lists" rule. It is translated like every other card. Everything else is left
to the build, under the constraints above.

**Where the reader meets it.** The wizard's «Bere» leads to *dove si beve*.
«Mangiare» shows *dove si mangia* beside the ricette, not instead of them: a
dish and a door are different answers. An event can be held at an `attivita`
card (cosa-fare.md D9), which is what CF41's business-name rule was waiting
for.

## Alternatives considered

- **A genre (or three) inside `luoghi`.** An afternoon's work, with pin, hours
  and `how_to_get_there` already there. Rejected: it mixes businesses with
  beaches and monuments in the zone counts and the places list. It gives a bar
  and a castle one colour and one rule of entry when they have different ones.
  And a genre is added from Django admin, which is K5's trap.
- **Three separate types** (bar, restaurant, shop), each with fields of its
  own: a typical menu, products. The most expensive, for differences nobody has
  yet asked to model.
- **Drinks as recipes.** «Bere» would lead to the liqueur and the coffee, with
  their "sold here" pins. Nearly free, and it answers the wrong question:
  someone who wants a drink is looking for a door, not a preparation.
- **Leaving «Bere» out.** The option would simply not appear in the wizard.
  The author chose to decide it instead.

## Consequences

- content.md's *«No beach clubs»* sentence and itinerari.md's *Considered and
  not taken* entry carry a dated note pointing here. They are superseded, not
  deleted.
- cosa-fare.md K5 is answered, and CF41 is amended: an event's venue may be an
  `attivita` card. A business name then appears in the structured field,
  because the business is a card on its own merit.
- A ricetta's "sold here" pins and the *dove si compra* kind now describe the
  same doors twice. Whether a pin becomes a link to an `attivita` card is left
  open: CF36 still forbids reading those pins, and nothing here changes that.
- It is specified, not built. The build is the review's PR-26, queued with
  the other prompts. The type follows ADR-0004 ("days, not weeks") and
  ADR-0008, and adds a layer token checked against D9 like every other.
  *(Built 2026-10-25, in one sitting: an `attivita` app in luoghi's shape, a
  teal layer, «Bere» seeded as an intent, and `maps.CARD_TYPES` split from
  `maps.STOP_TYPES` so a business is on the map and never a tour's stop. What
  "left to the build" became — the printed order, hours and nothing else, a
  zone's count that leaves businesses out — is in content.md's section on
  the type and cosa-fare.md's note of that date.)*
- The risk that does not go away is editorial. Merit without a published test
  can look like preference to a business that was left out. The defence is the
  one CF40 already names: the archive states what is worth knowing and never
  what is best, and its order is printed.
