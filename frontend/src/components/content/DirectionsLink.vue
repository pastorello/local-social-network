<script setup lang="ts">
import { computed } from 'vue'

import type { MapPoint } from '@/definitions/interfaces/Content'
import { directionsUrl } from '@/lib/directions'

// The way to a card's place (review PR-3): the action for the reader already
// in town, so it is the section's primary button. It leaves the site, and says
// so in words a reader sees before tapping — not only to a screen reader —
// because a tourist who lands in Google Maps unannounced has lost the page.
const { place, label = 'Come arrivarci' } = defineProps<{
  place: Pick<MapPoint, 'lat' | 'lng'>
  label?: string
}>()

const href = computed(() => directionsUrl(place))
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener"
    class="inline-block min-h-11 rounded-full bg-sea px-5 py-3 text-center text-sm leading-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
  >
    {{ label }} <span class="font-normal">(apre Google Maps)</span>
  </a>
</template>
