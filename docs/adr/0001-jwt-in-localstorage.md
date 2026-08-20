# ADR-0001: JWT access and refresh tokens live in `localStorage`

## Status

Accepted

## Date

2026-08-19 (recorded; the design dates from M1 and was hardened in M4)

## Context

The SPA and the API are separate origins. Auth is `rest_framework_simplejwt`:
60-minute access tokens, 30-day refresh tokens with rotation and blacklisting.
`stores/user.ts` persists both to `localStorage` by hand, and `lib/auth.ts`
refreshes transparently from a 401 interceptor.

"Tokens in `localStorage`" is a standard security-review finding, so the reason
for not changing it needs to be written down rather than re-argued every audit.
The 2026-08-19 security pass looked specifically for the exploit path and found
none: there is no `v-html`, no `innerHTML`, no `eval`, no `new Function`, no
`document.write` anywhere in `frontend/src`, and every user-controlled string
renders through Vue's escaped interpolation.

## Decision

Keep tokens in `localStorage`. Do not move to httpOnly cookies.

## Alternatives considered

**httpOnly cookies.** Removes the XSS read primitive, but this is a
cross-origin SPA calling a token API, so cookies would need `SameSite=None` plus
a CSRF layer that the codebase does not currently need at all — the API
authenticates from the `Authorization` header only, so no ambient credential
exists today. That is a real increase in moving parts to close a hole with no
current entry point.

**In-memory only.** Loses the session on every reload, which for a civic app
used occasionally from a phone is a worse product.

## Consequences

- The realistic blast radius is dominated by **npm supply chain** — a malicious
  transitive dependency reading `localStorage` at runtime — not by content
  injection. That argues for lockfile discipline and a CSP, not for rewriting
  auth.
- A Content-Security-Policy on the SPA host is the mitigation that would
  actually bound this. It does not exist yet and is not scheduled.
- If a rendering path ever needs raw HTML (rich text in reports, an embedded
  third-party widget), this ADR must be revisited **before** that ships — that
  change is what would create the entry point this decision assumes away.
