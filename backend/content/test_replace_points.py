"""`pins` is a diff by id, not a delete-and-recreate (TD-50): a pin the form
sends back with its id is the same row afterwards, so anything that points at
it — a tour's stop — still does."""

import json

import pytest

from content.models import Card, MapFeature
from ricette.models import Ricetta

pytestmark = pytest.mark.django_db


def _ricetta(author, title='Tiella'):
    card = Card.objects.create(title=title, body_html='<p>Testo.</p>', author=author)
    Ricetta.objects.create(card=card)
    a = MapFeature.objects.create(card=card, kind=MapFeature.POINT, position=0, lat=41.21, lng=13.57, label='A')
    b = MapFeature.objects.create(card=card, kind=MapFeature.POINT, position=1, lat=41.22, lng=13.58, label='B')
    return card, a, b


def _patch(client, card, pins):
    response = client.patch(f'/api/ricette/{card.pk}/', {'pins': json.dumps(pins)}, format='multipart')
    assert response.status_code == 200, response.content
    return response.json()['pins']


def test_the_read_side_carries_each_pins_id(make_client, citizen):
    card, a, b = _ricetta(citizen)

    pins = make_client(citizen).get(f'/api/ricette/{card.pk}/').json()['pins']

    assert [p['id'] for p in pins] == [a.pk, b.pk]


def test_a_pin_sent_back_with_its_id_is_updated_in_place(make_client, citizen):
    card, a, b = _ricetta(citizen)

    pins = _patch(make_client(citizen), card, [
        {'id': b.pk, 'lat': 41.23, 'lng': 13.59, 'label': 'B, spostato'},
        {'lat': 41.24, 'lng': 13.60, 'label': 'C'},
    ])

    assert pins[0] == {'id': b.pk, 'lat': 41.23, 'lng': 13.59, 'label': 'B, spostato'}
    assert pins[1]['label'] == 'C' and pins[1]['id'] not in (a.pk, b.pk)
    # A is gone; B kept its row and took the first place.
    assert not MapFeature.objects.filter(pk=a.pk).exists()
    assert MapFeature.objects.get(pk=b.pk).position == 0


def test_an_id_that_is_not_this_cards_pin_is_a_new_pin(make_client, citizen):
    card, a, _ = _ricetta(citizen)
    other, foreign, _ = _ricetta(citizen, title='Altra')

    pins = _patch(make_client(citizen), card, [
        {'id': foreign.pk, 'lat': 41.25, 'lng': 13.61, 'label': 'X'},
        {'id': 'boh', 'lat': 41.26, 'lng': 13.62, 'label': 'Y'},
    ])

    assert [p['label'] for p in pins] == ['X', 'Y']
    assert foreign.pk not in [p['id'] for p in pins]
    # The other card's pin is untouched.
    assert MapFeature.objects.get(pk=foreign.pk).card_id == other.pk
    assert not MapFeature.objects.filter(pk=a.pk).exists()


def test_the_same_id_twice_keeps_one_row_and_adds_the_other(make_client, citizen):
    card, a, _ = _ricetta(citizen)

    pins = _patch(make_client(citizen), card, [
        {'id': a.pk, 'lat': 41.21, 'lng': 13.57, 'label': 'A'},
        {'id': a.pk, 'lat': 41.22, 'lng': 13.58, 'label': 'A bis'},
    ])

    assert pins[0]['id'] == a.pk
    assert pins[1]['id'] != a.pk
