# 2026-08-19 — Deep audit: code, security, tests, docs (agent fan-out)

|                   |                                                     |
| ----------------- | --------------------------------------------------- |
| **Milestone**     | Post-MVP (audit, no product scope)                  |
| **Spec sections** | §9 (quality plan), §8 (API surface), §10 (workflow) |
| **Model / tool**  | Claude Code — Opus 5 + 4 agent-skills subagents      |
| **Duration**      | ~1h                                                 |
| **Commits**       | (this session)                                      |

## 1. Goal

Continue the technical-debt audit opened earlier the same day. The first pass
was **measurement-based** — gates, `npm audit`, `npm outdated`, bundle sizes —
so it could only see debt that a tool reports. This session is the complementary
**code-reading** pass, plus the documentation-consistency check the author asked
for explicitly.

## 2. Plan prompt

> leggimi il progetto e vediamo che altro c'è da fare, abbiamo fatto un audit del
> debito tecnico fino ad ora in questa PR #8 ma non ho committato, vedi se hai
> gli agenti di addy osmani per proseguire un audit tecnico su questo progetto
> per vedere il debito tecnico e le eventuali incoerenze nella documentazione

**Correction to the premise, recorded because it matters for the PR:** the audit
work *was* committed (`78c3d97`) and is what PR #8 contains. What was uncommitted
is `158b638` (agent-skills local scoping), which was unpushed and therefore not
in the PR.

**Method:** four `agent-skills` subagents in parallel, each given
`docs/tech-debt.md` and told **not** to restate TD-01…TD-10 but to correct them
where wrong — `code-reviewer` (five-axis source read), `security-auditor`,
`test-engineer` (rule-by-rule coverage map), and a general-purpose agent for
docs-vs-code drift. Two skills were deliberately **not** used, per CLAUDE.md:
`performance-optimization` (premature without a real complaint) and the full WCAG
pass (N5 scopes it out — only one-line a11y defects were accepted).

## 3. What the AI produced

**22 new debt items (TD-11…TD-32), 10 documentation items (DOC-01…DOC-10), and
four corrections to the first pass.** Full register: [`../tech-debt.md`](../tech-debt.md).

Nothing was taken on trust. Every high-severity claim was re-verified by reading
or executing the code before it entered the register — marked ✔ there.

**The four P0s, all confirmed:**
- **TD-11** — the committed `django-insecure-…` `SECRET_KEY` fallback is
  SimpleJWT's signing key, so a public-repo reader can mint an admin token
  against any deployment that forgets the env var. Silent failure mode.
- **TD-12** — avatar uploads skip the size cap, the format allowlist and
  `strip_exif`, and avatars are served publicly through `GET /api/reports/`
  → `author.avatarURL`. Citizens publish their home GPS. Spec N6 covers report
  photos only; the avatar path was missed.
- **TD-13** — `strip_exif` preserves the client filename, and `static()` serves
  media with a Content-Type guessed from the extension → stored XSS on the API
  origin, where the admin session lives.
- **TD-14** — `?category=x` on the public `/api/reports/` returns **500** with a
  full traceback (`DJANGO_DEBUG` defaults to `true`). Measured: 500 / 500 / 500
  on the three UUID-filtered paths, 200 on the `status` CharField. Reachable from
  the SPA via `/profile/anything`.

**Two silent-regression holes the green gates cannot see:**
- **TD-16** — `login.cy.ts` has been **red since M4**: the Italian sweep updated
  two assertions in that file and left `'Log in'` in the other two, while the app
  renders "Accedi". A third of the only e2e spec has been failing for a month
  unnoticed — the field evidence that TD-01 (CI) is correctly ranked first.
- **TD-17** — nothing pins `role` out of `ProfileForm`/`SignupForm` fields.
  Adding one token grants every citizen admin authority with 76 tests green.

**Corrections to the first pass:** TD-09's `PollCard.vue` finding is a **false
positive** (impeccable combined classes across a ternary — neither branch renders
the reported pair); TD-05 is now measured rather than inferred (PBKDF2 at 0.296s
× 44 creations ≈ 38% of runtime, and the `if not TESTING:` insertion point
already exists); TD-10 is worse than written (the documented pytest command does
not run at all); "nothing junk tracked in git" held only because no `.env` exists
yet (TD-15 — `.env` is not gitignored while the README says to create one).

**One agent was wrong, and it is recorded as a non-defect** so it is not
re-audited: the security agent reported `MEDIA_URL = 'media/'` as producing
malformed URLs. Django's `LazySettings._add_script_prefix` normalizes it to
`/media/`; evaluating the concatenation gives a correct absolute URL. Photo
display is not broken. This mattered beyond the fact itself — that agent had
built part of its TD-13 exploitability argument on the premise that media links
are broken, which made the finding read as *less* reachable than it is.

**Coverage map:** roughly 28 of 50 domain rules genuinely proven, 16 with no test
at all. Named in the register: the `rejected` status is entirely untested (that
is the moderation lever), PNG/WEBP never round-trip, the EXIF test cannot detect
a lost `exif_transpose`, the interceptor's single-flight is untested, and neither
`ReportForm` nor `PollForm` has a success-path test.

**Files:** `docs/tech-debt.md` (rewritten — first pass preserved, second pass and
corrections added), this log + index row. **No application code touched;** an
audit produces a register, the fixes are separate sessions.

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

- [x] Gates unchanged (docs-only session; 76 backend / 32 frontend still green)
- [x] Spec still accurate (post-MVP scope lives in `roadmap.md`, not the spec)
- [x] `CLAUDE.md` corrected in the same session (author instruction): DOC-01
      (demo is item 2 and parked; the debt register is the active workstream, and
      `ci-cd-and-automation` replaces `shipping-and-launch` as the next skill),
      DOC-02 (the `PollCard` detector finding recorded as a false positive, with
      ternary class bindings named as the blind spot), DOC-04 (the ignore claim
      now states the machine-level mechanism honestly), DOC-08, the TD-10 command
      gotcha, and three cosmetics — `noUncheckedIndexedAccess` attribution, the
      `--experimental-cli` flag on `npm run format`, and the two Definition-of-Done
      items (`npm run build`, self-review notes) that had been dropped from spec §9

**Follow-ups / debt introduced:** none introduced. Recommended order is at the
foot of `tech-debt.md`: TD-01 (CI) first, then TD-11+TD-15 (secret key, `DEBUG`
default, `.env` ignore) before any deploy conversation resumes, then the three
small tests that close TD-16/TD-17/TD-22.
