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
