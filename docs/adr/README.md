# Architecture decision records

One file per decision that would be **expensive to reverse**: auth strategy,
storage, security posture, framework choices. Not a changelog — the commit
history already is one, and `../tech-debt.md` (open) plus
`../archive/tech-debt-archive.md` (paid) already track known debt.

Write a new ADR when a decision meets all three: it is architectural, it is not
obvious from reading the code, and reversing it later would cost more than an
afternoon. Otherwise say it in a code comment or in `CLAUDE.md`.

Format: `NNNN-kebab-title.md`, sections Status / Date / Context / Decision /
Alternatives considered / Consequences. Supersede rather than edit — an ADR
records what was decided *then*.

| # | Decision | Status |
|---|---|---|
| [0001](0001-jwt-in-localstorage.md) | JWT access + refresh tokens live in `localStorage` | Accepted · **two amendments** (2026-08-22 rich text, 2026-09-18 the map) |
| [0002](0002-debug-off-secret-key-required.md) | `DJANGO_DEBUG` defaults off; `DJANGO_SECRET_KEY` is required outside debug | Accepted |
| [0003](0003-media-on-local-filesystem.md) | Uploads go to the local filesystem and are not served in production yet | Accepted · **amended by [0007](0007-serving-media-from-the-app.md)** (they are served now) |
| [0004](0004-content-core-thin-type-apps.md) | One content core, thin Django apps per content type (spec v2) | Accepted |
| [0005](0005-wcag-2.1-aa-accessibility-bar.md) | Vivere Gaeta targets WCAG 2.1 Level AA, whole app, with a remediation plan | Accepted |
| [0006](0006-overlay-visibility-gate.md) | Overlay visibility is a server-side gate, default-confidential (spec C5) | Accepted |
| [0007](0007-serving-media-from-the-app.md) | Media is served by the app, hardened, on any host (amends 0003) | Accepted |
| [0008](0008-opening-hours-as-dated-testimony.md) | Opening hours enter the archive as dated testimony, never as a schedule (amends design.md's refusal) | Accepted |
| [0009](0009-where-it-runs.md) | Where it runs: viveregaeta.it, one OVHcloud VPS, Brevo for mail | Accepted |
| [0010](0010-businesses-in-the-archive.md) | Businesses enter as their own type (`attivita`: beve, mangia, compra) on editorial merit; beach clubs are businesses, the beach is no one's | Accepted · specified, not built |
