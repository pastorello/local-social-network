<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

import type { Evento } from '@/definitions/interfaces/Evento'
import { formatEventWhen } from '@/lib/when'

// A collaborator's own events on *Le mie schede* (spec cosa-fare.md Part −1
// D9): the next one first, then what is over, the latest first — the API's
// order, which is by when they happen and not by when they were written
// (CF34), so a mistake about a date is in front of its author.

interface PaginatedEvents {
  count: number
  results: Evento[]
}

const events = ref<Evento[]>([])
const loading = ref(true)
const failed = ref(false)

onMounted(async () => {
  try {
    const { data } = await axios.get<PaginatedEvents>('/api/eventi/mine/?page_size=100')
    events.value = data.results
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

// What a row says besides its date, in the order that matters to its author.
const tagsOf = (evento: Evento): string[] =>
  [
    evento.is_published ? '' : 'Bozza',
    evento.state === 'annullato' ? 'Annullato' : evento.state === 'rinviato' ? 'Rinviato' : '',
    evento.is_over ? 'Passato' : '',
  ].filter(Boolean)

const tag = 'text-xs font-semibold tracking-[0.12em] uppercase'
</script>

<template>
  <section aria-labelledby="miei-eventi" class="mb-10">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-4">
      <h2 id="miei-eventi" class="font-display text-title text-ink">I tuoi eventi</h2>
      <!-- By path: the form's page is loaded on demand. -->
      <RouterLink
        to="/eventi/nuovo"
        class="flex h-11 items-center rounded-lg bg-sea px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      >
        Nuovo evento
      </RouterLink>
    </div>
    <p v-if="failed" class="text-muted">
      Non è stato possibile caricare i tuoi eventi. Riprova tra poco.
    </p>
    <p v-else-if="!loading && events.length === 0" class="text-muted">
      Non hai ancora segnalato nessun evento. Una locandina in un bar è un buon inizio.
    </p>
    <ul v-else-if="events.length" class="divide-y divide-hairline border-y border-hairline">
      <li
        v-for="evento in events"
        :key="evento.id"
        class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3"
        :class="{ 'text-muted': evento.is_over }"
      >
        <span class="min-w-0 flex-1">
          <RouterLink
            :to="`/eventi/${evento.id}`"
            class="block font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            :class="{ 'line-through': evento.state === 'annullato' }"
            >{{ evento.title }}</RouterLink
          >
          <span class="block text-sm">{{ formatEventWhen(evento) }}</span>
        </span>
        <span v-for="label in tagsOf(evento)" :key="label" :class="[tag, 'text-muted']">
          {{ label }}
        </span>
        <RouterLink
          :to="`/eventi/${evento.id}/modifica`"
          :aria-label="`Modifica ${evento.title}`"
          class="text-sm font-semibold text-sea underline underline-offset-4 hover:text-sea-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        >
          Modifica
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
