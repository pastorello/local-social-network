"""Demo content, for seeing «Cosa si può fare qui» full (spec cosa-fare.md
Part −1, D8).

**Not the archive.** Every card it makes is titled `[DEMO] …`, says in its
own text that it is invented, and is signed by a demo account with no usable
password. Its places are fictional, its hours are a sample, and it carries no
images: a generated picture of a real place reads as a photograph the moment
it is screenshotted (D8). `--remove` takes everything it made away again, and
nothing else.

**It refuses to run outside DEBUG**, like `seed_e2e`: demo cards in a real
database would be published fiction.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from account.models import User
from chiese.models import Chiesa
from content.models import Availability, Card, MapFeature
from feste.models import Feste
from itinerari.models import Intent, Itinerario, Stop
from luoghi.models import Genre, Luogo
from ricette.models import Ricetta

PREFIX = '[DEMO] '
DEMO_EMAIL = 'demo@vivere-gaeta.local'
BODY = (
    '<p>Scheda <strong>dimostrativa</strong>: serve a vedere come appare la pagina, '
    'non racconta niente di vero. Si cancella con <code>seed_demo --remove</code>.</p>'
)

# A point inside each seeded zone (maps/migrations/0005 and 0006).
SERAPO = (41.2119, 13.5638)
MEDIEVALE = (41.2086, 13.5866)
ORLANDO = (41.2071, 13.5767)
SPACCATA = (41.2048, 13.5702)
PORTO_SALVO = (41.2304, 13.5664)
SANT_AGOSTINO = (41.2337, 13.4946)
ARIANA = (41.2132, 13.5418)
ARENAUTA = (41.2190, 13.5315)

LUOGHI = (
    ('Spiaggia di prova', 'spiaggia', SERAPO, 'A piedi dal lungomare.'),
    ('Belvedere di prova', 'punto-panoramico', ORLANDO, 'Dal sentiero del parco.'),
    ('Sentiero di prova', 'area-per-passeggiate', ORLANDO, ''),
    ('Museo di prova', 'museo', MEDIEVALE, ''),
    ('Torre di prova', 'monumento', MEDIEVALE, ''),
    ('Spiaggia lunga di prova', 'spiaggia', SANT_AGOSTINO, 'In auto, lungo la Flacca.'),
    ('Caletta di prova', 'spiaggia', ARIANA, 'Scendendo dalla Flacca.'),
    ('Spiaggia sotto la strada di prova', 'spiaggia', ARENAUTA, 'In auto, lungo la Flacca.'),
    ('Giardino di prova', 'parco', PORTO_SALVO, ''),
)
CHIESE = (
    ('Chiesa di prova del centro', MEDIEVALE, {
        'state': Availability.SERVICES, 'hours': 'Domenica alle 11, per la messa (orario di esempio).',
        'keeper': 'Parrocchia di prova', 'keeper_phone': '0771 000000',
    }, 'La facciata si vede dalla piazza; il porto è a due passi.'),
    ('Santuario di prova', SPACCATA, {
        'state': Availability.ON_REQUEST, 'keeper': 'Custode di prova',
    }, 'Il sentiero sulla roccia resta percorribile anche a chiesa chiusa.'),
    ('Chiesa di prova del borgo', PORTO_SALVO, None, ''),
)


class Command(BaseCommand):
    help = 'Fills the development database with [DEMO] cards, or removes them (--remove). DEBUG only.'

    def add_arguments(self, parser):
        parser.add_argument('--remove', action='store_true', help='Remove every [DEMO] card and stop.')

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('seed_demo writes invented, published cards and only runs with DJANGO_DEBUG=true.')

        removed = self._remove()
        if options['remove']:
            self.stdout.write(f'Removed {removed} demo card(s).')
            return

        author = self._author()
        places = {}
        for title, genre, where, how in LUOGHI:
            card = self._card(title, author)
            Luogo.objects.create(card=card, genre=Genre.objects.get(slug=genre), how_to_get_there=how)
            self._point(card, where)
            places[title] = card
        for title, where, availability, from_outside in CHIESE:
            card = self._card(title, author)
            Chiesa.objects.create(card=card, from_outside=from_outside)
            self._point(card, where)
            if availability:
                Availability.objects.create(card=card, **availability)
            places[title] = card

        festa = self._card('Festa di prova', author)
        Feste.objects.create(card=festa, recurrence='Ogni anno, data di esempio', programme='')
        for position, (lat, lng) in enumerate((PORTO_SALVO, (41.2200, 13.5690), SERAPO)):
            MapFeature.objects.create(card=festa, kind=MapFeature.ROUTE, position=position, lat=lat, lng=lng)

        for title in ('Tiella di prova', 'Zuppa di prova'):
            Ricetta.objects.create(card=self._card(title, author), servings='per 4 (esempio)')

        self._tour(author, 'Giro di prova nel centro', Itinerario.PERCORSO, 'citta',
                   [places['Torre di prova'], places['Chiesa di prova del centro'], places['Museo di prova']])
        self._tour(author, 'Raccolta di prova: il mare', Itinerario.RACCOLTA, 'mare',
                   [places['Spiaggia di prova'], places['Caletta di prova'],
                    places['Spiaggia sotto la strada di prova'], places['Spiaggia lunga di prova']])

        count = Card.objects.filter(title__startswith=PREFIX).count()
        self.stdout.write(f'Seeded {count} demo card(s); replaced {removed}. Remove them with --remove.')

    def _remove(self):
        cards = Card.objects.filter(title__startswith=PREFIX)
        count = cards.count()
        # Tours first: a stop protects nothing, but a tour's card is a card too.
        for card in cards:
            card.delete()
        return count

    def _author(self):
        user, created = User.objects.get_or_create(email=DEMO_EMAIL, defaults={'name': 'Redazione demo'})
        if created:
            user.set_unusable_password()
            user.save(update_fields=('password',))
        return user

    def _card(self, title, author):
        return Card.objects.create(title=PREFIX + title, body_html=BODY, author=author, is_published=True)

    def _point(self, card, where):
        MapFeature.objects.create(card=card, kind=MapFeature.POINT, position=0, lat=where[0], lng=where[1])

    def _tour(self, author, title, form, intent, stops):
        tour = Itinerario.objects.create(card=self._card(title, author), form=form, duration='Esempio')
        tour.intents.set(Intent.objects.filter(slug=intent))
        for position, card in enumerate(stops):
            Stop.objects.create(itinerario=tour, card=card, position=position)
