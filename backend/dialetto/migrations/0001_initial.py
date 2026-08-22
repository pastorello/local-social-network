import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('content', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Termine',
            fields=[
                ('card', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='dialetto', serialize=False, to='content.card')),
                ('term', models.CharField(max_length=200)),
                ('meaning', models.TextField()),
                ('example_usage', models.TextField(blank=True, default='')),
            ],
            options={
                'ordering': ('-card__created_at',),
            },
        ),
    ]
