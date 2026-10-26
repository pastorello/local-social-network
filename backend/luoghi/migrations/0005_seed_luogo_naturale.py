from django.db import migrations

# A ninth genre, decided by the author on 2026-10-23 (spec content.md): the
# natural twin of `luogo-storico` — caves, rocks, hills, an oasis; what is
# worth seeing by nature rather than by hand. Beaches, parks and viewpoints
# stay where they are. Google's place type is `natural_feature`.
#
# Position 4 is museo's too, and the genres are ordered by position, then
# name: «Luogo naturale» lands right after «Luogo storico» (3) without
# renumbering the rows an admin may already have reordered.
SLUG = 'luogo-naturale'


def seed(apps, schema_editor):
    Genre = apps.get_model('luoghi', 'Genre')
    Genre.objects.get_or_create(
        slug=SLUG,
        defaults={
            'name': 'Luogo naturale', 'name_plural': 'Luoghi naturali',
            'name_en': 'Natural site', 'name_plural_en': 'Natural sites',
            'position': 4,
        },
    )


def unseed(apps, schema_editor):
    Genre = apps.get_model('luoghi', 'Genre')
    Genre.objects.filter(slug=SLUG, luoghi__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [('luoghi', '0004_seed_genre_names_en')]

    operations = [migrations.RunPython(seed, unseed)]
