// The reader-facing lines more than one surface says, kept here so they are
// said the same way everywhere and change in one place (review of 2026-10-22,
// PR-2; the interface's second language will be written against this file) —
// and, since review PR-12, the prose the author reviews word by word.

// What Vivere Gaeta is, in one line: the first words of the home, in both of
// its layouts, for the reader who did not arrive from a B&B's card — and,
// since review PR-14, the line under /benvenuto's question for the one who did.
export const PRESENTATION =
  'Gaeta raccontata da chi ci vive: luoghi, chiese, feste, ricette, itinerari.'

// Il progetto's story (review PR-12, design.md D21's note of 2026-10-24): who
// writes the archive, why, and for whom, in the register of the cards (D6).
// One surface says it, but it is the author's to correct, so it is corrected
// here. Every fact in it is one the spec states — README.md and
// docs/spec/README.md for what the archive is and who it is for, accounts.md
// for the collaborators chosen one by one, content.md for writing from
// published sources, design.md's "Not a wayfinding app" for why — and nothing
// in it is a name, a number or an endorsement (D11).
export const PROJECT_STORY = [
  'Vivere Gaeta è un archivio della città, scritto da chi la vive. Le feste e le loro processioni, le chiese, i luoghi, le ricette e dove trovarle, i personaggi storici, le parole del dialetto, i libri che ne parlano, gli itinerari per percorrerla: ogni scheda porta il nome di chi l’ha scritta, uno dei collaboratori che l’autore ha scelto uno per uno. Quando una scheda nasce da ciò che altri hanno già pubblicato, è scritta con parole proprie e dice le sue fonti.',
  'Non è un navigatore: per la strada ci sono già le mappe del telefono, a cui le schede rimandano. È fatto per conoscere il posto in cui ci si trova — davanti a una chiesa chiusa, al bar la sera, o lontano da Gaeta, quando viene voglia di rileggere una storia di casa. È scritto per chi viene qui per qualche giorno e vuole viverla davvero, e per chi ci è nato e la porta con sé. Si legge da chiunque, senza account.',
] as const
