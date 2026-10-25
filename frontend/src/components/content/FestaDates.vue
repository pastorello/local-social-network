<script setup lang="ts">
import type { Edizione } from '@/definitions/interfaces/Evento'
import { formatEventWhen } from '@/lib/when'

// When a feast is (cosa-fare.md Part −1 D9, K2): the editions somebody has
// typed, the next first, each with its weekday (CF34) — and without one, its
// recurrence and that this year's date is not confirmed yet. Never a date
// computed from the recurrence: «la seconda domenica di agosto» is a rule the
// committee keeps, and a guess would be wrong every other year.
defineProps<{
  editions: Edizione[]
  recurrence: string
}>()
</script>

<template>
  <ul v-if="editions.length" class="space-y-1">
    <li v-for="edition in editions" :key="edition.id">
      <strong class="font-semibold">{{ formatEventWhen(edition) }}</strong
      ><template v-if="edition.note"> — {{ edition.note }}</template>
    </li>
  </ul>
  <p v-else>
    <template v-if="recurrence">{{ recurrence }} · </template
    ><span class="text-muted">data non ancora confermata</span>
  </p>
  <p v-if="editions.length && recurrence" class="mt-1 text-sm text-muted">
    Di solito: {{ recurrence }}
  </p>
</template>
