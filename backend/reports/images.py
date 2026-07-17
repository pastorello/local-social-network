from io import BytesIO

from PIL import Image, ImageOps
from django.core.files.base import ContentFile

# Spec F2.2 + N6: one photo, ≤ 5 MB, jpg/png/webp, EXIF (incl. GPS) stripped.
MAX_PHOTO_BYTES = 5 * 1024 * 1024
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP'}


def strip_exif(uploaded_file):
    """Re-encode an uploaded image without its EXIF metadata.

    Applies the EXIF orientation before dropping it so photos don't end up
    rotated. Returns a new ContentFile, or raises ValueError when the file
    is not one of the allowed image formats.
    """
    try:
        image = Image.open(uploaded_file)
        image_format = image.format
        image.load()
    except OSError as exc:
        raise ValueError('unreadable image') from exc

    if image_format not in ALLOWED_FORMATS:
        raise ValueError('unsupported format')

    image = ImageOps.exif_transpose(image)

    buffer = BytesIO()
    if image_format == 'JPEG':
        image.save(buffer, format='JPEG', quality=90)
    else:
        image.save(buffer, format=image_format)

    return ContentFile(buffer.getvalue(), name=uploaded_file.name)
