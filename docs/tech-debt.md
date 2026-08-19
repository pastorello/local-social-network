# Technical debt register

> **First pass** audited 2026-08-19 against `main` @ `44ebc7d` — measurement-based
> (quality gates, `npm audit`, `npm outdated`, `pip list --outdated`, a real
> build). Items TD-01…TD-10.
>
> **Second pass** audited 2026-08-19 against `tech-debt-audit` @ `158b638` —
> code-reading, by four parallel specialist agents (code review, security, test
> quality, documentation consistency). Items TD-11…TD-32 and DOC-01…DOC-10, plus
> corrections to the first pass. Every finding below carrying a ✔ was
> independently re-verified by running the code, not taken from an agent report.
>
> Scope note: shipping a public demo was **parked** on 2026-08-19 (no domain, no
> Python host, no public database — author decision). This register replaces it
> as the active workstream; see [roadmap.md](./roadmap.md).

## Baseline — the gates all pass

| Gate | Command | Result |
|---|---|---|
| Backend tests | `python -m pytest` | **76 passed** in 54.4s (34.1s on a second machine) |
| Backend lint | `python -m ruff check .` | clean |
| Frontend tests | `npm run test:unit` | **32 passed** (10 files) in 4.2s |
| Frontend lint | `npm run lint` | clean (61 files, 116 rules) |
| Build | `npm run build` | green, 469ms |

Green gates are not the same as covered behaviour — see TD-16 and TD-17, both of
which are silent regressions that the five gates above cannot see.

Also verified clean, so nobody re-audits them: no N+1 in the reports API
(`select_related('category', 'author')` on list, detail and both admin paths),
backend requirements pinned to exact versions, `.venv` correctly self-ignored
(Python writes `.venv/.gitignore` with `*`).

---

## Corrections to the first pass

**TD-05 is confirmed and now measured, not inferred.** ✔ The cost is 100% in
fixture `setup`, not in `call`: the 20 slowest entries are 19 setups. A single
PBKDF2 hash measures **0.296s**; at 44 user creations that is ≈13s, **~38%** of
the runtime. The insertion point already exists — `backend/backend/settings.py:227`
defines `TESTING` and `:229` opens an `if not TESTING:` block, so the MD5-hasher
override is a three-line addition to a file that already branches on test mode.
Do it together with TD-23 (`conftest.py`), which is where the 44 creations come
from.

**TD-09 is half wrong — the `PollCard.vue` entry is a false positive.** ✔
[`PollCard.vue:91`](../frontend/src/components/polls/PollCard.vue) is a ternary:
the pairs that actually render are `bg-gray-200 text-gray-600` and
`bg-green-100 text-green-700`. The combination the detector reported —
`text-gray-600` on `bg-green-100` — occurs in neither branch; impeccable
combined classes across the `?:`. There is nothing to fix. The `SiteTitle.vue`
purple gradient **is** real, and remains a product decision rather than a defect.
`CLAUDE.md` repeats the false positive and must be corrected with it (DOC-02).

**TD-10 is worse than written.** ✔ It is not only that `pip` fails — the command
documented in `CLAUDE.md` and `backend/README.md`,
`source .venv/bin/activate && python -m pytest`, **does not run at all**
(`command not found: python`). Only `.venv/bin/python -m pytest` works. Anyone
following the docs to run the backend suite is blocked at the first step.

**"Nothing junk tracked in git" was a point-in-time truth.** It held only because
no `.env` existed yet. See TD-15.

**Recorded as *not* a defect, so it is not re-audited:** `MEDIA_URL = 'media/'`
(no leading slash, `settings.py:200`) looks broken and is not. ✔ Django's
`LazySettings` runs `_add_script_prefix` on `MEDIA_URL`/`STATIC_URL`, so it
resolves to `/media/` and `IssueReport.get_photo_url` produces a correct absolute
URL (`http://127.0.0.1:8000/media/report_photos/x.jpg`, verified by evaluating it).
One agent reported this as a live bug; it is not.

---

## First pass — TD-01…TD-06

Carried forward verbatim from the 2026-08-19 measurement pass, with the second
pass's corrections marked inline. (These were briefly dropped when this file was
restructured; restored the same day.)

### TD-01 · No CI: five green gates that nobody runs automatically — **FIXED 2026-08-19** ✔

> Closed: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs two jobs on
> every push to `main` and every pull request — backend (ruff, then pytest on
> Python 3.14, SQLite fallback) and frontend (oxlint, eslint, vitest, build on
> Node 22). The linters run **check-only**: `npm run lint` applies `--fix`, which
> in CI would let a run pass by rewriting files. Three omissions are documented in
> the workflow header — no deploy step, no Cypress job (TD-16 is red), no Postgres
> service. Node 22 matches `frontend/Dockerfile`; the register's original note said
> Node 24, which is the dev machine, not the shipped image.

**Evidence:** no `.github/` directory. The definition of done (spec §9) names
five commands; today they run only when a human remembers.

**Why it matters now:** the MVP is closed and the next phase is maintenance —
dependency bumps, refactors, and agent-written changes. That is exactly the work
where a regression slips in silently. It is also the cheapest insurance in this
register.

**Fix:** one GitHub Actions workflow, two jobs (backend: pytest + ruff on the
pinned Python; frontend: vitest + eslint + build on Node 24). Nothing else — no
deploy step, since there is nothing to deploy to.

### TD-02 · Leaflet is bundled twice (~86 kB gzip wasted)

**Evidence:** `npm run build` emits both

```
dist/assets/leaflet-src.esm-D3NCHgIn.js   148.53 kB │ gzip: 43.19 kB
dist/assets/leaflet-src-CERmynjB.js       148.79 kB │ gzip: 43.36 kB
```

**Cause:** `ReportsMap.vue` imports `leaflet` directly (default + named) because
`leaflet.markercluster` registers `markerClusterGroup` on the CJS/UMD runtime —
documented on purpose in CLAUDE.md — while `@vue-leaflet/vue-leaflet` resolves
Leaflet's ESM build. Vite therefore ships both copies of the same library.

**Fix:** a `resolve.alias` in `vite.config.ts` pointing every specifier at one
build, then **verify in the browser** that clustering still works — that is the
regression this codebase has already been bitten by, so the fix is not done
until a real map with clustered pins has been loaded.

**Risk:** medium. Do not land it on the strength of a green build alone.

### TD-03 · Build tooling sits in `dependencies`

**Evidence:** `@tailwindcss/vite` and `tailwindcss` are in `dependencies`, not
`devDependencies`. Consequence: `npm audit --omit=dev` reports **6
vulnerabilities (5 high)** — all in `vite` / `launch-editor`, pulled into the
production tree through `@tailwindcss/vite`.

**Read this correctly:** every one of those advisories is **dev-server surface**
(path traversal in the dev server, `server.fs.deny` bypasses, a Windows-only NTLM
disclosure). None of them touches the static bundle a visitor downloads. The
debt is the *mislabeling*, which makes a real audit unreadable — the day a
genuine runtime advisory lands, it will be buried in dev-server noise.

**Fix:** move both to `devDependencies`, then `npm audit fix` (patch-level vite).

### TD-04 · End-to-end coverage is one file

`frontend/cypress/e2e/` contains **only `login.cy.ts`**. The three flows that
*are* the product — filing a report on the map, upvoting, voting in a poll — have
unit tests but no end-to-end proof that the SPA and the API agree.

**Sharpened by the second pass — see TD-16:** that one file is also *red*, and has
been since M4. Fix TD-16 before adding specs, and before wiring Cypress into CI.

### TD-05 · The backend suite takes 54s for 76 tests

0.7s per test, and the suite creates users or passwords in 44 places
(`account/tests.py` alone: 32). No fast `PASSWORD_HASHERS` override is
configured, so every fixture pays for real PBKDF2 hashing. A test-only MD5
hasher is the standard Django fix and typically cuts this by an order of
magnitude. Confirm by measuring before and after — the estimate above is
inference from the hashing count, not a profile.

**Now measured — see Corrections above:** 0.296s per hash, ≈38% of the runtime,
and the `if not TESTING:` insertion point already exists. Do it with TD-23.

### TD-06 · Dependencies have drifted

Backend (pinned exactly, which is why this is safe to defer): Django
6.0.3 → 6.1, DRF 3.17.1 → 3.18.0, django-debug-toolbar 6.3 → 7.1.1,
gunicorn 26.0 → 26.1, pillow 12.2 → 12.3, PyJWT 2.12 → 2.13, ruff 0.15 → 0.16.

Frontend: axios 1.15 → 1.19, tailwind 4.2.2 → 4.3.3, eslint 10.1 → 10.8,
cypress 15.13 → 15.21. Majors deliberately left alone for now: **pinia 3 → 4**,
**typescript 6 → 7**, **oxlint 1.57 → 1.79** (22 minors behind, and it is the
first linter in the `npm run lint` chain).

Do this *after* TD-01 — dependency bumps are precisely what CI is for.

---

## P0 — security, and all four are cheap

### TD-11 · The committed `SECRET_KEY` fallback is the JWT signing key — **FIXED 2026-08-19** ✔

> Closed. `settings.py` now reads `DJANGO_SECRET_KEY` with **no committed
> fallback**: outside `DEBUG` and the test suite a missing key raises
> `ImproperlyConfigured` at import time, with the generation command in the
> message. `DJANGO_DEBUG` defaults to **false**, so forgetting it fails safe.
> Nine tests in `backend/backend/tests.py` pin both guards by importing settings
> in a subprocess, including one that fails if the original committed key ever
> reappears in the file. Two consequences handled: the HTTPS hardening block
> gained `and not TESTING` (with DEBUG now false by default,
> `SECURE_SSL_REDIRECT` answered the test client with a 301 and turned the whole
> suite red), and bare-metal development opts in with `export DJANGO_DEBUG=true`
> — `docker compose` already passed it. **DOC-03 closed with it**: compose now
> actually forwards `DJANGO_SECRET_KEY` and `DJANGO_SSL_REDIRECT` instead of
> merely commenting about them.

**Evidence:** `backend/backend/settings.py:28-31` falls back to a literal
`django-insecure-…` key that is in public git history. SimpleJWT's `SIGNING_KEY`
defaults to `settings.SECRET_KEY` and `SIMPLE_JWT` (`settings.py:56-61`) does not
override it.

**Why it matters:** anyone who can read this repo can mint a valid HS256 token
for any `user_id` — including `role: admin`, since the admin checks at
`reports/api.py:163` and `polls/api.py:67` trust `request.user`, which is
resolved from that token. Full platform compromise. The failure mode is
**silent**: nothing warns, nothing refuses to boot, the app looks healthy.
`.env.example:6` compounds it by shipping `change-me-in-production`, a value that
is also public and that Django accepts without complaint.

**Fix:** empty default; raise `ImproperlyConfigured` when `DEBUG` is false and no
key is set; keep a clearly-labelled local-development-only literal for `DEBUG`.
While there, flip `DJANGO_DEBUG` to default `false` (`settings.py:34`) and have
the dev paths opt in — `.env.example:7` currently ships `true` as the documented
starting point for a deployment.

**Deploy-time only** — but it must land *before* the demo conversation restarts,
not during it.

### TD-12 · Avatar uploads bypass every control the report-photo path enforces — **FIXED 2026-08-19** ✔

> Closed. `reports/images.py` moved to `common/images.py` (so `account` need not
> import from a sibling domain app) and both upload paths now call the same
> `validate_image`. `ProfileForm.clean_avatar` applies the byte cap, the format
> allowlist and the EXIF strip; it skips the work when the field arrives as the
> stored `FieldFile` rather than a new upload, so a profile save no longer
> re-encodes an unchanged avatar. Six end-to-end tests in `account/tests.py`
> pin it, including one that uploads a GPS-tagged image and asserts the stored
> file has no EXIF at all.

**Evidence:** `ProfileForm` (`backend/account/forms.py:19-22`) declares `avatar`
in `fields` and `editprofile` (`backend/account/api.py:80`) hands it
`request.FILES` directly. It gets Django's stock `ImageField` check and nothing
else — no 5 MB cap, no `{JPEG, PNG, WEBP}` allowlist, **no `strip_exif`** —
while `ReportWriteSerializer.validate_photo` (`reports/serializers.py:57-67`)
applies all three.

**Why it matters:** this is a privacy finding, not just an upload finding.
`UserSerializer.avatarURL` is nested into `ReportSerializer.author`
(`reports/serializers.py:16`) and `GET /api/reports/` is public
(`reports/api.py:71-72`). ✔ So an avatar is a **publicly downloadable file with
its original EXIF intact, including GPS**. In an app whose premise is "citizens
photograph problems near their home", a citizen who uploads a phone photo as
their avatar publishes their home coordinates to anonymous visitors. Spec N6
strips GPS from report photos; the avatar was simply missed.

Secondary: no size cap at all, and `DATA_UPLOAD_MAX_MEMORY_SIZE` does not cover
file uploads — any authenticated citizen can fill `MEDIA_ROOT`.

**Fix:** a `clean_avatar` on `ProfileForm` that runs the file through
`MAX_PHOTO_BYTES` + `strip_exif`. Tidier version: lift `reports/images.py` to a
shared module first, since `account → reports` is an awkward import direction.

### TD-13 · Uploaded filenames keep their extension — **FIXED 2026-08-19, and the original finding was overstated** ✔

> **Correction first.** The audit described this as stored XSS: upload
> `pwned.html`, get it served as `text/html`, run script on the API origin. That
> does not work. `django.forms.ImageField` carries
> `validate_image_file_extension` in `default_validators`, and it runs on **both**
> paths — via `ModelForm` for avatars and via DRF's `ImageField` for report
> photos. `.html` is rejected outright. Measured: the upload 400s.
>
> **What was actually exploitable.** That validator allows every extension
> Pillow knows — **70 of them** — and ~43 do not map to `image/*` once
> `mimetypes` sees them: `.pdf` → `application/pdf`, `.eps`/`.ps` →
> `application/postscript`, `.mpeg` → `video/mpeg`, and so on. A valid PNG named
> `payload.pdf` passed validation and was served as `application/pdf`. That is
> content-type confusion in a format browsers render inline with a scripting
> engine — real, but **Medium, not High**, and a different mechanism from the one
> written up.
>
> **Closed** by deriving the stored extension from the format Pillow actually
> decoded (`safe_filename`), which also flattens inner dots so
> `payload.html.png` cannot keep a second extension, and drops directory
> components. Verified by mutation: reverting to the client-supplied name fails
> four tests.

**Evidence:** `reports/images.py:36` returns
`ContentFile(buffer.getvalue(), name=uploaded_file.name)` — it re-encodes the
pixels but **preserves the client-supplied name**. `backend/backend/urls.py:11`
mounts `django.views.static.serve`, which derives Content-Type from
`mimetypes.guess_type(filename)` — from the extension, never from the bytes. The
avatar path (TD-12) does not even re-encode.

**Why it matters:** upload something Pillow accepts, named `pwned.html`. Django's
`get_valid_filename` strips path separators (traversal is genuinely blocked) but
keeps `.html`. `GET /media/avatars/pwned.html` then returns
`Content-Type: text/html`. `SECURE_CONTENT_TYPE_NOSNIFF` does not help — the
server is *declaring* HTML, not being sniffed into it. That is script execution
on the **API origin**, where the Django admin session cookie lives; `HTTPOnly`
stops the cookie being read but not a same-origin `fetch('/admin/…')` that
scrapes the CSRF token and adds a superuser.

**Honest exploitability:** delivery needs a moderator to open the URL, so this is
not a one-click takeover today. It is a clean one the moment media is served
deliberately in production (TD-14's neighbour, below).

**Fix:** normalize the stored name to the format actually detected
(`{stem}{'.jpg'|'.png'|'.webp'}`), apply it on both paths. For deployment: serve
media from a cookieless origin, or with `Content-Disposition: attachment`.

**Related, deploy-time:** `static()` is a documented no-op when `DEBUG=false`, so
in production every photo and avatar 404s today — while `docs/deploy.md:11,39-42`
tells the operator media is served and to attach a disk for it. Fix the extension
normalization **first**; the obvious fix for the 404 is what turns TD-13 into a
click-through path.

### TD-14 · Anonymous HTTP 500 from a malformed UUID query param — **FIXED 2026-08-19** ✔

> Closed twice over. `_uuid_param` in `reports/api.py` parses `category` and
> `author` before they reach the ORM and raises a DRF `ValidationError`, so the
> response is a `{detail, fields}` 400. Behind it, `backend/exceptions.py` now
> translates Django's own `ValidationError` — the one DRF's handler does not
> recognise — into the same 400, so the next place this pattern appears degrades
> to a bad-request instead of a traceback. Four endpoint tests plus two handler
> unit tests; one of them pins that a *well-formed* unknown UUID still returns an
> empty 200, so the guard rejects malformed input rather than valid lookups.

**Evidence:** `reports/api.py:31` and `:43` pass raw query strings into
`.filter(category_id=…)` / `.filter(author_id=…)` on `UUIDField` columns. Django
raises `django.core.exceptions.ValidationError` at query-evaluation time;
`backend/backend/exceptions.py:14` only handles DRF's `ValidationError`, so it
propagates. Measured:

```
GET /api/reports/?category=x       -> 500
GET /api/reports/?author=x         -> 500
GET /api/reports/map/?category=x   -> 500
GET /api/reports/?status=bogus     -> 200   (status is a CharField — fine)
```

Both endpoints are `@permission_classes([])`, so this is **anonymous**, and with
`DJANGO_DEBUG` defaulting to `true` the response body is Django's technical 500
page: full traceback, local variables, installed apps, middleware.

**Reachable from the SPA, not only by hand:** `router/index.ts:57` declares
`/profile/:id` with no UUID constraint, so `/profile/anything` makes
`ProfileView.vue:30` fire `GET /api/reports/?author=anything`.

**Fix:** validate both params through `serializers.UUIDField().run_validation()`
in `_filtered_reports` and re-raise as a DRF `ValidationError`. `polls/api.py:113-116`
already does exactly this for the option id — the reports app never got the same
treatment, so this is copy-paste drift that ran the wrong way. Worth also
catching Django's `ValidationError` in `backend/exceptions.py` as a net.

---

## P1 — worth a session each

### TD-15 · `.env` was not gitignored, and the README tells you to create it — **FIXED 2026-08-19** ✔

> Closed in the deep-audit session: `.gitignore` now carries `.env`, `.env.*`,
> `!.env.example` and `.claude/settings.local.json` (the latter also closes
> DOC-04). Verified with `git check-ignore`: `.env`, `.env.local`,
> `frontend/.env` ignored; both `.env.example` files and `.claude/launch.json`
> still tracked.

`.gitignore` had no `.env` entry (`git check-ignore -v .env` → not ignored), while
`README.md:42` instructs `cp .env.example .env` and `.env.example` carries
`DJANGO_SECRET_KEY` and `POSTGRES_PASSWORD`. Every other artifact — `backend/media`,
`db.sqlite3`, `frontend/dist`, `__pycache__` — is covered by a per-directory
ignore file. The demo-deploy session is precisely when someone fills in a real
key and a real password. **Fix:** `.env`, `.env.*`, `!.env.example`.

### TD-16 · The only e2e spec has been failing since M4 ✔

`frontend/cypress/e2e/login.cy.ts:17` and `:20` assert `'Log in'`;
`LoginView.vue:70` and `:103` render **"Accedi"**. The M4 Italian sweep updated
the first two assertions in that file (`:4`, `:5` are Italian) and missed the
other two. The unit test agrees with the app (`LoginView.spec.ts:26`); only
Cypress was left behind.

This **sharpens TD-04**: the problem is not only that e2e is one file, it is that
a third of that one file has been red for a month and nobody noticed — which is
the field evidence that TD-01 (CI) is correctly ranked first. **Fix:** two
strings. Do it *before* writing any new e2e, or the new specs inherit a suite
nobody trusts.

### TD-17 · Nothing stops `role` from becoming writable ✔

`ProfileForm.Meta.fields` (`account/forms.py:22`) and `SignupForm.Meta.fields`
(`:10`) both correctly omit `role`. **No test pins either one.** Adding `'role'`
to that tuple hands every citizen admin authority over report statuses and poll
creation — and all 76 tests stay green. One token of diff, zero signal.

`test_signup_creates_active_citizen` (`account/tests.py:52`) asserts
`role == CITIZEN` but never *posts* `role: 'admin'`, so it does not prove the
field is ignored. **Fix:** two tests, ~15 lines total — POST `role: 'admin'` to
signup and to `editprofile`, assert `role` is unchanged after `refresh_from_db()`.
This is the highest-severity single-token regression available in the codebase.

### TD-18 · No rate limiting anywhere — **FIXED 2026-08-19** ✔

> Closed for the three credential endpoints: login **10/min** and signup
> **10/hour** per IP, password change **5/hour** per user
> (`account/throttling.py`, rates in `REST_FRAMEWORK`). Explicit throttle
> classes rather than `ScopedRateThrottle`, because `@api_view` function views
> have no class attribute for the scope to read. 429 bodies are Italian (N4) via
> the exception handler; DRF's default message is English.
>
> **Signup is 10/hour, not the 5/hour sketched above, on purpose:** a small city
> means shared NAT, and a family or a classroom signing up together must not be
> locked out. It is still decisive against enumeration at scale.
>
> **Two things this leaves open.** (1) DRF counts through the Django cache, and
> the default `LocMemCache` is per-process — behind N gunicorn workers the
> effective limit is N× the configured one. A shared cache is a deployment
> prerequisite, now recorded in `docs/deploy.md`. (2) The tests cost **~12s** of
> real PBKDF2 hashing, which pushed the suite from 37s to ~60s — see TD-05, now
> materially more valuable than when it was written.

`REST_FRAMEWORK` (`settings.py:63-72`) declares no throttle classes or rates; a
repo-wide grep for `throttle|ratelimit` returns nothing. `TokenObtainPairView`
(`account/urls.py:9`) is a bare unthrottled credential endpoint and `signup`
(`account/api.py:33`) is unauthenticated. Second-order: every attempt runs a full
PBKDF2 hash, so an anonymous attacker gets a free CPU amplifier. This also
defuses the account-enumeration oracles at `account/api.py:46-47` and `:77-78`
(the signup form surfaces the unique-email error verbatim), which for a
small-city civic platform reveals who files complaints about the municipality.

**Fix:** `ScopedRateThrottle` + rates in settings, `throttle_scope` on login,
signup and `editpassword`. Smallest security-per-line ratio in this register.

### TD-19 · The upvote counter can drift, cannot be repaired, and has no invariant test

`reports/api.py:146-155` runs `get_or_create` → `delete()` → `F('upvotes_count') + delta`
as three statements with **no `transaction.atomic()`**, and infers `delta` from
`created` rather than from what the DELETE actually did. Two concurrent POSTs
from the same user on an already-upvoted report both read `created=False`, both
call `delete()` (the second affects 0 rows, silently), and both apply `-1`: one
row removed, **two** decrements.

Three findings converge here, which is why it is P1 despite being four lines:

- **Manipulable.** `upvotes_count` is what ranks citizen issues. Looping paired
  concurrent requests drives a rival report's count arbitrarily negative.
- **Unrecoverable.** Nothing reconciles the counter against `report.upvotes.count()`,
  and `reports/admin.py:18` marks it `readonly_fields`, so not even a human can
  correct it through the admin.
- **Untested.** No test asserts `report.upvotes_count == report.upvotes.count()`
  after a toggle sequence.

Note the asymmetry with the twin app: `polls` computes counts on the fly
(`Count('votes')`) and therefore cannot drift. Only `reports` denormalizes.

**Fix:** derive `delta` from the deleted row count, wrap in `transaction.atomic()`,
add the invariant assertion to the existing toggle tests, and add a management
command doing `update(upvotes_count=Count('upvotes'))` so drift is recoverable.
A threaded concurrency test is **not** worth writing.

### TD-20 · Logout leaves the token live, client-side and server-side

Three gaps that compound:

1. `removeToken()` (`stores/user.ts:69-86`) clears the store and `localStorage`
   but never touches `axios.defaults.headers.common['Authorization']`, set in
   three places (`LoginView.vue:40`, `stores/user.ts:120`, `App.vue:19`). After
   clicking "Esci", **every subsequent request in that tab still carries the
   logged-out user's Bearer token** until a page reload.
2. There is no logout endpoint — the refresh token is dropped client-side but
   never blacklisted, so it stays valid for its full 30 days. `token_blacklist`
   is already installed and used for rotation; the plumbing exists.
3. `editpassword` (`account/api.py:88-96`) calls `form.save()` and returns.
   Outstanding tokens survive a password change, so "change my password, I think
   I was compromised" does not evict the attacker for up to 30 days.

**Fix:** clear the axios default in `removeToken()`; add `POST /api/users/logout/`
that blacklists the presented refresh token; blacklist the user's
`OutstandingToken` rows after a successful password change.

---

## P2 — schedule, don't rush

### TD-21 · `extractApiErrors` is reimplemented four times, and the copies drop `detail`

`lib/apiErrors.ts` exists, is tested, and is used by exactly two files
(`PollCard.vue:65,80`, `PollForm.vue:57`). Four others hand-roll a worse version —
`ReportForm.vue:67-71`, `SignupView.vue:52-55`, `EditProfileView.vue:66-69`,
`EditPasswordView.vue:50-53` — each with an unchecked
`as Record<string, string[]> | undefined` cast, each reading **only** `.fields`.

**Concrete consequence:** `reports/api.py:119` and `:121-123` raise
`PermissionDenied` with carefully-written Italian sentences and no `fields` key.
A citizen who submits the edit form just after an admin acknowledged the report
sees "Si è verificato un errore. Riprova." instead of "La segnalazione non è più
modificabile: è già stata presa in carico." Same for every 403/404 across those
four forms. **Fix:** delete four blocks, call the helper that already handles
`detail`, nested `fields`, and the fallback.

### TD-22 · The option-ordering test cannot fail

`polls/tests.py:94` and `:152` assert option order, but every fixture inserts
options in ascending `position` order, so with no `ORDER BY` at all the database
returns insertion order — which *is* position order. The `.order_by('position')`
restatement at `polls/api.py:35` is the one gotcha `CLAUDE.md` explicitly warns
about (`annotate()` drops `Meta.ordering`), and it has **zero real coverage**.

**Fix:** one test that creates option `'B'` at `position=1` *before* `'A'` at
`position=0` and asserts the API returns `['A', 'B']`. It is the only test that
can actually fail if that line regresses.

### TD-23 · No `conftest.py` — the fixtures are copy-pasted across three apps

`PASSWORD`, `api_client`, `citizen`, `other_citizen`, `admin`, `make_client`
appear verbatim in `account/tests.py:8-29`, `reports/tests.py:14-61` and
`polls/tests.py:12-51`. Isolation is genuinely clean (pytest fixtures are
function-scoped, no shared mutable state), so this is not a correctness bug — but
it is three places to change one thing, and it is *why* the suite creates users
44 times, which is what TD-05 pays for. Also, the autouse `media_root` fixture
redirecting `MEDIA_ROOT` to `tmp_path` exists only in `reports/tests.py:20-22`;
nothing else uploads today, so there is no pollution now, but the guard belongs
in conftest rather than in one file by luck.

**Do TD-05 and TD-23 in the same session** — the hasher override needs a single
home anyway. `backend/conftest.py` now exists (TD-18 needed an autouse cache
reset), so the file to put it in is already there; the six duplicated fixtures
are still duplicated. TD-18's tests added ~12s of hashing, so this is now the
highest-value item left on runtime alone.

**On splitting the flat `tests.py` files:** not yet. Sizes are 249/460/429 lines
and each is already sectioned by spec-ID comment banners. The threshold is ~600
lines or ~40 tests in one file, or the first time a cross-cutting
`test_permissions.py` spanning reports *and* polls is wanted. `reports/tests.py`
will cross it once the TD-17 and coverage gaps below are filled.

### TD-24 · `django-debug-toolbar` runs in production, gated on `TESTING` not `DEBUG` ✔

`settings.py:229-237` appends the app to `INSTALLED_APPS` and its middleware to
the **front** of `MIDDLEWARE` whenever `TESTING` is false — which includes
production — and `requirements.txt:3` pins it as a runtime dependency.

**Inert today, and worth being exact about that:** `debug_toolbar_urls()` returns
`[]` when `DEBUG` is false, and the toolbar's own `show_toolbar` callback checks
`DEBUG` and `INTERNAL_IPS`. Nothing renders. The debt is that the only thing
between a public host and full SQL/settings/request introspection is a
third-party default, while the app and middleware load on every request anyway.
**Fix:** `if DEBUG and not TESTING:`, and move the pin to `requirements-dev.txt`.

### TD-25 · `/api/users/list/` is unpaginated, and the profile count lies

`account/api.py:59-70` returns every `User` row; both report and poll lists
paginate at 20 with `max_page_size = 100`. `UsersView.vue:15-26` renders the
whole thing as avatar cards, so payload and image fan-out scale linearly with
signups. Separately, `ProfileView.vue:32` assigns `response.data.results` and
`:63` renders `{{ reports.length }}` — so a citizen with 25 reports is told they
have 20, and the list truncates silently with no "load more" (`PollsView.vue:43-52`
handles `next` correctly).

**Fix:** hoist `DEFAULT_PAGINATION_CLASS` + `PAGE_SIZE` into `REST_FRAMEWORK` and
delete both byte-identical pagination classes; render `response.data.count`.

### TD-26 · Decompression-bomb window in `strip_exif` — **FIXED 2026-08-19** ✔

> Closed. `validate_image` checks `width * height` against a 40 Mpx budget from
> the **header**, before `load()` allocates anything, and separately catches
> `Image.DecompressionBombError` — which is not an `OSError`, so the original
> handler let it escape as a 500. Two tests: a 7000×7000 1-bit PNG that is a few
> KB on disk (the 1×–2× band where Pillow only warns), and a hand-built PNG
> header declaring 30000×30000 (where Pillow raises).

`images.py:18-23` catches `OSError`, which covers `UnidentifiedImageError` but
**not** `PIL.Image.DecompressionBombError`. Pillow has two bands: above
`2 × MAX_IMAGE_PIXELS` it raises (and DRF's `ImageField.verify()` catches that
first — clean 400), but between 1× and 2× it only *warns* and proceeds. So a
~5 MB PNG declaring ~89 M pixels passes validation and `image.load()` allocates
roughly 270 MB, plus a re-encode buffer. Applies with no size cap at all on the
avatar path (TD-12). **Fix:** explicit `width * height` cap before `load()`, and
widen the except.

### TD-27 · `/api/users/me/` invents a fourth user shape

`account/api.py:24`, `:57` and `:70` return `django.http.JsonResponse` instead of
DRF's `Response`, skipping content negotiation and the renderer. Worse, `me`
hand-builds its dict and names the avatar field **`avatar`**, while
`account/serializers.py:16` names it **`avatarURL`**. The drift propagates:
`LoginView.vue:52` feeds `response.data` (with `avatar`) into `setUserInfo`,
while `EditProfileView.vue:60` reaches for `response.data.user.avatarURL`. There
is no `definitions/interfaces/` entry for `/api/users/me/` at all — the store's
private `UserInfo` (`stores/user.ts:22-28`) is the de-facto contract. This is the
one real interface drift: `User.ts` mirrors `UserSerializer` correctly, but the
`me` endpoint has no mirror and disagrees on a field name.

**Fix:** a `MeSerializer(UserSerializer)` adding `email` and `role`, returned via
`Response`; one avatar field name everywhere; an interface to match.

### TD-28 · The account endpoints read `request.POST`, forcing multipart on a JSON API

`account/api.py:80` and `:90` use `request.POST`/`request.FILES` while every other
endpoint uses `request.data`. That undocumented coupling is why
`EditPasswordView.vue:33-43` builds a `FormData` and sets
`multipart/form-data` for a password change containing no file. Switch either
side to JSON and every field fails with "campo obbligatorio". DRF's parser
negotiation is bypassed entirely. **Fix:** `request.data` on both.

---

## P3 — cheap, cosmetic, or waiting on real data

Carried over from the first pass: **TD-07** ghost `backend/posts/` and
`backend/notifications/` directories — plus a **third ghost**,
`backend/media/post_attachments/`, surviving the removed `posts` app (gitignored,
so it never reached the repo; delete it with the others). **TD-08** unindexed
`IssueReport.status`. **TD-09** reduced to the `SiteTitle.vue` gradient alone (a
product decision). **TD-10** the borrowed venv, now known to break the documented
test command outright.

New:

- **TD-29 · Dead code and phantom CSS.** `assets/base.css` is **0 bytes** and
  still imported at `main.css:2`. `main-left` / `main-right` / `main-center` are
  applied in **8 view templates** and **defined nowhere** — they read as layout
  hooks and do nothing. Four unreferenced custom properties in `main.css:5-6,18,31`
  (`--color-stackoverflow-orange`, `--color-linkedin-blue`, two animations) are
  pre-pivot leftovers. `components/icons/UserIcon.vue` has zero references.
  `account/views.py` is a tombstone comment. `settings.py:49-50` still carries
  `EMAIL_BACKEND` / `EMAIL_HOST_USER = "noreply@pastorello.info"` from the
  removed M0 activation flow — nothing sends mail, and it embeds a personal
  domain. `backend/media/avatars/pastorello-stackoverflow.jpg` is a personal file
  in the working tree.
- **TD-30 · `get_avatar()` hardcodes picsum.photos.** `account/models.py:58-62`
  returns `https://picsum.photos/200/200` as the placeholder. It serves a
  **random** image per request, so the same citizen has a different face in the
  header, in `UserCard`, and on every reload — it reads as a bug. It also leaks
  visitor IPs and referrers to a third party on every page view, and fails
  entirely on a network without picsum. **Fix:** a static asset, or return `None`
  and render initials.
- **TD-31 · Frontend paper cuts.** `SiteTitle.vue:3-4` uses `<a href="/">`
  instead of `<RouterLink>`, so clicking the brand does a full page reload and
  re-runs the whole auth bootstrap. `stores/toast.ts:19-36` fires three untracked
  `setTimeout`s per toast and mutates `classes` by string concatenation — two
  toasts within 5s and the first one's timers hide the second early.
  `forms/user.ts:17` prefixes messages with `issue.path`, rendering literally
  **"password2 Le due password non corrispondono"** — a raw field name in Italian
  UI copy (N4). `PanelBox.vue:10-15` builds `classObject` as a plain
  non-reactive object from a destructured prop (harmless — no caller passes
  `size` — but `ActionButton.vue:9` does the same thing correctly with `computed`,
  and the inconsistency is the trap). Nine silent `catch` blocks swallow errors;
  the worst is `ReportDetailView.vue:86-88`, where a failed upvote leaves the
  button unchanged with no feedback while every other action raises a toast.
  Duplication: `UsersView.vue:38-62` re-implements `SearchBar.vue:37-60` verbatim;
  `EditProfileView.vue:23,39` hand-rolls file handling instead of
  `useFileUpload.ts` and therefore has no preview.
- **TD-32 · Auth bootstrap ordering is latently fragile.** `main.ts:15-17`
  installs the router (which starts the initial navigation and runs the
  `beforeEach` guard) before `App.vue:25-27`'s `onBeforeMount` calls
  `initStore()`, which restores `isAuthenticated` from localStorage. It works
  only because Vue Router's guard queue is a promise chain, so the first guard
  fires in a microtask while `app.mount()` runs synchronously. Any `await` added
  before `app.mount()` makes an authenticated hard-reload of `/users` or
  `/profile/*` bounce to login. Same root cause: the `Authorization` header is
  assigned in three places with three spellings and there is no axios *request*
  interceptor, though `lib/auth.ts` already owns the response one.
  **Fix:** call `initStore()` in `main.ts` between pinia and the router; replace
  the three assignments with a request interceptor.
- **A11y one-liners only** (N5 scopes the real audit out): `AppToast.vue:8` has
  no `role="status"`/`aria-live`, so no toast is ever announced;
  `ProfileView.vue:52-56`'s avatar `<img>` has no `alt`; `AppHeader.vue:58`
  renders `src=""` after logout and re-requests the page URL as an image.

---

## Documentation debt

The docs are unusually accurate — test counts (76/32) are mutually consistent
across five files, every relative link and anchor resolves, the ai-log index
matches the files on disk, and the whole architecture section of `CLAUDE.md`
was verified line by line. These are the exceptions.

**Closed 2026-08-19:** DOC-03 (with TD-11 — compose now forwards the variables
its comment promised), DOC-01, DOC-02, **DOC-04**
(the `.gitignore` rule was added, so the claim is now true on every clone rather
than on one machine — see TD-15), DOC-08, and the `CLAUDE.md` half of DOC-06.
The rest of the table is open.

| # | Where | The problem | Fix |
|---|---|---|---|
| DOC-01 | `CLAUDE.md:9,145` | Still says the demo is roadmap item #1 and points at `shipping-and-launch`. `roadmap.md:12,21` made it item **2, parked**, and the tech-debt work item 1. The skills section landed in `44ebc7d`, the parking in `78c3d97`; CLAUDE.md was never re-synced. | Point at TD-01 / `ci-cd-and-automation` as the active workstream; demo is item 2, parked. |
| DOC-02 | `CLAUDE.md:157`, `tech-debt.md` TD-09 | Repeats the `PollCard.vue` contrast finding as "real and still open". ✔ It is a false positive (see Corrections). | Restate TD-09 as the `SiteTitle` gradient alone; note the ternary false positive so it is not re-reported. |
| DOC-03 ✅ | `docker-compose.yml:31` — **fixed 2026-08-19 with TD-11** | The comment says "set it in .env for anything beyond local development" — but ✔ the `backend` service `environment` block never forwards `DJANGO_SECRET_KEY` (nor `DJANGO_SSL_REDIRECT`). Following the instruction exactly still yields the committed insecure fallback. A comment that lies is worse than none. | Either forward both vars, or say plainly they are deployment-only and not wired into the dev stack. Ties to TD-11. |
| DOC-04 | `CLAUDE.md:120` | Claims `.claude/settings.local.json` "is gitignored, so the marketplace reference never reaches the public repo". ✔ It is ignored **only** by the machine-level `~/.config/git/ignore`; this repo's `.gitignore` has no `.claude/` rule. The guarantee holds on one Mac. | Add the rule to `.gitignore`, then the sentence becomes true. |
| DOC-05 | `mvp-spec.md:108-110` | §8 lists four account endpoints; `account/urls.py:11-14` routes **four more** that are live and auth-only: `POST /editprofile/`, `POST /editpassword/`, `GET /list/?q=`, `GET /:id/`. Nothing in the doc set tells an agent they exist. | Add them to the "Existing (keep)" block; amend `:128` to note the users list moved to `GET` but kept the `/list/` path. |
| DOC-06 | `README.md:58-61`, `CLAUDE.md:60-70` | The quality-gate block cannot be run as written — line 2 `cd frontend` executes from inside `backend/`. It also omits the venv activation, and `"test:unit": "vitest"` is watch mode in a TTY, so the `&&` chain never reaches `lint`/`build`. Compounded by TD-10: the documented pytest invocation does not run at all. | Subshells `(cd backend && …)`, add the venv step, and either add a `test:unit:run` script or document `-- run`. |
| DOC-07 | `README.md:37`, `mvp-spec.md:132` | "Vue Testing Library" — the dependency is `@vue/test-utils` and every spec imports `mount` from it. No `@testing-library/*` anywhere. | "Vue Test Utils". |
| DOC-08 | `CLAUDE.md:37` | Says `Category` lives in `Report.ts`; it is in its own `Category.ts`, imported by `Report.ts:1`. | `Report`/`ReportPin`/`ReportStatus` in `Report.ts`, `Category` in `Category.ts`. |
| DOC-09 | `mvp-spec.md` | Four stale claims: `:82` names `CityMap.vue` (deleted in M2 — it is `ReportsMap.vue`); `:150` names `python manage.py test` as an M0 exit gate (runs zero tests); `:70` promises "minimum coverage gates defined in §9" that `:132` explicitly declines to define and no tool computes; `:134` describes `@typescript-eslint` **strict** rules when `eslint.config.ts:23` uses `recommended` and never mentions that oxlint runs first. `:93` also names `display_name`/`created_at` where the model has `name`/`date_joined`. | Five line edits. |
| DOC-10 | `.env.example`, `frontend/.env.example` | `VITE_API_BASE_URL` is read by `docker-compose.yml:43` from the root `.env`, but the root `.env.example` — which claims at line 1 to cover what compose uses — never lists it. Otherwise env-var documentation is complete in both directions. | Add a commented entry noting the compose service consumes it. |

---

## Coverage gaps worth naming

Beyond TD-16, TD-17 and TD-22, roughly **28 of 50 domain rules are genuinely
proven**; 16 have no test at all. The ones that carry real risk:

- **The `rejected` status is entirely untested** — it never appears as source or
  target anywhere in the backend suite. That is the moderation lever (spam,
  duplicates). One `@pytest.mark.parametrize` over `ALLOWED_TRANSITIONS`
  asserting every legal edge 200s and every illegal one 400s closes this
  permanently and replaces four hand-written tests.
- **PNG and WEBP are never proven to round-trip.** Only JPEG is exercised. A typo
  in `ALLOWED_FORMATS` (`images.py:8`) starts 400-ing every WEBP upload with a
  green suite. `images.py` has no direct unit test at all.
- **The EXIF test cannot detect a lost `exif_transpose`.** `reports/tests.py:234-248`
  asserts `len(stored_exif) == 0` but never that pixels were rotated — remove
  `ImageOps.exif_transpose` and the test stays green while every portrait phone
  photo lands sideways. Use a non-square image and assert transposed dimensions.
- **The interceptor's single-flight has no test** (`lib/auth.ts:34-38`). With
  rotation + blacklisting on, regressing `refreshing ?? …` to a plain assignment
  means N parallel 401s blacklist each other and log everyone out at once.
- **`ReportForm` and `PollForm` have no success-path test.** Both spec files mock
  `axios` and never assert a call or a `saved` emit, so the FormData assembly at
  `ReportForm.vue:41-49` — field names, `lat`/`lng` stringification, the
  conditional photo append, the multipart header — is unverified at every level.
  Largest frontend gap by product value.
- No expired-access-token test; no test that voting in poll A leaves poll B's
  counts `null`; no unit test for the router guard or M4's `?redirect`.

Test-quality defects: selectors coupled to Tailwind classes
(`PollForm.spec.ts:33,55` — `:36` shows the right `aria-label` pattern);
`StatusBadge.spec.ts:17-18` hard-codes `rgb(239, 68, 68)` instead of importing
`STATUS_META`; `auth.spec.ts` mocks `interceptors.response.use` itself, so
"the interceptor is actually installed" is provable only by e2e.

**E2E order once TD-16 is green:** file a report on the map (must run against
`test:e2e`, not `:dev` — the Leaflet default-import gotcha and TD-02 break
clustering in built output *only*), then vote in a poll, then upvote.

---

## Suggested order

1. ~~**TD-01 (CI)**~~ — **done 2026-08-19.** TD-16 was the proof of why: a red
   spec sat unnoticed for a month. Everything below is now watched automatically.
2. ~~**TD-11**~~ — **done 2026-08-19**, along with TD-15 and DOC-03. The
   deploy-blocking configuration items are now closed.
3. **TD-16, TD-17, TD-22** — three small tests and two string edits that close the
   three silent-regression holes. Under an hour together.
4. ~~**TD-12 + TD-13 + TD-26**~~ — **done 2026-08-19** as one change, and TD-13's
   severity corrected downward in the process.
5. ~~**TD-14**, then **TD-18**~~ — **done 2026-08-19.**
6. **TD-03** — 10 minutes, makes `npm audit` readable.
7. **TD-19**, **TD-20** — the counter, then the logout gaps.
8. **TD-05 + TD-23** together, then **TD-06** (bumps, now watched by CI).
9. **TD-02** — needs real browser verification, so give it its own session.
10. **TD-21**, **TD-25**, **TD-27**, **TD-28**, then the documentation table.
11. P3 whenever they are in the way.

The DOC-* items are cheap enough to fold into whichever session touches the same
file — except **DOC-01, DOC-02 and DOC-04**, which actively mislead an agent and
should go in with step 2.
