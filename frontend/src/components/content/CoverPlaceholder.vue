<script setup lang="ts">
import { computed, type Component } from 'vue'

import ChiesaIcon from '@/components/icons/ChiesaIcon.vue'
import DialettoIcon from '@/components/icons/DialettoIcon.vue'
import FesteIcon from '@/components/icons/FesteIcon.vue'
import ItinerarioIcon from '@/components/icons/ItinerarioIcon.vue'
import LibroIcon from '@/components/icons/LibroIcon.vue'
import LuogoIcon from '@/components/icons/LuogoIcon.vue'
import PersonaggioIcon from '@/components/icons/PersonaggioIcon.vue'
import RicettaIcon from '@/components/icons/RicettaIcon.vue'
import { layerVar } from '@/lib/mapLayers'

// What a card with no cover shows where the cover would be (spec/design.md
// D5, review PR-6): a pale tint of its layer's colour with the type's icon in
// the middle. The archive starts without photographs by rule, so this is the
// state most readers meet first — one placeholder for every list, not one per
// list. The size is the caller's; the icon is a direct child, so `*:size-8`
// on the caller scales it.
const props = defineProps<{ type: string }>()

const ICONS: Record<string, Component> = {
  chiese: ChiesaIcon,
  dialetto: DialettoIcon,
  feste: FesteIcon,
  itinerari: ItinerarioIcon,
  libri: LibroIcon,
  luoghi: LuogoIcon,
  personaggi: PersonaggioIcon,
  ricette: RicettaIcon,
}

// A tint, not the colour: at thumbnail size a saturated block signals; down a
// list of thirteen it is a paint chart, and D7 keeps the saturated register
// for the map, where colour has a job. The icon keeps the full colour — a
// thin stroke, so it names the type without shouting it.
const style = computed(() => {
  const colour = layerVar(props.type)
  return {
    backgroundColor: `color-mix(in oklab, ${colour} 18%, var(--color-page))`,
    color: colour,
  }
})
</script>

<template>
  <span class="flex items-center justify-center" :style="style" aria-hidden="true">
    <component :is="ICONS[type]" v-if="ICONS[type]" />
  </span>
</template>
