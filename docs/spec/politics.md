# Steering tier & political tooling

> The steering **tier** is granted in phase C1 (a capability on a trusted
> account) and the **seggi overlay** it unlocks is built in C5. Everything
> *else* here — the tools — is **future, out of the current build**, recorded
> now so the direction is not lost.

## The tier

Beyond writing content, some admin-selected trusted people also do city
politics: turning the problems and situations surfaced on the platform into
something the local administration can be made to act on. They get capabilities
ordinary collaborators do not — starting with the seggi overlay, and later the
tooling below.

## "Nobody should know it exists" — precisely

The author's requirement is **confidentiality of the tier**, and it must be
separated from **enforcement**, because conflating them gives false security:

- **Confidentiality (what the app must do):** the interface stays normal. No
  badge, label, menu entry, user-directory marker, or API field ever reveals
  that the tier exists or who holds it. To every reader and ordinary
  collaborator, a steering account looks like a collaborator account.
- **Enforcement (what actually protects it):** server-side role/capability
  checks on every steering-only endpoint and layer — the same pattern the audit
  found solid in v1 (client role is cosmetic; the server re-checks against the
  DB). Hiding the feature is **not** the protection; the gate is. A hidden
  endpoint with no server check is unprotected, however well hidden.

This distinction is load-bearing: build the gate first, hide the door second.

## Future tooling (NOT in the current build)

Recorded for direction only. Each of these is its own spec and its own PR when
its day comes, and each is **out of scope** of the v2 build order.

- **Real-time exit polls.** During a Gaeta election, each trusted person is
  assigned a seggio and reports how the vote is going, against a list of
  **candidates grouped by party and coalition**. The tool aggregates these into
  a live picture per seggio and overall.

  Engineering notes for whoever picks this up: this is genuinely sensitive
  data and a genuinely separate concern — it should live in its own app, behind
  the steering gate, ideally isolable from the public content system entirely
  (separate storage boundary, its own audit trail). It is legitimate internal
  political tooling; treat its isolation as a first-class requirement, not a
  later hardening pass.

- Anything further for the steering tier is unspecified and will be interviewed
  and specced when it is real, the same way this document was.
