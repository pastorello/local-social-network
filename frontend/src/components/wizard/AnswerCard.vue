<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// One answer of the wizard «Cosa fare adesso» (review PR-21, study 10): a big
// card a thumb can take, full width on a phone, and a link — choosing is
// going on, so there is no «Avanti», and the answer's address is the step it
// leads to (lib/wizard.ts). The look is /benvenuto's intent card of review
// PR-14: a tile where a cover will go, the name, a line under it. Its ring is
// the keyboard's alone (focus-visible), and the pointer is told by the name's
// underline, never by a darker border that reads as a ring left behind (M-09).
defineProps<{ to: RouteLocationRaw; title: string; description?: string; line?: string }>()
</script>

<template>
  <RouterLink
    :to="to"
    class="group flex h-full items-center gap-4 rounded-2xl border border-hairline bg-surface p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
  >
    <slot name="tile"></slot>
    <span class="flex min-w-0 flex-col gap-0.5">
      <span
        class="font-display text-title text-ink decoration-2 underline-offset-4 group-hover:underline"
        >{{ title }}</span
      >
      <span v-if="description" class="text-ink">{{ description }}</span>
      <span v-if="line" class="text-sm text-muted">{{ line }}</span>
    </span>
  </RouterLink>
</template>
