# LinkedIn write-up — draft

> Draft for the M4 showcase post (spec §11). Edit freely — this is a starting
> point in your voice, not final copy. Publish together with the repo link
> (and the demo URL once hosting is decided).

## Versione italiana

---

Ho preso un vecchio side project — il classico "social network" costruito
seguendo i tutorial — e l'ho trasformato in **Gaeta Partecipa**: una piattaforma
di partecipazione civica per piccole città. Segnalazioni geolocalizzate su
mappa, sondaggi comunali, moderazione con ruoli.

La parte interessante non è il cosa, ma il **come**: l'ho usato come case study
di sviluppo assistito da AI (Claude Code), con un metodo preciso:

📋 **Spec first** — una specifica versionata nel repo precede il codice; i
cambi di scope partono dalla spec, non dall'entusiasmo del momento

📝 **Una sessione, un log** — ogni sessione di lavoro produce un log:
decisioni, cosa l'AI ha sbagliato, cosa ho corretto e perché. I commit
riferiscono il log: ogni riga di codice è tracciabile a una decisione

✅ **Quality gates non negoziabili** — 76 test API + 32 test frontend,
TypeScript strict, lint pulito su ogni milestone

👤 **Ownership umana** — l'AI propone, io revisiono e decido

Cosa ho imparato: l'AI non sostituisce il rigore, lo **amplifica**. Senza spec,
test e review il codice generato diventa debito tecnico a velocità doppia. Con
il metodo giusto, in 5 milestone sono passato da un'app tutorial mezza rotta a
una piattaforma completa: Django 6 + DRF, Vue 3 + TypeScript strict, Leaflet,
JWT con refresh rotation.

Repo (spec, log delle sessioni e tutto il resto): [link]

#AIAssistedDevelopment #CivicTech #Django #VueJS #ClaudeCode

---

## English version

---

I took an old side project — the classic tutorial-built "social network" — and
turned it into **Gaeta Partecipa**: a civic engagement platform for small
cities. Map-based issue reporting, municipal polls, role-based moderation.

The interesting part isn't the what, it's the **how**: I used it as a case
study in AI-assisted development (Claude Code), with a strict method:

📋 **Spec first** — a versioned spec precedes the code; scope changes start by
editing the spec

📝 **One session, one log** — every working session produces a log: decisions,
what the AI got wrong, what I changed and why. Commits reference the log

✅ **Non-negotiable quality gates** — 76 API tests + 32 frontend tests, strict
TypeScript, clean lint on every milestone

👤 **Human ownership** — the AI proposes, I review and decide

What I learned: AI doesn't replace rigor, it **amplifies** it. Without spec,
tests and review, generated code becomes tech debt at double speed. With the
right method, 5 milestones took a half-broken tutorial app to a complete
platform: Django 6 + DRF, Vue 3 + strict TypeScript, Leaflet, JWT with refresh
rotation.

Repo (spec, session logs and everything else): [link]

#AIAssistedDevelopment #CivicTech #Django #VueJS #ClaudeCode
