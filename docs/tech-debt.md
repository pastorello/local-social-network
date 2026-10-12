# Technical debt register

> **What is open, and nothing else.** Fifty items have been recorded
> since the first audit on 2026-08-19; forty-eight are paid and live, with their
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
> **Adding an item:** next number is **TD-51**, continuous across both files.
> It goes here; it moves to the archive when it is paid, with what proved it.

## The gates — re-run 2026-10-12

| Gate | Command | Result |
|---|---|---|
| Backend tests | `python -m pytest` | **516 passed** in 9.1s |
| Backend lint | `python -m ruff check .` | clean |
| Frontend tests | `npm run test:unit -- run` | **247 passed**, 51 files, ~10s |
| Frontend lint | `npx oxlint` · `npx eslint .` | clean |
| Format | `npx prettier --check .` | clean |
| Build | `npm run build` | green, ~0.9s |
| E2E | `npm run test:e2e` | **8 spec files, 47 tests** — green in CI |

Every row above was run again on 2026-10-12 — first with no code landed since
2026-09-22 and every count matching, then after the fixes for TD-50, TD-49,
TD-47, TD-48 and TD-31's residual, whose tests are the difference — except
the last, which needs a seeded API
on `:8000` and a production build; it is counted from the specs and taken from
CI. The 2026-08-19 baseline — 142 backend tests, 43 frontend, 4 e2e — is in the
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

Left alone deliberately: nothing waits on it, and a CI change made for tidiness
is a change to the one thing that guards every other change. Worth doing if it
ever becomes the reason somebody skips running the suite.

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
