# Reports & polls (carried from v1)

> Delivered in v1. This file records what changes and what does not under v2.

## Segnalazioni — kept, author changes

- **R1** — Public **read** stays: the reports layer on the map is visible to
  everyone, as before.
  **Superseded on 2026-10-22** by the author's decision recorded in the UX/UI
  review of that day ([../review-2026-10-22.md](../review-2026-10-22.md),
  decision 7, built as its PR-1): from the merge of that PR, reports are
  **seen and filed only by someone signed in** — the people working on the
  archive. The anonymous reader does not see them at all: no reports section
  on the home and no reports layer on the map, in either layout. Every reports
  endpoint — the list, the map's pins, a report's detail and the categories
  they are filed under — answers 401 without an account, and `/reports/:id`
  is behind the login. Filing is unchanged for a collaborator, and reachable
  from the account menu as well as from the home.
- **R2** — **Creation becomes collaborator-only.** It already required an
  account, and under v2 accounts are collaborator-only by construction
  ([accounts.md](./accounts.md)) — so this needs no new permission logic, only
  the account model changing underneath it.
- **R3** — The status workflow, upvotes, moderation and the map pins are all
  unchanged from v1.

## Sondaggi — frozen

- **P1** — Polls stay exactly as delivered. The author's framing: an **internal
  tool for the people working on the site**, deliberately set aside.
- **P2** — No new work, no removal. Repurposing or gating them is a future
  decision, not part of this phase.
