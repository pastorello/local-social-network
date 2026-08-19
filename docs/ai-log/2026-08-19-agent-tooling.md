# 2026-08-19 — External agent skills evaluation & setup

|                   |                                         |
| ----------------- | --------------------------------------- |
| **Milestone**     | Post-MVP (tooling, no product scope)    |
| **Spec sections** | §9, §10, N4, N5                         |
| **Model / tool**  | Claude Code — Opus 5                    |
| **Duration**      | ~1h                                     |
| **Commits**       | (this session)                          |

## 1. Goal

Before restarting feature work, decide whether two third-party skill packs —
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) and
[pbakaus/impeccable](https://github.com/pbakaus/impeccable) — conflict with each
other or with this project's conventions, and write down the rules that keep
them from quietly taking over the spec-first workflow.

## 2. Plan prompt

> allora prima di tutto vorrei utilizzare degli agenti per questo progetto:
> [addyosmani/agent-skills] [pbakaus/impeccable]
> Controlla se non vanno in conflitto e se si integrano bene col progetto e se
> c'è bisogno di raffinare qualcosa

**Plan accepted / amended:** evaluated by cloning both repos and reading the
manifests, hooks and scripts rather than the READMEs alone, and by *running*
impeccable's detector against `frontend/src` for a real signal-to-noise
measurement. Author then chose: install both as global plugins (not vendored in
the repo) and write the refinements now.

## 3. What the AI produced

**Findings — conflicts.** None blocking. Plugin skills are namespaced, the hooks
sit on different events (agent-skills: `SessionStart` context injection ~10 KB;
impeccable: `PostToolUse` on Edit/Write + `Stop` deep pass), both exit 0 and
never break a turn. Node ≥22 required by impeccable; local is v24.18.1. Two
softer collisions worth knowing: agent-skills' session-start meta-skill claims
the routing role with "non-negotiable" behaviours (competes with CLAUDE.md and
with the spec §10 cycle), and its `plugin.json` registers two command
directories with overlapping names (`.claude/commands/*.md` and
`commands/*.toml`, the latter an Antigravity-format set) — watch for duplicate
slash commands after install.

**Findings — project fit.**
- impeccable: good. `.vue` is a first-class extension in its rule set, and a real
  run over `frontend/src` returned **2 findings, both legitimate** — the
  `SiteTitle.vue` purple gradient (the M4 brand) and `text-gray-600` on
  `bg-green-100` in `PollCard.vue`. Live mode fits a Vite SPA (`index.html`).
- agent-skills: good but needs anchoring. Its spec/plan skills write to
  `tasks/plan.md` + `tasks/todo.md` at the root, which would create a second
  scope authority next to `mvp-spec.md` / `roadmap.md` / this log folder — the
  exact duplication the MVP-closure session removed. Its
  `browser-testing-with-devtools` skill requires a `chrome-devtools` MCP server
  that this setup does not have.
- Both default to English output while UI copy is Italian (N4), and both push a
  full WCAG pass that N5 explicitly scopes out of the MVP.

**Files changed.**
- `CLAUDE.md`: new "External agent skills" section — precedence over the packs'
  own conventions, where planning artifacts go, definition of done unchanged,
  language rule, WCAG scope guard, skills/hooks not to use, impeccable specifics
  and the detector baseline.
- `.gitignore`: `.impeccable/`.
- This log + `docs/ai-log/README.md` index row.

No application code touched; no tests added (nothing testable changed).

## 4. Author review

The section that matters. Written by hand, after reading the diff.

**Verified**
- …

**Wrong or overstated by the AI**
- …

**Changed by hand**
- …

**Decisions taken (and why)**
- Install as global plugins rather than vendoring ~180 third-party files into a
  showcase repo — deliberately *not* the convention used in `next-cmp-settings`,
  where 5 curated skills are vendored in `.agents/skills/` with a
  `skills-lock.json`. Trade-off accepted: no third-party files in a showcase
  repo, at the cost of two different install conventions across projects.
- Because a global install loads all 24 skills, the exclusions became written
  rules in CLAUDE.md instead of skills left uninstalled — `spec-driven-development`
  and `planning-and-task-breakdown` (competing spec authority, the same exclusion
  the author had already made by hand in `next-cmp-settings`),
  `browser-testing-with-devtools` (no `chrome-devtools` MCP) and
  `performance-optimization` (premature).
- …

**Rejected suggestions**
- …

## 5. Outcome

- [x] Tests green (untouched — no application code changed this session)
- [x] Lint clean (untouched)
- [x] Spec still accurate (tooling only; no scope change, spec not edited)

**Follow-ups / debt introduced:**
- **Installed, not yet active.** Both plugins are enabled in
  `~/.claude/settings.json` (`impeccable@impeccable` 4.1.1 @ `f88b283`,
  `agent-skills@addy-agent-skills` 0.6.7 @ `df1edb2`) and their payloads are on
  disk, but `/impeccable` still returns "Unknown command" in a session whose
  process predates the install. Plugins load at process start: the next freshly
  opened Claude Code should have them. Verify with `/impeccable` before assuming.
- Install had to go through the CLI (`claude plugin install`) after
  `npm i -g @anthropic-ai/claude-code`; the marketplace clones over SSH, which
  failed with `Permission denied (publickey)` — no SSH keys on this machine, all
  repos on HTTPS remotes. Fixed globally and harmlessly with
  `git config --global url."https://github.com/".insteadOf git@github.com:`.
- Plugin installs are **pinned to a commit sha** (`installed_plugins.json`), so
  updates are explicit (`claude plugin update`), never silent.
- Still to check on first live session: duplicate slash commands from
  agent-skills' two command directories (8 `.md` + 8 `.toml`, same names), and a
  first `/impeccable audit` on `PollsView` to gauge noise against the 2 known
  deterministic findings.
- Open product decision: whether the `SiteTitle.vue` purple gradient stays.
