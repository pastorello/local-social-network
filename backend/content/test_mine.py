"""*Le mie schede* (review PR-13, design.md "Left to the build"): a
collaborator's own cards of every type, in one list, behind the avatar —
and after signing in, the place they land when something is unfinished."""

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
def make_typed():
    def _make(type_key, author, title='Scheda', is_published=True, translation_of=None):
        card = Card.objects.create(
            title=title, body_html='<p>Testo.</p>', author=author,
            is_published=is_published, translation_of=translation_of,
            language='en' if translation_of else 'it',
        )
        TYPES[type_key](card)
        return card
    return _make


def mine(client, **params):
    response = client.get('/api/content/mine/', params)
    assert response.status_code == 200
    return response.json()


def test_a_reader_without_an_account_has_no_cards_to_list(api_client):
    assert api_client.get('/api/content/mine/').status_code == 401


def test_every_type_is_listed_under_its_route_segment(make_client, citizen, make_typed):
    for type_key in TYPES:
        make_typed(type_key, citizen)

    rows = mine(make_client(citizen))['results']

    assert sorted(row['type'] for row in rows) == sorted(TYPES)


def test_only_the_signed_in_author_s_cards(make_client, citizen, other_citizen, admin, make_typed):
    make_typed('chiese', citizen, title='Mia')
    make_typed('chiese', other_citizen, title='Di un altro')

    assert [row['title'] for row in mine(make_client(citizen))['results']] == ['Mia']
    # Not every card for an admin either: this is *their* desk, not the archive.
    assert mine(make_client(admin))['results'] == []


def test_drafts_come_first_so_one_row_says_whether_anything_is_unfinished(
    make_client, citizen, make_typed,
):
    # The login asks for one row (page_size=1) and lands on this page only
    # when that row is a draft: a draft behind a newer published card would
    # send the collaborator to the map with work left undone.
    make_typed('luoghi', citizen, title='Bozza vecchia', is_published=False)
    make_typed('ricette', citizen, title='Pubblicata recente')

    first = mine(make_client(citizen), page_size=1)['results']

    assert [(row['title'], row['is_published']) for row in first] == [('Bozza vecchia', False)]


def test_an_unfinished_translation_is_there_under_its_italian_name(make_client, citizen, make_typed):
    original = make_typed('chiese', citizen, title='Santissima Annunziata')
    make_typed(
        'chiese', citizen, title='Most Holy Annunciation', is_published=False,
        translation_of=original,
    )

    rows = mine(make_client(citizen))['results']
    translation = next(row for row in rows if row['language'] == 'en')

    assert translation['translation_of'] == str(original.pk)
    assert translation['original_title'] == 'Santissima Annunziata'
    assert translation['is_published'] is False


def test_a_card_with_no_type_row_is_left_out(make_client, citizen):
    bare = Card.objects.create(title='Senza tipo', body_html='<p>.</p>', author=citizen)
    Availability.objects.create(card=bare)

    assert mine(make_client(citizen))['results'] == []


def test_it_pages_like_every_other_list(make_client, citizen, make_typed):
    for _ in range(3):
        make_typed('libri', citizen)

    page = mine(make_client(citizen), page_size=2)

    assert page['count'] == 3
    assert len(page['results']) == 2
    assert page['next']


def test_it_stays_one_query_for_the_cards(make_client, citizen, make_typed, django_assert_num_queries):
    for type_key in TYPES:
        make_typed(type_key, citizen)
    client = make_client(citizen)

    # The count and the page — however many types there are. The type of each
    # row comes with it: no query per card.
    with django_assert_num_queries(2):
        rows = mine(client)['results']
    assert len(rows) == len(TYPES)
