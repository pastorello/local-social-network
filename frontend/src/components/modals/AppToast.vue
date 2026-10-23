<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const store = useToastStore()
</script>

<template>
  <!-- Under the pill, in the middle (review PR-8, L-10): in the bottom-right
  corner it was out of sight of a panel open in the centre, and on a phone
  under the reader's thumb. Transparent to the pointer, so for its five
  seconds it covers nothing a reader could want to press.

  The live region is always in the document and only its words come and go: a
  region that arrives together with its message is one a screen reader can
  miss. Its colours are the two toast tokens (main.css, ≥4.5:1 — tested in
  lib/__tests__/tokens.spec.ts), the same for every message. -->
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="pointer-events-none fixed inset-x-0 top-[var(--header-h,4.5rem)] z-1050 flex justify-center px-4"
  >
    <Transition
      enter-from-class="-translate-y-2 opacity-0"
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      leave-active-class="transition duration-200 ease-in motion-reduce:transition-none"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <p
        v-if="store.isVisible"
        class="w-full max-w-[30rem] rounded-2xl bg-toast-bg px-5 py-3 text-center text-sm font-semibold text-toast-fg shadow-xl sm:w-auto"
      >
        {{ store.message }}
      </p>
    </Transition>
  </div>
</template>
