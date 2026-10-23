<script setup lang="ts">
import axios from 'axios'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import FesteIcon from '../icons/FesteIcon.vue'
import RicettaIcon from '../icons/RicettaIcon.vue'
import PersonaggioIcon from '../icons/PersonaggioIcon.vue'
import DialettoIcon from '../icons/DialettoIcon.vue'
import LibroIcon from '../icons/LibroIcon.vue'
import LuogoIcon from '../icons/LuogoIcon.vue'
import type { CardCounts } from '@/definitions/interfaces/Content'

// A disclosure menu, not flat MenuButtons: the nav row is sized for 3-4 items,
// and six flat would overflow it and risk a WCAG reflow/target-size regression
// (ADR-0005). In the order a reader looks for them (review PR-9), and with no
// *Chiese*: churches are a heading under *Luoghi* (content.md, 2026-09-11),
// reached from its chip on /luoghi — one place, not two. The key is the type's
// route segment and its key in /api/content/counts/.
const items = [
  { key: 'luoghi', label: 'Luoghi', icon: LuogoIcon },
  { key: 'feste', label: 'Feste', icon: FesteIcon },
  { key: 'ricette', label: 'Ricette', icon: RicettaIcon },
  { key: 'personaggi', label: 'Personaggi storici', icon: PersonaggioIcon },
  { key: 'dialetto', label: 'Dialetto', icon: DialettoIcon },
  { key: 'libri', label: 'Libri consigliati', icon: LibroIcon },
]

// A church is still one of this menu's cards, so its page lights the button.
const sections = [...items.map((item) => `/${item.key}`), '/chiese']

const route = useRoute()
const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const isActive = computed(() => sections.some((path) => route.path.startsWith(path)))

// The published count beside each entry, so a reader sees where the archive is
// growing; an empty heading stays a link, greyed, and its list says so. Asked
// again at every opening — a count is one cheap query — and kept meanwhile, so
// a second opening shows the last numbers at once. Without them the menu is
// still the menu: no number, and nothing greyed.
const counts = ref<CardCounts | null>(null)
const countOf = (key: string): number | undefined => counts.value?.[key]

const loadCounts = async () => {
  try {
    counts.value = (await axios.get<CardCounts>('/api/content/counts/')).data
  } catch (error) {
    console.log('error:', error)
  }
}

watch(open, (isOpen) => {
  if (isOpen) loadCounts()
})

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
      class="flex h-9 cursor-pointer items-center gap-0.5 rounded-full px-2 text-sm lg:gap-1 lg:px-3 font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
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

    <!-- Hung from the button's right edge on a phone: from its left one it ran
    20px past a 360px screen, and the counts sit on that side (review PR-9). -->
    <ul
      v-if="open"
      role="menu"
      class="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-hairline bg-surface py-2 shadow-lg lg:right-auto lg:left-0"
    >
      <li v-for="item in items" :key="item.key" role="none">
        <RouterLink
          :to="`/${item.key}`"
          role="menuitem"
          class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-page"
          :class="countOf(item.key) === 0 ? 'text-muted' : 'text-ink'"
          @click="close"
        >
          <component :is="item.icon" class="w-5 h-5" aria-hidden="true" />
          <span>{{ item.label }}</span>
          <!-- Heard as «Luoghi, 9 schede»; the noun's space is inside the
          string, since Vue drops a span's leading whitespace. -->
          <span v-if="countOf(item.key) !== undefined" class="ml-auto pl-2 text-muted tabular-nums">
            <span class="sr-only">, </span>{{ countOf(item.key)
            }}<span class="sr-only">{{ countOf(item.key) === 1 ? ' scheda' : ' schede' }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
