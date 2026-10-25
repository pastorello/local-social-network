from django.db import migrations

# The fifth activity (ADR-0010, decided 2026-10-23): a drink by the harbour,
# probably the commonest thing a visitor does in Gaeta after dark. «Cosa si
# può fare qui» files a business *dove si beve* under it; /benvenuto shows an
# intent only once a published tour carries it, so — like Camminare — this
# changes nothing a guest sees until there is something behind it.


def seed(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    Intent.objects.get_or_create(slug='bere', defaults={
        'name': 'Bere',
        'description': 'Un bicchiere, un caffè, un aperitivo',
        'position': 4,
    })


def unseed(apps, schema_editor):
    apps.get_model('itinerari', 'Intent').objects.filter(slug='bere', itinerari__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [('itinerari', '0006_seed_camminare')]

    operations = [migrations.RunPython(seed, unseed)]
