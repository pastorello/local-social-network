from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from account.models import User
from polls.models import Poll, PollOption, Vote

pytestmark = pytest.mark.django_db

PASSWORD = 'GaetaTest2026!'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def citizen():
    return User.objects.create_user(
        name='Cittadino Uno', email='cittadino@example.com', password=PASSWORD
    )


@pytest.fixture
def other_citizen():
    return User.objects.create_user(
        name='Cittadino Due', email='altro@example.com', password=PASSWORD
    )


@pytest.fixture
def admin():
    user = User.objects.create_user(
        name='Amministratore', email='admin@example.com', password=PASSWORD
    )
    user.role = User.ADMIN
    user.save(update_fields=('role',))
    return user


@pytest.fixture
def make_client():
    def _make(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _make


@pytest.fixture
def make_poll(admin):
    def _make(question='Come valuti la pulizia delle spiagge?', options=('Bene', 'Male'),
              created_by=None, **overrides):
        poll = Poll.objects.create(
            question=question, created_by=created_by or admin, **overrides
        )
        for position, text in enumerate(options):
            PollOption.objects.create(poll=poll, text=text, position=position)
        return poll

    return _make


def valid_payload(**overrides):
    payload = {
        'question': 'Dove costruire la nuova area giochi?',
        'options': ['Villa comunale', 'Lungomare', 'Piazza della Libertà'],
    }
    payload.update(overrides)
    return payload


def option_id(poll, position=0):
    return str(poll.options.get(position=position).id)


# --- list (F3.4) ---


def test_poll_list_is_public_and_paginated(api_client, make_poll):
    make_poll()

    response = api_client.get('/api/polls/')

    assert response.status_code == 200
    data = response.json()
    assert data['count'] == 1
    item = data['results'][0]
    assert item['question'] == 'Come valuti la pulizia delle spiagge?'
    assert [option['text'] for option in item['options']] == ['Bene', 'Male']
    assert item['created_by']['name'] == 'Amministratore'
    assert 'email' not in item['created_by']


def test_open_polls_come_before_closed(api_client, make_poll):
    make_poll(question='Scaduto', closes_at=timezone.now() - timedelta(hours=1))
    make_poll(question='Chiuso a mano', is_closed=True)
    make_poll(question='Aperto')

    response = api_client.get('/api/polls/')

    questions = [poll['question'] for poll in response.json()['results']]
    # open first; closed group newest-first (spec F3.4)
    assert questions == ['Aperto', 'Chiuso a mano', 'Scaduto']


def test_list_hides_results_from_anonymous_on_open_polls(api_client, make_poll):
    make_poll()

    item = api_client.get('/api/polls/').json()['results'][0]

    assert item['results_visible'] is False
    assert item['total_votes'] is None
    assert all(option['votes_count'] is None for option in item['options'])


# --- create (F3.1) ---


def test_create_requires_auth(api_client):
    response = api_client.post('/api/polls/', valid_payload(), format='json')

    assert response.status_code == 401


def test_citizen_cannot_create_poll(make_client, citizen):
    response = make_client(citizen).post('/api/polls/', valid_payload(), format='json')

    assert response.status_code == 403


def test_admin_creates_poll(make_client, admin):
    closes_at = timezone.now() + timedelta(days=7)

    response = make_client(admin).post(
        '/api/polls/', valid_payload(closes_at=closes_at.isoformat()), format='json'
    )

    assert response.status_code == 201
    data = response.json()
    assert data['question'] == 'Dove costruire la nuova area giochi?'
    assert data['is_closed'] is False
    assert data['closes_at'] is not None
    assert data['my_vote'] is None
    assert [option['text'] for option in data['options']] == [
        'Villa comunale', 'Lungomare', 'Piazza della Libertà'
    ]
    assert [option['position'] for option in data['options']] == [0, 1, 2]

    poll = Poll.objects.get()
    assert poll.created_by == admin
    assert poll.options.count() == 3


def test_create_rejects_question_over_200_chars(make_client, admin):
    response = make_client(admin).post(
        '/api/polls/', valid_payload(question='x' * 201), format='json'
    )

    assert response.status_code == 400
    assert 'question' in response.json()['fields']


def test_create_requires_at_least_two_options(make_client, admin):
    response = make_client(admin).post(
        '/api/polls/', valid_payload(options=['Unica opzione']), format='json'
    )

    assert response.status_code == 400
    assert 'options' in response.json()['fields']


def test_create_rejects_more_than_ten_options(make_client, admin):
    options = [f'Opzione {index}' for index in range(11)]

    response = make_client(admin).post(
        '/api/polls/', valid_payload(options=options), format='json'
    )

    assert response.status_code == 400
    assert 'options' in response.json()['fields']


def test_create_rejects_blank_option(make_client, admin):
    response = make_client(admin).post(
        '/api/polls/', valid_payload(options=['Bene', '   ']), format='json'
    )

    assert response.status_code == 400
    assert 'options' in response.json()['fields']


def test_create_rejects_duplicate_options(make_client, admin):
    response = make_client(admin).post(
        '/api/polls/', valid_payload(options=['Lungomare', 'lungomare']), format='json'
    )

    assert response.status_code == 400
    assert 'options' in response.json()['fields']


def test_create_rejects_closing_date_in_the_past(make_client, admin):
    closes_at = timezone.now() - timedelta(days=1)

    response = make_client(admin).post(
        '/api/polls/', valid_payload(closes_at=closes_at.isoformat()), format='json'
    )

    assert response.status_code == 400
    assert 'closes_at' in response.json()['fields']


# --- detail & results visibility (F3.3) ---


def test_detail_is_public_but_results_hidden_while_open(api_client, make_poll):
    poll = make_poll()

    response = api_client.get(f'/api/polls/{poll.id}/')

    assert response.status_code == 200
    data = response.json()
    assert data['question'] == poll.question
    assert data['results_visible'] is False
    assert data['my_vote'] is None
    assert all(option['votes_count'] is None for option in data['options'])


def test_detail_unknown_poll_is_404_with_detail(api_client):
    response = api_client.get('/api/polls/00000000-0000-0000-0000-000000000000/')

    assert response.status_code == 404
    assert 'detail' in response.json()


def test_citizen_does_not_see_results_before_voting(make_client, citizen, make_poll):
    poll = make_poll()

    data = make_client(citizen).get(f'/api/polls/{poll.id}/').json()

    assert data['results_visible'] is False
    assert data['total_votes'] is None


def test_citizen_sees_results_after_voting(make_client, citizen, make_poll):
    poll = make_poll()
    client = make_client(citizen)
    client.post(f'/api/polls/{poll.id}/vote/', {'option': option_id(poll)})

    data = client.get(f'/api/polls/{poll.id}/').json()

    assert data['results_visible'] is True
    assert data['my_vote'] == option_id(poll)
    assert [option['votes_count'] for option in data['options']] == [1, 0]
    assert data['total_votes'] == 1


def test_everyone_sees_results_once_closed(api_client, make_client, citizen, make_poll):
    poll = make_poll()
    make_client(citizen).post(f'/api/polls/{poll.id}/vote/', {'option': option_id(poll)})
    poll.is_closed = True
    poll.save(update_fields=('is_closed',))

    data = api_client.get(f'/api/polls/{poll.id}/').json()

    assert data['is_closed'] is True
    assert data['results_visible'] is True
    assert [option['votes_count'] for option in data['options']] == [1, 0]
    assert data['total_votes'] == 1


def test_expired_closing_date_counts_as_closed(api_client, make_poll):
    poll = make_poll(closes_at=timezone.now() - timedelta(minutes=5))

    data = api_client.get(f'/api/polls/{poll.id}/').json()

    assert data['is_closed'] is True
    assert data['results_visible'] is True


def test_admin_always_sees_results(make_client, admin, make_poll):
    poll = make_poll()

    data = make_client(admin).get(f'/api/polls/{poll.id}/').json()

    assert data['results_visible'] is True
    assert data['total_votes'] == 0


# --- vote (F3.2) ---


def test_vote_requires_auth(api_client, make_poll):
    poll = make_poll()

    response = api_client.post(f'/api/polls/{poll.id}/vote/', {'option': option_id(poll)})

    assert response.status_code == 401


def test_citizen_votes_once(make_client, citizen, make_poll):
    poll = make_poll()

    response = make_client(citizen).post(
        f'/api/polls/{poll.id}/vote/', {'option': option_id(poll)}
    )

    assert response.status_code == 200
    data = response.json()
    assert data['my_vote'] == option_id(poll)
    assert data['results_visible'] is True
    assert [option['votes_count'] for option in data['options']] == [1, 0]

    vote = Vote.objects.get()
    assert vote.user == citizen
    assert str(vote.option_id) == option_id(poll)


def test_vote_is_final(make_client, citizen, make_poll):
    poll = make_poll()
    client = make_client(citizen)
    client.post(f'/api/polls/{poll.id}/vote/', {'option': option_id(poll)})

    response = client.post(f'/api/polls/{poll.id}/vote/', {'option': option_id(poll, 1)})

    assert response.status_code == 403
    assert Vote.objects.count() == 1
    assert str(Vote.objects.get().option_id) == option_id(poll)


def test_cannot_vote_on_closed_poll(make_client, citizen, make_poll):
    poll = make_poll(is_closed=True)

    response = make_client(citizen).post(
        f'/api/polls/{poll.id}/vote/', {'option': option_id(poll)}
    )

    assert response.status_code == 403
    assert Vote.objects.count() == 0


def test_cannot_vote_after_closing_date(make_client, citizen, make_poll):
    poll = make_poll(closes_at=timezone.now() - timedelta(minutes=5))

    response = make_client(citizen).post(
        f'/api/polls/{poll.id}/vote/', {'option': option_id(poll)}
    )

    assert response.status_code == 403


def test_cannot_vote_option_of_another_poll(make_client, citizen, make_poll):
    poll = make_poll()
    other_poll = make_poll(question='Altro sondaggio')

    response = make_client(citizen).post(
        f'/api/polls/{poll.id}/vote/', {'option': option_id(other_poll)}
    )

    assert response.status_code == 400
    assert 'option' in response.json()['fields']
    assert Vote.objects.count() == 0


def test_vote_rejects_missing_or_malformed_option(make_client, citizen, make_poll):
    poll = make_poll()
    client = make_client(citizen)

    missing = client.post(f'/api/polls/{poll.id}/vote/', {})
    malformed = client.post(f'/api/polls/{poll.id}/vote/', {'option': 'non-un-uuid'})

    assert missing.status_code == 400
    assert 'option' in missing.json()['fields']
    assert malformed.status_code == 400
    assert 'option' in malformed.json()['fields']


def test_votes_accumulate_across_users(make_client, citizen, other_citizen, make_poll):
    poll = make_poll()
    make_client(citizen).post(f'/api/polls/{poll.id}/vote/', {'option': option_id(poll)})

    response = make_client(other_citizen).post(
        f'/api/polls/{poll.id}/vote/', {'option': option_id(poll, 1)}
    )

    data = response.json()
    assert [option['votes_count'] for option in data['options']] == [1, 1]
    assert data['total_votes'] == 2


# --- close (§8, admin) ---


def test_close_requires_auth(api_client, make_poll):
    poll = make_poll()

    response = api_client.patch(f'/api/polls/{poll.id}/close/')

    assert response.status_code == 401


def test_citizen_cannot_close_poll(make_client, citizen, make_poll):
    poll = make_poll()

    response = make_client(citizen).patch(f'/api/polls/{poll.id}/close/')

    assert response.status_code == 403
    poll.refresh_from_db()
    assert poll.is_closed is False


def test_admin_closes_poll(make_client, admin, make_poll):
    poll = make_poll()
    client = make_client(admin)

    response = client.patch(f'/api/polls/{poll.id}/close/')

    assert response.status_code == 200
    assert response.json()['is_closed'] is True
    poll.refresh_from_db()
    assert poll.is_closed is True

    again = client.patch(f'/api/polls/{poll.id}/close/')
    assert again.status_code == 200
    assert again.json()['is_closed'] is True
