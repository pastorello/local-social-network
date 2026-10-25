from django.db import migrations

# The seeded genres in the reader's English (review PR-19a, spec
# translations.md T9): the Google place types they came from, as a reader
# meets them — singular on a card, plural as a heading. Only where the admin
# has not written them already.
NAMES_EN = {
    # slug: (name_en, name_plural_en)
    'spiaggia': ('Beach', 'Beaches'),
    'castello': ('Castle', 'Castles'),
    'monumento': ('Monument', 'Monuments'),
    'luogo-storico': ('Historic site', 'Historic sites'),
    'museo': ('Museum', 'Museums'),
    'punto-panoramico': ('Viewpoint', 'Viewpoints'),
    'area-per-passeggiate': ('Walking area', 'Walking areas'),
    'parco': ('Park', 'Parks'),
}


def seed(apps, schema_editor):
    Genre = apps.get_model('luoghi', 'Genre')
    for slug, (name_en, name_plural_en) in NAMES_EN.items():
        Genre.objects.filter(slug=slug, name_en='').update(name_en=name_en)
        Genre.objects.filter(slug=slug, name_plural_en='').update(name_plural_en=name_plural_en)


class Migration(migrations.Migration):

    dependencies = [('luoghi', '0003_genre_name_en_genre_name_plural_en')]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
