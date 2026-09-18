from django.db import migrations

# "Che cosa ti va di fare?" (spec itinerari.md I5): the three the author named,
# in his order. Admins can rename, reorder and add intents in Django admin.
INTENTS = (
    ('Andare al mare', 'mare'),
    ('Mangiare', 'mangiare'),
    ('Scoprire la città', 'citta'),
)


def seed_intents(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    for position, (name, slug) in enumerate(INTENTS):
        Intent.objects.get_or_create(slug=slug, defaults={'name': name, 'position': position})


def unseed_intents(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    Intent.objects.filter(slug__in=[slug for _, slug in INTENTS], itinerari__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('itinerari', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_intents, unseed_intents),
    ]
