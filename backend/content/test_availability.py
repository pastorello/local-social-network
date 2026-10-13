"""What is known about getting in — ADR-0008. The tests are named after the
mistakes a later change could make, because the invariants are the decision:
no row is unknown and never open; the date is the server's; nothing here is
a time the code reads; a translation shows its original's."""

import json
from datetime import date, datetime
from unittest import mock
from zoneinfo import ZoneInfo

import pytest
from django.core.exceptions import ValidationError

from chiese.models import Chiesa
from content.models import Availability, Card, today_in_gaeta
from feste.models import Feste
from luoghi.models import Genre, Luogo

pytestmark = pytest.mark.django_db


def _card(author, title='Duomo', **extra):
    return Card.objects.create(title=title, body_html='<p>Testo.</p>', author=author, is_published=True, **extra)


def _chiesa(author, **extra):
    card = _card(author, **extra)
    Chiesa.objects.create(card=card)
    return card


def _patch(client, card, availability, endpoint='chiese'):
    return client.patch(
        f'/api/{endpoint}/{card.pk}/', {'availability': json.dumps(availability)}, format='multipart'
    )


# --- absence ---


def test_no_row_is_unknown_not_open(api_client, citizen):
    card = _chiesa(citizen)

    availability = api_client.get(f'/api/chiese/{card.pk}/').json()['availability']

    assert availability == {
        'state': 'unknown', 'hours': '', 'hours_updated': None, 'keeper': '', 'keeper_phone': '',
    }


def test_no_state_means_open():
    # ADR-0008: none of the states says a place is open, and none may be added
    # that does. If this fails, read the ADR before changing the test.
    states = {value for value, _ in Availability.STATE_CHOICES}
    assert states == {'unknown', 'services', 'on_request', 'works', 'no_door'}
    labels = ' '.join(label.lower() for _, label in Availability.STATE_CHOICES)
    assert 'apert' not in labels.replace("all'aperto", '')


def test_a_list_is_not_filtered_by_availability(api_client, citizen):
    _chiesa(citizen, title='Con orari')
    Availability.objects.create(card=Card.objects.get(title='Con orari'), state='works')
    _chiesa(citizen, title='Senza niente')

    titles = {row['title'] for row in api_client.get('/api/chiese/').json()['results']}

    assert titles == {'Con orari', 'Senza niente'}


# --- the date is the server's ---


def test_the_server_dates_the_hours_and_ignores_a_date_sent(make_client, citizen):
    card = _chiesa(citizen)

    response = _patch(make_client(citizen), card, {
        'state': 'services', 'hours': 'Domenica alle 11, per la messa.',
        'keeper': 'Parrocchia della Cattedrale', 'keeper_phone': '0771 462255',
        'hours_updated': '1999-01-01',
    })

    assert response.status_code == 200, response.content
    availability = response.json()['availability']
    assert availability['hours'] == 'Domenica alle 11, per la messa.'
    assert availability['hours_updated'] == today_in_gaeta().isoformat()
    assert availability['keeper_phone'] == '0771 462255'


def test_the_date_moves_only_when_the_hours_do(make_client, citizen):
    card = _chiesa(citizen)
    Availability.objects.create(card=card, hours='La mattina.')
    Availability.objects.filter(card=card).update(hours_updated=date(2026, 3, 12))
    client = make_client(citizen)

    same = _patch(client, card, {'state': 'unknown', 'hours': 'La mattina.', 'keeper': 'Don Mario'})
    changed = _patch(client, card, {'state': 'unknown', 'hours': 'Solo la mattina.', 'keeper': 'Don Mario'})

    assert same.json()['availability']['hours_updated'] == '2026-03-12'
    assert changed.json()['availability']['hours_updated'] == today_in_gaeta().isoformat()


def test_emptied_hours_take_their_date_with_them(make_client, citizen):
    card = _chiesa(citizen)
    Availability.objects.create(card=card, hours='La mattina.')

    response = _patch(make_client(citizen), card, {'state': 'unknown', 'hours': '   '})

    assert response.json()['availability']['hours'] == ''
    assert response.json()['availability']['hours_updated'] is None


def test_today_is_gaetas_not_utcs():
    # 23:30 UTC on 9 August is already 10 August in Gaeta (summer time).
    late = datetime(2026, 8, 9, 23, 30, tzinfo=ZoneInfo('UTC'))
    with mock.patch('content.models.timezone.now', return_value=late):
        assert today_in_gaeta() == date(2026, 8, 10)


# --- what may carry it ---


def test_a_church_always_has_a_door(make_client, citizen):
    card = _chiesa(citizen)

    response = _patch(make_client(citizen), card, {'state': 'no_door'})

    assert response.status_code == 400
    assert 'availability' in response.json()['fields']
    assert not Availability.objects.exists()


def test_an_open_air_place_may_have_no_door(make_client, citizen):
    card = _card(citizen, title='Spiaggia di Serapo')
    Luogo.objects.create(card=card, genre=Genre.objects.get(slug='spiaggia'))

    response = _patch(make_client(citizen), card, {'state': 'no_door'}, endpoint='luoghi')

    assert response.status_code == 200, response.content
    assert response.json()['availability']['state'] == 'no_door'


def test_a_festa_has_no_availability(citizen):
    card = _card(citizen, title='Porto Salvo')
    Feste.objects.create(card=card)

    with pytest.raises(ValidationError):
        Availability(card=card).full_clean()


def test_malformed_availability_is_a_400(make_client, citizen):
    card = _chiesa(citizen)
    client = make_client(citizen)

    for bad in ('non json', json.dumps(['a']), json.dumps({'state': 'open'}), json.dumps({'keeper_phone': 'chiamami'})):
        response = client.patch(f'/api/chiese/{card.pk}/', {'availability': bad}, format='multipart')
        assert response.status_code == 400, bad
        assert 'availability' in response.json()['fields']


# --- translations (T5) ---


def test_a_translation_shows_its_originals_and_cannot_have_its_own(make_client, citizen):
    original = _chiesa(citizen)
    Availability.objects.create(card=original, state='on_request', hours='Su richiesta.', keeper='Don Mario')
    translation = _card(citizen, title='Cathedral', language='en', translation_of=original)
    Chiesa.objects.create(card=translation)
    client = make_client(citizen)

    shown = client.get(f'/api/chiese/{translation.pk}/').json()['availability']
    refused = _patch(client, translation, {'state': 'works'})

    assert shown['keeper'] == 'Don Mario'
    assert shown['state'] == 'on_request'
    assert refused.status_code == 400
    assert 'scheda originale' in refused.json()['fields']['availability'][0]


# --- «Se la trovi chiusa» (cosa-fare.md D7) ---


def test_from_outside_is_the_churchs_own_and_its_translations_own(make_client, citizen):
    original = _chiesa(citizen)
    translation = _card(citizen, title='Cathedral', language='en', translation_of=original)
    Chiesa.objects.create(card=translation)
    client = make_client(citizen)

    client.patch(f'/api/chiese/{original.pk}/', {'from_outside': 'Il campanile.\r\nSi vede dal porto.'}, format='multipart')
    client.patch(f'/api/chiese/{translation.pk}/', {'from_outside': 'The bell tower.'}, format='multipart')

    assert client.get(f'/api/chiese/{original.pk}/').json()['from_outside'] == 'Il campanile.\nSi vede dal porto.'
    assert client.get(f'/api/chiese/{translation.pk}/').json()['from_outside'] == 'The bell tower.'


def test_creating_a_church_takes_both(make_client, citizen):
    response = make_client(citizen).post('/api/chiese/', {
        'title': 'San Francesco',
        'body_html': '<p>Testo.</p>',
        'from_outside': 'La scalinata.',
        'availability': json.dumps({'state': 'services', 'keeper': 'Parrocchia'}),
    }, format='multipart')

    assert response.status_code == 201, response.content
    data = response.json()
    assert data['from_outside'] == 'La scalinata.'
    assert data['availability']['state'] == 'services'
    assert data['availability']['hours_updated'] is None
