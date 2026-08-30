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

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from account.models import User
from chiese.models import Chiesa
from content.models import Card, MapFeature
from feste.models import Feste
from maps.models import Overlay

PASSWORD = 'E2ePassw0rd!'
COLLABORATOR_EMAIL = 'collaboratore@e2e.test'
ADMIN_EMAIL = 'amministratore@e2e.test'

GAETA_LAT = 41.2172608
GAETA_LNG = 13.5625165

# Titles the specs assert on. They are deliberately unmistakable: a failure
# should say which fixture is missing, not "expected to find 3 items".
PUBLISHED_CHIESA = 'Chiesa E2E pubblicata'
DRAFT_CHIESA = 'Chiesa E2E in bozza'
PUBLISHED_FESTA = 'Festa E2E pubblicata'
PUBLIC_OVERLAY = 'Quartieri E2E'
STEERING_OVERLAY = 'Seggi E2E'

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
        admin = self._user(ADMIN_EMAIL, 'Amministratore E2E', role=User.ADMIN)

        published = self._card(PUBLISHED_CHIESA, collaborator, is_published=True)
        Chiesa.objects.get_or_create(card=published)
        self._point(published, 'Ingresso')

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

        self.stdout.write(self.style.SUCCESS(
            f'Seeded: {collaborator.email}, {admin.email}, 2 published cards, 1 draft, '
            f'2 overlays; cleared {removed} card(s) left by previous runs.'
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
            title__in=(PUBLISHED_CHIESA, DRAFT_CHIESA, PUBLISHED_FESTA)
        )
        count = leftovers.count()
        leftovers.delete()
        return count

    def _user(self, email, name, role=User.CITIZEN):
        user, _ = User.objects.get_or_create(email=email, defaults={'name': name})
        user.name = name
        user.role = role
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

    def _point(self, card, label, dlat=0.0):
        if card.map_features.filter(kind=MapFeature.POINT).exists():
            return
        MapFeature.objects.create(
            card=card, kind=MapFeature.POINT, lat=GAETA_LAT + dlat, lng=GAETA_LNG, label=label,
        )
