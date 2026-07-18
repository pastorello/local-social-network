# AI session log — index

Every working session follows the spec §10 cycle (planning prompt →
implementation with Claude Code → human review notes) and gets one file here;
commits reference their session file.

| Date | Session | Milestone | Outcome |
|---|---|---|---|
| 2026-07-16 | [Audit](./2026-07-16-audit.md) | M0 | Runtime smoke test of the inherited tutorial app; assumptions A1–A6 resolved; tech-debt map; pivot decisions (JWT kept, posts→reports foundation, polls to rebuild) |
| 2026-07-17 | [Auth & roles](./2026-07-17-m1-auth-roles.md) | M1 | `role` field (citizen/admin), e-mail privacy (`/me/` only), account endpoints on `GET` + real status codes, first pytest suite |
| 2026-07-17 | [Map & reports](./2026-07-17-m2-map-reports.md) | M2 | `reports` domain replaces `posts`/`notifications`; Leaflet map with clustered status pins; photo pipeline (≤5MB, EXIF-stripped); anonymous read access; `{detail, fields}` error convention |
| 2026-07-17 | [Polls](./2026-07-17-m3-polls.md) | M3 | Spec §7 `Poll`/`PollOption`/`Vote` rebuild; one final vote per citizen; F3.3 result visibility; inline voting UI; 30 endpoint tests |
| 2026-07-18 | [Showcase](./2026-07-18-m4-showcase.md) | M4 | Gaeta Partecipa rebrand; Italian copy sweep; JWT hardening (60-min access, rotating+blacklisted refresh, 401-refresh interceptor); deploy prep; docs |
