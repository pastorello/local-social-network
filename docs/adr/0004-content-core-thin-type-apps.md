# ADR-0004: One content core, thin Django apps per content type

## Status

Accepted

## Date

2026-08-21

## Context

The v2 spec (docs/spec/) turns the product into a cultural archive with many
content types — feste, chiese, ricette, personaggi storici, dialetto — and the
list grew twice *during the interview that produced the spec*. Every type is,
in the author's own words, "an article of blog, each with a different variant":
rich text, images, translations, and optionally map features, plus a handful of
type-specific fields (a recurrence and a route; ingredients and servings; a
term and its meaning).

The author also stated an explicit architectural requirement: Django apps as
separable modules, reusable in future projects — "ogni modulo deve essere
separato perché così in un futuro possiamo utilizzare dei moduli".

Those two forces pull in opposite directions if taken naively: full
independence means rebuilding rich text, sanitization, translations and map
linkage five times; full unification means one generic CMS model that is
nobody's module.

## Decision

A common `content` app owns what every card shares — sanitized rich-text body,
images (via the existing `common/images.py` pipeline), translations, map
features, author and publication state. Each content type is a **thin Django
app** (`feste`, `chiese`, `ricette`, `personaggi`, `dialetto`) that adds only
its own fields and endpoints on top of that core.

The acceptance bar, written into the spec: a new type must cost days, not a
new module.

## Alternatives considered

**Five fully independent apps.** Maximally separable, honors the reuse wish
literally — and copies the hardest, most security-sensitive machinery
(sanitization, translations) five times. The upload-hardening episode (TD-12:
avatars silently missing every control report photos had) is this codebase's
own evidence of what copy-paste parity does over time.

**One generic model with JSON variant fields.** Cheapest to build, no
migrations per type — and no real module boundaries at all, weak typing on
exactly the fields that differ, and the reuse story dies: nobody extracts "the
app where everything is a JSON blob" into another project.

## Consequences

- A type app depends on `content`; extracting one into another project means
  taking `content` (and `common/`) along. That is the honest unit of reuse,
  and it mirrors the existing `common/images.py` ↔ apps relationship.
- The core is a chokepoint by design: a sanitization fix lands once and covers
  every type. The converse also holds — a core bug touches everything, which
  is what the test suite around the core is for.
- Type apps stay boring: models with a OneToOne/FK to the core card plus their
  own fields, a serializer, a couple of endpoints. Reviewing the sixth type
  should be a small diff.
