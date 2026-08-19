"""Unit tests for the shared upload hardening (TD-12, TD-13, TD-26).

These are deliberately unit-level: the same guarantees were previously reachable
only through 0.6s multipart HTTP requests, and two of the three accepted formats
had no coverage at all.
"""

import struct
import zlib
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from common.images import MAX_IMAGE_BYTES, ImageRejected, validate_image


def upload(fmt='JPEG', name='foto.jpg', size=(50, 50), colour='red', exif_orientation=None):
    buffer = BytesIO()
    image = Image.new('RGB', size, colour)
    if exif_orientation is not None:
        exif = Image.Exif()
        exif[274] = exif_orientation
        image.save(buffer, format=fmt, exif=exif.tobytes())
    else:
        image.save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


def png_header_only(width, height):
    """A PNG that declares an enormous canvas without carrying the pixels.

    This is the shape of a decompression bomb: the header is cheap to read, the
    allocation it implies is not.
    """
    def chunk(kind, data):
        return (
            struct.pack('>I', len(data))
            + kind
            + data
            + struct.pack('>I', zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IEND', b'')


def stored_image(result):
    return Image.open(BytesIO(result.read()))


# --- accepted formats: all three, not just JPEG ---

@pytest.mark.parametrize('fmt,name', [('JPEG', 'a.jpg'), ('PNG', 'a.png'), ('WEBP', 'a.webp')])
def test_every_allowed_format_round_trips(fmt, name):
    result = validate_image(upload(fmt=fmt, name=name))

    assert stored_image(result).format == fmt


def test_rejects_a_format_outside_the_allowlist():
    with pytest.raises(ImageRejected):
        validate_image(upload(fmt='GIF', name='animata.gif'))


def test_rejects_a_file_that_is_not_an_image():
    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile('x.jpg', b'not an image at all'))


def test_rejects_a_truncated_image():
    intact = upload(fmt='PNG', name='a.png').read()
    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile('a.png', intact[: len(intact) // 2]))


def test_rejects_an_svg_disguised_as_an_image():
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile('logo.png', svg))


# --- size and pixel budget (TD-26) ---

def test_rejects_a_file_over_the_byte_cap():
    oversized = SimpleUploadedFile('big.png', b'x' * (MAX_IMAGE_BYTES + 1))

    with pytest.raises(ImageRejected):
        validate_image(oversized)


def test_rejects_a_small_file_that_declares_too_many_pixels():
    """The 1x-2x band where Pillow only warns and then allocates anyway."""
    buffer = BytesIO()
    Image.new('1', (7000, 7000)).save(buffer, format='PNG')
    assert buffer.tell() < MAX_IMAGE_BYTES, 'fixture must pass the byte cap first'

    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile('bomb.png', buffer.getvalue()))


def test_rejects_a_header_that_trips_pillows_own_bomb_guard():
    """Above 2x MAX_IMAGE_PIXELS Pillow raises DecompressionBombError, which is
    not an OSError — the original except clause let it through as a 500."""
    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile('bomb.png', png_header_only(30000, 30000)))


# --- EXIF (TD-12) ---

def test_exif_is_stripped():
    result = validate_image(upload(exif_orientation=6))

    assert len(stored_image(result).getexif()) == 0


def test_orientation_is_applied_before_exif_is_dropped():
    """A non-square image proves the rotation actually happened.

    Asserting only that EXIF is empty passes even if exif_transpose is removed,
    which would land every portrait phone photo sideways.
    """
    result = validate_image(upload(size=(60, 40), exif_orientation=6))

    assert stored_image(result).size == (40, 60)


# --- stored filename (TD-13) ---

def test_extension_comes_from_the_detected_format_not_the_client_name():
    result = validate_image(upload(fmt='PNG', name='pwned.html'))

    assert result.name == 'pwned.png'


def test_directory_components_are_dropped_from_the_name():
    result = validate_image(upload(fmt='PNG', name='../../../etc/passwd.png'))

    assert '/' not in result.name
    assert result.name == 'passwd.png'


def test_inner_extensions_cannot_survive():
    result = validate_image(upload(fmt='PNG', name='payload.html.png'))

    assert result.name.count('.') == 1
    assert result.name.endswith('.png')


def test_a_nameless_upload_still_gets_a_name():
    result = validate_image(upload(fmt='PNG', name='.png'))

    assert result.name.endswith('.png')
    assert len(result.name) > len('.png')
