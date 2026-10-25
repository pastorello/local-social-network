<script setup lang="ts">
import { computed, type Component } from 'vue'

import BereIcon from '@/components/icons/BereIcon.vue'
import CamminoIcon from '@/components/icons/CamminoIcon.vue'
import CittaIcon from '@/components/icons/CittaIcon.vue'
import ItinerarioIcon from '@/components/icons/ItinerarioIcon.vue'
import MareIcon from '@/components/icons/MareIcon.vue'
import TavolaIcon from '@/components/icons/TavolaIcon.vue'
import { intentVar } from '@/lib/intents'

// What an intent's card shows beside its name on /benvenuto (review PR-14,
// M-09): a tint of the intent's colour with its icon — the sea, the town, the
// walk, the table, the glass — where a cover will go the day the archive has
// photographs (P-07). The same recipe as CoverPlaceholder: a pale tint over
// the page ground, the icon in the full colour. An intent the admin adds wears
// the tours' map icon until it is drawn one here. The size is the caller's;
// the icon is a direct child, so `*:size-8` on the caller scales it.
const props = defineProps<{ slug: string }>()

const ICONS: Record<string, Component> = {
  mare: MareIcon,
  citta: CittaIcon,
  camminare: CamminoIcon,
  mangiare: TavolaIcon,
  bere: BereIcon,
}

const style = computed(() => {
  const colour = intentVar(props.slug)
  return {
    backgroundColor: `color-mix(in oklab, ${colour} 18%, var(--color-page))`,
    color: colour,
  }
})
</script>

<template>
  <span class="flex items-center justify-center" :style="style" aria-hidden="true">
    <component :is="ICONS[slug] ?? ItinerarioIcon" />
  </span>
</template>
