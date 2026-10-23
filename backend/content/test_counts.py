"""The published count of each card type, for the menu (review PR-9,
content.md): a reader sees which headings have something in them. Counted
the way the public lists count — published originals only."""

import pytest

from chiese.models import Chiesa
from content.models import Availability, Card
from dialetto.models import Termine
from feste.models import Feste
from itinerari.models import Itinerario
from libri.models import Libro
from luoghi.models import Genre, Luogo
from personaggi.models import Personaggio
from ricette.models import Ricetta

pytestmark = pytest.mark.django_db

TYPES = {
    'chiese': lambda card: Chiesa.objects.create(card=card),
    'ricette': lambda card: Ricetta.objects.create(card=card),
    'personaggi': lambda card: Personaggio.objects.create(card=card),
    'dialetto': lambda card: Termine.objects.create(card=card, meaning='Significato'),
    'libri': lambda card: Libro.objects.create(card=card, book_author='Autore'),
    'luoghi': lambda card: Luogo.objects.create(card=card, genre=Genre.objects.first()),
    'feste': lambda card: Feste.objects.create(card=card),
    'itinerari': lambda card: Itinerario.objects.create(card=card),
}


@pytest.fixture
def make_typed(citizen):
    def _make(type_key, is_published=True, translation_of=None):
        card = Card.objects.create(
            title='Scheda', body_html='<p>Testo.</p>', author=citizen,
            is_published=is_published, translation_of=translation_of,
            language='en' if translation_of else 'it',
        )
        TYPES[type_key](card)
        return card
    return _make


def counts(client):
    response = client.get('/api/content/counts/')
    assert response.status_code == 200
    return response.json()


def test_every_type_is_counted_and_nothing_else(api_client):
    # The types are found, not listed (ADR-0004): a ninth type would appear
    # here on its own, and this is where someone notices it did.
    # Availability is the core's own one-to-one row, not a type.
    assert counts(api_client) == dict.fromkeys(TYPES, 0)


def test_a_published_card_counts_under_its_type(api_client, make_typed):
    make_typed('luoghi')
    make_typed('luoghi')
    make_typed('chiese')
    make_typed('libri')

    result = counts(api_client)

    assert result['luoghi'] == 2
    assert result['chiese'] == 1
    assert result['libri'] == 1
    assert result['feste'] == 0


def test_a_draft_never_moves_a_count_not_even_for_its_author(make_client, citizen, admin, make_typed):
    make_typed('feste', is_published=False)

    for client in (make_client(citizen), make_client(admin)):
        assert counts(client)['feste'] == 0


def test_a_translation_is_not_a_second_card(api_client, make_typed):
    # One thing in the world, one row — the rule every public list follows.
    original = make_typed('chiese')
    make_typed('chiese', translation_of=original)

    assert counts(api_client)['chiese'] == 1


def test_a_card_with_only_an_availability_row_is_no_type(api_client, citizen):
    bare = Card.objects.create(title='Senza tipo', body_html='<p>.</p>', author=citizen, is_published=True)
    Availability.objects.create(card=bare)

    assert set(counts(api_client).values()) == {0}


def test_it_answers_a_stale_token_rather_than_refusing_it(api_client, make_typed):
    # Public and the same for everyone: a reader's expired session must not
    # turn the menu's numbers into a 401.
    make_typed('ricette')
    api_client.credentials(HTTP_AUTHORIZATION='Bearer scaduto')

    assert counts(api_client)['ricette'] == 1


def test_it_stays_one_query(api_client, make_typed, django_assert_num_queries):
    for type_key in TYPES:
        make_typed(type_key)

    with django_assert_num_queries(1):
        assert set(counts(api_client).values()) == {1}
