"""A translation is published after its original, never before (2026-09-18,
from the debugging sweep): a published translation shows its original's
title, photographs and place (spec translations.md T5), so publishing it
first put an Italian draft in front of every reader. One rule, every type."""

import pytest

from chiese.models import Chiesa
from content.models import Card
from dialetto.models import Termine
from feste.models import Feste
from itinerari.models import Itinerario
from libri.models import Libro
from luoghi.models import Genre, Luogo
from personaggi.models import Personaggio
from ricette.models import Ricetta

pytestmark = pytest.mark.django_db

TYPES = {
    'chiese': lambda card: Chiesa.objects.create(card=card),
    'ricette': lambda card: Ricetta.objects.create(card=card),
    'personaggi': lambda card: Personaggio.objects.create(card=card),
    'dialetto': lambda card: Termine.objects.create(card=card, meaning='Significato'),
    'libri': lambda card: Libro.objects.create(card=card, book_author='Autore'),
    'luoghi': lambda card: Luogo.objects.create(card=card, genre=Genre.objects.first()),
    'feste': lambda card: Feste.objects.create(card=card),
    'itinerari': lambda card: Itinerario.objects.create(card=card),
}


@pytest.mark.parametrize('type_key', TYPES)
def test_a_translation_waits_for_its_original(type_key, make_client, citizen):
    client = make_client(citizen)
    original = Card.objects.create(title='Originale', body_html='<p>Testo.</p>', author=citizen, is_published=False)
    TYPES[type_key](original)
    translation_id = client.post(f'/api/{type_key}/{original.pk}/traduci/', {'language': 'en'}).json()['id']

    early = client.patch(f'/api/{type_key}/{translation_id}/', {'is_published': 'true'}, format='multipart')
    assert early.status_code == 400
    assert 'originale' in early.json()['fields']['is_published'][0]

    Card.objects.filter(pk=original.pk).update(is_published=True)
    later = client.patch(f'/api/{type_key}/{translation_id}/', {'is_published': 'true'}, format='multipart')
    assert later.status_code == 200, later.json()
