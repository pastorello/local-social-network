<script setup lang="ts">
import MainTitle from '@/components/typography/MainTitle.vue'

// Il progetto (spec/design.md D21): the credits surface D11 asked for. It was a
// footer until the map went under every page (D13) — there is no route left
// for a footer to sit on — so it is a page of its own, reached from the menu.
// D11's rule moves with it: dignified, fixed, and no invented endorsement.
// The polls are reached from here too (D14).
const year = new Date().getFullYear()

// Every card type is listed here and in the menu's Schede — two lists by hand,
// and ProjectView.spec.ts fails when a type is missing from this one.
const schede = [
  { to: '/feste', label: 'Feste' },
  { to: '/luoghi', label: 'Luoghi' },
  { to: '/chiese', label: 'Chiese' },
  { to: '/ricette', label: 'Ricette' },
  { to: '/personaggi', label: 'Personaggi storici' },
  { to: '/dialetto', label: 'Dialetto' },
  { to: '/libri', label: 'Libri consigliati' },
]

const link = 'text-ink underline-offset-4 hover:text-sea hover:underline'
const heading = 'mb-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase'
</script>

<template>
  <article class="mx-auto w-full max-w-3xl pt-2">
    <MainTitle>Il progetto</MainTitle>
    <p class="mt-2 max-w-[60ch] text-reading text-ink">
      <span class="font-semibold"
        ><span class="text-terracotta">V</span>ivere
        <span class="text-terracotta">G</span>aeta</span
      >
      è un archivio culturale di Gaeta: luoghi, chiese, feste, ricette, personaggi, dialetto e
      libri, raccontati da chi la città la vive.
    </p>

    <div class="mt-10 grid gap-8 border-t border-hairline pt-8 sm:grid-cols-3">
      <nav aria-label="Esplora">
        <h2 :class="heading">Esplora</h2>
        <ul class="space-y-2 text-sm">
          <li><RouterLink to="/" :class="link">Mappa</RouterLink></li>
          <li><RouterLink to="/itinerari" :class="link">Itinerari</RouterLink></li>
          <li><RouterLink to="/polls" :class="link">Sondaggi</RouterLink></li>
        </ul>
      </nav>

      <nav aria-label="Schede">
        <h2 :class="heading">Schede</h2>
        <ul class="space-y-2 text-sm">
          <li v-for="scheda in schede" :key="scheda.to">
            <RouterLink :to="scheda.to" :class="link">{{ scheda.label }}</RouterLink>
          </li>
        </ul>
      </nav>

      <nav aria-label="Partecipa">
        <h2 :class="heading">Partecipa</h2>
        <ul class="space-y-2 text-sm">
          <li><RouterLink to="/collabora" :class="link">Collabora con noi</RouterLink></li>
        </ul>
      </nav>
    </div>

    <!-- The editorial rule, stated where a reader can check it against the
    archive (D10): presence here is earned, not bought. When a municipal
    patrocinio exists it goes here, beside this sentence and in the same
    register — never as a banner above the content. -->
    <section
      aria-label="Crediti"
      class="mt-10 flex flex-col gap-3 border-t border-hairline pt-6 text-sm text-muted sm:flex-row sm:items-baseline sm:justify-between"
    >
      <p class="max-w-[60ch]">
        Le schede di questo archivio sono scelte per merito editoriale: nessuna presenza è
        acquistata.
      </p>
      <p>© {{ year }} Vivere Gaeta</p>
    </section>
  </article>
</template>
