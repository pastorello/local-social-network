import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('content', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Personaggio',
            fields=[
                ('card', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='personaggi', serialize=False, to='content.card')),
                ('life_dates', models.CharField(blank=True, default='', max_length=200)),
            ],
            options={
                'ordering': ('-card__created_at',),
            },
        ),
    ]
