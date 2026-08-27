# ADR-0006: Overlay visibility is a server-side gate, default-confidential

## Status

Accepted

## Date

2026-08-27

## Context

Phase C5 puts overlays on the map (spec [map.md](../spec/map.md) M3): quartieri
and seggi elettorali as GeoJSON polygons, historical maps of Gaeta as
georeferenced rasters. One of them is different from the rest — the **seggi**
overlay is confidential, visible only to the steering tier
([politics.md](../spec/politics.md)), whose defining requirement is that
"nobody should know it exists".

That spec already separates the two things people conflate: **confidentiality**
(the interface never reveals the tier) and **enforcement** (the server checks
who is asking). It says, in as many words: build the gate first, hide the door
second. What it does not say is where the gate lives, and that is a choice with
consequences — the overlay list is a single public endpoint serving four
audiences, and every future steering feature will want the same shape.

The `is_steering` flag has existed since C1 with no consumer. C5 is its first
one.

## Decision

**One field on the model, one queryset method, one place.**

`Overlay.visibility` is `public` | `collaborators` | `steering`, and
`Overlay.objects.visible_to(user)` is the only code that reads it. Every
request goes through it; it resolves the tier against the database row, never
against anything the client sent.

Two properties come with it:

- **The default is `steering`, the most restrictive tier.** A newly created
  overlay is confidential until an admin explicitly widens it. Publishing is
  therefore always a deliberate act and never a side effect of creating,
  importing or copying one (spec map.md M4).
- **`visibility` is not serialized.** The queryset has already decided what
  this reader may see, so the field would tell the client only something it
  must not act on — and a client that never learns the vocabulary cannot leak
  it. `OverlaySerializer` omits it, and the SPA has no concept of overlay
  visibility at all: it draws the list it is handed.

## Alternatives considered

**A boolean `is_public`.** Two states, and the codebase already has a third
audience: approved collaborators, who see internal overlays but are not in the
steering tier. Encoding three tiers in one boolean plus a second boolean is how
you end up with `is_public=False, is_secret=False` meaning something nobody can
name.

**A separate `seggi` app or endpoint, hidden by obscurity.** Rejected on the
spec's own reasoning: a hidden endpoint with no server check is unprotected,
however well hidden. It also fragments a mechanism the spec deliberately
describes as one ("no second map; overlays and layers compose on the one map"),
and doubles the surface where the next confidential layer could be forgotten.

**Filtering client-side from a full list.** Never seriously on the table; the
audit's v1 finding — client role is cosmetic, the server re-checks — is exactly
the pattern being extended here.

## Consequences

- The steering tier is now enforced in one function. A future steering feature
  (the exit-poll tooling politics.md parks as future work) should reuse
  `visible_to`'s shape rather than invent a second check — and if it needs a
  different one, that is the moment for its own ADR.
- Anyone adding a field to `OverlaySerializer` must ask whether it leaks the
  gate. The serializer carries that warning in its docstring, and
  `maps/tests.py` asserts the word `visibility` never appears in a response
  body — a test that fails loudly if someone adds it back "for the frontend".
- Admins get no bulk-publish action in Django admin, on purpose: making a
  layer public stays one row, one explicit edit.
- The reader-facing cost is that a non-steering user cannot tell a hidden
  overlay from an absent one. That is the point, and it is why the SPA renders
  no "Sovrapposizioni" section at all when the list comes back empty.
