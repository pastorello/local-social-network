from django.db import migrations

# The first names for «Dove sei?» (review of 2026-10-22, decision 3; spec
# cosa-fare.md Part −1, D6): what a guest calls the place they stand in, and
# the zone it is in. Data the author keeps in the admin from here on.
#
# **Every name was placed against 0006's outlines, not from memory**: on
# 2026-10-24 each one was looked up once on OpenStreetMap's Nominatim, and the
# place it names — the castle's node, the cathedral's outline, the beach, every
# vertex of the street — was tested inside the zones with `maps/zones.py`. Each
# lies wholly in the zone given here, and the nearest other zone is at least
# 37 m away (Piazza XIX Maggio, where three zones meet: D2 itself starts Porto
# Salvo there). `maps/test_zone_aliases.py` keeps the points and asserts it.
# The coordinates are derived from OpenStreetMap data, © OpenStreetMap
# contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
#
# **Left out, because they name two zones** — a guest at either end would be
# sent to the wrong one: «il porto» (the marina on Lungomare Caboto is in Porto
# Salvo, the harbour of Santa Maria and the Capitaneria are in Gaeta
# Medievale), «il molo» (OSM has no pier of that name in Gaeta, and both
# harbours have piers), «il lungomare Caboto» (it runs from the Annunziata, in
# Gaeta Medievale, to Formia) and «Via Firenze» (it is Serapo's border, D2).
# The author decides those.
#
# Ordered alphabetically, ignoring the article, so a guest scrolling the whole
# list finds a name where they expect it; ten apart, so one can go in between.

ALIASES = (
    ('i 300 gradini', 'arenauta'),
    ('Arenauta', 'arenauta'),
    ('Ariana', 'ariana'),
    ('il Borgo', 'porto-salvo'),
    ('il castello', 'gaeta-medievale'),
    ('la Cattedrale', 'gaeta-medievale'),
    ('Corso Cavour', 'porto-salvo'),
    ('il Duomo', 'gaeta-medievale'),
    ('Fontania', 'serapo'),
    ('la Grotta del Turco', 'montagna-spaccata'),
    ('il mausoleo di Planco', 'monte-orlando'),
    ('la Montagna Spaccata', 'montagna-spaccata'),
    ('Monte Orlando', 'monte-orlando'),
    ('Piazza Commestibili', 'gaeta-medievale'),
    ('Piazza Traniello', 'gaeta-medievale'),
    ('Piazza XIX Maggio', 'porto-salvo'),
    ('i Quaranta Remi', 'ariana'),
    ('San Vito', 'arenauta'),
    ("Sant'Agostino", 'piana-di-sant-agostino'),
    ('la Santissima Annunziata', 'gaeta-medievale'),
    ('il Santuario della Trinità', 'montagna-spaccata'),
    ('Serapo', 'serapo'),
    ('il Tempio di San Francesco', 'gaeta-medievale'),
    ('Via Indipendenza', 'porto-salvo'),
    ('Villa delle Sirene', 'porto-salvo'),
)


def seed(apps, schema_editor):
    Zona = apps.get_model('maps', 'Zona')
    ZonaAlias = apps.get_model('maps', 'ZonaAlias')
    zones = {zone.slug: zone for zone in Zona.objects.all()}
    for index, (name, slug) in enumerate(ALIASES):
        # A zone the author has removed takes its names with it, rather than
        # stopping the migration.
        if slug in zones:
            ZonaAlias.objects.get_or_create(name=name, defaults={'zona': zones[slug], 'position': (index + 1) * 10})


def unseed(apps, schema_editor):
    # Only a name still pointing where it was seeded: one the author has moved
    # to another zone since is theirs now.
    ZonaAlias = apps.get_model('maps', 'ZonaAlias')
    for name, slug in ALIASES:
        ZonaAlias.objects.filter(name=name, zona__slug=slug).delete()


class Migration(migrations.Migration):
    dependencies = [('maps', '0007_zonaalias')]

    operations = [migrations.RunPython(seed, unseed)]
