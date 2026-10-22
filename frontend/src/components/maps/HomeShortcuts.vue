<script setup lang="ts">
import { computed } from 'vue'

import ItinerarioIcon from '@/components/icons/ItinerarioIcon.vue'
import LuogoIcon from '@/components/icons/LuogoIcon.vue'
import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { Zone } from '@/definitions/interfaces/MapData'
import { previewNames } from '@/lib/doors'

// The home's two ways in that are not the map (review of 2026-10-22, P-02 and
// M-02): the reader who did not come from a B&B's card never sees /benvenuto,
// and nothing on the map says /cosa-fare exists. A bridge, not a destination:
// the wizard that becomes the one front door (review PR-21) absorbs both.
//
// The caller hands over only what passed lib/doors.ts's rules, so a door with
// nothing behind it is never drawn, and its second line names only what is.
const props = defineProps<{ withTours: Intent[]; zones: Zone[] }>()

const doors = computed(() => [
  ...(props.withTours.length
    ? [
        {
          to: '/benvenuto',
          icon: ItinerarioIcon,
          title: 'Che cosa ti va di fare?',
          line: previewNames(props.withTours.map((intent) => intent.name)),
        },
      ]
    : []),
  ...(props.zones.length
    ? [
        {
          to: '/cosa-fare',
          icon: LuogoIcon,
          title: 'Cosa c’è in una zona',
          line: previewNames(props.zones.map((zone) => zone.name)),
        },
      ]
    : []),
])
</script>

<template>
  <ul v-if="doors.length" class="space-y-2">
    <li v-for="door in doors" :key="door.to">
      <RouterLink
        :to="door.to"
        class="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3 hover:border-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      >
        <span
          class="flex size-10 flex-none items-center justify-center rounded-lg bg-sea/10 text-sea"
        >
          <component :is="door.icon" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block font-semibold text-ink">{{ door.title }}</span>
          <span class="block truncate text-sm text-muted">{{ door.line }}</span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="size-5 flex-none text-muted"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
            clip-rule="evenodd"
          />
        </svg>
      </RouterLink>
    </li>
  </ul>
</template>
