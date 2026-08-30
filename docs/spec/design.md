# Design — visual and experiential direction

> **To build.** Roadmap item 1, active since 2026-08-27.
>
> Provenance: the confirmed output of an intent interview with the author on
> 2026-08-27, the same way the v2 spec itself was produced. Where a section
> records a bet rather than an observed need, it says so.
>
> This file is about *how the product presents itself*. It adds no features.
> Where it touches something that would be a feature, it says so and sends it
> to the roadmap instead of smuggling it in.

## Why this exists

Every feature in the v2 spec is built and tested. **None of it has been
designed.** Every view is default Tailwind panels in a two-column desktop grid,
the brand is a purple gradient that was a placeholder, and nothing has ever
been opened on a phone on purpose.

The audience the product bets on — tourists — is precisely the audience that
would notice first.

## The two audiences, and which one wins

The product serves two people with opposite postures, and the whole of this
document follows from that:

| | **The reader** | **The collaborator** |
|---|---|---|
| Who | a tourist, logged out; also the Gaetano abroad who wants to relive the place | a Gaetano who writes, logged in |
| Where | standing somewhere, or sitting with a phone | at a desk, with a keyboard |
| Doing | *knowing* the city | *contributing* to it |
| Priority | **primary** | secondary |

**D1 — When the two conflict, the reader wins.** Not because the collaborator
matters less — nothing exists without them — but because the reader is the one
the product is *for*, and the one who arrives with no patience and no account.

**D2 — Mobile-first for the logged-out reader; desktop-first for the logged-in
collaborator.** These are different centres of gravity, not one responsive
layout stretched to cover both. Writing a card is a desk activity: it wants a
keyboard, a wide editor, an image tray. Reading about a church is a
one-handed activity. The collaborator's screens must *work* on a phone; they
do not have to be good there.

Note what this is not: two codebases, or a device sniff. It is one app whose
reading surfaces are designed small-first and whose authoring surfaces are
designed large-first.

## Not a wayfinding app

Worth stating because it decides what the design is *not* competing with:
**Google Maps is for going somewhere; Vivere Gaeta is for knowing the place.**
A tourist who wants directions already has an app. The moment this product owns
is the other one — standing in front of a church that is closed, sitting at a
bar in the evening, or living abroad and wanting to reread a story about home.

That is why the map is an index of what has a place, not a navigator, and why
geolocation is a later phase (see Non-goals) rather than the centre of this one.

## Requirements

### The reader's home (mobile)

- **D3 — The map fills the screen; content sits over it.** The logged-out
  home on a phone is the map full-bleed, with a draggable bottom sheet that
  **opens already showing cards** — cover image, title, type. Dragged up it
  becomes a list you read; pushed down it becomes a map you explore. Neither
  mode requires guessing where to tap.

  The reasoning, both ways: if the first screen were a list of articles, this
  would be a blog with a map hidden in a tab, and [map.md](./map.md) M1 decided
  the opposite. But a bare map of dots is a poor invitation to *read*, and the
  Gaetano abroad has no reason to look at a map at all. The sheet serves both
  without asking anyone to pick a tab.

- **D4 — The map chrome lands here.** C5 deliberately did not build M1's
  "minimal top menu" as a chrome redesign — layer toggles live in a side panel
  and the nav kept C3's `SchedeMenu`. The full-bleed map with floating controls
  is a design decision, and this is where it is taken.

- **D5 — Cards have a cover.** The **first image of a card is its cover** — no
  new field, no migration. A mobile list of bare titles is dreary, and every
  card type already has an ordered image gallery.

### The register

- **D6 — A cultural magazine: warm, but sober.** Typography-led, large
  photography, generous space. Not a tourist brochure (saturated colours,
  badges, exclamation marks) — that would cheapen the content and sit badly
  next to a municipal endorsement. Not a museum archive either: correct,
  unimpeachable, and opened by nobody. The primary reader is a tourist, not a
  researcher.

  **The type, chosen 2026-08-30: one family, Archivo, and no display serif.**
  Three systems were drawn on the same card and weighed — literally: an
  all-serif reading direction at 118 KB, a serif-headline magazine split at
  157 KB, and this one at **34 KB**, a third of the lightest alternative. The
  primary reader is on a phone, and the phone won.

  That choice moves a load-bearing requirement rather than removing it: with
  no serif to carry the voice, **the register has to come from the scale, the
  weights and the measure** — a tight, heavy display step, a real size jump
  between it and body copy, and reading text kept near 65 characters at a
  line-height a sans needs (1.65) so it does not read as an interface. Those
  are tokens (`--text-display`, `--text-title`, `--text-reading`), not values
  per component, for the same reason colours are. If the result ever reads as
  "an app" rather than an archive, that is the knob to turn — not the font.

- **D6b — Fonts are served from our own origin, never from a third party.**
  Not a preference: TD-30 removed the picsum avatar because it "leaks visitor
  IPs and referrers to a third party on every page view", and
  [accounts.md](./accounts.md) A1 declined a third-party CAPTCHA "consistent
  with TD-30". A webfont linked from Google Fonts would put back exactly what
  those two decisions took out. The app ships one `@font-face` and one file —
  the latin subset, because the content is Italian — rather than
  `@fontsource`'s own stylesheet, which carries three subsets of which a
  browser rendering Italian fetches one and leaves two in `dist/` forever.

- **D7 — The palette comes from Gaeta**: stone, sea, terracotta, lime white.
  **Chosen 2026-08-27: "Pietra e mare"** — warm paper ground (`#faf7f2`), deep
  Tyrrhenian as the single accent (`#0f5f73`), terracotta secondary
  (`#9c4221`), ink `#1f2933`. The values live in
  `frontend/src/assets/main.css`; this file records the direction, not the
  hexes. Two alternatives were drawn and rejected: a terracotta-accent
  direction, because its accent and the *feste* layer colour were near-
  identical and the brand ended up looking like a data value; and a
  white-and-ink one, correct but anonymous until real photography exists.
  **The purple is retired** — `SiteTitle.vue`'s gradient was a default that
  survived by inertia, and it is also the single most recognisable "generated
  by an AI" tell in the interface (impeccable has flagged it since the plugin
  was installed; it was kept because it was the M4 brand, not because it was
  chosen). The map layer colours stay the one saturated register in the
  product, because there they do work: they distinguish.

- **D8 — Colour lives in tokens, never in a component.** Every colour is a
  named custom property (`--stone`, `--sea`, …) that components read. Today
  hex values are scattered by hand through `lib/reportStatus.ts`,
  `lib/mapLayers.ts` and Tailwind classes across the tree; that is fixed in
  this pass regardless of anything else.

  It is also what makes the author's larger ambition possible without a second
  redesign — see Non-goals: multi-city.

- **D9 — Contrast is a gate, not a preference.** WCAG 2.1 AA, whole app
  ([../adr/0005-wcag-2.1-aa-accessibility-bar.md](../adr/0005-wcag-2.1-aa-accessibility-bar.md)):
  a palette that does not clear 4.5:1 for its text pairings is not a candidate,
  however good it looks. Check with the relative-luminance formula, not by eye —
  `lib/reportStatus.ts` already carries a comment listing the shades this ruled
  out once.

  Checking the first palette turned up a distinction worth keeping: **there are
  two border tokens, not one.** WCAG 1.4.11 asks 3:1 only of boundaries that
  *identify a control* — an input's outline qualifies, a decorative hairline
  between panels does not. A single `border` token cannot honestly be both, so
  the palette has `hairline` (decorative, exempt) and `field` (control
  outlines, ≥3:1 against both grounds).

### Patronage and sponsors

The author expects municipal patronage first, and later contributions from
local businesses — the bakery, the bottega. Both are governed by one editorial
rule, stated by the author and load-bearing for the design:

> **Presence is earned, not bought.** A place that serves typical Gaetano food
> can be in the archive; a place serving American hamburgers never will be,
> at any price. Cultural heritage comes before the money.

- **D10 — The design must make that visible.** A reader has to be able to tell,
  *from how the page is built*, that a listed bakery is there on editorial
  merit. A "sponsored" badge stuck on afterwards does the opposite — it tells
  the reader the opposite of the truth about how this archive works.
- **D11 — Institutional endorsement gets a dignified, fixed place** (a footer
  or credits surface), not a banner.
- **D12 — No ad slots.** Nothing in the layout is a rectangle waiting to be
  sold.

This reverses nothing in the spec's non-goals: there is still no commerce, no
booking, no payment. It reserves a shape, so that the day it is needed the
answer is not a redesign.

## Success

- A tourist at a bar opens the site on a phone, understands within five seconds
  what it is, and starts reading a story without having to work out an
  interface.
- A Gaetano at a laptop writes a card without fighting the form.

## Non-goals of this phase

- **Geolocation** — "you are here" plus what is around you. It genuinely fits
  the product and the author wants it, but it is a **feature, not a style**:
  browser permission, HTTPS (so it touches deployment), sane handling of a
  denied permission and of GPS that is 50 m wrong inside the old town, and a
  spatial endpoint (`/api/map/features/` returns everything, unfiltered). It
  gets its own phase and its own spec section.
- **The multi-city superadmin.** The author's larger ambition is to offer this
  to other towns once Gaeta is the worked example — which implies an admin who
  can change palette, name and city centre. **This phase does not build it; D8
  makes it possible without redoing the design.** Note the other things hard-
  coded to Gaeta today, for whoever picks that phase up: the map centre in
  `composables/useLeafletMap.ts` and `GaetaMap.vue`, the product name, and an
  Italian-only UI.
- **New content features**, deployment, and anything already listed in the v2
  spec's non-goals.

## Open questions

1. ~~The palette's actual values.~~ **Answered 2026-08-27** — "Pietra e mare"
   (D7), every pair checked against D9 with the relative-luminance formula
   before anything was built on it, and landed as tokens.
2. ~~Typography: which faces, and whether a display face for titles is worth
   the loading cost on a phone.~~ **Answered 2026-08-30** — no display face;
   one sans (Archivo, 34 KB, self-hosted) and a type scale that does the work
   a serif would have done. See D6/D6b.
3. Whether the collaborator's authoring screens are restyled in the same pass
   or the one after. They are the secondary audience, and the reader's surfaces
   are where the bet is won.
4. Whether the bottom sheet (D3) has a desktop counterpart or the wide layout
   keeps a side panel.
