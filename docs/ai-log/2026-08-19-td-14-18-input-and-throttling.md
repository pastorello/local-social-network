# 2026-08-19 — TD-14 / TD-18: input validation and rate limiting

|                   |                                                    |
| ----------------- | -------------------------------------------------- |
| **Milestone**     | Post-MVP (tech debt: TD-14, TD-18)                 |
| **Spec sections** | §8 (API + error convention), §9, N4 (Italian copy) |
| **Model / tool**  | Claude Code — Opus 5                                |
| **Duration**      | ~45m                                                |
| **Commits**       | (this session)                                      |

## 1. Goal

Close the last two P0/P1 security items that do not need a deployment to matter:
an anonymous 500 on a public endpoint, and three unthrottled credential
endpoints.

## 2. Plan prompt

> ok ho mergiato, vai con TD-14 e TD-18

## 3. What the AI produced

**TD-14 — fixed at two levels, deliberately.**

`_uuid_param` in `reports/api.py` parses `category` and `author` before they
reach the ORM and raises a DRF `ValidationError`, so the caller gets the
project's `{detail, fields}` 400. Behind it, `backend/exceptions.py` now
translates Django's own `ValidationError` into the same 400 — DRF's handler
knows only `APIException`, `Http404` and `PermissionDenied`, which is precisely
why this escaped as a 500 in the first place. The explicit guard is the fix; the
handler is so that the *next* occurrence of this pattern degrades to a
bad-request instead of a traceback.

One test pins the boundary in the other direction: a **well-formed but unknown**
UUID still returns an empty `200`. A guard that rejects valid lookups would be a
worse bug than the one it replaced.

**TD-18 — rate limiting on the three credential endpoints.**

Login **10/min** and signup **10/hour** per IP, password change **5/hour** per
user. Explicit throttle classes in `account/throttling.py` rather than
`ScopedRateThrottle`, because `@api_view` function views have no class attribute
for the scope to read — the boring option that actually works. Login needed a
three-line `TokenObtainPairView` subclass.

429 bodies are Italian, via the exception handler. DRF's default message is
English, and the SPA surfaces `detail` straight to the user (N4).

**Deviation from the register, on purpose:** it sketched signup at 5/hour. This
is a civic app for a small city, where shared NAT is normal — a family or a
school class signing up together must not lock each other out. 10/hour is still
decisive against enumeration at scale.

**`backend/conftest.py`** now exists, holding one autouse fixture that clears the
cache around every test. DRF counts throttled requests in the Django cache, which
is process-wide, so without it the rate-limit tests would poison every later test
and *test ordering* would decide which ones failed. One test exists purely to
guard that fixture.

**Files:** `reports/api.py`, `backend/exceptions.py`, `backend/settings.py`,
`account/throttling.py` (new), `account/urls.py`, `account/api.py`,
`conftest.py` (new), tests in `reports/`, `account/`, `backend/`, plus
`CLAUDE.md`, `docs/deploy.md`, `docs/tech-debt.md`, this log + index row.

## 4. Author review

The section that matters. Written by hand, after reading the diff.

**Verified**
- …

**Wrong or overstated by the AI**
- …

**Changed by hand**
- …

**Decisions taken (and why)**
- **I made the test suite slower and did not hide it.** The throttle tests cost
  **~12s** — 3.6s, 3.5s, 3.1s and 1.6s, all of it real PBKDF2 hashing, since
  tripping a 10/min login limit means eleven genuine authentication attempts.
  The suite went from ~37s to ~60s. That is the price of testing the limits
  rather than trusting them, and it makes **TD-05** (the fast test hasher)
  materially more valuable than when it was written. I did **not** fix TD-05
  here: it was not in scope, and the register pairs it with TD-23.
- Two levels for TD-14 rather than one: the handler alone would have been
  cheaper, but it turns a class of programming errors into 400s silently. The
  explicit guard is what documents the contract.
- **Not done:** throttling the remaining write endpoints (report creation,
  upvote, vote). They are authenticated and unique-constrained, so the abuse
  case is weaker; worth revisiting only with real usage data.

**Rejected suggestions**
- …

## 5. Outcome

- [x] pytest **123 passed** (110 + 13), ruff clean
- [x] Vitest 32 passed, oxlint + eslint clean, `npm run build` green
- [x] Red-then-green: 10 failing tests before the change, 0 after
- [x] Recorded in `docs/deploy.md` that `LocMemCache` is per-process, so the
      configured limits multiply by the gunicorn worker count until a shared
      cache exists

**Follow-ups / debt introduced:** ~12s of suite runtime, addressed by TD-05.
Recommended next: **TD-05 + TD-23** together — `conftest.py` now exists, so the
hasher override has a home and the six duplicated fixtures can move in one edit.
Then the three small tests that close TD-16, TD-17 and TD-22, after which
Cypress can join CI.
