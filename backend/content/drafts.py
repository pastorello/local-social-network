"""Cards written outside the app, loaded into it as drafts through its API
(spec content.md, «Seeding the archive from public sources», reinstated on
2026-10-26). `scripts/carica-schede` is this module's command line.

The author writes cards from published sources, one Markdown file per card in
a folder of their own, `<folder>/<type>/<slug>.md`: YAML frontmatter with the
type's fields, then the body, ending with *Fonti* and *Da verificare*. Every
card is posted to the endpoint the app's own form posts to, signed in as
whoever runs the command — so the sanitizer, the write serializers and the
pin caps are the rules here too, loading into production needs no deploy, and
the files never enter this repository, which is public: a draft is read by
someone who knows Gaeta before anyone else can read it.

The contract is the one `seed_drafts` had until 2026-10-22: drafts only;
never over a card that already exists — same type and title, published or
not, so a correction made in the app survives every later run; a broken file
is refused without stopping the others; `--dry-run` writes nothing.

This runs on the author's machine, not in the app: it imports nothing from
Django, and certifi, Markdown and PyYAML are dev requirements only.
"""

import argparse
import getpass
import json
import math
import os
import re
import ssl
import sys
import unicodedata
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import certifi
import markdown
import yaml

DEFAULT_API = 'https://viveregaeta.it'

# python.org's Python for macOS trusts no certificate authority until its
# «Install Certificates.command» has been run, and then every HTTPS request
# fails; certifi's bundle is the one pip itself uses.
TLS = ssl.create_default_context(cafile=certifi.where())


@dataclass(frozen=True)
class CardType:
    # The type's own keys in a file, named as its write serializer names them.
    fields: tuple[str, ...]
    max_pins: int
    # Why a file of this type may not bring pins, when it may not.
    no_pins: str = ''


COMMON_KEYS = ('type', 'title', 'language', 'pins')

# The types a file can be. Not dialetto (a word is written by people who speak
# it) nor libri (only a book the author vouches for), nor tours, which are made
# of cards that must exist first (content.md, «Not every type can be seeded»).
TYPES = {
    'chiese': CardType(fields=('from_outside',), max_pins=1),
    'feste': CardType(
        fields=('recurrence', 'programme'), max_pins=0,
        no_pins="il percorso di una processione lo disegna nell'app chi l'ha camminato",
    ),
    'luoghi': CardType(fields=('genre', 'how_to_get_there'), max_pins=1),
    'personaggi': CardType(fields=('life_dates',), max_pins=5),
    'ricette': CardType(
        fields=('ingredients', 'servings', 'procedure'), max_pins=0,
        # cosa-fare.md CF36.
        no_pins="un pin su una ricetta dice dove comprarla, cioè afferma qualcosa su un'attività",
    ),
}

# Every card ends with these two (content.md): the sources stay, and *Da
# verificare* is what the author closes before publishing.
REQUIRED_SECTIONS = ('Fonti', 'Da verificare')

FRONTMATTER = re.compile(r'\A---\n(?P<meta>.*?)\n---\n(?P<body>.*)\Z', re.S)
HEADING = re.compile(r'^(#+)\s', re.M)


class DraftError(Exception):
    """Why a file is refused, in the words its author reads."""


@dataclass
class Draft:
    path: Path
    type: str
    title: str
    # What is posted: the write serializer's fields, `pins` as the JSON string
    # the forms send beside their multipart data.
    payload: dict

    @property
    def name(self):
        return f'{self.type}/{self.path.name}'


def read_draft(path, type_key):
    text = path.read_text(encoding='utf-8').replace('\r\n', '\n')
    match = FRONTMATTER.match(text)
    if not match:
        raise DraftError('manca il frontmatter: il file deve cominciare con «---», i campi e un altro «---»')
    try:
        meta = yaml.safe_load(match['meta'])
    except yaml.YAMLError as error:
        raise DraftError(f'frontmatter non valido ({error})'.replace('\n', ' ')) from None
    if not isinstance(meta, dict):
        raise DraftError('frontmatter non valido: servono righe «campo: valore»')

    card_type = TYPES[type_key]
    if meta.get('type') != type_key:
        raise DraftError(f'type è {meta.get("type")!r}, ma il file sta nella cartella {type_key}/')
    # A feast's file may say `route: []`, and only that (see pins_of).
    allowed = {*COMMON_KEYS, *card_type.fields, *(('route',) if type_key == 'feste' else ())}
    unknown = sorted(set(meta) - allowed)
    if unknown:
        raise DraftError(f'campi che una scheda di {type_key} non ha: {", ".join(unknown)}')
    if meta.get('language') != 'it':
        raise DraftError(
            f"language è {meta.get('language')!r}: si caricano schede in italiano, "
            "una traduzione si comincia nell'app («traduci questo articolo in…»)"
        )

    title = meta.get('title')
    if not isinstance(title, str) or not title.strip():
        raise DraftError('manca il titolo (title)')
    title = ' '.join(title.split())
    if len(title) > 200:
        raise DraftError(f'titolo di {len(title)} caratteri: al massimo 200')

    payload = {'title': title, 'body_html': body_html(match['body']), 'is_published': False}
    for name in card_type.fields:
        value = meta.get(name)
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (str, int, float)):
            raise DraftError(f'{name} deve essere un testo')
        payload[name] = str(value).strip()
    if type_key == 'luoghi' and not payload.get('genre'):
        raise DraftError('manca il genere (genre)')

    pins = pins_of(meta, type_key)
    if card_type.max_pins:
        payload['pins'] = json.dumps(pins)
    return Draft(path, type_key, title, payload)


def body_html(body):
    """The body as the HTML a form would post. The API sanitizes it like any
    other (content/sanitize.py): this only has to be what the author meant."""
    levels = {len(hashes) for hashes in HEADING.findall(body)}
    if levels - {2, 3}:
        raise DraftError(
            'nel corpo si usano solo intestazioni ## e ###: il titolo della scheda è già il titolo della pagina'
        )
    missing = [s for s in REQUIRED_SECTIONS if not re.search(rf'^## {re.escape(s)}[ \t]*$', body, re.M)]
    if missing:
        raise DraftError(f'manca la sezione {" e ".join(f"«## {s}»" for s in missing)}')
    return markdown.markdown(body.strip())


def pins_of(meta, type_key):
    card_type = TYPES[type_key]
    pins = meta.get('pins') or []
    route = meta.get('route') or []
    if not isinstance(pins, list):
        raise DraftError('pins deve essere una lista')
    if (pins or route) and not card_type.max_pins:
        raise DraftError(f'{"route" if route else "pins"} va lasciato vuoto: {card_type.no_pins}')
    if len(pins) > card_type.max_pins:
        raise DraftError(f'{len(pins)} pin: una scheda di {type_key} ne ha al massimo {card_type.max_pins}')
    clean = []
    for pin in pins:
        if not isinstance(pin, dict) or set(pin) - {'lat', 'lng', 'label'} or not all(
            _coordinate(pin.get(axis), bound) for axis, bound in (('lat', 90), ('lng', 180))
        ):
            raise DraftError(f'pin non valido: {pin!r} (servono lat, lng e, se vuoi, label)')
        clean.append({'lat': float(pin['lat']), 'lng': float(pin['lng']), 'label': str(pin.get('label') or '').strip()})
    return clean


def _coordinate(value, bound):
    return (
        isinstance(value, (int, float)) and not isinstance(value, bool)
        and math.isfinite(value) and -bound <= value <= bound
    )


def read_folder(folder, types=None, only=None):
    """Every card file under `folder`, read: the drafts, the files refused
    with why, and the subfolders that are not a type loaded from here."""
    drafts, refused = [], []
    for type_key in sorted(TYPES):
        directory = folder / type_key
        if (types and type_key not in types) or not directory.is_dir():
            continue
        for path in sorted(directory.glob('*.md')):
            if only and path.stem not in only:
                continue
            try:
                drafts.append(read_draft(path, type_key))
            except DraftError as error:
                refused.append((f'{type_key}/{path.name}', str(error)))
    ignored = sorted(
        p.name for p in folder.iterdir() if p.is_dir() and p.name not in TYPES and not p.name.startswith('.')
    )
    return drafts, refused, ignored


def title_key(type_key, title):
    """Two titles name the same card when they differ only in capitals,
    spacing or which apostrophe was typed."""
    folded = unicodedata.normalize('NFKC', title).casefold()
    folded = re.sub(r"[’‘ʼ`´]", "'", folded)
    return type_key, ' '.join(folded.split())


@dataclass
class Plan:
    create: list
    # (draft, 'pubblicata' or 'bozza'): what the archive already holds.
    skip: list
    # (file, why).
    refuse: list


def make_plan(drafts, refused, existing, genres):
    """What a run would do. `existing` maps a title_key to the state of the
    card already holding it; `genres` is the site's genre slugs, or None when
    no luogo is in the batch."""
    by_title = {}
    for draft in drafts:
        by_title.setdefault(title_key(draft.type, draft.title), []).append(draft)

    plan = Plan(create=[], skip=[], refuse=list(refused))
    for draft in drafts:
        key = title_key(draft.type, draft.title)
        twins = [other for other in by_title[key] if other is not draft]
        if twins:
            # One thing in the world, one card (content.md): which of the two
            # is right is the author's call, not the command's.
            plan.refuse.append((draft.name, f'stesso titolo di {twins[0].name}'))
        elif key in existing:
            plan.skip.append((draft, existing[key]))
        elif draft.type == 'luoghi' and draft.payload['genre'] not in genres:
            plan.refuse.append((
                draft.name,
                f'il genere «{draft.payload["genre"]}» non esiste su questo sito '
                f'(ci sono: {", ".join(sorted(genres))})',
            ))
        else:
            plan.create.append(draft)
    plan.refuse.sort()
    return plan


class ApiError(Exception):
    pass


class Api:
    """The few calls a run makes, over the standard library. The base is the
    site's address: the API answers under /api/ on the same origin."""

    def __init__(self, base):
        self.base = base.rstrip('/')
        self.access = self.refresh = None

    def request(self, method, path, data=None):
        headers = {'Accept': 'application/json', 'User-Agent': 'carica-schede'}
        body = None
        if data is not None:
            body = json.dumps(data).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        if self.access:
            headers['Authorization'] = f'Bearer {self.access}'
        request = urllib.request.Request(self.base + path, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=30, context=TLS) as response:
                raw = response.read()
        except urllib.error.HTTPError as error:
            raise ApiError(_error_text(error)) from None
        except urllib.error.URLError as error:
            raise ApiError(f'{self.base} non risponde ({error.reason})') from None
        return json.loads(raw) if raw else None

    def get_all(self, path):
        # Page by page by number, never through `next`: that URL is built by
        # the server from its own idea of its host.
        results, page = [], 1
        while True:
            data = self.request('GET', f'{path}?page_size=100&page={page}')
            results += data['results']
            if not data.get('next'):
                return results
            page += 1

    def login(self, email, password):
        tokens = self.request('POST', '/api/users/login/', {'email': email, 'password': password})
        self.access, self.refresh = tokens['access'], tokens['refresh']

    def logout(self):
        # Blacklists this run's refresh token (TD-20), as the app's «Esci» does.
        refresh, self.access, self.refresh = self.refresh, None, None
        if refresh:
            try:
                self.request('POST', '/api/users/logout/', {'refresh': refresh})
            except ApiError:
                pass  # the token runs out on its own


def _error_text(error):
    try:
        body = json.loads(error.read() or b'{}')
    except ValueError:
        body = {}
    if not isinstance(body, dict):
        body = {}
    # The API's errors are {detail, fields} (backend/exceptions.py).
    parts = [str(body['detail'])] if body.get('detail') else []
    for name, messages in (body.get('fields') or {}).items():
        parts.append(f'{name}: {" ".join(map(str, messages)) if isinstance(messages, list) else messages}')
    return f'{"; ".join(parts) or "errore"} (HTTP {error.code})'


def existing_titles(api, types, signed_in):
    """The titles the archive already holds, for the types in the batch: the
    published cards, which anyone may list, and — signed in — the reader's
    own cards and every draft the map shows them, which for an admin is
    every draft with a place (map.md M5)."""
    found = {}
    for type_key in types:
        for item in api.get_all(f'/api/{type_key}/'):
            found[title_key(type_key, item['title'])] = 'pubblicata'
    if signed_in:
        rows = [row for row in api.get_all('/api/content/mine/') if row['translation_of'] is None]
        rows += api.request('GET', '/api/map/features/')
        for row in rows:
            if row['type'] in types:
                state = 'pubblicata' if row['is_published'] else 'bozza'
                found.setdefault(title_key(row['type'], row['title']), state)
    return found


def print_plan(plan, folder, ignored, out):
    counts = {}
    for draft in plan.create:
        counts.setdefault(draft.type, [0, 0, 0])[0] += 1
    for draft, _ in plan.skip:
        counts.setdefault(draft.type, [0, 0, 0])[1] += 1
    for name, _ in plan.refuse:
        counts.setdefault(name.split('/')[0], [0, 0, 0])[2] += 1

    print(f'Schede in {folder}:', file=out)
    for type_key in sorted(counts):
        create, skip, refuse = counts[type_key]
        parts = [f'{create} da creare']
        if skip:
            parts.append(f'{skip} già nell\'archivio')
        if refuse:
            parts.append(f'{refuse} rifiutate')
        print(f'  {type_key:<12}{" · ".join(parts)}', file=out)
    if plan.refuse:
        print(f'\nRifiutate ({len(plan.refuse)}), non caricate:', file=out)
        for name, why in plan.refuse:
            print(f'  {name}: {why}', file=out)
    if plan.skip:
        print(f'\nGià nell\'archivio, saltate ({len(plan.skip)}):', file=out)
        for draft, state in plan.skip:
            print(f'  {draft.name}: «{draft.title}», {state}', file=out)
    for name in ignored:
        print(f'\nIgnorata la cartella {name}/: non è un tipo che si carica da qui.', file=out)


def create_all(api, drafts, out):
    """Posts every draft; one that fails does not stop the others, and a
    second run finds the ones that went in and skips them."""
    failed = 0
    for draft in drafts:
        try:
            card = api.request('POST', f'/api/{draft.type}/', draft.payload)
        except ApiError as error:
            failed += 1
            print(f'  NON CREATA  {draft.name}: {error}', file=out)
        else:
            print(f'  creata      {draft.name} → {api.base}/{draft.type}/{card["id"]}', file=out)
    return failed


def main(argv=None, out=sys.stdout):
    parser = argparse.ArgumentParser(
        prog='scripts/carica-schede',
        description='Carica come bozze, via API, le schede Markdown di una cartella '
                    '(chiese/, feste/, luoghi/, personaggi/, ricette/).',
    )
    parser.add_argument('folder', type=Path, help='la cartella che contiene le cartelle dei tipi')
    parser.add_argument('--api', default=os.environ.get('VG_API', DEFAULT_API),
                        help=f'il sito su cui caricare (predefinito: {DEFAULT_API})')
    parser.add_argument('--dry-run', action='store_true',
                        help='mostra che cosa entrerebbe, senza login e senza scrivere nulla')
    parser.add_argument('--type', action='append', dest='types', choices=sorted(TYPES),
                        help='solo questo tipo (ripetibile)')
    parser.add_argument('--only', action='append', metavar='SLUG',
                        help='solo questo file, il nome senza .md (ripetibile)')
    parser.add_argument('--email', default=os.environ.get('VG_EMAIL'),
                        help="l'e-mail con cui entri nel sito (altrimenti te la chiede)")
    args = parser.parse_args(argv)

    folder = args.folder.expanduser().resolve()
    if not folder.is_dir():
        parser.error(f'{folder} non è una cartella')
    drafts, refused, ignored = read_folder(folder, args.types, args.only)
    if not drafts and not refused:
        print(f'Nessuna scheda in {folder}: le schede stanno in {", ".join(f"{t}/" for t in TYPES)}', file=out)
        return 1

    api = Api(args.api)
    try:
        types = sorted({draft.type for draft in drafts})
        genres = None
        if 'luoghi' in types:
            genres = {genre['slug'] for genre in api.request('GET', '/api/luoghi/generi/')}
        if not args.dry_run:
            email = args.email or input('E-mail: ').strip()
            api.login(email, os.environ.get('VG_PASSWORD') or getpass.getpass('Password: '))
        plan = make_plan(drafts, refused, existing_titles(api, types, signed_in=not args.dry_run), genres)
        print_plan(plan, folder, ignored, out)

        if args.dry_run:
            print(
                '\nProva: niente è stato scritto. Senza login si vedono solo le schede pubblicate; '
                'le tue bozze le controlla il caricamento vero, prima di chiederti conferma.',
                file=out,
            )
        elif not plan.create:
            print('\nNiente da creare.', file=out)
        elif input(f'\nCreo {len(plan.create)} bozze su {api.base}, firmate da {email}? [s/N] ').strip().lower() in (
            's', 'si', 'sì',
        ):
            print(file=out)
            failed = create_all(api, plan.create, out)
            print(f'\n{len(plan.create) - failed} bozze create. Le trovi in «Le mie schede».', file=out)
            if failed:
                return 1
        else:
            print('Nessuna scrittura.', file=out)
    except ApiError as error:
        print(f'\nErrore: {error}', file=out)
        return 2
    except KeyboardInterrupt:
        print('\nInterrotto: le bozze già create restano, e il prossimo giro le salta.', file=out)
        return 130
    finally:
        api.logout()
    return 1 if plan.refuse else 0


if __name__ == '__main__':
    sys.exit(main())
