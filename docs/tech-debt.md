# Technical debt register

> Audited 2026-08-19 against `main` @ `44ebc7d` (post-MVP). Every item below was
> **measured**, not assumed: commands and outputs are quoted so the next session
> can re-run them and see whether the number moved.
>
> Scope note: shipping a public demo was **parked** on 2026-08-19 (no domain, no
> Python host, no public database — author decision). This register replaces it
> as the active workstream; see [roadmap.md](./roadmap.md).

## Baseline — the gates all pass

| Gate | Command | Result |
|---|---|---|
| Backend tests | `python -m pytest` | **76 passed** in 54.4s |
| Backend lint | `python -m ruff check .` | clean |
| Frontend tests | `npm run test:unit` | **32 passed** (10 files) in 4.2s |
| Frontend lint | `npm run lint` | clean (61 files, 116 rules) |
| Build | `npm run build` | green, 469ms |

Also verified clean, so nobody re-audits them: no N+1 in the reports API
(`select_related('category', 'author')` on list, detail and both admin paths),
no junk tracked in git, backend requirements pinned to exact versions, `.venv`
correctly self-ignored (Python writes `.venv/.gitignore` with `*`).

---

## P1 — worth a session each

### TD-01 · No CI: five green gates that nobody runs automatically

**Evidence:** no `.github/` directory. The definition of done (spec §9) names
five commands; today they run only when a human remembers.

**Why it matters now:** the MVP is closed and the next phase is maintenance —
dependency bumps, refactors, and agent-written changes. That is exactly the work
where a regression slips in silently. It is also the cheapest insurance in this
register.

**Fix:** one GitHub Actions workflow, two jobs (backend: pytest + ruff on the
pinned Python; frontend: vitest + eslint + build on Node 24). Nothing else — no
deploy step, since there is nothing to deploy to.

### TD-02 · Leaflet is bundled twice (~86 kB gzip wasted)

**Evidence:** `npm run build` emits both

```
dist/assets/leaflet-src.esm-D3NCHgIn.js   148.53 kB │ gzip: 43.19 kB
dist/assets/leaflet-src-CERmynjB.js       148.79 kB │ gzip: 43.36 kB
```

**Cause:** `ReportsMap.vue` imports `leaflet` directly (default + named) because
`leaflet.markercluster` registers `markerClusterGroup` on the CJS/UMD runtime —
documented on purpose in CLAUDE.md — while `@vue-leaflet/vue-leaflet` resolves
Leaflet's ESM build. Vite therefore ships both copies of the same library.

**Fix:** a `resolve.alias` in `vite.config.ts` pointing every specifier at one
build, then **verify in the browser** that clustering still works — that is the
regression this codebase has already been bitten by, so the fix is not done
until a real map with clustered pins has been loaded.

**Risk:** medium. Do not land it on the strength of a green build alone.

### TD-03 · Build tooling sits in `dependencies`

**Evidence:** `@tailwindcss/vite` and `tailwindcss` are in `dependencies`, not
`devDependencies`. Consequence: `npm audit --omit=dev` reports **6
vulnerabilities (5 high)** — all in `vite` / `launch-editor`, pulled into the
production tree through `@tailwindcss/vite`.

**Read this correctly:** every one of those advisories is **dev-server surface**
(path traversal in the dev server, `server.fs.deny` bypasses, a Windows-only NTLM
disclosure). None of them touches the static bundle a visitor downloads. The
debt is the *mislabeling*, which makes a real audit unreadable — the day a
genuine runtime advisory lands, it will be buried in dev-server noise.

**Fix:** move both to `devDependencies`, then `npm audit fix` (patch-level vite).

---

## P2 — schedule, don't rush

### TD-04 · End-to-end coverage is one file

`frontend/cypress/e2e/` contains **only `login.cy.ts`**. The three flows that
*are* the product — filing a report on the map, upvoting, voting in a poll — have
unit tests but no end-to-end proof that the SPA and the API agree.

### TD-05 · The backend suite takes 54s for 76 tests

0.7s per test, and the suite creates users or passwords in 44 places
(`account/tests.py` alone: 32). No fast `PASSWORD_HASHERS` override is
configured, so every fixture pays for real PBKDF2 hashing. A test-only MD5
hasher is the standard Django fix and typically cuts this by an order of
magnitude. Confirm by measuring before and after — the estimate above is
inference from the hashing count, not a profile.

### TD-06 · Dependencies have drifted

Backend (pinned exactly, which is why this is safe to defer): Django
6.0.3 → 6.1, DRF 3.17.1 → 3.18.0, django-debug-toolbar 6.3 → 7.1.1,
gunicorn 26.0 → 26.1, pillow 12.2 → 12.3, PyJWT 2.12 → 2.13, ruff 0.15 → 0.16.

Frontend: axios 1.15 → 1.19, tailwind 4.2.2 → 4.3.3, eslint 10.1 → 10.8,
cypress 15.13 → 15.21. Majors deliberately left alone for now: **pinia 3 → 4**,
**typescript 6 → 7**, **oxlint 1.57 → 1.79** (22 minors behind, and it is the
first linter in the `npm run lint` chain).

Do this *after* TD-01 — dependency bumps are precisely what CI is for.

---

## P3 — cheap, cosmetic, or waiting on real data

- **TD-07 · Ghost app directories.** `backend/posts/` and
  `backend/notifications/` still exist on disk with `__pycache__/` and empty
  `migrations/`. The apps were deleted in M2; git does not see these, but a
  newcomer opening the backend folder does. One `rm -rf` on each.
- **TD-08 · `IssueReport.status` has no index.** The list endpoint filters on it
  (`reports/api.py:35`). Irrelevant at demo scale, relevant the day a real city
  fills the table — revisit when there is data, not before.
- **TD-09 · Two impeccable detector findings.** `PollCard.vue:91` puts
  `text-gray-600` on `bg-green-100` (a one-line contrast fix); `SiteTitle.vue:5`
  uses a purple gradient flagged as the classic AI-generated-UI tell — that one
  is the M4 brand, so it is a product decision, not a defect.
- **TD-10 · Local venv is borrowed (not repo debt, but a setup trap).**
  `.venv/bin/pip` carries a shebang pointing at
  `/Users/turu/Desktop/codebase/campaign-settings/.venv/bin/python3.14`, so
  `pip` fails outright; `python -m pip` works. The venv was copied from another
  project. Recreating it from `backend/requirements-dev.txt` fixes it.

---

## Suggested order

1. **TD-01 (CI)** — everything below is safer with it in place.
2. **TD-03** — 10 minutes, and it makes the audit signal readable.
3. **TD-06** — the routine bumps, now watched by CI.
4. **TD-02** — needs browser verification, so give it its own session.
5. **TD-05**, then **TD-04** — faster suite first, then more of it.
6. P3 items whenever they are in the way.
