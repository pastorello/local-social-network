# Technical debt register

> **What is open, and nothing else.** Fifty-two items have been recorded
> since the first audit on 2026-08-19; forty-nine are paid and live, with their
> evidence, in [tech-debt-archive.md](./tech-debt-archive.md). Read that file
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
> **Adding an item:** next number is **TD-53**, continuous across both files.
> It goes here; it moves to the archive when it is paid, with what proved it.

## The gates — re-run 2026-10-15

| Gate | Command | Result |
|---|---|---|
| Backend tests | `python -m pytest` | **576 passed** in ~12s |
| Backend lint | `python -m ruff check .` | clean |
| Frontend tests | `npm run test:unit -- run` | **276 passed**, 57 files |
| Frontend lint | `npx oxlint` · `npx eslint .` | clean |
| Format | `npx prettier --check .` | clean |
| Build | `npm run build` | green, ~2s |
| E2E | `npm run test:e2e` | **8 spec files, 49 tests** — green in CI |
| Performance | `npx @lhci/cli@0.15.1 autorun` | 3 pages × 3 runs, every budget met — LCP is under budget but not under "good" (TD-52) |

Every row above was run again on 2026-10-15, after `seed_drafts` (18 tests),
the OpenStreetMap credit (#106, 3), drafts on the map (map.md M5, 5 + 3) and
the tile host (2) joined the 2026-10-13 count of 547 / 268
— except E2E, which needs a seeded API
on `:8000` and a production build; it is counted from the specs and taken from
CI. The performance row was run in a Linux container under `act`, since
GitHub Actions was refusing every job that day. The 2026-08-19 baseline — 142 backend tests, 43 frontend, 4 e2e — is in the
archive, for the scale of the difference rather than for nostalgia.

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

## TD-52 · Mobile LCP is over the 2.5 s "good" threshold — open

Measured 2026-10-15, when the Lighthouse gate was added (`frontend/lighthouserc.yml`):
Lighthouse 12.6 on its default simulated phone (mid-range device, slow 4G),
three runs on each page, against `seed_e2e`'s data. **Lab numbers, not field
data** — nobody has loaded this app from Gaeta yet, because it is not deployed.

| Page | LCP, a/b/c tile hosts | one tile host + preconnect | the app's own (tiles blocked) |
|---|---|---|---|
| `/benvenuto` | 3.91–4.02 s | 2.64–3.29 s | 2.62–2.84 s |
| `/` | 3.57–3.61 s | 2.77–3.37 s | 2.62–2.63 s |
| `/cosa-fare` | 3.58–4.20 s | 2.79–3.00 s | 2.70–2.85 s |

**The first column is paid, in the same PR.** On every page the LCP element
was a map tile, fetched from three hosts (`{s}.tile.openstreetmap.org`), each
a new connection on a slow network: 1.1 s of load delay and up to 1.9 s of
render delay. `lib/osm.ts` now uses the one host the tile policy names (which
the policy requires anyway) and `index.html` preconnects to it.

**What is left is the app's own first paint.** It is an SPA with no
server-rendered HTML, so nothing paints until the entry chunk has run: FCP is
2.2 s on all three pages, and LCP — a paragraph of text once the tiles are
blocked — follows ~0.4 s later. Lighthouse's own leads, not yet tried: the
render-blocking stylesheet (~450 ms estimated) and 53 KiB of unused JS in the
107 KiB entry chunk. CLS (≤ 0.072) and TBT (≤ 51 ms) already clear "good".

The table was measured on an M-series Mac (Lighthouse's `benchmarkIndex`
~3,000). The same gate run in a Linux container under `act` (`benchmarkIndex`
1,090–2,314, closer to a CI runner) measured median LCP 2.76–2.95 s and median
TBT 75–192 ms: the slower the CPU, the further from "good". That is why the
gate's budgets are 3.5 s and 300 ms rather than web.dev's thresholds. **Paid
when the tiles-blocked median is under 2.5 s in CI; then lower the LCP budget
to 2.5 s and re-measure TBT's.**

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
