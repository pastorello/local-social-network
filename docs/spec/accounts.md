# Accounts — "Collabora con noi"

> Phase C1. Reverses v1's open-signup decision: v2 has **no public signup**.

## Why the gate

The author is not ready to open to the public — this phase is building content
with people he knows and trusts. "Iscriviti" becomes "Collabora con noi": an
account is an invitation, not a right. That reframing also puts the CAPTCHA in
an honest role (keeping bots out of the admin's inbox) and moves the real
vetting where it belongs — outside the app.

## Requirements

- **A1 — Request form (public).** Name, e-mail, free-text message ("who are
  you, why do you want to collaborate"). Spam-protected via a honeypot field
  plus a minimum-time-to-submit check — not a third-party CAPTCHA, so no
  visitor data goes to Google/hCaptcha (consistent with TD-30, which ruled out
  sending visitor data to third parties for the same reason). Its job is spam,
  not identity — it cannot verify someone is from Gaeta, and the spec does not
  pretend it can.
- **A2 — Admin review.** The app stores each request and gives the admin an
  approve / reject control (Django admin is enough to start). The actual
  vetting — looking the person up, talking to them, e-mailing them — happens
  off-app; the app does not model it.
- **A3 — Invite on approval.** Approval sends an e-mail with a single-use,
  expiring link where the new collaborator sets their password. No password is
  collected at request time. There is no "active account awaiting e-mail
  confirmation" state — approval *is* activation.
- **A4 — Password reset (collaborators).** By e-mail, single-use expiring
  token, throttled at the TD-18 credential rates. This deliberately reopens the
  reset-token vulnerability class v1 avoided by having no reset at all; the
  spec accepts it, because a locked-out collaborator with no self-service reset
  lands on the admin every time.
- **A5 — Login / logout / password change.** Already built (v1; logout and
  password-change token eviction from TD-20). Carry over unchanged.

## Consequences

- **E-mail becomes a real dependency.** SMTP settings via env; TD-29 removed
  the dead `EMAIL_*` settings and they return here with a purpose. Development
  uses the console backend; the sender domain is a deploy-time decision.
- Because accounts are collaborator-only by construction, "requires an account"
  and "is a collaborator" become the same thing — which is what lets report
  creation become collaborator-only with no new permission logic
  ([reports-and-polls.md](./reports-and-polls.md)).
- The **steering** capability (see [politics.md](./politics.md)) is granted
  here, admin-side, as a flag on an already-approved account — not a separate
  request path.

## Walked by hand, end to end — 2026-09-09

Nobody had ever taken this path, which is the one every collaborator after the
author uses to get an account. It was the last named gap in
[roadmap](../roadmap.md) item 2 and it is closed now — for the human half; the
automated half is below.

The walk: file a request at `/collabora` → approve it with the Django admin
action → read the invite e-mail the console backend printed → follow the link
→ choose a password → sign in → reach `/chiese/nuova` as the new collaborator.
**It works, all of it**, and three things were verified rather than assumed:
the invite token is single-use (a replay answers "Link non valido o scaduto"
while the password already chosen keeps working), the mismatched-password case
is attributed to the field that failed rather than dumped at the foot of the
form (`aria-invalid` + `aria-describedby` on `invite-password2` — the
2026-08-31 auth-forms work, seen doing its job), and approval creates the
account with a role of `citizen`, which is what makes them a collaborator.

**What it found**, and it is the kind that only a walk finds: the Django admin
— the review surface, read by the author and nobody else — was answering in
**English**. "Pending", "Collaboration requests". Everything the author sees
while deciding about a person was in the wrong language, against N4, on the one
screen where a mistake costs somebody an account. Fixed here: the status labels
are Italian and `CollaborationRequest` carries `verbose_name`, the same
treatment `maps.Overlay` got for the same reason. The stored values stay the
English identifiers, so nothing in the API or the SPA moved.

**Also worth knowing:** activating an invite while another account is signed in
on that browser leaves the *old* session in place — you activate Antonio's
account and remain logged in as whoever you were. It is a plausible thing to do
on the author's own machine. Nothing is lost and nothing leaks, so it is
recorded rather than fixed.

**Still open, and it is a decision rather than work:** automating this in the
e2e suite. The invite arrives by e-mail, so a spec either reads an outbox or
the app grows a test-only endpoint that hands the token back — the second means
production code carrying a door that exists for tests. That is the author's
call, not maintenance.
