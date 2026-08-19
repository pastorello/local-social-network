# 2026-08-19 — TD-11: fail-closed SECRET_KEY and a fail-safe DEBUG

|                   |                                                  |
| ----------------- | ------------------------------------------------ |
| **Milestone**     | Post-MVP (tech debt, TD-11 + DOC-03)             |
| **Spec sections** | §6 (deploy), §9 (quality plan)                   |
| **Model / tool**  | Claude Code — Opus 5                             |
| **Duration**      | ~40m                                             |
| **Commits**       | (this session)                                   |

## 1. Goal

Close TD-11, the only Critical in the register: `settings.py` fell back to a
committed `django-insecure-…` key, which SimpleJWT also uses as its signing key.
Anyone who could read the repository could mint a valid **admin** token against
a deployment that forgot the environment variable — and nothing warned, because
the app booted and looked healthy.

## 2. Plan prompt

> ok, ho mergiato l'ultima PR, allineati e poi vai con TD-11

**Plan amended in flight, twice, both times by measurement rather than opinion:**

1. The register prescribed flipping `DJANGO_DEBUG` to default `false`. Running
   the suite that way first showed why that is not a one-line change: with
   `DEBUG` false the M4 hardening block activates `SECURE_SSL_REDIRECT`, and the
   pytest client gets a **301 on every request** — `polls/tests.py` fails on the
   first assertion. The block therefore had to learn about `TESTING`, which in
   turn meant computing `TESTING` before `DEBUG` instead of 190 lines later.
2. Flipping the default also breaks the *documented* bare-metal workflow:
   `python manage.py check` with no environment now exits with
   `ImproperlyConfigured`. That is the correct behaviour, but it is a real cost
   to the secondary dev path and it is paid explicitly, not silently — see §4.

## 3. What the AI produced

**Test first.** `backend/backend/tests.py` (new, 9 tests) imports the settings
module in a **subprocess** — the thing under test happens at import time, which
has already happened by the time a normal test runs. Each case scrubs
`PYTEST_VERSION` from the child environment, since that is exactly the flag that
exempts the suite from the guards. Red phase: 3 failed, 6 passed — precisely the
three behaviours TD-11 changes.

One of the nine tests deliberately asserts on the *shape* of the fix rather than
its behaviour: it greps `settings.py` for the original committed key and fails if
it ever comes back. TD-17 taught that lesson — an invariant nothing pins is one
token away from regressing.

**The change** (`backend/backend/settings.py`):

- `TESTING` moved to the top, above both guards.
- `DEBUG` defaults to `false`. Forgetting the variable now fails safe.
- `SECRET_KEY` has **no committed fallback**. Missing and not `DEBUG or TESTING`
  → `ImproperlyConfigured` at import, with the key-generation command in the
  message. Under debug/test it uses a literal that says what it is:
  `django-insecure-local-development-only-not-for-any-deployment`.
- The hardening block became `if not DEBUG and not TESTING:` — the 301 fix.

**Development opts in, in the three places it runs:** `docker compose` already
passed `DJANGO_DEBUG=true`; bare-metal shells now `export DJANGO_DEBUG=true`
(documented in `CLAUDE.md` and `backend/README.md`); pytest is exempt via
`TESTING`, so CI needed no change and stayed green.

**DOC-03 closed in passing.** `docker-compose.yml` carried a comment telling you
to set `DJANGO_SECRET_KEY` in `.env` — while the `backend` service never
forwarded it. Now it forwards `DJANGO_SECRET_KEY` and `DJANGO_SSL_REDIRECT`, so
the instruction is true. `.env.example` ships an **empty** secret with the
generation command, instead of the publicly-known `change-me-in-production`.

**Files:** `backend/backend/settings.py`, `backend/backend/tests.py` (new),
`.env.example`, `docker-compose.yml`, `CLAUDE.md`, `backend/README.md`,
`docs/deploy.md`, `docs/tech-debt.md`, `docs/roadmap.md`, this log + index row.

## 4. Author review

The section that matters. Written by hand, after reading the diff.

**Verified**
- …

**Wrong or overstated by the AI**
- …

**Changed by hand**
- …

**Decisions taken (and why)**
- **The DX cost is real and is yours to accept or reject.** Bare-metal
  `manage.py` commands now need `DJANGO_DEBUG=true` in the shell. The
  alternative — keeping `DEBUG` defaulted to `true` — leaves the exact hole the
  audit described: a host that never sets `DJANGO_DEBUG` gets debug on *and* the
  shared key, because the secret guard only fires when debug is off. The two
  defaults are coupled; hardening one without the other is theatre. Reject this
  and TD-11 is only half closed.
- …

**Rejected suggestions**
- …

## 5. Outcome

- [x] pytest **85 passed** (76 + 9 new), ruff clean
- [x] Vitest 32 passed, oxlint + eslint clean, `npm run build` green
- [x] Red-then-green followed: 3 failing tests before the change, 0 after
- [x] Verified by hand that the guard fires: `manage.py check` with no
      environment exits with the `ImproperlyConfigured` message, and the same
      command with `DJANGO_DEBUG=true` reports no issues
- [x] `docker-compose.yml` re-parsed; the `backend` service now carries 12 env
      keys including the two that were only a comment before

**Follow-ups / debt introduced:** none introduced. Next in the register are the
three upload items — **TD-12** (avatars bypass every image control, publishing
EXIF GPS), **TD-13** (uploaded filename extension → Content-Type) and **TD-26**
(decompression bomb) — which the register says to land as **one** change, since
half-fixing them is worse than leaving them.
