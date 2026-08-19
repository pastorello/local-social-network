# 2026-08-19 — TD-12 / TD-13 / TD-26: upload hardening

|                   |                                                       |
| ----------------- | ----------------------------------------------------- |
| **Milestone**     | Post-MVP (tech debt: TD-12, TD-13, TD-26)             |
| **Spec sections** | F2.2 (one photo ≤5MB), N6 (strip EXIF/GPS), §9        |
| **Model / tool**  | Claude Code — Opus 5                                  |
| **Duration**      | ~1h                                                   |
| **Commits**       | (this session)                                        |

## 1. Goal

Close the three upload findings as **one** change, as the register insists: they
share a code path, and half-fixing them is worse than leaving them alone.

## 2. Plan prompt

> vai con TD-12, TD-13 e TD-26 insieme

## 3. What the AI produced

**A shared module.** `reports/images.py` → `common/images.py`, a plain package
rather than a Django app (no models, so nothing to install). This removes the
`account → reports` import the register called awkward, and gives both upload
paths one entry point, `validate_image`.

**TD-12 — avatars.** `ProfileForm.clean_avatar` now runs the same byte cap,
format allowlist and EXIF strip as report photos. It returns early when the
field arrives as the stored `FieldFile` instead of a new upload, so an ordinary
profile save no longer re-encodes an unchanged avatar — a bug that would have
been easy to ship with this fix.

**TD-26 — decompression bombs.** The pixel budget (40 Mpx) is checked from the
header, *before* `load()` allocates, and `Image.DecompressionBombError` is caught
separately: it is not an `OSError`, so the original handler let it escape as a
500.

**TD-13 — and the finding was overstated.** See §4; the fix landed, the write-up
did not survive contact with the code.

**Tests: 25 new, 85 → 110.** 16 unit tests in `common/tests.py` — the guarantees
were previously reachable only through 0.6s multipart HTTP requests, and two of
the three accepted formats (PNG, WEBP) had no coverage at all. Plus six
end-to-end avatar tests and three on the reports path.

**Verified by mutation, not by assertion count.** Three deliberate breakages,
each caught: reverting to the client-supplied filename fails 4 tests; deleting
`ImageOps.exif_transpose` fails 3; disabling the pixel check fails 1 (the
header-bomb test still passes, correctly — it covers Pillow's own guard). The
old EXIF test could not do this: it asserted only that the stored metadata was
empty, which stays true with the rotation removed, so every portrait phone photo
would have landed sideways with a green suite.

**Files:** `common/` (new: `__init__.py`, `images.py`, `tests.py`),
`reports/images.py` (deleted), `reports/serializers.py`, `reports/tests.py`,
`account/forms.py`, `account/tests.py`, `CLAUDE.md`, `docs/tech-debt.md`,
`docs/roadmap.md`, this log + index row.

## 4. Author review

The section that matters. Written by hand, after reading the diff.

**Verified**
- …

**Wrong or overstated by the AI** *(pre-filled by the AI this time — the error
was in a previous session's own output, and it is recorded here rather than
quietly patched)*
- **TD-13 was written up as stored XSS and it is not.** The audit claimed:
  upload `pwned.html`, have Django serve it as `text/html`, run script on the
  API origin where the admin session lives. That attack does not work.
  `django.forms.ImageField` carries `validate_image_file_extension` in
  `default_validators`, and it applies on **both** paths — through `ModelForm`
  for avatars and through DRF's `ImageField` for report photos. The upload 400s.
  I found this only because the end-to-end test I wrote to *prove* the exploit
  failed to reproduce it.
- What is genuinely exploitable is narrower: that validator accepts every
  extension Pillow knows — **70** — and ~43 of them are not `image/*` to
  `mimetypes`: `.pdf` → `application/pdf`, `.eps`/`.ps` → `application/postscript`,
  `.mpeg` → `video/mpeg`. A valid PNG named `payload.pdf` passed and was served
  as `application/pdf`. Content-type confusion in a format browsers render
  inline with a scripting engine — real, worth fixing, but **Medium, not High**.
  The register has been corrected in place rather than silently updated.
- Lesson for the register's other unverified entries: the security agent's
  finding was plausible, internally consistent, and wrong about the mechanism.
  It was marked ✔ for *the code it quoted*, not for the exploit chain it
  inferred.

**Changed by hand**
- …

**Decisions taken (and why)**
- `common/` as a plain package rather than a Django app: it holds no models and
  needs no `INSTALLED_APPS` entry, so an app would be ceremony.
- The size-limit message changed from "La foto non può superare i 5 MB." to
  "Il file non può superare i 5 MB." — one string now serves both fields, and
  the field label already supplies the context. No test asserted on the old copy.
- **Not done here:** serving media in production. `static()` is a no-op with
  `DEBUG=false`, so photos 404 on a deployment while `docs/deploy.md` says
  otherwise. That is now unblocked — the extension normalisation was the
  prerequisite — but it is a deploy design decision (cookieless origin vs
  `Content-Disposition`), and deployment is parked.

**Rejected suggestions**
- …

## 5. Outcome

- [x] pytest **110 passed** (85 + 25), ruff clean
- [x] Vitest 32 passed, oxlint + eslint clean, `npm run build` green
- [x] Each fix mutation-tested: break it, watch a named test fail, restore
- [x] TD-13's severity corrected in the register with the measurement behind it

**Follow-ups / debt introduced:** none introduced. Next: **TD-14** (anonymous 500
with a traceback on a public endpoint) and **TD-18** (no rate limiting), then the
three small tests that close TD-16, TD-17 and TD-22 — after which Cypress can
join CI.
