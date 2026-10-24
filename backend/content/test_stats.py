"""The archive's own line, «127 schede, l'ultima aggiornata il 3 marzo 2026»
(review PR-18, content.md): how many cards a reader can open, and the day the
latest of them changed. Counted the way the menu counts — published
originals of a type — so a draft or a translation never moves it."""

from datetime import datetime, timezone

import pytest

from chiese.models import Chiesa
from content.models import Availability, Card
from libri.models import Libro
from luoghi.models import Genre, Luogo
from ricette.models import Ricetta

pytestmark = pytest.mark.django_db

TYPES = {
    'chiese': lambda card: Chiesa.objects.create(card=card),
    'ricette': lambda card: Ricetta.objects.create(card=card),
    'libri': lambda card: Libro.objects.create(card=card, book_author='Autore'),
    'luoghi': lambda card: Luogo.objects.create(card=card, genre=Genre.objects.first()),
}


@pytest.fixture
def make_typed(citizen):
    def _make(type_key='chiese', is_published=True, translation_of=None, updated_at=None):
        card = Card.objects.create(
            title='Scheda', body_html='<p>Testo.</p>', author=citizen,
            is_published=is_published, translation_of=translation_of,
            language='en' if translation_of else 'it',
        )
        TYPES[type_key](card)
        if updated_at:
            # `auto_now` rewrites the field on every save(); update() does not.
            Card.objects.filter(pk=card.pk).update(updated_at=updated_at)
        return card
    return _make


def at(*args):
    return datetime(*args, tzinfo=timezone.utc)


def stats(client):
    response = client.get('/api/content/stats/')
    assert response.status_code == 200
    return response.json()


def test_an_empty_archive_has_no_date(api_client):
    # The SPA prints no line for it — not «0 schede».
    assert stats(api_client) == {'published': 0, 'last_updated': None}


def test_three_cards_and_the_day_the_latest_changed(api_client, make_typed):
    make_typed('chiese', updated_at=at(2026, 3, 1, 10))
    make_typed('luoghi', updated_at=at(2026, 3, 3, 10))
    make_typed('ricette', updated_at=at(2026, 2, 14, 10))

    assert stats(api_client) == {'published': 3, 'last_updated': '2026-03-03'}


def test_a_draft_never_moves_it_not_even_for_its_author(make_client, citizen, admin, make_typed):
    make_typed('chiese', updated_at=at(2026, 3, 3, 10))
    make_typed('luoghi', is_published=False)  # changed just now

    for client in (make_client(citizen), make_client(admin)):
        assert stats(client) == {'published': 1, 'last_updated': '2026-03-03'}


def test_a_translation_is_not_a_second_card_and_does_not_date_the_archive(api_client, make_typed):
    # One thing in the world, one row — and the date is the originals' too.
    original = make_typed('chiese', updated_at=at(2026, 3, 3, 10))
    make_typed('chiese', translation_of=original)

    assert stats(api_client) == {'published': 1, 'last_updated': '2026-03-03'}


def test_the_day_is_gaetas_not_utcs(api_client, make_typed):
    # 22:30 UTC on 30 June is half past midnight on 1 July in Gaeta (CEST).
    make_typed('libri', updated_at=at(2026, 6, 30, 22, 30))

    assert stats(api_client)['last_updated'] == '2026-07-01'


def test_its_number_is_the_menus_numbers_added_up(api_client, citizen, make_typed):
    make_typed('chiese')
    make_typed('luoghi')
    make_typed('luoghi')
    make_typed('libri')
    # A card with no type row is on no page, and in no count.
    bare = Card.objects.create(title='Senza tipo', body_html='<p>.</p>', author=citizen, is_published=True)
    Availability.objects.create(card=bare)

    counts = api_client.get('/api/content/counts/').json()

    assert stats(api_client)['published'] == sum(counts.values()) == 4


def test_it_answers_a_stale_token_rather_than_refusing_it(api_client, make_typed):
    make_typed('ricette')
    api_client.credentials(HTTP_AUTHORIZATION='Bearer scaduto')

    assert stats(api_client)['published'] == 1


def test_it_is_one_query_and_then_none_for_a_few_minutes(api_client, make_typed, django_assert_num_queries):
    # Cached (ARCHIVE_STATS_TTL): the home asks on every visit, and a line
    # about the archive's life can be a few minutes behind it.
    make_typed('chiese')

    with django_assert_num_queries(1):
        assert stats(api_client)['published'] == 1

    make_typed('luoghi')

    with django_assert_num_queries(0):
        assert stats(api_client)['published'] == 1
