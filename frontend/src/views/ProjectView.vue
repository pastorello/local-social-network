<script setup lang="ts">
import { onMounted } from 'vue'

import MainTitle from '@/components/typography/MainTitle.vue'
import { useArchiveLine } from '@/composables/useArchiveLine'
import { PROJECT_STORY } from '@/definitions/copy'
import { ODBL_URL, OSM_COPYRIGHT_URL } from '@/lib/osm'
import { useUserStore } from '@/stores/user'

// Il progetto (spec/design.md D21): the credits surface D11 asked for. It was a
// footer until the map went under every page (D13) — there is no route left
// for a footer to sit on — so it is a page of its own, reached from the menu.
// D11's rule moves with it: dignified, fixed, and no invented endorsement.
// Since review PR-12 (2026-10-24) it reads from the top as a page and not as a
// footer: who writes the archive and for whom, how it is used, its rule, how
// to take part, and only then the index and the credits.
// The polls are reached from here too (D14) — by someone with an account, and
// only by them since 2026-10-24 (review PR-17, reports-and-polls.md P1): a
// reader is not shown a link to a page that would send them to sign in.
const user = useUserStore().user
const year = new Date().getFullYear()

// The archive's line, under the story (review PR-18, content.md): how many
// cards and the day the latest changed. Its line is held while it is asked
// for, so the words under it do not jump when it arrives; with nothing in the
// archive there is no line, and nothing held.
const { line: archive, loaded: archiveKnown, load: loadArchive } = useArchiveLine()
onMounted(loadArchive)

// Every card type is listed here and in the menu's Esplora — two lists by
// hand, and ProjectView.spec.ts fails when a type is missing from this one.
const schede = [
  { to: '/feste', label: 'Feste' },
  { to: '/luoghi', label: 'Luoghi' },
  { to: '/chiese', label: 'Chiese' },
  { to: '/ricette', label: 'Ricette' },
  { to: '/personaggi', label: 'Personaggi storici' },
  { to: '/dialetto', label: 'Dialetto' },
  { to: '/libri', label: 'Libri consigliati' },
]

const section = 'mt-10'
const title = 'font-display text-title text-ink'
const rows = 'mt-4 max-w-[60ch] space-y-3 text-ink'
// A link inside a sentence is underlined: colour alone does not tell it from
// the words around it (WCAG 1.4.1).
const inline = 'font-semibold text-sea underline underline-offset-4 hover:text-sea-deep'
const link = 'text-ink underline-offset-4 hover:text-sea hover:underline'
const heading = 'mb-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase'
</script>

<template>
  <article class="mx-auto w-full max-w-3xl pt-2">
    <MainTitle>Il progetto</MainTitle>
    <div class="max-w-[60ch] space-y-4 text-reading text-ink">
      <p v-for="paragraph in PROJECT_STORY" :key="paragraph">{{ paragraph }}</p>
    </div>
    <p v-if="archive || !archiveKnown" class="mt-4 min-h-5 text-sm text-muted">{{ archive }}</p>

    <section aria-labelledby="progetto-uso" :class="section">
      <h2 id="progetto-uso" :class="title">Come si usa</h2>
      <ul :class="rows">
        <li>
          <RouterLink to="/itinerari" :class="inline">Itinerari</RouterLink>: giri della città
          scritti dai collaboratori, da seguire una tappa alla volta, con le indicazioni per
          arrivare a ciascuna.
        </li>
        <li>
          <RouterLink to="/cosa-fare" :class="inline">Cosa si può fare qui</RouterLink>: scegli una
          zona della città e trovi i luoghi, le chiese, gli itinerari e le feste che ci sono.
        </li>
        <li>
          <RouterLink to="/" :class="inline">La mappa</RouterLink>: ogni scheda che ha un posto è
          sulla mappa; scegli i livelli da vedere, e gli stessi posti sono anche in un elenco.
        </li>
      </ul>
    </section>

    <!-- The editorial rule, stated where a reader can check it against the
    archive (D10): presence here is earned, not bought. When a municipal
    patrocinio exists it goes here, beside this sentence and in the same
    register — never as a banner above the content. Until then the place
    stays empty (D11): no logo, no "in attesa di", nothing claimed. -->
    <section aria-labelledby="progetto-regola" :class="section">
      <h2 id="progetto-regola" :class="title">La regola</h2>
      <p class="mt-4 max-w-[60ch] text-ink">
        Le schede di questo archivio sono scelte per merito editoriale: nessuna presenza è
        acquistata.
      </p>
    </section>

    <!-- «Scrivici» goes to the collaboration request, whose message is free
    text: the form has no field for why someone writes, and none is added for
    this (design.md D21's note of 2026-10-24) — the line says what to put in
    the message instead. -->
    <section aria-labelledby="progetto-partecipa" :class="section">
      <h2 id="progetto-partecipa" :class="title">Partecipa</h2>
      <ul :class="rows">
        <li>
          <RouterLink to="/collabora" :class="inline">Collabora con noi</RouterLink>: se Gaeta la
          conosci e vuoi scriverne, chiedi di entrare nel gruppo che scrive l’archivio.
        </li>
        <li>
          Hai trovato un errore o una cosa che manca?
          <RouterLink to="/collabora" :class="inline">Scrivici</RouterLink>, e nel messaggio indica
          la scheda e che cosa non torna.
        </li>
        <li v-if="user.isAuthenticated">
          <RouterLink to="/polls" :class="inline">Sondaggi</RouterLink>: le domande aperte a chi
          collabora all’archivio.
        </li>
      </ul>
    </section>

    <!-- The index, as it was before the story went above it — less the
    «Partecipa» column, which is the section above now. -->
    <div class="mt-12 grid gap-8 border-t border-hairline pt-8 sm:grid-cols-2">
      <!-- «Esplora» is the menu's, over the card types, since 2026-10-23
      (review PR-23); this column is the map and the tours, so it is named
      for what it is, and one screen never has two «Esplora». -->
      <nav aria-label="Per cominciare">
        <h2 :class="heading">Per cominciare</h2>
        <ul class="space-y-2 text-sm">
          <li><RouterLink to="/" :class="link">Mappa</RouterLink></li>
          <li><RouterLink to="/itinerari" :class="link">Itinerari</RouterLink></li>
        </ul>
      </nav>

      <nav aria-label="Cosa trovi su Vivere Gaeta">
        <h2 :class="heading">Cosa trovi su Vivere Gaeta</h2>
        <ul class="space-y-2 text-sm">
          <li v-for="scheda in schede" :key="scheda.to">
            <RouterLink :to="scheda.to" :class="link">{{ scheda.label }}</RouterLink>
          </li>
        </ul>
      </nav>
    </div>

    <section
      aria-label="Crediti"
      class="mt-10 flex flex-col gap-3 border-t border-hairline pt-6 text-sm text-muted sm:flex-row sm:items-baseline sm:justify-between"
    >
      <!-- The OpenStreetMap credit, where a reader looks for credits: the
      base map shows it in its corner, but a corner can be veiled by a page,
      and the zones of «Cosa si può fare qui» are derived from OSM data too
      (maps/migrations/0006) and have no corner of their own. -->
      <p class="max-w-[60ch]">
        Mappa e zone: © contributori di
        <a
          :href="OSM_COPYRIGHT_URL"
          class="text-sea underline underline-offset-4 hover:text-sea-deep"
          >OpenStreetMap</a
        >, dati disponibili con licenza
        <a :href="ODBL_URL" class="text-sea underline underline-offset-4 hover:text-sea-deep"
          >ODbL</a
        >.
      </p>
      <p>© {{ year }} Vivere Gaeta</p>
    </section>
  </article>
</template>
