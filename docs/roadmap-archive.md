# Roadmap — the closed half

> **This is the archive.** What is still ahead is in
> [roadmap.md](./roadmap.md); this file holds the phases that are **done**,
> with the reasoning that got them there.
>
> Split out on **2026-09-22**, when four of the eight items were complete and
> the two that mattered were buried at 200 lines deep. **The numbering is
> untouched** — items 1, 2, 6 and 7 live here and keep their numbers, items 3,
> 4, 5 and 8 keep theirs in the active file — because the whole doc set refers
> to these by number ("roadmap item 1", "roadmap item 4"), and renumbering to
> tidy a file is how eleven references start pointing at the wrong phase.
>
> The completed halves of item 3 (deploy prerequisites) and item 5 (the two
> phases built on 2026-09-18) stayed with their items in the active file: each
> is a checklist with live entries beside the struck-out ones, and splitting a
> checklist down the middle would cost more than it saves.

## 1. Design — **complete (2026-08-31)**

**Done, 2026-08-27 to 2026-08-31**, in the order the spec set: the palette and
the type as tokens, the reader's home small-first, the card as an article, the
lists as a grid of covers, the collaborator's authoring forms, and last the two
pieces that closed it — the site footer D11 asks for, and `ReportDetailView`,
the one v1 screen a reader reaches from a pin on the redesigned home.
`spec/design.md`'s four open questions are all answered, and its foot records
what the pass deliberately left in v1 clothes (`/polls`, `/users`, `/profile`,
the auth forms and `ReportForm`) with the reason for each. **Item 2 is now
active.**

The requirements the pass was measured against, and the reasoning behind them,
stay below — they are what the next person checks a change against.

**Nobody has styled this product.** Every view is default Tailwind panels in a
two-column grid; it looks like what it is, a working app nobody has designed.
The spec's audience is *tourists, including foreign ones, who want an
instrument to live the city fully* — and the spec is honest that this is a bet,
not an observed need. The design pass is where that bet is either honored or
lost, which is why it goes first.

**It started with an interview, not with CSS** — same as v2 did. That interview
happened on **2026-08-27** and its confirmed output is
[spec/design.md](./spec/design.md): the two audiences and which one wins, the
mobile home (full-bleed map + bottom sheet), the register, the palette from
Gaeta with the purple retired, colour in tokens, and the rule that sponsor
presence is earned rather than bought. **Read it before touching a stylesheet**;
what was open there when this was written (actual palette values, typography,
whether the authoring screens are restyled in the same pass) is what the pass
decided — all four questions are answered in that file, dated.

**Why ahead of TD-04 (item 2).** Writing Cypress specs now would pin selectors
and copy on screens that are about to be redrawn — exactly the mistake that
deferring TD-04 through C2–C5 was avoiding. Coverage follows the redesign by
one step, not the other way round.

**Constraints the design inherits, already decided:**

- **WCAG 2.1 AA, whole app** ([ADR-0005](./adr/0005-wcag-2.1-aa-accessibility-bar.md)).
  Contrast ≥4.5:1 checked with the relative-luminance formula rather than
  eyeballed, one `<h1>` per view, every label associated, focus visible. A
  palette that fails contrast is not a candidate, however good it looks.
- **The map is the landing view** ([map.md](./spec/map.md) M1). C5 deliberately
  did *not* build M1's "minimal top menu" as a chrome redesign — the layer
  toggles live in the panel beside the map and the nav kept C3's `SchedeMenu`.
  **A full-bleed map with floating chrome belongs to this phase**, where it is
  a design decision rather than something smuggled into a phase about geometry.
- **Italian copy** (N4), and the brand is **Vivere Gaeta** (v2).

**Two known flags, both product calls rather than defects:**

- `SiteTitle.vue`'s purple gradient is impeccable's classic "AI-generated UI"
  tell. It is the M4 brand, so replacing it is a decision to take deliberately
  in this phase — not a detector finding to silence.
  *(The phase took it: the gradient is retired, and the component — now
  `components/typography/SiteTitle.vue` — carries a comment saying so.)*
- `PanelBox` is `h-full`: a stacked column needs `self-start` on its grid item
  or every panel stretches to the row height. Whatever replaces the panel
  layout should make that impossible rather than remember it.

**Tooling.** The `impeccable` plugin (user scope, currently disabled) is built
for exactly this and should be enabled per session during the pass; its
detector baseline is recorded in `CLAUDE.md`, including one known false
positive (the `PollCard.vue` ternary). agent-skills' `frontend-ui-engineering`
is the process counterpart. Note that CLAUDE.md's scope guard — treat their
WCAG findings as advisory — was written when the accessibility question was
open. **It is no longer open** (ADR-0005), so their contrast and
keyboard findings now land against a bar this project has accepted.

## 2. Coverage: TD-04 and the deferred accessibility work — **complete (2026-09-10)**

Two things that were deferred for the same reason (the screens kept changing)
and are unblocked by the same event (they will have stopped):

- ~~**TD-04 (e2e).**~~ **Largely paid 2026-08-30**: four spec files, 17 tests,
  against a real API that CI now starts beside the production build. Covered:
  the map and its layers, a draft staying invisible, the confidential overlay
  staying *absent*, reading a card on desktop and through the mobile sheet,
  and the collaborator's whole loop — log in, write, publish, draft, translate.
  **The v1 flows this register first pointed at — filing a report, upvoting,
  voting in a poll — landed 2026-09-04** in `v1-flows.cy.ts`, which needed two
  fixtures and a clean-up rule in `seed_e2e` (a report someone else wrote, an
  open poll, and the collaborator's votes and upvotes cleared between runs,
  since a vote is final and an upvote is a toggle). **One named gap is left,
  on purpose:** the leg after an admin approves a collaboration request. Two
  different things lived under that one sentence and were conflated until
  2026-09-08:
  - ~~**Automating it**~~ — **done 2026-09-10**, the author choosing the
    outbox over a test-only endpoint so production code carries no door built
    for tests. Under DEBUG with `E2E_MAIL_DIR` set, the API writes each
    message to a file; `collabora.cy.ts` files a request, approves it through
    the real Django admin action, reads the link out of the mail, chooses a
    password and signs in. **With it TD-04 is paid in full**, and item 2 has
    nothing left in it.
  - ~~**Walking it once, by hand**~~ — **done 2026-09-09**, and it works end to
    end: request, admin approval, the e-mail, the link, the password, the login,
    and the new collaborator reaching an authoring form. The single-use token
    and the field-attributed password mismatch were checked rather than assumed.
    What it found was on the *review* surface, not the reader's:
    **Django admin was answering in English** ("Pending", "Collaboration
    requests") on the one screen where the author decides about a person —
    fixed the same day. The full account is at the foot of
    [spec/accounts.md](./spec/accounts.md).
- ~~**The three items ADR-0005 deferred**~~ — **all three settled**: two
  built, the third decided. **The focus-order and skip-link pass the ADR lists
  separately is done too (2026-09-08)**, which empties that list entirely: a
  skip link past the seven chrome stops that precede every page, the map's pins
  actually out of the tab order (the 2026-09-05 decision said they were;
  Leaflet's defaults said otherwise), one element instead of a `<button>`
  inside an `<a>` on both list views, and focus returning from the mobile layer
  panel to the button that opened it. What is left of this item is TD-04's one
  named gap.
  - ~~an accessibility gate in CI~~ — **done 2026-08-31**:
    `frontend/cypress/e2e/a11y.cy.ts` runs axe-core over eleven surfaces at
    ADR-0005's own four WCAG tags, inside the existing e2e job, against the
    production build. It found no violation on any of them at the time it
    landed, which is a floor and not a certificate — see the ADR for what it
    deliberately does not check.
  - ~~full map-widget operability for screen-reader and keyboard users~~ —
    **decided and closed 2026-09-05**, by declaring the text lists the
    equivalent path and making that true: the reports layer had no list at all,
    so a report was reachable only by clicking its pin. `ReportsList.vue` is
    the missing half. The markers themselves stay unfocusable on purpose —
    clustering means "every marker is in the tab order" is not a state this
    widget has — and the ADR names what that costs (spatial relationships reach
    a sighted reader and not a screen-reader one). The gate keeps excluding
    `.leaflet-container`, now as a statement rather than a deferral.
  - ~~error-to-field ARIA wiring on the **auth and profile forms**~~ —
    **done 2026-08-31**, which closes this item outright: all seven moved onto
    `FormField`, validation is attributed to the field that failed rather than
    prefixed with its label, and API errors are kept per field so Django's
    password validators land under the box they are about. Worth noting that
    the gate could not have prompted any of it — an input takes an accessible
    name from its `placeholder`, so axe passed those forms while their labels
    were unassociated. The ADR was the reason; the gate is not a substitute
    for it.

## 6. Build v2 — **complete (2026-08-27)**

> **The standing picture, written the day this closed.** *The v2 build order is
> complete: C1 through C5, each proven before the next (the record is below).
> Every feature the spec asks for exists and is tested. Nothing that remains is
> a feature — what stands between this and a site a tourist can use is design,
> coverage, deployment, and content. Those are items 1 to 4, in the order the
> author chose on 2026-08-27; item 5 records two phases named that day and not
> scheduled.* Three of those four are done now; the fourth is the content, and
> it is the one nobody can build.

The spec's build order ([spec/README.md](./spec/README.md#suggested-build-order)),
one phase per PR, each proven before the next:

1. **C1 — accounts — delivered (2026-08-21).** "Collabora con noi" request
   (honeypot + timing anti-spam, not a third-party CAPTCHA — see the
   [accounts.md](./spec/accounts.md) A1 note), admin approval, invite e-mail
   with single-use setup link, password reset. Reverses v1's open-signup
   decision; brings e-mail back as real configuration (`FRONTEND_URL` +
   `EMAIL_BACKEND` in settings.py). The **steering capability** landed here as
   an admin-set flag (spec [politics.md](./spec/politics.md)) — its tooling
   does not.
2. **C2 — content core + feste end-to-end — delivered (2026-08-22)**:
   sanitized rich text (the ADR-0001 revision landed with it, not after —
   `content/sanitize.py` is the chokepoint, `RichText.vue` the one `v-html`),
   images, translations plumbing (`Card.language`/`translation_of`, unused
   until C4), a procession route on the map, a published card readable
   anonymously. The richest type first, to prove the core. **Did not** include
   an accessibility-bar decision at the time — that followed two days later,
   see item 7 below.
3. **C3 — the remaining thin type apps — delivered (2026-08-22)**: chiese,
   ricette, personaggi, dialetto, each a small diff over the proven core
   (ADR-0004). Extracted `content/api_helpers.py`/`content/serializers.py`
   (shared image/point-pin/permission logic) once a second type app needed
   what feste had inlined, and one generic config-driven frontend
   `TypeForm`/`TypeListView`/`TypeDetailView`/`TypeCreateView` set instead of
   four more `Feste*.vue` copies — both extend the "days not weeks" bar to
   the frontend, not just the backend.
4. **C4 — translations — delivered (2026-08-22)**: per-card translations
   (English first) over the `Card.language`/`translation_of` plumbing C2 left
   unused, a collaborator's "traduci questo articolo in…" control
   (`content/api_helpers.py::start_translation` — one write path every type
   app's new `<type>_translate` endpoint calls; translating a translation is
   refused, so the group is always original-plus-translations, never a tree),
   and the reader's language switch (`content/serializers.py::visible_translations`,
   published-only unless you're the card group's author/admin). No new
   frontend routes: `LanguageSwitch.vue`/`TranslateControl.vue` are shared by
   `TypeDetailView.vue` and `FesteDetailView.vue`, navigating straight to the
   new translation's own detail id.
5. **C5 — the map: layers & overlays — delivered (2026-08-27)**: one
   toggleable layer per card type over a single aggregated
   `/api/map/features/` endpoint (translations excluded — one pin per place,
   not per language), the v1 reports layer beside them, and overlays in both
   kinds: quartieri/seggi GeoJSON polygons and georeferenced historical
   rasters with a live opacity control. The seggi overlay is confidential **by
   construction**: `Overlay.visibility` defaults to the steering tier,
   `Overlay.objects.visible_to()` is the single gate, and `visibility` is
   never serialized — [ADR-0006](./adr/0006-overlay-visibility-gate.md).
   Overlays are authored in Django admin (the author supplies the boundaries
   and the scans), so the spec's open questions 1 and 2 (where the
   boundaries and the georeferenced scans come from) are now *input*
   questions, not build ones. `ReportsMap.vue` became `GaetaMap.vue` — it draws more than
   reports now.

**A sixth card type landed after that order closed.** `libri` — recommended
books about Gaeta — was proposed on 2026-09-09, specified in
[spec/content.md](./spec/content.md) the same morning and built the same day,
without a phase of its own: no new component, no new view, its backend shape
copied from `dialetto` (the other type with no map) and its frontend a config
entry, three routes and an icon. A second type proposed in the same
conversation, `tradizioni`, was dropped by the author within the hour — every
card he could name for it was already a festa or a ricetta, and the reasoning
is kept in the spec because it is the argument against the next generic type
too. **This is ADR-0004's "days, not a module" bar measured for the sixth
time**, and the first time it was measured on a type nobody had planned for.

**With C5, the v2 build order is complete** — C1 through C5, each proven
before the next. What comes after it is items 1 to 4 above; whatever comes
after *those* starts by editing the spec, not this file.

The debt register that ran alongside this build order —
[tech-debt.md](./tech-debt.md), whose closed half is now
[tech-debt-archive.md](./tech-debt-archive.md) — is down to **TD-04** (item 2)
and **TD-06** (item 3). *(2026-09-18: both since closed — TD-04 in full on
2026-09-10, TD-06 with two upgrades held back on purpose; what the register
keeps open now is TD-08 and TD-37, each deliberately. 2026-09-22: two more,
TD-47 and TD-48, both carried over from the coverage gaps the first audit
named and nobody re-walked.)* TD-02, the double Leaflet bundle it had reserved for a session of
its own, was paid at the head of C5 and verified in a production build with
clustered pins on screen.

## 7. Accessibility — decided (2026-08-22): WCAG 2.1 AA, whole app

Recorded in [ADR-0005](./adr/0005-wcag-2.1-aa-accessibility-bar.md), not just
here: v1 scoped WCAG out (N5); the v2 tourist audience reopened the question at
C2, and it went unanswered through that phase. Now decided, and a first
remediation pass landed with the decision — see the ADR's Consequences for
exactly what was fixed (label/input associations app-wide, icon accessible
names, duplicate/missing page headings, several color-contrast failures, and
the two Critical keyboard-only map interactions) versus what's deliberately
deferred (full map-widget screen-reader operability, error-to-field ARIA
wiring, a CI accessibility gate). C3's four remaining card types inherit the
bar from day one.
