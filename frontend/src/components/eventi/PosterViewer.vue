<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'

// An event's poster, shown so that it can be read (spec cosa-fare.md Part −1
// D9; CF30 as amended): a poster carries the programme, and on a phone its
// small print is the point. A tap opens it on the whole screen; Escape and
// the «Chiudi» button close it, and focus goes back to what opened it. While
// it is open the rest of the app is inert, so a keyboard and a screen reader
// stay inside it (ADR-0005). «Dimensione reale» — or a tap on the poster —
// shows it at its own size, to be scrolled through.
const props = defineProps<{
  src: string
  // The event's title: what the poster is of, for its name.
  title: string
}>()

const isOpen = ref(false)
const actualSize = ref(false)
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let opener: HTMLElement | null = null

// The app's root, made inert while the poster covers it.
const appRoot = () => document.getElementById('app')

const open = async (event: Event) => {
  opener = event.currentTarget as HTMLElement
  isOpen.value = true
  actualSize.value = false
  appRoot()?.setAttribute('inert', '')
  await nextTick()
  closeButton.value?.focus()
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
  appRoot()?.removeAttribute('inert')
  opener?.focus()
}

// Escape is spent here: the panel under the poster closes on Escape too
// (RoutePanel.vue), and one press must not do both. Tab goes round the
// dialog's own controls and nowhere else.
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const controls = [...dialog.value.querySelectorAll<HTMLElement>('button, [tabindex="0"]')]
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(() => {
  if (isOpen.value) appRoot()?.removeAttribute('inert')
})

const control =
  'flex min-h-11 cursor-pointer items-center rounded-full border border-hairline bg-surface px-4 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
</script>

<template>
  <figure class="mb-8">
    <button
      type="button"
      class="group block w-full cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sea"
      :aria-label="`Ingrandisci la locandina di ${props.title}`"
      @click="open"
    >
      <img
        :src="props.src"
        alt=""
        class="mx-auto max-h-72 w-auto rounded-lg border border-hairline object-contain sm:max-h-[28rem]"
      />
      <span
        class="mt-2 block text-center text-sm font-semibold text-sea underline-offset-4 group-hover:underline"
      >
        Ingrandisci la locandina
      </span>
    </button>
  </figure>

  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="`La locandina di ${props.title}`"
      class="fixed inset-0 z-[2000] flex flex-col bg-ink"
      @keydown="onKeydown"
    >
      <div class="flex flex-none items-center justify-end gap-2 p-3">
        <button
          type="button"
          :class="control"
          :aria-pressed="actualSize"
          @click="actualSize = !actualSize"
        >
          Dimensione reale
        </button>
        <button
          ref="closeButton"
          type="button"
          :class="control"
          title="Chiudi (Esc)"
          aria-keyshortcuts="Escape"
          @click="close"
        >
          Chiudi
        </button>
      </div>
      <!-- Its own size is scrolled, by a finger or the arrow keys once the
      area has focus; fitted, it is the whole poster at once. -->
      <div
        class="min-h-0 flex-1 overflow-auto"
        :class="actualSize ? '' : 'flex items-center justify-center p-3'"
        :tabindex="actualSize ? 0 : undefined"
        :aria-label="actualSize ? 'La locandina a dimensione reale' : undefined"
        :role="actualSize ? 'region' : undefined"
      >
        <img
          :src="props.src"
          :alt="`La locandina di ${props.title}`"
          :class="
            actualSize
              ? 'max-w-none cursor-zoom-out'
              : 'max-h-full max-w-full cursor-zoom-in object-contain'
          "
          @click="actualSize = !actualSize"
        />
      </div>
    </div>
  </Teleport>
</template>
