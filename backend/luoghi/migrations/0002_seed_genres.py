from django.db import migrations

# The starting genres (spec content.md, luoghi, 2026-09-11): Google Maps' own
# place taxonomy, restricted to what Gaeta has, in Italian. The Google type is
# noted beside each so the next person adding one knows where the list came
# from. Admins can rename, reorder and add genres in Django admin.
GENRES = (
    # (name, name_plural, slug, Google place type)
    ('Spiaggia', 'Spiagge', 'spiaggia', 'beach'),
    ('Castello', 'Castelli', 'castello', 'castle'),
    ('Monumento', 'Monumenti', 'monumento', 'monument'),
    ('Luogo storico', 'Luoghi storici', 'luogo-storico', 'historical_place'),
    ('Museo', 'Musei', 'museo', 'museum / history_museum'),
    ('Punto panoramico', 'Punti panoramici', 'punto-panoramico', 'scenic_spot'),
    ('Area per passeggiate', 'Aree per passeggiate', 'area-per-passeggiate', 'hiking_area'),
    ('Parco', 'Parchi', 'parco', 'park'),
)


def seed_genres(apps, schema_editor):
    Genre = apps.get_model('luoghi', 'Genre')
    for position, (name, name_plural, slug, _google_type) in enumerate(GENRES):
        Genre.objects.get_or_create(
            slug=slug, defaults={'name': name, 'name_plural': name_plural, 'position': position},
        )


def unseed_genres(apps, schema_editor):
    Genre = apps.get_model('luoghi', 'Genre')
    Genre.objects.filter(slug__in=[slug for _, _, slug, _ in GENRES], luoghi__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('luoghi', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_genres, unseed_genres),
    ]
