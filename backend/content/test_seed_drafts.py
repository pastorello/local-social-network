"""seed_drafts (spec content.md, "Seeding the archive from public sources"):
the drafts kept in git become cards — drafts only, signed by Redazione, never
over a card that is already there, and never carrying what the seeding rules
forbid."""

import json

import pytest
from django.core.management import CommandError, call_command

from account.models import User
from chiese.models import Chiesa
from content.management.commands.seed_drafts import DRAFTS_DIR, REDAZIONE_EMAIL
from content.models import Availability, Card, CardImage, MapFeature
from luoghi.models import Luogo

pytestmark = pytest.mark.django_db

BODY = ['<p>Testo.</p>', '<h2>Fonti</h2>', '<ul><li>Una fonte</li></ul>', '<h2>Da verificare</h2>',
        '<ul><li>Tutto</li></ul>']


def write(root, type_key, name, **draft):
    path = root / type_key / f'{name}.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({'type': type_key, 'body_html': BODY, **draft}), encoding='utf-8')
    return path


def test_the_drafts_in_the_repo_are_valid_and_become_unpublished_redazione_cards(settings):
    settings.DEBUG = False  # the archive's raw material: it is not a DEBUG-only command

    call_command('seed_drafts')

    cards = Card.objects.all()
    assert cards.count() == len(list(DRAFTS_DIR.glob('*/*.json')))
    assert not cards.filter(is_published=True).exists()
    assert set(cards.values_list('author__email', flat=True)) == {REDAZIONE_EMAIL}
    assert not User.objects.get(email=REDAZIONE_EMAIL).has_usable_password()
    assert not CardImage.objects.exists()
    assert not MapFeature.objects.filter(kind=MapFeature.ROUTE).exists()
    assert all('<h2>Fonti</h2>' in card.body_html and '<h2>Da verificare</h2>' in card.body_html
               for card in cards)


def test_a_draft_is_invisible_to_readers(api_client):
    call_command('seed_drafts')

    assert api_client.get('/api/chiese/').json()['count'] == 0
    assert api_client.get('/api/map/features/').json() == []


def test_it_never_overwrites_a_card_that_is_already_there(tmp_path, citizen):
    write(tmp_path, 'chiese', 'duomo', title='Duomo', pins=[{'lat': 41.2087, 'lng': 13.5868, 'label': ''}])
    corrected = Card.objects.create(title='Duomo', body_html='<p>Corretto a mano.</p>', author=citizen,
                                    is_published=True)
    Chiesa.objects.create(card=corrected)

    call_command('seed_drafts', '--path', tmp_path)
    call_command('seed_drafts', '--path', tmp_path)

    assert list(Card.objects.all()) == [corrected]
    corrected.refresh_from_db()
    assert corrected.body_html == '<p>Corretto a mano.</p>' and corrected.is_published


def test_running_it_twice_creates_nothing_the_second_time():
    call_command('seed_drafts')
    count = Card.objects.count()

    call_command('seed_drafts')

    assert Card.objects.count() == count


def test_a_luogo_gets_its_genre_pin_and_availability(tmp_path):
    write(tmp_path, 'luoghi', 'spiaggia', title='Spiaggia', fields={'genre': 'spiaggia'},
          pins=[{'lat': 41.2119, 'lng': 13.5638, 'label': 'Ingresso'}],
          availability={'state': 'no_door'})

    call_command('seed_drafts', '--path', tmp_path)

    luogo = Luogo.objects.get()
    assert luogo.genre.slug == 'spiaggia' and not luogo.card.is_published
    assert list(luogo.card.map_features.values_list('lat', 'lng', 'label')) == [(41.2119, 13.5638, 'Ingresso')]
    assert Availability.objects.get(card=luogo.card).state == 'no_door'


def test_the_body_goes_through_the_same_sanitizer_as_the_api(tmp_path):
    write(tmp_path, 'libri', 'libro', title='Libro', fields={'book_author': 'Qualcuno'},
          body_html=['<p onclick="x()">Testo.</p><script>x()</script>', *BODY[1:]])

    call_command('seed_drafts', '--path', tmp_path)

    body = Card.objects.get().body_html
    assert body.startswith('<p>Testo.</p>') and 'script' not in body and 'onclick' not in body


@pytest.mark.parametrize('draft, reason', [
    ({'type': 'dialetto', 'title': 'Sciù'}, 'cannot be seeded'),
    ({'type': 'itinerari', 'title': 'Giro'}, 'cannot be seeded'),
    ({'type': 'feste', 'title': 'Festa', 'route': []}, 'unexpected key'),
    ({'type': 'chiese', 'title': 'Chiesa', 'images': []}, 'unexpected key'),
    ({'type': 'chiese', 'title': 'Chiesa', 'is_published': True}, 'unexpected key'),
    ({'type': 'chiese', 'title': 'Chiesa', 'fields': {'is_published': True}}, 'fields must be'),
    ({'type': 'chiese', 'title': 'Chiesa', 'body_html': ['<p>Senza fonti.</p>']}, 'Fonti'),
    ({'type': 'chiese', 'title': 'Chiesa', 'pins': [{'lat': 1, 'lng': 1, 'label': ''}] * 2}, 'invalid'),
    ({'type': 'feste', 'title': 'Festa', 'pins': [{'lat': 1, 'lng': 1, 'label': ''}]}, 'has no pins'),
    ({'type': 'ricette', 'title': 'Tiella', 'availability': {'state': 'unknown'}}, 'only chiese and luoghi'),
    ({'type': 'luoghi', 'title': 'Spiaggia', 'fields': {'genre': 'nessuno'}}, 'invalid'),
])
def test_it_refuses_what_the_seeding_rules_forbid_and_writes_nothing(tmp_path, draft, reason):
    write(tmp_path, 'chiese', 'valida', title='Valida')
    type_key = draft['type']
    write(tmp_path, type_key, 'rifiutata', **draft)

    with pytest.raises(CommandError, match=reason):
        call_command('seed_drafts', '--path', tmp_path)

    assert not Card.objects.exists()
