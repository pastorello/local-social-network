"""Serving user-uploaded media in production (ADR-0007).

`MEDIA_URL` used to be mounted with `django.conf.urls.static.static()`, which
is a documented no-op when `DEBUG` is false: every photo, card cover and
overlay raster 404s on a real deployment no matter where the bytes live. This
is the view that serves them instead, on any host, with no object storage and
no web server in front.

Three things it does that a plain file server would not:

* **An allowlist by extension, not a guess.** Only the three types
  `common/images.py` can produce are served, and the `Content-Type` comes from
  that table rather than from `mimetypes` guessing at the filename. Anything
  else is a 404 — including a file some future code path writes here without
  going through the image pipeline.
* **`X-Content-Type-Options: nosniff`**, so a browser cannot decide for itself
  that a JPEG is really HTML.
* **A sandboxing CSP**, so that even if something did render, it can load
  nothing and run nothing.

Together these are what make it acceptable to serve uploads from the API
origin, where the Django admin session cookie lives — the risk ADR-0003 named
when it declined to wire this up blind.
"""

from pathlib import Path

from django.conf import settings
from django.core.exceptions import SuspiciousFileOperation
from django.http import FileResponse, Http404
from django.utils._os import safe_join

# Exactly the formats common/images.py re-encodes to (TD-13 rebuilds the stored
# extension from the format Pillow actually decoded, so these are the only
# suffixes a file written by the app can have).
SERVED_TYPES = {
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
}


def serve_media(request, path):
    try:
        # Raises rather than escaping MEDIA_ROOT: '../../etc/passwd' and
        # absolute paths both land here.
        full_path = Path(safe_join(settings.MEDIA_ROOT, path))
    except SuspiciousFileOperation as exc:
        raise Http404 from exc

    content_type = SERVED_TYPES.get(full_path.suffix.lower())
    if content_type is None or not full_path.is_file():
        raise Http404

    response = FileResponse(full_path.open('rb'), content_type=content_type)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Content-Security-Policy'] = "default-src 'none'; sandbox"
    # Uploads are immutable in practice — a new image gets a new name — but not
    # by guarantee, so an hour rather than a year.
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return response
