from django.db import migrations

# The seeded intents in the reader's English (review PR-19a, spec
# translations.md T9), written by hand — the interface's words are not machine
# translated either. Gerunds, so each reads as an answer to «What do you feel
# like doing?» and as a heading on «What there is to do here». Only where the
# admin has not written one already, and only on the intent the seed made.
NAMES_EN = {
    'mare': 'Going to the beach',
    'mangiare': 'Eating',
    'citta': 'Discovering the town',
    'camminare': 'Walking',
    'bere': 'Having a drink',
}


def seed(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    for slug, name_en in NAMES_EN.items():
        Intent.objects.filter(slug=slug, name_en='').update(name_en=name_en)


class Migration(migrations.Migration):

    dependencies = [('itinerari', '0008_intent_name_en')]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
