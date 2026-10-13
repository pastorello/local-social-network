from django.db import migrations

# The fourth activity (spec cosa-fare.md Part −1, D4): the viewpoints, the
# walks and the parks, which are neither the sea nor the old town. /benvenuto
# shows an intent only once a published tour carries it, so this changes
# nothing a guest sees until a collaborator writes such a tour.


def seed(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    Intent.objects.get_or_create(slug='camminare', defaults={
        'name': 'Camminare',
        'description': 'Belvederi, sentieri e parchi',
        'position': 3,
    })


def unseed(apps, schema_editor):
    apps.get_model('itinerari', 'Intent').objects.filter(slug='camminare', itinerari__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [('itinerari', '0005_stop_point_is_the_pin')]

    operations = [migrations.RunPython(seed, unseed)]
