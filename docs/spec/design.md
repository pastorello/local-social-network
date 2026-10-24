# Design — visual and experiential direction

> **Built.** Roadmap item 1, 2026-08-27 to 2026-08-31. What the pass
> covered and what it deliberately left in its v1 clothes is recorded at the
> foot of this file; the requirements below are what it was measured against.
>
> Provenance: the confirmed output of an intent interview with the author on
> 2026-08-27, the same way the v2 spec itself was produced. Where a section
> records a bet rather than an observed need, it says so.
>
> This file is about *how the product presents itself*. It adds no features.
> Where it touches something that would be a feature, it says so and sends it
> to the roadmap instead of smuggling it in.
>
> **Reopened 2026-09-11 — the layout, not the register.** A brainstorming
> session with the author decided that the map becomes the ground of every
> page and that every page opens over it as a panel: D13–D21, in
> [The map under every page](#the-map-under-every-page) at the foot of this
> file. They were **built on 2026-09-18** ("What the first build decided" and
> the three sections after it); where they overturn a requirement above them,
> they are what the app does. The palette, the type and the
> tokens (D6–D9) are untouched. A requirement that D13–D21 overturn keeps its
> text and gains a dated note naming what replaced it, so the reasoning that
> was overturned stays readable.

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

  **Amended 2026-09-11 by D18:** the home keeps this sheet, but a *card*
  opened on a phone no longer lives in it — it opens full screen, with a strip
  of the map at its head.

  **Amended 2026-10-23 — the home says what it is** (review of 2026-10-22,
  P-02/M-02, PR-2). The sheet opened on «Luoghi sulla mappa · N schede», which
  tells a reader from a search engine nothing about the site, and that reader
  never sees `/benvenuto`. Both homes now lead with one line, «Gaeta raccontata
  da chi ci vive: luoghi, chiese, feste, ricette, itinerari.» (a constant in
  `definitions/copy.ts`, so `/benvenuto` and the archive line can say it the
  same way later), and under it two compact links: *Che cosa ti va di fare?*
  → `/benvenuto` and *Cosa c'è in una zona* → `/cosa-fare`. Each appears only
  under the rule `/benvenuto` already applied — an intent with a published
  tour; a zone with a published place (cosa-fare.md D8) — and both pages now
  read it from one place, `lib/doors.ts`, so an empty archive promises
  nothing on either. The second line of each names what is behind it (the
  first two intents or zones that pass the rule), never a fixed list. On a
  phone the order inside the sheet is the line, the two links, then the places
  under their own *Luoghi sulla mappa* heading: at the first stop all three
  are in view and the first card still shows, so D3's "opens already
  showing cards" holds; at the lowest stop what shows is the line. The sheet's
  handle no longer carries a title — it is the grab bar, a 32 px button that
  still cycles the stops (D20's list stays in the sheet, one drag or one tap
  away). The wide column keeps *La mappa di Gaeta* as its h1, with the line
  and the links above the layers. **Left to the build, and decided:** the
  line paints with the page, and everything under it that comes from the API
  — the links, the layers, the lists — is drawn in one piece once the two
  links are known, because links arriving above content already on screen
  would push it down (the Lighthouse gate holds CLS to 0.1). A bridge, not
  the end state: the wizard decided on 2026-10-22 (review proposal 1, PR-21)
  absorbs the two links into its first question; the line stays.

  *Amended 2026-10-23 — the handle says that it drags* (review PR-15,
  M-11). The grab bar is a 44 px target across the sheet, named «Trascina
  per vedere più mappa», and the first time in a session a line under it
  says so until the reader drags; the lowest stop grew with the handle, to
  6.375 rem, so it still shows the line. See "The map's corners and the sheet's handle
  — 2026-10-23" at the end of "The map under every page".

- **D4 — The map chrome lands here.** C5 deliberately did not build M1's
  "minimal top menu" as a chrome redesign — layer toggles live in a side panel
  and the nav kept C3's `SchedeMenu`. The full-bleed map with floating controls
  is a design decision, and this is where it is taken.

  **Superseded 2026-09-11 by D13/D14:** M1's minimal top menu is now taken
  literally — one menu at the top centre of every page, the layer controls
  floating over a map that is under every page, not only the home.

- **D5 — Cards have a cover.** The **first image of a card is its cover** — no
  new field, no migration. A mobile list of bare titles is dreary, and every
  card type already has an ordered image gallery.

  **Made operable 2026-09-07.** "First" was a rule the author could not act on:
  the form showed the images in whatever order the file picker returned them,
  with nothing saying which one the reader would meet first and no way to
  change it short of removing them all and starting again — found by writing a
  real card rather than by reading the code. The images row is now one ordered
  strip, the first thumbnail says *Copertina*, and each can be moved with
  buttons (not only by dragging, which ADR-0005 would not accept as the sole
  gesture).

  **Amended 2026-10-23 — the card without a cover is drawn** (review of
  2026-10-22, L-03/M-05/A-06/L-01, PR-6). The archive starts without
  photographs — its images are the ones collaborators take, and nothing found
  on the web comes with its rights ([content.md](./content.md)) — so the card
  with no cover is the state most readers meet first, and it had not been
  designed: a saturated square per row in the home's list, an empty block of
  170–240 px per card in the grids, titles broken one word per line, and on a
  phone `/luoghi` a column of pink rectangles with the first title under the
  fold. Now every list has one placeholder,
  `components/content/CoverPlaceholder.vue`: a pale tint of the layer's colour
  (18 % over the page ground, `color-mix` on the token itself through
  `lib/mapLayers.ts::layerVar` — never a hex, D8) with the type's icon in the
  full colour, a thin stroke that names the type without shouting it (D7). In
  the grids (`CardGrid.vue`) a card without a cover is a 96 px band over its
  title on a wide screen and, under 640 px, a row — the 48 px placeholder
  beside the title — so a phone shows four places on its first screen rather
  than one rectangle; the home's list (`PlacesList.vue`) uses the same 48 px
  placeholder. A card with a cover keeps its cover card, its image capped at
  160 px on a phone. Columns are never narrower than 260 px — they fill the
  panel rather than follow a breakpoint, because the panel is what is narrow,
  not the window — titles wrap `pretty` and stop at two lines with an ellipsis,
  one step below the title token, and the line under the title says where the
  card is: «Zona · Genere», the zone by name from the payload (chiese and
  luoghi carry it since review PR-3; the other types keep their own summary,
  and a tour's zones are slugs, so it keeps «durata · tappe»). Under 640 px the
  genre chips are one row that scrolls, as on `/cosa-fare`. **Left to the
  build, and decided:** the title's size, cap and wrapping apply to every card,
  cover or not, since a row holding both at two sizes would read as a mistake;
  in a grid a title always holds two lines, so every card without a cover is
  the same height and the lines under the titles align across a row; in a row
  where one card has a photograph, the band of a card without one grows to the
  photograph's height instead of leaving a gap under its text, and is 96 px
  wherever nothing asks it to grow; a type with no map layer (itinerari,
  dialetto, libri) gets the unknown grey, as its pin would; the phone row
  keeps the card's border, so a list where some cards have photographs and
  some do not still reads as one list. `seed_e2e` gained a published beach in
  Serapo so that the a11y gate measures `/luoghi` in both layouts.

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

  **The toast, the wordmark and the close button — 2026-10-23** (review of
  2026-10-22, PR-8: A-01, A-02, L-10, A-04). Three things an automated gate
  had passed and a reader had not:
  - **The toast has a pair of its own**, `--color-toast-bg` and
    `--color-toast-fg` in `main.css` (the review's `--toast-bg`/`--toast-fg`,
    with the `--color-` every colour token carries, so Tailwind makes
    `bg-toast-bg`/`text-toast-fg` of them): ink and white, the dark surface
    the map's editing banner already wears, 14.76:1. A unit test measures it
    with the relative-luminance formula, which moved out of a test into
    `lib/tokens.ts::contrastRatio` so the eyebrow's tints and the toast are
    checked by one implementation. It sits under the pill in the middle, at
    most 480 px wide, transparent to the pointer — no longer in the
    bottom-right corner, out of sight of a panel open in the centre.
  - **Decided by the build:** one pair for every toast, a success or a
    failure. The green and the pink it replaces were Tailwind's, not the
    palette's (D7), the pink was the failing pair, and the words already say
    which it is (WCAG 1.4.1) — so `showToast(ms, message)` no longer takes
    classes from its caller. Its `role="status"` region is always in the
    document and only the words come and go, because a live region that
    arrives together with its message is one a screen reader can miss. It
    enters with a 200 ms slide that reduced motion turns off, and the a11y
    gate measures it once that is over, as it does the wordmark.
  - **The wordmark is named**, «Vivere Gaeta — torna alla mappa»: a screen
    reader had it as «ivere aeta». The visible words come first, so a
    speech-input user can say what they see (WCAG 2.5.3). The initials are
    plain spans set apart by colour alone, as the review asked, so they are
    no longer a size larger than the rest. A unit test computes the name with
    axe-core, the gate's own engine.
  - **The close button says that Escape is the same thing**: `title="Chiudi
    (Esc)"` for the pointer, `aria-keyshortcuts="Escape"` for a screen
    reader. The *Indietro* beside it is not built — up is that ("Close, up,
    back").
  - **Found on the way:** the a11y gate's contrast rule had not been
    running on any page over the map — Leaflet's tile blend mode made axe
    skip it without a word. It runs again, every page was already clean, and
    a case fails if it stops; [ADR-0005](../adr/0005-wcag-2.1-aa-accessibility-bar.md)
    records it. Until then this D9 was kept by the unit tests and by hand,
    not by the gate.

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
  *(2026-10-23: the listed bakery now has a type, `attivita`, with three closed
  kinds, admitted on the editors' merit and never ranked:
  [ADR-0010](../adr/0010-businesses-in-the-archive.md).)*
- **D11 — Institutional endorsement gets a dignified, fixed place** (a footer
  or credits surface), not a banner.

  **Built 2026-08-31**: `components/AppFooter.vue`, mounted by the shell on
  every route whose `meta.fullBleed` is not set. The map home is the one
  exception, and it is a layout fact rather than an oversight — D3 says that
  screen is the map filling the viewport, and a footer appended under it would
  make the one page that must not scroll, scroll. The credits region carries
  the editorial rule in the reader's own words ("nessuna presenza è
  acquistata") and reserves the place a patrocinio goes when one exists. It
  does **not** carry an invented endorsement: there is no municipal patronage
  today, and a placeholder logo would be the product claiming something that
  is not true.

  **Moved 2026-09-11 by D21:** with the map under every page there is no
  route left for a footer to sit on, so the credits surface becomes
  *Il progetto*. The rule above — dignified, fixed, no invented endorsement —
  moves with it unchanged.
- **D12 — No ad slots.** Nothing in the layout is a rectangle waiting to be
  sold. *(2026-10-23, cosa-fare.md Part −1 D9: an event's own poster is not an
  ad slot. It is the event's information, optional and zoomable. D12 still
  governs the layout and the businesses themselves.)*

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
  Italian-only UI. *(Since 2026-09-18 `useLeafletMap` is gone (D19); the
  frontend's centre is in `GaetaMap.vue` alone, the backend's in settings —
  see roadmap item 5.)*
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
3. ~~Whether the collaborator's authoring screens are restyled in the same pass
   or the one after.~~ **Answered 2026-08-30: in this pass**, after the
   reader's surfaces. Desktop-first, per D2: the forms are grouped into
   sections (Contenuto / Immagini / Mappa / Pubblicazione) rather than one
   long stack, because writing a card and giving it a place are different
   jobs and a wide screen has room to say so. The restyle also carried two of
   ADR-0005's deferred items — see its 2026-08-30 update. The auth and profile
   forms are *not* included: they are neither reading nor authoring, and they
   still use the older label pattern.
4. ~~Whether the bottom sheet (D3) has a desktop counterpart or the wide
   layout keeps a side panel.~~ **Answered 2026-08-30**: the wide layout keeps
   the side panel. The two are switched in JS at 1024px rather than with
   `lg:hidden` on both, so only one is ever in the DOM — two copies of the
   layer controls would mean two elements with the same `id`, which breaks the
   `for`/`id` pairing ADR-0005 requires, and would mount two Leaflet maps.
   **Superseded 2026-09-11 by D15/D17:** panels over the map, not a panel
   beside it. The reason for switching in JS survives and gets stronger — see
   D13.

## What the pass covered, and what it left — 2026-08-31

Recorded here rather than in a commit message, because "is this screen
designed?" is a question the next person will ask of a file, not of a log.

**Covered:** the palette and the type as tokens (D6-D9); the reader's home in
both layouts (D3/D4); the card as an article and the lists as a grid of covers
(D5/D6); the collaborator's authoring forms (D2, open question 3); the site
footer (D11); and `ReportDetailView` — a v1 screen, redrawn because a pin on
the redesigned home pushes straight to it, so leaving it would have handed the
reader a designed page and then a 2026-M1 one in a single click.

**Left in its v1 clothes, on purpose:**

- **`/polls`, `/users`, `/profile`.** They took the colour sweep and nothing
  more. None is on the reader's path: no pin leads to them, and the v2 spec's
  non-goals already say there is no new work on polls. The tourist the bet is
  about never sees them.
- **The auth and profile forms** (open question 3's answer, unchanged), and
  **`ReportForm`** with them. The report form is shared with the home's filing
  flow, so restyling it is a change to the map home rather than to a form —
  a bigger blast radius than this pass's last commit should carry.

Both are deliberate scope, not debt to be paid quietly by whoever passes next:
redrawing them is a decision to take, and the reason to take it would be a new
one (they became part of the reader's path), not tidiness.

**2026-09-11:** D17 gives that reason — every one of these screens becomes a
panel over the map, so each gets at least the wide panel's frame. How much
more than the frame is a decision for the build (see below).

### The account forms in one column — 2026-10-23

The review of 2026-10-22 (PR-11: L-09, A-03) found `/login` drawn as two
boxes in the wide panel: «Accedi» on the left with 350px of nothing under
three lines, the form on the right. Every account form had that shape, and
the profile page a narrower version of it. It is
the first page a collaborator sees, so the author took the decision this
section said was one to take. Built the next day:

- **One box, centred, no wider than 420px** (`components/boxes/AccountColumn.vue`):
  the title, what the page is for, the fields, and under them, past a
  hairline, the way to the page beside it — «Vuoi collaborare? Scrivici» on
  the login, «Hai già un account? Accedi» on *Collabora*, *Cambia password*
  and back on the profile's two forms. The profile page wears it too (see
  below). On a phone the box is the panel's
  width. The panel around it is still the wide one (D17): the box changed,
  not the frame.
- **One pattern for label and field**, the writing forms' own: `FormField`
  with `FormInput`, the label above the field, and a placeholder only where
  it says something the label does not («Il tuo nome completo», «Chi sei e
  perché vuoi collaborare»). The ones that repeated their label («La tua
  e-mail», «La tua password») are gone. Validation stays attributed to its
  field, what has no field stays in `FormErrors`, and the login's answer
  stays vague on purpose.
- **Every field names its purpose** (WCAG 1.3.5, inside ADR-0005's bar):
  `username` and `current-password` on the login; `username` on *Password
  dimenticata*, where the address asked for is the account's name;
  `new-password` on the invite and the reset; `current-password` and
  `new-password` on *Cambia password*; `name` and `email` on *Collabora* and
  *Modifica profilo*. The honeypot keeps `off`.
- **Decided by the build**, since the review left them open:
  - **"/profile" is the profile's two forms**, `/profile/edit` and
    `/profile/edit/password`, which had the login's two-box shape, **and
    the profile page**, `/profile/:id`. That one was added the same day,
    on the author's report: in a quarter of the wide panel (about 170px)
    the fixed 200px avatar and the display-size name ran out of their
    column and under the reports beside it. Now the face, the name, the
    count and *Modifica profilo* head the same column, the reports under
    them past a hairline; the avatar is never wider than the box and the
    name wraps. `a11y.cy.ts` measures it at 1440, 1024 and 390px (WCAG
    1.4.10): nothing in the column leaves it, nothing scrolls sideways.
  - **The invite and the reset forms join them**, though the prompt names
    neither: they are the pages a link opens after *Password dimenticata*
    and after the author's approval, and leaving them in two boxes would
    have kept two patterns where the prompt asked for one.
  - **«Bentornato!» is gone from the login**: the prompt lists the title, the
    fields and the two links, and nothing else.
  - **Once a reset link is requested, the page says only that**: the
    instructions above the field leave with the field.
  - **What the browser fills in stays visible.** A-03 asked whether to hide
    an autofilled address until the field has focus, since Chrome ignores
    `autocomplete="off"`. Not built: a form that shows less than it will
    send is the worse fault, and on a shared computer the address is the
    browser profile's to forget, which the page cannot do for it. Hiding it
    would be a decision of its own, for the author. *(Confirmed by the author
    on 2026-10-23: it stays visible, nothing to build.)*

## The map under every page

> **Decided 2026-09-11. Built 2026-09-18**, all of it, in four steps — see
> "What the first build decided", "The menu, the list, the credits", "The
> phone's strip" and "The map as the editor" at the end of this section. The confirmed output of a brainstorming
> session with the author, produced the way the rest of this file was: one
> question at a time, a committed guess and the strongest case against it.
> Each requirement below records the counter-case that lost, because that is
> the part a later reader needs when the question comes back. The screens were
> drawn on a canvas the author holds (desktop and phone, one note per
> decision); this section is the authority, the drawing is an illustration.

### Why this exists

The design pass gave the reader a map home and gave every other screen a page
of its own. The author's proposal reverses that proportion: **the map is the
ground of the whole site, and every page is something that opens over it and
closes back onto it.** It is the product's thesis made literal — this is a
map-archive, so the reader never leaves the map.

The inspiration was a Venice Biennale exhibitions map the author was shown,
with a tour planner. Its tour idea is taken, as its own phase (below); its
opening-hours filter is not.

### What this amends

| Was | Becomes |
|---|---|
| **D3** — mobile home: full-bleed map + bottom sheet | Kept for the home. A card opened on a phone no longer lives in the sheet (D18). |
| **D4** — floating chrome on mobile, side panel on desktop | One menu at the top centre of every page, layer controls floating over the map (D13, D14). |
| **D11** — credits in a footer on every route but the map | No route is without the map, so there is no footer; the credits move to *Il progetto* (D21). |
| **Open question 4** — the wide layout keeps a side panel | Panels over the map (D15, D17). |
| **D2** — the collaborator's wide editor | Still desktop-first, but the form sits in a panel and the map it draws on is the real one (D19). |

### Requirements

- **D13 — The map is the ground of every page.** One map, mounted by the
  shell rather than by `HomeView`, and every route renders over it; the layer
  state moves up with it. There is still exactly one Leaflet map in the
  document at any time — the reason `HomeView` switches its two layouts in JS
  today holds more strongly, not less.

  *Known cost, accepted:* Leaflet and its tiles now load on every route,
  including `/login` and a phone opening a shared article cold. Measure it on
  the preview build before calling the phase done.

  *Amended 2026-10-23 — the panel closes, it does not go back: close, up,
  back.* A page over the map is closed onto the map, in one press, from
  wherever the reader is; going one level up is a link of its own; the
  browser's Back is left to the history. See "Close, up, back — 2026-10-23"
  at the end of this section.

- **D14 — A minimal menu, top centre.** The wordmark, *Mappa*, *Schede*,
  *Il progetto*, then *Accedi* (or the collaborator's avatar). *Itinerario*
  is added by its own phase and not before: an empty menu item at launch is
  worse than none. **The polls leave the top level** and are reached from
  *Il progetto* — the v2 spec already says there is no new work on them.
  *(2026-10-24, review PR-17: the polls are for someone signed in —
  [reports-and-polls.md](./reports-and-polls.md) P1 — so they are reached
  from the account menu, after *Le mie schede*, and from *Il progetto*'s
  *Partecipa*, which shows the link to them alone.)*
  **No search in this phase:** it was drawn and dropped, because search is a
  feature with an endpoint of its own, not a place in a menu.
  **2026-09-11:** the reserved item arrives as *Itinerari*, plural — curated
  tours ([itinerari.md](./itinerari.md) I11). The same session put a *Luoghi*
  heading into the reader's grouping of card types (content.md, luoghi).

  *Amended 2026-10-23 — the eyebrow, the current item, the window's title,
  and «Esplora».* *Schede* is renamed *Esplora*: it is the name of our data
  model, not a word a guest uses. Every panel opens on an eyebrow that says
  where the reader is — up, and what the page is within it, «Chiese · Gaeta
  Medievale» — the pill marks the item above the page as current, and the
  window's title names the page. See "Where the reader is — 2026-10-23" at
  the end of this section.

- **D15 — Every page is a panel over the map, and keeps its URL.** A shared
  link to `/feste/:id` opens the map *and* the panel. Back and Escape close
  the panel, and focus returns to whatever opened it. A panel is a dialog for
  ADR-0005's purposes: focus management, one `<h1>` per panel, and the skip
  link retargeted at the panel's content rather than at a `<main>` that no
  longer frames the page.

  *Amended 2026-10-23:* Escape, the close button and a tap on the veil close
  onto the map; Back is the browser's history, which the app does not
  imitate — it closes a panel only when the step before was the map. See
  "Close, up, back — 2026-10-23".

  *Amended 2026-10-24 — a card says how to share it* (review PR-16). The
  link D15 makes work is now one press away: «Condividi» beside the byline
  of a card, a festa and a tour, and on a stop of a guided tour. See
  "Sharing a card — 2026-10-24" at the end of this section.

- **D16 — The map reacts.** Opening a card that has a place moves the map so
  the place sits in the space the panel leaves free — never under it —
  highlights its pins or its route, and dims everything else. Closing returns
  the map to where the reader left it.

  *Counter-case, rejected:* the map as a backdrop only. Cheaper, but then the
  map under every page is decoration for most of the site, paid for in bytes
  on every route.

  *Amended 2026-10-23:* one place is framed at zoom 16, not as close as the
  map goes, and the home frames Gaeta in its own free space — see "How the
  map frames — 2026-10-23" at the end of this section.

  *Amended 2026-10-23 — the panel closes, it does not go back: close, up,
  back.* Closing no longer returns the map to where the reader left it: the
  map stays where the page put it — the place, the tour's last stop, the
  zone — at the same zoom, with every card drawn again. Nothing flies back to
  Gaeta. See "Close, up, back — 2026-10-23".

- **D17 — Two panel shapes on desktop.** A **narrow panel on the right** for
  a card with a place, because the map beside it is doing work. A **wide
  reading panel, centred, over a veiled map** for a card without one
  (dialetto, libri) and for every page without one (*Il progetto*, sign-in,
  polls, profile).

  *Counter-case, rejected:* one shape for everything, the map veiled when it
  has nothing to show. Simpler and more predictable, but it puts a book in a
  side column beside a map that has nothing to say about it. Reading wants
  the space.

  *Amended 2026-10-23 — the card decides, not its type.* A card of a type
  with a place that has none — a ricetta sold nowhere, a personaggio with
  nothing on the map, a luogo still a draft without its pin, a festa whose
  procession nobody has drawn — is read like a book: the wide panel over a
  veiled map, and on a phone the whole screen with no strip (D18). The
  type's route still says narrow; the card overrules it, and the panel is
  born in the card's shape rather than changing it in front of the reader.
  See "The card decides its panel — 2026-10-23" at the end of this section.

  *Amended 2026-10-23 — a third shape, the editor* (decided by the author
  on 2026-10-22; review PR-13). Every form that writes a card — the
  `/…/nuovo` pages, and a card's own form, which opens in place on its
  page — opens in a panel as wide as the reading panel (808 px) but
  anchored on the right like the narrow one, beside a live map that is not
  veiled, because the map is what the form draws on (D19). Below 1280 px it
  is the narrow panel's 560 px. The types with no place are written in it
  too: one shape for writing. See "The collaborator's desk — 2026-10-23" at
  the end of this section.

- **D18 — On a phone, a card opens full screen.** A strip of the map (about
  180 px) at the head of the article is already centred on the place;
  tapping it expands the map to the whole screen, with *Torna alla scheda* to
  come back. The strip is **the same map instance, resized** — not a second
  map. The **cover moves below the title** on a phone, so the strip and the
  cover do not stack and push the title to mid-screen (D5's rule, that the
  first image is the cover, is unchanged; only its position moves). The
  home's sheet (D3) is unchanged.

  *Counter-case, rejected:* opening at half height with the reacting map
  visible above. It costs every reader a drag on every card to show a map
  most of them look at for half a second. On a phone, the reacting map *is*
  the strip.

  *Amended 2026-10-23:* *Allarga la mappa* sits inside the strip's
  bottom-right corner; the credit question is parked — see "How the map
  frames — 2026-10-23" at the end of this section.

  *Amended 2026-10-23:* a page without a strip is the whole screen up to the
  top edge — its ground runs behind the menu, so no band of map shows around
  the pill. See "The welcome page, and the whole screen on a phone —
  2026-10-23" at the end of this section.

- **D19 — The background map is the collaborator's editor.** The form sits in
  the panel; the route or the pins are drawn on the real map. The form's
  sections become tabs at the head of the panel (*Contenuto*, *Immagini*,
  *Il percorso* or *Mappa*, *Pubblicazione*), since a panel would turn
  today's long stack into an endless scroll. While the map is editing it says
  so, in a banner that cannot be missed — a map that sometimes takes clicks
  as edits and sometimes does not must never leave that ambiguous.

  **The form owns the data; the map draws the draft it is handed and reports
  clicks.** `GaetaMap` only draws what it is handed today, and that rule
  survives the new mode. **Manual latitude/longitude entry stays** — it is
  the keyboard path (WCAG 2.1.1) and must not retire with the in-form maps.
  `FesteRouteEditor` and `MapPinsEditor` retire.

  On a phone the collaborator's screens must work, not be good (D2): the
  expanded strip of D18 is the editing surface.

  *Counter-case, rejected:* keep each form's own map. Cheaper, and it leaves
  alone the component every reader uses — but it means a map inside a panel
  over a map, which is the first oddity anyone notices.

  *Amended 2026-10-23 — the editor is reading-wide, and the banner runs
  across the map* (review PR-13). The form sits in D17's third shape, 808 px
  from 1280 px, so the tabs and the toolbar fit on one row and the text is
  written at the measure it will be read at; the toolbar is icons, each
  named in words and shown in a tooltip. The banner is no longer a pill in
  the map's corner: it runs across the map right under the menu, in the
  accent, with *Fatto*. See "The collaborator's desk — 2026-10-23".

- **D20 — The text lists stay one tap away on every map screen** ("Elenco ·
  N luoghi"). They are ADR-0005's decided equivalent of the pins, not a
  convenience; a layout that makes them harder to reach quietly undoes that
  decision.

- **D21 — *Il progetto* is the credits surface.** What `AppFooter` carries
  today moves here: the editorial rule in the reader's words ("nessuna
  presenza è acquistata") and the reserved place for a patrocinio. D11's rule
  moves with it: no invented endorsement.

### The itinerary — the next phase, not this one

> **Superseded 2026-09-11 by [itinerari.md](./itinerari.md).** The phase after
> the layout is still an itinerary, but a **curated** one: collaborators compose
> tours out of archive cards, and the guest chooses among them rather than
> assembling their own (itinerari.md I10 — a guest has no account to keep one
> in). What survives from the section below is the hand-off: a plain Google
> Maps link, built from our coordinates, now for each leg of a guided tour.
> The teardown of the Venice map stays as it was written; the reader-built
> planner it describes is not going to be built.

**Its own phase, immediately after this one.** This layout reserves nothing
visible for it (D14).

What the Venice map actually does, so nobody has to take it apart again:

- Stops are picked by tapping markers; the tap order is the tour order;
  arrows reorder. Stops are joined by **straight lines**, and the distance and
  time are a straight-line estimate at 80 m a minute.
- **"Open in Maps" is a plain link** — `google.com/maps/dir/?api=1` with an
  origin, a destination, waypoints and `travelmode=walking`. No key, no
  account, nothing from Google loaded on the page; Google computes the walking
  route when the link is opened.
- **Its "auto-order" and its Google and 3D views use the paid Maps JavaScript
  API** (a directions request with waypoint optimisation), behind an API key.
- **Its days-and-hours filter is not a Google service.** It is hand-made
  data — opening hours as free text plus a structured copy (closed days,
  opening and closing hour) — filtered in the page. The structured copy is
  lossy: one venue's summer and autumn hours collapse into a single range.

What the phase would build: the reader picks stops (on the map, or from an
"Aggiungi all'itinerario" button on a card), reorders them with buttons
(`lib/reorder.ts::moveItem`, the one implementation), sees straight dashed
lines between them, and hands off to Google Maps with a link built from
**our coordinates** — more precise than text addresses, which matters in the
old town. Ordering by proximity is computed locally; nothing from Google runs
on our page (TD-30, D6b). The stops live **in the URL and on the device**,
because there is no public signup and so no account to keep them in. Only
cards with a place can be stops.

Open for that phase: the waypoint limit of a Maps link (recalled as about
nine, fewer from a mobile browser — to be checked against Google's
documentation, not trusted from memory); whether a festa, which is a route
rather than a point, can be a stop; and whether collaborators should also
curate itineraries ("Gaeta medievale in due ore"), which would be a seventh
card type and an editorial decision before a technical one.

### Considered and not taken

- **"Open now" and opening hours.** A new structured field on chiese and on
  the places that sell a ricetta, kept current by collaborators. A wrong
  opening time is worse than none — a tourist walks to a church that is shut
  — and this file already names standing in front of a closed church as the
  moment the product is for. *(Amended 2026-10-12 by
  [ADR-0008](../adr/0008-opening-hours-as-dated-testimony.md), on the author's
  decision of 2026-09-24: chiese and luoghi may carry what is known about
  getting in as **free text with the date it was written**, always shown with
  that date. "Open now", a structured schedule, and any filter on hours stay
  refused, for exactly the reason given here.)* A "feste this month" filter is a separate
  question: it would need a structured date beside the free-text recurrence.
- **The Maps JavaScript API** (route optimisation, 3D). Paid, needs a key,
  and loads Google's script on every view — what TD-30 and D6b took out.
- **Search** — see D14.

### Costs to plan for

- **Routing.** A shell holding the map, with routes nested as panels; the
  guard, `meta.fullBleed` and `HomeView`'s two layouts are all rethought.
- **Coverage.** The Cypress suite pins today's layout, and
  `collaborator.cy.ts` is rewritten by D19. The accessibility gate excludes
  `.leaflet-container`, which now includes the editing surface — so D19's
  manual-entry path needs an explicit test of its own rather than riding on
  axe.
- **The screens the first pass left in v1 clothes** all become panels (see
  the note under the previous section). `ReportForm` is the delicate one:
  filing a report is already a click-on-the-map flow, which D19's editing
  mode should absorb rather than duplicate.
- **Build-only behaviour.** Verify against the preview build, not the dev
  server: the Leaflet default-import gotcha and TD-02 only show there.

### Left to the build

- ~~Panel widths.~~ Built 2026-09-18 at the drawn values: 560 px (narrow),
  808 px (wide); the editor's 600 px waits for D19. *(D19 chose the narrow
  560 px instead — "The map as the editor". Since 2026-10-23 the editor is
  a shape of its own, 808 px from 1280 px and 560 px below — "The
  collaborator's desk".)*
- ~~What a signed-in collaborator finds behind the avatar (their cards, a
  way to start a new one).~~ The drawing shows only the avatar. **Half
  answered 2026-09-18** (D14 below): the profile, *Utenti* and *Esci*.
  **Answered 2026-10-23** (review PR-13): *Le mie schede* comes first behind
  the avatar — the collaborator's own cards of every type, the drafts
  first, with *Nuova scheda* and a menu of the types — and a collaborator
  with a draft lands there after signing in. See "The collaborator's desk —
  2026-10-23" at the end of this section.

### What the first build decided — 2026-09-18

D13, D15, D16 and D17 were built together, because each is half a thing
without the others: a map under every page that pages do not open over is the
old home, and a panel over a map that does not react is a map used as
wallpaper. What the build settled, so it is not re-argued:

- **One map, in the shell** (`components/maps/MapStage.vue`, mounted by
  `App.vue`), drawing what `stores/map.ts` holds. The home's chrome
  (`HomeView.vue`) no longer mounts a map: on a wide screen it is a column
  floating over the map, on a phone the same sheet and floating button as
  before. Layer toggles now outlive the page that set them.
- **The home stays mounted, hidden, while a panel is open** — so that closing
  a panel can give focus back to the link that opened it (D15), which has to be
  the same element, not a rebuilt copy. It sits *after* the panel in the DOM:
  while a panel is open, the page the reader is on comes first in document
  order, and the hidden home never answers a query for the page's own links
  (the e2e suite found this the first time it ran: `contains('a', title)` was
  clicking the hidden copy).
- **Panels** (`components/layout/RoutePanel.vue`) take focus when a new page
  opens, close on their button or on Escape (Escape inside a field is the
  field's), and close by going *back* when the app has somewhere to go back
  to, onto the home when it does not (a deep link). A route declares its
  shape in `meta.panel`; the narrow ones are the card types with a place and a
  report. *(Since 2026-10-23 they close onto the home always, never by going
  back — "Close, up, back". And for a card the route's shape is its type's
  default: a card without a place opens wide — "The card decides its
  panel".)*
- **The map is `inert` while it cannot be seen** — behind a wide panel's veil,
  and under every panel on a phone — so it is never an invisible tab stop.
- **The map reacts** through `composables/useMapFocus.ts`: a page hands the
  store its own geometry (so a draft, not among the published features, is
  shown too), the map frames it inside the space the panel leaves free, draws
  it over everything else, dims the rest to 30%, and returns the reader to
  their own view when the page closes. A report brings its status colour.
  *(Since 2026-10-23 closing leaves the map where the page put it — "Close,
  up, back".)*
- **No map inside a panel on a wide screen.** The detail views keep only the
  words — the stops of a route, the labels of a card's pins, "È evidenziato
  sulla mappa, qui accanto" — because the map beside them is showing the
  place. **On a phone they keep their own small map for now**: the panel is
  the whole screen there, and D18's strip, which replaces it, is not built.
  *(It was, later the same day — "The phone's strip" below.)*
- **The credits ride on every wide panel** until D21 moves them to *Il
  progetto*; a narrow panel has no room for them. *(D21 did, the same day —
  below.)*
- **The map refetches what a save changed**: publishing, unpublishing,
  moving or deleting a card refreshes the layer it is on.

### The menu, the list, the credits — built 2026-09-18

D14, D20 and D21, built together because the menu is where the credits and
the polls are reached from:

- **D14.** The menu is a pill at the top centre, floating over the map — the
  map now runs edge to edge under it, and Leaflet's zoom buttons are pushed
  below it (and, on the wide home, out beside the floating column — *since
  2026-10-23 in the bottom-right corner instead, above the credit: "The
  map's corners and the sheet's handle"*). Wordmark,
  *Mappa*, *Schede*, *Il progetto*, then *Accedi* or the avatar. **Behind the
  avatar: the profile, *Utenti* and *Esci*** — the drawing showed only the
  avatar, and those three had to live somewhere a collaborator would look.
  *(Since 2026-10-23 the collaborator's own cards come first, *Le mie
  schede* — "The collaborator's desk".)*
  On a phone the pill keeps the wordmark and *Schede*, and the rest sits
  behind one *Menu* button. Both are disclosures of links, not ARIA menus;
  Escape closes them and gives focus back to their button.
- **"Collabora con noi" left the top bar.** D14 names *Accedi* and nothing
  after it, so the way in for someone without an account is the login page's
  own link and *Il progetto*'s *Partecipa* — the no-signup rule still holds:
  nothing anywhere offers "Registrati".
- **D20.** Beside a narrow panel, where the map is on screen without its
  lists, a floating *Elenco · N luoghi* at the map's bottom-left goes back to
  the home, which carries them. The home and the phone's sheet already had
  them.
- **D21.** *Il progetto* is `/il-progetto`, a wide panel: what the footer
  carried — the one-line description, the card types, the polls, *Collabora
  con noi*, the editorial rule — and no invented endorsement. There is no
  footer anywhere now.

### The phone's strip — built 2026-09-18

D18 as specified, and what the build had to decide:

- **The strip is the page's gap, not a second map.** On a phone a card with a
  place (`meta.panel: 'narrow'`) opens as a panel that starts 180 px below the
  menu; the shell's one map shows through above it, is not `inert`, and frames
  the place inside that strip. No card keeps a map of its own any more, on any
  screen — the detail views carry the stops and pin labels in words ("qui
  sopra" on a phone, "qui accanto" on a wide screen).
- **Enlarged is a step in the URL**, `?mappa=1`: *Allarga la mappa* pushes it,
  so Back undoes it; *Torna alla scheda* goes back when the enlarged map was a
  step of this visit and drops the query in place when it arrived that way (a
  shared link). Focus moves to whichever of the two buttons undoes the state
  the reader is in, since the one they pressed has just gone. *(Since
  2026-10-23 that button is the enlarged map's way up, a step forward to the
  card either way; Back still undoes `?mappa=1` — "Close, up, back".)*
- **The cover moves below the title on a phone**, as D18 says; the wide screen
  keeps it first (D5).
- **The wordmark no longer wraps.** The first build of D14 let the browser
  squeeze it inside a 390 px pill, where it broke into four lines and made the
  menu a third of the screen — found while building this strip, fixed here.

### The map as the editor — built 2026-09-18

D19, and what the build decided:

- **One field for both shapes**, `components/forms/MapPointsField.vue`: a
  route (ordered, reordered with buttons, joined by a line) or pins (a capped
  bag). While the form's map tab is open it lends its points to the shell's
  map through `stores/map.ts`; the map draws them in the accent colour, dims
  every other card, and hands clicks back. **The form owns the data**: a click
  changes the form's points, and cancelling the form cancels the drawing.
  `FesteRouteEditor`, `MapPinsEditor` and the `useLeafletMap` composable they
  shared are gone.
- **The banner** ("Stai disegnando il percorso · clicca sulla mappa per
  aggiungere la tappa 3", or for pins what the next click does and when the
  cap is reached) is a `role="status"` region, at the map's bottom-left on a
  wide screen and in the strip beside the zoom buttons on a phone. **Fatto**
  leaves the map tab for the next one, *Pubblicazione*. *(Since 2026-10-23
  it runs across the map under the menu, in the accent — "The
  collaborator's desk".)*
- **The sections are tabs** (`FormTabs.vue`, ARIA's tabs pattern: one tab
  stop, arrows, Home/End). The panels stay in the DOM while hidden, so every
  field keeps its id and error wiring; a tab holding a rejected field says so
  in words as well as with a dot, and a failed save opens the first such tab.
- **The editing panel is the narrow panel, 560 px**, not the drawing's 600 —
  one narrow shape rather than two. The create pages of the types with a
  place open in it too (`meta.panel: 'narrow'`), so the map is beside them.
  *(Since 2026-10-23 the editor is a shape of its own, `'editor'`, 808 px
  from 1280 px, for every type — "The collaborator's desk".)*
- **Typed coordinates stay**, in the same field — the keyboard path the map
  click does not have; `collaborator.cy.ts` tests it on its own, since the
  WCAG gate excludes the map.
- **Not built, and named so it is not assumed:** dragging a stop to move it
  (the drawing's note suggested it; remove and re-add does the same, and the
  buttons already reorder), and **folding the report filing flow into this
  editing mode** — "Costs to plan for" above said it *should*; filing still
  uses its own placing mode on the same map, which works, and merging the two
  is a change to the v1 reports flow rather than to the layout.


### Two decisions after the first week of use — 2026-09-19

Taken by the author from what the 2026-09-18 debugging sweep showed on a
phone, and built the same day:

- **A tour is followed on its own.** D16 dims everything but the opened card;
  for a tour that was not enough — the dimmed clusters' counts sat beside the
  tour's numbered stops and read as more stop numbers. While a tour is open,
  the map draws only its stops and its path (`MapStage.vue`, `tourOpen`); the
  other cards and the reports come back when it closes. Every other card keeps
  D16 as written.
- **Itinerari is in the phone's pill** (amends D14): wordmark · Schede ·
  Itinerari · Menu, as the itinerari canvas drew it, because a guest arriving
  from a B&B's QR code is on a phone. The pill's phone spacing and wordmark
  were tightened to make room (desktop unchanged); it fits from 360px, and
  below that — down to WCAG's 320px reflow width — Itinerari moves back into
  *Menu* rather than clipping.
- **Cosa fare is in the wide pill and in the phone's Menu** (amends D14,
  2026-10-13, [cosa-fare.md](./cosa-fare.md) D6): wordmark · Mappa · Schede ·
  Itinerari · *Cosa fare* · Il progetto on a wide screen; the phone pill is
  unchanged and *Cosa fare* sits behind *Menu*. A guest from the QR code meets
  it on `/benvenuto` instead, once a zone has a published place.

### How the map frames — 2026-10-23

The review of 2026-10-22 (PR-5: L-05, M-01, M-04, A-07) found the map
framing each thing its own way: a card with one pin at the closest zoom, on
a field with no street to know it by; the phone's home centred on the whole
screen, so the sheet covered the borgo, Serapo and Monte Orlando; and the
strip's *Allarga la mappa* sitting on the article's edge. Built the same day:

- **One function frames everything**, `lib/mapFrame.ts::frameInFreeSpace`:
  the box of what is to be shown, fitted into the part of the map the page
  leaves free (`MapStage`'s padding, as D16 already had it), **never closer
  than zoom 16** — a single place lands on 16 exactly. The open card and the
  tour, the set «Cosa si può fare qui» lists (cosa-fare.md D5, whose cap of 16
  this generalises), a form's draft (D19) and the city itself all go through
  it. It knows nothing of Leaflet: `MapStage`, which works out the free space,
  is on the entry path (TD-52).
- **Gaeta is a box, not a centre and a zoom**: from the Flacca's beaches at
  Sant'Agostino to Monte Orlando and the point of the medieval quarter. The
  map starts on it through the same function, inside the free space, before
  any tile is asked for. On a phone's home the free space is the band between
  the menu and the sheet at the stop it rests on; the sheet tells the store
  its height at rest, not during a drag.
- **The city follows the free space until the reader takes the map.** While
  no page asks for anything, Gaeta is framed again whenever the free space
  changes — the sheet coming to another stop, a panel opening or closing.
  Once the reader puts a hand on the map (a drag, a pinch, a tap, the wheel,
  an arrow or a zoom key), the view is theirs and stays. Closing a page gives
  back the reader's own view, as D16 says, or — if they had not moved the map
  yet — Gaeta in the space there is now, which on a deep link is a different
  space from the one the page had. *(Since 2026-10-23 a page that framed
  something leaves the map there when it closes; only a map still on Gaeta
  follows the free space — "Close, up, back".)*
- **Decided by the build**, since the review left them open: the wide home is
  framed the same way, beside its floating column, so Sant'Agostino is on
  screen there too (it was off the left edge at the old zoom 14); the cap of
  16 holds for a form's draft as well (it was 17), because one rule is what
  was asked for and a collaborator can still zoom in; and a free space less
  than 96 px tall or wide — the sheet pulled all the way up — moves nothing,
  since fitting the city into a sliver would throw the map out to the region.
- **The strip's button** sits inside its bottom-right corner, 12 px in from
  the side and from the article's edge; the OpenStreetMap credit moves up
  with it and stays above it, visible.
- **Parked, for the author: whether the credit leaves the strip.** The review
  asked for the attribution to be hidden in the strip (M-04) and kept on the
  enlarged map and on *Il progetto*. That contradicts what the map's credit
  is for — the tile policy and the OSMF's attribution guidelines want it on
  the map, readable without interacting with it, and a credits page alone
  does not count for an interactive map (`lib/osm.ts`, #106) — so the credit
  stays as it was until the author chooses: a shorter credit in the strip
  (no "Leaflet" prefix, as PR-15 does elsewhere), a collapsed credit that is
  open on first load, or hiding it and accepting the policy risk. *(Since
  review PR-15 the credit is the short one everywhere, the strip included;
  where it sits in the strip is left to review PR-25 — "The map's corners
  and the sheet's handle".)*

### Close, up, back — 2026-10-23

The review of 2026-10-22 (PR-22: N-01, N-03, N-06) found the close button
doing the browser's job: it went *back*. After a card, *Itinerari*, *Cosa
fare* and *Il progetto* it took four presses to see the map; a reader who
came in from a QR code or a search left the site with it, or stayed where
they were; from a tour's third stop it went to the second. On the web a
cross closes. The model taken is Android's *Up vs Back*: three actions, and
none of them imitates the history. Built the same day:

- **Close** — the button, Escape, and on a wide screen a tap on the veil —
  pushes the home, `/`, from every page. One press shows the map whatever
  came before, and nothing leaves the site. It closes a tour from any of its
  stops, so the map draws every card again. Focus still goes back to the
  link that opened the first panel (D15). Because it is pushed, the
  browser's Back reopens what was closed.
- **The map stays as it was.** Closing moves nothing: the map stays on what
  the page framed — a place at its zoom, a tour's last stop, a zone — and the
  reader's layers stay as they were. The store keeps the view the map reports
  after every move (`stores/map.ts`, `view`), beside the layers. The rule of
  "How the map frames" changes in one point: a page that framed something
  takes the map off Gaeta, as the reader's own hand does. Only a map still on
  Gaeta — nobody has touched it, no page has framed anything, *Il progetto*
  opened cold — is framed again in the space there is once the page closes:
  it is still Gaeta, in the space the page has left.
- **Up** is a link at the head of the panel, beside the close button, named
  after the page it leads to: a card to its type's list (*Chiese*, *Luoghi*,
  …), a card's form to the same list, a stop (`?tappa=N`) to its tour
  (*Itinerario*, the same page without the query), a tour to *Itinerari*, a
  chosen zone to *Cosa fare*, a report to the map. One level is all there
  is: the archive is at most two deep. A page whose only parent is the map —
  a list, *Cosa fare* without a zone, *Il progetto*, the account pages — has
  no up link, because the close button already goes there. The rule is one
  function, `lib/navigation.ts::parentOf`, tested against every route the
  router has. Up is pushed like any step, and the panel takes focus after it
  even when only the query changed: the link pressed may have gone.
- **Back** is the browser's and the system's gesture, and the app imitates it
  nowhere. The two states in the URL stay steps that Back undoes: from stop 3
  Back goes to stop 2, from the enlarged map to the card. *Torna alla scheda*
  is the enlarged map's way up and is pushed too; so is the profile form's
  save, which went back to the profile and now goes up to it.
- **Decided by the build**, since the review left them open: the up link's
  words are the parent page's own name, unstyled beyond a link, because the
  eyebrow it becomes — type and zone, its colour, the tour's name for a stop
  — is review PR-23's; until then a stop's parent is called *Itinerario*. It
  is 44 px tall, a thumb's target, on every screen. The veil closes on a tap
  for the pointer only: the button and Escape are already the keyboard's
  way. The *Indietro* link PR-8 had planned beside the close button is not
  built: up replaces it.

### Where the reader is — 2026-10-23

The review of 2026-10-22 (PR-23: N-02, N-04, N-05, N-07) found that inside
a card nothing said *you are in Chiese*: no eyebrow named the type as a
place one could go back to, the pill lit *Schede* for any type or nothing,
the window's title was «Vivere Gaeta» on every page, and *Schede* itself is
what the code calls a card, not a word a guest looks for. D14 and D16
already meant all three signals; none was built. Built the same day, on the
up link "Close, up, back" put at the panel's head:

- **The eyebrow is the panel's, and it is a way out.** Every panel with
  something above it opens on one line over the page's title, in a
  `<nav aria-label="Dove sei">`: the level above, as the up link, then what
  this page is within it. A card: «Chiese · Gaeta Medievale», the zone a
  link to «Cosa fare» there. A festa: «Feste ·» every zone its procession
  stops in. A tour: «Itinerari ·» its intents, each a link to the tours that
  share it. A stop: «Giro del centro · Tappa 3 di 7», the tour's name as the
  way up to it. A chosen zone: «Cosa fare · Serapo». A report:
  «Segnalazioni», the collaborator's map. A page whose only parent is the
  map — a list, *Il progetto*, the welcome page — has none, as it has no up
  link. Not a breadcrumb: the archive is two deep. The panel knows the level
  above from the route (`lib/navigation.ts::parentOf`); what only the page's
  data knows, the page hands it (`composables/usePanelTrail.ts`), as it
  hands the map a frame.
- **The page draws no eyebrow of its own over its title.** The article's
  type in the singular («Chiesa»), the report's «Segnalazione», a stop's
  position and the tour's name under its title are gone, since the panel's
  eyebrow says them; a draft still says *Bozza*. *Cosa si può fare qui*
  keeps its «A Gaeta» until a zone is chosen — then the eyebrow says which.
- **Its look is D6's eyebrow** — small, semibold, spaced capitals — **in
  the colour of the type's map layer** (D7: the one saturated register,
  doing here the work it does on the map), read as a token (D8). A page
  under no layer — a tour, «Cosa fare», a report, dialetto and libri —
  keeps the terracotta every eyebrow had. Each colour clears 4.5:1 on the
  panel's ground, which a unit test measures against `main.css` with the
  relative-luminance formula (D9). The colour is never the only sign of a
  link: the up link carries its chevron, the other links an underline, and
  every link is a thumb's 44 px. On a phone it is the same line, at the
  head of the panel under the strip.
- **The pill marks the item above the page**, with `aria-current="page"`
  and an underline as well as the tint, so colour is never the only sign
  (WCAG 1.4.1): a card of any type, its list and its form under *Esplora*;
  a tour and its stops under *Itinerari*; *Cosa fare*; *Il progetto*. The
  phone's *Menu* marks its items the same way. One rule,
  `lib/navigation.ts::sectionOf`, tested on every route.
- **The window's title names the page**, most specific first —
  «Santissima Annunziata · Chiese · Vivere Gaeta», «Itinerari · Vivere
  Gaeta» — and the home's is «Vivere Gaeta — la mappa di Gaeta»
  (`lib/pageTitle.ts`). Every route carries its own (`meta.title`), set after
  each navigation; a page named by its data — a card by its Italian name
  (translations.md T7), a tour, a stop, a chosen zone, a report — puts that
  in front once the data is there. Italian today; the reader's language
  (review PR-19) will hand it strings already translated.
- **«Schede» becomes «Esplora»**: the pill's button and its menu (the file
  keeps its name, `SchedeMenu.vue`). Routes and the types' names do not
  change. On *Il progetto* the column of card types is headed «Cosa trovi su
  Vivere Gaeta», and the column that was headed «Esplora» — the map, the
  tours, the polls — is «Per cominciare», so one screen never has two
  «Esplora» meaning two things. The wizard's exit (review PR-21) is to be
  «Vai alla mappa» for the same reason; that is PR-21's to build.
- **Decided by the build**, since the review left them open:
  - **The home and the sign-in page mark their own link**, and so does the
    wordmark on the home. The review listed «/ → none»; the pill is about
    the item *above* a page, and the home has none — but *Mappa* is the
    link to the very page the reader is on, which is what `aria-current`
    is for, and the pill always lit it there. The welcome page marks
    nothing. A report's page lights *Mappa*, where the reports are.
  - **A tour's eyebrow names its intents as the admin wrote them**,
    «Itinerari · Scoprire la città»: the review's «Mare» was an
    illustration, and an intent has no shorter name to print.
  - **Every zone and every intent is shown**, each its own link; parts wrap
    onto a second line between one another, never inside one, and a
    tour's name longer than the line is cut short with an ellipsis rather
    than broken.
  - **Feste carry their zones named**, `{slug, name}` on their Read
    serializer, by the stops of the procession as on the map (cosa-fare.md
    D2); chiese and luoghi had them since review PR-3. **Itineraries keep
    their lists of slugs**, as content.md recorded on the same day: the
    prompt asked for them named too, the spec says otherwise and wins, and
    the tour's eyebrow is its intents, which need no zone.
  - **Up from a report is called «Segnalazioni»**, after what the reader
    finds there, rather than «Mappa».


### The card decides its panel — 2026-10-23

The review of 2026-10-22 (PR-10: P-09) found a ricetta with no pin opening
in the narrow panel beside a full, undimmed map — every pin of every layer
next to a card they had nothing to do with. D17 already said a card without
a place is read wide; the build had given the shape to the type instead.
Built the same day:

- **The card says whether it has a place**: a pin or a route. With either it
  opens narrow, beside the map that shows it; with neither it opens wide over
  a veiled, `inert` map, and on a phone as the whole screen with no strip —
  as dialetto and libri do, whose types have no place at all. The route's
  `meta.panel` stays the type's default; the page hands the shell what its
  card says (`composables/usePanelShape.ts`), as it hands the map a frame,
  and both the panel and the map — its veil, `inert`, the free space it
  frames in, *Elenco* beside a narrow panel — draw from that one answer. The
  rule is one function, `cardPanelShape`.
- **The panel is born in that shape**, never opened narrow and widened in
  front of the reader: the card is fetched before its page mounts
  (`lib/cardFirst.ts`, a guard on the detail routes of the five types with a
  place), so the page the reader came from stays on screen until the card
  is in, and the page that opens has it from its first render. If the
  request fails the page asks again itself, and a card that does not exist
  still sends the reader to its type's list. `reader.cy.ts` records every
  width the panel is drawn at between a list and a card.
- **Decided by the build**, since the review left them open:
  - **Fetching first, not "open wide and narrow it if there are points"**,
    the review's other way: that would have widened every church for the
    length of a request — the common case paying for the rare one. Showing
    no panel until the card is in was tried on paper and dropped too: the
    veil would blink off and on between a list and its card, and on a phone
    the map would flash where the list had been.
  - **A card's form keeps the narrow panel**, place or not: the form draws
    the place on the map (D19), and a ricetta's first pin is added there.
    *(Since 2026-10-23 it opens in the editor's shape, which is beside the
    map too — "The collaborator's desk".)*
  - **The shape follows the card while it is open**: saving its last pin
    away widens the panel, adding its first narrows it.
  - **From one card straight to another of the same type** — a translation,
    a pin clicked beside the panel — the panel keeps its shape until the
    next card is in, since the guard runs only on entering a route.

### The collaborator's desk — 2026-10-23

The review of 2026-10-22 (PR-13: C-01, C-02, A-05) followed a collaborator
through a Sunday's work. After signing in they landed on the map, with
nothing saying where their drafts were — a draft was found type by type,
through each list's *Le mie* filter, so they had to remember its type — and
the form they wrote in was the 560 px narrow panel, where the five tabs and
the editor's toolbar each broke onto two rows, under a status pill in the
map's corner that was easy to miss. The author decided the editor's shape
on 2026-10-22 (D17's third shape); the rest was built on 2026-10-23:

- ***Le mie schede*** (`/le-mie-schede`, a wide panel) is first behind the
  avatar and in the phone's *Menu*: the collaborator's own cards of every
  type on one page — **the drafts first, then what is published**, each part
  by type, in the order the menu offers the types to a reader and the tours
  last. A translation is filed under its Italian name, with its language
  beside it (T7). Each row opens its card, and *Modifica* opens it with its
  form (`?edit=1`): two clicks from the avatar to a draft's form. *Nuova
  scheda* is a disclosure of the eight types, each to its own form. One
  endpoint serves the page, `GET /api/content/mine/`: the signed-in author's
  cards, of every type found as the counts find them (ADR-0004), paged like
  every list, drafts first.
- **Where a collaborator lands.** After signing in with nowhere asked for,
  on *Le mie schede* when they have a draft, and on the map otherwise; a
  page the router's guard sent them away from still wins. The login asks
  for one row of the list — drafts come first, so one row says whether there
  is any — and if the list cannot be had it goes to the map: signing in does
  not fail over where to go next.
- **The editor's shape** — `meta.panel: 'editor'` on every create route, and
  asked for by a card's page while its form is open: 808 px on the right
  from 1280 px, 560 px between 1024 and 1280, no veil, the map live and not
  `inert`, framing in the space the panel leaves free. On a phone it is the
  narrow panel's strip, which, enlarged, is where the place is drawn (D19).
  Dialetto and libri are written in it too, beside a map with nothing of
  theirs on it: one shape for writing, as the author asked, rather than one
  for each kind of card.
- **The toolbar is icons**, on the app's 20 px grid, each named in words —
  *Grassetto*, *Titolo H2*, *Lista numerata* — since with no text on the
  button the name is the whole label (WCAG 2.5.3), and a tooltip shows the
  same words on hover *and* on keyboard focus. Escape puts a tooltip away
  (WCAG 1.4.13) and only then reaches the panel, which closes on it. The
  text is written at the reading measure, `prose`'s 65ch.
- **The banner** runs across the map right under the menu, in the accent
  (white on `--color-sea`, 7.23:1), with *Fatto*: on a wide screen from the
  map's edge to the panel's, its top level with the panel's; on a phone
  across the strip. Leaflet's zoom buttons step down below it. It is still a
  `role="status"` region.
- **Decided by the build**, since the review left them open:
  - **Drafts and published as two parts**, not one list per type with its
    drafts on top: a draft church under five published places is not at the
    top of the page a collaborator was sent to for it.
  - **A *Modifica* on every row**, though it doubles the tab stops: the page
    is for unfinished work, and the form is where it is finished.
  - **No date on a row**: the order — drafts first, then the last changed —
    says what a date would.
  - **Below 1280 px the five tabs may wrap**, as before: the review asked for
    one row at 808 px, and the 560 px panel is the narrow one's width.
  - **Not here:** filing a report keeps its own flow and form (v1 clothes,
    "What the pass covered"), and the polls join the avatar's menu after *Le
    mie schede* with review PR-17.

### The welcome page, and the whole screen on a phone — 2026-10-23

The review of 2026-10-22 (PR-14: P-07, M-09, M-06) found `/benvenuto` — the
page a B&B's card prints ([itinerari.md](./itinerari.md) I6) — saying what to
do but not what the site is; its choices white panels of text, one of them
wearing a dark border that read as a leftover focus ring; its way out a small
button. And on a phone, every page without a place — the welcome page, a
list, *Il progetto* — sat under a band of map about 70 px tall around the
menu, which looked like a rendering fault rather than a space anyone meant.
Built the same day:

- **The welcome page says what the site is**, under its eyebrow and its
  question, in the home's own line (`definitions/copy.ts`, D3's note of
  2026-10-23) — one constant, so the two front doors cannot describe the
  archive two ways.
- **Each intent is a card with its tint and its icon** — the sea, the town,
  the walk, the table — in the place a cover will take once the archive has
  photographs (P-07). The tile is `components/content/IntentTile.vue`, the
  recipe of `CoverPlaceholder` (D5's note): an 18 % tint over the page ground,
  the icon in the full colour, the card itself a surface, so every word on it
  is a pairing `main.css` already measured.
- **The way out is a closing link, «Oppure vai alla mappa»**: underlined, a
  thumb's 44 px tall, no longer a button. The review's prompt said «Oppure
  esplora la mappa»; the menu's *Esplora* (review PR-23, "Where the reader
  is") is on the same screen, and the review had already decided «Vai alla
  mappa» for the wizard's exit for that reason (PR-23 point 4, PR-21 point
  6). This page is the wizard's first step to be; it says it the same way now.
- **The whole screen means the whole screen** (amends D17's and D18's "on a
  phone the whole screen"): a page without a place starts under the menu as
  before, but its ground runs up to the top edge behind the pill, so no map
  shows around it — the map is `inert` there anyway. A card with a place
  keeps its strip, and the wide screen is unchanged. `RoutePanel.vue` draws
  it; `reader.cy.ts` checks the band beside the pill on `/benvenuto`,
  `/luoghi` and *Il progetto*.
- **Decided by the build**, since the review left them open:
  - **The intents' colours are tokens of their own**, `--color-intent-*` in
    `main.css`, each naming a colour the palette already has rather than a
    new hex: the sea wears `--color-sea`, the town the roofs' terracotta, the
    table the ricette's layer and the walk the luoghi's — what each leads to
    on «Cosa si può fare qui». An intent the admin adds after these wears the
    unknown grey and the tours' map icon until it is given its own. Each
    colour clears 3:1 on its tint and 4.5:1 on the surface (D9), measured in
    `lib/__tests__/intents.spec.ts` with the tint mixed in Oklab as the
    browser mixes it: 5.08, 4.67, 3.70 and 4.36 on the tints.
  - **The dark border was hover's, not focus's**: the card's ring was
    already `focus-visible`, so no click or tap draws it, and the one darker
    border the card had was `hover:border-field` — which, under a pointer
    resting on the second card, reads exactly as a ring left behind. The
    pointer is now told by the intent's name underlined, which nobody reads
    as focus; the ring stays the keyboard's alone, and a unit test holds
    every card to `focus-visible` and to no border that darkens.
  - **The zone card wears the home's door**: the same pin on the same sea
    tile as *Cosa c'è in una zona* on the home, so the two pages draw one
    door one way. Its fixed second line («Serapo, il centro medievale, Monte
    Orlando…») is untouched — naming only zones with a place, as the home
    does, is a change of its own.
  - **The line under the question stays**: «Itinerari scritti da chi Gaeta
    la conosce: scegli da dove cominciare.» follows the presentation, muted.
    Both say who writes the archive; the review asked for a line added, not
    one replaced, and the wizard (review PR-21) will rewrite this page anyway.
  - **Four icons are new**, drawn in the set's stroke (24 px grid, 1.5
    stroke, round caps): `MareIcon`, `CittaIcon`, `CamminoIcon`,
    `TavolaIcon`. `/benvenuto` paints in the first frame (TD-52), so they
    are inline SVG on the entry path: about 0.9 KB gzipped, measured against
    `main`'s build.

### The map's corners and the sheet's handle — 2026-10-23

The review of 2026-10-22 (PR-15: M-03, M-11, L-02) found the map's own
controls where an earlier layout had left them rather than where this one
leaves the map free. On a phone the credit, «Leaflet | © contributori di
OpenStreetMap», rode the sheet's edge and took a quarter of the map's
width; on the wide home the zoom buttons sat 16 px from the floating
column, in its margin; and the sheet's handle was a 36 × 4 px bar that said
nothing about dragging. Built the same day:

- **The credit is short**: «© OpenStreetMap», linked to the copyright page,
  with Leaflet's own name and flag turned off (`prefix: false`). What the
  tile policy and the OSMF's attribution guidelines ask for is
  OpenStreetMap's credit, near the map and readable without touching it,
  and they accept this form. The full sentence, with the ODbL and the zones
  derived from OSM, stays on *Il progetto* (D21).
- **Where it sits.** On a wide screen bottom-right, as before, and left of a
  narrow or editor panel. On a phone's home top-right, under *Livelli* and
  lined up with its edge, so no text of the map touches the sheet at any
  stop — with the sheet all the way up it is behind it, with the rest of the
  map. On the phone's enlarged map (`?mappa=1`) top-right as well, under the
  menu, on the same rule. **In the strip above a card it has not moved**:
  it is above *Allarga la mappa*, as "How the map frames" left it, because
  where it goes there was decided by the author on 2026-10-23 and is review
  PR-25's to build.
- **The zoom buttons** are top-left, under the menu — and under the editing
  banner while there is one — everywhere but the wide home, where that
  corner is the floating column's: there they are bottom-right, above the
  credit. `MapStage` says which corner each control goes in on each layout
  and `GaetaMap` has Leaflet put it there (`setPosition`); the map still
  only draws what it is handed. The sheet no longer publishes `--sheet-h`:
  the credit riding its edge was the one thing that read it.
- **The sheet's handle** is a 44 px target across the sheet's width, with
  the bar drawn as before — the target grew, not the mark. Its name says
  what it is for, «Trascina per vedere più mappa», and its description what
  pressing it does at this stop (*Espandi l'elenco*, *Riduci l'elenco*,
  *Mostra i luoghi*), because a keyboard cannot drag: pressing still cycles
  the stops (D3). The first time in a session a line under it says the
  same, and goes at the first drag. The session is remembered in
  `sessionStorage`, read and written inside `try`: where storage is refused
  the line shows on every visit until the first drag, and nothing else
  changes.
- **Decided by the build**, since the review left them open:
  - **The enlarged map's credit goes top-right**, like the home's, rather
    than above *Torna alla scheda*: on a phone the credit is in the top-right
    corner wherever the map has the screen.
  - **The lowest stop grew with the handle**, from 5.5 to 6.375 rem — the
    handle's 44 px and two whole lines of the presentation, which at 1.65 ×
    17 px are 56.1 px — so it still shows the line (D3's note of
    2026-10-23).
    The line under the handle is not shown there, for the same reason.
  - **The line goes at the first drag, not at the first press** — a press
    shows that the sheet moves, not that it drags — and it is remembered
    when it is first shown, so a reload in the same session does not bring
    it back. It is hidden from assistive technology, which has the handle's
    name for it.
  - **A drag no longer also moves the sheet on.** A drag ends on a click,
    which the handle took for a press: the sheet came to the stop nearest
    where it was let go, then went on to the next one. A press that moves
    more than 6 px is a drag, and its click is not a press. The handle also
    keeps a phone's browser from taking the drag for a scroll or a pull to
    refresh (`touch-action: none`).
  - **The focus ring is drawn inside the handle**, along the sheet's
    rounded top: a full-width button's outer ring was off both sides of the
    screen.
- **Parked, for the author: «Elenco · N luoghi» at the lowest stop.** The
  prompt asks that the lowest stop "tiene visibile la riga «Elenco · N
  luoghi»" (M-11, from D20). D3's note of 2026-10-23 decided otherwise:
  "at the lowest stop what shows is the line", with the list "one drag or
  one tap away", which is what D20 asks for. The stop shows the line, as D3
  says, until the author chooses between the two.

### Sharing a card — 2026-10-24

The review of 2026-10-22 (PR-16: P-11) found no way to send a card on: the
reader copied the address from the browser's bar — Nunzia in Turin gets a
feast's link on WhatsApp from someone who did — and on a phone, where the bar
shows little more than the domain, that is the step most people do not know.
Built on 2026-10-24:

- **«Condividi» sits beside the byline**, under the title: on the first
  screen, where a reader standing in front of the place is, rather than at the
  foot of the article, which on a phone is several screens down. It is
  `CardArticle`'s (`components/content/ShareButton.vue`), so a card of every
  type, a festa and a tour have it from one place and the footer stays as it
  was. In a tour's guided mode the stop has it beside *Come arrivarci* and
  *Leggi la scheda*, read «Condividi la tappa» by a screen reader.
- **Two ways, both the browser's.** Where the browser has a share sheet — a
  phone — it opens with the page's name and address. Where it has none — most
  desktop browsers — the address goes to the clipboard and the toast says
  «Link copiato». No social buttons, no shortener, nothing of anybody else's
  loaded or called (TD-30, D6b): sharing makes no request at all. Both run
  only from the reader's press, which the browser requires before a page may
  open the sheet or write to the clipboard; a clipboard refused — an http
  address has none, a permission may be withheld — is said in the toast, with
  the address bar as the way to do it by hand. A sheet the reader closes is an
  answer, and nothing is said. One function, `lib/share.ts::shareLink`.
- **The address shared is the page's own**: its path, with nothing of how the
  sender happened to be looking — no `?mappa=1`, no `?edit=1`. A stop is the
  one exception, because the stop is what is shared there:
  `/itinerari/:id?tappa=N` opens on that stop, as a reload does
  ([itinerari.md](./itinerari.md) I7), with the tour one level up. From the
  tour's article the tour is shared, without a stop.
- **Decided by the build**, since the review left them open:
  - **Beside the byline, not under «Torna a…»**, which the prompt allowed
    too: the footer holds the collaborator's *Modifica*, *Elimina* and
    *Traduci*, and a reader on a phone reaches it only after the whole
    article and the map's section.
  - **The name handed to the sheet is the window's** — «Santissima
    Annunziata · Chiese · Vivere Gaeta», "Where the reader is" — so the
    subject of a mail or the line over a link in a chat says the site as well
    as the card, and there is one name for a page, not two.
  - **Not on a draft**, nor on any stop of a tour in draft: a draft opens for
    its author and the admins alone, so its link would be a «not found» for
    whoever it was sent to.
  - **No toast over the sheet**: the sheet shows what happened. The toast is
    for the copy, which otherwise happens out of sight.
  - **A sheet that will not open** — a page in a frame without the
    permission, a target that fails to start — falls back to the clipboard
    rather than to an error.
  - **The look is the reader's secondary pill**, the one *Leggi la scheda*
    wears: bordered, the accent's text, 44 px tall. Its icon is the three
    joined dots, neutral between the platforms' own share signs, and
    decorative: the word names the button (WCAG 2.5.3).
