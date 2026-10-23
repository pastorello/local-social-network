<script setup lang="ts">
import { onMounted } from 'vue'

import IntentTile from '@/components/content/IntentTile.vue'
import LuogoIcon from '@/components/icons/LuogoIcon.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import { useDoors } from '@/composables/useDoors'
import { PRESENTATION } from '@/definitions/copy'

// The landing page a B&B's card points at (spec itinerari.md I6): one address
// for everyone — no code per host, no greeting by name, nothing that tracks
// who came from where. "Che cosa ti va di fare?", the intents that lead
// somewhere (I5), and a way out to the map.
//
// «Cosa si può fare qui» is offered only once a zone has a published place
// (spec cosa-fare.md Part −1, D8): the same rule as the intents — no door onto
// an empty room. Both rules are lib/doors.ts, which the home reads too.
//
// Refined by review PR-14 (P-07, M-09): the home's line says what the site is,
// here too, from the same constant; each intent wears its own tint and icon
// where a cover will go once the archive has photographs; and the way out is
// a closing link, «Oppure vai alla mappa» — not «esplora», since the menu's
// «Esplora» is on the same screen (review PR-23).
const { withTours, zonesWithPlaces, loaded, load } = useDoors()

onMounted(load)

// A card is one link: its outline is the keyboard's (focus-visible only, so a
// tap leaves no ring behind), and the pointer is told by the name's underline
// rather than by a darker border that read as a leftover focus ring (M-09).
const card =
  'group flex h-full items-center gap-4 rounded-2xl border border-hairline bg-surface p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
const name = 'decoration-2 underline-offset-4 group-hover:underline'
</script>

<template>
  <article class="mx-auto w-full max-w-2xl pt-2">
    <p class="text-xs font-semibold tracking-[0.12em] text-terracotta uppercase">
      Benvenuti a Gaeta
    </p>
    <MainTitle>Che cosa ti va di fare?</MainTitle>
    <p class="mt-2 max-w-[55ch] text-reading text-ink">{{ PRESENTATION }}</p>
    <p class="mt-2 max-w-[55ch] text-muted">
      Itinerari scritti da chi Gaeta la conosce: scegli da dove cominciare.
    </p>

    <ul v-if="withTours.length" class="mt-6 grid gap-3 sm:grid-cols-2">
      <li v-for="intent in withTours" :key="intent.slug">
        <RouterLink :to="{ name: 'itinerarilist', query: { intento: intent.slug } }" :class="card">
          <IntentTile :slug="intent.slug" class="size-14 flex-none rounded-xl *:size-8" />
          <span class="flex min-w-0 flex-col gap-0.5">
            <span :class="['font-display text-title text-ink', name]">{{ intent.name }}</span>
            <span v-if="intent.description" class="text-ink">{{ intent.description }}</span>
            <span class="text-sm text-muted">
              {{ intent.count === 1 ? '1 itinerario' : `${intent.count} itinerari` }}
            </span>
          </span>
        </RouterLink>
      </li>
    </ul>
    <p v-else-if="loaded" class="mt-6 text-muted">
      Gli itinerari sono in preparazione. Intanto, la mappa racconta la città.
    </p>

    <RouterLink v-if="zonesWithPlaces.length" :to="{ name: 'cosafare' }" :class="[card, 'mt-6']">
      <span
        class="flex size-14 flex-none items-center justify-center rounded-xl bg-sea/10 text-sea *:size-8"
        aria-hidden="true"
      >
        <LuogoIcon />
      </span>
      <span class="flex min-w-0 flex-col gap-0.5">
        <span :class="['font-display text-title text-ink', name]">
          Oppure guarda cosa c'è in una zona
        </span>
        <span class="text-ink">Serapo, il centro medievale, Monte Orlando…</span>
      </span>
    </RouterLink>

    <p class="mt-6">
      <RouterLink
        to="/"
        class="inline-flex min-h-11 items-center rounded-sm font-semibold text-sea underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      >
        Oppure vai alla mappa
      </RouterLink>
    </p>
  </article>
</template>
