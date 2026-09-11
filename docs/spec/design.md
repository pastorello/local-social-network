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
> file. They are **decided and not built**; until they are, the requirements
> above them describe the layout that exists. The palette, the type and the
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

> **Decided 2026-09-11, not built.** The confirmed output of a brainstorming
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

- **D14 — A minimal menu, top centre.** The wordmark, *Mappa*, *Schede*,
  *Il progetto*, then *Accedi* (or the collaborator's avatar). *Itinerario*
  is added by its own phase and not before: an empty menu item at launch is
  worse than none. **The polls leave the top level** and are reached from
  *Il progetto* — the v2 spec already says there is no new work on them.
  **No search in this phase:** it was drawn and dropped, because search is a
  feature with an endpoint of its own, not a place in a menu.

- **D15 — Every page is a panel over the map, and keeps its URL.** A shared
  link to `/feste/:id` opens the map *and* the panel. Back and Escape close
  the panel, and focus returns to whatever opened it. A panel is a dialog for
  ADR-0005's purposes: focus management, one `<h1>` per panel, and the skip
  link retargeted at the panel's content rather than at a `<main>` that no
  longer frames the page.

- **D16 — The map reacts.** Opening a card that has a place moves the map so
  the place sits in the space the panel leaves free — never under it —
  highlights its pins or its route, and dims everything else. Closing returns
  the map to where the reader left it.

  *Counter-case, rejected:* the map as a backdrop only. Cheaper, but then the
  map under every page is decoration for most of the site, paid for in bytes
  on every route.

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
  moment the product is for. A "feste this month" filter is a separate
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

- Panel widths. The drawing uses 560 px (narrow), 808 px (wide) and 600 px
  (editor); they are drawn values, not decided ones.
- What a signed-in collaborator finds behind the avatar (their cards, a way
  to start a new one). The drawing shows only the avatar.
