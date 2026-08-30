# ADR-0007: Media is served by the app, hardened, on any host

## Status

Accepted. Amends [ADR-0003](0003-media-on-local-filesystem.md), which stays as
the record of why this was deferred; its storage decision (local filesystem)
is unchanged.

## Date

2026-08-30

## Context

ADR-0003 left production media serving deliberately unwired: `MEDIA_URL` is
mounted with `django.conf.urls.static.static()`, a documented no-op when
`DEBUG` is false, so every photo, card cover and overlay raster 404s on a real
deployment. Its reasoning was that the provider choice changes the
configuration, and no provider had been chosen.

Two things have changed since.

**The gap got wider.** In 2026-08 the product gained card images (C2), covers
that the mobile home and the lists are built around (design.md D5), and
georeferenced raster overlays (C5). "Photos are broken" used to mean report
photos; it now means most of what a reader sees.

**The host is still unknown, and now known to be unknown.** Asked directly on
2026-08-30, the author's answer was that he has no idea where this will be
deployed and has only Docker locally. Waiting for the provider decision is
therefore not deferring a small configuration step — it is leaving the product
undeployable behind a decision nobody is close to taking.

## Decision

**Serve media from the Django app, through one view, in every environment.**

`common/media.py::serve_media` serves `MEDIA_ROOT` with three properties that a
plain file server would not have:

1. **An allowlist by extension**, and the `Content-Type` comes from that table
   — never from `mimetypes` guessing at a filename. Only `.jpg`, `.png` and
   `.webp` are served: exactly what `common/images.py` re-encodes uploads to.
   Anything else is a 404, including a file some future code path writes into
   `MEDIA_ROOT` without going through the image pipeline.
2. **`X-Content-Type-Options: nosniff`**, so a browser cannot decide for itself
   that a JPEG is really HTML.
3. **`Content-Security-Policy: default-src 'none'; sandbox`**, so that even if
   something did render, it can load nothing and run nothing.

It is mounted in **every** environment, not only when `DEBUG` is false, so that
development exercises the code production runs. The old helper silently doing
nothing outside `DEBUG` is precisely how this defect survived unnoticed.

## Alternatives considered

**Object storage (S3-compatible) now.** Still the right end state at scale, and
it solves ephemeral disks on PaaS free tiers. It requires choosing a provider,
adding `django-storages` plus credentials, and it is the thing this ADR
un-blocks rather than replaces: moving to it later changes a storage backend,
not this view.

**WhiteNoise.** It already serves the Django admin's static files, so it looks
like the free option. It is not: WhiteNoise **indexes files at startup** and
`autorefresh` defaults to `False` — verified in the installed version, not
assumed. A photo uploaded after the process booted would 404 until the next
restart. It is built for immutable build artifacts, and user uploads are
neither immutable nor present at boot.

**`django.views.static.serve`.** Django's own docs say to use it in
development only. It also guesses the `Content-Type` with `mimetypes`, which is
the specific behaviour TD-13 spent effort defusing on the write path — no
reason to reintroduce it on the read path.

**A cookieless second origin**, as ADR-0003 suggested. Genuinely stronger, and
it needs a second hostname and a host that can serve it. Available later
without changing this view: point the second origin at the same files and set
`WEBSITE_URL`. The hardening above is what makes the single-origin arrangement
acceptable in the meantime.

## Consequences

- **Photos work on a deployment now.** A persistent disk (or object storage) is
  still required so uploads survive a redeploy — that part of ADR-0003 stands
  unchanged. What is fixed is that a disk is now *sufficient*, where before it
  was not even necessary-and-sufficient: nothing was serving the files.
- **Uploads sit on the API origin**, where the Django admin session cookie
  lives. That is the risk ADR-0003 named, and the three properties above are
  the answer to it. If a cookieless origin becomes available, take it.
- Serving files through Python is slower than through a web server or CDN. At
  this product's scale that is irrelevant; if it stops being irrelevant, a CDN
  in front changes nothing about this code.
- **The allowlist is a constraint on future features**, deliberately. A card
  type wanting PDFs or audio has to widen `SERVED_TYPES` *and* answer how the
  upload pipeline validates them — which is the conversation that should happen
  rather than a silent `mimetypes` guess.
