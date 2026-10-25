<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DirectionsLink from '@/components/content/DirectionsLink.vue'
import PosterViewer from '@/components/eventi/PosterViewer.vue'
import { useMapFocus } from '@/composables/useMapFocus'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePanelShape } from '@/composables/usePanelShape'
import { usePanelTrail } from '@/composables/usePanelTrail'
import type { Evento } from '@/definitions/interfaces/Evento'
import { formatEventWhen } from '@/lib/when'
import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'

// An event's own page (spec cosa-fare.md Part −1 D9): what, when — always
// with its weekday (CF34) — where, the poster that can be read, the
// organiser's link. Not a card's article (CF25): no rich text, no gallery,
// no translations. A cancelled one says so first (CF28); a past one stays
// here, readable, at its address (CF26).
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const evento = ref<Evento | null>(null)

const load = async () => {
  try {
    evento.value = (await axios.get<Evento>(`/api/eventi/${route.params.id}/`)).data
  } catch {
    toastStore.showToast(5000, 'Evento non trovato')
    router.push({ name: 'eventilist' })
  }
}

onMounted(load)
watch(() => route.params.id, load)

// The event the URL names, not the previous one while the next loads.
const shown = computed(() =>
  evento.value && evento.value.id === route.params.id ? evento.value : null,
)

const canEdit = computed(
  () =>
    !!shown.value &&
    (shown.value.author.id === userStore.user.id || userStore.user.role === 'admin'),
)

// Beside the map when it has a place, which the map then shows (D16) —
// its venue's own pin, or the one labelled point (CF31).
usePanelShape(() => (shown.value ? (shown.value.place ? 'narrow' : 'wide') : null))
useMapFocus(() => {
  const place = shown.value?.place
  if (!shown.value || !place) return null
  return {
    id: place.card?.id ?? shown.value.id,
    type: place.card?.type ?? 'eventi',
    points: [{ lat: place.lat, lng: place.lng, label: place.label }],
    route: [],
  }
})
// Over its title: «Eventi» is the way up; the zone it is in leads to what
// else is there (review PR-23).
usePanelTrail(() =>
  shown.value
    ? {
        steps: shown.value.zones.map((zone) => ({
          label: zone.name,
          to: { name: 'cosafare', query: { zona: zone.slug } },
        })),
      }
    : null,
)
usePageTitle(() => (shown.value ? [shown.value.title, 'Eventi'] : null))

// CF32: the organiser's page, named by its address so a reader knows where
// it leads before following it.
const sourceHost = computed(() => {
  if (!shown.value?.link) return ''
  try {
    return new URL(shown.value.link).hostname.replace(/^www\./, '')
  } catch {
    return shown.value.link
  }
})

const venuePath = computed(() => {
  const card = shown.value?.place?.card
  return card ? `/${card.type}/${card.id}` : null
})

const label =
  'text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-32 sm:flex-none sm:pt-1'
</script>

<template>
  <article v-if="shown" class="mx-auto w-full max-w-3xl">
    <!-- CF28: called off, said first and in words — the colour only repeats
    it. Unpublishing would have answered this page with a 404, and the guest
    would have walked anyway. -->
    <p
      v-if="shown.state === 'annullato'"
      class="mb-4 rounded-lg border-2 border-event-cancelled bg-surface px-4 py-3 font-semibold text-event-cancelled"
    >
      Annullato: questo evento non si tiene.
    </p>
    <p
      v-else-if="shown.state === 'rinviato'"
      class="mb-4 rounded-lg border border-hairline bg-surface px-4 py-3 font-semibold text-ink"
    >
      Rinviato: non si tiene in questa data, e la nuova non la conosciamo ancora.
    </p>
    <p
      v-if="!shown.is_published"
      class="mb-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase"
    >
      Bozza
    </p>

    <h1 class="mb-2 font-display text-display text-balance text-ink">{{ shown.title }}</h1>
    <p class="mb-2 text-lg text-ink">{{ formatEventWhen(shown) }}</p>
    <p v-if="shown.is_over" class="mb-6 text-muted">È già passato: resta qui, nell’archivio.</p>
    <div v-else class="mb-6"></div>

    <PosterViewer v-if="shown.poster" :src="shown.poster" :title="shown.title" />

    <dl class="mb-8 divide-y divide-hairline border-y border-hairline">
      <div v-if="shown.place" class="py-3 sm:flex sm:gap-6">
        <dt :class="label">Dove</dt>
        <dd class="space-y-3 text-ink">
          <RouterLink
            v-if="venuePath"
            :to="venuePath"
            class="font-semibold text-sea underline underline-offset-4 hover:text-sea-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
          >
            {{ shown.place.label }}
          </RouterLink>
          <span v-else class="font-semibold">{{ shown.place.label }}</span>
          <div><DirectionsLink :place="shown.place" /></div>
        </dd>
      </div>
      <div v-if="shown.description" class="py-3 sm:flex sm:gap-6">
        <dt :class="label">In breve</dt>
        <dd class="whitespace-pre-line text-ink">{{ shown.description }}</dd>
      </div>
      <div v-if="shown.link" class="py-3 sm:flex sm:gap-6">
        <dt :class="label">Programma e conferme</dt>
        <dd class="text-ink">
          <a
            :href="shown.link"
            target="_blank"
            rel="noopener"
            class="font-semibold text-sea underline underline-offset-4 hover:text-sea-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            >{{ sourceHost }}</a
          >
          <span class="text-muted"> (apre un altro sito)</span>
        </dd>
      </div>
    </dl>

    <!-- CF32: the archive is a secondary source for events, and says so. -->
    <p class="mb-8 text-sm text-muted">
      Gli eventi li riportiamo come li abbiamo saputi, da una locandina o da chi li organizza: prima
      di andare, una conferma da loro vale più della nostra.
    </p>

    <RouterLink
      v-if="canEdit"
      :to="{ name: 'eventoedit', params: { id: shown.id } }"
      class="inline-flex min-h-11 items-center rounded-lg bg-sea px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
    >
      Modifica l’evento
    </RouterLink>
  </article>
</template>
