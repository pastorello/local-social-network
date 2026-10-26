"""The intents' lines rewritten (itinerari/migrations/0011, review PR-19b,
decided by the author on 2026-10-25): a line still holding its seed is
rewritten in Italian and gets its English; one the author corrected in the
admin keeps his words, and gets no English written against words he did not
write — and the reverse leaves it alone too. And «Bere» without its tours
(0012, decided on 2026-10-26): no tour stops at a business. And «Camminare»
folded into «Scoprire la città» (0013, the same day), its tours with it."""

import importlib

import pytest
from django.apps import apps

from content.models import Card
from itinerari.models import Intent, Itinerario

pytestmark = pytest.mark.django_db

rewritten = importlib.import_module('itinerari.migrations.0011_intent_lines_rewritten')
bere = importlib.import_module('itinerari.migrations.0012_bere_line_without_tours')
town = importlib.import_module('itinerari.migrations.0013_camminare_joins_citta')

# The intents 0011 wrote lines for that are still in the table: «Camminare»
# went with 0013.
ALIVE = {slug: line for slug, line in rewritten.LINES.items() if slug != town.WALK}

CORRECTED = 'Le spiagge di Gaeta, come le racconta l’autore'


def _as_seeded():
    """The table as 0007 left it, with 0010's empty column."""
    for slug, (seeded, _, _) in rewritten.LINES.items():
        Intent.objects.filter(slug=slug).update(description=seeded, description_en='')


def _lines():
    return {i.slug: (i.description, i.description_en) for i in Intent.objects.all()}


def test_the_database_holds_the_rewritten_lines_in_both_languages():
    assert _lines() == {
        slug: (italian, english) for slug, (_, italian, english) in ALIVE.items()
    } | {'bere': bere.AFTER, 'citta': town.TOWN_AFTER}


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
    for slug, (_, italian, english) in ALIVE.items():
        if slug != 'mare':
            assert lines[slug] == (italian, english), slug


def test_an_english_the_author_wrote_already_is_kept():
    _as_seeded()
    Intent.objects.filter(slug='bere').update(description_en='Drinks by the harbour')

    rewritten.rewrite(apps, None)

    assert _lines()['bere'][1] == 'Drinks by the harbour'


def test_the_reverse_restores_the_seeds_and_leaves_corrections_alone():
    Intent.objects.filter(slug='mare').update(description=CORRECTED, description_en='')

    # Backwards in order, as `migrate itinerari 0010` would: 0013 brings
    # «Camminare» back, then 0012, then 0011.
    town.unfold(apps, None)
    bere.restore(apps, None)
    rewritten.restore(apps, None)

    lines = _lines()
    assert lines['mare'] == (CORRECTED, '')
    for slug, (seeded, _, _) in rewritten.LINES.items():
        if slug != 'mare':
            assert lines[slug] == (seeded, ''), slug


def test_bere_says_no_tours_and_fits_two_lines():
    # 0012 starts from exactly what 0011 wrote, and ends on the places alone.
    assert bere.BEFORE == rewritten.LINES['bere'][1:]
    italian, english = bere.AFTER
    assert 'itinerari' not in italian and 'tours' not in english
    assert len(italian) <= 66 and len(english) <= 66


def test_bere_changes_a_language_only_while_it_holds_0011s_words():
    Intent.objects.filter(slug='bere').update(
        description=bere.BEFORE[0], description_en='Drinks by the harbour'
    )

    bere.rewrite(apps, None)

    assert _lines()['bere'] == (bere.AFTER[0], 'Drinks by the harbour')


def test_bere_goes_back_to_0011s_words_and_leaves_a_correction_alone():
    Intent.objects.filter(slug='bere').update(description=CORRECTED)

    bere.restore(apps, None)

    assert _lines()['bere'] == (CORRECTED, bere.BEFORE[1])


def _tour(user, title):
    card = Card.objects.create(title=title, body_html='', author=user, is_published=True)
    return Itinerario.objects.create(card=card)


def test_camminare_folds_into_the_town_and_its_tours_go_with_it(citizen):
    town.unfold(apps, None)
    walk = _tour(citizen, 'Il giro dei belvederi')
    walk.intents.set(Intent.objects.filter(slug=town.WALK))

    town.fold(apps, None)

    assert not Intent.objects.filter(slug=town.WALK).exists()
    assert list(walk.intents.values_list('slug', flat=True)) == [town.TOWN]
    assert _lines()[town.TOWN] == town.TOWN_AFTER


def test_the_town_line_names_the_walk_and_fits_two_lines():
    # 0013 starts from exactly what 0011 wrote, and so does its way back.
    assert town.TOWN_BEFORE == rewritten.LINES[town.TOWN][1:]
    assert town.WALK_AS_SEEDED['description'] == rewritten.LINES[town.WALK][1]
    assert town.WALK_AS_SEEDED['description_en'] == rewritten.LINES[town.WALK][2]
    italian, english = town.TOWN_AFTER
    assert 'belvederi' in italian and 'viewpoints' in english
    assert len(italian) <= 66 and len(english) <= 66


def test_the_town_line_a_correction_keeps_while_camminare_goes():
    town.unfold(apps, None)
    Intent.objects.filter(slug=town.TOWN).update(description=CORRECTED)

    town.fold(apps, None)

    assert _lines()[town.TOWN] == (CORRECTED, town.TOWN_AFTER[1])
    assert not Intent.objects.filter(slug=town.WALK).exists()


def test_camminare_comes_back_as_it_was_seeded():
    town.unfold(apps, None)

    walk = Intent.objects.get(slug=town.WALK)
    assert (walk.name, walk.name_en, walk.position) == ('Camminare', 'Walking', 3)
    assert _lines()[town.TOWN] == town.TOWN_BEFORE
