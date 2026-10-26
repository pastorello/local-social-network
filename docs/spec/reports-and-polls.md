# Reports & polls (carried from v1)

> Delivered in v1. This file records what changes and what does not under v2.

## Segnalazioni — kept, author changes

- **R1** — Public **read** stays: the reports layer on the map is visible to
  everyone, as before.
  **Superseded on 2026-10-22** by the author's decision recorded in the UX/UI
  review of that day ([../archive/review-2026-10-22.md](../archive/review-2026-10-22.md),
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
  **Gated on 2026-10-22** by the author's decision recorded in the UX/UI
  review of that day ([../archive/review-2026-10-22.md](../archive/review-2026-10-22.md),
  decision 6, built as its PR-17 on 2026-10-24): the framing above is now
  enforced — from the merge of that PR, polls are **seen and voted in only by
  someone signed in** (collaborators, admins, steering). The anonymous reader
  does not see them: the list and a poll's detail answer 401 without an
  account, `/polls` is behind the login — a reader who follows a link there
  is sent to sign in, told «I sondaggi sono per chi collabora all'archivio»,
  and brought back afterwards — and *Il progetto* shows the link under
  *Partecipa* only to someone signed in. For them the polls are also in the
  account menu, after *Le mie schede*. Nothing else about the polls changed:
  results stay hidden until you have voted or the poll closes, voting and
  closing are as delivered.
- **P2** — No new work, no removal. Repurposing or gating them is a future
  decision, not part of this phase.
  **The gating half is decided** (2026-10-22, P1's note): a route guard and a
  link, not new work on polls — the non-goal «new work on polls»
  ([README.md](./README.md)) still holds, and so does «no removal».
