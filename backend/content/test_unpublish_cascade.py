"""T8 (spec translations.md, 2026-09-19): an original comes down with its
translations — unpublished or deleted — and going back up is not automatic."""

import pytest

from chiese.models import Chiesa
from content.models import Card

pytestmark = pytest.mark.django_db


def _group(author):
    original = Card.objects.create(title='Duomo', body_html='<p>.</p>', author=author, is_published=True)
    Chiesa.objects.create(card=original)
    translation = Card.objects.create(
        title='Cathedral', body_html='<p>.</p>', author=author, is_published=True,
        language='en', translation_of=original,
    )
    Chiesa.objects.create(card=translation)
    return original, translation


def test_unpublishing_the_original_through_the_api_takes_the_translation_down(make_client, citizen):
    original, translation = _group(citizen)

    response = make_client(citizen).patch(
        f'/api/chiese/{original.pk}/', {'is_published': 'false'}, format='multipart'
    )

    assert response.status_code == 200
    translation.refresh_from_db()
    assert translation.is_published is False
    assert make_client(citizen).get('/api/chiese/').json()['count'] == 0


def test_republishing_the_original_leaves_the_translation_down(citizen):
    original, translation = _group(citizen)
    original.is_published = False
    original.save()

    original.is_published = True
    original.save()

    translation.refresh_from_db()
    assert translation.is_published is False


def test_deleting_the_original_unpublishes_the_translation_rather_than_orphaning_it(citizen):
    original, translation = _group(citizen)

    original.delete()

    translation.refresh_from_db()
    assert translation.translation_of_id is None
    assert translation.is_published is False


def test_a_translation_saved_on_its_own_changes_nothing_else(citizen):
    original, translation = _group(citizen)
    translation.is_published = False
    translation.save()

    original.refresh_from_db()
    assert original.is_published is True
