<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import FesteIcon from '../icons/FesteIcon.vue'
import ChiesaIcon from '../icons/ChiesaIcon.vue'
import RicettaIcon from '../icons/RicettaIcon.vue'
import PersonaggioIcon from '../icons/PersonaggioIcon.vue'
import DialettoIcon from '../icons/DialettoIcon.vue'

// A disclosure menu, not 5 flat MenuButtons: the nav row is sized for 3-4
// items, and Feste/Chiese/Ricette/Personaggi/Dialetto all flat would overflow
// it and risk a WCAG reflow/target-size regression (ADR-0005).
const items = [
  { to: '/feste', label: 'Feste', icon: FesteIcon },
  { to: '/chiese', label: 'Chiese', icon: ChiesaIcon },
  { to: '/ricette', label: 'Ricette', icon: RicettaIcon },
  { to: '/personaggi', label: 'Personaggi storici', icon: PersonaggioIcon },
  { to: '/dialetto', label: 'Dialetto', icon: DialettoIcon },
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
    <button
      type="button"
      class="flex w-auto cursor-pointer items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm lg:grid lg:w-26 lg:place-items-center lg:gap-0 lg:p-4 lg:text-base"
      :class="{ 'text-sea border border-sea shadow-md': isActive }"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="lg:mb-1" aria-hidden="true">
        <FesteIcon class="h-5 w-5 lg:h-6 lg:w-6" />
      </span>
      <span>Schede</span>
    </button>

    <ul
      v-if="open"
      role="menu"
      class="absolute z-50 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
    >
      <li v-for="item in items" :key="item.to" role="none">
        <RouterLink
          :to="item.to"
          role="menuitem"
          class="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"
          @click="close"
        >
          <component :is="item.icon" class="w-5 h-5" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
