"""Deterministic fixtures for the Cypress suite (TD-04).

The e2e job drives the real SPA against the real API, so the data has to come
from somewhere. A management command rather than API calls from the specs: the
specs then read as user journeys instead of as setup, and one of the things
worth covering — that a *draft* stays invisible to a reader — cannot be set up
through the public API at all without first becoming the flow under test.

**It refuses to run outside DEBUG.** It creates accounts whose passwords are
written down in a spec file; that is fine for CI and a developer's laptop, and
would be a back door anywhere else.
"""

from datetime import time, timedelta
from io import BytesIO

from PIL import Image, ImageDraw
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from account.models import CollaborationRequest, User
from attivita.models import Attivita
from chiese.models import Chiesa
from common.when import tourist_day
from content.models import Availability, Card, MapFeature
from eventi.models import Evento
from feste.models import Edizione, Feste
from itinerari.models import Intent, Itinerario, Stop
from luoghi.models import Genre, Luogo
from maps.models import Overlay
from polls.models import Poll, PollOption, Vote
from reports.models import Category, IssueReport, Upvote
from ricette.models import Ricetta

PASSWORD = 'E2ePassw0rd!'
COLLABORATOR_EMAIL = 'collaboratore@e2e.test'
ADMIN_EMAIL = 'amministratore@e2e.test'

GAETA_LAT = 41.2172608
GAETA_LNG = 13.5625165
# On Serapo's beach, inside that zone's outline (maps/migrations/0006).
SERAPO_LAT = 41.2105
SERAPO_LNG = 13.5640
# The Castello Angioino-Aragonese, in Gaeta Medievale (maps/test_zone_aliases.py).
CASTELLO_LAT = 41.2075170
CASTELLO_LNG = 13.5845538

# Titles the specs assert on. They are deliberately unmistakable: a failure
# should say which fixture is missing, not "expected to find 3 items".
PUBLISHED_CHIESA = 'Chiesa E2E pubblicata'
DRAFT_CHIESA = 'Chiesa E2E in bozza'
PUBLISHED_LUOGO = 'Luogo E2E pubblicato'
PUBLISHED_CASTELLO = 'Castello E2E pubblicato'
PUBLISHED_ATTIVITA = 'Attività E2E pubblicata'
PUBLISHED_FESTA = 'Festa E2E pubblicata'
PUBLISHED_RICETTA = 'Ricetta E2E pubblicata'
PUBLISHED_TOUR = 'Itinerario E2E'
# Events (cosa-fare.md D9): one this week at the beach, one this week called
# off, and the feast's edition — dated from Gaeta's day on every run (CF7),
# so «Questa settimana» has something in it whenever the suite runs.
WEEK_EVENT = 'Evento E2E in settimana'
CANCELLED_EVENT = 'Evento E2E annullato'
PUBLIC_OVERLAY = 'Quartieri E2E'
STEERING_OVERLAY = 'Seggi E2E'
# The v1 flows (TD-04): a report somebody *else* filed, so supporting one is
# the ordinary act it is meant to be rather than a citizen upvoting himself,
# and an open poll to vote in.
OTHER_REPORT = 'Segnalazione E2E di un altro cittadino'
OPEN_POLL = 'Sondaggio E2E aperto'
POLL_OPTIONS = ('Lungomare Caboto', 'Monte Orlando')

QUARTIERI_GEOJSON = {
    'type': 'FeatureCollection',
    'features': [{
        'type': 'Feature',
        'properties': {'name': 'Quartiere E2E'},
        'geometry': {'type': 'Polygon', 'coordinates': [[
            [GAETA_LNG, GAETA_LAT],
            [GAETA_LNG + 0.006, GAETA_LAT],
            [GAETA_LNG + 0.006, GAETA_LAT + 0.006],
            [GAETA_LNG, GAETA_LAT],
        ]]},
    }],
}


class Command(BaseCommand):
    help = 'Seed the fixtures the Cypress suite expects (DEBUG only).'

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                'seed_e2e creates accounts with a published password and only runs with '
                'DJANGO_DEBUG=true.'
            )

        collaborator = self._user(COLLABORATOR_EMAIL, 'Collaboratore E2E')
        removed = self._clear_previous_runs(collaborator)
        # A Django superuser as well as role=admin, because that is what the
        # author is in production (docs/deploy.md creates one) and approving a
        # collaboration request is a Django admin action — the invite journey in
        # collabora.cy.ts signs in there as this account. `role` is still what
        # the product's own permissions read.
        admin = self._user(ADMIN_EMAIL, 'Amministratore E2E', role=User.ADMIN, staff=True)
        self._clear_invite_journeys()

        published = self._card(PUBLISHED_CHIESA, collaborator, is_published=True)
        Chiesa.objects.update_or_create(
            card=published,
            defaults={'from_outside': 'Il campanile si vede dal sagrato; il porto è a cinquanta metri.'},
        )
        self._point(published, 'Ingresso')
        # What is known about getting in (ADR-0008), so the article the a11y
        # gate reads carries the block a reader of a filled church card sees.
        Availability.objects.update_or_create(card=published, defaults={
            'state': Availability.SERVICES,
            'hours': 'Domenica alle 11, per la messa.',
            'keeper': 'Parrocchia E2E',
            'keeper_phone': '0771 000000',
        })

        # A beach, so /luoghi has a card on it — a genre chip, and the line
        # under the title that says where it is (review PR-6) — for the a11y
        # gate to measure in both layouts. In Serapo rather than Porto Salvo on
        # purpose: what the specs assert about that zone stays the church and
        # the feast's route.
        # It is also the tour's last stop, so it says how to reach it.
        luogo_card = self._card(PUBLISHED_LUOGO, collaborator, is_published=True)
        Luogo.objects.update_or_create(
            card=luogo_card, defaults={
                'genre': Genre.objects.get(slug='spiaggia'),
                'how_to_get_there': 'A piedi dal lungomare.',
            },
        )
        self._point(
            luogo_card, 'Battigia', dlat=SERAPO_LAT - GAETA_LAT, dlng=SERAPO_LNG - GAETA_LNG
        )

        # A bar on the same beach (ADR-0010), so /attivita has a row and a
        # chip, the map a layer, and «Cosa si può fare qui» a «Bere» under
        # Serapo — with its hours, for the a11y gate to read the card whole.
        attivita_card = self._card(PUBLISHED_ATTIVITA, collaborator, is_published=True)
        Attivita.objects.update_or_create(
            card=attivita_card, defaults={
                'kind': Attivita.BEVE, 'how_to_get_there': 'Sul lungomare, davanti alla spiaggia.',
            },
        )
        self._point(
            attivita_card, 'Ingresso', dlat=SERAPO_LAT + 0.0005 - GAETA_LAT, dlng=SERAPO_LNG - GAETA_LNG
        )
        Availability.objects.update_or_create(
            card=attivita_card, defaults={'hours': 'Tutti i giorni dalle 7 a mezzanotte.'},
        )

        # A castle in Gaeta Medievale, so «Scoprire la città» is in two zones
        # — the church's, Porto Salvo, and this — and the wizard «Cosa fare
        # adesso» asks «Dove?» for it (review PR-21): a step with one answer
        # is skipped, so with every intent in one zone `wizard.cy.ts` would
        # never see the second step.
        castello_card = self._card(PUBLISHED_CASTELLO, collaborator, is_published=True)
        Luogo.objects.update_or_create(
            card=castello_card, defaults={'genre': Genre.objects.get(slug='castello')},
        )
        self._point(
            castello_card, 'Ingresso',
            dlat=CASTELLO_LAT - GAETA_LAT, dlng=CASTELLO_LNG - GAETA_LNG,
        )

        # A draft must stay invisible to a reader — the one fixture that cannot
        # be created through the public API without making it the flow itself.
        draft = self._card(DRAFT_CHIESA, collaborator, is_published=False)
        Chiesa.objects.get_or_create(card=draft)
        self._point(draft, 'Non deve comparire', dlat=0.004)

        festa = self._card(PUBLISHED_FESTA, collaborator, is_published=True)
        Feste.objects.get_or_create(card=festa, defaults={'recurrence': 'Ogni 2 giugno'})
        if not festa.map_features.filter(kind=MapFeature.ROUTE).exists():
            MapFeature.objects.bulk_create([
                MapFeature(
                    card=festa, kind=MapFeature.ROUTE, position=index,
                    lat=GAETA_LAT + index * 0.002, lng=GAETA_LNG + index * 0.002,
                    label=f'Tappa {index + 1}',
                )
                for index in range(3)
            ])

        self._events(collaborator, luogo_card, festa)

        # A dish with no shop on the map: the end of a tour offers «Da
        # mangiare» only once a ricetta is published (review PR-7).
        ricetta = self._card(PUBLISHED_RICETTA, collaborator, is_published=True)
        Ricetta.objects.get_or_create(card=ricetta)

        # A percorso through the published church, feast and beach, under
        # "Scoprire la città", so `itinerari.cy.ts` can walk the B&B's journey
        # (spec itinerari.md I6/I7): welcome page, intent, tour, one stop at a
        # time, and what comes after the last (review PR-7) — the beach is in
        # Serapo, so «Cosa c'è qui intorno» has a zone to open. The church and
        # the feast's start share a point, as two stops on one square do.
        # The stops are reset every run, so a stray edit cannot reorder them.
        tour_card = self._card(PUBLISHED_TOUR, collaborator, is_published=True)
        tour, _ = Itinerario.objects.get_or_create(
            card=tour_card, defaults={'form': Itinerario.PERCORSO, 'duration': 'Un’ora'}
        )
        tour.intents.set(Intent.objects.filter(slug='citta'))
        tour.stops.all().delete()
        Stop.objects.bulk_create([
            Stop(itinerario=tour, position=0, card=published),
            Stop(itinerario=tour, position=1, card=festa, note='Si segue la processione.'),
            Stop(itinerario=tour, position=2, card=luogo_card),
        ])

        # The pair the overlay gate is asserted on: a reader must be offered the
        # first and must not learn that the second exists (ADR-0006).
        Overlay.objects.update_or_create(
            name=PUBLIC_OVERLAY,
            defaults={'kind': Overlay.VECTOR, 'visibility': Overlay.PUBLIC,
                      'geojson': QUARTIERI_GEOJSON, 'position': 0},
        )
        Overlay.objects.update_or_create(
            name=STEERING_OVERLAY,
            defaults={'kind': Overlay.VECTOR, 'visibility': Overlay.STEERING,
                      'geojson': QUARTIERI_GEOJSON, 'position': 1},
        )

        # A report the collaborator did not write, so `v1-flows.cy.ts` can
        # support one without the flow becoming "upvote your own".
        report, _ = IssueReport.objects.get_or_create(
            title=OTHER_REPORT,
            defaults={
                'author': admin,
                'category': Category.objects.order_by('name').first(),
                'description': 'Una segnalazione di prova, scritta da un altro cittadino.',
                'lat': GAETA_LAT,
                'lng': GAETA_LNG,
            },
        )
        # `upvotes_count` is denormalized (TD-19) and the clean-up above deletes
        # rows without going through the endpoint that maintains it, so the
        # counter is recomputed rather than assumed: a spec that asserts "1
        # sostegno" must mean it on every run, not on the first.
        IssueReport.objects.filter(pk=report.pk).update(upvotes_count=report.upvotes.count())

        poll, _ = Poll.objects.get_or_create(
            question=OPEN_POLL,
            defaults={'created_by': admin},
        )
        # `is_closed` is reset explicitly: a previous run may have closed it
        # through the admin flow, and a fixture that only exists the first time
        # is not a fixture.
        poll.is_closed = False
        poll.closes_at = None
        poll.save(update_fields=('is_closed', 'closes_at'))
        for position, text in enumerate(POLL_OPTIONS):
            PollOption.objects.get_or_create(
                poll=poll, text=text, defaults={'position': position}
            )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded: {collaborator.email}, {admin.email}, 6 published cards, 1 draft, 1 tour, '
            f'2 events and an edition this week, '
            f'2 overlays, 1 report ({report.upvotes_count} upvotes), 1 open poll; '
            f'cleared {removed} card(s) and every trace of previous v1 runs.'
        ))

    def _clear_previous_runs(self, collaborator):
        """Delete what earlier runs of the suite wrote, keeping the fixtures.

        `collaborator.cy.ts` creates a card per run and cannot clean up after
        itself — deleting through the UI would be a second flow riding on the
        one under test. Left alone, those cards accumulate: on a database that
        survives (a laptop, or any long-lived environment) they eventually push
        the fixtures off the first page of a 20-per-page list, and
        `reader.cy.ts` starts failing for a reason that has nothing to do with
        the code. CI never sees it, which makes it worse rather than better —
        a suite that is green there and red here is a suite nobody trusts.

        Everything this account owns is a test artefact by construction, so the
        rule is simply: keep the fixtures, drop the rest.
        """
        leftovers = Card.objects.filter(author=collaborator).exclude(
            title__in=(
                PUBLISHED_CHIESA, DRAFT_CHIESA, PUBLISHED_LUOGO, PUBLISHED_CASTELLO,
                PUBLISHED_ATTIVITA, PUBLISHED_FESTA, PUBLISHED_RICETTA, PUBLISHED_TOUR,
            )
        )
        count = leftovers.count()
        leftovers.delete()
        # The events the collaborator journey files, likewise. Nothing in the
        # app deletes an event (CF26); a test database is not the record.
        Evento.objects.filter(author=collaborator).exclude(
            title__in=(WEEK_EVENT, CANCELLED_EVENT)
        ).delete()

        # The v1 flows leave their own traces, and two of them are not merely
        # untidy: a vote is final by design (spec F3.2) and an upvote is a
        # toggle, so a second run would find the poll already voted and the
        # report already supported, and fail on the app behaving correctly.
        IssueReport.objects.filter(author=collaborator).delete()
        Vote.objects.filter(user=collaborator).delete()
        Upvote.objects.filter(user=collaborator).delete()

        return count

    def _events(self, collaborator, beach, festa):
        today = tourist_day()
        week, _ = Evento.objects.update_or_create(title=WEEK_EVENT, defaults={
            'start_date': today + timedelta(days=1), 'end_date': today + timedelta(days=1),
            'start_time': time(21), 'description': 'Musica sulla sabbia, porta un telo.',
            'link': 'https://example.com/programma', 'card': beach, 'lat': None, 'lng': None,
            'place_label': '', 'state': Evento.IN_PROGRAMMA, 'author': collaborator,
            'is_published': True,
        })
        # Its poster, so the a11y gate opens one (review PR-27b): drawn here,
        # once, rather than kept as a file in the repo.
        if not week.poster:
            week.poster.save('locandina-e2e.png', ContentFile(self._poster()), save=True)
        Evento.objects.update_or_create(title=CANCELLED_EVENT, defaults={
            'start_date': today + timedelta(days=2), 'end_date': today + timedelta(days=2),
            'start_time': None, 'description': '', 'link': '', 'card': None,
            'lat': GAETA_LAT, 'lng': GAETA_LNG, 'place_label': 'Piazza E2E',
            'state': Evento.ANNULLATO, 'author': collaborator, 'is_published': True,
        })
        feste = Feste.objects.get(card=festa)
        feste.editions.all().delete()
        Edizione.objects.create(
            festa=feste, start_date=today + timedelta(days=3), note='Processione alle 18.'
        )

    def _poster(self):
        image = Image.new('RGB', (600, 900), (15, 95, 115))
        draw = ImageDraw.Draw(image)
        draw.rectangle((40, 40, 560, 860), outline=(250, 247, 242), width=8)
        draw.text((80, 120), 'Evento E2E', fill=(250, 247, 242))
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        return buffer.getvalue()

    def _clear_invite_journeys(self):
        """collabora.cy.ts files requests on every run and, since 2026-09-10,
        follows one all the way to an account — each under a fresh address, so
        reruns never collide. Same rule as the collaborator's cards above: every
        request from an @e2e.test address, and every account the journey made,
        is a test artefact by construction, and a database that survives
        between runs should not collect them. The fixture accounts are not
        `invito-…`, and none of them files a request, so neither filter can
        reach one."""
        CollaborationRequest.objects.filter(email__endswith='@e2e.test').delete()
        User.objects.filter(email__startswith='invito-', email__endswith='@e2e.test').delete()

    def _user(self, email, name, role=User.CITIZEN, staff=False):
        user, _ = User.objects.get_or_create(email=email, defaults={'name': name})
        user.name = name
        user.role = role
        user.is_staff = staff
        user.is_superuser = staff
        user.set_password(PASSWORD)
        user.save()
        return user

    def _card(self, title, author, is_published):
        card, _ = Card.objects.get_or_create(
            title=title,
            defaults={'body_html': f'<p>Testo di {title}.</p>', 'author': author},
        )
        card.is_published = is_published
        card.save(update_fields=('is_published',))
        return card

    def _point(self, card, label, dlat=0.0, dlng=0.0):
        if card.map_features.filter(kind=MapFeature.POINT).exists():
            return
        MapFeature.objects.create(
            card=card, kind=MapFeature.POINT, lat=GAETA_LAT + dlat, lng=GAETA_LNG + dlng,
            label=label,
        )
