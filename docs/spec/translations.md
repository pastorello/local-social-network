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
  there are translated cards for a foreign reader to land on.

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
