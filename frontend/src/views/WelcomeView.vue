<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'

import MainTitle from '@/components/typography/MainTitle.vue'
import type { Intent } from '@/definitions/interfaces/Itinerario'

// The landing page a B&B's card points at (spec itinerari.md I6): one address
// for everyone — no code per host, no greeting by name, nothing that tracks
// who came from where. "Che cosa ti va di fare?", the intents that lead
// somewhere (I5), and a way out to the map.
const intents = ref<Intent[]>([])
const loading = ref(true)

const withTours = computed(() => intents.value.filter((intent) => intent.count > 0))

onMounted(async () => {
  try {
    intents.value = (await axios.get<Intent[]>('/api/itinerari/intenti/')).data
  } catch (error) {
    console.log('error:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <article class="mx-auto w-full max-w-2xl pt-2">
    <p class="text-xs font-semibold tracking-[0.12em] text-terracotta uppercase">
      Benvenuti a Gaeta
    </p>
    <MainTitle>Che cosa ti va di fare?</MainTitle>
    <p class="mt-2 max-w-[55ch] text-reading text-muted">
      Itinerari scritti da chi Gaeta la conosce: scegli da dove cominciare.
    </p>

    <ul v-if="withTours.length" class="mt-8 grid gap-3 sm:grid-cols-2">
      <li v-for="intent in withTours" :key="intent.slug">
        <RouterLink
          :to="{ name: 'itinerarilist', query: { intento: intent.slug } }"
          class="flex h-full flex-col gap-1 rounded-2xl border border-hairline bg-surface p-5 hover:border-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        >
          <span class="font-display text-title text-ink">{{ intent.name }}</span>
          <span v-if="intent.description" class="text-ink">{{ intent.description }}</span>
          <span class="text-sm text-muted">
            {{ intent.count === 1 ? '1 itinerario' : `${intent.count} itinerari` }}
          </span>
        </RouterLink>
      </li>
    </ul>
    <p v-else-if="!loading" class="mt-8 text-muted">
      Gli itinerari sono in preparazione. Intanto, la mappa racconta la città.
    </p>

    <RouterLink
      to="/"
      class="mt-8 inline-flex h-11 items-center rounded-full border border-field bg-surface px-5 text-sm font-semibold text-sea focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
    >
      Oppure esplora la mappa
    </RouterLink>
  </article>
</template>
