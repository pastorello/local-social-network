# Roadmap

What is planned and in what order. Ordered by what is **active**, not by what is
most interesting. Items here are candidates until they are picked up; when one
is, it gets a scope note in [mvp-spec.md](./mvp-spec.md) if it changes what the
product does.

The feature set in the spec is delivered and tested. That is not the same as
being ready for other people to use, and this document is mostly about the
distance between those two things.

## 1. Pay down the technical debt — **active**

The measured register is [tech-debt.md](./tech-debt.md), audited twice on
2026-08-19: first by measurement, then by reading the source. Twenty-seven of its 32 items are
closed, plus all 10 documentation items. What is left is three entries: the
double Leaflet bundle (TD-02, needs browser verification), broader end-to-end
coverage (TD-04, deliberately deferred until the flows stop moving), and
dependency drift (TD-06 — axios, the one entry with a security
profile, was updated on 2026-08-20; what is left is ordinary maintenance).

None of it blocks anything else. It is the default work when there is no larger
goal in flight.

## 2. Decide what "publishable" means

**The gap this roadmap exists for.** The spec describes an MVP feature set, and
that feature set works. It does not describe a product someone else could adopt,
and that design work has not been done. It has to happen before hosting is worth
paying for.

Open questions, none of them answered yet:

- **Who is the first real user, and how do they arrive?** An admin at a comune,
  or citizens first? The product currently assumes an admin already exists and
  was promoted through the Django admin.
- **What does an empty instance look like?** Today a fresh deployment is an
  empty map. There is no onboarding, no seed content, no explanation.
- **What is the moderation load?** `rejected` exists as a status but nothing
  notifies a citizen that their report was rejected, or why.
- **Accessibility.** Spec N5 scoped a WCAG pass out of the MVP. A public civic
  service that some citizens cannot use is a different kind of failure from a
  missing feature, and this is the natural point to reconsider it.
- **What is the smallest thing worth putting in front of a real person?** Not
  necessarily everything below.

## 3. Candidate features — unordered, unvalidated

Written against assumed requirements, not observed ones. Expect this list to be
wrong until item 2 is answered.

- **Admin analytics** — reports per category and status over time, poll turnout.
  An admin currently sees a flat list.
- **Category management UI** — categories are Django-admin-only (F2.2). A
  citizen-facing admin panel removes the last "log into `/admin/`" step.
- **Status-change notifications** — someone who filed a report has no signal
  when it moves to `acknowledged` or `resolved` short of re-checking the map. No
  chat or DM is an explicit non-goal (§2); a transactional e-mail is not the
  same feature.
- **More than one photo per report** — F2.2 caps it at one. A pothole needs one
  angle; a stretch of broken pavement does not.

## 4. Deploy — **last, and on the author's signal**

Not blocked by anything technical, and not scheduled. It happens when the
project feels mature enough to be worth hosting, which is a call the author
makes, not a milestone that unlocks.

Three things are already known to be waiting when that day comes:

- **Photos are broken on any deployment made today.**
  `django.conf.urls.static.static()` is a no-op when `DEBUG` is false, so every
  photo and avatar returns 404. See
  [ADR-0003](./adr/0003-media-on-local-filesystem.md) — fixing it is entangled
  with *how* media gets served, which is why it was not done blind.
- **Uploads need somewhere durable.** Ephemeral disks on free PaaS tiers lose
  `MEDIA_ROOT` on every redeploy.
- **Rate limiting needs a shared cache.** DRF counts through the Django cache,
  and the default `LocMemCache` is per process, so behind N workers the limits
  multiply by N (`docs/deploy.md`).

Also worth remembering: `VITE_API_BASE_URL` is read at **build time**, so the
API hostname has to be decided before the SPA is built.

## 5. Learn from real usage — after 4

The product was built against assumptions. Before adding anything from item 3,
watch what actual usage looks like: which categories get used, whether
moderation keeps up, whether poll turnout means anything.

## 6. Non-goals, revisited

The spec's non-goals (§2) — chat and DMs, election-grade vote counting, groups
and invitations, a native app, multi-city — were right for the first version and
none are reopened here. **Multi-city** is the one worth watching: if a second
comune ever asks, the schema (one `Category` set, no tenancy) needs a real
design pass, not a patch.
