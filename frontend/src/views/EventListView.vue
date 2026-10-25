<script setup lang="ts">
import axios from 'axios'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import MainTitle from '@/components/typography/MainTitle.vue'
import type { EventItem } from '@/definitions/interfaces/Evento'
import events from '@/lib/i18n/messages/events'
import { formatEventWhen } from '@/lib/when'
import { useUserStore } from '@/stores/user'

// «Gli eventi che conosciamo» (spec cosa-fare.md CF33; Part −1 D9): the
// events and the feasts' editions the archive knows of, never «Eventi a
// Gaeta» — a collaborator files five of the forty things happening in August,
// and the heading says what this is. In date and hour order, and it says so:
// nothing here is ranked. Never merged with the archive's cards (CF42).
//
// `?finestra=oggi|settimana` is Gaeta's day, or it and the six after,
// computed by the API (CF2's day). A window is a proposal, so a cancelled
// event is not in it; the whole list keeps it, struck through, until its day
// passes (CF28).
interface Page {
  count: number
  next: string | null
  results: EventItem[]
}

// Named in the reader's language (review PR-19a, lib/i18n/messages/events.ts).
const WINDOWS = [
  { key: null, word: 'all' },
  { key: 'oggi', word: 'oggi' },
  { key: 'settimana', word: 'settimana' },
] as const

const route = useRoute()
const userStore = useUserStore()

const finestra = computed(() => {
  const value = route.query.finestra
  return value === 'oggi' || value === 'settimana' ? value : null
})

const items = ref<EventItem[]>([])
const nextPage = ref<string | null>(null)
const loaded = ref(false)
const failed = ref(false)

const load = async (url: string, append: boolean) => {
  try {
    const { data } = await axios.get<Page>(url)
    items.value = append ? [...items.value, ...data.results] : data.results
    nextPage.value = data.next
    failed.value = false
  } catch {
    failed.value = true
  } finally {
    loaded.value = true
  }
}

watch(
  finestra,
  (value) => {
    loaded.value = false
    load(value ? `/api/eventi/?finestra=${value}` : '/api/eventi/', false)
  },
  { immediate: true },
)

// CF33: zero is a legitimate state, and it is one true sentence.
const emptySentence = computed(() => events().empty[finestra.value ?? 'all'])

const linkOf = (item: EventItem) =>
  item.kind === 'evento' ? `/eventi/${item.id}` : `/feste/${item.festa}`

const tag = 'text-xs font-semibold tracking-[0.12em] uppercase'
const chip =
  'flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
</script>

<template>
  <div class="mx-auto w-full max-w-3xl pt-2">
    <MainTitle>{{ events().title }}</MainTitle>
    <p class="-mt-4 mb-6 text-muted">
      {{ events().lead }}
    </p>

    <nav :aria-label="events().windows.label" class="mb-6 flex flex-wrap gap-2">
      <RouterLink
        v-for="window in WINDOWS"
        :key="window.word"
        :to="window.key ? { query: { finestra: window.key } } : { query: {} }"
        :aria-current="finestra === window.key ? 'page' : undefined"
        :class="[
          chip,
          finestra === window.key
            ? 'border-sea bg-sea text-white'
            : 'border-field bg-surface text-ink hover:border-sea',
        ]"
      >
        {{ events().windows[window.word] }}
      </RouterLink>
    </nav>
    <p v-if="finestra" class="mb-4 text-sm text-muted">
      {{ events().windowNote }}
    </p>

    <p v-if="failed" class="text-muted">
      {{ events().failed }}
    </p>
    <template v-else-if="loaded && items.length === 0">
      <p class="font-semibold text-ink">{{ emptySentence }}</p>
      <p class="mt-1 text-muted">
        {{ events().fullCalendar }}
      </p>
    </template>
    <ul v-else-if="items.length" class="divide-y divide-hairline border-y border-hairline">
      <li v-for="item in items" :key="`${item.kind}-${item.id}`" class="py-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <RouterLink
            :to="linkOf(item)"
            class="font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            :class="
              item.kind === 'evento' && item.state === 'annullato'
                ? 'text-event-cancelled line-through'
                : 'text-ink'
            "
            lang="it"
          >
            {{ item.title }}
          </RouterLink>
          <span
            v-if="item.kind === 'evento' && item.state === 'annullato'"
            :class="[tag, 'text-event-cancelled']"
            >{{ events().cancelled }}</span
          >
          <span
            v-else-if="item.kind === 'evento' && item.state === 'rinviato'"
            :class="[tag, 'text-muted']"
            >{{ events().postponed }}</span
          >
          <span v-if="item.kind === 'edizione'" :class="[tag, 'text-muted']">{{
            events().feast
          }}</span>
        </div>
        <p class="text-sm text-ink">{{ formatEventWhen(item) }}</p>
        <p v-if="item.kind === 'evento' && item.place" class="text-sm text-muted" lang="it">
          {{ item.place.label }}
        </p>
        <p v-else-if="item.kind === 'edizione' && item.note" class="text-sm text-muted" lang="it">
          {{ item.note }}
        </p>
      </li>
    </ul>

    <button
      v-if="nextPage"
      type="button"
      class="mt-6 min-h-11 cursor-pointer rounded-lg border border-sea px-4 text-sm font-semibold text-sea focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      @click="load(nextPage, true)"
    >
      {{ events().loadMore }}
    </button>

    <!-- CF42: the first reason a Gaetano would ever open the request form. A
    collaborator's own way to file one stays Italian (review PR-19a). -->
    <p class="mt-10 text-muted">
      {{ events().tellUs }}
      <RouterLink
        to="/collabora"
        class="font-semibold text-sea underline underline-offset-4 hover:text-sea-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        >{{ events().writeUs }}</RouterLink
      >.
      <span v-if="userStore.user.isAuthenticated" lang="it">
        O
        <RouterLink
          :to="{ name: 'eventocreate' }"
          class="font-semibold text-sea underline underline-offset-4 hover:text-sea-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
          >segnalalo tu</RouterLink
        >.
      </span>
    </p>
  </div>
</template>
