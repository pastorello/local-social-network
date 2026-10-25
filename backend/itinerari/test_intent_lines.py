"""The intents' lines rewritten (itinerari/migrations/0011, review PR-19b,
decided by the author on 2026-10-25): a line still holding its seed is
rewritten in Italian and gets its English; one the author corrected in the
admin keeps his words, and gets no English written against words he did not
write — and the reverse leaves it alone too."""

import importlib

import pytest
from django.apps import apps

from itinerari.models import Intent

pytestmark = pytest.mark.django_db

rewritten = importlib.import_module('itinerari.migrations.0011_intent_lines_rewritten')

CORRECTED = 'Le spiagge di Gaeta, come le racconta l’autore'


def _as_seeded():
    """The table as 0007 left it, with 0010's empty column."""
    for slug, (seeded, _, _) in rewritten.LINES.items():
        Intent.objects.filter(slug=slug).update(description=seeded, description_en='')


def _lines():
    return {i.slug: (i.description, i.description_en) for i in Intent.objects.all()}


def test_the_database_holds_the_rewritten_lines_in_both_languages():
    assert _lines() == {
        slug: (italian, english) for slug, (_, italian, english) in rewritten.LINES.items()
    }


def test_every_line_says_the_tours_and_what_else_is_behind_the_answer():
    # The author's ask: an intent leads to tours *and* to places and
    # businesses, so no line names only one of them any more.
    for slug, (_, italian, english) in rewritten.LINES.items():
        assert 'itinerari' in italian, slug
        assert 'tours' in english, slug
        assert not italian.startswith('Itinerari'), slug
        # Two lines on a 375 px phone (measured, 66 characters fit; the
        # migration says why): the home's first answer stays on screen.
        assert len(italian) <= 66 and len(english) <= 66, slug


def test_a_line_the_author_corrected_keeps_his_words_and_gets_no_english():
    _as_seeded()
    Intent.objects.filter(slug='mare').update(description=CORRECTED)

    rewritten.rewrite(apps, None)

    lines = _lines()
    assert lines['mare'] == (CORRECTED, '')
    for slug, (_, italian, english) in rewritten.LINES.items():
        if slug != 'mare':
            assert lines[slug] == (italian, english), slug


def test_an_english_the_author_wrote_already_is_kept():
    _as_seeded()
    Intent.objects.filter(slug='bere').update(description_en='Drinks by the harbour')

    rewritten.rewrite(apps, None)

    assert _lines()['bere'][1] == 'Drinks by the harbour'


def test_the_reverse_restores_the_seeds_and_leaves_corrections_alone():
    Intent.objects.filter(slug='mare').update(description=CORRECTED, description_en='')

    rewritten.restore(apps, None)

    lines = _lines()
    assert lines['mare'] == (CORRECTED, '')
    for slug, (seeded, _, _) in rewritten.LINES.items():
        if slug != 'mare':
            assert lines[slug] == (seeded, ''), slug
