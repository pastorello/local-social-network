<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'

// A disclosure of links in the menu (spec/design.md D14) — the account menu
// behind the avatar, and on a phone the rest of the menu. Not an ARIA `menu`:
// what it holds are links and one button, which a disclosure announces
// honestly and a menu role would make keyboard users drive with arrow keys.
defineProps<{ label: string; triggerClass?: string }>()

const route = useRoute()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panelId = useId()

const close = () => {
  open.value = false
}

// Escape closes it from anywhere inside and gives focus back to the button —
// closing a panel with focus inside it otherwise drops the reader at the top
// of the document. That Escape is spent: inside a page's panel (*Nuova
// scheda* on Le mie schede, review PR-13) it must not close the page too.
const closeAndReturn = (event: KeyboardEvent) => {
  if (!open.value) return
  event.preventDefault()
  open.value = false
  trigger.value?.focus()
}

const onClickOutside = (event: MouseEvent) => {
  if (root.value && !root.value.contains(event.target as Node)) close()
}

watch(() => route.fullPath, close)
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative" @keydown.esc="closeAndReturn">
    <button
      ref="trigger"
      type="button"
      :class="triggerClass"
      :aria-label="label"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="open = !open"
    >
      <slot name="trigger"></slot>
    </button>
    <div
      v-if="open"
      :id="panelId"
      class="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-hairline bg-surface py-2 shadow-lg"
    >
      <slot :close="close"></slot>
    </div>
  </div>
</template>
