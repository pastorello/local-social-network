# Technical debt register

> **What is open, and nothing else.** Fifty items have been recorded
> since the first audit on 2026-08-19; forty-four are paid and live, with their
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
| Backend tests | `python -m pytest` | **480 passed** in 8.6s |
| Backend lint | `python -m ruff check .` | clean |
| Frontend tests | `npm run test:unit -- run` | **227 passed**, 47 files, ~10s |
| Frontend lint | `npx oxlint` · `npx eslint .` | clean |
| Format | `npx prettier --check .` | clean |
| Build | `npm run build` | green, ~0.9s |
| E2E | `npm run test:e2e` | **8 spec files, 47 tests** — green in CI |

Every row above was run again on 2026-10-12 (no code had landed since
2026-09-22, and every count matched) except the last, which needs a seeded API
on `:8000` and a production build; it is counted from the specs and taken from
CI. The 2026-08-19 baseline — 142 backend tests, 43 frontend, 4 e2e — is in the
archive, for the scale of the difference rather than for nostalgia.

**Green gates are not covered behaviour.** That sentence opened this register on
day one and TD-47 below is why it is still here.

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

## TD-31 (residual) · Three frontend paper cuts, never closed

Nine of TD-31's findings were fixed on 2026-08-20; these three were named as
left open in the same entry and then nobody came back. All three are small, and
the honest reason to do them is the file you are already in, not a session of
their own:

- **`PanelBox.vue` builds `classObject` as a plain non-reactive object** from a
  destructured prop. Harmless today — no caller passes `size` — and that is
  exactly the trap: `ActionButton.vue` does the same thing correctly with
  `computed`, so the inconsistency reads as intentional.
- **`UsersView.vue` re-implements `SearchBar.vue` verbatim.**
- **`EditProfileView.vue` hand-rolls file handling** instead of
  `useFileUpload.ts`, and therefore has no preview.

## TD-47 · The `rejected` report status has no test at all

Carried from the 2026-08-19 "coverage gaps" list and **verified still true on
2026-09-22**: the word appears in the whole backend suite exactly once, in a
`maps` docstring about uploads. It never appears as the source or the target of
a status transition.

`rejected` is the moderation lever — spam, duplicates — and it is the one branch
of `ALLOWED_TRANSITIONS` nothing exercises. The 480-test suite is green and says
nothing about it.

**The fix the original finding proposed still stands**, and is cheap: one
`@pytest.mark.parametrize` over `ALLOWED_TRANSITIONS` asserting every legal edge
200s and every illegal one 400s. It closes this permanently and replaces four
hand-written tests, so the diff is close to neutral.

## TD-48 · The two oldest forms are the two unverified ones

`ReportForm` and `PollForm` still have **no success-path test**. Both specs mock
`axios` and assert only `expect(axios.post).not.toHaveBeenCalled()` — the
failure path. So `ReportForm`'s FormData assembly (field names, `lat`/`lng`
stringification, the conditional photo append, the multipart header) is
unverified at every level, and it is the form a reader uses.

What makes this worth a number rather than a shrug: **every form written since
does assert what it sends** — `TypeForm` and `ItineraryForm` both read the
`FormData` back out of the mock. These two were simply never retrofitted, which
is how the oldest code ends up the least covered.

Three smaller things ride along, same family, same session:

- **Nothing asserts that voting in poll A leaves poll B's counts `null`.** F3.3
  is per-poll; the tests are per-poll too, so the isolation is assumed.
- **`?redirect`'s return leg is untested.** The bounce *to* login is covered
  (`login.cy.ts`); landing back on the page you asked for after signing in is
  not.
- **Test-quality defects, all three still standing:** `PollForm.spec.ts` selects
  on Tailwind classes (`.underline`, `.bg-gray-200`) where `:36` in the same
  file shows the right `aria-label` pattern; `StatusBadge.spec.ts` hard-codes
  `rgb(…)` instead of importing `STATUS_META` — and that one has already cost
  something, since the literals had to be rewritten by hand when ADR-0005's
  contrast pass changed the shades, which is precisely the maintenance the
  import was meant to avoid.

---

## TD-49 · The admin's tour-stop inline bypasses every stop rule

Found 2026-10-12 re-walking the archive for open residuals: **TD-45's fix
recorded this as "not covered" and the 2026-09-22 split then archived it with
the paid item**, so the open register never listed it. Verified by reading,
not by running.

`itinerari/admin.py::StopInline` is a bare `TabularInline` with an
autocomplete on `card`. Everything `itinerari/api.py::_parse_stops` and I4
enforce — a stop is a card with a place (`maps.CARD_TYPES`), never a
translation, never a tour, a draft only for its author or an admin, a
`point_index` inside the card's pins, and no publishing while a stop is a
draft — is skipped on this path. Admins only, so the exposure is the author's
own mistakes, not a stranger's: a dialetto word as a stop renders with no
place and a broken *Leggi la scheda* link, exactly the symptom TD-45 fixed on
the API.

**Fix:** move the per-stop rules into `Stop.clean()` (or a formset `clean()`
for the cross-stop ones) so the admin and the API share them, or make the
inline read-only and leave authoring to the SPA. Either is small; the first
keeps the admin useful for repairs.

## TD-50 · A tour stop's chosen pin is positional, so it moves when the card's pins change

Found 2026-10-12 (first noticed in passing in a 2026-09-22 design draft);
**confirmed by running** a throwaway test against the API: a tour stop on the Tiella's *Forno B*
(`point_index: 1`), then the recipe's author removes *Forno A* — the stop now
reads *Forno C*, with no error and nothing flagged to the tour's author.

`Stop.point_index` is an index into the card's point pins, and
`content/api_helpers.py::replace_points` deletes and recreates every pin on
every save. Pins are an unordered bag (`MapPointsField`, `kind="pins"`), so any
removal before the chosen pin shifts it onto a neighbour; an index past the
end falls back to the first pin (TD-46's fix, which stopped the 400 but not
the drift). Today it touches only ricette and personaggi — a church and a
luogo have one pin — and no published tour exists, which is why it is cheap
now and will not be later.

**Fix, smallest first:** keep `replace_points` but give it a stable identity
to diff on (the pin's id sent back by the form, or a `key`), updating rows in
place instead of delete-and-recreate, and point `Stop` at the `MapFeature` by
FK with `on_delete=SET_NULL` — so a removed pin reads as "no pin chosen" and
the author can be told. Eight `replace_points` call sites across four apps
plus the pins editor's wire format; budget half a day to a day, with the
probe above as the first failing test.

---

## Not debt, recorded so it is not re-audited

- **TD-09 — the `SiteTitle.vue` purple gradient.** Reduced to a product
  decision, and the design pass then retired the purple. The `PollCard.vue`
  half was a detector false positive: it combined classes across a ternary.
  Both are written up in the archive's "Corrections".
- **`MEDIA_URL = 'media/'`** without a leading slash looks broken and is not —
  Django's `LazySettings` adds the script prefix. One audit agent reported it as
  a live bug; it is not.
