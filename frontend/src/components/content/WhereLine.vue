<script setup lang="ts">
import { computed } from 'vue'

import type { MapPoint } from '@/definitions/interfaces/Content'
import { directionsUrl } from '@/lib/directions'
import { firstSentence } from '@/lib/firstSentence'

// «Dove» (review PR-24, proposal 2 of the review, approved 2026-10-23): one
// line under a place's title and cover, before its text, for the reader
// standing in town — the first sentence of how one gets there, and the way
// there. The reader on the sofa reads on; «Dove si trova» keeps the whole of
// it after the text. Typographic, not a button (D6): the eyebrow's small
// capitals for its name, the article's own link style for the way. The zone
// is not here, because the panel's eyebrow above the title already says it.
const { place, howToGetThere = '' } = defineProps<{
  place: Pick<MapPoint, 'lat' | 'lng'>
  howToGetThere?: string
}>()

const sentence = computed(() => firstSentence(howToGetThere))
const href = computed(() => directionsUrl(place))
</script>

<template>
  <p class="mb-8 max-w-[65ch] text-ink">
    <span class="mr-1 text-xs font-semibold tracking-[0.12em] text-muted uppercase">Dove</span>
    <!-- On a line of its own, so the words keep a space on each side of it,
    with a sentence or without one: the compiler drops the whitespace between
    two tags, and the label would run into what follows. -->
    {{ sentence }}
    <!-- It leaves the site, and says so in words the reader sees (review
    PR-3). Whole on a phone too: the line wraps before it, never inside it. -->
    <a
      :href="href"
      target="_blank"
      rel="noopener"
      class="font-semibold whitespace-nowrap text-sea underline underline-offset-4"
    >
      Come arrivarci <span class="font-normal">(apre Google Maps)</span>
    </a>
  </p>
</template>
