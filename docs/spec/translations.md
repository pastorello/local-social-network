# Translations

> Phase C4. The reason multilingual content is in scope at all: the end
> audience is tourists, including foreign ones.

## Requirements

- **T1 — Per-card translations.** A card's source language is Italian.
  Collaborators author translations per card (English first). A card that has a
  translation shows the reader a **language switch**.
- **T2 — Authoring entry point.** The collaborator's editor has a "traduci
  questo articolo in…" control that opens the empty target-language version
  alongside the source. This is a human-authoring workflow.
- **T3 — Machine-translation assistance** inside that editor is a *later*
  addition, explicitly not this phase.
- **T4 — UI language stays Italian** this phase (v1's N4 carries over). A
  multilingual **UI** is a declared later phase — it only makes sense once
  there are translated cards for a foreign reader to land on. *(For the
  reader's interface, superseded by T9 on 2026-10-25: the author decided not
  to wait for that threshold. The collaborator's surfaces stay Italian.)*

## Note

The translation unit is the card, not the field: a translation is a full
alternate rendering of one card, owned by the `content` core so every type
inherits it (ADR-0004). Which fields are translatable per type (e.g. a recipe's
ingredient names) is a content-modelling detail for C4, not decided here.

## Both answered — 2026-09-09

The two questions below were raised on 2026-09-07 by translating a real card
and put to the author on 2026-09-09. His answers are in the sections after
them; the questions are kept because the reasoning that produced them is what
makes the answers legible.

## The questions, as raised 2026-09-07

The C4 flow was built and tested against cards that had only text. Translating
a **real** one — a church with three photographs and a pin — turns two silences
in T2 into decisions somebody has to take. Neither is a defect against what
this file says; both are things it never said.

1. **A translation starts with no images and no map point.** "The empty
   target-language version" was written about *text*, and the code took it
   literally. So the English archive has no pictures until every photograph is
   uploaded a second time, and in a list the English card shows the colour
   tint D5 reserves for a card with no cover, beside the Italian one showing
   the photo. Three ways out, and they are not equivalent:
   - **copy** the images and points into the translation when it is created —
     simple, but it duplicates the bytes and lets the two drift apart;
   - **share** them — the translation reads the original's images and points
     rather than owning any. One upload, one truth, no drift. It also matches
     what the map already does, which is to treat a translation as *not* having
     a place of its own;
   - **leave it** — every language version is independent, and the cost is the
     re-upload.
2. **A translation is its own row in every list.** `/chiese` shows "Chiesa di
   Sant'Erasmo" and "Church of Sant'Erasmo" as two cards, to every reader, in
   whatever language they came for. The map deliberately does the opposite —
   `maps/features/` excludes translations because two rows would put "two pins
   on one doorstep" — and the same argument applies to a list of covers.
   Whether the lists should filter by language, show only originals with the
   switch on the card, or stay as they are, is undecided; what is certain is
   that the map's exclusion and the list's inclusion cannot both be right by
   accident.

Until these are answered, the authoring flow works and the result is what the
code says it is. The reason they are written here rather than fixed is that
each one changes what a reader sees, which is this file's business and not a
maintenance decision.


## T5 — The photographs and the map belong to the original — decided 2026-09-09

**Share**, of the three ways out above. In the author's words, *"le foto sono
sempre uniche per tutte le lingue"* — one photograph per place, whatever the
language.

- A translation **shows** the original's images and map features and owns
  none. `content/serializers.py::media_source` is the one place that resolves
  this, and every type's Read serializer goes through it.
- A write that would give a translation its own is **refused, not ignored** —
  `content/api_helpers.py::reject_media_on_translation`, one guard behind
  `save_images`, `remove_images`, `replace_points` and feste's route. An upload
  that vanished silently would read as a rejected file.
- The collaborator's form on a translation shows the photographs and the map
  read-only, with the reason, and its upload strip is gone. The cover order is
  an editorial decision (D5) taken once, on the original.

**Captions are the exception, and they are not built.** `CardImage.caption`
exists, is serialized, and **no form writes it** — every caption in the archive
is empty. The author's call for the day they become writable: the translation
gets *the caption fields and not the images*. That means the caption cannot
stay a column on the shared `CardImage` row, which is one value where two
languages need two; it moves to a per (image, language) table. Building that
now, for a field nobody can fill, would be a table with no rows in it.

## T6 — One thing in the world, one row — decided 2026-09-09

The lists follow the map: **a translation is not a second row**. Every type's
public list filters `card__translation_of__isnull=True`, so the archive shows
one card per place and the reader who opens it changes language with the
switch that is already there.

`mine/` deliberately does **not** filter: it is the only way back to a
translation a collaborator has not finished, and hiding it there would strand
work rather than tidy a list.

## T7 — The Italian name is the identity — decided 2026-09-09

Asked what a translated *title* should be, the author gave the reason before
the rule: a tourist who reads everything in English then stands in front of a
sign, a map, a poster — all of them in Italian — and is lost. So:

- the **heading of every card is the Italian name**, on the English version
  too. `original_title` is on every type's Read serializer; on an original it
  is that card's own title, so a reader of the code needs no special case;
- the translated name is a **subtitle under it**, which is what the
  translation's own `title` field now means. The collaborator's form says so:
  on a translation the label reads "Nome tradotto", with the hint that the
  title stays Italian;
- the article carries `lang` and the Italian heading carries `lang="it"`,
  which is **WCAG 3.1.2 Language of Parts** (AA, so inside ADR-0005's bar) —
  the document is `lang="it"` and an English card had been saying nothing.
  This was not asked for; it is the accessibility consequence of the decision.

What this does not do is translate the *body* differently — the prose is the
translator's, whole. Only the name is treated as an address rather than as
text.

## T8 — A translation is published with its original, never without — decided 2026-09-19

A published translation shows its original's title, photographs and place
(T5, T7), so it cannot be public while the original is not. Both halves:

- **Not before.** Publishing a translation whose original is a draft is
  refused ("Si pubblica dopo la scheda originale, che è ancora in bozza") —
  found by the 2026-09-18 debugging sweep, built the same day
  (`content/api_helpers.py::require_original_published`, every type).
- **Not after.** Unpublishing the original **takes its translations down
  too** — the author's decision on 2026-09-19. `Card.save()` does it, so
  Django admin obeys it as well as every type's API. Deleting an original
  unpublishes its translations rather than deleting them: `translation_of` is
  `SET_NULL`, and without this they would stay up as originals of their own,
  with no photographs and no place. Their text is the translator's to discard.

Republishing the original does **not** republish its translations: each goes
back up as its own decision, since the original may have changed while it was
down.

## T9 — The reader's interface in two languages — decided 2026-10-22, built 2026-10-25 (review PR-19a)

T4 kept the interface Italian until there were translated cards for a foreign
reader to land on. The author decided on 2026-10-22 not to wait for that
threshold ([review](../review-2026-10-22.md), decision 5): the **reader's**
interface speaks Italian and English now, with a visible switch. README.md's
non-goal «multilingual UI» is closed by its own dated note in review PR-19c;
«machine translation» stays a non-goal — the English is written by hand,
interface and cards alike (T3).

- **What speaks the reader's language**: the pill and *Menu*, the home in both
  layouts, `/benvenuto` and the wizard, the lists and their chips, a card's
  page around its text («Dove si trova», «Se la trovi chiusa», «Visitare»,
  «Come arrivarci (apre Google Maps)», «Condividi», the way back), a tour and
  its guided mode, «Cosa si può fare qui» and «Dove sei?», the events and an
  event's page, *Il progetto* with its story, the toasts a reader meets, the
  empty states, the map's own name and zoom buttons, the window's title and
  so what «Condividi» sends.
- **What stays Italian**: the collaborator's surfaces — login, the request
  form, invitations and passwords, profile, users, *Le mie schede*, every form
  that writes a card or an event, reports, polls — which are marked
  `lang="it"` where they sit inside an English page (`meta.italian` on their
  routes, the controls on a card's page), so a screen reader reads them as
  Italian (WCAG 3.1.2). And **every card's own text**: the interface
  translates around the content, never the content (T1, T5).
- **The switch is «IT · EN»**, in the pill before *Accedi* or the avatar on a
  wide screen and in *Menu* on a phone, where the pill has no room left. Text,
  not flags: a flag is a nation, not a language. Two buttons, the current one
  `aria-pressed` and filled — not underlined, which is the menu's mark for the
  page one is on — each named in itself («Italiano», «English») with its
  `lang`.
- **The choice lives in the address and in this browser.** While English is
  on, every page carries `?lang=en`, so a link copied from the address bar or
  sent with «Condividi» carries the language; Italian carries nothing, and its
  address stays the canonical one. A link that names a language switches to
  it. The choice is also kept in `localStorage` (`lang`, read and written
  inside try/catch) for the next visit. With neither, a browser whose
  `navigator.language` starts with `en` gets English and every other one
  Italian; that guess is not stored, only a choice is. `<html lang>` follows
  (WCAG 3.1.1).
- **Names the API serves**: `name_en` on `Zona`, `Genre` and `Intent`
  (`Genre` has `name_plural_en` too, since a genre is a heading in the plural),
  blank by default, and the SPA reads the Italian when it is blank
  (`lib/i18n::localName`). A zone is a proper name and keeps its Italian one:
  blank is the rule there. The seeded genres and intents got English names in
  a migration, only where none was written; the kinds of business are closed
  in code, so theirs are too (`Attivita.KIND_NAMES_EN`). The intents'
  *descriptions* were still Italian, marked so: they are review PR-19b's
  (`description_en` since, T10).
- **Dates** are `Intl`'s in the reader's locale (`en-GB`: «Saturday 26
  September», the 24-hour clock). An event's or a feast's date keeps its
  weekday in both (CF34, `lib/when.ts`); the archive's line and the day hours
  were reported keep the shape content.md gave them, without one
  (`lib/availability.ts::formatDay`). A calendar day is still read in UTC,
  which no zone can move — the same day as Gaeta's; an instant, a card's
  byline, is read in `Europe/Rome`.
- **T7's `lang` moves from the article to its parts.** The article now holds
  the interface's words — its headings, the byline, the way back — in the
  reader's language, which `<html lang>` already says; so the card's language
  is marked on what is the card's: its body, its translated name, its own
  fields. The Italian heading keeps `lang="it"`, as do the original's
  photographs' alternative texts, pins, stops and reported hours.

**How it is built**: a typed dictionary per area in
`frontend/src/lib/i18n/messages/`, not vue-i18n, which added 18.8 kB (gzip) to
the JavaScript of the first paint (11.1 kB in its runtime-only build) against
a gate that holds that paint on a phone (TD-52). With both languages in it,
the first paint's dictionaries added 5.5 kB, and that cost the gate's pages
80–150 ms of LCP on Lighthouse's phone — as much as a 5.5 kB string in the
same place did. So the areas of the first paint keep their English apart, in
`<area>.en.ts` files gathered by `english.ts` into a chunk only an English
reader loads (before the first paint, or before the switch turns English on),
and what only a later page says travels with that page: the entry grew by
2.5 kB and the gate's medians are the base's (1.84–1.85 s). `index.html`
asks for that chunk beside the entry when the address, the reader's last
choice or the browser says English (`vite.config.ts::preloadEnglish`), so
English does not wait for the entry to decide first.

**The performance gate measures each language on purpose** (2026-10-25):
its four pages in Italian — the Linux runner's Chrome asks for `en-US`, so
`lighthouserc.yml` tells it Italian — and `/?lang=en` and `/cosa-fare?lang=en`
in English. #147's first run had measured everything in English by accident,
over the budget on `/cosa-fare` (2.60 s). Two things were found on the way:
the English chunk was fetched only once the entry had run (now preloaded),
and the map's data, asked for at mount, came back before the first paint on
half the runs and was counted on the way to the page's largest text — on
main too, where `/cosa-fare` measured 2.29–2.30 s on every CI run. The map's
data, the archive's line and the wizard's answers are asked for after the
first paint now, as the map itself was already drawn: 1.84 s in Italian and
1.98–1.99 s in English, on every one of 18 runs on a Mac. The compiler
checks that both languages have every key and take the same arguments, and
`lib/i18n/__tests__/messages.spec.ts` checks it again on every message file.
Review PR-19b shows a card's translation on its own page in English and marks
the translated cards in the lists (T10, built the same day); PR-19c closes the
non-goal and runs the accessibility gate in both languages.

## T10 — A card in the reader's language, at its own address — decided 2026-10-22, built 2026-10-25 (review PR-19b)

T9 put the interface in the reader's language and left the cards where C4 had
them: a translation was a page of its own, reached from the original's
language switch. The author's decision of 2026-10-22 ([review](../review-2026-10-22.md),
decision 5) asks for the card to follow the reader too, without a second
address.

- **The original's address is the card's, in both languages.** It stays the
  canonical one, as Italian's addresses do (T9). A reader in English reads the
  original's **published** English version there: found in the original's
  `translations`, the cards whose `translation_of` it is
  (`lib/readerCard.ts::englishOf`), and fetched with the original before the
  page mounts for the types that have a place (`lib/cardFirst.ts`, so the
  panel is born in English, review PR-10's reason), or by the page for the
  others, which then waits for it rather than painting the Italian and
  swapping it (`composables/useReaderCard.ts`). A reader who switches
  language on a card already open keeps it on screen until the other version
  has come. All of it — the card's own text, its translated name, its fields,
  «Se la trovi chiusa» — is the translation's; its photographs, its place,
  its hours and a tour's stops are the original's, as T5 says.
- **No published English version** — none, or only a draft — and the page
  shows the Italian, saying first, under the byline: «Not yet translated into
  English — the Italian text follows». The body and the card's own fields are
  marked `lang="it"`, as T9 already marked them. A version that could not be
  fetched shows the Italian too, without the line: it is not true.
- **The heading is the Italian name, always** (T7, unchanged): the English
  version's name is the subtitle under it.
- **The card's language switch (T1) is the reader's language now.** It names
  the other language on the original's address (`?lang=en`, `?lang=it`), which
  the router turns into that language, interface and card alike (T9: «a link
  that names a language switches to it») — instead of leading to the
  translation's own address, which the canonical address makes a second copy.
  It lists only a version a reader can open, published; an author's draft is
  reached from the card's controls, «Vai alla traduzione», as before. A
  translation's own address still opens it as it is — *Le mie schede* and
  «Traduci» lead there, and its form is there.
- **«EN» marks a card a reader in English can read in English**, beside its
  title, in the lists of every type (the businesses' included), the home's
  sheet and column, «Cosa si può fare qui» and the wizard's third step (its
  places, tours, feasts and dishes), and the feasts' editions among the
  events — an event is not a card and has no other language
  (`components/content/EnglishMark.vue`). For a reader in Italian it says
  nothing: every card is in Italian already. Two letters for the eye, «Available
  in English» to a screen reader and on hover, marked `lang="en"` beside a
  title marked Italian. **It counts only a published translation**, never a
  draft, whoever asks — the mark is a promise to every reader: `has_en` on
  every type's read serializer (so on each type's list and page), on
  `/api/map/features/` and on an edition in `/api/eventi/`, all from
  `content/serializers.py::has_english` (the map with one query of its own),
  and `content/test_has_en.py` checks it with a draft, for its author too.
- **The intents' lines speak English too**: `Intent.description_en`, blank by
  default and the Italian then, marked so — as `name_en` (T9). The seeded
  lines were rewritten in both languages by the author's decision of
  2026-10-25 (`itinerari/migrations/0011`, the review's «Decisioni del 25
  ottobre 2026»): an intent leads to places, businesses *and* tours, and the
  seeds said one of them. A line the author corrected in the admin keeps his
  words, and gets no English written against words he did not write.
- **Not done here**: a translation's own address is not sent on to the
  original's — it is where a collaborator writes it. And no language but
  English: a version in a language the interface does not speak is not
  offered by the switch.

