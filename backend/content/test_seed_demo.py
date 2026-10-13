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
    assert cards.count() == 15
    assert all(card.title.startswith('[DEMO] ') and card.is_published for card in cards)
    assert not CardImage.objects.exists()
    counts = {zone['slug']: zone['count'] for zone in api_client.get('/api/map/zone/').json()}
    assert all(count > 0 for count in counts.values()), counts


def test_running_it_again_replaces_rather_than_doubles(settings):
    settings.DEBUG = True

    call_command('seed_demo')
    call_command('seed_demo')

    assert Card.objects.count() == 15


def test_remove_takes_only_what_it_made(settings, citizen):
    settings.DEBUG = True
    real = Card.objects.create(title='Duomo', body_html='<p>Vero.</p>', author=citizen)

    call_command('seed_demo')
    call_command('seed_demo', '--remove')

    assert list(Card.objects.all()) == [real]
