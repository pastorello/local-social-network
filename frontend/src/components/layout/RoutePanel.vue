<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useIsDesktop } from '@/composables/useBreakpoint'
import { providePanelTrail } from '@/composables/usePanelTrail'
import { parentOf, tintOf } from '@/lib/navigation'

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
//
// Close, up, back (review PR-22, design.md "Close, up, back"): three actions,
// and the app imitates the browser's history in none of them. *Close* — the
// button, Escape, a tap on the veil — goes to the map, from any page, from a
// tour's stop too. *Up* is the link at the panel's head, one level above
// (lib/navigation.ts). *Back* is the browser's and the system's own, and the
// two states in the URL, `?mappa=1` and `?tappa=N`, are steps it undoes.
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

// Onto the map, whatever came before: four pages deep or a link from outside,
// one press shows the map — never a step back through the pages, never out of
// the site. Pushed, so the browser's Back reopens what was closed. The map
// stays as it was; the store keeps its view (stores/map.ts).
const close = () => router.push('/')

const parent = computed(() => parentOf(route))

// The eyebrow (review PR-23, N-02): up, and what this page is within it — the
// zones a card is in, a tour's intents, a stop's position — which the page
// hands over as its data arrives (composables/usePanelTrail.ts). A stop names
// its own tour as the way up.
const trail = providePanelTrail()
const upLabel = computed(() => trail.value?.up ?? parent.value?.label ?? '')
const steps = computed(() => trail.value?.steps ?? [])
const tint = computed(() => tintOf(parent.value))

// Up is a link and, like every step, pushed. The panel takes focus after it
// even when only the query changed — a stop up to its tour, a zone up to «Cosa
// fare» — because the link the reader pressed may have gone, and focus with it.
const goUp = async (event: MouseEvent, navigate: (event?: MouseEvent) => Promise<unknown>) => {
  await navigate(event)
  if (event.defaultPrevented) takeFocus()
}

const expand = () => router.push({ query: { ...route.query, mappa: '1' } })

// The enlarged map's way up to its card: the same page without `?mappa=1`,
// pushed like any step — whether the enlarged map was a step of this visit or
// arrived in a shared link. Back is the browser's.
const collapse = () => {
  const withoutMap = { ...route.query }
  delete withoutMap.mappa
  router.push({ query: withoutMap })
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
  <!-- The veil: behind a wide panel the map is scenery, not a control. A tap
  on it closes the panel, as the button and Escape do — for the pointer only,
  since those two are already the keyboard's way. -->
  <div
    v-if="!narrow && isDesktop"
    class="pointer-events-auto absolute inset-0 bg-page/70"
    aria-hidden="true"
    @click="close"
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
    <div class="flex flex-none items-start gap-3 px-3 pt-3">
      <!-- Where the reader is (review PR-23, N-02; design.md D14's note of
      2026-10-23): the eyebrow over the page's title, as a way out of it. One
      level up, named after the page it leads to — the type's list, a stop's
      own tour — and beside it what this page is within it: the zone a card is
      in, linked to «Cosa fare», or where the reader stands (a stop's position,
      the chosen zone). Not a breadcrumb: the archive is two deep. In the
      colour of the type's layer (D7, a token — D8); the up link carries its
      chevron and the other links an underline, so the colour is never the
      only sign of a link (WCAG 1.4.1). Every link is a thumb's 44px. -->
      <nav
        v-if="parent || steps.length"
        aria-label="Dove sei"
        class="flex min-w-0 flex-1 flex-wrap items-center text-xs font-semibold tracking-[0.12em] uppercase"
        :style="{ color: tint }"
      >
        <RouterLink v-if="parent" v-slot="{ href, navigate }" :to="parent.to" custom>
          <a
            :href="href"
            class="inline-flex min-h-11 max-w-full min-w-11 items-center gap-1 rounded-full px-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            @click="goUp($event, navigate)"
          >
            <svg
              viewBox="0 0 20 20"
              class="h-4 w-4 flex-none"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4.5L6.5 10l5.5 5.5" />
            </svg>
            <span class="truncate">{{ upLabel }}</span>
          </a>
        </RouterLink>
        <span
          v-for="(step, index) in steps"
          :key="index"
          class="inline-flex items-center whitespace-nowrap"
        >
          <span class="px-1" aria-hidden="true">·</span>
          <RouterLink
            v-if="step.to"
            :to="step.to"
            class="inline-flex min-h-11 items-center rounded-full px-1 underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            >{{ step.label }}</RouterLink
          >
          <span v-else class="inline-flex min-h-11 items-center px-1">{{ step.label }}</span>
        </span>
      </nav>
      <!-- Escape does what this does, and says so (review PR-8, A-04): to the
      pointer in a tooltip, to a screen reader as the button's shortcut. No
      «Indietro» beside it — the up link is that, and Back is the browser's. -->
      <button
        type="button"
        class="ml-auto flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:border-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-label="Chiudi e torna alla mappa"
        title="Chiudi (Esc)"
        aria-keyshortcuts="Escape"
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
