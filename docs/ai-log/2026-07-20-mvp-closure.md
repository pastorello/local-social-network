# M4 — MVP closure & post-MVP roadmap

|                   |                        |
| ----------------- | ---------------------- |
| **Milestone**     | M4 (closing)           |
| **Spec sections** | §11, §13 (new), §6     |
| **Model / tool**  | Claude Code — Sonnet 5 |
| **Duration**      | ~1h                    |
| **Commits**       | (this session)         |

## 1. Goal

Close the MVP formally: verify the docs' claims (test counts, lint state)
against the real codebase, fix what had gone stale, resolve the one open
exit-criterion decision (spec §11 M4: "Demo URL live"), and split off a
post-MVP roadmap so "what's next" has a home that isn't the MVP spec.

## 2. Plan prompt

> ho creato una nuova branch e caricato il file docs/ai-log/README.md,
> compila la tabella delle sessions in base ai dati che trovi nella cartella
> docs/ai-log [prior turn] — poi: vorrei fare un pò di pulizie su questo
> progetto, aggiornare i vari file .md in base al reale stato della
> situazione in maniera tale da chiudere questa fase di MVP come
> c'eravamo pianificati nel file docs/mvp-spec.md, in maniera da rendere
> questo progetto presentabile e passare ad immaginare i next steps

**Plan accepted / amended:** ran the quality gates first (pytest, ruff,
vitest, eslint, build) instead of trusting the docs, then asked the author
one blocking question before touching the spec: how to resolve the
"Demo URL live" exit criterion, since picking a hosting platform is an
infrastructure/cost decision outside the AI's authority. Author chose to
descope it explicitly rather than deploy now or leave it ambiguous.

## 3. What the AI produced

- Verified: 76 backend tests (pytest) + ruff clean; 32 frontend tests
  (Vitest) + eslint + `npm run build` clean — the counts already cited in
  README.md were accurate, no doc claimed something false there.
- Found genuinely stale: `backend/README.md` still told readers to
  `pip install -r backend/requirements.txt` (missing pytest/ruff) and to run
  `python manage.py test posts` — the `posts` app was deleted in M2. Fixed to
  `requirements-dev.txt` and `python -m pytest`/`ruff check`.
- `docs/mvp-spec.md`: bumped to v0.3, added §13 "MVP closure" recording the
  descope decision, updated the M4 row of the §11 milestones table.
- New `docs/roadmap.md`: post-MVP scope doc — ship the demo, pilot feedback
  loop, candidate features, a note on which non-goals are worth revisiting.
- `README.md` (root) and `CLAUDE.md`: status sections updated to say the MVP
  is closed instead of "M4 in progress", pointing at spec §13 and the new
  roadmap doc instead of carrying the "still open" list forward.

## 4. Author review

**Verified**

- manually run FE/BE tests: all green
- manual UI pages check

**Wrong or overstated by the AI**

- Leafet map overlapped header on scroll

**Changed by hand**

- fixed AppHeader z-index

**Decisions taken (and why)**

- Demo URL descoped from the MVP (not deployed, not left ambiguous) — a
  hosting/cost decision shouldn't gate calling five milestones of feature
  work done. Recorded in spec §13; first item in `docs/roadmap.md`.

**Rejected suggestions**

- …

## 5. Outcome

- [x] Tests green (76 backend, 32 frontend — verified before any doc edit)
- [x] Lint clean (ruff, eslint)
- [x] Spec still accurate — updated in this session (§11, §13)

**Follow-ups / debt introduced:** none introduced; the MVP's one remaining
loose end (live demo) is now tracked as roadmap item #1 instead of an M4
"still open" note.
