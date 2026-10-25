"""Events (spec cosa-fare.md Part −1 D9; CF25–CF34). The tests are named after
the mistakes they guard against; every date is written relative to Gaeta's
day (`common/when.py::tourist_day`), never as a literal (CF7)."""

import json
from datetime import date, datetime, time, timedelta
from io import BytesIO
from unittest import mock
from zoneinfo import ZoneInfo

import pytest
from PIL import Image
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from content.models import Card, MapFeature
from eventi.models import Evento
from feste.models import Edizione, Feste
from luoghi.models import Genre, Luogo
from maps.api import CARD_TYPES, STOP_TYPES, VENUE_TYPES
from ricette.models import Ricetta
from common.when import tourist_day

pytestmark = pytest.mark.django_db

GAETA_LAT = 41.2172608
GAETA_LNG = 13.5625165
# Inside Serapo's outline (maps/migrations/0006), as seed_e2e's beach is.
SERAPO_LAT = 41.2105
SERAPO_LNG = 13.5640


def day(offset):
    return tourist_day() + timedelta(days=offset)


@pytest.fixture
def make_luogo(citizen):
    def _make(title='Spiaggia di Serapo', is_published=True, pin=(SERAPO_LAT, SERAPO_LNG), author=None):
        card = Card.objects.create(
            title=title, body_html='<p>Sabbia.</p>', author=author or citizen, is_published=is_published,
        )
        Luogo.objects.create(card=card, genre=Genre.objects.get(slug='spiaggia'))
        if pin:
            MapFeature.objects.create(card=card, kind=MapFeature.POINT, lat=pin[0], lng=pin[1])
        return card

    return _make


@pytest.fixture
def make_evento(citizen):
    def _make(title='Musica dal vivo', start=0, end=None, at=None, author=None, is_published=True,
              state=Evento.IN_PROGRAMMA, start_time=None):
        venue = {'card': at} if at else {'lat': GAETA_LAT, 'lng': GAETA_LNG, 'place_label': 'Piazza XIX Maggio'}
        return Evento.objects.create(
            title=title, start_date=day(start), end_date=day(end if end is not None else start),
            start_time=start_time, author=author or citizen, is_published=is_published, state=state,
            **venue,
        )

    return _make


def point_place(label='Piazza XIX Maggio'):
    return json.dumps({'lat': GAETA_LAT, 'lng': GAETA_LNG, 'label': label})


def payload(**overrides):
    data = {
        'title': 'Concerto in piazza',
        'start_date': day(2).isoformat(),
        'start_time': '21:00',
        'place': point_place(),
        'is_published': 'true',
    }
    data.update(overrides)
    return {key: value for key, value in data.items() if value is not None}


def poster(fmt='PNG', name='locandina.png'):
    buffer = BytesIO()
    Image.new('RGB', (60, 90), 'red').save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


def titles(response):
    return [row['title'] for row in response.json()['results']]


# --- what an event is, and is not (CF25) ---


def test_an_event_is_not_a_card(make_client, citizen):
    response = make_client(citizen).post('/api/eventi/', payload(), format='multipart')

    assert response.status_code == 201, response.json()
    assert not Card.objects.exists()
    assert response.json()['kind'] == 'evento'


def test_an_event_is_not_a_layer_of_the_map_nor_a_stop(api_client, make_evento, make_luogo):
    make_evento(at=make_luogo())

    assert 'eventi' not in CARD_TYPES and 'eventi' not in STOP_TYPES
    # The venue's own pin is on the map, once, as the place it is.
    features = api_client.get('/api/map/features/').json()
    assert [feature['type'] for feature in features] == ['luoghi']


def test_a_feast_is_not_a_venue_its_date_is_an_edition():
    assert 'feste' not in VENUE_TYPES


# --- expiry is a query, and nothing is deleted (CF26) ---


def test_an_event_leaves_the_lists_when_its_day_is_over_with_nothing_running(api_client, make_evento):
    evento = make_evento(title='Domani sera', start=1)
    later = datetime.combine(day(3), time(12), tzinfo=ZoneInfo('Europe/Rome'))

    with mock.patch('common.when.timezone.now', return_value=later):
        listed = api_client.get('/api/eventi/')
        week = api_client.get('/api/eventi/?finestra=settimana')
        page = api_client.get(f'/api/eventi/{evento.pk}/')

    assert titles(listed) == [] and titles(week) == []
    # Still there, still published, still readable where it was: the record.
    assert page.status_code == 200
    assert page.json()['is_over'] is True
    assert Evento.objects.get(pk=evento.pk).is_published


def test_nothing_deletes_an_event(make_client, citizen, admin, make_evento):
    evento = make_evento()

    assert make_client(citizen).delete(f'/api/eventi/{evento.pk}/').status_code == 405
    assert make_client(admin).delete(f'/api/eventi/{evento.pk}/').status_code == 405
    assert Evento.objects.filter(pk=evento.pk).exists()


# --- cancelled is shown, not proposed (CF28) ---


def test_a_cancelled_event_is_listed_struck_through_but_never_proposed(api_client, make_evento):
    make_evento(title='Annullato', start=1, state=Evento.ANNULLATO)
    make_evento(title='Rinviato', start=1, state=Evento.RINVIATO)
    make_evento(title='Confermato', start=1, start_time=time(21))

    listed = api_client.get('/api/eventi/').json()['results']
    assert [(row['title'], row['state']) for row in listed] == [
        ('Annullato', 'annullato'), ('Rinviato', 'rinviato'), ('Confermato', 'in_programma'),
    ]
    for window in ('oggi', 'settimana'):
        assert 'Annullato' not in titles(api_client.get(f'/api/eventi/?finestra={window}'))
    assert titles(api_client.get('/api/eventi/?finestra=settimana')) == ['Rinviato', 'Confermato']


def test_a_cancelled_event_stays_cancelled(make_client, citizen, make_evento):
    client = make_client(citizen)
    evento = make_evento(start=3)

    postponed = client.patch(f'/api/eventi/{evento.pk}/', {'state': 'rinviato'}, format='multipart')
    assert postponed.status_code == 200 and postponed.json()['state'] == 'rinviato'
    back = client.patch(f'/api/eventi/{evento.pk}/', {'state': 'in_programma'}, format='multipart')
    assert back.json()['state'] == 'in_programma'
    client.patch(f'/api/eventi/{evento.pk}/', {'state': 'annullato'}, format='multipart')

    revived = client.patch(f'/api/eventi/{evento.pk}/', {'state': 'in_programma'}, format='multipart')
    assert revived.status_code == 400
    assert 'state' in revived.json()['fields']
    assert Evento.objects.get(pk=evento.pk).state == Evento.ANNULLATO


def test_a_new_event_is_in_programma_whatever_the_form_says(make_client, citizen):
    response = make_client(citizen).post('/api/eventi/', payload(state='annullato'), format='multipart')

    assert response.json()['state'] == 'in_programma'


# --- the dates a write refuses (CF29, CF34) ---


def test_a_range_longer_than_sixty_days_is_refused(make_client, citizen):
    client = make_client(citizen)

    too_long = client.post('/api/eventi/', payload(start_date=day(1).isoformat(),
                           end_date=day(62).isoformat()), format='multipart')
    two_months = client.post('/api/eventi/', payload(start_date=day(1).isoformat(),
                             end_date=day(61).isoformat()), format='multipart')

    assert too_long.status_code == 400 and 'end_date' in too_long.json()['fields']
    assert two_months.status_code == 201


def test_a_date_already_past_is_refused(make_client, citizen):
    response = make_client(citizen).post(
        '/api/eventi/', payload(start_date=day(-1).isoformat()), format='multipart'
    )

    assert response.status_code == 400
    assert 'start_date' in response.json()['fields']
    assert not Evento.objects.exists()


def test_an_end_before_the_start_is_refused(make_client, citizen):
    response = make_client(citizen).post(
        '/api/eventi/', payload(start_date=day(5).isoformat(), end_date=day(4).isoformat()),
        format='multipart',
    )

    assert response.status_code == 400 and 'end_date' in response.json()['fields']


def test_a_festival_already_under_way_can_be_filed_and_corrected(make_client, citizen):
    client = make_client(citizen)
    response = client.post('/api/eventi/', payload(start_date=day(-3).isoformat(),
                           end_date=day(3).isoformat()), format='multipart')
    assert response.status_code == 201

    corrected = client.patch(
        f"/api/eventi/{response.json()['id']}/",
        {'title': 'Le Luminarie', 'start_date': day(-3).isoformat(), 'end_date': day(3).isoformat()},
        format='multipart',
    )

    assert corrected.status_code == 200
    assert corrected.json()['title'] == 'Le Luminarie'


def test_a_one_day_event_without_an_end_ends_the_day_it_starts(make_client, citizen):
    client = make_client(citizen)
    created = client.post('/api/eventi/', payload(), format='multipart').json()
    assert created['end_date'] == created['start_date']

    moved = client.patch(f"/api/eventi/{created['id']}/", {'start_date': day(4).isoformat()},
                         format='multipart').json()

    assert moved['start_date'] == moved['end_date'] == day(4).isoformat()


def test_the_hour_is_a_wall_clock_not_an_instant(make_client, citizen, settings):
    created = make_client(citizen).post('/api/eventi/', payload(start_time='21:00'), format='multipart').json()

    assert created['start_time'] == '21:00'
    assert Evento._meta.get_field('start_time').get_internal_type() == 'TimeField'
    # A server moved to another zone reads the same 21:00 off the same wall.
    settings.TIME_ZONE = 'UTC'
    assert make_client(citizen).get(f"/api/eventi/{created['id']}/").json()['start_time'] == '21:00'


# --- where it is held (D9, CF27 as corrected, CF31, CF41 as amended) ---


def test_an_event_held_at_a_card_has_its_own_title_and_line_and_the_card_is_its_venue(
    make_client, citizen, make_luogo,
):
    luogo = make_luogo()

    response = make_client(citizen).post('/api/eventi/', payload(
        title='Torneo di beach volley', description='Iscrizioni sul posto.',
        place=json.dumps({'card': str(luogo.pk)}),
    ), format='multipart')

    data = response.json()
    assert response.status_code == 201, data
    assert (data['title'], data['description']) == ('Torneo di beach volley', 'Iscrizioni sul posto.')
    assert data['place'] == {
        'card': {'id': str(luogo.pk), 'type': 'luoghi', 'title': 'Spiaggia di Serapo'},
        'label': 'Spiaggia di Serapo', 'lat': SERAPO_LAT, 'lng': SERAPO_LNG,
    }
    assert data['zones'] == [{'slug': 'serapo', 'name': 'Serapo'}]
    assert Card.objects.get(pk=luogo.pk).title == 'Spiaggia di Serapo'


def test_a_venue_is_a_card_with_a_place_or_one_labelled_point(make_client, citizen, make_luogo):
    client = make_client(citizen)
    luogo = make_luogo()
    no_pin = make_luogo(title='Senza punto', pin=None)
    ricetta = Card.objects.create(title='Tiella', body_html='<p>.</p>', author=citizen, is_published=True)
    Ricetta.objects.create(card=ricetta)

    cases = {
        'both': {'card': str(luogo.pk), 'lat': GAETA_LAT, 'lng': GAETA_LNG, 'label': 'Piazza'},
        'neither': {},
        'a point with no name': {'lat': GAETA_LAT, 'lng': GAETA_LNG, 'label': '  '},
        'a card that is not a venue': {'card': str(ricetta.pk)},
        'a venue with no pin': {'card': str(no_pin.pk)},
    }
    for case, place in cases.items():
        response = client.post('/api/eventi/', payload(place=json.dumps(place)), format='multipart')
        assert response.status_code == 400, case
        assert 'place' in response.json()['fields'], case
    assert client.post('/api/eventi/', payload(place=None), format='multipart').status_code == 400
    assert not Evento.objects.exists()


def test_a_translation_is_not_a_venue(make_client, citizen, make_luogo):
    original = make_luogo()
    translation = Card.objects.create(
        title='Serapo beach', body_html='<p>.</p>', author=citizen, language='en',
        translation_of=original, is_published=True,
    )
    Luogo.objects.create(card=translation, genre=Genre.objects.get(slug='spiaggia'))

    response = make_client(citizen).post(
        '/api/eventi/', payload(place=json.dumps({'card': str(translation.pk)})), format='multipart'
    )

    assert response.status_code == 400 and 'place' in response.json()['fields']


def test_a_published_event_waits_for_its_venue_to_be_published(make_client, citizen, make_luogo):
    draft = make_luogo(is_published=False)
    client = make_client(citizen)

    published = client.post('/api/eventi/', payload(place=json.dumps({'card': str(draft.pk)})), format='multipart')
    as_draft = client.post('/api/eventi/', payload(
        place=json.dumps({'card': str(draft.pk)}), is_published='false',
    ), format='multipart')

    assert published.status_code == 400 and 'is_published' in published.json()['fields']
    assert as_draft.status_code == 201


def test_deleting_the_venue_leaves_the_event(api_client, make_evento, make_luogo):
    luogo = make_luogo()
    evento = make_evento(at=luogo)

    luogo.delete()

    response = api_client.get(f'/api/eventi/{evento.pk}/')
    assert response.status_code == 200
    assert response.json()['place'] is None


# --- the windows: Gaeta's day, the week, the days of a long event (D9, CF2) ---


def test_the_week_is_today_and_the_six_days_after(api_client, make_evento):
    for offset in (0, 6, 7):
        make_evento(title=f'Fra {offset} giorni', start=offset)

    assert titles(api_client.get('/api/eventi/?finestra=oggi')) == ['Fra 0 giorni']
    assert titles(api_client.get('/api/eventi/?finestra=settimana')) == ['Fra 0 giorni', 'Fra 6 giorni']
    assert titles(api_client.get('/api/eventi/')) == ['Fra 0 giorni', 'Fra 6 giorni', 'Fra 7 giorni']


def test_a_long_event_is_in_a_window_if_any_of_its_days_is(api_client, make_evento):
    make_evento(title='Cominciato la settimana scorsa', start=-5, end=1)
    make_evento(title='Comincia fra sei giorni', start=6, end=16)

    assert titles(api_client.get('/api/eventi/?finestra=oggi')) == ['Cominciato la settimana scorsa']
    assert titles(api_client.get('/api/eventi/?finestra=settimana')) == [
        'Cominciato la settimana scorsa', 'Comincia fra sei giorni',
    ]


def test_gaetas_day_ends_at_five_in_the_morning(api_client, citizen):
    saturday = date(2026, 10, 24)
    Evento.objects.create(
        title='Concerto del sabato', start_date=saturday, end_date=saturday, start_time=time(22),
        lat=GAETA_LAT, lng=GAETA_LNG, place_label='Piazza', author=citizen, is_published=True,
    )
    rome = ZoneInfo('Europe/Rome')

    # 00:40 on the calendar's Sunday is still Saturday night; 05:10 is not.
    with mock.patch('common.when.timezone.now', return_value=datetime(2026, 10, 25, 0, 40, tzinfo=rome)):
        late = titles(api_client.get('/api/eventi/?finestra=oggi'))
    with mock.patch('common.when.timezone.now', return_value=datetime(2026, 10, 25, 5, 10, tzinfo=rome)):
        morning = titles(api_client.get('/api/eventi/?finestra=oggi'))

    assert late == ['Concerto del sabato']
    assert morning == []


def test_the_day_is_gaetas_not_the_servers(api_client, citizen):
    # 23:30 UTC on Saturday is already 01:30 on Sunday in Gaeta — still
    # Saturday's night, by CF2 — and never Friday's.
    friday = date(2026, 8, 7)
    Evento.objects.create(
        title='Venerdì', start_date=friday, end_date=friday,
        lat=GAETA_LAT, lng=GAETA_LNG, place_label='Piazza', author=citizen, is_published=True,
    )
    utc_late = datetime(2026, 8, 8, 23, 30, tzinfo=ZoneInfo('UTC'))

    with mock.patch('common.when.timezone.now', return_value=utc_late):
        assert tourist_day() == date(2026, 8, 8)
        assert titles(api_client.get('/api/eventi/?finestra=oggi')) == []


def test_a_window_that_is_not_one_is_refused(api_client):
    response = api_client.get('/api/eventi/?finestra=domani')

    assert response.status_code == 400 and 'finestra' in response.json()['fields']


def test_events_and_editions_come_in_date_and_hour_order_never_ranked(api_client, citizen, make_evento):
    make_evento(title='Alle ventuno', start=1, start_time=time(21))
    make_evento(title='Alle nove', start=1, start_time=time(9))
    make_evento(title='Senza ora', start=1)
    make_evento(title='Oggi', start=0, start_time=time(23))
    card = Card.objects.create(title='Festa di prova', body_html='<p>.</p>', author=citizen, is_published=True)
    Edizione.objects.create(festa=Feste.objects.create(card=card), start_date=day(1))

    listed = api_client.get('/api/eventi/?finestra=settimana').json()['results']

    assert [(row['kind'], row['title']) for row in listed] == [
        ('evento', 'Oggi'), ('edizione', 'Festa di prova'), ('evento', 'Senza ora'),
        ('evento', 'Alle nove'), ('evento', 'Alle ventuno'),
    ]


def test_a_feasts_edition_is_in_the_window_only_with_its_card_published(api_client, citizen):
    published = Card.objects.create(title='Porto Salvo', body_html='<p>.</p>', author=citizen, is_published=True)
    draft = Card.objects.create(title='In bozza', body_html='<p>.</p>', author=citizen)
    for card in (published, draft):
        Edizione.objects.create(festa=Feste.objects.create(card=card), start_date=day(2), note='Processione')

    listed = api_client.get('/api/eventi/?finestra=settimana').json()['results']

    assert listed == [{
        'kind': 'edizione', 'id': listed[0]['id'], 'title': 'Porto Salvo', 'festa': str(published.pk),
        'start_date': day(2).isoformat(), 'end_date': day(2).isoformat(), 'note': 'Processione',
    }]


# --- who reads and who writes ---


def test_a_draft_event_is_its_authors_alone(api_client, make_client, citizen, other_citizen, admin, make_evento):
    evento = make_evento(is_published=False)

    assert api_client.get(f'/api/eventi/{evento.pk}/').status_code == 404
    assert make_client(other_citizen).get(f'/api/eventi/{evento.pk}/').status_code == 404
    assert make_client(citizen).get(f'/api/eventi/{evento.pk}/').status_code == 200
    assert make_client(admin).get(f'/api/eventi/{evento.pk}/').status_code == 200
    assert titles(api_client.get('/api/eventi/')) == []


def test_filing_an_event_needs_an_account_and_changing_it_its_author(
    api_client, make_client, other_citizen, admin, make_evento,
):
    evento = make_evento()

    assert api_client.post('/api/eventi/', payload(), format='multipart').status_code == 401
    assert make_client(other_citizen).patch(
        f'/api/eventi/{evento.pk}/', {'title': 'No'}, format='multipart'
    ).status_code == 403
    assert make_client(admin).patch(
        f'/api/eventi/{evento.pk}/', {'title': 'Sì'}, format='multipart'
    ).status_code == 200


def test_mine_is_ordered_by_when_events_happen_not_when_they_were_written(
    make_client, citizen, other_citizen, make_evento,
):
    make_evento(title='Fra una settimana', start=7)
    make_evento(title='Domani', start=1, is_published=False)
    over_long_ago = make_evento(title='Il mese scorso', start=5)
    over_yesterday = make_evento(title='Ieri', start=5)
    Evento.objects.filter(pk=over_long_ago.pk).update(start_date=day(-30), end_date=day(-30))
    Evento.objects.filter(pk=over_yesterday.pk).update(start_date=day(-1), end_date=day(-1))
    make_evento(title='Di un altro', start=2, author=other_citizen)

    rows = make_client(citizen).get('/api/eventi/mine/').json()['results']

    assert [(row['title'], row['is_over']) for row in rows] == [
        ('Domani', False), ('Fra una settimana', False), ('Ieri', True), ('Il mese scorso', True),
    ]


# --- the poster and the link (CF30 as amended, CF32) ---


def test_the_poster_goes_through_common_images(make_client, citizen):
    client = make_client(citizen)

    response = client.post('/api/eventi/', {**payload(), 'poster': poster(name='programma.html.png')},
                           format='multipart')

    data = response.json()
    assert response.status_code == 201, data
    assert data['poster'].endswith('.png') and '.html' not in data['poster']
    rejected = client.post(
        '/api/eventi/',
        {**payload(), 'poster': SimpleUploadedFile('x.png', b'<svg/>', content_type='image/png')},
        format='multipart',
    )
    assert rejected.status_code == 400 and 'poster' in rejected.json()['fields']

    removed = client.patch(f"/api/eventi/{data['id']}/", {'remove_poster': 'true'}, format='multipart')
    assert removed.json()['poster'] is None


def test_the_link_is_a_web_address_never_a_script(make_client, citizen):
    client = make_client(citizen)

    for link in ('javascript:alert(1)', 'ftp://example.com/x'):
        response = client.post('/api/eventi/', payload(link=link), format='multipart')
        assert response.status_code == 400 and 'link' in response.json()['fields'], link
    ok = client.post('/api/eventi/', payload(link='https://www.comune.gaeta.lt.it/'), format='multipart')
    assert ok.json()['link'] == 'https://www.comune.gaeta.lt.it/'


# --- Django admin obeys the same rules (the lesson of TD-49) ---


def test_admin_obeys_the_rules_the_api_does(citizen, make_luogo):
    def evento(**fields):
        values = {
            'title': 'Dall’admin', 'start_date': day(1), 'author': citizen,
            'lat': GAETA_LAT, 'lng': GAETA_LNG, 'place_label': 'Piazza',
        }
        values.update(fields)
        return Evento(**values)

    for case, fields, field in (
        ('past', {'start_date': day(-2)}, 'start_date'),
        ('too long', {'end_date': day(70)}, 'end_date'),
        ('no place', {'lat': None, 'lng': None, 'place_label': ''}, 'card'),
        ('a draft venue', {'lat': None, 'lng': None, 'place_label': '',
                           'card': make_luogo(is_published=False), 'is_published': True}, 'is_published'),
    ):
        with pytest.raises(ValidationError) as caught:
            evento(**fields).full_clean()
        assert field in caught.value.message_dict, case

    cancelled = evento(state=Evento.ANNULLATO)
    cancelled.state = Evento.IN_PROGRAMMA
    cancelled.save()
    Evento.objects.filter(pk=cancelled.pk).update(state=Evento.ANNULLATO)
    cancelled.refresh_from_db()
    cancelled.state = Evento.IN_PROGRAMMA
    with pytest.raises(ValidationError) as caught:
        cancelled.full_clean()
    assert 'state' in caught.value.message_dict
