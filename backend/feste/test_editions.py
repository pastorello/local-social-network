"""A feast's editions (spec cosa-fare.md Part −1 D9, K2): one row a year, typed
by hand, never a recurrence rule and never a guessed date."""

import json
from datetime import timedelta

import pytest
from django.core.exceptions import ValidationError

from common.when import tourist_day
from content.models import Card
from feste.models import Edizione, Feste

pytestmark = pytest.mark.django_db


def day(offset):
    return tourist_day() + timedelta(days=offset)


@pytest.fixture
def make_feste(citizen):
    def _make(is_published=True, title='Festa di Porto Salvo', recurrence='La seconda domenica di agosto'):
        card = Card.objects.create(
            title=title, body_html='<p>La processione.</p>', author=citizen, is_published=is_published,
        )
        return Feste.objects.create(card=card, recurrence=recurrence)

    return _make


def patch_editions(client, feste, entries):
    return client.patch(
        f'/api/feste/{feste.pk}/', {'editions': json.dumps(entries)}, format='multipart'
    )


def test_a_feast_without_an_edition_says_its_recurrence_and_no_invented_date(api_client, make_feste):
    feste = make_feste()

    data = api_client.get(f'/api/feste/{feste.pk}/').json()

    assert data['editions'] == []
    assert data['recurrence'] == 'La seconda domenica di agosto'


def test_the_festa_form_writes_this_years_edition(make_client, citizen, make_feste):
    feste = make_feste()

    response = patch_editions(make_client(citizen), feste, [
        {'start_date': day(10).isoformat(), 'note': 'Processione a mare alle 18'},
    ])

    assert response.status_code == 200, response.json()
    assert response.json()['editions'] == [{
        'id': Edizione.objects.get().pk, 'start_date': day(10).isoformat(),
        'end_date': day(10).isoformat(), 'note': 'Processione a mare alle 18',
    }]


def test_the_form_corrects_and_removes_what_is_ahead_by_id(make_client, citizen, make_feste):
    feste = make_feste()
    kept = Edizione.objects.create(festa=feste, start_date=day(10))
    dropped = Edizione.objects.create(festa=feste, start_date=day(300))

    patch_editions(make_client(citizen), feste, [
        {'id': kept.pk, 'start_date': day(11).isoformat(), 'end_date': day(12).isoformat()},
    ])

    kept.refresh_from_db()
    assert (kept.start_date, kept.end_date) == (day(11), day(12))
    assert not Edizione.objects.filter(pk=dropped.pk).exists()


def test_a_past_edition_is_kept_and_never_shown(api_client, make_client, citizen, make_feste):
    feste = make_feste()
    last_year = Edizione.objects.create(festa=feste, start_date=day(-360))

    assert api_client.get(f'/api/feste/{feste.pk}/').json()['editions'] == []
    # The form never saw it, so an empty list of editions ahead leaves it be.
    patch_editions(make_client(citizen), feste, [])
    assert Edizione.objects.filter(pk=last_year.pk).exists()


def test_without_the_field_the_editions_are_left_alone(make_client, citizen, make_feste):
    feste = make_feste()
    Edizione.objects.create(festa=feste, start_date=day(10))

    make_client(citizen).patch(f'/api/feste/{feste.pk}/', {'recurrence': 'Ogni agosto'}, format='multipart')

    assert Edizione.objects.count() == 1


@pytest.mark.parametrize('entry', [
    {'start_date': 'domenica'},
    {'note': 'senza data'},
])
def test_an_edition_without_a_real_day_is_refused(make_client, citizen, make_feste, entry):
    response = patch_editions(make_client(citizen), make_feste(), [entry])

    assert response.status_code == 400 and 'editions' in response.json()['fields']


def test_an_edition_already_past_or_longer_than_sixty_days_is_refused(make_client, citizen, make_feste):
    client = make_client(citizen)
    feste = make_feste()

    past = patch_editions(client, feste, [{'start_date': day(-1).isoformat()}])
    too_long = patch_editions(client, feste, [
        {'start_date': day(1).isoformat(), 'end_date': day(70).isoformat()},
    ])

    assert past.status_code == 400 and too_long.status_code == 400
    assert not Edizione.objects.exists()


def test_a_translation_shows_its_originals_editions_and_cannot_write_its_own(
    make_client, citizen, make_feste,
):
    feste = make_feste()
    Edizione.objects.create(festa=feste, start_date=day(10))
    client = make_client(citizen)
    translation_id = client.post(f'/api/feste/{feste.pk}/traduci/', {'language': 'en'}).json()['id']

    shown = client.get(f'/api/feste/{translation_id}/').json()['editions']
    written = client.patch(
        f'/api/feste/{translation_id}/', {'editions': json.dumps([{'start_date': day(20).isoformat()}])},
        format='multipart',
    )

    assert [edition['start_date'] for edition in shown] == [day(10).isoformat()]
    assert written.status_code == 400 and 'editions' in written.json()['fields']


def test_the_admin_inline_obeys_the_forms_rules(make_feste):
    feste = make_feste()

    with pytest.raises(ValidationError) as caught:
        Edizione(festa=feste, start_date=day(-5)).full_clean()
    assert 'start_date' in caught.value.message_dict
    with pytest.raises(ValidationError):
        Edizione(festa=feste, start_date=day(1), end_date=day(80)).full_clean()
    Edizione(festa=feste, start_date=day(1)).full_clean()
