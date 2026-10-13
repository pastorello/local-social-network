# «Che si fa a Gaeta?» — a proposal for the day

> **Proposed 2026-09-22.** *(Decided since: Part −1, 2026-10-13.)* This is
> the file to argue with, written before any code per the repo's rule that scope
> changes start in the spec (the `libri` precedent, content.md). It follows the
> house shape — a committed answer, then the counter-case that lost — so that
> what is wrong is visible enough to overturn in one sentence. Where a decision
> already exists in `docs/spec/` or `docs/adr/`, it is quoted rather than
> re-argued.
>
> Provenance: the author's own description, plus a case-space sweep over the
> existing specs, the data model and the web (2026-09-22). Five questions at the
> foot (§4) are the ones he has to answer; everything else follows from them.

> **Decided 2026-10-13 — read Part −1 first.** The author answered the open
> questions one at a time; Part −1 records the seven decisions and the build
> order, and it supersedes everything below where they disagree.
>
> **Committed 2026-10-12 as a draft spec, at the author's request — still not a
> decision, and nothing in it is scheduled.** It sat untracked from 2026-09-22
> to 2026-10-12; it is in the repo now so it cannot be lost and so the next
> session can argue with it in a diff. What it records as the author's own
> answers (§0.2b and §0.7, 2026-09-24) are his; everything else is a proposal.
> **ADR-0008 is written** (2026-10-12,
> [0008-opening-hours-as-dated-testimony.md](../adr/0008-opening-hours-as-dated-testimony.md)),
> and the author has made this module the next phase. Where this draft and the
> ADR disagree, the ADR wins — in particular §0.5's replacement text for
> design.md, written before §0.2b relaxed the refusal, is superseded by it.
>
> What changed in the repo while it was untracked, so the text below is read
> against today's code rather than September's: the four debt items it names as
> competing work are paid (TD-47, TD-48, and the two it found itself, TD-49 and
> TD-50 — see `docs/tech-debt-archive.md`), and **TD-50 built the refactor
> §2.1 and §7 call owed**: `replace_points` is a diff by id and `Stop.point` is
> a foreign key to the pin, no longer a position. The notes inline say where.

> ---
>
> **CORRECTED BY THE AUTHOR, 2026-09-22, before anything below was acted on.**
> Everything under "What it is" and §Requirements was written on the assumption
> that this module is a **curated proposal** that picks one item per row. It is
> not. In his words:
>
> > «l'ospite si chiede cosa è possibile fare un dato giorno e i risultati sono
> > l'elenco di tutto ciò che *è aperto ed è nella zona selezionata*, poi se la
> > fascia oraria e il giorno in particolare lo permettono, si mostrano ANCHE i
> > tour compatibili con lo spazio temporale e la zona selezionata»
>
> It is a **filtered index**, not a proposal. Three immediate consequences,
> pending the revision:
>
> 1. **Q3 dissolves, in the module's favour.** If everything matching is shown,
>    nothing is *picked* — so D12's "rectangle waiting to be sold" and "the
>    first page in this archive nobody signed" both lose their force. The
>    editorial problem shrinks to the *order* of the list, which is a smaller
>    and more answerable thing.
> 2. **K1 becomes the spine, not something to route around.** *Aperto* is the
>    predicate that defines the list. Q1's recommendation — that the module
>    makes no availability claim at all — is incompatible with this reading and
>    has to be replaced, not re-argued.
> 3. **A third free-text-versus-structured collision, not previously named:**
>    "tour compatibili con lo spazio temporale" has nothing to compute on.
>    `Itinerario.duration` is a free-text `CharField` («mezza giornata»),
>    deliberately — the same principle as `Feste.recurrence` (K2) and
>    `Personaggio.life_dates`.
>
> Requirements written for a proposal — CF8, CF9, CF10, CF15, CF40 and Q3 in
> particular — are suspect until triaged. CF5 ("ranks and phrases, never
> excludes") is the crux: an index filtered by *aperto* excludes by definition.
> The revision resolves it.
>
> **The revision is Part I below.** It supersedes points 1–3 of this note
> wherever they disagree.

---

# Part −1 — Decided, 2026-10-13

> **This part is operative. It supersedes everything below wherever they
> disagree**, and Parts 0, I and II stay as the argument that got here. It is
> the output of an interview with the author, one question at a time, on
> 2026-10-12/13, after ADR-0008 had settled availability. Seven decisions,
> then what they cost and what they retire.

## D1 — No day and no time band in the first version

The page is **«Cosa si può fare qui»**: a zone and the activities in it. There
is no day picker and no *fascia* — no `?giorno=`, `?dalle=`, `?alle=`.

The reason is ADR-0008 followed through. Once hours may never filter, the day
and the band had almost nothing left to act on: hours are shown, not used;
Part I §3 had already made a tour "compatible" with any window it could start
in; and a festa's `recurrence` is free text, so nothing knows whether it falls
today. What remained was the light. **The day picker arrives with the first
thing that knows what happens on a given day** — K2's per-year occurrence row
for feste, or eventi (Q5) — and it is additive then: three URL parameters and
the `Europe/Rome` helper Part I §4 describes.

One line about today's light survives — *«Oggi il sole tramonta alle 18:27»* —
because it needs no day picker: it is today, in Gaeta (`lib/when.ts::todayInGaeta`,
pinned to `Europe/Rome`, never a bare `new Date()`). It is the first thing cut
if the page runs long.

## D2 — Editorial zones, drawn once, named the way Gaeta names them

**There is no official division of Gaeta into quartieri online** (checked
2026-10-12). The statute (art. 8) provides elected *comitati di quartiere* and
leaves the rest to a *regolamento per la partecipazione popolare* that is not
published; ISTAT has census sections (official, unnamed, dozens) and no
sub-municipal areas for a town of 19,000; OpenStreetMap has five named
**points** and no boundaries. The author will ask the Comune.

So the zones are **ours, and say so**: *«Zone indicative, non confini
ufficiali»* is printed on the page. The first set takes OSM's five names plus
Monte Orlando — **Serapo, Gaeta Medievale, Porto Salvo, Piana di
Sant'Agostino, Montagna Spaccata, Monte Orlando** — with polygons drafted by
the build on the OSM map and corrected by the author. They are admin-managed
data, not code, so a seventh zone or a moved boundary is an edit. If the
Comune's perimetrazione turns up, it becomes an **overlay** (the mechanism
exists, ADR-0006), not the zones: comitati divide residents, and a guest thinks
in places — Monte Orlando has no residents and is a zone of its own.

**A card joins a zone by where it is, never by a collaborator's choice**:
a place by its pin; a festa when its route passes through; a percorso where it
**starts**; a raccolta wherever **any** of its stops is. A place outside every
polygon is never dropped — it is listed under *«Altrove a Gaeta»*.

## D3 — What a zone lists

- **Rows: luoghi and chiese** — the places you can go to. Each row carries its
  availability (ADR-0008: dated hours and the keeper, when known; nothing when
  not).
- **«Itinerari che passano di qui»** — a block of its own, by D2's rule.
- **«Le feste di questa zona»** — a block of its own, the feste whose route
  passes through, with `recurrence` printed as its author wrote it. The page
  does not claim a festa is today.
- **«Da mangiare»** — **one block for all of Gaeta**, the ricette, not filtered
  by zone. A ricetta is a dish, not a door, and its pins are shops: listing
  them by zone would make this page a directory of businesses, which is
  design.md's Patronage question and not a render decision.
- **Out:** personaggi, dialetto and libri. A historical figure is not a thing
  to do; the monument that may be worth it is a luogo already.

## D4 — The sections are activities, with a fourth: *Camminare*

The same words as `/benvenuto`'s *«Che cosa ti va di fare?»*: **Andare al
mare** (spiaggia) · **Scoprire la città** (chiese; castello, monumento,
luogo-storico, museo) · **Camminare** (punto-panoramico,
area-per-passeggiate, parco) — and **Mangiare** is D3's ricette block. The
mapping is a frontend constant (`lib/intents.ts`); a genre added in Django
admin and not yet mapped renders under *«Altro da vedere»*, never nowhere.
*Camminare* is one seed row in `itinerari`; `/benvenuto` shows it only once a
published tour carries it, so adding it changes nothing a guest sees today.

## D5 — Defaults the author did not object to

- **Alphabetical inside each section, and printed** (*«in ordine
  alfabetico»*): the one order nobody can buy or move (Part I §4).
- **The shell's map draws exactly the page's set**, unnumbered — numbers would
  read as a route (CF16). `stores/map.ts` gains one nullable set of card ids
  for it; it does not write the reader's layer toggles.
- **An empty zone says so** — *«In questa zona l'archivio non ha ancora
  niente»* — and offers the zones that have something.

## D6 — Where it lives, and how a guest finds it

**`/cosa-fare`**, h1 **«Cosa si può fare qui»**. The way in is **`/benvenuto`**:
a second invitation beside the intents (*«Oppure guarda cosa c'è in una
zona»*), so a guest from the QR code chooses between "give me a tour" and "show
me what is here". On a phone it is also in the pill's **Menu**; on a wide
screen, in the pill itself. The phone pill is unchanged (the 2026-09-19
decision stands).

## D7 — The closed church: «Se la trovi chiusa», church by church

`Chiesa.from_outside`, free text, plain-text on the wire (TD-36), translated
per card, shown after the body under the heading *«Se la trovi chiusa»* and
only when filled. Help text for the form: *«Questa scheda la legge qualcuno che
è già lì e ha trovato la porta chiusa. Scrivi che cosa ha davanti e che cosa
può fare nei dieci minuti che gli restano. Fatti, non consolazioni — e niente
orari.»* **No standing paragraph shared by every church**: the author's reason
is that the answer differs deeply from one church to the next. Churches only,
for now; museums and the castle can take the same field the day one needs it.

## D8 — Build now; the invitation opens itself

Built now, on a nearly empty archive, because the engineering is ready and
nothing else is on the board. **The invitation on `/benvenuto` appears only
when at least one zone has at least one published place** — the same rule
`/benvenuto` already applies to intents with no tour. Until then `/cosa-fare`
exists at its address, testable, and no guest reaches it by accident.

**Demo content, for seeing the page full:** a DEBUG-only management command,
`seed_demo`, in `seed_e2e`'s shape — refused outside DEBUG, every card titled
`[DEMO] …`, removable by the same command. It lives in the development database
only and is never the archive's content. Real content keeps content.md's
seeding rules (drafts, own words, *Fonti* and *Da verificare*, no images, no
invented geometry). **No generated images of real places, not even as
placeholders**: a picture of a real place that is not that place reads as a
photograph the moment it is screenshotted. A card with no image already has a
designed look (D7 of design.md, a tint of its layer colour).

## The build, in order

| PR | What | Cost |
|---|---|---|
| 1 | ADR-0008's `content.Availability` (chiese, luoghi) + `Chiesa.from_outside`; admin, API, form controls, reader copy; the invariant tests | about a day — **built 2026-10-13** |
| 2 | `Zona` (admin-managed polygons, the six drafted), membership by D2's rule, `/api/map/zone/` with counts; *Camminare* seeded | about a day — **built 2026-10-13** (#100) |
| 3 | `/cosa-fare`: zone chips, sections, the three blocks, the map's set, the empty state, the self-opening invitation on `/benvenuto`, Menu and pill links; axe cases and one keyboard case | about a day — **built 2026-10-13**; the light line (D1) was cut, as D1 allowed |
| — | `seed_demo` | half a day, beside PR 3 — **built 2026-10-13** |

## What this retires

- **Part I §3** (tours compatible with a time window) — deferred with D1, not
  rejected; it is the design for the day the window exists.
- **Part I §2 and §0.3's closures-and-states machinery as a filter** — ADR-0008
  shows availability, it never removes or groups by it, so §4's *«2 luoghi sono
  chiusi il lunedì — Mostrali lo stesso»* and the *«Non sappiamo se sono
  aperti»* sub-group do not ship.
- **QR1–QR3** — answered: `closing_day` withdrawn (§0.3), the church question by
  D7 and ADR-0008, the grouping by D4.
- **Q2, Q4, Q5** — Q2 by D3 (a dish, not a door), Q4 by D2 (named zones; point
  and radius stay the fallback if names fail a guest), Q5 unchanged (eventi:
  not a card, after the deploy).

---

# Part 0 — Availability, answered

> **Written 2026-09-22, after the author's three corrections. Supersedes Part I §2
> in full.** He asked whether Google Maps can be the source; he rejected the
> `closing_day` model; he confirmed that the tourist finding the church shut is a
> real and known Gaeta problem; and he settled the grouping question — by
> **activity**. This part answers the first three. §8's corrections survive; 8.3
> is absorbed (`Genre.esposizione` is not deferred, it is **deleted**).

## 0.1 — Google Maps: no, and the house rule closes it before the licence does

**The short form, which is this project's own rule and needs no lawyer.** Google
does not permit opening hours to be stored. Verified directly from Google's own
Places policy page:

> "You must not pre-fetch, cache, or store Places API content beyond the allowed
> exceptions" — and the only exception named there is the identifier: "The
> **place ID** […] is **exempt from** the caching restrictions. You can therefore
> store place ID values indefinitely."

If it cannot be stored, it must be fetched **live, on every page view, for every
place in the list**. A twenty-row index is twenty billed calls per load, and the
request goes either from the reader's browser — which is precisely the
third-party request path TD-30 and design.md D6b spent two decisions removing —
or from our server on the reader's critical path, paying per row, keeping
nothing. **That is the whole answer. The licensing below only corroborates it.**

**The licensing, with its status stated honestly.** The research found two
further clauses that close it independently: a *No Use With any Map* restriction
in the EEA Service Specific Terms (reported as §15.1), whose defined term covers
displaying Places content "on, next to, or in a manner that is visually
associated with any map" — and this app is a Leaflet/OSM map under *every* route
(`MapStage`, D13–D21) — plus the global equivalent (reported as 3.2.3(e) / SST
§14.2) and a *No Caching* clause (reported as 3.2.3(b)) whose only Places
exception is latitude and longitude for 30 days.

> **⚠ These clause numbers are NOT verified in this session.** `cloud.google.com`
> could not be reached from here, and the numbering has changed between versions
> of these terms. **Before ADR-0008 quotes any of them, pull the text.** A clause
> number that is wrong is worse than a citation that is absent. What *is*
> verified, by direct fetch, is the policy-page caching rule quoted above — and
> that alone is sufficient for the decision.

**What stays legal, and is already what the codebase does:** `place_id` may be
stored indefinitely, and a plain outbound anchor for directions is what
itinerari.md already permits — *no key, nothing of Google loaded on our page*.
That is the entire relationship with Google, now and later.

**A provenance rule to write down, because it is the way this gets violated by
accident:** hours and closures enter this archive **from a door, a telephone
call, or the custodian's own page — never from Google Maps, in either
direction.** A collaborator reading a time off the Google Maps app and typing it
into a card is the same act as copying it into OSM, where it is a bannable
offence. Copying a compiled list from a local site is limited not by copyright —
a closing time is a fact, and facts are free — but by the **sui generis database
right** over the compilation.

## 0.2 — There is no source we may lawfully keep

| Source | Has hours? | **May we store it** | Gaeta coverage |
|---|---|---|---|
| **Our own collaborators** | as observed | **Yes, unconditionally** | whatever we go and get |
| OpenStreetMap (ODbL) | yes, as a tag | **Yes**, with attribution | **1 of 42** places of worship — *measured* |
| Wikidata (CC0) | properties exist | Yes | 0 |
| Foursquare OS Places (Apache-2.0) | **no such field** | Yes | — |
| Overture Places (CDLA-Permissive-2.0) | **no such field** | Yes | — |
| Google Places | yes, the right model | **No** | blocked before coverage matters |
| HERE / TomTom / Mapbox / Apple / Yelp / TripAdvisor | yes | No (caps of 30 days / 24 h / provider-map-only) — *clause text unverified* | — |
| orarimesse.it (CEI) | **mass times, not visiting hours** | No | see §0.4 |

**Of the sources we may keep forever, all but one carry no opening-hours field at
all — and the one that does has a single Gaeta church.** Measured here via
Overpass on 2026-09-22: **42 places of worship, exactly 1 with `opening_hours`,
0 with a telephone number**, 6 with a website, 25 with a wikidata id. The one
with hours is the Santuario della SS. Trinità — the Montagna Spaccata — and the
research reports its stored value is half an hour wrong against the custodian's
own published time, which would make the usable coverage **zero**.

So: **there is no import, at any price, in any jurisdiction.** Every hour and
every closure in this archive is one a person went and got. That reframes
design.md's refusal rather than overturning it — the refusal assumed hours would
be imported and rot. The question was never sourcing. It is editorial process.

## 0.2b — The author's decision, 2026-09-24: build the field, fill it over time

> «non posso andare a chiedere gli orari, l'importante è che nel modulo ci sia la
> possibilità di inserirli, poi col tempo riempiremo tutti i contenuti»

**This settles §0.7 and changes what is being designed.** Nobody is going to
collect availability data as a project. What is owed is a **field that is correct
while empty**, that any collaborator can fill the day they happen to know
something, and that never has to be filled for the module to work. Three
consequences, and they simplify the design rather than complicating it:

1. **Empty is the designed state, not the degraded one.** On the day this ships,
   0 of 16 churches have hours, and in a year it may be 4. The module must be
   useful and honest at 0% fill and merely *better* at 40% — never a page that
   only works when full. Anything whose value depends on the archive being
   complete is out of scope by this decision.
2. **The refusal of a *schedule* (§0.3) is relaxed, deliberately, by the
   author.** He was told a stored hour ages and reaffirmed the direction; that is
   his call and it is recorded here as one. What replaces the refusal is not
   discipline but **provenance**: an hour in this archive is never a promise, it
   is a **dated testimony**, and the date is rendered to the reader. `design.md`
   refused *«a wrong opening time»*; a line that reads *«orari che ci ha dato la
   parrocchia il 12 marzo 2026»* is not one, because it does not claim to be
   current — it claims to be what somebody was told, which is true forever.
3. **Therefore the module does not filter on hours, and will not for a long
   time.** Not by principle now, but by arithmetic: a filter computed from a
   field that is empty on fifteen cards out of sixteen removes nothing and
   implies completeness the archive does not have. Hours are **displayed** from
   day one and **filtered on** only if a later count makes it worth it — an
   additive change, and one that can then be designed against real strings
   instead of imagined ones.

### The field

`content.Availability`, one row per card, `ACCESS_TYPES = ('chiese', 'luoghi')`:

```python
state         = CharField(16, choices=STATES, default=UNKNOWN)
hours         = TextField(blank=True, default='')      # PlainTextField on the wire (TD-36)
hours_updated = DateField(null=True, blank=True)       # set on save when `hours` changed
keeper        = CharField(140, blank=True, default='')
keeper_phone  = CharField(32,  blank=True, default='')
```

**`hours` is free text, and that is the considered answer to his cardinality
objection, not a retreat from it.** He was right that a single closing day is a
model whose cardinality is a lie. So is a weekly grid: it cannot hold *«la
mattina, e il pomeriggio solo d'estate»*, *«quando c'è il sacrestano»*, or the
Cattedrale's actual arrangement, which is a calendar republished monthly on
Facebook. Free text holds all of them and is enterable by anyone, which is the
property this decision asks for. It also follows this repo five times over —
`recurrence`, `life_dates`, `year`, `servings`, `duration` are every one of them
free text, and the reason recorded each time is the same: the world is messier
than the column. A structured copy is the *extension*, added when there are
enough real strings to design it from; design.md already recorded that the Venice
map's structured copy was lossy, and guessing the shape now is how that happens
here too.

**`hours_updated` is the load-bearing field, not `hours`.** It is set
automatically — no collaborator maintains it — and it is *rendered*, never used
as a trust gate or a TTL. It is what turns a stale hour from a false promise into
an old fact, and it costs one column and one line of copy.

**Form:** two controls for the whole feature (a `select` for `state`, a
`textarea` for `hours`), plus the two keeper fields. Placeholder:
*«Es. Lun-Sab 10:30-12:30 e 16:00-17:00; domenica solo per la messa delle 11»*.
Help: *«Scrivi quello che sai, come lo sapresti dire a voce. Se non lo sai,
lascialo vuoto: vuoto è meglio di sbagliato, e la scheda funziona lo stesso.»*

**Reader copy.** With hours: the text, then *«Orari segnalati il 12 marzo 2026 —
telefona per sicurezza.»* Without: nothing at all — no heading, no placeholder,
no «non sappiamo» on every card. The standing paragraph in §0.4 is already the
honest answer, and printing an absence sixteen times is how an archive
apologises instead of informing.

**Invariants that survive this relaxation and must not be quietly dropped:**
absence still resolves to *unknown*, never to open; nothing anywhere computes or
renders *«aperto ora»*; and no code path treats `hours` as authoritative enough to
remove a card from a list.

## 0.3 — He is right about `closing_day`, and the replacement is smaller, not bigger

*«Dire "closing day" sembra asserire che un'attività ha sempre uno ed un solo
giorno di chiusura»* — correct, and the objection is sharper than it looks: a
single nullable weekday is a model whose **cardinality is a lie**. Google's own
schema agrees (`periods[]` keyed by weekday, several per day), and so does OSM's
grammar. `Luogo.closing_day` is withdrawn. `Genre.esposizione` is deleted.
`Chiesa.solo_funzioni` as a boolean is withdrawn.

**The governing idea, which survives every variant below:**

> **The archive stores only closures. No field on any model may hold an opening
> time — so the sentence «è aperto» is not expressible, not by discipline but by
> shape.**

That answers his cardinality objection in full *and* keeps design.md's refusal
exactly where it pointed: at the **positive** claim. A wrong opening time is
still worse than none. A wrong *closure* costs a guest a place they can still see
on the page and restore with one tap — and that is the direction this archive is
willing to be wrong in.

**What ships first — three fields, one control.** The research proposed a
five-field model whose second field is a hand-typed DSL subset of the OSM
`opening_hours` grammar (`Lu-Ve 13:00-16:00 chiuso`). The adversarial read was
right that this is the wrong first release, and its argument is the one this file
makes everywhere else: **it would ship for five cards, and it asks non-technical
collaborators to type expert syntax on a phone.** So:

```python
class Availability(models.Model):          # content/models.py, beside MapFeature
    card         = OneToOneField(Card, primary_key=True, related_name='availability')
    state        = CharField(max_length=16, choices=STATES, default=UNKNOWN)
    keeper       = CharField(max_length=140, blank=True, default='')
    keeper_phone = CharField(max_length=32,  blank=True, default='')
```

`state`: `unknown` (default) · `no_door` · `services` (si entra solo durante le
funzioni) · `on_request` · `works` (chiusa per lavori). `ACCESS_TYPES =
('chiese', 'luoghi')`, in `maps.CARD_TYPES`' shape. **No parser, no dependency,
no date column, no TTL, no cron.** `clean()` refuses `no_door` on a `chiese`
card, because a church has a door, always.

**The closures grammar is the extension, not the release.** It arrives when the
church archive is large enough that a state enum stops discriminating — and when
it does, it is `off`-rules only, which is what keeps the parser small and safe: a
closures-only rule set is purely **additive**, a union of intervals, so the one
genuinely subtle thing in the `opening_hours` grammar (a later rule *overriding*
an earlier one) never arises.

**Invariants that must survive any version:** (i) nothing can assert open —
`resolve()` returns an enum with exactly two members, `CHIUSA` and `SCONOSCIUTO`,
and there is no `APERTA` to render; (ii) absence resolves to unknown, never to
open — with tests named after the mistake a future contributor will make,
`test_no_row_is_unknown_not_open`; (iii) no verification date that becomes a
chore; (iv) a claim traces to a person.

**The gap this leaves, named rather than hidden:** with only a state enum, a
reader asking *«cosa faccio martedì alle 15»* gets **every church back, labelled
«non sappiamo»**. For chiese — which the measured archive *is* — **the filter
does not filter.** That is the honest cost of refusing to store opening times,
and it is the trade the next section argues is worth taking.

## 0.4 — The church problem, answered

His second point is the real brief. The decisive fact came from the custodian's
own site, verified here directly:

> **The Cattedrale does not publish opening hours at all.** `cattedralegaeta.it`
> directs the visitor to Facebook, where *«viene pubblicato mensilmente il
> calendario delle aperture»* — a calendar republished **every month**.

**The institution that holds the keys will not commit to a stable schedule.** No
column in our database can hold what its owner republishes monthly. That is not
an argument from principle; it is the shape of the thing.

Also verified on that same site, and it kills the most attractive alternative:
**celebrations are suspended at the Annunziata, San Francesco and San Giovanni a
Mare.** So *«the church is open around the mass»* is false for **three of the
five churches in the archive** — mass times are not the wedge they looked like.
(Cathedral masses: Sun 11:00, Mon–Sat except Tue 18:30.)

**Ranked by problem removed ÷ cost forever:**

1. **`Chiesa.from_outside` — «Se la trovi chiusa».** A `TextField`, exactly
   `Luogo.how_to_get_there`'s shape, `PlainTextField` on the serializer (TD-36),
   never parsed, never filtered on, translated per card. It removes **none** of
   the wasted walks and **all** of the empty visits, at the cost of prose in a
   card being written anyway. A facade does not close, so it has no cadence and
   no expiry. This is the product's own claim — *«Google Maps is for going
   somewhere; Vivere Gaeta is for knowing the place»* — cashed at the exact
   moment it is worth something.
   Form help text, which is the guard that stops it drifting into a schedule:
   *«Questa scheda la legge qualcuno che è già lì e ha trovato la porta chiusa.
   Scrivi che cosa ha davanti e che cosa può fare nei dieci minuti che gli
   restano: la facciata, il campanile, il sagrato, la cosa a cinquanta metri.
   Fatti, non consolazioni — e niente orari: qui dentro un orario non ci va
   mai.»*
2. **The standing paragraph — the answer that needs no schema.** Printed at the
   foot of every chiesa card whether or not anything else is filled:
   *«Le chiese di Gaeta si aprono a ore, spesso solo la mattina, e le apre chi ne
   ha le chiavi. Gli orari non li teniamo: una riga sbagliata qui ti farebbe fare
   la strada per niente. Se ci tieni a entrare, telefona la mattina stessa.»*
   True, useful to someone deciding when to set out, and it explains the gap
   without confessing to one.
3. **The telephone and the custodian** — `keeper` / `keeper_phone`, printed as a
   line on the card, not behind a tap. **The only candidate that answers the
   funeral and the restauro**, which no schedule reaches.
   **Verified here from the primary source: Parrocchia della Cattedrale,
   `0771 462255`, `info@cattedralegaeta.it`** — which also covers San Giovanni a
   Mare and San Francesco. The other three numbers the research returned
   (Annunziata, PIME/Montagna Spaccata, Palazzo De Vio) are **not verified in
   this session and must be dialled or re-checked before any of them is printed.**
   One of the numbers it originally offered was withdrawn by its own verifier as
   unsourced, which is the reason for this rule and not a hypothetical.
4. **The state enum** (§0.3) — wrong in the recoverable direction, one control.

**Refused, permanently, with the reasons in the ADR so they are not
re-proposed:** full opening windows (they manufacture a failure that does not
exist today — the confident wrong walk, which the reader charges to us); and mass
times (suspended at three of five, and the CEI widget would be a third-party
request in the reader's browser, which D6b refuses before anything else does).

*Counter-case that lost, and it must be said out loud:* he asked about a tourist
who *«vorrebbe visitare una chiesa»* — go **in**. Someone who came for the crypt
gets a paragraph about the campanile instead, and calling that the answer is a
consolation sold as a solution. Accepted and named: it is the best available
answer to a problem with no good answer, and the copy must never imply otherwise
— *«vale la strada lo stesso»*, never *«non ti sei perso niente»*. The section
sits **after** the body, and its heading is conditional, so a reader who got in
skips a line rather than reading an apology.

## 0.5 — design.md, and ADR-0008

design.md named this scene as the product's home ground — *«standing in front of
a church that is closed»* — and then, eleven lines from the end, refused the only
feature that addressed it. **The scene was named and left unserved.** The author
has now confirmed it is real and routine. That is a reason to reopen with his
evidence, not against it.

Note precisely what the refusal objects to: *a wrong opening **time***, a
positive claim that turns out false. Nothing in §0.3 can make one. The worst this
model does is stay silent about a church that is in fact shut — which is today's
behaviour.

> **Replacement for design.md's *Considered and not taken* entry:**
> **"Open now" and opening hours — *amended 2026-09-22, see ADR-0008.*** The
> refusal of a *schedule* stands, on every type, forever: **no field on any model
> may hold an opening time.** What is admitted is the negative half — one row per
> card holding a state, the custodian who holds the keys, and (later) closures
> only — because none of it can be filled in to say a door is open. A wrong
> opening time is still worse than none; a wrong closure costs a guest a place
> they can still see on the page. What answers the closed church is not the
> schedule but the prose beside it: `Chiesa.from_outside`, *«Se la trovi
> chiusa»*, and a telephone number.

*(Superseded: ADR-0008 was written on 2026-10-12 from §0.2b, which came after this
section and admits dated free-text hours. The replacement entry above is not the
one design.md carries.)*

**This is ADR-0008**, written before any code: it reverses a recorded decision,
touches itinerari.md's restatement of it, and adds a column that will hold
hand-collected data for years. **Part I §2.7's own amendment text must be
rewritten with it** — its wording ("nothing with a clock in it") is contradicted
the day closures arrive.

## 0.6 — What is still not designed

Stated because the availability model is the *easy* half and it has absorbed all
the attention:

- **The module's own three controls** — the day picker, the time band, the zone —
  are still undesigned and uncosted. That is the actual product.
- **How a festa enters an index of "what's on today"** while `recurrence` is free
  text (K2). Unanswered, and 2c still has no mechanism.
- **The backfill:** who fills sixteen churches, and what the index looks like on
  day one when every row is `unknown` (answer: a no-op filter).
- ~~**TD-47 and TD-48** remain the open engineering debt this competes with.~~
  *Both paid 2026-10-12; nothing engineering competes with this now.*

## 0.7 — ~~The question left~~ — answered 2026-09-24

> **Answered: no.** He will not collect the hours; the module carries the field
> and the archive fills over time. See §0.2b, which supersedes this section. The
> paragraph below is kept because its argument — that the custodian is the
> highest-value fact and never expires — still decides what a collaborator should
> fill in *first* when they do know something.


> **Telefoni tu ai custodi, una volta sola, e scrivi chi tiene le chiavi di ogni
> chiesa?**

There is no import, at any price — §0.2 is the proof — so this archive's
availability data is whatever the author and his collaborators go and get, and
the **custodian** is the highest-value thing to get first: it never expires, it
answers the funeral and the restauro that no schedule reaches, and it is the one
line on the page that cannot be wrong.

**Do not answer it before the content.** Five real church cards are drafts; the
two published ones are stubs duplicating them; not one of Gaeta's seven beaches
exists as a card. The module is not blocked on the availability model.


# Part I — The revision

> **Written 2026-09-22, after the author's correction and in its light.** This
> part is operative; Part II below is the original draft, kept because its
> arguments are still the arguments and its ids are how everything here is
> addressed. Where the two disagree, this part wins, and §5 says id by id which
> of them died.
>
> One thing to be honest about before anything else, because it changes how much
> of this is a reopening. **`docs/spec/cosa-fare.md` is not a decision.** It is
> untracked *(committed 2026-10-12, as a draft)*, it opens by saying nothing in it is decided, and `lib/when.ts`,
> `Zona` and the fasce table do not exist. So triaging CF1–CF47 is triaging my
> own unaccepted draft, not overturning the repo. Exactly **one** accepted
> decision is reopened below — design.md's refusal of opening hours — and §2
> says so in its own words rather than letting it arrive inside a schema diff.

## 1. What the correction changes

The module is a **filtered index**, not a curated proposal. The guest asks what
is possible on a given day; the answer is everything the archive holds that is
open and in the chosen zone, plus the tours that fit that zone and that window.
Nothing is picked, so nothing is *not* picked.

**What that genuinely dissolves.** D12's "rectangle waiting to be sold" goes:
a proposal had N rows and therefore a scarce position, and an index has as many
rows as there are matches. Q3 goes with it — there is no composition to sign, so
I10's objection (the server assembling what the guest was forbidden to assemble)
has nothing to object to. CF9's stable hash, `?variante=` and *«proponimene
un'altra»* go, because there is no pick to make reproducible. CF15's byline
problem goes: nothing is recommended, so `CardGridEntry` is left alone. CF8's
"at most one proposal per row" goes. CF43's rotation arithmetic goes, and with
it the module's only variety mechanism — **an index shows the same archive every
morning, and an index that varied would be lying about being one.**

**What it does not dissolve, and this is the part it would be easy to overclaim.**
Completeness is a property of a *set*; a page is also a *sequence* and a
*layout*. The set cannot be bought. The order, the grouping and the presence of a
cover image can be, unless each is chosen not to be — which is why §4 prints the
order and refuses covers, and why CF40 survives with its subject changed from the
pick to the `ORDER BY`. And the correction creates one exposure a proposal never
had: under a proposal an unlisted bakery was merely unpicked today; under an
index it is **absent from a page that says it lists everything in the zone**.
That is a larger claim than this product has ever made, and it is the first
surface where *«perché io non ci sono?»* has a page to point at. §4 answers it
with the title, not with a disclaimer.

**What it makes unavoidable.** *Aperto* is now the spine, so Q1's recommendation
— that the module make no availability claim at all — is replaced, not re-argued;
§2 does that. CF5 has to say what may exclude, since an index filtered by *aperto*
excludes by construction. CF11 stops being good manners and becomes the render
contract. CF46's "the pick cannot run over page 1" becomes "a list claiming
completeness cannot be composed over page 1", which is a failure of the page's
only promise rather than a subtle bug. CF36 stops being a duty and becomes a
precondition: an index does not rotate past an invented bakery, it prints it.
And K2 stops being an enhancement — a procession that *is* happening today and
is missing is a false negative on a page whose whole contract is completeness.

## 2. The availability model

> **«Un archivio può dire che un posto è chiuso. Non può dire che è aperto.»**
> Every availability fact this product stores is either a property of a *kind* of
> place, set once by the admin on an eight-row table, or a *closure* a named
> collaborator wrote on one card — and no field anywhere, on any type, can be
> filled in to mean "open". Nothing carries an hour, nothing carries a
> verification date, nothing expires, and nothing needs re-walking.

Call it **«Accesso»**. It is four small things and no new app.

### 2.1 Schema

**(a) `luoghi.Genre.esposizione`** — `CharField(max_length=10, default='porta')`,
choices `sempre | diurno | porta`, admin-only, eight rows, seeded by a data
migration in `0002_seed_genres.py`'s shape.

- `sempre` — no gate, and a night thing in its own right. The lungomare, the sand.
- `diurno` — no gate, but pointless or dangerous in the dark. The paths on Monte
  Orlando, a cliff staircase.
- `porta` — somebody unlocks it. **The default**, for the same reason ADR-0006
  defaults `Overlay.visibility` to `steering`: a ninth genre added through one
  Django admin form claims nothing until a person classifies it.

The eight rows, per slug, because this is the table the whole feature turns on
and the prior board did not agree on two of them:

| slug | esposizione | why |
|---|---|---|
| `spiaggia` | `sempre` | the demanio is public; Serapo at 22:00 in August is real |
| `monumento` | `sempre` | in this taxonomy a monumento is the Mausoleo di Munazio Planco — a thing standing in the open |
| `punto-panoramico` | `diurno` | somewhere you stand, and only worth standing there with light |
| `area-per-passeggiate` | `diurno` | the Monte Orlando paths |
| `parco` | `diurno` | **the weakest row here.** In Gaeta the parco is Monte Orlando, ungated; elsewhere it is a villa comunale with a gate at eight. It is `diurno` and not `sempre` for that reason, and it is the first row to flip |
| `castello` | `porta` | ticket, gate, and the Angioino-Aragonese is partly a military academy opened for exhibitions |
| `museo` | `porta` | obviously |
| `luogo-storico` | `porta` | Google's `historical_place`, the taxonomy's catch-all. A kind whose members disagree with each other by construction takes the restrictive value, same rule as the default |

Two guards, both cheap, both proposed by the losing models and both worth taking:
a backend test asserting the eight flags **by slug**, so flipping one is a
deliberate act with a red test attached; and a rule beside content.md's "No
invented geometry", because a kind-level claim asserted from memory is the same
class of mistake as a reconstructed route and is permanent where the route is
merely empty — ***un genere lo classifica chi si è trovato davanti ad almeno uno
dei suoi luoghi, e il commento della migrazione dice quale.***

**(b) `Luogo.accesso`** — the same three values plus `''`, blank meaning *inherit
the genre*. **`clean()` refuses a value less restrictive than the genre's.** This
is the whole repair of the kind-level model's one fatal flaw: the collaborator
who knows the Villa Comunale gates at eight has somewhere to say so, and the
collaborator who feels generous about the Parco di Monte Orlando has nowhere. The
override is authority in exactly one direction, and every use of it moves a place
toward *less* claimed availability.

**(c) `Luogo.closing_day`** — nullable, seven weekdays, **and no «aperto tutti i
giorni» value, ever**. Plus `Luogo.closing_note`, 140 characters of prose through
`content.fields.PlainTextField`, printed verbatim, never parsed, never filtered
on. This is the only field in the feature that can remove a row from a day, and
it is a fact with an author and a one-form correction path.

**(d) `Chiesa.solo_funzioni`** — one nullable boolean. True renders *«Aperta solo
durante le funzioni»*; **blank means we have not said, and never means open.**
A two-valued enum with a `visita` member was on the table and is refused: `visita`
says a guest can get in, which is false of most Italian churches between 12:30
and 16:00 and is the exact claim this model exists not to make. Chiese are
`porta` by a module constant beside `maps.CARD_TYPES`; there is no genre on chiese
and there never will be (content.md).

**No field on `feste`, `ricette`, `personaggi`, `dialetto`, `libri`,
`itinerari`.** A festa is an occurrence (K2), not a door. A book has no door. A
ricetta does not open — the bakery does, and **CF36 forbids reading a ricetta's
pins for anything at all** until somebody has stood in front of them. A tour's
compatibility is derived from its stops and never stored.

**(e) The sun.** `lib/sun.ts` over **suncalc** — MIT, 2.7 KB, zero dependencies,
by the author of the Leaflet this repo already ships — pinned, in its own PR,
which is CF6's committed shape word for word ("a pinned dependency in its own PR,
not hand-rolled solar arithmetic"). A checked-in 366-row table was the
alternative; it is hand-auditable against an almanac, which suncalc is not, and
it loses because it would be a third per-town constant that multi-city has to
regenerate, where a library fed coordinates does not. It is fed from **one
frontend constant**, extracted from `GaetaMap.vue:68`'s literal — not from
`MAP_CENTER_LAT`/`LNG`, which are Django settings (`settings.py:235`) that no
browser can read and which several earlier drafts of this file named by mistake.

**What the schema deliberately does not contain**, written here so it is not
re-proposed one size at a time: opening and closing times; a `checked_on` or
`verified_at` date; a TTL or staleness banner; a season window; a dated-closure
table; a reminder, cron, queue or worker (CF26); any schedule hanging off a
`MapFeature` — which is why this model has **no** `MapFeature.key` prerequisite
and needs no diff-based `replace_points`. That refactor is real and owed
(`replace_points` deletes and re-creates every pin on every save, eight call
sites across `chiese`, `ricette`, `personaggi`, `luoghi`, and
`itinerari.Stop.point_index` is positional fallout) — but it is tech debt, not the
first half-day of an availability feature. *(Paid 2026-10-12 as TD-50: a diff by
the pin's id, with `Stop.point` a foreign key — not a `key` column.)*

**CF1 is not tripped, and that is a property of the model rather than luck.**
Nothing here is a stored calendar date: a weekday is an enum, `esposizione` is an
enum, `solo_funzioni` is a boolean. `TIME_ZONE` stays `'UTC'` and moves the day an
evento or K2's occurrence row lands, exactly as CF1 says.

### 2.2 Italian copy

**Django admin — `Genre.esposizione`** · verbose_name: «esposizione» ·
opzioni: «Sempre accessibile, anche di sera» / «All'aperto, si visita con la
luce» / «Ha una porta: gli orari non li conosciamo» · help_text: «Vale per ogni
luogo di questo genere, oggi e in futuro. Se anche uno solo può trovare un
cancello chiuso, scegli “Ha una porta”.»

**Form luogo — `accesso`** · etichetta: «Questo posto ha un cancello?» · opzioni:
«Come tutti i luoghi di questo genere» (predefinita) / «Si visita solo con la
luce» / «Ha una porta o un cancello» · aiuto: «Puoi solo dire che questo posto è
*più* chiuso degli altri del suo genere, mai più aperto. Se pensi che sia il
contrario, scrivilo a chi cura l'archivio: si cambia il genere, non la scheda.»

**Form luogo — `closing_day`** · etichetta: «Giorno di chiusura» · aiuto: «Il
giorno in cui è chiuso tutto l'anno. Se non lo sai con certezza lascia “Non lo
sappiamo”: una risposta sbagliata è peggio di nessuna risposta.» · opzioni,
nell'ordine: «Non lo sappiamo» (prima, predefinita) · «Lunedì» … «Domenica».
**L'opzione «Aperto tutti i giorni» non esiste.**

**Form luogo — `closing_note`** · etichetta: «Altre chiusure» · placeholder: «Es.
chiuso anche il 25 dicembre e il 1º gennaio; d'inverno apre solo la mattina.»

**Form chiesa — `solo_funzioni`** · etichetta: «Si può entrare solo durante le
funzioni» · aiuto: «Spunta solo se lo sai per certo. Lasciarlo vuoto non vuol dire
che la chiesa sia aperta: vuol dire che non lo abbiamo scritto.»

**Scheda** · «Chiuso il lunedì» · «Aperta solo durante le funzioni» · «Sempre
accessibile» · «Si visita con la luce: oggi il sole tramonta alle 18:27» ·
**e, su ogni scheda `porta` senza nient'altro da dire:** «Non conosciamo gli orari
di questo luogo.»

**Indice** · «2 luoghi sono chiusi il lunedì.» + «Mostrali lo stesso» ·
sottogruppo: «Non sappiamo se sono aperti» — «Questi luoghi hanno un orario e noi
non lo teniamo: telefona o chiedi prima di salire.» · riga in fondo, una volta
sola: «Gli orari ce li dicono le persone che ci sono state, non un servizio
automatico. Prima di salire, telefona.»

**Il progetto** · «Sappiamo dire quali giorni certi posti sono chiusi, e quali
posti non chiudono mai. Gli orari no: quelli non li inventiamo.»

### 2.3 What a collaborator fills in

**One beach — Serapo.** Nothing. `Genre` is `spiaggia`, `esposizione` is `sempre`,
`accesso` stays blank, `closing_day` stays «Non lo sappiamo». **Zero extra
fields, forever**, and the card is truthful in 2030.

**One church — la Cattedrale.** One checkbox, and only if it is true. The form
gains `solo_funzioni` and nothing else. If nobody ticks it the card says «Non
conosciamo gli orari di questo luogo», which is what it says today, with a
sentence instead of a silence.

**One museum — il Museo Diocesano**, the expensive case and there are four or
five of them in the whole archive's future: one select (`closing_day` → Lunedì),
optionally one line of prose (`closing_note`). Two fields, once, never revisited.

### 2.4 What it shows when nobody maintains it

Unmaintained is the designed state. `esposizione` is a fact about a *kind*, and
kinds do not drift; `closing_day` and `solo_funzioni` rot slowly, with no signal
when they do, exactly as `closing_note`, `recurrence`, `life_dates` and
`how_to_get_there` already rot — and in the recoverable direction, since a stale
closure costs a guest a place they can see on the page and restore with one tap,
while a stale *opening* would have cost them the walk. **There is no state in
which unmaintained data renders as «aperto».**

Said plainly, and it is the sentence the author should read twice: **on today's
database this feature is invisible.** `luoghi` has zero rows — not one of Gaeta's
seven beaches exists as a card — while `chiese` has sixteen (five published, of
which three are e2e fixtures) and every one of them is a door. So `esposizione`
classifies an empty table, `closing_day` is offered on no card, and the only
thing that renders is `solo_funzioni` on the churches somebody ticks. That is
correct behaviour and not a gap, and it is why §7 builds the index *without* this
column first and gates the column on CF35's floor.

### 2.5 What it cannot answer

Whether anything is open at 15:00 on a Tuesday. Whether the Castello is open at
all. 25 December, a *chiusura straordinaria*, a restoration — the weekday model
is structurally blind to all of them and always will be; `closing_note` mitigates
and does not solve, and anyone who thinks this handles Christmas is about to ship
a lie. And **permanent closure**: a church shut for restauro in 2029 renders
exactly like a church nobody got round to describing.

### 2.6 The counter-case that lost

The runner-up was **«Orari verificati»** — a real opening model: an `orari` app
with layered season and weekday rules, dated closures, a required `checked_on`, a
twelve-month TTL with a season-aware staleness rule, one server-side resolver, and
three honest buckets in the index. It is better engineering than what won and it
is the only model on the board that can ever produce the single most useful
sentence this feature could generate — *«Chiuso adesso — apre alle 16:00»*. Its
invariant (`resolve()` returns *unknown*, never *closed*, when no rule matches)
is right, and its **three-bucket render contract is the best idea anyone had**,
which is why §4 keeps it as presentation.

It lost on the archive, not on the argument. Its own maintenance estimate —
"10–20 schedules at maturity" — was built against `luoghi.Genre`, a table with
zero rows, and the archive is sixteen churches. A church card goes from about
five inputs to about twenty per schedule, plus an annual re-walk of every door,
owed forever by a circle with one confirmed member and eleven drafts unpublished
since 2026-09-11. It would be four to five days, roughly four times this repo's
median feature, and its first half-day is a diff-based rewrite of the shared pin
write path whose failure mode is one bakery inheriting another bakery's hours.
And its own best objection is unanswerable on this archive: the bucket that can
say «aperto» fills with beaches and walks, which nobody was uncertain about,
while the castle, the museum and the churches — where *«aperto?»* is a real
question — accumulate in «non conosciamo gli orari».

Two things are grafted from it and named as grafts: the three-bucket idea, in the
reduced form §4 commits to, and the rule that **absence of data resolves to
*unknown*, never to *closed* and never to *open*** — shipped with a test named
after the mistake, `test_blank_closing_day_is_unknown_not_open`, because that is
exactly the invariant a future contributor will "simplify".

### 2.7 Yes, this reopens design.md. Here is the amendment.

It does, and pretending otherwise would be the dishonest move available here:
`Chiesa.solo_funzioni` is **a new structured field on chiese**, which is the
thing design.md's *Considered and not taken* names by type. `Luogo.closing_day`
is a structured availability field the same entry rules out in spirit. The
refusal is reopened deliberately, for one reason — **the module asks a reader to
walk somewhere on the strength of a list, and a false positive in a filtered
index is an instruction, not a fact** — and it is reopened as an **ADR**, not a
spec edit, because it also touches itinerari.md's restatement of the same rule.

The sentence to replace design.md's entry with:

> - **"Open now" and opening hours — *amended 2026-09-22, see ADR-00XX.*** The
>   refusal of a *schedule* stands, on every type, forever: no opening time, no
>   closing time, no verification date, nothing with a clock in it. What is
>   admitted is the negative half — one weekday of closure on `luoghi`, one
>   *«solo durante le funzioni»* flag on `chiese`, and one three-state
>   *esposizione* on the eight `luoghi.Genre` rows — because none of them can be
>   filled in to say that a door is open, and because `/cosa-fare` asks a reader
>   to walk somewhere on the strength of a list. A wrong opening time is still
>   worse than none. A wrong *closure* costs a guest a place they can see on the
>   page and restore with one tap, and that is the direction this archive is
>   willing to be wrong in.

K1's own acceptance test survives the reopening and is what every field above
passes: **an exclusion traces to a row a named person wrote, and is correctable
by one person in one form.** The board also wanted "…on a date" in that test; it
is struck, because a verification date is Model 1's answer to staleness and
requiring it would smuggle the whole schedule model back in through the criterion.

**CF44 stays true, and this is a real result.** Nothing above has a cadence:
every surface in this product remains write-once, which is the property that makes
a one-author archive viable. The price is named rather than hidden — a stale
closure has no expiry signal at all, and nothing in the model detects it.

## 3. Tours compatible with the time window

**Committed: «compatible with the slot» means a tour you could *start* in it,
never one that *fits inside* it, and the window's end is used for nothing.**

The end of `?dalle=&alle=` is the least reliable thing a guest types — it is the
edge of what they bothered to fill in, not a train — and "fits inside" is the only
reading that removes tours, which is the reading that reintroduces the refused
claim. So the window contributes **one printed sentence and no predicate**:

> «Ci sono 2 ore e 26 minuti di luce. L'autore indica: mezza giornata.»

Two facts side by side with no arithmetic between them, which is the same move
`lib/tours.ts::legDirections` already makes by handing the leg to Google rather
than printing a number of ours. **Nothing parses «mezza giornata».**
`Itinerario.duration` stays free text, like `Feste.recurrence` and
`Personaggio.life_dates`.

Four options were on the table and three are refused by name:

- **(a) a closed `Durata` admin list** — refused for v1. It would forbid «Quando
  vuoi», which is what the one raccolta in the database actually says, and a list
  of bare labels buys grouping, not comparison. If *durata* ever becomes
  enumerable for its own sake (chips on `/itinerari`), it needs an integer on the
  row, and then `duration` must move behind `media_source` in the same commit —
  today it is deliberately a per-translation prose field and
  `itinerario_translate` blanks it, which is correct precisely because it is prose.
- **(b) minutes beside the free text** — refused. Two fields for one fact, and
  «mezza giornata» beside `90` is a card contradicting itself; nullable means the
  filter is blind on 100% of existing rows.
- **(c) derived from stop count** — refused on the argument, not on the corpus:
  a stop count was never about time, and adding a stop would silently change a
  published tour's claimed length with no edit to any field a human looked at.
  (An earlier draft claimed the two demo tours prove this. They do not — measured,
  the four-stop percorso's bounding box is the *larger* one. Refuse it on the
  reasoning and drop the flourish.)
- **(d) no duration predicate at all** — **committed.**

**What the day and the light may do.** The *day* may rank a tour down and annotate
it when a stop's luogo names it as its closing day — *«Lunedì una tappa è chiusa:
il Museo Diocesano»* — never remove it; the stop serializer already carries the
stop's card, so this is free. The *light* may annotate and rank, and **may not
remove**: a `diurno` percorso in a dark window reads *«Questo percorso passa per
il monte: c'è luce dalle 07:28»* with *«Vedilo lo stesso»* beside it. The
alternative — not offering it — was in the losing model and is struck, because an
inference about the world may not do what only a stated fact may do.

**A raccolta is never filtered or ranked by duration or window length.** It is a
set with no order and no path (I2): there is no quantity for a window to be
compared against and no sequence for it to be too short for. It still inherits its
members' light annotation as one sentence — *«i luoghi di questo giro sono
all'aperto: oggi c'è luce fino alle 18:27»* — because otherwise the same page says
two different things about the same six places. **Corollary for the form: a
raccolta should not be asked for a *Durata indicativa* at all.** The only one that
exists answers it with «Quando vuoi», which is a field being told it asked the
wrong question.

**CF22 is amended.** A **percorso** is in a zone when its first stop is — the walk
starts there, and "any stop inside" would put a nine-stop city tour in every zone.
A **raccolta** is in a zone when **any** stop is, and its line reads *«Alcuni
luoghi di questo giro sono a Serapo»*, never *«Parte da…»*: a raccolta has no
order, so `position` is whichever stop the collaborator happened to click first,
and «Parte da Porto Salvo» would be a sentence about a click. It is one
`if form == RACCOLTA`, in a view that already branches on `form` at save time.

*Counter-case:* a guest genuinely has a train at 19:00, starts the half-day
percorso at 16:00 on our encouragement and abandons it at stop 3. That cost is
disclosed by the printed sentence and priced by the only person who knows about
the train; the alternative is us deciding that a four-hour walk cannot begin at
16:00, which removes a tour they would have enjoyed half of.

## 4. The list surface

**It is a list of cards that have a place** — exactly `maps.CARD_TYPES` (feste,
chiese, ricette, personaggi, luoghi) — **plus a separately headed tours block**,
and it is built from **`/api/map/features/`**, filtered in the browser.

That endpoint already returns every published, non-translated card across the
five types in **one unpaginated call**, with `cover`, and `stores/map.ts::load()`
already fetches it on every route. So the premise that this app has no
cross-type list surface is false, and the index is composed over a *complete*
in-memory set rather than over page 1. This is what lets CF46 relax rather than
harden: the three counts are honest by construction because they are computed
over everything, `page_size=100` with a below-cap assertion now applies to
`/api/itinerari/` alone, and the ceiling to watch is the unpaginated payload
itself — the day it outgrows a cold load it gains a **`?zona=` parameter, never a
`?page=`**, because an index that has been sliced is no longer an index.

**It is not `PlacesList` with a filter.** It borrows that payload and nothing
else. `PlacesList` renders a cover thumbnail and a per-row layer-colour square;
with three `CardImage` rows in the whole database that is both CF13's swatch chart
and a ranking by who happened to have a photograph, which is a presence signal
worth money. **The row is CF13's line of type: the card's Italian title, one line
of what doing it costs, the zone.** No cover, no colour dot, no grid.

**Sections are activities, not types.** The author asked what is possible to
*fare*; a page of taxonomy headings («Spiagge», «Chiese», «Musei») is `/luoghi`
with a date picker, which is precisely the failure this module exists to avoid.
The vocabulary already exists and is already printed on the front door —
`itinerari.Intent`: *Andare al mare*, *Mangiare*, *Scoprire la città* — and
`?intento=` already rides along from `/benvenuto` (CF17), so inventing a verb per
genre would put one vocabulary in the URL and a second in the headings, free to
disagree. **A fourth intent, *Camminare*, is added** (one admin row plus a line in
the seed migration) for the viewpoints, the passeggiate and the parco.

*The mapping is a frontend constant in v1, not an FK.* `lib/intents.ts` maps
genre slug and card type to an intent slug — `spiaggia → mare`;
`castello, museo, monumento, luogo-storico → citta`; `punto-panoramico,
area-per-passeggiate, parco → camminare`; `chiese, personaggi → citta`;
`ricette → mangiare`. The principled version is a nullable FK from `luoghi.Genre`
to `Intent` with `Intent` moved into `content/` — `itinerari` already imports
`luoghi`, so the FK the other way is a cycle unless it moves, and ADR-0004 says a
type app depends on `content` and not on its siblings. That move is **a day**,
comparable to `luoghi` itself, and it is deferred with its trigger written down:
**the day a ninth genre exists, or the day the backend needs the grouping, the
constant becomes the FK.** The named cost of deferring: a genre added in Django
admin renders under a fallback heading until one line is edited.

**The order is alphabetical by title inside each section, and it is printed:**
*«in ordine alfabetico»*. Both alternatives are refused. "The archive's own
order" is not an order — `maps/api.py:45` ends `.order_by('card_id', …)` and
`card_id` is a UUID4, so `PlacesList` has presented the archive at random since
C5; harmless in a map sidebar, which implies no ranking, and not harmless in an
index, which does. `-created_at` rewards whoever writes last, and "write a new
card to reach the top" is a lever. Distance from the zone is dead on CF19's own
terms: Monte Orlando is ninety hectares and the Montagna Spaccata's pin sits on
the Santuario, so distance *within* an editorial zone is ordering by pin jitter.
Alphabetical is the one order nobody can move — **you cannot pay to be called
*Arenauta*** — and it is what CF40's principle now has to protect, since the
correction moved the money from position-in-a-proposal to `ORDER BY`.

The *section* order is `Intent.position`, the author's own, already public on
`/benvenuto`. It is editorial and it is not a lever, for a reason worth stating:
**an intent is not a thing anyone owns**, so there is nobody to sell *Mangiare*
being second to.

**Availability is a row state and a sub-group, never the page's top level.** The
three-bucket contract survives as the render rule — *labelled sets with printed
counts, never one ranking, nothing demoted for missing data* — but applied
**inside** a section and only when that section has members in more than one
state. Three top-level availability headings nested under four activity sections
is twelve headings on the surface D2 makes mobile-first, over a database with
twelve published cards. So: a closed row is removed from the chosen day **with its
count and its way back** (*«2 luoghi sono chiusi il lunedì.»* + *«Mostrali lo
stesso»*), and the places the archive has said nothing about sit under *«Non
sappiamo se sono aperti»* within their own section — never buried, never dropped,
never ranked below anything.

**Counts.** Every count is over the whole in-memory set. The zone chip's count
(CF24) is what the index will *show*, split into its groups — a zone holding four
cards yields four entries, which is not four open doors.

**Two blocks sit outside the day filter, each with its own heading and its own
printed rule**, because one heading covering both could not print either:

- **«Le feste dell'anno»** — *«Le feste hanno una data che cambia ogni anno: qui
  trovi quelle che conosciamo, non quelle di oggi.»* — with `recurrence` printed
  as the author wrote it. Feste enter the day filter only when K2's per-year
  occurrence row exists, and then as their own *«Oggi c'è»* block above the
  activity sections, never inside one: a procession is not a genre of place.
- **«Le ricette»** — *«Le ricette non stanno in una zona sola: queste valgono per
  tutta Gaeta.»* In v1 a ricetta's pins are not read for **anything**, including
  zone membership (CF36), so it cannot be zone-filtered. Once CF36 is discharged
  it moves into the zone-filtered index as **one row**, in *Mangiare*, in the zone
  when **any** of its pins is, with the pins named inside the row as prose —
  *«si compra in tre forni del centro»* — and never as rows of their own. Under an
  index, being a row is itself the thing worth money; a bakery becomes a row the
  day this archive acquires a business entity, which is an ADR and a revision of
  design.md's Patronage section, not a render decision.

**The title, and it is where the completeness claim is answered.** Eyebrow «A
Gaeta», h1 **«Cosa si può fare oggi»** — the author's own words — and under it
CF14a's printed moment, *«Martedì 22 settembre, pomeriggio — a Serapo»*. The page
is **never** titled *«Cosa è aperto a Gaeta»*, and *«Che si fa a Gaeta?»* is
retired as a page title: it is a question a Gaetano asks another Gaetano about
tonight, and under an index it sounds like a claim on the town's whole offer. It
survives as this file's name, where it records what was asked. The claim is
scoped at the foot, in CF33's register lifted from the events heading to the page:
*«Questo è quello che c'è in archivio, non tutto quello che succede a Gaeta.»*
plus *«Gli orari di musei e chiese non li conosciamo: telefona prima di salire.»*
plus, once, *«Scelte per merito editoriale: nessuna presenza è acquistata»* —
which now belongs here and not only on `/il-progetto`, because this is the page
where *«perché io non ci sono?»* gets asked.

**The map becomes part of the answer, and CF14 has to be split to say so.**
CF14a — *the page prints the moment it is answering* — survives and is promoted,
because with a real window the printed moment is also the printed claim. CF14b —
*the map is never part of it* — is **amended**: a proposal of four was a reading
surface, and an index of forty in a named zone is a *distribution*, which is what
a map is for. So the shell's map draws **exactly the index's set**, unnumbered and
undimmed, in layer colours. Numbering it stays forbidden (CF16: a reader who sees
1, 2, 3, 4 walks them in that order — forty numbered dots is not a fix for four),
and focus stays one card at a time, from the list.

The cost, because this file previously promised the opposite: **`stores/map.ts`
changes.** It needs one nullable set of card ids the map restricts to — plural,
unnumbered, unlike `focus`. It cannot express itself by writing `activeLayers`:
those are the reader's toggles and D13 decided they outlive the page that set
them, so an index that wrote them would silently change the map the reader gets
back when the panel closes. And it cannot reuse `tourOpen`, which is not a
multi-focus mechanism at all — `MapStage.vue:81` computes it as
`!editor && !!focus?.numbered` and then hands `GaetaMap` **empty** pins and
features, i.e. *draw the one focused thing and suppress the layer*.

**Accessibility, because axe cannot see any of this.** Every group that collapses
is a disclosure with `aria-expanded` on its own heading button, in
`SchedeMenu.vue`'s shape (Escape, outside click, route change). *«Mostrali lo
stesso»* is a `<button>` that writes the URL, so Back undoes it, following D18's
`?mappa=1`. New axe cases: the page empty, with results, with a zone applied, with
a section showing both an exclusion count and an unknown sub-group. Plus **one
Cypress keyboard case**, because ADR-0005's own record is that a green gate proves
nothing about operability.

**One timezone hazard, fixed here so it is not discovered in the PR.**
`TIME_ZONE = 'UTC'` with `USE_TZ = True`, so Django's `localdate()` returns
*yesterday in Gaeta* between 00:00 and 02:00 Italian summer time — the
after-dinner reader this module exists for. Every "today" in this feature, on both
sides, goes through one helper pinned to `Europe/Rome`: `lib/when.ts::todayInGaeta`
(CF1; it does not exist yet) in the browser, `zoneinfo('Europe/Rome')` in
`seed_e2e`. Never a bare `localdate()`, never a bare `new Date()`. And **the page
writes the resolved `?giorno=` into the URL on first render**, so CF9's
determinism is true of the link the reader *shares*, not only of the link they
were given — otherwise a guest planning from a hotel in Milan gets a different
page from the same URL.

## 5. Triage of the existing requirements

Verdicts against Part II. *Rewritten* rows carry the replacement sentence.

| id | verdict | replacement |
|---|---|---|
| **K1** | rewritten | **Availability may be claimed, and only as a fact with an author.** design.md's refusal is reopened by the author's correction and replaced, not re-argued. The test every field must pass: an exclusion traces to a row a named person wrote and is correctable by one person in one form. "…on a date" is struck — a verification date is a separate, refused decision (§2.7). |
| **K2** | newly blocking | Unchanged in wording, promoted in force: a proposal could decline to propose an undated festa; an index cannot, because a procession happening today and missing is a false negative on a page whose only contract is completeness. Feste stay outside the day filter until the per-year occurrence row exists (§4). |
| **K3** | survives | Named zones remain the spatial half; geolocation stays a later phase. |
| **K4** | survives | Promoted: the zone chooser is still the keyboard path, and §4 adds two more controls that axe cannot prove operable. |
| **K5** | newly blocking | Unchanged in wording, larger in commitment: a proposal defended one editorial *choice*; an index promises completeness inside its predicate, so every business in it is in it by right and every business outside has a grievance with a page to point at. A `luoghi.Genre` admitting a business needs an ADR and a revision of design.md's Patronage section, never one Django admin form. |
| **Q1** | **dead** | Replaced by §2, per the author's correction. Its last sentence wrote its own replacement and is now binding: the amendment is argued in design.md and recorded as an ADR **before** it exists as a model field. |
| **Q2** | survives | A dish, not a door. Doing more work than before: it is what keeps an index of *«tutto quello che è aperto»* from becoming a listings directory. |
| **Q3** | **dead** | Struck. Nothing is composed and nothing is picked. Its residue is list *order*, which CF40 now owns. Its full-strength version — collapse the static half to one curated itinerary — is kept on file as the fallback if the index ever reads as a directory: the answer then is more itinerari, not a better sort. |
| **Q4** | survives | Named zones, no drawing. Strengthened: a roughly-right hand-drawn shape now removes rows from a list claiming completeness. |
| **Q5** | survives | Not a card, and after the deploy. |
| **CF1** | survives | With a result: nothing in §2 is a stored calendar date, so `TIME_ZONE` stays UTC. The bare-`localdate()` hazard is closed in §4. |
| **CF2** | survives | Events only; unchanged. |
| **CF3** | rewritten | **A fascia names the reader's window; it does not stand in for it.** Choosing a band writes a real `?dalle=&alle=` into the URL, and the model comment changes with the field's job — the times *are* the window, not a default nobody reads. Bands stay *mattina / pomeriggio / sera*; they still do not tile the day. (The old sentence, "never compared against anything in the archive, because nothing in the archive has hours", is the one line the correction falsifies outright.) |
| **CF4** | rewritten | **The dish is an entry in the index like any other, and it carries no hours.** A ricetta has no door; the bakery does, and no bakery here has been stood in front of. Its sentence still changes with the band — *«da portare in spiaggia»*, *«oggi si mangia la tiella»*, *«per stasera»* — and on a wet day *«oggi piove: la tiella si fa in casa»*, linking to the procedure instead of the pins. |
| **CF5** | rewritten | **A signal the archive infers ranks and phrases; only a fact somebody stated may exclude; absence of a stated fact never excludes.** Season, weather, light and the indoor/open-air distinction rank a row and change its sentence, never remove it. A stated closure may take a row out of the chosen day, and when it does the page prints the count and the way back. A card the archive has said nothing about is in its own labelled group, never in the removed set and never in the open one. This is CF19/CF20's rule — geometry ranks, an editorial zone filters — carried from space to time. |
| **CF6** | rewritten | **The sunset line is a mechanism, not a decoration**, and it stays exactly the size CF6 made it. It annotates a row and ranks it; it never partitions the page and never defines a section, because CF6's second half already refused sunset-relative boundaries. *«Il sole tramonta alle 18:27: poco più di mezz'ora di luce.»* Beside a tour it sits next to the author's own words with no arithmetic between them. Every original refusal stands: no golden hour, no aperitivo copy. |
| **CF7** | rewritten | Promoted and extended: **one spec pins a summer date and a winter date over the same window and asserts the two differ.** That pair is the feature's own regression test and the only proof the window bites; without it a December red build reads as a regression and is a calendar. Everything else stands — `?giorno=`, `?dalle=`, `?alle=` first-class, `seed_e2e` computing from a Gaeta-pinned today, no rendered date string asserted, no `freezegun`. |
| **CF8** | rewritten | **An index lists everything it found, and still never sequences it.** "At most one proposal per row" dies with the proposal. What binds harder at twenty entries than at four: never numbered, never joined, never carrying a time or a distance between two entries. Gaeta is a promontory, and twenty entries under one date look even more like an afternoon than four did. |
| **CF9** | rewritten | **The page is a pure function of `(giorno, dalle, alle, zona, published archive)`.** The stable hash and `?variante=` go with the pick; the property they bought stays, and is now also what makes a shared screenshot honest and Cypress able to assert titles. **No seen-list — not on the server, not in `localStorage`.** And D10's answer is cleaner than arithmetic: nobody can buy a position because there is no position. |
| **CF10** | rewritten | **The index prints its rule once, and the rule is a fact.** *«Tutto quello che è nella zona che hai scelto, in ordine alfabetico.»* Each labelled group prints its own line in the same register. Tastes still do not qualify — *migliore*, *consigliato*, *scelto per te*. If a group's rule cannot be printed without embarrassment, that group does not ship. |
| **CF11** | **newly blocking** | Unchanged in wording, promoted from guideline to **render contract**: labelled sets with printed counts, never one ranking; a removed entry always reported with its count and its way back; the empty state naming which of two things is true. It is the entire mechanism by which a half-filled archive reads as *incomplete* rather than as *wrong*. |
| **CF12** | survives | The *«piove»* toggle keeps its own boolean on the eight `Genre` rows and must never share a column with `esposizione` — the Castello's courtyard is open-air and ticketed, and one column answering two questions is how a schema starts lying. Demoted in build order: it reorders rows *within* a section and changes one sentence, and it is only visible because §4 has sections, so if the sections slip it does not ship. |
| **CF13** | survives | Binds harder, and acquires a second reason: twenty entries in five layer colours is a worse swatch chart than four, **and** a row with a cover ranks by who had a photograph, which is a presence signal worth money. |
| **CF14** | rewritten | **Split.** *CF14a* — the page prints the moment it is answering, as visible text — survives and is promoted, since the printed moment is now also the printed claim. *CF14b* — the map is never part of the answer — is amended: the shell's map draws exactly the index's set, unnumbered and undimmed, one focus at a time from the list, at the cost of one new field in `stores/map.ts` (§4). |
| **CF15** | **dead** | Struck; `CardGridEntry` keeps its shape. What survives is the archive's own line — *«scelte per merito editoriale: nessuna presenza è acquistata»* — once at the foot of the index, never as a per-item badge. |
| **CF16** | survives | Binds harder: forty rows make numbered dots more tempting and no less wrong. |
| **CF17** | survives | Load-bearing now — the intent is the page's grouping, not a bias on it. |
| **CF18** | rewritten | **The window is the duration; no second control.** `?dalle=&alle=` already says how many hours the reader has, so *«quanto tempo hai?»* is not added. Nothing parses «mezza giornata»; where the archive can compute a number it prints it beside the author's words. |
| **CF19** | survives | And is what kills distance-ordering inside a zone (§4). |
| **CF20** | rewritten | **A zone filter names the types it cannot filter.** `Zona` stays required on `luoghi` and `chiese` and absent from `ricette` and `feste`; when a zone is applied those two are shown in **two separate labelled blocks**, each printing its own reason (§4) — never one shared block, because the exclusions have different causes and a heading covering both can print neither. |
| **CF21** | survives | Draw the zones once, never render the boundary. |
| **CF22** | rewritten | **A percorso is in a zone when its first stop is; a raccolta when any stop is.** *«Parte da Porto Salvo»* for the first, *«Alcuni luoghi di questo giro sono a Serapo»* for the second — a raccolta has no order, so `position` is a record of a click. The line under the results stays: *«Altri itinerari passano di qui»*. |
| **CF23** | survives | Becomes a correctness requirement once the zone is a hard predicate: one answer to "where is this card", lifted into `content/`. Its stated consequence is the thing the ricetta any-pin rule relaxes, deliberately and only for ricette. |
| **CF24** | rewritten | Last line only: **the count beside a zone chip is what the index will show, split into its groups** — a zone holding four cards yields four entries, which is not four open doors. |
| **CF25–CF34** | survive | Untouched. Eventi still wait for the deploy; CF26's no-scheduler rule now also governs §2 (no reminder, no TTL, no cron); CF32's hand-off shape is the model for the one thing §2 cannot do — *«Orari e aperture: <fonte>»* on a `porta` card, pointing at the institution's own announcement and never at a checkout; CF33 is lifted from the events heading to the page title (§4). |
| **CF35** | **newly blocking** | Unchanged in wording, changed in kind: a rotating proposal of two things reads as curation, and **a complete list of two things announces its own emptiness**. The floor is a gate, computed at runtime from published counts in `WelcomeView`'s `withTours` shape, and it is what §2's column is gated on. |
| **CF36** | **newly blocking** | Upgraded from a standing duty to a hard precondition, and understated as written: the food data is not one card with three pins but **three duplicate `Tiella di Gaeta` cards** (two published) holding one, two and zero pins, hand-entered in local SQLite — in no seed, no migration and no fixture, therefore invisible to CI and to anyone who clones the repo. It is a duplicate-card cleanup before it is a pin confirmation. Until it is discharged, nothing reads a ricetta's pins — not as rows, not as prose, not as zone membership. |
| **CF37** | survives | And now binds K2. |
| **CF38** | survives | Not reopened by §2 in either direction: a lifeguard is a service inferred from a decree, a door is a door. |
| **CF39** | survives | Promoted to the row's second line, which is what makes an index of activities different from an index of titles — and it exposes a gap §7 prices: `how_to_get_there` exists only on `Luogo`, i.e. only on the type with zero rows, while `chiese` has sixteen. |
| **CF40** | rewritten | **The index has no ranking, and its order is a fact that is printed.** Showing everything dissolves the choice between two owners; it does not dissolve the order they appear in, and under an index that order is the only lever left. Alphabetical by title inside each section, printed in one line, and never anything a person could adjust on request. *L'archivio sceglie tra luoghi, mai tra attività* stays the sentence; it now constrains `ORDER BY`. |
| **CF41** | survives | Events only; unchanged. |
| **CF42** | survives | And is the precedent the labelled-group contract is built on. |
| **CF43** | **dead** | Struck. An index shows the same archive every morning and that is correct; variety was a property of picking. What survives is its conclusion — the module's real dependency is roadmap item 4. |
| **CF44** | survives | **And this is a result, not an escape.** Nothing in §2 has a cadence: no TTL, no verification date, no re-walk. The static half still needs nobody, weekly or annually. The price, named: a stale closure has no expiry signal at all. |
| **CF45** | rewritten | The deterministic pick leaves the pre-deploy list with the pick itself. What may be built before roadmap item 3 is what does not rot: the fasce and their copy, the zones, K2's occurrence rows, and **all of §2** — a weekday closure is as true offline as online, which is one more argument for the model that carries no verification date. |
| **CF46** | rewritten | **An index cannot be composed over page 1, and it does not need to be.** The five place-carrying types come from one unpaginated payload the app already loads, so the filter and its counts run in the browser over a complete set; `page_size=100` with a below-cap assertion applies to `/api/itinerari/` alone. The ceiling to watch is the payload, and its answer is `?zona=`, never `?page=`. |
| **CF47** | rewritten | The throttle class is **not** owed: no new public endpoint is built (§4), so `DEFAULT_THROTTLE_CLASSES` stays unset and `createcachetable` gains nothing. The axe budget grows — empty, with results, with a zone, with a section showing both an exclusion count and an unknown sub-group — **plus one Cypress keyboard case**, which axe cannot replace. |

## 6. The three questions that are left

The correction answered Q3. Of the remaining five, Q1 is replaced by §2 and Q2,
Q4 and Q5 survive unchanged. These three are new, and they are the author's.

### QR1 — Does `Luogo.closing_day` ship at all?

**Recommendation: yes.** It is the only per-place correction path in the whole
design. Without it the archive makes a claim at *kind* granularity and the
collaborator who knows the Villa Comunale gates at eight has nowhere to say so —
which is design.md's rejected hours field with the fix deleted, and therefore
worse than the thing it replaces, not better. It costs one select on the three
genres that have a door, on a table that today has zero rows.

*Strongest argument against:* it is the only stored fact in this product with an
**expiry and no signal** — there is no TTL by design, so a museum that moves from
Monday to Tuesday goes on asserting *«chiuso il lunedì»* forever. And the badge
travels: *«Chiuso il lunedì»* renders on the card page, in `/luoghi` and in a
screenshot without its group label, so the *absence* of a badge starts reading as
*aperto* — on the churches, which have no such field and never will. That second
half is the sharpest objection anyone raised, and if this ships, its mitigation
ships with it as a hard rule, not a nicety: **every `porta` card with nothing
stated renders *«Non conosciamo gli orari di questo luogo»* on its own page**, so
that the absence of a badge means something on the surface where the badge gets
screenshotted. Budget it — `TypeDetailView` filters `extraFields` on
`Boolean(item[key])`, so rendering on *absence* is its own branch, not free.

### QR2 — Do chiese get `solo_funzioni`, reopening design.md on the type it named?

**Recommendation: yes, one boolean.** The archive **is** churches: sixteen rows
against `luoghi`'s zero, and the real drafts are the Cattedrale, San Giovanni a
Mare, la Montagna Spaccata, San Francesco. Every availability model on the board
routes them to "we don't know", which means a feature specified entirely against
a table that has never held a row. *«Aperta solo durante le funzioni»* is the one
availability sentence that is true of a real Gaeta church, is one checkbox, and
can only ever tell a guest **not** to count on getting in.

*Strongest argument against:* design.md's refusal names chiese by type, and its
worked example is a tourist standing in front of a shut church — so this is the
one place where reopening is not a technicality. And it rots: a church opened
daily by a custodian becomes a functions-only church the year the custodian goes,
and nothing signals it. The honest framing is *rots slowly, with no signal when it
does*, which is the same sentence this file applies to `closing_note` — and the
reason the flag is one-directional is that the direction it rots in is the safe
one.

### QR3 — Is the page grouped by activity, or by availability?

**Recommendation: by activity** — *Andare al mare, Mangiare, Scoprire la città,
Camminare* — with availability as a row state and a sub-group inside. His own
sentence picks it: *cosa è possibile **fare***. It is also the only grouping that
makes this page different from `/luoghi` with a date picker, and the only one that
fits a phone.

*Strongest argument against, and it is the finding of the whole exercise:* **he
asked for the second.** He asked for the list of everything that is open, and
availability-first is what that describes. The reason it cannot be the top level
is not taste — it is that on this archive the «aperto» group renders **empty** and
the «non conosciamo gli orari» group holds sixteen churches, so an
availability-first page is a page whose first heading is blank and whose largest
heading is an apology. Intent-first is *«what do you feel like doing»* that
happens to know some hours; availability-first is *«what is open»* that happens to
be grouped. The gap between the two is the content floor, and no schema on any
board closes it. **Say it to him in one sentence before a line of code: the module
is not blocked on the availability model, it is blocked on the fact that not one
of Gaeta's seven beaches exists as a card while sixteen churches do.**

## 7. What it costs now

Against the repo's three data points — **libri** one sitting, **luoghi** one day,
**itinerari** backend and frontend in a day.

| | Cost | Notes |
|---|---|---|
| **PR 0 — the content floor (CF35)** | **Not engineering.** | Ten cards and one published `percorso`, owed to roadmap item 4 regardless. Everything below is invisible above it. Plus CF36: three duplicate Tiella cards and three fabricated pins, which is three admin deletes and no code. |
| **PR 1 — the sun** | **One sitting.** | `suncalc` pinned, one frontend coordinate constant extracted from `GaetaMap.vue`, `lib/sun.ts`, `lib/when.ts::todayInGaeta` (CF1), Vitest against three almanac dates. Ships useful before any content lands, never rots, zero backend. |
| **PR 2 — `/cosa-fare`, the index without availability** | **One sitting, and it is still mostly frontend.** | One route, the activity sections from `lib/intents.ts`, alphabetical order, CF13's imageless row, the two outside blocks, the tours block, the foot lines. Reads `/api/map/features/` (already loaded) and `/api/itinerari/`. **Breaches the file's old "zero backend" in exactly two places, and they are named rather than discovered:** one new nullable field in `stores/map.ts` for the map's restricted set, and — if the row's second line is wanted — `how_to_get_there` on the features payload. |
| **PR 3 — zones** | **Half a day**, plus the polygons. | Unchanged from Part II: `Zona` model, seed, `/api/map/zone/` with counts, required FK on `luoghi` and `chiese`, chips via the existing `listFilter`. |
| **PR 4 — «Accesso» (§2)** | **Half a day to a day, one PR.** | `Genre.esposizione` + `Luogo.accesso` with its one-way `clean()` + `closing_day` + `closing_note` + `Chiesa.solo_funzioni`; one migration with the eight-row data step; serializers resolved through `media_source` like `genre` already is; `options?` and `showWhen?` on `FieldConfig` (~15 lines in `TypeForm.vue`, and both overdue — today every `select` must go through an `optionsEndpoint`, so a `/api/luoghi/giorni/` for the days of the week would be the absurd alternative); pytest for the three states, the translation case, the eight seeded slugs, and `test_blank_closing_day_is_unknown_not_open`. **Smaller than `libri`.** |
| | **+ half a day** | The mitigation QR1 names: rendering *«Non conosciamo gli orari»* on absence, on the card's own page. Not free, and not optional if the field ships. |
| **`how_to_get_there` on chiese** | **Half a day, plus sixteen card edits.** | Proposed in **content.md's type table**, referenced here — it is a content-model change, and the sixteen retrofits are content work under roadmap item 4, not engineering. It matters because the field that says what *doing* a place costs exists only on the type with zero rows; `itinerari/serializers.py:139` already reaches for it through `getattr(…, 'luoghi', None)` and gets `''` for every church stop. |
| **Intent as an FK, `Intent` moved to `content/`** | **A day. Deferred.** | Larger than the entire availability column. Its trigger is written down (§4): a ninth genre, or the backend needing the grouping. |
| **`MapFeature.key` + diff-based `replace_points`** | **Half a day to a day. Not in this budget.** | Eight call sites across four apps plus the pins editor's wire format. **Nothing in §2 hangs off a pin**, so it is not a prerequisite here. It is owed as tech debt for `itinerari.Stop.point_index`, which is positional and already silently reassigns a stop when pins are reordered. *Done 2026-10-12 (TD-50, #87).* |
| **«Orari verificati» — the model that lost** | **Four to five days, then an afternoon a year forever.** | Recorded so the price is on the page next to the price of what won: a new app with three models, a server-side resolver, a new public endpoint with its own throttle class, a ~20-control-per-schedule form on the surface D2 makes mobile-first, and a risky refactor of the shared pin write path as its first half-day. |

**The honest summary:** the index is two sittings and the availability model is
another, so the whole of `/cosa-fare` including §2 is about **three days of
engineering spread over four PRs, and none of it recurring**. Every remaining cost
is content: ten cards, three deletes, sixteen retrofits — all of it owed to
roadmap item 4 before this module was imagined, and all of it the reason the page
is currently empty rather than wrong.

## 8. Corrections from the adversarial read — applied 2026-09-22

Four things the revision above got wrong or missed. They are here rather than
edited silently into §2–§7, because a reader who acts on this file should see
what the first pass believed.

**8.1 — The wire format is the hole, and it falsifies "zero backend" one PR
earlier than §7 admits.** §4 composes the index **in the browser** over
`/api/map/features/`. That payload carries `id`, `type`, `title`, `cover`,
`points`, `route` — and nothing else. Not `genre`, not `zona`, not `accesso`,
not `closing_day`, not `solo_funzioni`. **So §2's fields cannot reach §4's
filter, and neither can PR 3's zone.** §7 names two breaches of "zero backend"
and misses the one the whole feature turns on. The correction, stated as a
requirement so it is costed rather than discovered:

> **CF48 — Every field the index filters or labels on must be on
> `/api/map/features/`, and that is a backend change with a serializer, a
> `media_source` resolution and tests.** The endpoint is the only unpaginated,
> already-loaded, cross-type payload in the product, which is why the index uses
> it — but it was built to draw pins, and it says so. PR 2 (the index without
> availability) is genuinely frontend-only; **PR 3 and PR 4 each owe a payload
> extension**, and a translation must resolve these through `media_source` the
> way `genre` already does, or a translated card lands in no zone with no
> availability.
> *Counter-case:* a second endpoint for the index, leaving the map's payload
> alone. Refused — two endpoints returning overlapping views of the same cards
> is how the two drift, and the map and the index are looking at the same
> archive through the same zone.

**8.2 — CF3 was not falsified; the triage was wrong to say so.** §5's triage
marks CF3's line — *a fascia's times "are never compared against anything in the
archive"* — as falsified outright, and then §3 re-commits to exactly that line.
Both cannot stand. **CF3 survives unchanged**, and this is the one place the
file should be pleased rather than embarrassed: under the winning model the
archive stores no hours, so there is nothing for a fascia's times to be compared
against. The times still exist only to pick the default band. What changed is
that the band now also ranks and phrases (CF5), which CF3 never denied.

**8.3 — `Genre.esposizione` is specified against a table with no rows; defer
it.** Exposure is a property of a *place*, not of a *kind* — which is why §2.1
has to concede that `parco` is "the weakest row" and then builds the default on
that table anyway. With eight genres and **zero `luoghi`**, the genre-level
column buys nothing a per-place default would not, and it drags in the whole
one-way-override apparatus to protect against a claim it did not need to make.
**Ship against what exists:** `Chiesa.solo_funzioni` plus
`closing_day`/`closing_note`, on the sixteen churches that are actually in the
archive. `esposizione` arrives the day `luoghi` has rows to classify, which is
also the day anyone can check whether the eight flags are right.
*This is the same argument the rest of the file makes everywhere else* — do not
build against an empty table — applied to the file's own proposal.

**8.4 — The archive holds duplicate cards, and the correction is what makes
them visible.** Measured 2026-09-22 in the development database, among Italian
originals (`language='it'`, `translation_of` null):

| | |
|---|---|
| `Tiella di Gaeta` | **three cards**, two of them **published**, holding 2, 1 and 0 map pins |
| `Santuario della Santissima Annunziata` | **two cards**, one published, one draft |
| `Chiesa di San Francesco` / `Tempio di San Francesco` | the same church under two names, one published, one draft |
| two `chiese` translations (`language='en'`) | **empty titles**, and two of them have no `translation_of` at all |

This is a **T6 violation** — *one thing in the world, one row* — sitting in the
archive, and it is not a seeding artefact: none of these is in a fixture or in
`seed_e2e`. **Under the rotating proposal of Part II nobody would ever have
noticed**; the pick would show one Tiella and move on. **Under a complete index
the reader meets the Tiella three times and the Annunziata twice, on the first
screen, in the same zone.** That is the author's correction earning its keep
before a line of code is written.

> **CF49 — A complete index is a duplicate detector, and the archive must be
> de-duplicated before it ships.** Three admin deletes today. The rule that
> should join the seeding section: *seeding the same subject twice is the one
> mistake a draft cannot carry into publication, because the reader meets both
> rows at once.* And the empty-titled English drafts are their own small
> finding — a translation with no title renders as a blank row in any list that
> does not filter it, which `visible_translations` does for readers but the
> collaborator's `mine/` deliberately does not.

---

# Part II — The original proposal, written before the correction

> **Superseded where Part I disagrees.** Everything below was written on the
> assumption that this module is a curated proposal that picks one item per row.
> §5 above says, id by id, which requirements died with that assumption, which
> survive and which were rewritten; the arguments here are still the arguments,
> and the ids are how the rest of the doc set addresses them. Read the triage
> first.


## What it is

A surface that answers the question a guest actually asks at 15:40 on a Tuesday:
*given the hours I have left, the day it is, and the corner of Gaeta I am in,
what do I do now?* — answered out of the archive (a tour, a place, a dish, a
beach) plus the one class of thing the archive has never held: **an occurrence
with a time on it**.

In the product's own terms, and this is the sentence the rest of the file argues
against: **it is `/benvenuto`'s second question.** The landing page asks *what do
you feel like doing* and answers with a tour somebody wrote. This asks *when, and
where are you* — and today's honest answer is made of the same material,
reordered. The genuinely new thing in the request is the **evento**, and it is
the only part that needs a schema.

The word to watch is *proposta*. Between "here are three things worth knowing
about, today" and "here is your afternoon: 15:00 the castle, 16:30 the beach,
20:30 dinner" there is a product boundary: the second version makes claims about
opening hours, walking times and the order of a day that this archive has twice
refused to make, and it is also the shape that looks bought. Most of what follows
is about which side of that line each piece lands on.

## What it collides with

### Decide first

**★ K1 — "Open now" and opening hours were considered and declined. Twice.**

> *design.md, Considered and not taken:* "**'Open now' and opening hours.** A new
> structured field on chiese and on the places that sell a ricetta, kept current
> by collaborators. A wrong opening time is worse than none — a tourist walks to
> a church that is shut — and this file already names standing in front of a
> closed church as the moment the product is for." Restated in *itinerari.md*.

Filter #1 is that decision wearing a chip. **A 15:00–18:00 proposal that names a
church, a museum or a bakery is an opening-hours claim whether or not a field
stores one** — and it is worse than the rejected field, because a field is a fact
someone entered and can correct, while a filter is an inference nobody owns. The
Venice map that gave this project its layout had exactly this filter; design.md
took its tour idea, left the hours, and wrote down why: "one venue's summer and
autumn hours collapse into a single range."

*Reopening costs:* a structured field on `chiese`, `luoghi` and the ricette sale
points; a permanent per-collaborator upkeep duty; a time field kind
`typeConfigs.ts` does not have (`input | textarea | select`); and an answer to
the question design.md asked and nobody answered — *what do we show when nobody
has kept it current?*

*Not reopening costs:* the time filter can honestly bite on one thing — events.
See Q1.

**★ K2 — A structured date beside `Feste.recurrence` is a named, still-open
decision, and requirement 2c cannot be built without it.**

> *itinerari.md, Left to the build:* "**Feste during the stay.** A guest staying
> fifteen days wants to know whether a procession falls in them. Today a festa's
> recurrence is free text on purpose; this would need a structured date beside
> it. A separate decision."
> *feste/models.py:* "Free text, not a computed calendar rule — the spec's own
> example ('every 9 August') is prose, not a recurrence expression."

Filter #2 **is** that decision, and dynamic proposal 2c ("if that day falls on a
festività, signal it") is precisely "does a feast fall on this date". There is no
way to have 2c without it: a `CharField` holding *«Ogni 9 giugno»* answers no
question about a date.

It is bigger than it looks, for a reason the repo demonstrates against itself:
the archive currently teaches two different dates for one feast — content.md says
the Porto Salvo procession is "every 9 August", the test fixture writes *Ogni 8
settembre* — and the real answer is **the second Sunday of August**, which is
neither. A fixed-date field would be silently wrong for the repo's own worked
example, every other year.

*If taken, take the cheap shape:* **a per-year occurrence row a human types**
(`feste_id`, `date`, optional `note`), not a recurrence rule. Strictly less code
than a rule engine, cannot be confidently wrong, and degrades to *«data non
ancora confermata per il 2027»* instead of to a lie. A rule vocabulary (nth
weekday, Easter-relative) covers Porto Salvo and Pasquetta and costs an editor a
collaborator can get wrong; RRULE cannot express "the committee decides in
March", which is the real case.

**★ K3 — Geolocation is a named later phase, and the hand-drawn area is its
spatial half arriving early.**

> *design.md, Non-goals:* "**Geolocation** — … It is a **feature, not a style**:
> browser permission, HTTPS (so it touches deployment), sane handling of a denied
> permission and of GPS that is 50 m wrong inside the old town, and **a spatial
> endpoint** (`/api/map/features/` returns everything, unfiltered)."

The drawn area is a clever dodge of the permission, the HTTPS dependency and the
50 m error — and it still needs the spatial half. Today `/api/map/features/`
takes no bbox and no polygon, coordinates are plain unindexed `FloatField`s, and
there is no GeoDjango, no PostGIS, no turf, no Leaflet drawing plugin. See Q4;
the recommendation is named zones, which is also the keyboard path K4 requires.

**★ K4 — A freehand polygon would be the first pointer-only input since
ADR-0005, and it would ship green.**

> *ADR-0005 (2026-09-05 update):* the map widget's markers "will *not* be made
> individually focusable and announceable. The text lists are the conforming
> path… the map is an additional, pointer-oriented view of the same data."

That exclusion is honest only because **every map function has a non-map twin**:
typed lat/lng for a point (D19), a grouped title picker for a stop, the two text
lists for the layers. A freehand polygon has no twin — a text list is the
equivalent of pins, not of a lasso, and typing four corner coordinates is not a
tourist interaction. The axe gate cannot see inside `.leaflet-container`, so the
gap would pass CI.

**★ K5 — "Presence is earned, not bought" (D10/D12), and there is no place to eat
in the archive.**

> *design.md:* "**Presence is earned, not bought.** A place that serves typical
> Gaetano food can be in the archive; a place serving American hamburgers never
> will be, at any price." — D10: "A reader has to be able to tell, *from how the
> page is built*, that a listed bakery is there on editorial merit." — D12: "**No
> ad slots.** Nothing in the layout is a rectangle waiting to be sold."
> *content.md / itinerari.md:* "**No beach clubs** — the archive lists places,
> and a *stabilimento* is a business." Refused twice.

Static proposal 1b has nothing behind it. The eight seeded `luoghi` genres are
Spiaggia, Castello, Monumento, Luogo storico, Museo, Punto panoramico, Area per
passeggiate, Parco — not one is a business — and there is no restaurant entity
anywhere in the backend. The only food data is a ricetta's "sold here" pins: a
coordinate plus an optional label, unranked.

Three things make this the sharpest collision in the set. **First**, a daily
rotating panel that names one bakery is literally D12's rectangle — the most
sellable surface this product has ever had, and the one where money arrives
first, disguised as a favour. **Second**, no principle in any spec admits the
trattoria and excludes the beach club; if restaurants are listed, the beach-club
refusal falls with them, and it should fall out loud. **Third**, the cheapest way
is the most dangerous: a `Ristorante` genre is *one Django admin form* — no
migration, no PR, no spec edit, no review — and it disarms the closed-list guard
that content.md uses to justify `luoghi`'s existence at all.

### Also reopened — decide while building, but decide

- **I3, a stop is always a card, never a free point with a caption.** The worked
  example — *concerto di Noemi al molo di Gaeta vecchia* — is that free point.
  The case for events is genuinely different (nobody will write a card about a
  concrete quay so a one-night stage can stand on it), so it is reopenable — but
  note the trap: **`maps.CARD_TYPES` is both the map's layer list and the
  definition of stop-eligibility** (`itinerari/serializers.py` imports it). The
  one-line edit that puts events on the map also makes a Saturday concert a legal
  stop on a timeless walking tour. Split the tuple, or keep events off it.
- **I10, only curated itineraries.** It refused a *reader-built* planner. A module
  that assembles a day out of the archive reaches the same outcome from an angle
  I10 never considered — the server doing the picking instead of the guest.
  Argue past it explicitly (Q3); do not ship past it.
- **I6, one public landing page whose address never moves.** Nobody has named the
  distinction this module needs: **the address is the obligation; the page is
  not.** `/benvenuto` may grow. What may never happen is a second address quietly
  becoming the better front door while the printed cards point at the first.
- **ADR-0006.** Several natural designs would feed a zone chooser from the
  quartieri overlays. **Do not.** `visible_to(user)` returns a different set per
  reader, so a steering member's chip row would contain the seggi and a shared
  `?zona=seggio-7` would put the confidential vocabulary in a URL — the exact
  leak the ADR's test guards, arriving through a surface designed to be shared,
  visible to one person who will never report it. **Reader zones are their own
  public model.**
- **Content provenance** ("Written, not copied", "Drafts, always", "No images")
  versus dynamic proposal 2a. And the research answer: **there is no feed.** The
  comune runs Municipium, not the AGID kit; its events RSS holds **one** item;
  its open JSON API holds **one** record, sixteen months stale, with
  `latitude: null` and an empty address, and the two disagree about what that one
  event is. VisitLazio's feed is a 10-item window for 378 comuni with no Gaeta
  content. The only source with current Gaeta events has no structured date at
  all and is a commercial platform that sells visibility to the businesses it
  writes about. **Do not build ingestion.** If it is ever built, the provenance
  rules mean it produces *drafts for a human to read* — a queue, not a feed.
- **Notifications are a confirmed non-goal.** A "what's on tonight" surface is
  the strongest pull toward them this product will ever have. Name it out of
  scope here so it does not arrive later as "just an email".
- **I9, Italian first.** Its arithmetic inverts here: a tour page is mostly a
  collaborator's prose, so Italian costs a foreign guest little; this page is
  mostly *generated UI* — the band names, "oggi", the empty-state sentence. Not
  reopened this phase (the precondition, published translated content, is unmet
  in both directions) but it is the strongest case yet and is recorded as such.
- **The `tradizioni` test.** `eventi` passes the material test that killed
  `tradizioni` — concerts, sagre, mostre are real and nameable — and fails the
  permanence one. It would be the first content in this archive that **stops
  being true**, inside a core whose every rule assumes it does not.

## Requirements

### The clock

- **CF1 — Gaeta's clock is named, never inherited.** `TIME_ZONE = 'UTC'` with
  `USE_TZ = True`, so a server-computed `localdate()` answers *yesterday* for the
  first two hours of the Italian day — exactly the after-dinner reader this module
  exists for. The SPA has no date library and no timezone handling; its one
  wall-clock conversion (`PollForm.vue`) silently uses the browser's zone, on the
  least-maintained surface in the app. **Committed:** `lib/when.ts::todayInGaeta()`
  and `slotOf(date)`, pure functions over
  `Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome' })` — zero dependency,
  and the browser's IANA data handles 25 October. `TIME_ZONE` stays UTC until the
  first *stored calendar date* exists (an evento, K2's occurrence row), and moves
  to `Europe/Rome` in **that** PR, with the reason beside `MAP_CENTER_LAT`'s —
  it becomes the third place that knows where Gaeta is, and the multi-city phase
  then has three to move.
  *Counter-case:* the client already owns every date in this app, so client-only
  is zero backend change. It loses the after-dinner case for any phone not on
  Italian time, and that case is the module.

- **CF2 — The tourist day ends at 05:00, not at midnight.** One named constant.
  **An event belongs to the day it starts — always, exactly one row, never
  split.** The 22:00 concert is a Saturday event, still listed at 00:40 on the
  calendar Sunday, gone by 05:00 when nobody is reading. The 05:00 boundary is
  internal and never printed; the heading shows the calendar date, and the event
  form's help text says *«la data in cui l'evento comincia»*.

- **CF3 — A fascia is a written thing, not a query parameter.** This is what
  dissolves K1 rather than reopening it. A **fascia** is an admin-managed row in
  `reports.Category` / `luoghi.Genre` / `itinerari.Intent`'s exact shape — name,
  slug, position, optional one-line description — plus `starts_at`/`ends_at`.
  **The times exist for one purpose, stated in the model comment: to pick the
  default band when a reader arrives without one.** They are never compared
  against anything in the archive, because nothing in the archive has hours. A
  band selects **which rows of the page render and the sentence around them**,
  never which cards they contain. Bands are *mattina, pomeriggio, sera* — light
  and heat, which is what actually governs a day in Gaeta — contiguous, and they
  **do not tile the day**: no *notte*, no *alba*, because an option that always
  returns nothing is worse than an absent one.
  *Counter-case:* copy that rots. Answered the way `Intent.description` already
  answers it — optional, so the failure mode is a bare chip, not a stale sentence
  from 2026.

- **CF4 — The meal moment is a sentence, not a band.** *(Correction to the
  author's 1b trigger: with bands of light and heat, nothing says **when** the
  dish row appears.)* **Committed:** the dish row appears in **every** band and
  only its sentence changes — *«da portare in spiaggia»* in the morning, *«oggi
  si mangia la tiella»* at midday, *«per stasera»* in the evening. A *cena* band
  pointing at bakeries would be wrong on its own terms: the bakeries shut before
  dinner, which is K1 arriving through the back door.
  *Counter-case:* a guest at 12:50 wants the lunch answer and gets the same row
  they got at 09:00. True, and the row's sentence is the difference; the
  alternative is a band that makes an availability claim.

- **CF5 — A temporal or seasonal signal ranks and phrases a proposal; it never
  excludes one.** The most transferable sentence here, and it settles three
  requirements at once (CF4, CF12, CF13). Corollary, and it is a correction to
  the first draft of this file: an *indoor* place (museo, castello, chiesa) is
  **ranked below** an open-air one and carries no time claim — it is never
  removed. A "go and see" row that cannot name the Castello Angioino-Aragonese or
  the Museo Diocesano is not the feature that was asked for.

- **CF6 — The sunset line, and only the line.** When the module proposes a
  viewpoint, a walk or the lungomare it may print *«oggi il sole tramonta alle
  20:41»*, computed from `MAP_CENTER_LAT`/`LNG` — the one positive time fact this
  archive can state and never be wrong about, because nobody maintains it. A
  pinned dependency in its own PR, not hand-rolled solar arithmetic. No golden
  hour, no *«perfetto per un aperitivo al tramonto»*, which is a business claim
  in an astronomy costume. **Refuse the other half:** sunset-relative band
  boundaries are machinery nobody can see, solving a problem a chip row does not
  have.

- **CF7 — The test suite acquires a shelf life, and this repo already solved
  it.** `polls/tests.py` writes every fixture relative to `timezone.now()` and has
  never needed a frozen clock; `seed_e2e` already avoids literal dates. Follow it:
  `?giorno=` is a first-class parameter on every path, so one test exercises the
  default and asserts only the shape; `seed_e2e` computes event dates from
  `localdate() ± days` while titles stay literal (titles are what the specs assert
  on); no spec asserts a rendered date string. **No `freezegun`** — add
  `time-machine` only the day a boundary is computed server-side, in its own PR
  under TD-33's rule.

### What the page outputs

- **CF8 — A menu, not a plan.** The output contract, written before the view has
  a shape: **at most one proposal per row, never numbered, never joined, never
  carrying a time or a distance.** The only sequence the module may render is the
  one a tour already owns, through the guided mode at `?tappa=N`; the only
  distance claim this product makes stays `lib/tours.ts::legDirections`, between
  two stops a collaborator chose. Gaeta is a promontory with Monte Orlando in the
  middle and Sant'Agostino seven kilometres out on the Flacca — **four things on
  one page that look like an afternoon are twenty kilometres.**
  *Counter-case:* a guest wants a plan and a menu makes them do the work. True,
  and it is what a `percorso` is for; the module hands them one.

- **CF9 — The pick is a pure function of `(giorno, fascia, zona, published
  archive)`.** Candidates ordered by id, indexed with a stable hash of that key.
  Identical for every reader, identical on every reload, reproducible by anyone
  holding the archive — so a shared link shows the sender what they saw, Cypress
  asserts an exact title instead of a shape, and the axe gate measures a stable
  page. Variety comes from the date, not from entropy; *«proponimene un'altra»*
  writes `?variante=2`. **And in words, in the spec: no seen-list — not on the
  server, not in `localStorage`.** I6 is about the guest, not about the disk.
  This is also the honest answer to D10: **nobody can buy Tuesday, because
  Tuesday is arithmetic.**
  *Counter-case:* an editorial order would be better than arithmetic. It would —
  and an editorial order nobody maintains degrades into randomness on its own,
  whereas arithmetic is replaceable behind one call site the day such an order
  exists.

- **CF10 — Every row's rule fits on the page in one Italian line, and is
  printed.** *«la spiaggia più vicina alla zona che hai scelto»*, *«gli eventi di
  oggi, in ordine di orario»*. Rules that are facts qualify: nearest, inside the
  zone, starts soonest, a rotation on the date. Rules that are tastes do not:
  *migliore*, *consigliato*, *da non perdere*, *scelto per te* — brochure
  vocabulary, and D6 names the brochure as the thing this is not. **If a row's
  rule cannot be printed without embarrassment, that row does not ship.**

- **CF11 — The page never names a row it cannot fill, and never drops a filter to
  fill one.** Headings come from what was found; a day of two things renders as a
  day of two things (`WelcomeView` already does this with intents). Where dropping
  a filter would have matched, show the count and the control — *«12 proposte
  senza l'area — Togli l'area»* — never the result. The empty state names **which
  of two things is true**, because they send the reader in opposite directions:
  *non l'abbiamo ancora scritto* → the map; *non c'è niente a quest'ora* → the
  rest of the day, with the band control under it.

- **CF12 — Rain.** *(Missing from the first pass.)* The module's worst day is a
  wet November afternoon proposing Monte Orlando and Serapo. "Look out of the
  window" is a dodge, and weather from a third party is refused (TD-30, D6b).
  **Committed:** the indoor/open-air distinction CF5 establishes for ranking is
  inverted by **one reader control** — a *«piove»* toggle, no forecast, no API,
  no claim: the reader knows the weather, the module just reorders. One boolean
  on the eight-row `Genre` table, decided once, stale never.
  *Counter-case:* a control nobody presses. Cheap enough to be worth it, and it
  is the only honest way this product can ever mention weather.

- **CF13 — Not a grid; a line of type.** Three `CardImage` rows exist in the whole
  development database and the seeding rules say why ("No images. Rights are
  unknown for anything found on the web"). `CardGrid`'s imageless branch is a
  considered `color-mix` tint designed for a column of **one** type; four rows in
  four layer colours under *la tua giornata* is a swatch chart. So: the card's
  Italian title (T7 — the signs in Gaeta are in Italian), the summary, the one
  printed line saying why, the zone. **It must look finished with zero images in
  the archive.**

- **CF14 — The page prints the moment it is answering, as visible text** —
  *«Domenica 9 agosto, pomeriggio»* — so a stale screen is self-evidently stale,
  and the screenshot a guest takes (the only way a plan leaves this app: no
  account, no save, no print stylesheet) carries its own date. The module's answer
  is **text, and the map is never part of it**: each item as a title plus one
  line, including the luogo's own `how_to_get_there` rather than a pin.

- **CF15 — A proposal carries its byline.** `CardGridEntry` is
  `{id, title, summary, cover, isPublished, to}` and knows nothing about authors,
  so a proposal built on the list side loses the byline exactly where something is
  being recommended — and what remains is the visual grammar of every sponsored
  card the reader has ever scrolled past. Give the proposal payload its own author
  field; leave `CardGridEntry` alone. The archive's own line — *«scelte per merito
  editoriale: nessuna presenza è acquistata»* — appears once at the foot, never as
  a per-item badge, which is the badge D10 rules out.

- **CF16 — Multi-focus is not asked for.** `MapFocus` carries one id and the map
  exempts exactly one card from the dim; `tourOpen` hands the map empty pins while
  a tour is open, decided 2026-09-19 because dimmed cluster counts read as more
  stop numbers. The day lives in the panel; the map highlights at most one item.
  Nothing in `stores/map.ts` changes. **Record the reason, because four numbered
  dots will be proposed again:** a reader who sees 1, 2, 3, 4 walks them in that
  order, which is the bug that decision was taken to fix.

- **CF17 — The intent survives the door.** *(Missing from the first pass.)*
  `/benvenuto` speaks in *mare / mangiare / città* and is the named entry point;
  a reader arriving from an intent chip must not lose it. `?intento=` rides along
  and biases the rows — the same vocabulary, one surface later.

- **CF18 — Hours available, not hour of the day.** *(Missing from the first
  pass.)* "Come spendere la giornata" is a **duration** question: three hours
  before a train and a whole free day deserve different answers, and the band says
  nothing about which. **Committed:** the band stays, and the tour row reads the
  itinerary's existing free-text `duration` to pick between a *raccolta* and a
  long *percorso* — no new field, no computed minutes. A second control
  (*«quanto tempo hai?»*) is deliberately **not** added until a real reader asks:
  two time controls on one page is a form, and this is a page.

### Where things are

- **CF19 — The pin is not the place, so geometry ranks and never excludes.**
  `MapFeature` has two kinds and no extent, and `chiese`/`luoghi` are capped at
  one pin. Monte Orlando (ninety hectares of paths), Serapo (a kilometre of sand)
  and a church doorway are the same object to any containment test — and the
  Montagna Spaccata's pin sits on the Santuario, the wrong end of the thing the
  guest wants. A bigger polygon does not fix this. **An area moves what falls
  inside it to the top, says so in one line, and leaves everything else reachable
  below.** No buffer radii, no place-polygons, no third `MapFeature` kind. The one
  version that may filter hard is the editorial one (CF20) — membership decided by
  a person, not by geometry.

- **CF20 — A zone is an editorial field, not a geometry.** `Zona` in
  `luoghi.Genre`'s exact shape — name, name_plural, slug, position, `PROTECT`,
  seeded by a data migration with the names Gaeta actually uses (Gaeta medievale,
  Centro, Porto Salvo, Serapo, Monte Orlando, Sant'Agostino, Lungomare Caboto),
  listed with a published count, addressed by slug: `?zona=serapo`, rendered by
  `typeConfigs.ts`'s existing `listFilter` as chips. **Nothing new is built on the
  frontend.** Required (FK, not null) on the two types whose footprint is one pin
  and which answer the static rows — `luoghi` and `chiese` — so nothing silently
  vanishes from a zone-filtered view; left off `ricette` (pins across town) and
  `feste` (a route crosses zones), and those types are simply never zone-filtered,
  which is the honest answer for them. A translation shows its original's zone as
  it shows its original's pins — resolve through `media_source`, or a translated
  card lands in no zone at all.
  The argument geometry cannot beat: **the Annunziata is outside the walls, and
  every Gaetano sends a visitor there from Gaeta medievale.**
  *Counter-case:* a collaborator leaves it blank and a place vanishes from its
  zone. Answered by making it required on exactly the two types that need it, and
  by never filtering the two where it would be a lie.

- **CF21 — Draw the zones once, and never render the boundary on the reader's
  map.** A zone is a filter, and a filter that is roughly right is a tool; a line
  on a map that is roughly right is a lie about where Serapo ends. This is what
  keeps zones inside the no-invented-geometry rule and why the module need not
  wait on the quartieri (README open question 1). Five or six fit a phone's chip
  row; fourteen do not.

- **CF22 — A tour is in the area when its first stop is, and the result says so
  in words** — *«Parte da Porto Salvo»*. Itineraries are not a map layer and have
  no place of their own, so "is this tour in the area" is a new predicate, not a
  filter, and static proposal 1a makes it the first thing any area filter does.
  "Any stop inside" puts a nine-stop city tour in every zone; "every stop inside"
  deletes every `percorso`, which is the form that goes somewhere. One line under
  the results — *«Altri itinerari passano di qui»* → `/itinerari` unfiltered — so
  the filter is never the last word.

- **CF23 — One answer to "where is this card", not two.**
  `itinerari/serializers.py` already has it: chosen pin → first pin → route start.
  Lift it into `content/` and have both consumers call it, rather than letting a
  second definition grow. Accept the consequence out loud: a tiella whose first
  pin is in Sant'Erasmo will not surface in a Serapo search even though another
  pin is on lungomare Caboto. If that bites, the fix is a primary point on a
  ricetta, not a second definition of where things are.

- **CF24 — Zone counts are server-side; a reader's own shape never leaves the
  browser.** These are not in tension, and the distinction is the whole privacy
  rule: **a zone polygon is ours, identical for every reader** — so
  `GET /api/map/zone/` returning `{name, slug, position, count}` is the same shape
  as `/api/luoghi/generi/` and costs nothing (a `lat__range`/`lng__range`
  prefilter on the existing FloatFields, then ray-casting in Python; no GeoDjango,
  no PostGIS, nothing that breaks the SQLite fallback CI runs on). **A shape the
  reader drew is the reader's**, and would be the first reader-supplied datum in
  a product that refused a third-party CAPTCHA, removed a third-party avatar and
  self-hosts its fonts precisely so no visitor data reaches anyone's server —
  including ours. If a polygon ever exists it is point-in-polygon in the browser
  over the payload `stores/map.ts` already loads whole, and it never enters the
  URL. Two lines beside the endpoint: a zone counts only what is on the map (the
  five `CARD_TYPES`), and **the count is not a promise about the proposal** — a
  zone can hold four places and still yield nothing on a Tuesday in February.

### The evento, if it is built

- **CF25 — An evento is not a card.** content.md adjudicated cardness against
  *length* ("The length of an entry does not change this") and says nothing about
  *lifetime*; nothing in the archive has ever stopped being true. Every rule the
  content core carries is a rule about a document that endures — media belongs to
  the original (T5), one thing one row (T6), the Italian heading (T7), a
  translation lives and dies with its original (T8), `author` is `PROTECT` so
  losing an account cannot delete cultural content. An event inherits none of
  those usefully and pays for all of them. The practical argument is not the
  ADR arithmetic: the editor a Card gives you free — rich text, an ordered images
  strip whose first photograph is the cover, a translate control — **is the wrong
  form for four facts and a time.**
  **Committed shape:** a plain `eventi` app — `title`, a wall-clock `DateField` +
  nullable `TimeField` (**not** a `DateTimeField`; *«il concerto è alle 21:00»* is
  a promise about a clock on a wall in Gaeta and must not move when a tz database
  is updated — say so in the model comment or someone will "fix" it), a required
  end date, a `category` FK to a closed admin list, a description as
  `content.fields.PlainTextField` capped short (**plain text — no sanitizer, no
  second caller of `RichText.vue`, ADR-0001's amendment untouched**), an anchor
  that is either a `card` FK + optional `point_index` or one custom point, plus
  `author` `PROTECT` and `is_published`. Not in `maps.CARD_TYPES`. Not a
  `typeConfigs.ts` entry. Not in `SchedeMenu.vue` or `ProjectView.vue` — a
  transient notice does not belong in a menu of permanent things.
  *Counter-case:* as a Card it costs a day and inherits everything — ADR-0004's
  whole premise. It loses because it puts something that expires inside a core
  whose every rule assumes permanence, and the first thing it breaks is CF27.

- **CF26 — Expiry is a query, never a job.** This codebase has two management
  commands, twelve runtime packages, no scheduler, no queue, no worker, and a
  deployment whose selling point is that there is nothing to configure. Nothing
  here has ever run without a request arriving first, and that property is worth
  keeping on purpose. "Current" is `end_date >= today` in Europe/Rome, computed at
  read time; `is_published` keeps its single meaning — *the author put this in the
  archive* — and is never written by a machine. A past event stays published and
  readable at its own URL; it simply stops being proposed. **Nothing is deleted:
  five summers of cartelloni are the town's record.**
  *The tempting wrong place:* `deploy.md`'s `api` container "runs the release
  commands on every start", so an `expire_eventi` added there would run at an
  interval nobody chose — worse than a cron, because it looks deliberate.

- **CF27 — An event anchored to a card is an occurrence, never a second
  article.** When `card` is set the event carries no body and no title of its own:
  the module renders the festa's title, prose and route and adds the date and the
  hour; the link goes to `/feste/:id`. The write path refuses an event carrying
  both a card and a description. This is `itinerari.Stop`'s exact shape, and it is
  what keeps one pin on one doorstep — otherwise the Porto Salvo procession is two
  rows and two pins for one thing, which is precisely what `maps/api.py` exists to
  prevent, arriving by hand instead of by translation.

- **CF28 — Cancelled is shown, not hidden.** A state beside `is_published`,
  meaning something different on purpose: `is_published` is *should this be
  readable*, the state is *is this still happening*. `in programma | annullato |
  rinviato`, transitions constrained the way `reports.ALLOWED_TRANSITIONS`
  constrains a report's. Cancelled renders at the top of the event's page and
  struck through in the list until its date passes; the module never proposes it.
  **Unpublishing is the wrong tool** — it means *I should not have written this*
  everywhere else in this archive, and it answers a bookmarked page with a 404, so
  the guest walks anyway. This is the one thing a collaborator may change after
  publication **from a phone in three taps**; any version needing a laptop does
  not happen at 16:00 on a Saturday. The colour is a token in `assets/main.css`,
  not in a component (D8).

- **CF29 — One occurrence, no recurrence engine.** A range capped at 60 days so a
  mistyped year cannot put a concert on every page for a decade. A festival's
  edition is one event per day worth proposing, typed by a human, or it stays
  prose on a festa card — a Gaeta sagra's programme is a poster, not a schema,
  which is `recurrence`'s own reason one level down. The genuinely recurring
  things (il mercato, la messa domenicale, a summer series) are perhaps five and
  belong in **their own small closed admin table** — name, weekday, optional
  season window, optional FK to the place — seeded with the market and nothing
  else. **Do not dispose of the Wednesday market as "a luogo card if it deserves
  one": there is no *mercato* genre, so that cashes out as one Django admin form
  adding a genre** — exactly the move content.md says the closed list exists to
  prevent.

- **CF30 — An event has no images field.** Not a field with a hint. `libri`'s
  `imagesHint` works because a collaborator has a legitimate image and needs
  steering between two candidates; a collaborator adding a sagra has exactly one
  image in hand — **the locandina** — and it is a designed advertisement
  reproduced at full width above the archive's own prose. Note what does *not*
  catch it: the seeding rule is about **rights**, and a poster the committee hands
  you has known rights; D12 is about **layout**, and a poster inside a gallery is
  not a layout slot. So decide it as a rule about what a photograph is *for*:
  **the archive publishes photographs of Gaeta, never anybody's promotional
  material, whatever its licence.** A publisher's cover stays permitted because
  the book *is* the object the card is about. Where an event sits at a card with a
  place, the reader sees that card's cover — `media_source` already establishes
  that a card can show media it does not own.
  *Cost, stated because it is not zero:* `TypeForm.vue` renders the images
  fieldset unconditionally, so this is an `images?: false` flag on `TypeConfig`, a
  `v-if`, and one Vitest case.

- **CF31 — One custom point, with a required label, on an event and nowhere
  else.** The label goes through `lib/mapText.ts::mapText` like every other string
  the map renders. The guarantee that free points cannot leak back into tours is
  **not** "an event is not a card" — it is `maps.CARD_TYPES`. Mitigation for label
  sprawl, and it costs nothing: the form offers existing cards first and the free
  point second, and a label met for the third time in Django admin is the signal
  to write the luogo card.

- **CF32 — The archive is a secondary source for events, and says so.** One
  optional URL field, rendered as *«Programma e conferme: <fonte>»* — a plain
  `<a>` built the way `lib/tours.ts` builds its Google Maps link, nothing of
  anyone's loading on our page. **It points at the organiser's own announcement,
  never at a checkout**: content.md closed that door for books pre-emptively ("an
  affiliate link to a shop is the first crack in that"), and tickets are the same
  door. **Publishing with no source is allowed** — requiring one means the archive
  can only carry what somebody else already published, which is backwards for the
  Pro Loco sagra announced on a poster in a bar. That is the module's one real
  advantage over the commercial competitor; do not legislate it away.

- **CF33 — The heading is *«Gli eventi che conosciamo»*, never *«Eventi a
  Gaeta»*.** A collaborator will file five of the forty things happening in
  August, and an aggregator's shape creates a completeness expectation a
  hand-entered list cannot meet. Zero events is a legitimate state and renders as
  one true sentence — *«per oggi non ne conosciamo»* — with one line pointing at
  the comune's own channels for the complete picture.

- **CF34 — No queue, no approval; the guard is the form.** There is nothing to
  bypass: every type app writes `is_published` straight from the collaborator's
  payload, and the gate in this product is at account creation (A2 — you approve a
  person, once). A review queue would make the fastest-moving content the slowest.
  The answer to a mistyped hour is the **form**: before saving it states the date
  back in words — *«sabato 26 settembre, ore 22:00»* — and **an event date is
  never rendered anywhere without its weekday**, through one `lib/when.ts`
  formatter. A human who meant Saturday reads *venerdì* and stops. The write path
  refuses a date in the past; `mine/` orders events by event date, past ones
  flagged — the one ordering exception to `-card__created_at` in the codebase, and
  it wants a comment saying why: an archive ordered by when things were written
  cannot show anyone a mistake about when things happen.

### Content, and telling the truth about it

- **CF35 — The floor, written as rows and not as an adjective.** Measured in the
  development database on 2026-09-22, not read off the roadmap: **29 cards, 12
  published** and most of those e2e fixtures; **`luoghi` has zero rows**, so not
  one of Gaeta's seven beaches exists as a card; **both itinerari are titled
  `[DEMO]`**; **three `CardImage` rows** in the whole database. Three of the four
  static rows have nothing behind them today, and the fourth is the one whose
  availability this project has twice refused to model.
  **Committed floor, per row:** three beaches (Serapo, Sant'Agostino, Arenauta —
  three, because a rotation needs something to rotate and because they sit in
  three parts of town); four open-air free sights (Monte Orlando, Punta
  Stendardo, the Lungomare Caboto, the Mausoleo di Munazio Planco); two ricette
  whose pins somebody has stood in front of; **one published `percorso`**, not a
  raccolta. Ten cards and one tour, every one already owed to roadmap item 4.
  **The module computes its own readiness at runtime from published counts — the
  same shape as `WelcomeView`'s `withTours`, not a flag anyone must remember to
  flip — and while it is below the floor nothing links to it.** Anyone with the
  URL sees the page; nobody is sent there; the front door opens by itself the day
  the archive can answer.
  *Counter-case:* one card per row so it ships in a weekend and the content
  follows. Rejected on the third morning of a guest's stay, and because a page
  seen empty by the first twenty visitors does not get a second look.

- **CF36 — The three bakery pins on the Tiella card are fabricated, and one of
  them is the map centre.** Verified 2026-09-22: *Panificio del Corso* sits at
  `41.2172608 / 13.5625165`, which is `MAP_CENTER_LAT`/`MAP_CENTER_LNG` exactly;
  *Forno del centro storico* and *Panificio del porto* are that same constant with
  small offsets. They are seed rows with real-sounding names. Nothing today turns
  a pin into an instruction a guest acts on within the hour; **the lunch row
  would.** **Before anything reads a ricetta's pins, every `MapFeature` on every
  ricetta is stood in front of and confirmed, or deleted** — starting with those
  three, whether or not this module is ever built. A rule joins the seeding
  section beside "No invented geometry": *a pin on a shop is a claim about a
  business, and an invented bakery is that mistake with an address on it.*

- **CF37 — A festività is a sentence a Gaetano wrote, never a name a library
  returned.** The one word covers three features with opposite valence: a civil
  closure (negative, national), a local feast (positive, local — already a content
  type here), and a one-off event (2b). Building one control for all three is how
  a tourist reads *«oggi è Ferragosto»* on the fullest day of the Gaetano year and
  concludes the town is shut. Note too that Gaeta's patron day, 2 June, is already
  Festa della Repubblica — so the local feast creates no *extra* closure to warn
  about, and the national list knows nothing about the busts leaving the cathedral.
  **Committed:** no calendar dependency, no civil-holiday banner. **The only
  festività the module signals is a festa card on a date a person confirmed —
  which is K2's per-year occurrence row and nothing less.** 2c is not buildable
  without it; that is the honest statement, and it is why K2 is a decide-first and
  not a nice-to-have. If a closure line is ever wanted it is one sentence true
  every day of the year — *«nei giorni di festa molti negozi sono chiusi»* — not a
  computed banner. **If `holidays` is ever added:** pin it, bump it in its own PR
  under TD-33, and write `# never subdiv='LT'` beside it — Gaeta is not a
  provincial capital, so `LT` returns *Latina's* patrons under Gaeta's name.

- **CF38 — Refuse the bathing season.** It is an administrative window about
  lifeguards and water sampling, re-decided every year by regional decree and
  varied by comune — not an answer to the question the reader is asking, which is
  whether going to the sea today is a good idea. It would also be the third
  per-town constant after the two the multi-city phase already tracks. **Beaches
  are proposed all year**, because a beach in Gaeta is a place and not a service —
  which is the author's own rule, already written for the stabilimenti. Serapo on
  12 October is one of the better walks in Gaeta and a decree date would suppress
  it. The season changes **the sentence** (*«la spiaggia lunga, con il sole fino a
  tardi»* / *«una passeggiata sul lungomare»*), per CF5.
  *Counter-case, and it is serious:* out of season there are no lifeguards at
  Serapo, and the currents at Arenauta are why people drown there. Answered by the
  prose and by `how_to_get_there`, not by a decree table — a date range would tell
  the reader the sea is safe on 30 September and dangerous on 1 October, which is
  a worse claim than the one it replaces. **The module never says *fai il bagno*,
  never mentions the season or the bandiera blu, and never implies supervision.**

- **CF39 — No access field, no accessibility flag; reprint `how_to_get_there`
  verbatim, inside the proposal.** A raccolta's stop already does this (decided
  2026-09-19), and this is the surface where it is load-bearing — three hundred
  steps to the Montagna Spaccata and a bus that runs twice are the facts that
  decide whether someone's afternoon works. **Rewrite the field's placeholder** to
  ask for the cost as well as the means: *«A piedi dal centro, trecento gradini
  fino alla grotta; in auto, parcheggio sulla Flacca; senza auto, autobus sulla
  Flacca (poche corse).»* One string, and it is the whole feature. An empty
  `how_to_get_there` **ranks a place down; it does not remove it** — excluding it
  hides the Castello because nobody finished a card, and makes an optional field
  quietly mandatory. An `accessibile` boolean is the opening-hours trap with a
  worse victim: the reader it misleads is the one least able to absorb a wasted
  hour.

- **CF40 — The module never ranks two things of the same kind that have owners.**
  *L'archivio sceglie tra luoghi, mai tra attività.* Where a set has more than one
  member with an owner, show all of them — which the map already does. Picking
  exactly one is permitted only where the member has no owner: one beach, one
  monument, one church, one tour. Practically, the lunch row is *la tiella* plus
  every pin that sells it, unordered, and the guest chooses.
  *Counter-case:* a list of everything is a directory, and the guest asked for a
  proposal precisely so as not to choose. The answer is that the archive can
  decide what is *worth knowing* and stay defensible; the moment it decides what
  is *best* among peers who trade, it has created something worth buying and has
  no criterion it can publish to explain the result.

- **CF41 — The venue field names a place; a business name may appear only in the
  prose.** A free concert at a lido is the loophole in the place/business line, and
  it is real: *Spiaggia di Serapo*, *Molo Santa Maria*, *Piazza Traniello* in the
  structured field, the pin on the actual gate (a coordinate is a fact, not an
  endorsement), and *«il palco è davanti al lido, sul lato di Via Marina di
  Serapo»* in the collaborator's own sentence. Accuracy at the moment of use,
  presence out of the structured data — which is where presence is worth money.

- **CF42 — Events and archive cards are never merged into one ranked list.** The
  static half is for the tourist; the events half is addressed to whoever is in
  Gaeta, local or not, and that is not a defect — the title *«Che si fa a Gaeta?»*
  is a question a local asks. The local scrolls past the Castello, the tourist past
  a beach-volleyball tournament, and both leave. One free consequence worth
  taking: **the events surface carries one line at its foot** — *«Sai di qualcosa
  che qui non c'è? Scrivici.»* → `/collabora`. It is the first reason a Gaetano
  would ever open that form, and roadmap item 4 is the bottleneck. The
  counter-case stays on file: a what's-on board for locals is a listings board,
  and the day a bar asks to be on it, D10 is what answers — so the answer has to
  be written before the request arrives.

- **CF43 — The multi-day guest gets variety from the date, and that is all.**
  *(Missing from the first pass.)* CF9 forbids a seen-list, so a guest on day
  three has only the calendar to distinguish their morning from yesterday's. Over
  CF35's floor that is a **three-cycle** on beaches and a four-cycle on sights —
  say so out loud rather than discovering it on the third morning. It is an
  argument for the floor being a floor and not a target, and it is the strongest
  reason the module's real dependency is roadmap item 4.

### Operations

- **CF44 — Who adds an event every week, in February?** Every surface this product
  has built is write-once: a card about the Cappella d'Oro is as true in 2030 as
  today, which is the property that makes a one-author archive viable. An events
  feed is the first surface with a **cadence**, and it is a subscription signed on
  behalf of a circle of collaborators that currently has one confirmed member — in
  a repo where eleven drafts have been unpublished since 2026-09-11.
  **Committed:** the events half is additive and never load-bearing. The static
  half needs nobody weekly. With no current events the module renders no empty
  board — one sentence and a way out to the map. Nothing is ever proposed because
  it is the most recent thing in the table; an empty row stays empty.
  *Do not put a named maintainer in the spec* — this repo records decisions, not
  staffing. Record instead the test that costs nothing today: **publish one of the
  eleven drafts, and publish one itinerary so `/benvenuto` works.** A weekly duty
  is strictly larger than that.

- **CF45 — This is the first feature whose content rots while it waits for the
  deploy.** Every phase so far was safely buildable before roadmap item 3, because
  an archive is an archive whether or not anyone can reach it. **An events surface
  built undeployed does not bank the work, it spends it.** Build order: item 3
  (host, mail, domain, the author's signal) → the site is live with whatever
  archive exists → then the events half. What may be built before the deploy is
  only what does not rot: the fasce and their copy, the deterministic pick, the
  zones, and K2's occurrence rows, since *la seconda domenica di agosto* is as
  true offline as online.

- **CF46 — The deterministic pick cannot run over page 1.** `/api/luoghi/`,
  `/api/ricette/` and `/api/itinerari/` all paginate at 20 (`StandardPagination`,
  `page_size` capped at 100), so a browser-side pick silently draws from the first
  page and calls it "the archive". Under CF35's floor that is invisible and in two
  years it is a bug nobody sees. **Committed:** the SPA requests `page_size=100`
  explicitly and the pick asserts it received fewer rows than the cap; the day a
  type passes 100 published rows, that assertion is what tells you, and the answer
  then is a small aggregate endpoint, not a bigger page.

- **CF47 — The e2e and throttle budget.** The module's pages are public, so its
  cases cost nothing against TD-18's 10/min login limit; any collaborator case
  joins the existing `testIsolation: false` block rather than signing in again.
  New axe cases at minimum: the page empty, the page with results, the page with a
  zone applied. And `DEFAULT_THROTTLE_CLASSES` is unset — **if a proposals
  endpoint is ever built it is the first read-only public surface needing a
  throttle class of its own**, counted through the DatabaseCache that needs
  `createcachetable` at release. One more argument for composing in the SPA.

## The blocking questions

Five. Everything else follows.

### Q1 — Does the module make any availability claim at all?

**Recommendation: no.** The fascia chooses **the shape of the page** — which rows
appear and the sentence around them — and never whether a church, museum or
bakery is open. The slot filter applies with full force to exactly one thing:
**events**, which carry a time a person typed. One sentence on the page, in
ProjectView's register: *«Non conosciamo gli orari di apertura: telefona prima di
salire.»*

*Strongest argument against:* the fascia then does almost nothing for the static
half, and a guest who picks 15:00–18:00 and gets the same three cards as at 10:00
will conclude the control is broken. **True, and it must be said plainly: of the
three filters asked for, #3 is declined (Q4), #1 changes phrasing rather than
content, and #2 has nothing date-dependent to act on until events or K2 exist.**
If the filter must bite on static cards, the amendment to argue in design.md is
**a single nullable weekly closing day** — *lunedì chiuso* is the real Italian
availability fact, and design.md already showed hours are lossy — and it belongs
in that file before it belongs in a model.

### Q2 — Is «un posto dove mangiare» a dish or a door?

**Recommendation: a dish.** The module surfaces a ricetta — *«Oggi si mangia la
tiella»* — with that card's existing "dove si compra" pins shown together,
unranked (CF40), once they have been confirmed (CF36). The archive's own
material, already published, with no owner to sell it to, and the only option
that escapes the closed-door trap: being told about a dish is useful even if one
shop is shut. **This declines static proposal 1b as written**, and it should be
heard plainly rather than discovered in the copy. No restaurant type, no
`Ristorante` genre, no meal band.

*Strongest argument against:* a guest at 12:50 wants a table, not a recipe, and
will open Google Maps — so the module fails at the exact moment it promised to
help, and the beach-club refusal starts to look like squeamishness rather than
principle. The answer is that the product already says Google Maps is for going
somewhere and this is for knowing the place. **If the door is wanted instead:** it
is a new type with the editorial rule as its visible gate (~one day of code), and
it commits the author, by name and forever, to being the person who decides which
Gaeta restaurants exist in the archive and to defending that list to the ones that
are not in it. That is a product change with an ADR and a revision of design.md's
Patronage section, not a filter.

### Q3 — Does the module compose a day, or hand over things that already exist?

**Recommendation: it composes, but never sequences and never fills.** CF8–CF11.

*Strongest argument against — and it is the best single case in this file:* **a
composed proposal is the first page in this archive nobody signed.** I10 refused
to let the *guest* assemble a day; it said nothing about the *server* doing it,
because nobody had proposed that — so this arrives at I10's outcome from an angle
I10 never considered. And *Il progetto* tells the reader, in Italian, that these
schede are chosen *per merito editoriale*, which is a claim about a person having
chosen; a day assembled by a for-loop is chosen by whatever `ORDER BY` the
endpoint happens to use. The full-strength version: **collapse the static half to
one row — a curated itinerary, which already has an author and already contains a
meal and a beach and a sight when its author put them there** — and conclude that
proposals 1b/1c/1d are not features but a request for **more itinerari**. Not
taken here, because it also makes the fascia decorative and leaves a guest with
three hours before a train unserved; but it is the position to argue out of first,
and if it is taken, everything else in this file gets cheaper.

### Q4 — Named zones, or a drawn area?

**Recommendation: named zones, and no drawing at all** (CF20/CF21). It is
simultaneously the shareable control (a polygon is not a link a person can read),
the keyboard control ADR-0005 requires (K4), the phone control (D2 makes the
logged-out mobile reader primary, and tracing a polygon with a finger over a map
that pans on drag is the weakest interaction in the proposal), and the one whose
empty result costs a tap instead of thirty seconds of tracing. It also survives
`RoutePanel`'s Escape-and-Back handlers, which would otherwise destroy a drawn
shape with the two gestures a reader uses most. And the names read better in a
proposal than any lasso — *«a Serapo»*, *«in medievale»*.

*Strongest argument against:* a chip is not *«qui»*, and *hic et nunc* was the
brief. A guest standing at Sant'Agostino wants what is around them, not a
district they have to know the name of. If that bites in real use, the answer is
**a point and a radius** — tap once, then a slider: keyboard-operable by
construction, one number in the URL, a circle Leaflet draws with no plugin, and
`startEditing({ kind: 'pins', max: 1 })` already gives the centre picker with no
change to the store's union. **Freehand is the enhancement of last resort, never
the only way in.**

### Q5 — Is an evento a card, and when is it built?

**Recommendation: not a card, and after the deploy** (CF25, CF45).

*Strongest argument against:* as a Card it costs a day and inherits sanitization,
images, drafts, translations, the editor and the map footprint for free —
ADR-0004's whole premise — whereas a separate model is the first
collaborator-written thing outside the content core, with its own form to
maintain forever. And "after the deploy" is circular if a finished module is what
produces the signal. The answer to the second half is that the module to finish
first is the static one, which does not decay: it is made of an archive.

## The shape

### Now — *«Oggi a Gaeta»* on `/benvenuto`, about fifty lines

One tour and one place, rotating on the date, no filters, no new route, no new
model, no backend. It tests the only question that matters — **does a rotating
proposal read as editorial or as an ad?** — on the one address printed on paper,
costs nothing to remove, and needs exactly the same ten cards the full module
needs. If it reads as an ad there, it will read as an ad everywhere, and that is
an afternoon's finding rather than a phase's.

### Then — the content floor (CF35)

Ten cards and one published `percorso`. Not engineering. **It is the module's
only real dependency**, and it is owed to roadmap item 4 regardless.

### Then — `/cosa-fare`, one sitting, frontend only

One route, no new model, no new endpoint, no drawing, no calendar, no ingestion.
Reads `/api/itinerari/`, `/api/luoghi/?genere=spiaggia`, `/api/luoghi/` and
`/api/ricette/`, all of which exist and already filter (with CF46's `page_size`).
`?giorno=`, `?fascia=`, `?intento=` in the URL; `meta.panel: 'narrow'`, the map
beside it, focus through `useMapFocus` — **nothing in `stores/map.ts` changes**.
Reached from `/benvenuto` and the map home, **not** from the header pill (no room
at 360px, and it should not be in the pill while it cannot answer), and **not
linked at all** until the floor is met.

### Then — zones, half a day plus an author input

`Zona` model, seed migration, `/api/map/zone/` with counts, a required FK on
`luoghi` and `chiese`, chips via the existing `listFilter`, tour-in-area by first
stop. The polygons are the author's to draw, once; the backfill is eleven rows
today and a chore in a year.

### After the deploy — eventi, and only then, two to three days

CF25–CF34, plus the fasce table if it has not already arrived. **K2's per-year
occurrence row rides with it**, because without it requirement 2c has no
mechanism at all.

## Considered and not taken

- **A ninth card type for events.** Passes the material test that killed
  `tradizioni`, fails the permanence one.
- **A meal band named *pranzo* / *cena*.** Q2, CF4. The bands are light and heat.
- **A `Ristorante` genre.** The cheapest option on the board and the only one that
  can happen with no PR, no migration and no spec edit — which is exactly why it
  would need an ADR. It also reads worst under D10: a trattoria in the same list,
  with the same chrome, as the Mausoleo, so the page's construction says the
  trattoria is a monument.
- **Handing "ristoranti vicino a qui" to Google.** Defensible as honesty, and it
  escapes the closed-door trap completely. Not taken because every existing
  hand-off sends the guest to a place **we** chose, for directions; a search sends
  them to a list **Google** chose, which is a paid-placement ranking, from the
  company TD-30 and D6b took off our pages.
- **Feeding the zone chooser from the quartieri overlays.** ADR-0006.
- **A per-device "don't show me this again".** I7 is about the guest, not the disk.
- **Random or time-of-request selection.** Indistinguishable from an A/B test to
  two guests comparing phones in the same hallway; breaks shared links; breaks
  every Cypress assertion; reads as arbitrary on a page whose claim is curation.
- **Multi-focus on the map ("the day's four items, numbered").** CF16.
- **A convex hull, a bounding box or an area cap to repair a bad freehand
  gesture.** Each is wrong on the commonest input: on this promontory, a hull over
  a C-shaped drag along the lungomare swallows the bay.
- **A declared-interest field on collaborators.** Everyone in Gaeta is somebody's
  cousin, and the answer is a paragraph in the email sent to a new collaborator,
  not a checkbox. It stops being absurd only if businesses ever become cards —
  one more reason the answer to Q2 is no.
- **A collaborator dashboard of what the archive is missing.** The instruments
  exist (`/api/luoghi/generi/`, `/api/itinerari/intenti/`, `mine/`), and on
  today's database every line would read "missing".
- **An approval queue for events.** CF34.
- **An SSR / prerender answer to "cosa fare a Gaeta oggi".** A distribution
  question for a product with no host, no domain and no readers; "a commercial
  operator owns that query" is an argument for writing better content, not for
  adding a rendering runtime.
- **`published_at` on `Card`.** A real gap — a card drafted three weeks ago and
  published this morning sorts three weeks back in every list — but unrelated to
  this module. It belongs in tech-debt, not here.

## What it would cost

Measured against this repo's three data points: **libri** one sitting, **luoghi**
one day, **itinerari** backend and frontend in a day.

| | Cost | Notes |
|---|---|---|
| *«Oggi a Gaeta»* on `/benvenuto` | **An afternoon.** | Fifty lines, no model, no route. |
| **`/cosa-fare`** | **One sitting.** Zero backend. | One view, `lib/when.ts`, one pick function, config, ~3 axe cases, one Cypress spec. Everything it reads exists. |
| **Zones** | **Half a day**, plus the polygons. | Model + seed + endpoint with counts + FK on two types + migration; chips are free. |
| **Eventi** | **Two to three days**, and not thin. | It sits *outside* the content core, so it pays for its own form rather than inheriting `TypeForm`: `luoghi`-sized backend plus a bespoke form, a list surface, the fasce table, the cancellation state. |
| Events as a map layer | **+ half a day, and a decision.** | A layer entry, a contrast-checked colour **token**, a `maps.CARD_TYPES` entry — which also makes a concert a legal itinerary stop unless the tuple is split — a third text list (C5's rule is a rule), and two hand-maintained enumerations `ProjectView.spec.ts` asserts. |
| Per-year festa dates (K2) | **A day**, as occurrence rows. | A small table, a write path, a form control, and a content chore each year — the version that cannot be silently wrong. **Required for 2c.** |
| Freehand area | **A day and a half, and it does not end there.** | A fourth editor kind on a single-leased store, an `L.polygon` branch, a drag protocol where only `map.on('click')` exists, a Leaflet plugin verified against the preview build (TD-02), and a keyboard equivalent that turns out to be the zone chooser — plus a Cypress test of it, because the axe gate cannot see inside `.leaflet-container`. |
| Opening hours | **Days, then forever.** | A field on three types, a time field kind the SPA lacks, and a permanent upkeep obligation with no answer to "what do we show when nobody kept it current". |
| Ingestion | **Not costed.** | There is nothing to ingest. |

**The honest summary: the module's static half is one sitting, and its only real
dependency is ten cards already owed to roadmap item 4. Everything that costs
days is either the evento — which should wait for the deploy — or a decision this
repo has already refused once.**
