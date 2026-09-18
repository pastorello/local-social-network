"""`remove_image_ids` that is not a list of image ids is a 400, not a 500."""

import json

import pytest

from chiese.models import Chiesa
from content.models import Card

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('bad', [['a'], {'a': 1}, [True], [None], '7'])
def test_malformed_ids_are_a_400(bad, make_client, citizen):
    card = Card.objects.create(title='Chiesa', body_html='<p>Testo.</p>', author=citizen)
    Chiesa.objects.create(card=card)

    response = make_client(citizen).patch(
        f'/api/chiese/{card.pk}/', {'remove_image_ids': json.dumps(bad)}, format='multipart'
    )

    assert response.status_code == 400
    assert 'remove_image_ids' in response.json()['fields']
