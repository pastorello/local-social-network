# AI-assisted development log

This folder documents how this project was built. Every work session that
touched the codebase has an entry here: the goal, the prompt that started it,
what the AI produced, and — most importantly — the author's review of that
output.

## Why this exists

The project is a working civic platform, but it is also a case study in
structured AI-assisted development. The method is described in §10 of
[`../mvp-spec.md`](../mvp-spec.md) and rests on four rules:

1. **Spec first** — the specification is committed before implementation, and
   scope changes mean editing the spec.
2. **One goal per session** — each session has a single objective and its own log.
3. **Traceability** — commits reference the session file that produced them.
4. **Human ownership** — the AI proposes, the author decides. Every log ends
   with a hand-written review of what the AI got wrong.

New entries use [`_template.md`](_template.md).

## Sessions

| Date | Milestone | Topic | Log |
|---|---|---|---|
| 2026-07-16 | M0 | Codebase audit against the spec | [2026-07-16-audit.md](2026-07-16-audit.md) |
| 2026-07-17 | M1 | Auth & roles | [2026-07-17-m1-auth-roles.md](2026-07-17-m1-auth-roles.md) |
| 2026-07-17 | M2 | Map & issue reports | [2026-07-17-m2-map-reports.md](2026-07-17-m2-map-reports.md) |
| 2026-07-17 | M3 | Polls | [2026-07-17-m3-polls.md](2026-07-17-m3-polls.md) |
| 2026-07-18 | M4 | Showcase | [2026-07-18-m4-showcase.md](2026-07-18-m4-showcase.md) |
| 2026-07-20 | M4 | MVP closure & post-MVP roadmap | [2026-07-20-mvp-closure.md](2026-07-20-mvp-closure.md) |

## Reading suggestions

Short on time? Read the **Author review** section of each log — that is where
the engineering judgement lives. The audit log (M0) is the best starting point:
it shows the state of the codebase before any of this work began.
