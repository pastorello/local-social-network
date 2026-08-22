import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('content', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Ricetta',
            fields=[
                ('card', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='ricette', serialize=False, to='content.card')),
                ('ingredients', models.TextField(blank=True, default='')),
                ('servings', models.CharField(blank=True, default='', max_length=50)),
                ('procedure', models.TextField(blank=True, default='')),
            ],
            options={
                'ordering': ('-card__created_at',),
            },
        ),
    ]
