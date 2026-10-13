from django.db import migrations

# The first six zones (spec cosa-fare.md Part −1, D2): OpenStreetMap's five
# named places in Gaeta plus Monte Orlando. **Drafts, drawn by hand on
# 2026-10-13** around OSM's points (fetched that day) and the park's extent —
# not copied from any boundary, because no official one is published. The
# author corrects them in the admin. [longitude, latitude], rings closed.
#
# Reference points: Gaeta Medievale 41.20855 N 13.58658 E · Monte Orlando
# summit 41.20709 13.57667 (park 41.2038–41.2128 N, 13.5692–13.5825 E) ·
# Montagna Spaccata 41.20476 13.57024 · Serapo 41.21196 13.56379 · Porto Salvo
# 41.23045 13.56637 · Piana di Sant'Agostino 41.23373 13.49461.


def ring(*points):
    return {'type': 'Polygon', 'coordinates': [[*points, points[0]]]}


ZONES = (
    ('gaeta-medievale', 'Gaeta Medievale', ring(
        [13.5800, 41.2125], [13.5850, 41.2112], [13.5915, 41.2085], [13.5920, 41.2050],
        [13.5880, 41.2030], [13.5830, 41.2045], [13.5805, 41.2080],
    )),
    ('serapo', 'Serapo', ring(
        [13.5550, 41.2085], [13.5585, 41.2140], [13.5650, 41.2165], [13.5700, 41.2145],
        [13.5718, 41.2128], [13.5692, 41.2095], [13.5690, 41.2072], [13.5640, 41.2070],
        [13.5590, 41.2075],
    )),
    ('monte-orlando', 'Monte Orlando', ring(
        [13.5692, 41.2095], [13.5718, 41.2128], [13.5800, 41.2125], [13.5805, 41.2080],
        [13.5830, 41.2045], [13.5795, 41.2035], [13.5730, 41.2036], [13.5725, 41.2075],
        [13.5692, 41.2085],
    )),
    ('montagna-spaccata', 'Montagna Spaccata', ring(
        [13.5675, 41.2050], [13.5680, 41.2035], [13.5730, 41.2036], [13.5725, 41.2075],
        [13.5692, 41.2085], [13.5690, 41.2072],
    )),
    ('porto-salvo', 'Porto Salvo', ring(
        [13.5600, 41.2160], [13.5600, 41.2380], [13.5720, 41.2400], [13.5820, 41.2300],
        [13.5780, 41.2180], [13.5718, 41.2128], [13.5700, 41.2145], [13.5650, 41.2165],
    )),
    ('piana-di-sant-agostino', "Piana di Sant'Agostino", ring(
        [13.4845, 41.2280], [13.4870, 41.2420], [13.5050, 41.2450], [13.5120, 41.2330],
        [13.5060, 41.2250], [13.4920, 41.2240],
    )),
)


def seed(apps, schema_editor):
    Zona = apps.get_model('maps', 'Zona')
    for position, (slug, name, geometry) in enumerate(ZONES):
        Zona.objects.get_or_create(slug=slug, defaults={
            'name': name, 'position': position, 'geometry': geometry,
        })


def unseed(apps, schema_editor):
    apps.get_model('maps', 'Zona').objects.filter(slug__in=[slug for slug, _, _ in ZONES]).delete()


class Migration(migrations.Migration):
    dependencies = [('maps', '0004_zona')]

    operations = [migrations.RunPython(seed, unseed)]
