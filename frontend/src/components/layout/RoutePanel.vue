<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useIsDesktop } from '@/composables/useBreakpoint'

// Every page but the home opens over the map (spec/design.md D15) and keeps its
// own URL, so a shared link to a card opens the map *and* the card. Two
// shapes on a wide screen (D17): a narrow panel on the right for a card with a
// place, because the map beside it is showing that place (D16); a wide,
// centred reading panel over a veiled map for everything else. On a phone
// every panel is the whole screen.
const props = defineProps<{ shape: 'narrow' | 'wide' }>()

const router = useRouter()
const route = useRoute()
const { isDesktop } = useIsDesktop()
const panel = ref<HTMLElement | null>(null)

// A page that opens over the map takes the reader's focus with it (D15):
// otherwise it stays on the link that opened it, which is now under the panel,
// and the next Tab starts from somewhere the reader cannot see. On a new page
// only — a filter changing the query string is the same page.
const takeFocus = async () => {
  await nextTick()
  panel.value?.focus({ preventScroll: true })
}
onMounted(takeFocus)
watch(() => route.path, takeFocus)

const narrow = computed(() => isDesktop.value && props.shape === 'narrow')

// Back to where the reader came from — which, for someone who opened the card
// from the map, is the map. A deep link has no "back" inside the app, so it
// closes onto the home instead of leaving the site.
const close = () => {
  if (window.history.state?.back) router.back()
  else router.push('/')
}

// Escape closes the panel, unless the reader is typing: Escape inside a field
// belongs to the field (an editor's own menus, a select being opened).
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  close()
}
</script>

<template>
  <!-- The veil: behind a wide panel the map is scenery, not a control. -->
  <div
    v-if="!narrow && isDesktop"
    class="pointer-events-auto absolute inset-0 bg-page/70"
    aria-hidden="true"
  ></div>

  <section
    ref="panel"
    tabindex="-1"
    class="pointer-events-auto absolute flex flex-col overflow-hidden bg-page focus:outline-none"
    :class="
      !isDesktop
        ? 'inset-0'
        : narrow
          ? 'top-4 right-4 bottom-4 w-[35rem] rounded-2xl border border-hairline shadow-[0_18px_40px_-16px_rgba(31,41,51,0.45)]'
          : 'top-4 bottom-4 left-1/2 w-[min(50.5rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-hairline shadow-[0_18px_40px_-16px_rgba(31,41,51,0.45)]'
    "
    @keydown="onKeydown"
  >
    <div class="flex flex-none justify-end px-3 pt-3">
      <button
        type="button"
        class="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:border-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Chiudi e torna alla mappa"
        @click="close"
      >
        <svg
          viewBox="0 0 20 20"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
        </svg>
      </button>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-6 lg:px-8">
      <slot></slot>
    </div>
  </section>
</template>
