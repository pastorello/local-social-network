"""Drafts written from public sources, kept in git so they survive the
database they were first written into (spec content.md, "Seeding the archive
from public sources").

**This is the archive's raw material, not demo content**, so unlike
`seed_demo` it runs in any environment: a production database is meant to be
born with these drafts in it. What makes that safe is what it will not do:

- **It never publishes.** Every card is created as a draft; a file that says
  otherwise is refused. Publishing is a person's decision, after reading.
- **It never overwrites.** A draft whose type already holds an original card
  with the same title is skipped, whoever wrote that card and whatever it
  says now — so a correction made in the app survives every later run, the
  rule `maps/migrations/0006` follows for zones.
- **It writes nothing the rules forbid.** No images, no routes (a procession
  is drawn by someone who walked it), no dialect words, no tours. And a body
  without its *Fonti* and *Da verificare* sections is refused.

Each card is one JSON file under `content/drafts/<type>/`. The body is a list
of HTML blocks, joined as they are, so a diff shows one paragraph per line.
Every file goes through the same write serializer, sanitizer and point and
availability parsers as the API's create, and the whole set is validated
before anything is written.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework.exceptions import ValidationError

from account.models import User
from chiese.api import MAX_PINS as CHIESA_MAX_PINS
from chiese.models import Chiesa
from chiese.serializers import ChiesaWriteSerializer
from content.api_helpers import MAX_POINTS, parse_availability, parse_points, replace_points, save_availability
from content.models import Card
from feste.models import Feste
from feste.serializers import FesteWriteSerializer
from libri.models import Libro
from libri.serializers import LibroWriteSerializer
from luoghi.api import MAX_PINS as LUOGO_MAX_PINS
from luoghi.models import Luogo
from luoghi.serializers import LuogoWriteSerializer
from personaggi.api import MAX_PINS as PERSONAGGIO_MAX_PINS
from personaggi.models import Personaggio
from personaggi.serializers import PersonaggioWriteSerializer
from ricette.models import Ricetta
from ricette.serializers import RicettaWriteSerializer

DRAFTS_DIR = Path(__file__).resolve().parents[2] / 'drafts'
REDAZIONE_EMAIL = 'redazione@vivere-gaeta.local'
REQUIRED_SECTIONS = ('<h2>Fonti</h2>', '<h2>Da verificare</h2>')

# type → (model, write serializer, pin cap). The caps are each type's API's.
# Dialetto and itinerari are absent on purpose (see the module docstring).
TYPES = {
    'feste': (Feste, FesteWriteSerializer, 0),
    'chiese': (Chiesa, ChiesaWriteSerializer, CHIESA_MAX_PINS),
    'luoghi': (Luogo, LuogoWriteSerializer, LUOGO_MAX_PINS),
    'ricette': (Ricetta, RicettaWriteSerializer, MAX_POINTS),
    'personaggi': (Personaggio, PersonaggioWriteSerializer, PERSONAGGIO_MAX_PINS),
    'libri': (Libro, LibroWriteSerializer, 0),
}
ALLOWED_KEYS = {'type', 'title', 'body_html', 'fields', 'pins', 'availability'}


class Command(BaseCommand):
    help = 'Creates the drafts kept in content/drafts/, signed by Redazione. Never publishes, never overwrites.'

    def add_arguments(self, parser):
        parser.add_argument('--path', type=Path, default=DRAFTS_DIR, help='Directory of draft files.')
        parser.add_argument('--check', action='store_true', help='Validate every file and write nothing.')

    def handle(self, *args, **options):
        drafts = [self._parse(path) for path in sorted(options['path'].glob('*/*.json'))]
        if not drafts:
            raise CommandError(f'No draft files under {options["path"]}.')
        titles = [(draft['type'], draft['title']) for draft in drafts]
        if len(set(titles)) != len(titles):
            raise CommandError('Two files describe the same card (same type and title).')
        if options['check']:
            self.stdout.write(f'{len(drafts)} draft file(s) valid; nothing written.')
            return

        created, skipped = [], []
        with transaction.atomic():
            author = self._author()
            for draft in drafts:
                if self._exists(draft):
                    skipped.append(draft['title'])
                else:
                    self._create(draft, author)
                    created.append(draft['title'])
        for title in created:
            self.stdout.write(f'  + {title}')
        for title in skipped:
            self.stdout.write(f'  = {title} (already there, left alone)')
        self.stdout.write(f'Created {len(created)} draft(s), skipped {len(skipped)}.')

    def _parse(self, path):
        def refuse(reason):
            raise CommandError(f'{path}: {reason}')

        try:
            raw = json.loads(path.read_text(encoding='utf-8'))
        except ValueError as error:
            refuse(f'not valid JSON ({error}).')
        if not isinstance(raw, dict):
            refuse('expected a JSON object.')
        unknown = set(raw) - ALLOWED_KEYS
        if unknown:
            refuse(f'unexpected key(s) {sorted(unknown)} — drafts carry no images, routes or publishing.')
        type_key = raw.get('type')
        if type_key not in TYPES:
            refuse(f'type {type_key!r} cannot be seeded; one of {sorted(TYPES)}.')
        if path.parent.name != type_key:
            refuse(f'a {type_key} draft must live in {type_key}/.')
        model, serializer_class, max_pins = TYPES[type_key]

        blocks = raw.get('body_html')
        if not isinstance(blocks, list) or not all(isinstance(block, str) for block in blocks):
            refuse('body_html must be a list of HTML blocks.')
        body = ''.join(blocks)
        for section in REQUIRED_SECTIONS:
            if section not in body:
                refuse(f'the body has no {section} section.')

        fields = raw.get('fields', {})
        if not isinstance(fields, dict) or {'title', 'body_html', 'is_published'} & set(fields):
            refuse('fields must be an object of the type\'s own fields.')
        serializer = serializer_class(data={**fields, 'title': raw.get('title'), 'body_html': body})
        if not serializer.is_valid():
            refuse(f'invalid: {serializer.errors}')
        data = serializer.validated_data

        try:
            pins = None
            if 'pins' in raw:
                if not max_pins:
                    refuse(f'a {type_key} draft has no pins.')
                pins = parse_points(json.dumps(raw['pins']), max_points=max_pins)
            availability = None
            if 'availability' in raw:
                if type_key not in ('chiese', 'luoghi'):
                    refuse('only chiese and luoghi carry availability.')
                availability = parse_availability(json.dumps(raw['availability']))
        except ValidationError as error:
            refuse(f'invalid: {error.detail}')

        return {'type': type_key, 'title': data['title'], 'model': model, 'data': data,
                'pins': pins, 'availability': availability}

    def _author(self):
        user, created = User.objects.get_or_create(email=REDAZIONE_EMAIL, defaults={'name': 'Redazione'})
        if created:
            user.set_unusable_password()
            user.save(update_fields=('password',))
        return user

    def _exists(self, draft):
        return draft['model'].objects.filter(
            card__title=draft['title'], card__translation_of__isnull=True,
        ).exists()

    def _create(self, draft, author):
        data = dict(draft['data'])
        card = Card.objects.create(
            title=data.pop('title'), body_html=data.pop('body_html'), author=author, is_published=False,
        )
        data.pop('is_published', None)
        draft['model'].objects.create(card=card, **data)
        replace_points(card, draft['pins'])
        save_availability(card, draft['availability'])
