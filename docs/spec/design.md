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
  560 px instead — "The map as the editor".)*
- What a signed-in collaborator finds behind the avatar (their cards, a way
  to start a new one). The drawing shows only the avatar. **Half answered
  2026-09-18** (D14 below): the profile, *Utenti* and *Esci*. **Still open:**
  the collaborator's own cards and a way to start one are not behind the
  avatar — they are reached per type, through each list's *Le mie*
  filter and its *Nuova scheda* button.

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
  back — "Close, up, back".)*
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
  below it (and, on the wide home, out beside the floating column). Wordmark,
  *Mappa*, *Schede*, *Il progetto*, then *Accedi* or the avatar. **Behind the
  avatar: the profile, *Utenti* and *Esci*** — the drawing showed only the
  avatar, and those three had to live somewhere a collaborator would look.
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
  leaves the map tab for the next one, *Pubblicazione*.
- **The sections are tabs** (`FormTabs.vue`, ARIA's tabs pattern: one tab
  stop, arrows, Home/End). The panels stay in the DOM while hidden, so every
  field keeps its id and error wiring; a tab holding a rejected field says so
  in words as well as with a dot, and a failed save opens the first such tab.
- **The editing panel is the narrow panel, 560 px**, not the drawing's 600 —
  one narrow shape rather than two. The create pages of the types with a
  place open in it too (`meta.panel: 'narrow'`), so the map is beside them.
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
  open on first load, or hiding it and accepting the policy risk.

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

