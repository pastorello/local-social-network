# ADR-0009: Where it runs — viveregaeta.it, one OVHcloud VPS, Brevo for mail

## Status

Accepted. Answers roadmap item 3's three inputs and spec README's open
question 3 (SMTP provider and sender domain).

## Date

2026-10-21

## Context

Everything a deployment needs had been built and rehearsed for weeks
([deploy.md](../deploy.md) Part 1, walked end to end on 2026-09-10): one VPS,
Docker Compose, Caddy, Django, Postgres, one hostname. What was missing were
three choices nobody but the author could make — a domain, a host, a mail
provider — and his signal, which he gave on 2026-10-21.

The brief he set is the one that decides most of this: **a showcase of
something that really exists, with near-zero traffic, for putting the content
on — the cheapest thing that works.** Mail is not a channel here: at most
thirty collaborators ever, one invite each, an occasional password reset,
under thirty messages a month. Coordination mail goes from his own inbox; the
app has no feature for it and should not grow one.

Two facts about autumn 2026 shaped the host choice more than any preference:
RAM prices rose sharply across the industry, and Hetzner — the obvious
developer's choice when deploy.md was written — repriced in June (the
2 vCPU / 4 GB CPX22 went to €19.99/month) and listed every cloud plan as
"currently unavailable" when checked on 2026-10-21.

## Decision

- **Domain: `viveregaeta.it`**, registered at OVHcloud. Available on
  2026-10-21 (NIC.it whois). It was already the default in
  `deploy/.env.example` and `DEFAULT_FROM_EMAIL`. One domain per city follows
  the brand ("Vivere + city"), so the multi-city ambition does not argue for a
  neutral name. `.it` needs an EU/EEA registrant and a codice fiscale that
  matches the registrant's name exactly.
- **Host: OVHcloud VPS-1** — 2 vCores, 4 GB RAM, 40 GB NVMe, a daily backup
  included — €3.81/month before VAT (€4.65 with it) on the Italian price list
  of 2026-10-21, apparently with a 12-month commitment. In a main European
  region, not a Local Zone (those leave out NVMe and some features).
- **Mail: Brevo, free plan**, over SMTP on 587 with STARTTLS, sending as
  `noreply@viveregaeta.it`, the domain authenticated with the records Brevo
  issues (a verification code, DKIM, DMARC).
- **DNS lives at OVH**, with the domain, so the A records for Caddy and
  Brevo's records sit in one zone.

Estimated total: about €65 a year.

## Alternatives considered

- **Hetzner Cloud.** Repriced and unavailable, above. Its 1 GB CPX02 costs
  more than OVH's 4 GB VPS-1.
- **IONOS VPS XS** (1 vCore, 1 GB, 10 GB; €1–2.50/month on a 24-month term,
  plus setup). Saves about €30 a year, and pays for it twice: no backup — on
  the one thing that exists nowhere else, the uploads — and 1 GB is too little
  to run deploy.md's update (`up -d --build` builds both images on the server)
  without swap and a disk that leaves Docker's cache no room.
- **Oracle Cloud Always Free.** €0 and a generous machine, but Oracle reclaims
  instances that stay under 20% CPU, network and memory for seven days — which
  is the exact description of a site nobody visits yet. Converting the account
  to Pay As You Go reportedly prevents that; the notice saying so is from 2023
  and was not found confirmed for 2026. For a showcase, disappearing is the
  worst failure.
- **netcup VPS 500** (2 vCPU / 4 GB): better reputation for support, about
  twice the price, no backup included.
- **Aruba**: the data would sit in Italy (Arezzo, Rome), but its smallest plan
  (1 GB) brings back IONOS' build problem.
- **Scaleway Transactional Email** for mail: built for exactly this and free
  under 300 a month, but the account wants a payment method; Brevo's free plan
  does not. Either would do.
- **OVH's own mailbox (MX Plan)** for mail: one vendor for everything, but a
  mailbox on shared servers rather than a transactional service — if one of
  them lands on a blocklist, invites go to spam and nothing on this side can
  fix it. An invite in spam is a collaborator who never gets in.

## Consequences

- **The host is the cheap one to reverse.** The stack moves with deploy.md's
  two backup commands, a restore and an A record. The domain is the expensive
  one: it is printed on the B&B cards (`/benvenuto`). Renew it on time.
- **OVH's included backup is the last 24 hours, one copy.** It is a safety net
  against a dead disk, not a history: the off-server `pg_dump` and media
  archive in deploy.md stay necessary, on a schedule, copied off the machine.
- **Prices were checked on 2026-10-21, in a market that is still moving** (OVH
  has announced its next range). Re-check before renewing rather than trusting
  the numbers above.
- **Nothing in the code depends on any of the three.** They are environment
  values in `deploy/.env` and records in a DNS zone; that was the point of
  ADR-0007 and of deploy.md's shape, and it holds.
- The step-by-step for this setup is deploy.md's section *The setup chosen on
  2026-10-21*.
