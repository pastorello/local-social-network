# ADR-0003: Uploads go to the local filesystem, and are not served in production

## Status

Accepted for now — revisit before anything is hosted publicly.

## Date

2026-08-19

## Context

Report photos and avatars are written to `MEDIA_ROOT` on local disk. URLs are
mounted with `django.conf.urls.static.static()`, which is a **documented no-op
when `DEBUG` is false** — so on a real deployment every photo and avatar would
return 404 today.

Uploads are re-encoded through `common/images.py`, which strips EXIF and rebuilds
the stored filename's extension from the format Pillow actually decoded. That
last part matters here: Django's own `validate_image_file_extension` accepts all
~70 extensions Pillow knows, and roughly 43 of them are not `image/*` to
`mimetypes` (`.pdf`, `.eps`, `.ps`, `.mpeg`). Media is served with a
Content-Type guessed from the extension, so the normalisation is what prevents
content-type confusion.

## Decision

Keep local-filesystem storage. Do not wire up production media serving until
hosting is actually being designed.

## Alternatives considered

**S3-compatible object storage now.** The right end state, and it also solves
the ephemeral-disk problem on PaaS free tiers. Premature while no host has been
chosen: the choice of provider changes the configuration.

**Serve media through whitenoise or an explicit `re_path` now.** Two lines, and
it would make photos work in production — but it puts attacker-influenced files
on the API origin, where the Django admin session cookie lives. Doing it without
deciding *how* is the risk.

## Consequences

- **Photos are broken on any deployment made today.** This is the first thing to
  fix when hosting starts, and it is why `docs/roadmap.md` puts "decide what
  publishable means" before "deploy".
- Ephemeral disks on free PaaS tiers lose uploads on every redeploy. A
  persistent volume or object storage is a prerequisite, not a nice-to-have.
- When media is served for real, prefer a cookieless origin, or
  `Content-Disposition: attachment` for anything not on the image allowlist.
