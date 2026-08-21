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
