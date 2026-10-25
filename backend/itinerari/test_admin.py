"""Django admin obeys the stop rules and I4 (TD-49). Until then the admin's
stop inline, and the generic card form where a tour's `is_published` lives,
were the two ways around everything `api.py` enforces. Driven through the
real admin pages, as the author would use them."""

import pytest
from django.test import Client

from account.models import User
from attivita.models import Attivita
from chiese.models import Chiesa
from common.testing import PASSWORD
from content.models import Card, MapFeature
from dialetto.models import Termine
from itinerari.models import Itinerario, Stop

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def plain_static_files(settings):
    # A form re-rendered with its errors links the admin's stylesheets; the
    # production manifest storage has no manifest until `collectstatic`.
    settings.STORAGES = {
        **settings.STORAGES,
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }


@pytest.fixture
def author_client():
    user = User.objects.create_superuser(email='autore@example.com', password=PASSWORD, name='Autore')
    client = Client()
    client.force_login(user)
    client.user = user
    return client


def _card(author, title, is_published=True, **extra):
    return Card.objects.create(title=title, body_html='<p>Testo.</p>', author=author, is_published=is_published, **extra)


def _chiesa(author, title='Duomo', is_published=True):
    card = _card(author, title, is_published)
    Chiesa.objects.create(card=card)
    MapFeature.objects.create(card=card, kind=MapFeature.POINT, position=0, lat=41.2087, lng=13.5868)
    return card


def _tour(author, is_published=False, **extra):
    return Itinerario.objects.create(card=_card(author, 'Giro', is_published, **extra))


def _save_stops(client, tour, stops):
    """The itinerario's change form, with `stops` as its inline rows."""
    data = {
        'card': str(tour.card.pk),
        'form': tour.form,
        'duration': tour.duration,
        'stops-TOTAL_FORMS': str(len(stops)),
        'stops-INITIAL_FORMS': '0',
        'stops-MIN_NUM_FORMS': '0',
        'stops-MAX_NUM_FORMS': '1000',
    }
    for i, stop in enumerate(stops):
        data[f'stops-{i}-position'] = str(i)
        data[f'stops-{i}-card'] = str(stop['card'].pk)
        data[f'stops-{i}-point'] = str(stop['point'].pk) if stop.get('point') else ''
        data[f'stops-{i}-note'] = ''
        data[f'stops-{i}-itinerario'] = str(tour.card.pk)
    return client.post(f'/admin/itinerari/itinerario/{tour.card.pk}/change/', data)


def _publish_card(client, card):
    """The generic card form, saving `card` as published."""
    data = {
        'title': card.title,
        'body_html': card.body_html,
        'author': str(card.author_id),
        'is_published': 'on',
        'language': card.language,
        'translation_of': str(card.translation_of_id or ''),
        'images-TOTAL_FORMS': '0',
        'images-INITIAL_FORMS': '0',
        'images-MIN_NUM_FORMS': '0',
        'images-MAX_NUM_FORMS': '1000',
        # The card form's second inline, what is known about getting in (ADR-0008).
        'availability-TOTAL_FORMS': '0',
        'availability-INITIAL_FORMS': '0',
        'availability-MIN_NUM_FORMS': '0',
        'availability-MAX_NUM_FORMS': '1',
    }
    return client.post(f'/admin/content/card/{card.pk}/change/', data)


def _saved(response):
    # The admin redirects on success and re-renders the form with errors.
    return response.status_code == 302


# --- the stop inline ---


def test_the_admin_saves_a_stop_the_api_would_accept(author_client):
    tour = _tour(author_client.user)
    chiesa = _chiesa(author_client.user)

    response = _save_stops(author_client, tour, [{'card': chiesa, 'point': chiesa.map_features.get()}])

    assert _saved(response)
    assert list(tour.stops.values_list('card_id', flat=True)) == [chiesa.pk]


def test_a_card_with_no_place_is_not_a_stop_in_the_admin_either(author_client):
    tour = _tour(author_client.user)
    parola = _card(author_client.user, 'Sciuscià')
    Termine.objects.create(card=parola)

    response = _save_stops(author_client, tour, [{'card': parola}])

    assert not _saved(response)
    assert 'non ha un luogo sulla mappa' in response.content.decode()
    assert not Stop.objects.exists()


def test_a_business_is_not_a_stop_in_the_admin_either(author_client):
    """It has a place, so the rule is not I3's "no place": a tour that chose one
    business among many would rank them (CF40, ADR-0010)."""
    tour = _tour(author_client.user)
    bar = _card(author_client.user, 'Bar del porto')
    Attivita.objects.create(card=bar, kind=Attivita.BEVE)
    MapFeature.objects.create(card=bar, kind=MapFeature.POINT, position=0, lat=41.2087, lng=13.5868)

    response = _save_stops(author_client, tour, [{'card': bar}])

    assert not _saved(response)
    assert 'è un’attività' in response.content.decode()
    assert not Stop.objects.exists()


def test_a_tour_is_not_a_stop_in_the_admin_either(author_client):
    tour = _tour(author_client.user)
    other = _tour(author_client.user)
    MapFeature.objects.create(card=other.card, kind=MapFeature.ROUTE, position=0, lat=41.21, lng=13.57)

    response = _save_stops(author_client, tour, [{'card': other.card}])

    assert not _saved(response)
    assert not Stop.objects.exists()


def test_a_translation_is_not_a_stop_in_the_admin_either(author_client):
    tour = _tour(author_client.user)
    original = _chiesa(author_client.user)
    translation = _card(author_client.user, 'Cathedral', language='en', translation_of=original)
    Chiesa.objects.create(card=translation)

    response = _save_stops(author_client, tour, [{'card': translation}])

    assert not _saved(response)
    assert 'è una traduzione' in response.content.decode()


def test_a_stops_pin_must_be_its_own_cards(author_client):
    tour = _tour(author_client.user)
    duomo = _chiesa(author_client.user)
    altra = _chiesa(author_client.user, 'Annunziata')

    response = _save_stops(author_client, tour, [{'card': duomo, 'point': altra.map_features.get()}])

    assert not _saved(response)
    assert 'Il punto scelto per «Duomo» non esiste' in response.content.decode()


def test_a_translated_tour_has_no_stops_of_its_own_in_the_admin_either(author_client):
    original = _tour(author_client.user)
    translation = _tour(author_client.user, translation_of=original.card, language='en')

    response = _save_stops(author_client, translation, [{'card': _chiesa(author_client.user)}])

    assert not _saved(response)
    assert not Stop.objects.exists()


# --- I4: a published tour never has a draft stop ---


def test_the_admin_may_use_a_draft_stop_on_a_draft_tour(author_client):
    tour = _tour(author_client.user, is_published=False)

    response = _save_stops(author_client, tour, [{'card': _chiesa(author_client.user, is_published=False)}])

    assert _saved(response)


def test_a_draft_stop_on_a_published_tour_is_refused_in_the_admin(author_client):
    tour = _tour(author_client.user, is_published=True)
    bozza = _chiesa(author_client.user, 'Chiesa in bozza', is_published=False)

    response = _save_stops(author_client, tour, [{'card': bozza}])

    assert not _saved(response)
    assert 'In bozza: «Chiesa in bozza»' in response.content.decode()
    assert not Stop.objects.exists()


def test_publishing_a_tour_with_a_draft_stop_is_refused_on_the_card_form(author_client):
    tour = _tour(author_client.user, is_published=False)
    Stop.objects.create(itinerario=tour, card=_chiesa(author_client.user, 'Chiesa in bozza', is_published=False))

    response = _publish_card(author_client, tour.card)

    assert not _saved(response)
    assert 'In bozza: «Chiesa in bozza»' in response.content.decode()
    tour.card.refresh_from_db()
    assert tour.card.is_published is False


def test_publishing_a_tour_whose_stops_are_published_works_on_the_card_form(author_client):
    tour = _tour(author_client.user, is_published=False)
    Stop.objects.create(itinerario=tour, card=_chiesa(author_client.user))

    response = _publish_card(author_client, tour.card)

    assert _saved(response)
    tour.card.refresh_from_db()
    assert tour.card.is_published is True


# --- T8 on the card form: a translation after its original ---


def test_a_translation_is_not_published_before_its_original_on_the_card_form(author_client):
    original = _chiesa(author_client.user, is_published=False)
    translation = _card(author_client.user, 'Cathedral', is_published=False, language='en', translation_of=original)

    response = _publish_card(author_client, translation)

    assert not _saved(response)
    assert 'Si pubblica dopo la scheda originale' in response.content.decode()
    translation.refresh_from_db()
    assert translation.is_published is False
