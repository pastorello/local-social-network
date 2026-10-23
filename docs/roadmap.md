# Roadmap

What is planned and in what order. Ordered by what is **active**. The product
authority is [spec (v2)](./spec/README.md) (v2, 2026-08-21); this file only
sequences the work.

**The items that are done are in [roadmap-archive.md](./roadmap-archive.md)** —
1 (design), 2 (coverage), 6 (the v2 build order) and 7 (the accessibility
decision), each with the reasoning that got it there. **The numbers here are
unchanged and always will be**: the spec files, the ADRs and `CLAUDE.md` refer
to these phases by number, so 3, 4, 5 and 8 keep theirs and the gaps are where
the finished ones used to sit. A roadmap that renumbers itself is a roadmap
nothing else can cite.

**Where things stand (2026-10-23).** The UX/UI review of 2026-10-22 ([review-2026-10-22.md](./review-2026-10-22.md)) is running as a queue of prompts, one PR each, merged by GitHub when the four required checks are green. Since 2026-10-23 `main` requires them and auto-merge is on. All of priority A and two prompts of priority B are in (#116–#126). An interview with the author the same day decided the wizard's flow (study 10, PR-21). It also decided businesses as a type of their own ([ADR-0010](./adr/0010-businesses-in-the-archive.md)) and events and feasts' editions as dated entries, the poster included (cosa-fare.md Part −1 D9). Both are specified and queued as the review's PR-26 and PR-27, before PR-21 and the English interface (PR-19). Item 4, the content, is still what a reader is waiting for.

**Where things stand (2026-10-22).** **The site is live** at
`https://viveregaeta.it` (item 3, below). The archive on it is empty until
cards are written and published — item 4 is now the only thing between the
product and a reader. The same day the author withdrew the public-source
drafts: a trial, not material to publish, so they and `seed_drafts` were
removed and production starts from nothing (item 4).

**Where things stand (2026-10-21).** The engineering board is empty: since
2026-10-13 the zones were redrawn on OpenStreetMap and the map credits it (#105, #106), the
public-source drafts moved into git (#107, #108), drafts appear on the map for
whoever may read them (#109), and CI gained a Lighthouse gate whose first
finding and TD-52 were both paid (#110–#112). The author chose **deploy before
content** and decided item 3's three inputs (ADR-0009). Item 4 follows on the
live site.

**Where things stand (2026-10-13).** *«Cosa si può fare qui»* is decided and
built in a day — the spec's Part −1 (#98), then four PRs (#99–#102):
ADR-0008's availability and *«Se la trovi chiusa»*, the editorial zones, the
page at `/cosa-fare`, and `seed_demo` to see it full. Item 5 says what it
still waits on: six zone drafts the author corrects, and content. The gates
re-run at 547 backend, 268 frontend and 49 e2e tests, and TD-37, re-measured,
turned out not to describe the job it names.

**Where things stand (2026-10-12).** Nothing has landed since 2026-09-22 and
the gates re-run with identical counts. A docs-against-code pass found the doc
set accurate to the file and symbol, with a handful of stale numbers and
sentences fixed in place, and re-walking the archive for "not covered" lines
found two more pieces of debt, both on tour stops (TD-49, TD-50). The
engineering on the board is now those two and TD-47/TD-48 — four small
items, none blocking. *(All four were paid the same day — TD-50, TD-49,
TD-47, TD-48 — and the dependency sweep and TD-31's paper cuts followed, so
no engineering is left on the board that does not wait on the author.)* Item 4 is still the bottleneck.

**Where things stand (2026-09-22).** Unchanged in substance since 2026-09-18,
below. The registers were split in two that day — this file and
[tech-debt.md](./tech-debt.md) now hold only what is open — and re-walking the
debt found two coverage gaps that the first audit had named and nobody had
gone back to (TD-47, TD-48). Neither is a feature and neither blocks anything
here; they are the only engineering work on the board.

**Where things stand (2026-09-18).** Items 1 and 2 are complete, and so is the
technical half of item 3 — what is left of it is input only the author has: a
mail provider, a sender domain, a host. The two phases decided on 2026-09-11
are built too (item 5): the map under every page, and curated itineraries
with the seventh card type, luoghi, that they needed. **Nothing planned is
left to build.** Item 4, the content, is the bottleneck — and itineraries
sharpen it: `/benvenuto`, the address printed on the B&B cards, lists only
intents with a published tour, so until one is written it says the tours are
in preparation.

The open question that used to sit here — *"decide what publishable means"* —
was answered on 2026-08-21 by the v2 spec: the product recenters as a curated
cultural map-archive of Gaeta, written by a small circle of approved
collaborators, read by everyone, ultimately aimed at tourists. The standing
picture written when the v2 build order closed, on 2026-08-27, is at the head
of the archive's item 6.

## 3. Deploy readiness — prerequisites now, deploy on the author's signal

**Live at `https://viveregaeta.it` since 2026-10-22.** The author bought the
domain and the VPS and walked deploy.md's runbook with this session reading his
terminal: DNS, Docker on Ubuntu 26.04, the first start and its certificate, the
first admin, Brevo's domain authentication, a test message, and the whole
onboarding journey — a *Collabora con noi* request approved in `/admin/`, the
invite in the inbox, a password set, a sign-in, a reset — all passed. What the
run taught is written into the runbook, and the nightly backup is now a script
(`deploy/backup.sh`). **Item 3 is done; it moves to the archive at the next
register sweep.**

**Decided 2026-10-21, with the author's signal** ([ADR-0009](./adr/0009-where-it-runs.md)):
`viveregaeta.it` registered at OVHcloud, one **OVHcloud VPS-1** (2 vCores,
4 GB, daily backup included, about €4.65/month), and **Brevo's free plan** for
the invite and reset mail — about €65 a year in all, for a showcase with
near-zero traffic and under thirty e-mails a month. **What is left is buying
them and following [deploy.md](./deploy.md)'s *The setup chosen on
2026-10-21*** — the author's hands, not an engineer's.

~~**What is actually left: a mail provider, a sender domain, a host, and the
author's signal.**~~ Everything else on this checklist is struck out — including
the compose path, walked end to end on a production-shaped stack on
2026-09-10. Nothing here is engineering work waiting for an engineer.

The struck-out entries stay, because a deploy checklist is read when
deploying, and "why is media served by the app itself?" is a question that
gets asked at exactly that moment:

- ~~**Media serving**~~ — **decided and built 2026-08-30**,
  [ADR-0007](./adr/0007-serving-media-from-the-app.md), which amends ADR-0003.
  The app serves its own media through one hardened view, on any host, with no
  object storage and no web server in front: an extension allowlist that the
  `Content-Type` comes from, `nosniff`, and a sandboxing CSP. Decided this way
  *because* the host is unknown — the author confirmed on 2026-08-30 that he
  has only Docker locally — so waiting for a provider was not deferring a
  configuration step, it was leaving the product undeployable behind a decision
  nobody was close to taking. **A persistent disk is still required** so
  uploads survive a redeploy; what changed is that a disk is now sufficient.
- ~~A shared cache so the credential rate limits (TD-18) hold across
  processes.~~ **Done 2026-08-30**: the database cache outside dev and tests —
  shared by every worker and container, and needing no service the deployment
  does not already have, which matters while no host is chosen. Verified by
  three processes counting 1, 2, 3 through it where `LocMemCache` gave each of
  them 1. `createcachetable` joined the release commands.
- ~~**SMTP** settings shape.~~ **Half done 2026-08-30**: the `MAILERS`
  migration (TD-34) landed, so the configuration is in its final shape. What
  remains is genuinely an input rather than code — a provider and a sender
  domain (spec §11.3).
- ~~**The compose path wants re-walking.**~~ **Done 2026-09-10**, against a
  live production-shaped stack on the author's machine (`DOMAIN=localhost`, so
  Caddy's local CA stood in for Let's Encrypt — the one step a laptop cannot
  rehearse). The premise was half wrong: the three deploy-shaped changes it
  named had landed the same day as the guide, not after. What *had* landed
  after — four migrations that had only ever run on SQLite — applied cleanly
  on Postgres 17.
  **It found five problems, and fixed all five**: an unquoted secret key loses
  every `$abc` to Compose's interpolation, which is two keys in three; the
  backup command expanded its variables in the wrong shell and wrote a 20-byte
  "successful" backup; approving a request with mail down left an account
  nobody could use and a request nobody could re-approve (TD-38); password
  reset told a stranger which addresses exist whenever mail was down (TD-39);
  and none of it would have been diagnosable, because a production 500 wrote no
  traceback anywhere (TD-40). The code fixes were verified on the same stack
  after an update done with the guide's own procedure.
  **What worked as written**: the HTTP surface through Caddy (SPA, deep links,
  API, admin, static files, the 80→443 redirect, the security headers), admin
  login over HTTPS, media served with ADR-0007's headers, the rate limit shared
  by three workers and not fooled by a forged `X-Forwarded-For`, the update
  procedure, and the media backup, whose restored photo matched the served one
  byte for byte.
- `VITE_API_BASE_URL` is baked at build time, so the SPA build is
  environment-specific.
- ~~**TD-06** (remaining dependency drift)~~ — **minors done 2026-08-30**,
  backend and frontend, each in its own PR; **the majors 2026-09-05**, with
  two held back on purpose (cypress 16, typescript 7 — the reasons are in
  **TD-06 (residual)**, in the [active register](./tech-debt.md)). ~~**TD-33**~~ (pin the lint rule sets, so a linter bump stops being
  a way to change the lint policy by accident) — **done 2026-09-05**.

## 4. Content and input — the author's own, in parallel

> **Product questions the specs hold and this file does not show** —
> recorded here as pointers on 2026-09-08, because a reader who plans from the
> roadmap would otherwise never meet them. All were raised by writing real
> content rather than by reading code. **All three were answered within two
> days of being written down, which is the argument for writing the next one
> down too** — they are kept struck out rather than deleted because each
> answer is a rule a collaborator has to know.
>
> - ~~[translations.md](./spec/translations.md) — images, map point, and
>   whether a translation is its own row in every list.~~ **Answered
>   2026-09-09 and built the same day** (T5/T6/T7): the photographs and the
>   place belong to the original in every language, the lists follow the map
>   with one row per thing, and the heading of a translated card stays the
>   Italian name with the translation as a subtitle — because the signs in
>   Gaeta are in Italian and a fully translated title is how a tourist fails to
>   find the place.
> - ~~[content.md](./spec/content.md) — whether `Termine` should **drop
>   `term`**.~~ **Answered 2026-09-09: dropped.** The title is the word; the
>   field said it a second time on every entry.
> - ~~[content.md](./spec/content.md) — `libri`' **covers**.~~ **Answered
>   2026-09-09: the publisher's image or none, never a scan.** No code can tell
>   the two apart, so the rule is attached to the upload field as its hint.
>
> Each changes what a reader sees, which is why they are the author's and not
> maintenance.

Not engineering, but the archive is empty and no amount of building fixes
that. Two of these are the spec's own open questions, and C5 turned them from
build questions into input ones:

- The **quartieri and seggi boundaries** (GeoJSON) — the overlay mechanism
  exists and is gated; it has no data. **The path itself was rehearsed on
  2026-09-05** with files shaped like the real ones, and what it taught is
  written down in [overlays-howto.md](./overlays-howto.md) — read that before
  the first upload rather than after it.
- The **georeferenced historical scans** (1820, 1600…) and their bounding
  boxes. Note `common/images.py` caps uploads at 5 MB and 40 Mpx, raster
  overlays included — a large scan wants downsampling before georeferencing.
- The **first real cards**, in every type, and their English translations —
  which is also the only way to find out whether the authoring flow is
  pleasant to use for someone who is not its author.
  **Seeding began 2026-09-11**, in the development database only: eleven
  drafts written from public sources, none published, each ending with its
  sources and what is left to verify. The rules — and what the first batch
  showed about why they are needed — are in
  [spec/content.md](./spec/content.md#seeding-the-archive-from-public-sources--2026-09-11).
  Seeded drafts are material for the author's reading, not a substitute for
  it. ~~**Since 2026-10-14 they are in git** (`backend/content/drafts/`, loaded
  by `seed_drafts`), so they no longer depend on one database file surviving.
  A second batch the same day added ten luoghi, one or more per zone.~~
  **Withdrawn 2026-10-22**: the author judged the drafts a trial rather than
  material to publish, and they were removed with the command that loaded
  them. The first real cards are written in the app, from nothing.
- **At least one published itinerary** (added 2026-09-18, with the tours).
  `/benvenuto` is the one address printed on a B&B's card, and it lists only
  the intents that have a published tour — so with none it tells a guest the
  tours are in preparation. That page is the product's first impression for
  exactly the reader the spec is aimed at, and it is one tour away from
  working.

## 5. Named but not scheduled

Two phases the design interview surfaced (2026-08-27). Both are recorded so the
direction is not lost, neither is scheduled, and **both were non-goals of the
design pass** (item 1, archive) — the design enables them, it does not build
them.

(A third thing sat here for a few hours on 2026-09-09 — the `libri` card type,
proposed in the morning and delivered the same day. It is recorded at the foot
of the archive's item 6, with what it cost.)

Two more were decided on **2026-09-11**, and unlike the two below they are
already specified. **Both are built (2026-09-18)** — they were never
scheduled against items 2–4, and the author took them up once those were
done:

- **The map under every page** — [spec/design.md](./spec/design.md) D13–D21.
  **Built, all of it, 2026-09-18** — the map in the shell, pages as panels,
  the map reacting, the two panel shapes, the phone's map strip, the map as
  the collaborator's editor, the pill menu, the list one tap away, *Il
  progetto* — in four PRs (#69–#72).
  The layout reopened: the map is the ground of every page, pages open over it
  as panels, the map reacts to what is opened, and it becomes the
  collaborator's editor. Not a restyle — it moves the map into the shell,
  retires the two in-form map editors, and rewrites a share of the Cypress
  suite that item 2 (archive) built. Read the "Costs to plan for" in that section
  before sizing it.
- **The itinerary** — ~~a reader picks stops and hands the walk off to Google
  Maps~~. **Redecided the same day: curated itineraries**,
  [spec/itinerari.md](./spec/itinerari.md). A guest arriving from a B&B's card
  chooses what they feel like doing (the beach, food, the old town) and follows
  a tour a collaborator composed from archive cards, one stop at a time, with
  each leg handed off to Google Maps through a plain link. Still **its own
  phase, immediately after the layout** — and it needs a seventh card type
  first, **luoghi** (beaches, the castle, monuments, museums: see
  [spec/content.md](./spec/content.md)), since every stop is a card —
  **built 2026-09-18**, the first item of the queue the author handed over
  that day.
  **The itinerary itself is built too, 2026-09-18**: the backend in #73, the
  welcome page, the tours list, the guided mode and the collaborator's editor
  right after it. What it lacks is what the whole archive lacks — tours
  written by the people who know the town.

- **«Che si fa a Gaeta?»** — a guest asks what can be done on a given day, in
  a given part of town, and gets everything that is open there, with the tours
  that fit the time they have. **A draft spec, not a decision**:
  [spec/cosa-fare.md](./spec/cosa-fare.md), proposed 2026-09-22 and committed
  on 2026-10-12. The author has settled one thing in it — opening hours get a
  field that is honest while empty and is filled over time, never collected as
  a project (§0.2b) — and that reopens design.md's refusal of opening hours.
  **On 2026-10-12 the author made it the next phase, and
  [ADR-0008](./adr/0008-opening-hours-as-dated-testimony.md) records the
  availability decision**: dated free-text testimony, no schedule, no filter,
  no "open now". **The rest was decided on 2026-10-13** (the spec's Part −1):
  `/cosa-fare`, *«Cosa si può fare qui»* — editorial zones and the activities
  in them, no day picker until something knows what happens on a day; planned
  as three PRs and about three days, **built the same day in four** (#99–#102,
  `seed_demo` the fourth). It is built now, on a near-empty archive, and its
  invitation on `/benvenuto` opens itself once a zone has a published place —
  so the page still waits on content (item 4), but the code does not.
  **The zones were redrawn on OpenStreetMap on 2026-10-14** (`maps` migration
  0006): on land, no overlaps, eight with Ariana and Arenauta. They stay
  editorial until the Comune's map of the quartieri arrives — the author has
  asked for it — and that map becomes an overlay, not the zones (D2).
- **Geolocation** — "you are here" plus what is around you while walking
  Gaeta. The author wants it and it fits the product; it is a **feature, not a
  style**: browser permission, HTTPS (so it depends on item 3), sane handling
  of a denied permission and of GPS that is 50 m wrong inside the old town,
  and a spatial endpoint — `/api/map/features/` returns everything, unfiltered.
  Its own phase, its own spec section.
- **Multi-city and the superadmin** — the larger ambition: once Gaeta is the
  worked example, offer the same instrument to other towns, with an admin who
  can change palette, name and city centre. Item 1's D8 (colour in tokens, never
  in a component) is what keeps this from costing a second redesign. The other
  things hard-coded to Gaeta, for whoever picks it up: the map centre in
  `GaetaMap.vue` (`useLeafletMap.ts` held a second copy until D19 retired it),
  **`MAP_CENTER_LAT` /
  `MAP_CENTER_LNG` in `backend/backend/settings.py`** (added 2026-09-05 to
  refuse overlay geometry that cannot be this town — the *second* place that
  knows where Gaeta is, and the one a move would most easily miss: the symptom
  would be the new town's boundaries rejected as "non sono da queste parti",
  with a message about coordinate order sending the reader somewhere else
  entirely), the product name, and an Italian-only UI (which the v2 spec still
  lists as a non-goal until translated content exists).

## 8. Explicitly not planned

The spec's non-goals (§10): mass signup, reader comments, notifications,
machine translation, multilingual UI (until translated content exists),
election-operations tooling, new work on polls.
