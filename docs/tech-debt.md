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
| Backend tests | `python -m pytest` | **142 passed** in 3.3s (was 76 in 54.4s; see TD-05) |
| Backend lint | `python -m ruff check .` | clean |
| Frontend tests | `npm run test:unit -- run` | **43 passed** (11 files) in ~2s |
| Frontend lint | `npm run lint` | clean (62 files, 116 rules) |
| Build | `npm run build` | green, ~300ms |
| E2E | `npm run test:e2e` | **4 passed** (green since TD-16; in CI since 2026-08-19) |

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

### TD-02 · Leaflet is bundled twice (~86 kB gzip wasted) — **FIXED 2026-08-27** ✔

> Closed in phase C5, first thing, as the roadmap asked — the map was about to
> gain layers, routes and rasters. One line in `vite.config.ts`:
>
> ```js
> 'leaflet/dist/leaflet-src.esm': 'leaflet',
> ```
>
> `npm run build` now emits a single `leaflet-src-*.js` (148.79 kB │ gzip:
> 43.36 kB); the `leaflet-src.esm-*.js` chunk is gone.
>
> **The cause was one step off from the finding.** Nothing imported the ESM
> build statically: `@vue-leaflet/vue-leaflet` reaches for it with
> `await import("leaflet/dist/leaflet-src.esm")` on the branch it takes when
> `use-global-leaflet` is false — which is never, in this codebase. So the
> second copy was emitted as its own chunk and never fetched: dead weight in
> `dist/`, not 43 kB off the wire. The alias points that specifier at the same
> package entry every component already imports, so Vite dedupes them into one
> chunk. It also disarms the footgun the original note was really about — a
> component that forgets `use-global-leaflet` now gets the instance
> `leaflet.markercluster` augmented instead of a fresh, unaugmented one.
>
> **Verified in the browser, not on a green build** (the register's own
> condition): production build served by `vite preview` on :4173, home map
> loaded with 25 seeded reports — clustered pins render and cluster counts are
> correct — plus card pins, a feste route polyline, a GeoJSON overlay and a
> raster overlay whose opacity slider works. No console errors. Cypress's
> production-build job is green.

### TD-03 · Build tooling sits in `dependencies` — **FIXED 2026-08-20, and the finding's reasoning was wrong** ✔

> `@tailwindcss/vite` and `tailwindcss` moved to `devDependencies`, which is
> correct on its own merits — build tooling is not a runtime dependency.
>
> **But it changed nothing about the audit, because the diagnosis above is
> wrong.** `npm audit --omit=dev` still reports 5 advisories, and they are not in
> `vite`/`launch-editor` at all: they are in **axios** (many high-severity CVEs),
> `follow-redirects`, `form-data`, `nanoid` and `postcss`. The claim that "none of
> them touches the static bundle a visitor downloads" is false — axios is
> imported in 21 places in `src/` and ships in the built output (verified by
> grepping `dist/`).
>
> **This promotes part of TD-06.** axios is pinned at 1.15.0 with 1.19.0
> available, and the gap is not routine drift: it is a runtime dependency with
> open high-severity advisories. It deserves its own change, because a minor bump
> touches the 401 interceptor and needs the e2e suite to verify.

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

### TD-04 · End-to-end coverage is one file — **paid 2026-08-30 and 2026-09-04**, one gap left

> **What changed.** Four spec files, **17 tests** (was one file, 5). The v2
> flows now have end-to-end proof that the SPA and the API agree:
>
> - `reader.cy.ts` — the map and its layer toggles; **a draft stays invisible**;
>   **the confidential overlay is absent, not hidden** (ADR-0006 seen from
>   outside); a card reached from the list and read; a feste route as its list
>   of stops; and the same on a 375px viewport, through the sheet.
> - `collaborator.cy.ts` — log in, write a card, publish it, find it in the
>   list; create a draft and confirm a logged-out visitor gets the list rather
>   than a 403; start an English translation and land in its empty form.
> - `collabora.cy.ts` — the request form at human speed, and the anti-spam
>   timing check *as the client sees it*.
> - `login.cy.ts` — unchanged apart from covering both layouts.
>
> **The e2e job now runs a real API.** `python manage.py seed_e2e` (a new
> management command that refuses to run outside `DEBUG`, because it creates
> accounts whose password is written down in a spec file) seeds deterministic
> fixtures, and CI starts Django on :8000 beside the production build.
> Stubbing the API with `cy.intercept` was the cheaper option and the wrong
> one: half of what is worth covering here is precisely where the two sides
> could disagree.
>
> **One assertion was wrong and the code was right**, which is worth recording:
> the spec first expected an instant submission to be *refused*. The API
> deliberately drops it and answers as though it had stored it, so a bot cannot
> tune itself past the check. The spec now pins that indistinguishability; that
> nothing was stored stays a backend test, where the database is in reach.
>
> **Update, 2026-09-04 — the v1 flows are covered.** `v1-flows.cy.ts`, three
> tests, one login for the file (`testIsolation: false`, for the rate-limit
> reason the a11y spec gives): a report filed from the home and then found in
> the pins the map redraws itself from; somebody else's report supported and
> the support taken back, with a reload in the middle to prove the server kept
> it; and a poll voted in, where the results are absent before the vote and
> present after, with no second vote on offer (F3.2/F3.3).
>
> Two things it needed, both in `seed_e2e`. **A report authored by the admin
> fixture**, so supporting one is the ordinary act it is meant to be rather
> than a citizen upvoting himself — which the API does allow, deliberately, and
> which would have proved less. And **clearing the collaborator's votes and
> upvotes between runs**: a vote is final by design and an upvote is a toggle,
> so a second run would otherwise fail on the app behaving correctly. The
> denormalized `upvotes_count` (TD-19) is recomputed there too — deleting rows
> does not go through the endpoint that maintains it, and a spec that asserts
> "1 sostegno" has to mean it on every run, not the first.
>
> The report is filed through the **manual-coordinate path**, not a synthetic
> click on the Leaflet canvas. That is not the test taking the easy road: the
> coordinate boxes are the keyboard alternative HomeView offers because a
> clickable pin has none (WCAG 2.1.1), so this covers something a reader
> actually depends on and does not pretend to cover the widget itself.
>
> **Still not covered, deliberately:** the leg *after* an admin approves a
> collaboration request — accepting the invite and setting a password needs the
> token out of an e-mail, which means reading the outbox or adding a test-only
> hook. That is a decision to take on purpose, not a thing to bolt onto a
> coverage pass.

Original text: `frontend/cypress/e2e/` contains **only `login.cy.ts`**. The three
flows that *are* the product — filing a report on the map, upvoting, voting in a
poll — have unit tests but no end-to-end proof that the SPA and the API agree.

**Partially addressed 2026-08-19:** TD-16 fixed the red spec and Cypress now runs
in CI, so the harness is trustworthy. The *coverage* is still one file — filing a
report on the map, upvoting and voting in a poll remain unproven end to end.

### TD-05 · The backend suite takes 54s for 76 tests — **FIXED 2026-08-19** ✔

> Closed: `PASSWORD_HASHERS = ['…MD5PasswordHasher']` inside the existing
> `if TESTING:` branch in `settings.py`. **50.53s → 3.31s** on the same test
> set — measured by toggling the single line and re-running, not inferred, and
> stable across three runs. Roughly **15×**.
>
> **This entry's own estimate was badly low, and that is the interesting part.**
> It predicted ~38%, from 44 user creations × 0.296s. The real figure is ~93%,
> because creations were only part of it: every `auth_client` login, every
> `check_password`, and Django's dummy-hash path for unknown users all pay the
> same cost — and TD-18's rate-limit tests hammer login eleven times each by
> design. Counting the fixtures missed the authentication paths entirely.
>
> Two tests pin it: one asserts the fast hasher is active under pytest, the
> other boots settings in a subprocess and asserts MD5 is **not** there — the
> guard that matters, since MD5 must never be what stores a real password.

0.7s per test, and the suite creates users or passwords in 44 places
(`account/tests.py` alone: 32). No fast `PASSWORD_HASHERS` override is
configured, so every fixture pays for real PBKDF2 hashing. A test-only MD5
hasher is the standard Django fix and typically cuts this by an order of
magnitude. Confirm by measuring before and after — the estimate above is
inference from the hashing count, not a profile.

**Now measured — see Corrections above:** 0.296s per hash, ≈38% of the runtime,
and the `if not TESTING:` insertion point already exists. Do it with TD-23.

### TD-06 · Dependencies have drifted — **the majors done 2026-09-05, two held back** ✔

> **2026-09-05 — the majors.** Backend: Django 6.1 → 6.1.1, psycopg 3.3.4 →
> 3.3.5, sqlparse 0.5.5 → 0.6.0, **django-debug-toolbar 6.3 → 8.0** (two
> majors) and **ruff 0.15.22 → 0.16.6** (behind TD-33's pinned rule set).
> The toolbar is the one the suite cannot see — it is installed only when
> `DEBUG and not TESTING`, so a green pytest run says nothing about it — and it
> was checked against a running dev server instead: `/admin/login/` 200 with
> the toolbar injected, `/api/categories/` 200.
>
> Frontend: **pinia 3 → 4**, **vitest 4 → 5**, **jsdom 29 → 30**, **oxlint and
> its eslint plugin 1.57 → 1.81**, eslint-plugin-cypress 6 → 7, npm-run-all2
> 8 → 9, start-server-and-test 2 → 3, @types/node 24 → 26, @types/jsdom 28 →
> 30, prettier 3.8 → 3.9 (checked first: it reformats nothing in this tree),
> plus the minors that had drifted again — tiptap 3.30 → 3.31, vue-router
> 5.3.1, eslint 10.10, eslint-plugin-vue 10.10.
>
> **Held back, each for a reason that is now known rather than assumed:**
>
> - **cypress 15 → 16**, for two independent reasons. `cypress-axe@1.7.0`
>   declares `peer cypress@"^10 || … || ^15"`, so the a11y gate's plugin does
>   not support 16 and the tree goes to an invalid peer state — which is how it
>   was found: the *next* `npm install` failed with ERESOLVE. And 16 changes
>   what `:visible` means for a visually-hidden element: `login.cy.ts` asserts
>   the small-first home's `h1.sr-only` is `not.be.visible`, and under 16 it is
>   visible. Arguably 16 is right — an `sr-only` element is deliberately
>   rendered — so that spec needs a better assertion (it is testing "not
>   perceivable", not "not in the layout"), and that is a test-semantics
>   decision, not a bump.
> - **typescript 6 → 7**, because `vue-tsc` cannot run on it:
>   `ERR_PACKAGE_PATH_NOT_EXPORTED` out of `vue-tsc/index.js`, TS 7's native
>   port no longer exporting the internals it reaches for. `npm run build` is
>   the type-check gate, so this waits on vue-tsc, not on us.
>
> ---
>
> ### The original entry follows

> **axios 1.15.0 → 1.19.0.** Not routine drift: it is a runtime dependency that
> ships in the bundle, and it carried a long list of open high-severity
> advisories. `npm audit --omit=dev` goes from 5 advisories to 2, and the two
> that remain (`postcss`, `nanoid`) are genuinely build-time — they arrive via
> `vue-router → @vue/compiler-sfc → postcss` and **neither appears in the built
> output**, checked by grepping `dist/` rather than assumed. (The `nanoid` string
> that does appear there is zod's format-validator name, not the package.)
>
> **Guarded automatically since 2026-08-30:** `cypress/e2e/session.cy.ts`
> forges an expired access token and asserts the 401 → refresh → replay cycle
> against a real API, so the next axios upgrade cannot pass on a green suite
> that never exercised it. Writing that spec is what turned up the double
> refresh `stores/user.ts` now de-duplicates.
>
> **Verified by running the app, because the test suite cannot see this.**
> `lib/__tests__/auth.spec.ts` mocks axios entirely and the e2e job runs no
> backend, so a green suite says nothing about a real library upgrade. Against a
> live backend and SPA: login and `/me/` (proving the TD-32 request interceptor
> attaches the token), a multipart report upload with a photo (201, and the
> stored name normalised to `.png`), and — with `ACCESS_TOKEN_LIFETIME`
> temporarily set to 10 seconds — the full expiry cycle, observed twice in the
> network log: `GET /list/?q= 401 → POST /refresh/ 200 → GET /list/?q= 200`.
> That last one matters because 1.19 changed interceptor dispatch on synchronous
> request-interceptor failure, which is exactly where this app now lives.
>
> **Backend minors done 2026-08-30.** Django 6.0.3 → 6.1, DRF 3.17.1 → 3.18.0,
> asgiref, gunicorn, nh3 0.3.6 → 0.3.7, pillow 12.2 → 12.3, PyJWT, pytest-django.
> Two of those are security-relevant code, so the question was whether a green
> suite would *see* them break — and here it would: `content/tests.py` drives
> the sanitizer with script tags, event handlers, iframes and `javascript:`
> URLs rather than only happy paths, and `common/tests.py` asserts both that
> EXIF is emptied *and* that the orientation was applied first (its own comment
> explains why the second assertion exists: without it, deleting
> `exif_transpose` still passes). Nothing to add on those two paths.
>
> **Held back, each for a stated reason:**
> - **ruff 0.15.22 → 0.16.5** — not a dependency question but a policy one. 0.16
>   changes the *default rule set*: 81 findings appear, 42 of them RUF012
>   (`mutable-class-default`) on Django/DRF `Meta` classes, which want
>   `ClassVar` annotations to silence, plus 36 import-sorting fixes. Adopting it
>   is a lint sweep with an opinion in it, and it does not belong in a
>   dependency bump. See **TD-33**.
> - **django-debug-toolbar 6.3 → 7.1.1** (major) and **sqlparse 0.5.5 → 0.6.0**
>   (0.x minor, i.e. a major in practice).
> - The frontend's minors, and the three majors held back on purpose (pinia
>   3 → 4, typescript 6 → 7, oxlint). None carry a known advisory.
>
> **Django 6.1 surfaced a dated deprecation:** `EMAIL_BACKEND` is deprecated in
> favour of `MAILERS` and goes away in Django 7.0. It is the setting C1's invite
> and reset e-mail runs on, so the migration belongs with the SMTP work in
> roadmap item 3 rather than here. See **TD-34**.

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

### TD-16 · The only e2e spec has been failing since M4 — **FIXED 2026-08-19** ✔

> Closed, and confirmed by **running Cypress** rather than by reading the
> strings — the mistake that produced this item in the first place. Before: 3
> tests, 2 passing, 1 failing. After the two-string fix: 3 passing.
>
> Cypress is now a third CI job, as TD-01's workflow header planned. It runs
> against a **production build** (`npm run test:e2e`, vite preview on :4173),
> not the dev server, because TD-02's double bundle and the Leaflet
> default-import gotcha only appear in built output. The binary is cached; a
> failed run uploads screenshots and videos. No backend service — today's specs
> exercise the SPA shell only, and that is noted in the job so the next spec
> author knows to add one.

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

### TD-17 · Nothing stops `role` from becoming writable — **FIXED 2026-08-19** ✔

> Closed by two tests, since the code was already correct — the debt was the
> unpinned invariant, not a bug. Signup and `editprofile` now both POST
> `role: admin` and assert the stored role is unchanged. Verified by mutation:
> adding `'role'` to either form's `Meta.fields` fails them both.

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

### TD-19 · The upvote counter can drift, cannot be repaired, and has no invariant test — **FIXED 2026-08-20** ✔

> Closed on all three counts. The toggle runs inside `transaction.atomic()` and
> derives its delta from the row count the DELETE actually returned, so a
> removal that removed nothing no longer decrements. `manage.py
> reconcile_upvotes` (with `--dry-run`) recomputes the counter from the `Upvote`
> rows, so drift is repairable — the admin marks the field read-only, and
> nothing else could fix it. Tests assert the invariant
> `upvotes_count == upvotes.count()` across a toggle sequence and that the
> command repairs a counter forced to `-7`.
>
> **Honest limit:** the racing double-DELETE itself is not reproduced by a test —
> the suite has no real concurrency, and simulating it would mean mocking the
> ORM. The guard is verified by inspection; what is tested is that drift, however
> it arises, can be measured and repaired.

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

### TD-20 · Logout leaves the token live, client-side and server-side — **FIXED 2026-08-20** ✔

> All three gaps closed. `removeToken()` now deletes
> `axios.defaults.headers.common['Authorization']`, so a logged-out tab stops
> sending the old bearer token instead of carrying it until the next reload.
> `POST /api/users/logout/` blacklists the presented refresh token, and the SPA
> calls it — best effort, so an offline failure still clears the session locally.
> Changing a password blacklists every `OutstandingToken` for that user, which
> ends *all* sessions including the caller's; `EditPasswordView` now says so and
> sends them to the login screen rather than letting the next request 401 on its
> own.

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

### TD-21 · `extractApiErrors` is reimplemented four times, and the copies drop `detail` — **FIXED 2026-08-20** ✔

> Closed: `ReportForm`, `SignupView`, `EditProfileView` and `EditPasswordView`
> all call the tested helper, and the four unchecked
> `as Record<string, string[]>` casts are gone with them. A `ReportForm` test
> now rejects with a `{detail}`-only body and asserts the backend's Italian
> sentence reaches the user — reverting to the old extractor fails it.

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

### TD-22 · The option-ordering test cannot fail — **FIXED 2026-08-19** ✔

> Closed by one test that inserts `Seconda` at `position=1` **before** `Prima`
> at `position=0`, then asserts both the list and the detail endpoint return
> them in position order. Verified by mutation: dropping the
> `.order_by('position')` at `polls/api.py:35` fails this test while the six
> pre-existing ordering assertions all still pass — which is precisely the
> finding.

`polls/tests.py:94` and `:152` assert option order, but every fixture inserts
options in ascending `position` order, so with no `ORDER BY` at all the database
returns insertion order — which *is* position order. The `.order_by('position')`
restatement at `polls/api.py:35` is the one gotcha `CLAUDE.md` explicitly warns
about (`annotate()` drops `Meta.ordering`), and it has **zero real coverage**.

**Fix:** one test that creates option `'B'` at `position=1` *before* `'A'` at
`position=0` and asserts the API returns `['A', 'B']`. It is the only test that
can actually fail if that line regresses.

### TD-23 · No `conftest.py` — the fixtures are copy-pasted across three apps — **FIXED 2026-08-19** ✔

> Closed: `api_client`, `citizen`, `other_citizen`, `admin`, `make_client` and
> the autouse `media_root` moved into `backend/conftest.py`; `PASSWORD` moved to
> `common/testing.py` (a module rather than a conftest symbol, so test modules
> can import it normally). **112 lines removed** from the three `tests.py`.
> Module-specific fixtures stayed put: `category`/`make_report` in reports,
> `make_poll` in polls, `auth_client` in account.
>
> Note on `media_root`: it is now autouse for **every** test, not just reports.
> The old arrangement held by luck — nothing else uploaded at the time — and
> stopped being true when the TD-12 avatar tests arrived.

`PASSWORD`, `api_client`, `citizen`, `other_citizen`, `admin`, `make_client`
appear verbatim in `account/tests.py:8-29`, `reports/tests.py:14-61` and
`polls/tests.py:12-51`. Isolation is genuinely clean (pytest fixtures are
function-scoped, no shared mutable state), so this is not a correctness bug — but
it is three places to change one thing, and it is *why* the suite creates users
44 times, which is what TD-05 pays for. Also, the autouse `media_root` fixture
redirecting `MEDIA_ROOT` to `tmp_path` exists only in `reports/tests.py:20-22`;
nothing else uploads today, so there is no pollution now, but the guard belongs
in conftest rather than in one file by luck.

Done together on 2026-08-19, as recommended.

**On splitting the flat `tests.py` files:** not yet. Sizes are 249/460/429 lines
and each is already sectioned by spec-ID comment banners. The threshold is ~600
lines or ~40 tests in one file, or the first time a cross-cutting
`test_permissions.py` spanning reports *and* polls is wanted. `reports/tests.py`
will cross it once the TD-17 and coverage gaps below are filled.

### TD-24 · `django-debug-toolbar` runs in production, gated on `TESTING` not `DEBUG` — **FIXED 2026-08-20** ✔

> Both gates are now `DEBUG and not TESTING` (`settings.py` and `urls.py`), and
> the pin moved from `requirements.txt` to `requirements-dev.txt`, so it is not
> installed in the production image at all.

`settings.py:229-237` appends the app to `INSTALLED_APPS` and its middleware to
the **front** of `MIDDLEWARE` whenever `TESTING` is false — which includes
production — and `requirements.txt:3` pins it as a runtime dependency.

**Inert today, and worth being exact about that:** `debug_toolbar_urls()` returns
`[]` when `DEBUG` is false, and the toolbar's own `show_toolbar` callback checks
`DEBUG` and `INTERNAL_IPS`. Nothing renders. The debt is that the only thing
between a public host and full SQL/settings/request introspection is a
third-party default, while the app and middleware load on every request anyway.
**Fix:** `if DEBUG and not TESTING:`, and move the pin to `requirements-dev.txt`.

### TD-25 · `/api/users/list/` is unpaginated, and the profile count lies — **FIXED 2026-08-20** ✔

> Closed, and the duplication went with it: `ReportPagination` and
> `PollPagination` were byte-identical, so both were replaced by
> `common/pagination.py::StandardPagination`, which `/api/users/list/` now uses
> too. `ProfileView` renders `count` from the paginated body instead of
> `results.length`, so a citizen with 25 reports is no longer told they have 20.
>
> Paginating the directory would have introduced the same silent truncation in
> `UsersView`, so it gained the total and a "Carica altri" button, matching what
> `PollsView` already did.

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

### TD-27 · `/api/users/me/` invents a fourth user shape — **FIXED 2026-08-20** ✔

> `MeSerializer(UserSerializer)` adds `email` and `role`; `me` and `user` return
> DRF `Response` objects instead of `JsonResponse`, so content negotiation and
> the renderer apply. One avatar field name — `avatarURL` — end to end: the store
> field, its localStorage key and `LoginView` were renamed to match. Two tests
> pin it, including one asserting `avatar` is **absent** from the payload.

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

### TD-28 · The account endpoints read `request.POST`, forcing multipart on a JSON API — **FIXED 2026-08-20** ✔

> Both read `request.data` now, so DRF's parser negotiation applies and a JSON
> body works. Two tests post JSON to `editprofile` and `editpassword`.
> `EditProfileView` still sends multipart, because it carries the avatar file —
> that is the format being appropriate, not the endpoint forcing it.

`account/api.py:80` and `:90` use `request.POST`/`request.FILES` while every other
endpoint uses `request.data`. That undocumented coupling is why
`EditPasswordView.vue:33-43` builds a `FormData` and sets
`multipart/form-data` for a password change containing no file. Switch either
side to JSON and every field fails with "campo obbligatorio". DRF's parser
negotiation is bypassed entirely. **Fix:** `request.data` on both.

---

## P3 — cheap, cosmetic, or waiting on real data

**TD-07 — FIXED 2026-08-20** ✔ The ghost `backend/posts/` and
`backend/notifications/` directories are gone, along with the third ghost the
second pass found — `backend/media/post_attachments/` — and a personal file left
in `backend/media/avatars/`. All were gitignored, so none of this appears in a
diff; it was disk state that made the backend folder lie to a newcomer.

**TD-08 — still open, deliberately.** `IssueReport.status` has no index. The
list endpoint filters on it, and that is irrelevant with zero rows. Revisit when
there is real data, not before.

**TD-09 — not debt.** Reduced to the `SiteTitle.vue` purple gradient, which is
the M4 brand. Changing it is a product decision, not a fix. (The `PollCard.vue`
half was a detector false positive — see Corrections.)

**TD-10 — FIXED 2026-08-20** ✔ The venv was recreated in place from
`backend/requirements-dev.txt`. `source .venv/bin/activate && python -m pytest`
and `pip` both work now, verified by running them, and the gotcha has been
removed from `CLAUDE.md`.

New:

- **TD-29 · Dead code and phantom CSS — FIXED 2026-08-20** ✔ Removed: the
  0-byte `assets/base.css` and its import, four unreferenced custom properties
  in `main.css`, the unreferenced `UserIcon.vue`, the `EMAIL_BACKEND` /
  `EMAIL_HOST_USER` settings left from the dropped M0 activation flow (which
  also embedded a personal domain), and the `main-left`/`main-right`/
  `main-center` classes that were applied across **nine** views and defined
  nowhere. `account/views.py` and `backend/media/post_attachments/` went
  earlier. Original text: **TD-29 · Dead code and phantom CSS.** `assets/base.css` is **0 bytes** and
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
- **TD-30 · `get_avatar()` hardcodes picsum.photos — FIXED 2026-08-20** ✔ It
  returns `None` now, and `components/cards/UserAvatar.vue` renders initials in
  its place across the header, the user cards and the profile page. No
  third-party request per page view, and a citizen keeps the same face between
  reloads. `User.avatarURL` is typed `string | null` to match. Original text:
  **TD-30 · `get_avatar()` hardcodes picsum.photos.** `account/models.py:58-62`
  returns `https://picsum.photos/200/200` as the placeholder. It serves a
  **random** image per request, so the same citizen has a different face in the
  header, in `UserCard`, and on every reload — it reads as a bug. It also leaks
  visitor IPs and referrers to a third party on every page view, and fails
  entirely on a network without picsum. **Fix:** a static asset, or return `None`
  and render initials.
- **TD-31 · Frontend paper cuts — FIXED 2026-08-20** ✔ `SiteTitle` uses
  `RouterLink`, so the brand no longer reloads the SPA and re-runs the auth
  bootstrap. The toast store tracks its timer handles and rebuilds `classes`
  from the base, so a second toast is no longer cut short by the first one's
  callbacks. `forms/user.ts` maps field paths to Italian labels, so the UI shows
  "Conferma password: Le due password non corrispondono" instead of leaking
  `password2`. A failed upvote raises a toast instead of failing silently. Three
  one-line a11y defects fixed: `role="status"`/`aria-live` on the toast, an
  `alt` on the profile avatar, and `src=""` after logout. **Still open from this
  item:** the `PanelBox` non-reactive `classObject` (harmless — no caller passes
  `size`), the `SearchBar` duplication in `UsersView`, and `EditProfileView`
  hand-rolling file handling instead of `useFileUpload`. Original text: **TD-31 ·
  Frontend paper cuts.** `SiteTitle.vue:3-4` uses `<a href="/">`
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
- **TD-32 · Auth bootstrap ordering is latently fragile — FIXED 2026-08-20** ✔
  `initStore()` runs in `main.ts` between pinia and the router, so the session
  exists before the first navigation runs the guard. The three hand-written
  `Authorization` assignments are gone, replaced by one axios **request**
  interceptor reading the store — `lib/auth.ts` already owned the response half.
  A Cypress spec pins it: an authenticated hard reload of `/users` must stay on
  `/users`. Honest note — that spec passed before the fix too, since the guard
  queue starts from a resolved promise; it exists so the accident cannot be
  relied on again. Original text: **TD-32 · Auth bootstrap ordering is latently
  fragile.** `main.ts:15-17`
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

Audited 2026-08-19. Most of this table was **fixed on 2026-08-20**, when the
documentation was reset around the app rather than around a case study: the
session logs and the LinkedIn draft were deleted, the README was rewritten to
the standard GitHub shape, and the spec's stale claims were corrected. The rows
below are kept because the *evidence* is still useful — each one records a way
docs and code drifted apart, which is the failure mode to watch for next time.

**Closed 2026-08-19:** DOC-03 (with TD-11 — compose now forwards the variables
its comment promised), DOC-01, DOC-02, **DOC-04**
(the `.gitignore` rule was added, so the claim is now true on every clone rather
than on one machine — see TD-15), DOC-08, and the `CLAUDE.md` half of DOC-06.
The rest of the table is open.

| # | Where | The problem | Fix |
|---|---|---|---|
| DOC-01 ✅ | `CLAUDE.md:9,145` | Still says the demo is roadmap item #1 and points at `shipping-and-launch`. `roadmap.md:12,21` made it item **2, parked**, and the tech-debt work item 1. The skills section landed in `44ebc7d`, the parking in `78c3d97`; CLAUDE.md was never re-synced. | Point at TD-01 / `ci-cd-and-automation` as the active workstream; demo is item 2, parked. |
| DOC-02 ✅ | `CLAUDE.md:157`, `tech-debt.md` TD-09 | Repeats the `PollCard.vue` contrast finding as "real and still open". ✔ It is a false positive (see Corrections). | Restate TD-09 as the `SiteTitle` gradient alone; note the ternary false positive so it is not re-reported. |
| DOC-03 ✅ | `docker-compose.yml:31` | The comment says "set it in .env for anything beyond local development" — but ✔ the `backend` service `environment` block never forwards `DJANGO_SECRET_KEY` (nor `DJANGO_SSL_REDIRECT`). Following the instruction exactly still yields the committed insecure fallback. A comment that lies is worse than none. | Either forward both vars, or say plainly they are deployment-only and not wired into the dev stack. Ties to TD-11. |
| DOC-04 ✅ | `CLAUDE.md:120` | Claims `.claude/settings.local.json` "is gitignored, so the marketplace reference never reaches the public repo". ✔ It is ignored **only** by the machine-level `~/.config/git/ignore`; this repo's `.gitignore` has no `.claude/` rule. The guarantee holds on one Mac. | Add the rule to `.gitignore`, then the sentence becomes true. |
| DOC-05 ✅ | `mvp-spec.md:108-110` | §8 lists four account endpoints; `account/urls.py:11-14` routes **four more** that are live and auth-only: `POST /editprofile/`, `POST /editpassword/`, `GET /list/?q=`, `GET /:id/`. Nothing in the doc set tells an agent they exist. | Add them to the "Existing (keep)" block; amend `:128` to note the users list moved to `GET` but kept the `/list/` path. |
| DOC-06 ✅ | `README.md:58-61`, `CLAUDE.md:60-70` | The quality-gate block cannot be run as written — line 2 `cd frontend` executes from inside `backend/`. It also omits the venv activation, and `"test:unit": "vitest"` is watch mode in a TTY, so the `&&` chain never reaches `lint`/`build`. Compounded by TD-10: the documented pytest invocation does not run at all. | Subshells `(cd backend && …)`, add the venv step, and either add a `test:unit:run` script or document `-- run`. |
| DOC-07 ✅ | `README.md:37`, `mvp-spec.md:132` | "Vue Testing Library" — the dependency is `@vue/test-utils` and every spec imports `mount` from it. No `@testing-library/*` anywhere. | "Vue Test Utils". |
| DOC-08 ✅ | `CLAUDE.md:37` | Says `Category` lives in `Report.ts`; it is in its own `Category.ts`, imported by `Report.ts:1`. | `Report`/`ReportPin`/`ReportStatus` in `Report.ts`, `Category` in `Category.ts`. |
| DOC-09 ✅ | `mvp-spec.md` | Four stale claims: `:82` names `CityMap.vue` (deleted in M2 — it is `ReportsMap.vue`); `:150` names `python manage.py test` as an M0 exit gate (runs zero tests); `:70` promises "minimum coverage gates defined in §9" that `:132` explicitly declines to define and no tool computes; `:134` describes `@typescript-eslint` **strict** rules when `eslint.config.ts:23` uses `recommended` and never mentions that oxlint runs first. `:93` also names `display_name`/`created_at` where the model has `name`/`date_joined`. | Five line edits. |
| DOC-10 ✅ | `.env.example`, `frontend/.env.example` | `VITE_API_BASE_URL` is read by `docker-compose.yml:43` from the root `.env`, but the root `.env.example` — which claims at line 1 to cover what compose uses — never lists it. Otherwise env-var documentation is complete in both directions. | Add a commented entry noting the compose service consumes it. |

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

## Added later

Items found after the two audit passes, kept in the same register so there is
one place to look.

### TD-33 · The lint policy is whatever ruff's defaults happen to be — **FIXED 2026-09-05** ✔

> `backend/pyproject.toml` now carries `[tool.ruff.lint] select = ["E4", "E7",
> "E9", "F"]` — ruff 0.15's defaults, written down. **Proved to be a no-op
> rather than asserted:** `ruff check --show-settings` lists the same 59 rule
> codes before and after the change, and the same 59 again under 0.16.6, where
> the register predicted 81 new findings. The bump that used to be a policy
> change is a dependency change now.
>
> Widening the set stays a separate, deliberate edit: adopting import sorting
> (`I`) or the `RUF` family is a lint sweep with an opinion in it, and the
> RUF012 question about Django `Meta` classes never comes up until someone
> selects `RUF` on purpose.
>
> **The same lesson arrived from the frontend on the same day.** `oxlint`'s
> config selects `categories: { correctness: "error" }`, so 1.81 brought 20 new
> findings with it. Thirteen were `vitest/require-mock-type-parameters`
> (`vi.fn()` without a type parameter — an opinion, now `off` with the reason
> in the config), and **seven were the vitest plugin reading the Cypress specs**,
> where `expect(x).to.equal(y)` is Chai and every one of them was reported as
> an "unknown modifier". That second group was a real config bug the bump
> exposed: vitest's rules now apply to `src/**/__tests__/**` and nowhere else,
> which was verified by re-enabling the disabled rule against the scoped config
> and watching the 13 findings come back.

`pyproject.toml` sets `line-length = 100` and nothing else, so the rule set is
ruff's default — which means **a version bump silently redefines what "clean"
means**. Upgrading 0.15.22 → 0.16.5 produces 81 findings on unchanged code
(42 × RUF012 `mutable-class-default` on Django/DRF `Meta` classes, 36 ×
import sorting, and 3 others). None of them is a bug; all of them would have to
be answered before CI could go green again.

**Fix:** pin the rule set explicitly (`[tool.ruff.lint] select = [...]`,
plus a `RUF012` decision for Django `Meta` classes), so upgrading ruff becomes
a dependency change again rather than a policy change wearing its clothes.
Then take 0.16 as its own PR, with the import sort as its own commit.

**Found:** 2026-08-30, doing TD-06's backend minors.


### TD-34 · `EMAIL_BACKEND` is deprecated and goes away in Django 7.0

Django 6.1 warns: *"The EMAIL_BACKEND setting is deprecated. Migrate to MAILERS
before Django 7.0."* It is the setting C1's invite and password-reset e-mail
runs on, and `settings.py` gates it three ways (locmem under pytest, console in
dev, real SMTP otherwise) — so the migration is a settings-shape change that
also touches `.env.example` and `docs/deploy.md`.

**Done 2026-08-30**, with the first slice of roadmap item 3 — which is where it
said it belonged. `settings.py` now defines `MAILERS` with the same
`TESTING`/`DEBUG` gating, and the environment variables keep their names so a
deployment's configuration does not move. The migration is all-or-nothing by
Django's design: with `MAILERS` defined it *raises* on a leftover `EMAIL_*`
setting rather than ignoring it, which is a good failure mode and worth knowing
before someone re-adds one. The suite no longer emits the warning.

> Original text: **Not urgent** (Django 7.0 is not out) and **not free** (it
> moves the same configuration the deploy work has to design anyway), so it
> belongs with the SMTP prerequisite in [roadmap](./roadmap.md) item 3 rather
> than in a dependency bump.

**Found:** 2026-08-30, by the Django 6.1 upgrade — which is the argument for
doing minors regularly: a deprecation you meet at 6.1 is a warning, the same
one met at 7.0 is an outage.

---

## Suggested order

1. ~~**TD-01 (CI)**~~ — **done 2026-08-19.** TD-16 was the proof of why: a red
   spec sat unnoticed for a month. Everything below is now watched automatically.
2. ~~**TD-11**~~ — **done 2026-08-19**, along with TD-15 and DOC-03. The
   deploy-blocking configuration items are now closed.
3. ~~**TD-16, TD-17, TD-22**~~ — **done 2026-08-19**, and Cypress joined CI with
   them.
4. ~~**TD-12 + TD-13 + TD-26**~~ — **done 2026-08-19** as one change, and TD-13's
   severity corrected downward in the process.
5. ~~**TD-14**, then **TD-18**~~ — **done 2026-08-19.**
6. **TD-03** — 10 minutes, makes `npm audit` readable.
7. **TD-19**, **TD-20** — the counter, then the logout gaps.
8. ~~**TD-05 + TD-23**~~ — **done 2026-08-19.** Then **TD-06** (bumps, now
   watched by CI and by a 3-second suite).
9. ~~**TD-02**~~ — **done 2026-08-27**, at the head of phase C5 and with the
   browser verification it always needed.
10. **TD-21**, **TD-25**, **TD-27**, **TD-28**, then the documentation table.
11. P3 whenever they are in the way.

The DOC-* items are cheap enough to fold into whichever session touches the same
file — except **DOC-01, DOC-02 and DOC-04**, which actively mislead an agent and
should go in with step 2.
### TD-35 · Two files have been prettier-unclean since 2026-08-30 — **FIXED 2026-09-08** ✔

> `PollForm.vue` and `ReportForm.vue` came out of the design pass (#34, the
> `FormInput` margin move) not matching prettier, so `npx prettier --check .`
> in `frontend/` has failed ever since — a gate that is red for a known reason
> teaches everyone to ignore it, which is how the next real finding gets
> ignored too. It was left alone at the time on purpose: a formatting sweep
> goes in its own commit, never mixed into a feature diff (CLAUDE.md), and
> every PR since would have carried it. This is that commit.
### TD-36 · Plain-text card fields are stored with CRLF line endings

> Found by writing a real recipe (2026-09-08). A `<textarea>`'s submitted value
> is normalised to `\r\n` by the browser, per the HTML spec, so `ingredients`,
> `procedure` and `programme` are stored with carriage returns the author never
> typed. **Nothing is visibly wrong** — `white-space: pre-line` renders them as
> one break — which is why it is a small item rather than a bug: it costs
> nothing today and it is the sort of thing that turns up later as a diff that
> will not settle, or a line count that is off by the number of lines.
>
> The fix is one normalisation on the way in, at the same chokepoint the fields
> already pass through, plus a test. The reason to do it at all is that stored
> text is the one thing in this app that outlives every rewrite of the code
> around it.
### TD-37 · The e2e job spends eight of its nine minutes on setup

> Observed 2026-09-04, not measured further. The Cypress run itself takes ~40
> seconds; the job takes **9m21s**, against 1m10s for the frontend job and 26s
> for the backend. The difference is setup — Python, backend dependencies,
> Node, the Cypress binary, and a production build — not the specs, so adding
> specs is close to free and speeding the job up means caching or reordering
> that setup.
>
> Left alone deliberately: nothing waits on it, and a CI change made for
> tidiness is a change to the one thing that guards every other change. Worth
> doing if it ever becomes the reason somebody skips running the suite.


