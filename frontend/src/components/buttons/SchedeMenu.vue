<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import FesteIcon from '../icons/FesteIcon.vue'
import ChiesaIcon from '../icons/ChiesaIcon.vue'
import RicettaIcon from '../icons/RicettaIcon.vue'
import PersonaggioIcon from '../icons/PersonaggioIcon.vue'
import DialettoIcon from '../icons/DialettoIcon.vue'
import LibroIcon from '../icons/LibroIcon.vue'
import LuogoIcon from '../icons/LuogoIcon.vue'

// A disclosure menu, not 7 flat MenuButtons: the nav row is sized for 3-4
// items, and Feste/Luoghi/Chiese/Ricette/Personaggi/Dialetto/Libri all flat would
// overflow it and risk a WCAG reflow/target-size regression (ADR-0005).
const items = [
  { to: '/feste', label: 'Feste', icon: FesteIcon },
  { to: '/luoghi', label: 'Luoghi', icon: LuogoIcon },
  { to: '/chiese', label: 'Chiese', icon: ChiesaIcon },
  { to: '/ricette', label: 'Ricette', icon: RicettaIcon },
  { to: '/personaggi', label: 'Personaggi storici', icon: PersonaggioIcon },
  { to: '/dialetto', label: 'Dialetto', icon: DialettoIcon },
  { to: '/libri', label: 'Libri consigliati', icon: LibroIcon },
]

const route = useRoute()
const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const isActive = computed(() => items.some((item) => route.path.startsWith(item.to)))

const close = () => {
  open.value = false
}
const toggle = () => {
  open.value = !open.value
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') close()
}

const onClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) close()
}

watch(() => route.fullPath, close)

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div ref="menuRef" class="relative">
    <!-- A pill item like its neighbours in the menu (spec/design.md D14). -->
    <button
      type="button"
      class="flex h-9 cursor-pointer items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      :class="{ 'bg-sea/10 text-sea': isActive }"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <span>Schede</span>
      <svg
        viewBox="0 0 20 20"
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M5.5 8l4.5 4.5L14.5 8" />
      </svg>
    </button>

    <ul
      v-if="open"
      role="menu"
      class="absolute left-0 z-50 mt-2 w-56 rounded-lg border border-hairline bg-surface py-2 shadow-lg"
    >
      <li v-for="item in items" :key="item.to" role="none">
        <RouterLink
          :to="item.to"
          role="menuitem"
          class="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-page"
          @click="close"
        >
          <component :is="item.icon" class="w-5 h-5" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
