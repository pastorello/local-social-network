<script setup lang="ts">
import { useTemplateRef } from 'vue'

// The floating controls over the mobile map (spec/design.md D4). C5 left M1's
// "minimal top menu" deliberately unbuilt — it was a design decision, not a
// geometry one — and this is where it lands: on a phone the map is the whole
// screen, so the layer controls float over it instead of sitting in a panel
// beside it.
// The open state belongs to the caller, not here: on a phone the layer panel
// and the sheet are both trying to sit over the map, and only one of them can
// win. HomeView is what knows about both.
const open = defineModel<boolean>('open', { default: false })

const trigger = useTemplateRef<HTMLButtonElement>('trigger')

const toggle = () => {
  open.value = !open.value
}

// Escape closes it from anywhere inside — including the trigger, which is
// outside the panel and was the one place it did not work — and focus goes
// back to the button that opened it. Closing a panel while the reader's focus
// is inside it otherwise drops them at the top of the document.
const close = () => {
  if (!open.value) return
  open.value = false
  trigger.value?.focus()
}
</script>

<template>
  <div class="pointer-events-none absolute inset-x-0 top-0 z-500 p-3" @keydown.esc="close">
    <div class="pointer-events-auto flex justify-end">
      <button
        ref="trigger"
        type="button"
        class="rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        aria-haspopup="true"
        :aria-expanded="open"
        aria-controls="map-chrome-panel"
        @click="toggle"
      >
        Livelli
      </button>
    </div>

    <div
      v-if="open"
      id="map-chrome-panel"
      class="pointer-events-auto mt-2 max-h-[60vh] overflow-y-auto rounded-lg border border-hairline bg-surface p-4 shadow-lg"
    >
      <slot></slot>
    </div>
  </div>
</template>
