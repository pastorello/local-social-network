"""scripts/carica-schede (content/drafts.py): a folder of Markdown cards in,
drafts out, through the API the app's forms use. The end-to-end tests run the
command against a real server on a port (`live_server`), so what they prove
is what a run against viveregaeta.it does; they are transactional, and
`serialized_rollback` gives each one back the genres the migrations seed.
The tests are named after the mistakes they guard against."""

import io

import pytest
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from chiese.api import MAX_PINS as CHIESE_PINS
from chiese.models import Chiesa
from chiese.serializers import ChiesaWriteSerializer
from common.testing import PASSWORD
from content.drafts import TYPES, DraftError, make_plan, read_draft, read_folder, title_key
from content.drafts import main as carica_schede
from content.models import Card
from feste.models import Feste
from feste.serializers import FesteWriteSerializer
from luoghi.api import MAX_PINS as LUOGHI_PINS
from luoghi.models import Luogo
from luoghi.serializers import LuogoWriteSerializer
from personaggi.api import MAX_PINS as PERSONAGGI_PINS
from personaggi.models import Personaggio
from personaggi.serializers import PersonaggioWriteSerializer
from ricette.models import Ricetta
from ricette.serializers import RicettaWriteSerializer

LIVE = pytest.mark.django_db(transaction=True, serialized_rollback=True)

BODY = """\
Il primo paragrafo dice che cos'è e perché entra in archivio.

## Storia

Un testo con un *corsivo* e un [collegamento](https://example.org/pagina).

## Fonti

- [Una fonte](https://example.org/fonte)

## Da verificare

- Una data che due fonti danno diversa.
"""

PIN = 'pins:\n  - lat: 41.2122094\n    lng: 13.5732625\n    label: Partenza\n'


def card_file(type_key, title, extra='', body=BODY, language='it'):
    return f'---\ntype: {type_key}\ntitle: {title}\nlanguage: {language}\n{extra}---\n\n{body}'


def write(folder, type_key, slug, text):
    directory = folder / type_key
    directory.mkdir(exist_ok=True)
    path = directory / f'{slug}.md'
    path.write_text(text, encoding='utf-8')
    return path


def run(folder, live_server, user, monkeypatch, *args, answer='s', password=PASSWORD):
    monkeypatch.setattr('builtins.input', lambda prompt='': answer)
    monkeypatch.setenv('VG_PASSWORD', password)
    out = io.StringIO()
    code = carica_schede([str(folder), '--api', live_server.url, '--email', user.email, *args], out=out)
    return code, out.getvalue()


# --- the format, read without a server ---


def test_every_key_a_file_may_carry_is_a_field_its_write_serializer_has():
    """The frontmatter's names are the serializers' own, and the pin caps are
    the API's: a field renamed on one side and not the other fails here, not
    in the author's next run."""
    serializers = {
        'chiese': ChiesaWriteSerializer, 'feste': FesteWriteSerializer, 'luoghi': LuogoWriteSerializer,
        'personaggi': PersonaggioWriteSerializer, 'ricette': RicettaWriteSerializer,
    }
    assert set(TYPES) == set(serializers)
    for type_key, serializer in serializers.items():
        assert set(TYPES[type_key].fields) <= set(serializer().fields), type_key
    assert (TYPES['chiese'].max_pins, TYPES['luoghi'].max_pins, TYPES['personaggi'].max_pins) == (
        CHIESE_PINS, LUOGHI_PINS, PERSONAGGI_PINS,
    )


@pytest.mark.parametrize(('type_key', 'text', 'reason'), [
    ('chiese', 'type: chiese\ntitle: Senza frontmatter\n', 'manca il frontmatter'),
    ('chiese', '---\ntitle: [non chiuso\n---\n\ncorpo', 'frontmatter non valido'),
    ('chiese', card_file('luoghi', 'Nella cartella sbagliata'), 'cartella chiese/'),
    ('chiese', card_file('chiese', 'Un campo in più', 'genre: spiaggia\n'), 'non ha: genre'),
    ('chiese', card_file('chiese', 'Orari', 'availability: {}\n'), 'non ha: availability'),
    ('chiese', card_file('chiese', 'In inglese', language='en'), 'traduzione si comincia'),
    ('chiese', card_file('chiese', '""'), 'manca il titolo'),
    ('chiese', card_file('chiese', 'Due pin', PIN + '  - lat: 41.2\n    lng: 13.5\n'), 'al massimo 1'),
    ('chiese', card_file('chiese', 'Pin rotto', 'pins:\n  - lat: nord\n    lng: 13.5\n'), 'pin non valido'),
    ('chiese', card_file('chiese', 'Pin fuori dal mondo', 'pins:\n  - lat: 141.2\n    lng: 13.5\n'), 'pin non valido'),
    ('ricette', card_file('ricette', 'Ricetta con un pin', PIN), "afferma qualcosa su un'attività"),
    ('feste', card_file('feste', 'Festa con un percorso', 'route:\n  - lat: 41.2\n    lng: 13.5\n'), 'camminato'),
    ('luoghi', card_file('luoghi', 'Senza genere'), 'manca il genere'),
    ('chiese', card_file('chiese', 'Senza fonti', body='Testo.\n\n## Da verificare\n\n- Una.\n'), '«## Fonti»'),
    ('chiese', card_file('chiese', 'Senza dubbi', body='Testo.\n\n## Fonti\n\n- Una.\n'), '«## Da verificare»'),
    ('chiese', card_file('chiese', 'Con un h1', body='# Titolo\n\n' + BODY), 'solo intestazioni ## e ###'),
])
def test_a_file_the_app_would_not_take_is_refused_with_its_reason(tmp_path, type_key, text, reason):
    path = write(tmp_path, type_key, 'scheda', text)

    with pytest.raises(DraftError, match=reason):
        read_draft(path, type_key)


def test_a_body_becomes_the_html_a_form_would_post(tmp_path):
    text = card_file('luoghi', 'Sentiero', 'genre: area-per-passeggiate\nhow_to_get_there: >\n  Dal\n  parcheggio.\n' + PIN)
    draft = read_draft(write(tmp_path, 'luoghi', 'sentiero', text), 'luoghi')

    assert draft.payload['how_to_get_there'] == 'Dal parcheggio.'
    assert draft.payload['is_published'] is False
    assert '<h2>Fonti</h2>' in draft.payload['body_html']
    assert '<em>corsivo</em>' in draft.payload['body_html']
    assert '<li><a href="https://example.org/fonte">Una fonte</a></li>' in draft.payload['body_html']
    assert draft.payload['pins'] == '[{"lat": 41.2122094, "lng": 13.5732625, "label": "Partenza"}]'


def test_two_files_with_one_title_are_both_refused_rather_than_one_picked(tmp_path):
    """One thing in the world, one card (content.md): which file is right is
    the author's call. Capitals and the apostrophe typed do not make two."""
    write(tmp_path, 'chiese', 'ulivo', card_file('chiese', "Chiesa dell'Ulivo"))
    write(tmp_path, 'chiese', 'ulivo-bis', card_file('chiese', 'chiesa  dell’ulivo'))
    drafts, refused, _ = read_folder(tmp_path)

    plan = make_plan(drafts, refused, existing={}, genres=None)

    assert plan.create == []
    assert [name for name, _ in plan.refuse] == ['chiese/ulivo-bis.md', 'chiese/ulivo.md']


def test_a_folder_that_is_not_a_type_is_named_not_silently_dropped(tmp_path):
    write(tmp_path, 'libri', 'un-libro', card_file('libri', 'Un libro'))
    (tmp_path / 'CONSEGNA.md').write_text('note per chi rivede')

    drafts, refused, ignored = read_folder(tmp_path)

    assert (drafts, refused, ignored) == ([], [], ['libri'])


def test_titles_match_whatever_capitals_spacing_or_apostrophe():
    assert title_key('chiese', "Chiesa dell'Ulivo") == title_key('chiese', ' CHIESA  dell’Ulivo ')
    assert title_key('chiese', 'Serapo') != title_key('luoghi', 'Serapo')


# --- a run, against a real server ---


@LIVE
def test_a_file_of_every_type_goes_in_as_a_draft_signed_by_whoever_runs_it(tmp_path, live_server, citizen, monkeypatch):
    write(tmp_path, 'chiese', 'chiesa', card_file('chiese', 'Chiesa di prova', 'from_outside: >\n  Il portale.\n' + PIN))
    write(tmp_path, 'luoghi', 'sentiero', card_file('luoghi', 'Sentiero di prova', 'genre: area-per-passeggiate\n' + PIN))
    write(tmp_path, 'personaggi', 'santo', card_file('personaggi', 'Santo di prova', 'life_dates: sec. IV\npins: []\n'))
    write(tmp_path, 'ricette', 'tiella', card_file('ricette', 'Tiella di prova', 'ingredients: |\n  Farina.\n  Polpo.\npins: []\n'))
    write(tmp_path, 'feste', 'festa', card_file('feste', 'Festa di prova', 'recurrence: Ogni 2 giugno\nroute: []\n'))

    code, out = run(tmp_path, live_server, citizen, monkeypatch)

    assert code == 0, out
    assert '5 bozze create' in out
    cards = Card.objects.all()
    assert len(cards) == 5
    assert {(card.is_published, card.author_id) for card in cards} == {(False, citizen.pk)}
    chiesa = Chiesa.objects.get(card__title='Chiesa di prova')
    assert chiesa.from_outside == 'Il portale.'
    assert [(p.lat, p.lng, p.label) for p in chiesa.card.map_features.all()] == [(41.2122094, 13.5732625, 'Partenza')]
    assert '<h2>Da verificare</h2>' in chiesa.card.body_html
    assert Luogo.objects.get().genre.slug == 'area-per-passeggiate'
    assert Personaggio.objects.get().life_dates == 'sec. IV'
    assert Ricetta.objects.get().ingredients == 'Farina.\nPolpo.'
    assert Feste.objects.get().recurrence == 'Ogni 2 giugno'
    assert f'{live_server.url}/chiese/{chiesa.pk}' in out


@LIVE
def test_a_second_run_creates_nothing_so_a_correction_made_in_the_app_survives(tmp_path, live_server, citizen, monkeypatch):
    write(tmp_path, 'chiese', 'chiesa', card_file('chiese', 'Chiesa di prova'))
    run(tmp_path, live_server, citizen, monkeypatch)
    Card.objects.filter(title='Chiesa di prova').update(body_html='<p>Corretta nell’app.</p>')

    code, out = run(tmp_path, live_server, citizen, monkeypatch)

    assert code == 0, out
    assert Card.objects.get().body_html == '<p>Corretta nell’app.</p>'
    assert "chiese/chiesa.md: «Chiesa di prova», bozza" in out
    assert 'Niente da creare.' in out


@LIVE
def test_a_published_card_by_someone_else_is_never_touched(tmp_path, live_server, citizen, other_citizen, monkeypatch):
    published = Card.objects.create(title='Chiesa dell’Ulivo', body_html='<p>Pubblicata.</p>', author=other_citizen, is_published=True)
    Chiesa.objects.create(card=published)
    write(tmp_path, 'chiese', 'ulivo', card_file('chiese', "CHIESA DELL'ULIVO"))

    code, out = run(tmp_path, live_server, citizen, monkeypatch)

    assert code == 0, out
    assert list(Card.objects.values_list('title', 'body_html')) == [('Chiesa dell’Ulivo', '<p>Pubblicata.</p>')]
    assert 'pubblicata' in out


@LIVE
def test_an_unknown_genre_refuses_that_file_and_lets_the_others_in(tmp_path, live_server, citizen, monkeypatch):
    write(tmp_path, 'luoghi', 'grotta', card_file('luoghi', 'Grotta di prova', 'genre: grotta-marina\n'))
    write(tmp_path, 'chiese', 'chiesa', card_file('chiese', 'Chiesa di prova'))

    code, out = run(tmp_path, live_server, citizen, monkeypatch)

    assert code == 1
    assert list(Card.objects.values_list('title', flat=True)) == ['Chiesa di prova']
    assert 'luoghi/grotta.md: il genere «grotta-marina» non esiste su questo sito' in out


@LIVE
def test_a_script_in_the_markdown_never_reaches_the_archive(tmp_path, live_server, citizen, monkeypatch):
    body = BODY + '\n<script>alert(1)</script>\n'
    write(tmp_path, 'chiese', 'chiesa', card_file('chiese', 'Chiesa di prova', body=body))

    run(tmp_path, live_server, citizen, monkeypatch)

    body_html = Card.objects.get().body_html
    assert '<script' not in body_html
    assert 'alert' not in body_html


@LIVE
def test_a_dry_run_signs_in_nowhere_and_writes_nothing(tmp_path, live_server, citizen, monkeypatch):
    write(tmp_path, 'chiese', 'chiesa', card_file('chiese', 'Chiesa di prova'))

    def no_questions(prompt=''):
        raise AssertionError(f'a dry run asked: {prompt}')

    monkeypatch.setattr('builtins.input', no_questions)
    monkeypatch.delenv('VG_PASSWORD', raising=False)
    out = io.StringIO()
    code = carica_schede([str(tmp_path), '--api', live_server.url, '--dry-run'], out=out)

    assert code == 0, out.getvalue()
    assert 'chiese      1 da creare' in out.getvalue()
    assert Card.objects.count() == 0
    assert OutstandingToken.objects.count() == 0


@LIVE
def test_answering_anything_but_yes_writes_nothing(tmp_path, live_server, citizen, monkeypatch):
    write(tmp_path, 'chiese', 'chiesa', card_file('chiese', 'Chiesa di prova'))

    code, out = run(tmp_path, live_server, citizen, monkeypatch, answer='')

    assert code == 0
    assert 'Nessuna scrittura.' in out
    assert Card.objects.count() == 0


@LIVE
def test_a_run_ends_the_session_it_opened(tmp_path, live_server, citizen, monkeypatch):
    """The refresh token a run signed in with is blacklisted when it ends, as
    «Esci» does in the app (TD-20): nothing it opened stays valid for 30 days."""
    write(tmp_path, 'chiese', 'chiesa', card_file('chiese', 'Chiesa di prova'))

    run(tmp_path, live_server, citizen, monkeypatch)

    token = OutstandingToken.objects.get(user=citizen)
    assert BlacklistedToken.objects.filter(token=token).exists()


@LIVE
def test_a_wrong_password_writes_nothing_and_says_so(tmp_path, live_server, citizen, monkeypatch):
    write(tmp_path, 'chiese', 'chiesa', card_file('chiese', 'Chiesa di prova'))

    code, out = run(tmp_path, live_server, citizen, monkeypatch, password='sbagliata')

    assert code == 2
    assert 'Errore:' in out
    assert '(HTTP 401)' in out
    assert Card.objects.count() == 0
