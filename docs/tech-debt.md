# Technical debt register

> **What is open, and nothing else.** Fifty-five items have been recorded
> since the first audit on 2026-08-19; fifty-two are paid and live, with their
> evidence, in [tech-debt-archive.md](./archive/tech-debt-archive.md). Read that file
> for how a defect got in and what proved the fix. Read **this** one before
> proposing work.
>
> Split in two on **2026-09-22**. The reason is itself a finding: at 1,492
> lines with two open items, the register had stopped answering the only
> question a planner asks it. Three sections were actively lying by then — a
> "suggested order" whose steps 6, 7, 10 and 11 were all done, a documentation
> table whose prose said it was open under ten closed rows, and a list of
> coverage gaps nobody had re-walked, half of which had been paid in passing.
> All three are corrected in the archive rather than deleted.
>
> **Adding an item:** next number is **TD-56**, continuous across both files.
> It goes here; it moves to the archive when it is paid, with what proved it.

## The gates — re-run 2026-10-26, for release 2.0.0

| Gate | Command | Result |
|---|---|---|
| Backend tests | `python -m pytest` | **757 passed** in ~20s |
| Backend lint | `python -m ruff check .` | clean |
| Frontend tests | `npm run test:unit -- run` | **843 passed**, 97 files |
| Frontend lint | `npx oxlint` · `npx eslint .` | clean |
| Format | `npx prettier --check .` | clean |
| Build | `npm run build` | green, ~2s |
| E2E | `npm run test:e2e` | **11 spec files, 122 tests** — green in CI on #151; 119 of them run locally on an isolated stack (`collabora.cy.ts` hard-codes the API on `:8000`) |
| Performance | `npx @lhci/cli@0.15.1 autorun` | 7 pages × 3 runs, every budget met — green in CI on #151, where `/` became the welcome page and `/mappa` the map (2026-10-26); on a Mac before that, LCP 1.84–1.85 s in Italian and 2.00 s in English, TBT 5–17 ms (review PR-19c); LCP 1.82–1.94 s under `act`, under "good" since TD-52; a chosen zone since TD-53 (2026-10-24, CLS 0.000, LCP 1.85 s on a Mac), the home and «Cosa si può fare qui» in English since review PR-19a, and an empty zone since TD-54 (2026-10-25, CLS 0.000, LCP 1.85 s on a Mac) |

Every row above was run again on 2026-10-15, after `seed_drafts` (18 tests),
the OpenStreetMap credit (#106, 3), drafts on the map (map.md M5, 5 + 3), the
tile host (2) and TD-52's map loading (6) joined the 2026-10-13 count of 547 / 268
— except E2E, which needs a seeded API
on `:8000` and a production build; it is counted from the specs and taken from
CI. The performance row was run in a Linux container under `act`, since
GitHub Actions was refusing every job that day. The 2026-08-19 baseline — 142 backend tests, 43 frontend, 4 e2e — is in the
archive, for the scale of the difference rather than for nostalgia.

**2026-10-22:** `seed_drafts` and its 18 tests were removed with the
public-source drafts (content.md's seeding section), so the backend count is
558 — re-run that day, ruff clean too. Nothing else changed.

**2026-10-26:** every row re-run for release 2.0.0 — the review of 2026-10-22
(#116–#151) took the suites from 558 / 282 / 49 to 727 / 843 / 122. The
counts above are that day's, on `main` at 553a6c8, which is the tag
`v2.0.0`. Later the same day `scripts/carica-schede` (content.md's seeding
section) added 30 backend tests — 757, ruff clean — and one assertion to an
existing frontend test.

**Green gates are not covered behaviour.** That sentence opened this register on
day one, and TD-47 — a whole status nothing exercised under a green suite,
paid 2026-10-12 — is why it is still here.

---

## TD-08 · `IssueReport.status` has no index — open, deliberately

`IssueReport.status` has no index. The list endpoint filters on it, and that is
irrelevant with zero rows. **Revisit when there is real data, not before.**

Unchanged since 2026-08-19, and the wait is not neglect: it is waiting on the
same thing the whole product is waiting on (roadmap item 4, the content).

## TD-37 · The e2e job spends eight of its nine minutes on setup — open, deliberately

Observed 2026-09-04, not measured further. The Cypress run itself takes ~40
seconds; the job takes **9m21s**, against 1m10s for the frontend job and 26s for
the backend. The difference is setup — Python, backend dependencies, Node, the
Cypress binary, and a production build — not the specs, so **adding specs is
close to free** and speeding the job up means caching or reordering that setup.

**Re-measured 2026-10-13, and the premise did not hold.** The last twelve runs
on `main` (2026-10-12/13) took **92 to 202 seconds** for the whole e2e job, the
Cypress run 1m18s of it in the latest. `.github/workflows/ci.yml` has changed
only in comments since 2026-09-11, and pip, npm and the Cypress binary were
cached before the 9m21s was observed — so whatever made that run slow,
probably a cold cache, it was not the job's shape. What is left is a job of
about three minutes, under a minute longer than the frontend's. Kept open only
until the author decides whether to withdraw it; it is not a candidate for
work.

Left alone deliberately: nothing waits on it, and a CI change made for tidiness
is a change to the one thing that guards every other change. Worth doing if it
ever becomes the reason somebody skips running the suite.

## TD-55 · What was hidden or taken out before 2.0.0 — remove for good, or bring back reworked — open, the author's decision

On 2026-10-26, dictating the last fine-tunings before release 2.0.0 (#151,
the review's «Decisioni del 26 ottobre 2026»), the author hid one feature and
took out two answers of the wizard «for now». Release first, decide later:
none of them is a defect, but each leaves something in the repository that
either earns its place again or goes. **The decision is the author's**, one
per item; the work after it is small either way.

- **«Dove sei?» — hidden, its code kept and still running.** Neither
  `/cosa-fare` nor the wizard's «Dove?» renders the field, and nothing asks
  for the names. What remains, tested and maintained for no page:
  `components/forms/WhereAreYouField.vue` and its spec; `lib/placeNames.ts`
  and its spec; the field's words, `cosaFare().where`, which sit in the first
  paint's dictionary (`cosaFare` is an entry area) and so cost every reader a
  few hundred bytes of Italian before compression, and a reader in English
  the same again in the English chunk; `maps.ZonaAlias` with its admin, its public endpoint
  `GET /api/map/zone/alias/`, migrations 0007–0009 (27 names, each placed
  against a zone) and `maps/test_zone_aliases.py`; the `ZoneAlias` interface.
  - *Remove for good:* one PR that deletes the field, `placeNames.ts`, the
    words and the interface, and a migration that drops the table and the
    endpoint — the 27 names stay in git history, in migrations 0008/0009.
  - *Bring it back reworked:* the obvious place is roadmap item 5,
    geolocation — «Dove sei?» as what a guest types when the browser's
    position is refused or 50 m wrong in the old town — or back on
    `/cosa-fare` above the chips, as review PR-20 built it. Then the field
    goes back on the page and the rest is already there.
- **«Camminare» — taken out**, folded into «Scoprire la città»
  (`itinerari/migrations/0013`). Nothing of it is left in the code: bringing
  it back is that migration's reverse (`unfold`, which restores the intent as
  seeded but cannot know which tours wore it), the three genres back in
  `lib/intents.ts::GENRE_INTENT`, its colour token and its icon.
- **«Oppure guarda cosa c'è in una zona» — taken out** of the wizard's first
  step, and `lib/doors.ts::zonesWithPlaces` with it. Bringing it back is a
  revert of that part of #151; the menu's «Cosa fare» is the zones' door
  meanwhile.

**Kept by decision, not debt:** the «Luoghi sulla mappa» list on `/mappa` and
in the phone's sheet, which the author asked to remove the same day and then
kept — it is ADR-0005's keyboard path to the map's places.

## TD-06 (residual) · Two upgrades held back on purpose

The dependency sweep itself is closed (2026-09-05, in the archive). Two majors
were **not** taken, each for a reason that was established by trying rather than
assumed, and both are conditions rather than work — recorded here so nobody
rediscovers them by running `npm outdated` and "fixes" them:

- **cypress 15 → 16.** `cypress-axe@1.7.0` peers only up to 15, so the a11y
  gate's plugin goes to an invalid peer state. And 16 counts a visually-hidden
  element as visible, which `login.cy.ts` asserts against. That spec is arguably
  the one in the wrong — it is testing "not perceivable", not "not in the
  layout" — so this unblocks with a test-semantics decision plus a
  `cypress-axe` release, not with a bump.
- **typescript 6 → 7.** `vue-tsc` cannot load it
  (`ERR_PACKAGE_PATH_NOT_EXPORTED`). `npm run build` is the type-check gate, so
  this waits on vue-tsc.

**Two `npm audit` findings with no compatible fix** (2026-10-12, after the
patch sweep took the count from 10 — one critical, `shell-quote` — to these).
Both are build- and lint-time code fed this repo's own files, so neither is
reachable from a reader's browser or from the API; recorded so nobody runs
`npm audit fix --force`, which "fixes" both by **downgrading** a direct
dependency across a breaking change:

- **`braces`, every version** (high, stack exhaustion on a crafted glob),
  through `fast-glob` in `@vue/eslint-config-typescript`. No fixed release
  exists; it goes when the lint config drops it.
- **`postcss-selector-parser` 6.0.10** (moderate, quadratic parsing), through
  `@tailwindcss/typography` 0.5.x, which pins the 6.x line. Goes with a
  typography release on 7.x.

---

## Not debt, recorded so it is not re-audited

- **TD-09 — the `SiteTitle.vue` purple gradient.** Reduced to a product
  decision, and the design pass then retired the purple. The `PollCard.vue`
  half was a detector false positive: it combined classes across a ternary.
  Both are written up in the archive's "Corrections".
- **`MEDIA_URL = 'media/'`** without a leading slash looks broken and is not —
  Django's `LazySettings` adds the script prefix. One audit agent reported it as
  a live bug; it is not.
