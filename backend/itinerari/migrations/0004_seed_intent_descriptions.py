from django.db import migrations

# The lines the itinerari canvas drew under the three choices (2026-09-11).
# Only where the admin has not written one already.
DESCRIPTIONS = {
    'mare': 'Le spiagge, da Serapo a Sant’Agostino',
    'mangiare': 'I piatti tipici, e dove trovarli',
    'citta': 'Itinerari a piedi nel centro storico',
}


def seed(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    for slug, description in DESCRIPTIONS.items():
        Intent.objects.filter(slug=slug, description='').update(description=description)


class Migration(migrations.Migration):
    dependencies = [('itinerari', '0003_intent_description')]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
