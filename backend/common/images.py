"""Shared hardening for user-uploaded images.

Both upload paths go through `validate_image`: report photos (spec F2.2, N6) and
profile avatars. It lives here rather than in `reports` so that `account` does
not have to import from a sibling domain app (TD-12).

Three things it guarantees, each one a finding in docs/tech-debt.md:

* **TD-12** — every path gets the same byte cap, format allowlist and EXIF
  strip. Avatars are served publicly through `GET /api/reports/` →
  `author.avatarURL`, so an un-stripped avatar publishes the uploader's GPS.
* **TD-13** — the stored filename's extension is derived from the format Pillow
  actually detected, never from the client-supplied name. Django serves media
  with a Content-Type guessed from the extension, so a `.html` that survived
  here would execute as script on the API origin.
* **TD-26** — the pixel budget is checked from the header, before `load()`
  allocates anything, and Pillow's own bomb error is caught (it is not an
  `OSError`, so the original handler let it through as a 500).
"""

import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps
from django.core.files.base import ContentFile

# Spec F2.2 + N6: one photo, ≤ 5 MB, jpg/png/webp, EXIF (incl. GPS) stripped.
MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP'}

# The stored extension is chosen from this map, never taken from the upload.
FORMAT_EXTENSIONS = {'JPEG': '.jpg', 'PNG': '.png', 'WEBP': '.webp'}

# Well under Pillow's own ~89 Mpx default: a 40 Mpx RGB image already costs
# ~120 MB to decode, plus a re-encode buffer on top.
MAX_PIXELS = 40_000_000

UNSUPPORTED = 'Formato immagine non supportato: usa JPG, PNG o WebP.'
TOO_LARGE = 'Il file non può superare i 5 MB.'
TOO_MANY_PIXELS = 'Immagine troppo grande: la risoluzione massima è di 40 milioni di pixel.'


class ImageRejected(ValueError):
    """Carries a message ready to show the user (Italian — spec N4).

    Callers translate it into their own framework's validation error: DRF in
    `reports.serializers`, Django forms in `account.forms`.
    """


def safe_filename(original_name, image_format):
    """Build a storage name from the *detected* format (TD-13).

    Directory components go first (`Path.stem`), then anything that is not a
    plain word character — including inner dots, so `payload.html.png` cannot
    keep a second extension.
    """
    stem = Path(original_name or '').stem
    stem = re.sub(r'[^A-Za-z0-9_-]', '_', stem).strip('_.-')[:80]
    return f'{stem or "immagine"}{FORMAT_EXTENSIONS[image_format]}'


def validate_image(uploaded_file):
    """Return a re-encoded, metadata-free copy, or raise `ImageRejected`.

    The result is a fresh `ContentFile`, so callers assign it straight to the
    model field.
    """
    if uploaded_file is None:
        return None

    if uploaded_file.size > MAX_IMAGE_BYTES:
        raise ImageRejected(TOO_LARGE)

    try:
        image = Image.open(uploaded_file)
        image_format = image.format
        # Before load(): between 1x and 2x its limit Pillow only emits a warning
        # and then decodes anyway, so the allocation is ours to prevent.
        if image.width * image.height > MAX_PIXELS:
            raise ImageRejected(TOO_MANY_PIXELS)
        image.load()
    except Image.DecompressionBombError as exc:
        # Not an OSError, so it would otherwise escape as an unhandled 500.
        raise ImageRejected(TOO_MANY_PIXELS) from exc
    except OSError as exc:
        # Covers UnidentifiedImageError (SVG, arbitrary bytes) and truncation.
        raise ImageRejected(UNSUPPORTED) from exc

    if image_format not in ALLOWED_FORMATS:
        raise ImageRejected(UNSUPPORTED)

    # Apply the orientation tag before dropping it, or portrait phone photos
    # come out sideways.
    image = ImageOps.exif_transpose(image)

    buffer = BytesIO()
    if image_format == 'JPEG':
        image.save(buffer, format='JPEG', quality=90)
    else:
        image.save(buffer, format=image_format)

    return ContentFile(buffer.getvalue(), name=safe_filename(uploaded_file.name, image_format))
