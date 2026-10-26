# Archive

**Nothing in this folder is a live file of the project.** It holds documents
that are finished — closed registers, a superseded spec, a review whose every
decision has been built — kept because they say *why* things are the way they
are. Read them to understand a decision; never plan from them. What they
decided lives on in the live files, which are the ones to read and to edit.

Gathered here on 2026-10-26, after release 2.0.0. Each file was moved with its
history (`git mv`) and its links rewritten; a link elsewhere in the repository
that points here is a pointer to a record, not to a rule.

| File | What it is | The live file that took over |
|---|---|---|
| [mvp-spec.md](./mvp-spec.md) | The v1 spec — *Gaeta Partecipa*, map reports and polls — delivered through M4 and superseded on 2026-08-21. Its §9 (definition of done) and §10 (working agreement) are still the ones `CLAUDE.md` cites. | [../spec/README.md](../spec/README.md), the v2 spec |
| [roadmap-archive.md](./roadmap-archive.md) | The roadmap's finished phases — 1 (design), 2 (coverage), 6 (the v2 build order), 7 (the accessibility decision) — with the reasoning that got them there. Split off on 2026-09-22. | [../roadmap.md](../roadmap.md), what is still ahead |
| [tech-debt-archive.md](./tech-debt-archive.md) | Every paid debt item, with the evidence that proved its fix. Split off on 2026-09-22. | [../tech-debt.md](../tech-debt.md), what is still open |
| [review-2026-10-22.md](./review-2026-10-22.md) | The UX/UI review of 2026-10-22: its findings, the author's dated decisions (22, 23, 25 and 26 October), the prompts that built them (#116–#151) and the closing row of what stays open by decision. Closed with release 2.0.0. | The specs' dated notes ([../spec/](../spec/README.md)), and TD-55 in [../tech-debt.md](../tech-debt.md) |

**Adding to the archive:** a document comes here when nothing in it is still
to be done or still in force on its own — when the live files say everything
it decided. Move it with `git mv`, rewrite the links to it, add a row above,
and put the one-line banner under its title. The roadmap's and the debt
register's numbers stay continuous across their live and archived halves.
