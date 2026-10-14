"""The zones redrawn on OpenStreetMap (maps/migrations/0006): a zone is redrawn
only while it still holds 0005's draft, so a correction made in the admin
survives the migration — and its reverse."""

import importlib

import pytest
from django.apps import apps

from maps.models import Zona
from maps.zones import geometry_contains

pytestmark = pytest.mark.django_db

redrawn = importlib.import_module('maps.migrations.0006_zones_redrawn_on_osm')

CORRECTED = {'type': 'Polygon', 'coordinates': [[
    [13.560, 41.208], [13.570, 41.208], [13.570, 41.214], [13.560, 41.214], [13.560, 41.208],
]]}


def _as_after_0005():
    """The table as 0005 left it: the six drafts, nothing added."""
    Zona.objects.filter(slug__in=[slug for slug, _, _ in redrawn.ADDED]).delete()
    for slug, geometry in redrawn.SEEDED.items():
        Zona.objects.filter(slug=slug).update(geometry=geometry)


def _geometries():
    return {zone.slug: zone.geometry for zone in Zona.objects.all()}


def test_the_database_holds_the_redrawn_zones():
    expected = {slug: geometry for slug, _, geometry in redrawn.REDRAWN + redrawn.ADDED}

    assert _geometries() == expected


def test_a_zone_the_author_corrected_is_not_redrawn():
    _as_after_0005()
    Zona.objects.filter(slug='serapo').update(geometry=CORRECTED)

    redrawn.redraw(apps, None)

    geometries = _geometries()
    assert geometries['serapo'] == CORRECTED
    for slug, _, geometry in redrawn.REDRAWN:
        if slug != 'serapo':
            assert geometries[slug] == geometry, slug
    assert {'ariana', 'arenauta'} <= set(geometries)


def test_the_added_zones_go_after_the_others_and_keep_a_slug_already_taken():
    _as_after_0005()
    Zona.objects.create(slug='ariana', name='Ariana', position=2, geometry=CORRECTED)

    redrawn.redraw(apps, None)

    ariana = Zona.objects.get(slug='ariana')
    assert (ariana.position, ariana.geometry) == (2, CORRECTED)
    assert Zona.objects.get(slug='arenauta').position > Zona.objects.get(slug='piana-di-sant-agostino').position


def test_the_reverse_restores_the_drafts_and_leaves_corrections_alone():
    Zona.objects.filter(slug='serapo').update(geometry=CORRECTED)
    Zona.objects.filter(slug='arenauta').update(geometry=CORRECTED)

    redrawn.undraw(apps, None)

    geometries = _geometries()
    assert geometries['serapo'] == CORRECTED
    assert geometries['arenauta'] == CORRECTED
    assert 'ariana' not in geometries
    for slug, geometry in redrawn.SEEDED.items():
        if slug != 'serapo':
            assert geometries[slug] == geometry, slug


def test_no_two_zones_overlap():
    # A grid over the whole comune, about 90 m apart: no point is in two zones.
    zones = list(Zona.objects.all())
    lats = [41.2030 + step * 0.0007 for step in range(70)]
    lngs = [13.4840 + step * 0.0011 for step in range(100)]

    crowded = [
        (lat, lng) for lat in lats for lng in lngs
        if sum(geometry_contains(zone.geometry, lat, lng) for zone in zones) > 1
    ]

    assert crowded == []
