<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import wizard from '@/lib/i18n/messages/wizard'

// «Hai scelto: Mangiare · Serapo» (review PR-21, point 4): at the head of the
// wizard's second and third steps, what the reader has chosen so far, each
// answer a link back to the step that asked it. The answers are the address,
// so a link is all it takes to change one. A step that was skipped — one
// answer only, lib/wizard.ts — has nothing to go back to: its answer is said,
// not linked. Empty until it knows the names, and a line tall all the same,
// so nothing under it moves when they come.
defineProps<{
  intent: string | null
  intentTo: RouteLocationRaw
  // The zone's name, or «Ovunque a Gaeta» — absent on the step that asks it.
  where?: string | null
  whereTo?: RouteLocationRaw | null
}>()

const link =
  'rounded-sm font-semibold text-sea underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
</script>

<template>
  <p class="min-h-5 text-sm text-muted">
    <template v-if="intent">
      {{ wizard().chosen }}
      <RouterLink :to="intentTo" :class="link"
        ><span class="sr-only">{{ wizard().change }}</span
        >{{ intent }}</RouterLink
      >
      <template v-if="where">
        <span aria-hidden="true"> · </span>
        <RouterLink v-if="whereTo" :to="whereTo" :class="link"
          ><span class="sr-only">{{ wizard().change }}</span
          >{{ where }}</RouterLink
        ><span v-else class="font-semibold text-ink">{{ where }}</span>
      </template>
    </template>
  </p>
</template>
