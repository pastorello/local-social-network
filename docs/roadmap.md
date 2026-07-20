# Post-MVP roadmap

> The MVP (spec §11, all milestones M0–M4) is closed as of 2026-07-20 — see
> [mvp-spec.md §13](./mvp-spec.md#13-mvp-closure-2026-07-20). This document is
> where scope now goes instead of back into the spec: candidate next steps,
> not commitments. When one is picked up, it gets its own spec-first session
> (§10) like every milestone before it — a short scope note, then a
> `docs/ai-log/` entry.

## 1. Ship the demo (unblocks everything else)

The app is deploy-ready (`docs/deploy.md`); what's missing is a platform
decision, not code.

- [ ] Pick a platform (PaaS free tier vs. VPS — sketches in `docs/deploy.md`)
- [ ] Deploy, seed real Gaeta categories, create the first admin
- [ ] Record the platform + URL in spec §6
- [ ] Publish the LinkedIn write-up (`docs/linkedin-draft.md`) with the live link

## 2. Pilot feedback loop

The MVP was built against assumed requirements, not real usage. Before adding
features, get it in front of actual Gaeta citizens/admins for a few weeks and
see what F2/F3 usage looks like — which categories get used, whether
moderation keeps up, whether poll turnout is meaningful. Candidate features
below are ordered by what that feedback will most likely validate or kill.

## 3. Candidate features (unordered, unvalidated)

- **Admin analytics** — reports per category/status over time, poll turnout;
  today an admin only sees a flat list.
- **Category management UI** — categories are Django-admin-only (F2.2); a
  citizen-facing admin panel would remove the last "log into /admin/" step.
- **Status-change notifications** — a citizen who filed a report has no signal
  when it moves to `acknowledged`/`resolved` beyond re-checking the map. No
  chat/DM is an explicit non-goal (§2), but a transactional e-mail here isn't
  the same feature.
- **Multiple photos per report** — F2.2 caps at one; useful for issues where
  one angle doesn't tell the story (a pothole vs. a stretch of broken
  sidewalk).
- **Full WCAG audit** — N5 explicitly scoped this out of the MVP; worth doing
  before a real public launch, not before.

## 4. Explicit non-goals, revisited

§2's non-goals (chat/DM, election-day vote counting, groups/invitations,
native app, multi-city) were right for an MVP. None are reopened by this
roadmap — multi-city is the one worth watching if a second comune asks to
adopt the platform, since the schema (single `Category` set, no tenancy) would
need a real design pass, not a quick patch.
