"""Serving uploads (ADR-0007).

The negative cases are the point: this view puts user-supplied files on the
same origin as the Django admin session cookie, and what makes that acceptable
is precisely what it refuses to do.
"""

from io import BytesIO

import pytest
from PIL import Image

pytestmark = pytest.mark.django_db


@pytest.fixture
def media_file(settings):
    def _write(name='foto.jpg', fmt='JPEG', raw=None):
        target = settings.MEDIA_ROOT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if raw is not None:
            target.write_bytes(raw)
        else:
            buffer = BytesIO()
            Image.new('RGB', (10, 10), 'red').save(buffer, format=fmt)
            target.write_bytes(buffer.getvalue())
        return target

    return _write


def test_serves_an_uploaded_image(api_client, media_file):
    media_file('foto.jpg')

    response = api_client.get('/media/foto.jpg')

    assert response.status_code == 200
    assert response['Content-Type'] == 'image/jpeg'


def test_says_the_content_type_is_final(api_client, media_file):
    media_file('foto.png', fmt='PNG')

    response = api_client.get('/media/foto.png')

    # Without nosniff a browser may decide a PNG is really something else and
    # render it — on the origin that holds the admin session cookie.
    assert response['X-Content-Type-Options'] == 'nosniff'
    assert 'sandbox' in response['Content-Security-Policy']


def test_the_content_type_comes_from_the_allowlist_not_the_filename(api_client, media_file):
    # A real PNG named .jpg is still served as the type its *extension* is on
    # the allowlist for — never a type guessed from anything the uploader
    # influenced beyond that.
    media_file('camuffato.jpg', fmt='PNG')

    response = api_client.get('/media/camuffato.jpg')

    assert response['Content-Type'] == 'image/jpeg'


def test_refuses_anything_not_on_the_allowlist(api_client, media_file):
    media_file('payload.html', raw=b'<script>alert(1)</script>')

    assert api_client.get('/media/payload.html').status_code == 404


def test_refuses_an_svg(api_client, media_file):
    # SVG is an image and also a script host — common/images.py cannot produce
    # one, so nothing should ever serve one.
    media_file('vector.svg', raw=b'<svg xmlns="http://www.w3.org/2000/svg"></svg>')

    assert api_client.get('/media/vector.svg').status_code == 404


@pytest.mark.parametrize('path', ['../settings.py', '../../etc/passwd', '/etc/passwd'])
def test_refuses_to_walk_out_of_media_root(rf, path):
    # Called directly rather than through the client: a URL like `/media/../x`
    # may never reach the view at all, which would make a 404 through the
    # client prove nothing about the view's own handling.
    from django.http import Http404

    from common.media import serve_media

    with pytest.raises(Http404):
        serve_media(rf.get(f'/media/{path}'), path)


def test_missing_file_is_a_404_not_a_500(api_client):
    assert api_client.get('/media/non-esiste.jpg').status_code == 404
