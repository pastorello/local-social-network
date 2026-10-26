from django.db import migrations

# «Camminare» folds into «Scoprire la città» (decided by the author on
# 2026-10-26, the review's «Decisioni del 26 ottobre 2026»): viewpoints, walks
# and parks are the town's too, and two answers that said almost the same
# thing made the first question longer than it needs to be. The genres that
# led to «Camminare» lead to «Scoprire la città» since (frontend
# lib/intents.ts), and so do its tours: each one tagged «Camminare» is tagged
# «Scoprire la città» before the intent goes, so no tour loses its answer.
#
# «Scoprire la città»'s line names the walk too — in each language only while
# it still holds 0011's words, as 0011 and 0012 do: a correction made in the
# admin stays. Two lines on a 375 px phone, as test_intent_lines.py holds.
#
# Backwards, «Camminare» comes back as 0006, 0009 and 0011 left it, and the
# line goes back; which tours wore it is not known any more, so they stay
# with «Scoprire la città».

WALK = 'camminare'
TOWN = 'citta'
TOWN_BEFORE = (
    'Chiese, castello, musei e monumenti, e gli itinerari',
    'Churches, the castle, museums and monuments, and tours',
)
TOWN_AFTER = (
    'Chiese, castello, musei, belvederi e sentieri, e gli itinerari',
    'Churches, the castle, museums, viewpoints and paths, and tours',
)
WALK_AS_SEEDED = {
    'name': 'Camminare',
    'name_en': 'Walking',
    'description': 'Belvederi, sentieri e parchi, e gli itinerari per camminare',
    'description_en': 'Viewpoints, paths and parks, and tours for walking',
    'position': 3,
}


def _line(apps, source, target):
    Intent = apps.get_model('itinerari', 'Intent')
    Intent.objects.filter(slug=TOWN, description=source[0]).update(description=target[0])
    Intent.objects.filter(slug=TOWN, description_en=source[1]).update(description_en=target[1])


def fold(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    walk = Intent.objects.filter(slug=WALK).first()
    if walk is None:
        return
    town = Intent.objects.filter(slug=TOWN).first()
    if town is not None:
        for tour in walk.itinerari.all():
            tour.intents.add(town)
        _line(apps, TOWN_BEFORE, TOWN_AFTER)
    walk.delete()


def unfold(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    Intent.objects.get_or_create(slug=WALK, defaults=WALK_AS_SEEDED)
    _line(apps, TOWN_AFTER, TOWN_BEFORE)


class Migration(migrations.Migration):
    dependencies = [('itinerari', '0012_bere_line_without_tours')]

    operations = [migrations.RunPython(fold, unfold)]
