from django.db import migrations

# Two of the names 0008 left to the author, who decided them on 2026-10-24
# (spec cosa-fare.md Part −1, D6): each could name a place in either of two
# zones, and the author chose the one a guest who says it is shown.
#
# - «il porto» → Porto Salvo: the harbour OpenStreetMap calls *Porto di Gaeta*,
#   the marina on Lungomare Caboto (node 8922784305). The harbour of Santa
#   Maria, in Gaeta Medievale, is «il molo».
# - «il molo» → Gaeta Medievale: the pier of the harbour of Santa Maria, under
#   the old town (way 1382988502, unnamed on OSM, like the town's other piers).
#
# Placed against 0006's outlines like 0008's names, on 2026-10-24: the
# harbour's node lies in Porto Salvo, 115 m from the nearest other zone, and
# every vertex of the pier in Gaeta Medievale, with no other zone within 200 m.
# `maps/test_zone_aliases.py` keeps the points. Derived from OpenStreetMap
# data, © OpenStreetMap contributors, ODbL 1.0
# (https://www.openstreetmap.org/copyright).
#
# «il lungomare Caboto» and «Via Firenze» stay out, by the same decision: they
# run along two zones, and a guest there chooses from the chips.
#
# Each goes where 0008's alphabetical order has room for it, between two names
# ten apart. A name the author has already added in the admin is left as the
# author set it.

ALIASES = (
    ('il molo', 'gaeta-medievale', 115),
    ('il porto', 'porto-salvo', 165),
)


def seed(apps, schema_editor):
    Zona = apps.get_model('maps', 'Zona')
    ZonaAlias = apps.get_model('maps', 'ZonaAlias')
    zones = {zone.slug: zone for zone in Zona.objects.all()}
    for name, slug, position in ALIASES:
        if slug in zones:
            ZonaAlias.objects.get_or_create(name=name, defaults={'zona': zones[slug], 'position': position})


def unseed(apps, schema_editor):
    ZonaAlias = apps.get_model('maps', 'ZonaAlias')
    for name, slug, _ in ALIASES:
        ZonaAlias.objects.filter(name=name, zona__slug=slug).delete()


class Migration(migrations.Migration):
    dependencies = [('maps', '0008_seed_zone_aliases')]

    operations = [migrations.RunPython(seed, unseed)]
