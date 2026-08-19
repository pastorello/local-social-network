# 2026-08-19 — Platform audit & technical debt register

|                   |                                      |
| ----------------- | ------------------------------------ |
| **Milestone**     | Post-MVP (audit, no product scope)   |
| **Spec sections** | §9 (quality plan), §6 (deploy)       |
| **Model / tool**  | Claude Code — Opus 5                 |
| **Duration**      | ~1h                                  |
| **Commits**       | (this session)                       |

## 1. Goal

Re-point the post-MVP roadmap after the author parked the public demo, then
audit the platform as it stands today and turn the result into a debt register
that can be worked through one item per session.

## 2. Plan prompt

> allora cambiamo un attimo la roadmap, non voglio pubblicare niente perchè non
> ho un dominio nè uno spazio dove fare girare python, non ho un database
> pubblico, io direi di mettere questa cosa tra i todo ed andare a lavorare su
> un audit della piattaforma, sulla gestione del debito tecnico

**Plan accepted / amended:** taken as given — the parking decision is a resource
constraint, not an engineering one, so it was recorded rather than argued.
The audit was run on measurements (all five gates, `npm audit`, `npm outdated`,
`pip list --outdated`, a real build) instead of a reading of the code, so every
entry in the register carries a number the next session can re-check.

## 3. What the AI produced

**Measured baseline — everything green:** pytest 76 passed (54.4s), ruff clean,
Vitest 32 passed (10 files), eslint clean, `npm run build` green.

**Verified clean, and recorded as such** so they do not get re-audited: no N+1
in the reports API, nothing junk tracked in git, backend requirements pinned
exactly, `.venv` self-ignored (Python writes `.venv/.gitignore` containing `*` —
this initially looked like a missing ignore rule and was checked rather than
reported).

**Findings (10, in `docs/tech-debt.md`):** P1 — no CI at all; Leaflet bundled
twice (~86 kB gzip wasted, caused by the deliberate CJS default-import for
markercluster colliding with `@vue-leaflet`'s ESM resolution); build tooling
(`@tailwindcss/vite`, `tailwindcss`) sitting in `dependencies`, which is why
`npm audit --omit=dev` shows 6 vulnerabilities that are all dev-server surface.
P2 — one single e2e spec; a 54s backend suite with no fast test password hasher;
dependency drift including three majors held back on purpose. P3 — ghost
`posts/` and `notifications/` directories, an unindexed `status` column, the two
impeccable findings, and a borrowed local venv whose `pip` shebang points at
another project.

**Files:** `docs/tech-debt.md` (new), `docs/roadmap.md` (restructured — audit
promoted to item 1, demo parked as item 2 with the two constraints that will
bite when it resumes), this log + index row.

No application code touched; gates unchanged.

## 4. Author review

The section that matters. Written by hand, after reading the diff.

**Verified**
- …

**Wrong or overstated by the AI**
- …

**Changed by hand**
- …

**Decisions taken (and why)**
- Public demo parked: no domain, no Python host, no public database. Recorded in
  `roadmap.md` as a resource decision, with `deploy.md` left ready.
- …

**Rejected suggestions**
- …

## 5. Outcome

- [x] Tests green (76 backend, 32 frontend — measured this session, not quoted)
- [x] Lint clean (ruff, eslint), build green
- [x] Spec still accurate (post-MVP scope lives in `roadmap.md`, not the spec)

**Follow-ups / debt introduced:** none introduced. The register itself is the
follow-up: TD-01 (CI) is the recommended next session, then TD-03, TD-06, TD-02.
