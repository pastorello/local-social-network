"""`has_en` (review PR-19b, translations.md T10): whether a card has a
published English version — the «EN» an English reader's lists mark it with,
on every type's list, on the map's features and on a feast's edition among the
events. Only a published translation counts, and a draft never does, not even
for the author who is writing it: the mark is a promise to every reader."""

from datetime import timedelta

import pytest

from common.when import tourist_day
from content.models import Card, MapFeature
from feste.models import Edizione

from .test_mine import TYPES

pytestmark = pytest.mark.django_db


@pytest.fixture
def make_original(citizen):
    def _make(type_key, title='Scheda'):
        card = Card.objects.create(
            title=title, body_html='<p>Testo.</p>', author=citizen, is_published=True,
        )
        TYPES[type_key](card)
        return card
    return _make


def _translate(original, is_published):
    card = Card.objects.create(
        title='Card', body_html='<p>Text.</p>', author=original.author,
        is_published=is_published, translation_of=original, language='en',
    )
    TYPES[next(key for key in TYPES if hasattr(original, key))](card)
    return card


def _pin(card):
    MapFeature.objects.create(card=card, kind=MapFeature.POINT, position=0, lat=41.21, lng=13.57)


def _listed(client, type_key, card):
    rows = client.get(f'/api/{type_key}/').json()['results']
    return next(row for row in rows if row['id'] == str(card.pk))


@pytest.mark.parametrize('type_key', list(TYPES))
def test_every_type_list_marks_only_a_published_english_version(
    type_key, api_client, make_client, citizen, make_original,
):
    original = make_original(type_key)
    author = make_client(citizen)
    assert _listed(api_client, type_key, original)['has_en'] is False

    draft = _translate(original, is_published=False)
    # A draft is not a translation a reader can open: not for a stranger, and
    # not for its own author, who sees it in `translations` instead.
    assert _listed(api_client, type_key, original)['has_en'] is False
    assert _listed(author, type_key, original)['has_en'] is False
    assert [t['id'] for t in _listed(author, type_key, original)['translations']] == [str(draft.pk)]

    draft.is_published = True
    draft.save()
    assert _listed(api_client, type_key, original)['has_en'] is True
    # The card's own page says it too, and so does the translation's.
    assert api_client.get(f'/api/{type_key}/{original.pk}/').json()['has_en'] is True
    assert api_client.get(f'/api/{type_key}/{draft.pk}/').json()['has_en'] is True


def test_a_translation_into_another_language_is_not_english(api_client, make_original):
    original = make_original('chiese')
    other = _translate(original, is_published=True)
    other.language = 'de'
    other.save()

    assert _listed(api_client, 'chiese', original)['has_en'] is False


def test_unpublishing_the_original_takes_the_mark_away(admin, make_client, make_original):
    # T8: the translation comes down with its original, and so does its «EN»
    # — for an admin too, who still sees the original as a draft.
    original = make_original('chiese')
    _pin(original)
    _translate(original, is_published=True)
    original.is_published = False
    original.save()

    features = make_client(admin).get('/api/map/features/').json()
    assert [(f['id'], f['has_en']) for f in features] == [(str(original.pk), False)]


def test_the_map_features_mark_a_published_english_version_only(
    api_client, make_client, citizen, make_original,
):
    with_english = make_original('chiese', 'Con traduzione')
    with_draft = make_original('luoghi', 'Con bozza')
    without = make_original('attivita', 'Senza')
    for card in (with_english, with_draft, without):
        _pin(card)
    _translate(with_english, is_published=True)
    _translate(with_draft, is_published=False)

    for client in (api_client, make_client(citizen)):
        marks = {f['title']: f['has_en'] for f in client.get('/api/map/features/').json()}
        assert marks == {'Con traduzione': True, 'Con bozza': False, 'Senza': False}


def test_a_feasts_edition_among_the_events_carries_its_cards_mark(api_client, make_original):
    festa = make_original('feste', 'Festa di Sant’Erasmo')
    day = tourist_day() + timedelta(days=3)
    Edizione.objects.create(festa=festa.feste, start_date=day, end_date=day)

    def edition():
        items = api_client.get('/api/eventi/').json()['results']
        return next(item for item in items if item['kind'] == 'edizione')

    assert edition()['has_en'] is False
    translation = _translate(festa, is_published=False)
    assert edition()['has_en'] is False
    translation.is_published = True
    translation.save()
    assert edition()['has_en'] is True


def test_a_list_reads_the_marks_without_a_query_per_row(
    api_client, make_original, django_assert_num_queries,
):
    # One query for every row's translations, prefetched with the list: the
    # same count for one book as for six.
    def count():
        with django_assert_num_queries(4) as context:
            rows = api_client.get('/api/libri/').json()['results']
        return len(context), [row['has_en'] for row in rows]

    _translate(make_original('libri', 'Libro 0'), is_published=True)
    assert count() == (4, [True])
    for index in range(1, 6):
        _translate(make_original('libri', f'Libro {index}'), is_published=True)
    assert count() == (4, [True] * 6)
