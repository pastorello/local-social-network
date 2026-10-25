from django.db import migrations

# The intents' lines rewritten, in both of the reader's languages (decided by
# the author on 2026-10-25, review PR-19b). An intent leads to places, to
# businesses and to tours — a beach, a bar, a walk with its stops — and the
# lines seeded by 0004, 0006 and 0007 said only one of them: «Scoprire la
# città» promised tours and nothing else, the rest only places. Each line now
# names what is behind the answer, in the words the archive uses for it (the
# kinds' «dove si mangia» and «dove si compra», the bars as *Il progetto*'s
# «locali»), and every line ends on the tours. The English is written by hand
# against the Italian (T3: nothing is machine translated).
#
# **A line is rewritten only if it still holds its seed exactly**, as maps'
# 0006 redraws a zone: one the author has corrected in the admin is left as it
# is — and so is its English, which would be written against words he did not
# write. The same rule runs backwards.
#
# **Two lines at most on a 375 px phone**, in either language, as the seeds
# were: the line sits under each answer of the wizard's first question, and
# the home's sheet must show its first answer whole on the first screen
# (reader.cy.ts). Measured in the card, 2026-10-25; a third line pushed
# «Andare al mare» 4.5 px off an 812 px screen.

LINES = {
    # slug: (the seed, the Italian, the English)
    'mare': (
        'Le spiagge, da Serapo a Sant’Agostino',
        'Le spiagge, da Serapo a Sant’Agostino, e gli itinerari',
        'The beaches, from Serapo to Sant’Agostino, and tours',
    ),
    'mangiare': (
        'I piatti tipici, e dove trovarli',
        'I piatti tipici, dove si mangia e dove si compra, e gli itinerari',
        'The typical dishes, where to eat and where to buy, and tours',
    ),
    'citta': (
        'Itinerari a piedi nel centro storico',
        'Chiese, castello, musei e monumenti, e gli itinerari',
        'Churches, the castle, museums and monuments, and tours',
    ),
    'camminare': (
        'Belvederi, sentieri e parchi',
        'Belvederi, sentieri e parchi, e gli itinerari per camminare',
        'Viewpoints, paths and parks, and tours for walking',
    ),
    'bere': (
        'Un bicchiere, un caffè, un aperitivo',
        'I locali per un caffè, un bicchiere, un aperitivo, e gli itinerari',
        'Bars for a coffee, a glass of wine, an aperitivo, and tours',
    ),
}


def rewrite(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    for slug, (seeded, italian, english) in LINES.items():
        Intent.objects.filter(slug=slug, description=seeded).update(description=italian)
        Intent.objects.filter(slug=slug, description=italian, description_en='').update(
            description_en=english,
        )


def restore(apps, schema_editor):
    Intent = apps.get_model('itinerari', 'Intent')
    for slug, (seeded, italian, english) in LINES.items():
        Intent.objects.filter(slug=slug, description_en=english).update(description_en='')
        Intent.objects.filter(slug=slug, description=italian).update(description=seeded)


class Migration(migrations.Migration):
    dependencies = [('itinerari', '0010_intent_description_en')]

    operations = [migrations.RunPython(rewrite, restore)]
