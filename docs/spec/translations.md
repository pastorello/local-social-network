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

## Open questions — raised 2026-09-07 by translating a real card

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

