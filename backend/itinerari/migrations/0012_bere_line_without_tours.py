from django.db import migrations

# «Bere» without «e gli itinerari» (decided by the author on 2026-10-26, the
# review's «Decisioni del 26 ottobre 2026»). A tour never stops at a business —
# a tour that picked one bar would rank them (cosa-fare.md CF40), and
# itinerari/rules.py refuses one as a stop — so under «Bere» the tail 0011
# gave every line promised what no tour can give. The other four keep it.
#
# Each language changes only while it still holds 0011's words, as 0011
# changed a line only while it held its seed: a correction made in the admin
# stays. The same rule runs backwards.

BERE = 'bere'
BEFORE = (
    'I locali per un caffè, un bicchiere, un aperitivo, e gli itinerari',
    'Bars for a coffee, a glass of wine, an aperitivo, and tours',
)
AFTER = (
    'I locali per un caffè, un bicchiere, un aperitivo',
    'Bars for a coffee, a glass of wine, an aperitivo',
)


def _move(apps, source, target):
    Intent = apps.get_model('itinerari', 'Intent')
    Intent.objects.filter(slug=BERE, description=source[0]).update(description=target[0])
    Intent.objects.filter(slug=BERE, description_en=source[1]).update(description_en=target[1])


def rewrite(apps, schema_editor):
    _move(apps, BEFORE, AFTER)


def restore(apps, schema_editor):
    _move(apps, AFTER, BEFORE)


class Migration(migrations.Migration):
    dependencies = [('itinerari', '0011_intent_lines_rewritten')]

    operations = [migrations.RunPython(rewrite, restore)]
