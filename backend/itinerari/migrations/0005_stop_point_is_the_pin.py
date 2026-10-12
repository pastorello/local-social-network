# A stop names its pin, not the pin's position in the card's list (TD-50).
# Added, filled from the old index, and only then is the index dropped, so a
# tour written before this keeps the bakery its author chose.

import django.db.models.deletion
from django.db import migrations, models


def index_to_pin(apps, schema_editor):
    Stop = apps.get_model('itinerari', 'Stop')
    MapFeature = apps.get_model('content', 'MapFeature')
    for stop in Stop.objects.exclude(point_index=None):
        # The order the read side has always used: the card's points by
        # position (ties by id, which replace_points never produced).
        points = list(
            MapFeature.objects.filter(card_id=stop.card_id, kind='point').order_by('position', 'id')
        )
        if stop.point_index < len(points):
            stop.point = points[stop.point_index]
            stop.save(update_fields=['point'])


def pin_to_index(apps, schema_editor):
    Stop = apps.get_model('itinerari', 'Stop')
    MapFeature = apps.get_model('content', 'MapFeature')
    for stop in Stop.objects.exclude(point=None):
        ids = list(
            MapFeature.objects.filter(card_id=stop.card_id, kind='point')
            .order_by('position', 'id')
            .values_list('id', flat=True)
        )
        if stop.point_id in ids:
            stop.point_index = ids.index(stop.point_id)
            stop.save(update_fields=['point_index'])


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0001_initial'),
        ('itinerari', '0004_seed_intent_descriptions'),
    ]

    operations = [
        migrations.AddField(
            model_name='stop',
            name='point',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='stops', to='content.mapfeature', verbose_name='punto',
            ),
        ),
        migrations.RunPython(index_to_pin, pin_to_index),
        migrations.RemoveField(
            model_name='stop',
            name='point_index',
        ),
    ]
