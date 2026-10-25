"""seed_demo (spec cosa-fare.md Part −1, D8): DEBUG only, every card marked
[DEMO], no images, and --remove takes away what it made and nothing else."""

import pytest
from django.core.management import CommandError, call_command

from content.models import Card, CardImage

pytestmark = pytest.mark.django_db


def test_it_refuses_outside_debug(settings):
    settings.DEBUG = False

    with pytest.raises(CommandError):
        call_command('seed_demo')

    assert not Card.objects.exists()


def test_it_fills_every_zone_with_marked_published_cards_and_no_images(settings, api_client):
    settings.DEBUG = True

    call_command('seed_demo')

    cards = Card.objects.all()
    assert cards.count() == 20
    assert all(card.title.startswith('[DEMO] ') and card.is_published for card in cards)
    assert not CardImage.objects.exists()
    counts = {zone['slug']: zone['count'] for zone in api_client.get('/api/map/zone/').json()}
    assert all(count > 0 for count in counts.values()), counts


# Where each demo card is meant to land (maps/migrations/0006). None of them
# is meant for «Altrove a Gaeta».
EXPECTED_ZONES = {
    'Spiaggia di prova': ['serapo'],
    'Belvedere di prova': ['monte-orlando'],
    'Sentiero di prova': ['monte-orlando'],
    'Museo di prova': ['gaeta-medievale'],
    'Torre di prova': ['gaeta-medievale'],
    'Spiaggia lunga di prova': ['piana-di-sant-agostino'],
    'Caletta di prova': ['ariana'],
    'Spiaggia sotto la strada di prova': ['arenauta'],
    'Giardino di prova': ['porto-salvo'],
    'Chiesa di prova del centro': ['gaeta-medievale'],
    'Santuario di prova': ['montagna-spaccata'],
    'Chiesa di prova del borgo': ['porto-salvo'],
    'Festa di prova': ['serapo', 'porto-salvo'],
    'Bar di prova sul lungomare': ['serapo'],
    'Trattoria di prova': ['gaeta-medievale'],
    'Forno di prova': ['porto-salvo'],
}


def test_every_demo_place_lands_in_the_zone_it_was_put_in(settings, api_client):
    settings.DEBUG = True

    call_command('seed_demo')

    zones = {
        entry['title'].removeprefix('[DEMO] '): entry['zones']
        for entry in api_client.get('/api/map/features/').json()
    }
    assert zones == EXPECTED_ZONES
    tours = {
        row['title'].removeprefix('[DEMO] '): row['zones']
        for row in api_client.get('/api/itinerari/').json()['results']
    }
    assert tours == {
        'Giro di prova nel centro': ['gaeta-medievale'],
        'Raccolta di prova: il mare': ['serapo', 'piana-di-sant-agostino', 'ariana', 'arenauta'],
    }


def test_running_it_again_replaces_rather_than_doubles(settings):
    settings.DEBUG = True

    call_command('seed_demo')
    call_command('seed_demo')

    assert Card.objects.count() == 20


def test_remove_takes_only_what_it_made(settings, citizen):
    settings.DEBUG = True
    real = Card.objects.create(title='Duomo', body_html='<p>Vero.</p>', author=citizen)

    call_command('seed_demo')
    call_command('seed_demo', '--remove')

    assert list(Card.objects.all()) == [real]


def test_it_files_dated_events_and_an_edition_and_removes_them(settings, api_client):
    settings.DEBUG = True

    call_command('seed_demo')

    week = api_client.get('/api/eventi/?finestra=settimana').json()['results']
    assert {row['title'] for row in week} == {
        '[DEMO] Musica di prova al bar', '[DEMO] Luminarie di prova', '[DEMO] Festa di prova',
    }
    call_command('seed_demo', '--remove')
    assert api_client.get('/api/eventi/').json()['results'] == []
