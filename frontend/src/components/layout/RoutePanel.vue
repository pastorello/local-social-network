<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useIsDesktop } from '@/composables/useBreakpoint'

// Every page but the home opens over the map (spec/design.md D15) and keeps its
// own URL, so a shared link to a card opens the map *and* the card. Two
// shapes on a wide screen (D17): a narrow panel on the right for a card with a
// place, because the map beside it is showing that place (D16); a wide,
// centred reading panel over a veiled map for everything else.
//
// On a phone (D18) a page is the whole screen — except a card with a place,
// which leaves a strip of the map at its head, already centred on the place.
// The strip is the same map, not a second one: the panel simply starts below
// it. Tapping "Allarga la mappa" gives the map the whole screen, with "Torna
// alla scheda" to come back; that state is in the URL (`?mappa=1`), so Back
// undoes it like any other step.
const props = defineProps<{ shape: 'narrow' | 'wide' }>()

const router = useRouter()
const route = useRoute()
const { isDesktop } = useIsDesktop()
const panel = ref<HTMLElement | null>(null)
const expandButton = ref<HTMLButtonElement | null>(null)
const collapseButton = ref<HTMLButtonElement | null>(null)

const narrow = computed(() => isDesktop.value && props.shape === 'narrow')
// The phone's card with a place: a strip of the map above the article.
const withStrip = computed(() => !isDesktop.value && props.shape === 'narrow')
const expanded = computed(() => withStrip.value && route.query.mappa === '1')

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

// Expanding and collapsing move focus to the control that undoes them: the
// button that was pressed has just disappeared.
watch(expanded, async (isExpanded) => {
  await nextTick()
  if (isExpanded) collapseButton.value?.focus()
  else expandButton.value?.focus()
})

// Back to where the reader came from — which, for someone who opened the card
// from the map, is the map. A deep link has no "back" inside the app, so it
// closes onto the home instead of leaving the site.
const close = () => {
  if (window.history.state?.back) router.back()
  else router.push('/')
}

const expand = () => router.push({ query: { ...route.query, mappa: '1' } })

// Back when the expanded map was one step of this visit; a link shared with
// `?mappa=1` has no step to go back to, so the query is dropped in place.
const collapse = () => {
  const withoutMap = { ...route.query }
  delete withoutMap.mappa
  const back = window.history.state?.back as string | undefined
  if (back && back.split('?')[0] === route.path) router.back()
  else router.replace({ query: withoutMap })
}

// Escape closes the panel, unless the reader is typing: Escape inside a field
// belongs to the field (an editor's own menus, a select being opened).
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  close()
}

const pill =
  'pointer-events-auto flex h-11 cursor-pointer items-center gap-2 rounded-full border border-hairline bg-surface px-4 text-sm font-semibold text-ink shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
</script>

<template>
  <!-- The veil: behind a wide panel the map is scenery, not a control. -->
  <div
    v-if="!narrow && isDesktop"
    class="pointer-events-auto absolute inset-0 bg-page/70"
    aria-hidden="true"
  ></div>

  <!-- The phone's strip: the map shows through above the article. Its button
  sits inside the strip's bottom-right corner, 12px in (review PR-5, M-04):
  on the article's edge it read as part of neither. -->
  <button
    v-if="withStrip && !expanded"
    ref="expandButton"
    type="button"
    :class="[pill, 'absolute top-[7.75rem] right-3']"
    @click="expand"
  >
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
      <path d="M11.5 3.5h5v5M8.5 16.5h-5v-5M16.5 3.5l-5 5M3.5 16.5l5-5" />
    </svg>
    Allarga la mappa
  </button>
  <button
    v-if="expanded"
    ref="collapseButton"
    type="button"
    :class="[pill, 'absolute right-3 bottom-4 left-3 justify-center']"
    @click="collapse"
    @keydown.esc="collapse"
  >
    Torna alla scheda
  </button>

  <section
    v-show="!expanded"
    ref="panel"
    tabindex="-1"
    class="pointer-events-auto absolute flex flex-col overflow-hidden bg-page focus:outline-none"
    :class="
      withStrip
        ? 'inset-x-0 top-[11.25rem] bottom-0 rounded-t-2xl shadow-[0_-8px_24px_-12px_rgba(31,41,51,0.45)]'
        : !isDesktop
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
