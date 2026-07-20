# <YYYY-MM-DD> — <Short topic>

| | |
|---|---|
| **Milestone** | M0 / M1 / M2 / M3 / M4 |
| **Spec sections** | e.g. F2.2, F2.5, N1 |
| **Model / tool** | Claude Code — <model> |
| **Duration** | ~Xh |
| **Commits** | `<sha>` … |

## 1. Goal

One or two sentences. What this session was supposed to achieve, and why now.

## 2. Plan prompt

The planning prompt given to the AI, verbatim (or the essential part of it).

```
<prompt>
```

**Plan accepted / rejected / amended:** what the AI proposed and whether it was
followed. If the plan was changed before implementation, say what and why.

## 3. What the AI produced

- Files created / modified / deleted (high level, not a diff dump)
- Approach taken
- Tests added and their result

## 4. Author review

The section that matters. Written by hand, after reading the diff.

**Verified**
- …

**Wrong or overstated by the AI**
- …

**Changed by hand**
- …

**Decisions taken (and why)**
- …

**Rejected suggestions**
- …

## 5. Outcome

- [ ] Tests green
- [ ] Lint clean
- [ ] Spec still accurate (if not: spec updated in commit `<sha>`)

**Follow-ups / debt introduced:** …
