<script setup lang="ts">
import { computed, useId } from 'vue'

import type { Availability } from '@/definitions/interfaces/Content'
import { STATE_SENTENCE, formatDay, hasVisitInfo, telHref } from '@/lib/availability'

// What is known about getting in (ADR-0008). Read the ADR before changing what
// this says: it never claims a place is open, it shows hours only with the day
// someone reported them, and with nothing known it shows nothing at all.
// «Visitare» for a church or a monument; a business's is only its hours, so it
// is headed «Orari» (ADR-0010).
const props = withDefaults(
  defineProps<{ availability: Availability | null | undefined; heading?: string }>(),
  { heading: 'Visitare' },
)

const headingId = useId()
const shown = computed(() => hasVisitInfo(props.availability))
const sentence = computed(() =>
  props.availability ? STATE_SENTENCE[props.availability.state] : null,
)
</script>

<template>
  <section v-if="shown && availability" class="mb-10" :aria-labelledby="headingId">
    <h2 :id="headingId" class="mb-3 font-display text-title text-ink">{{ heading }}</h2>
    <p v-if="sentence" class="mb-3 text-ink">{{ sentence }}</p>

    <template v-if="availability.hours">
      <p class="whitespace-pre-line text-ink">{{ availability.hours }}</p>
      <p class="mt-1 mb-3 text-sm text-muted">
        <template v-if="availability.hours_updated">
          Orari segnalati il {{ formatDay(availability.hours_updated) }} — telefona per sicurezza.
        </template>
        <template v-else>Telefona per sicurezza.</template>
      </p>
    </template>

    <p v-if="availability.keeper || availability.keeper_phone" class="text-ink">
      <!-- The spaces are text nodes on purpose: Vue condenses the whitespace
      at the edge of a template, and "chiavi:Parrocchia" is what that renders. -->
      <span class="font-semibold">Chi ha le chiavi:</span>{{ ' ' }}
      <template v-if="availability.keeper">{{ availability.keeper }}</template>
      <template v-if="availability.keeper && availability.keeper_phone">{{ ' — ' }}</template>
      <a
        v-if="availability.keeper_phone"
        :href="telHref(availability.keeper_phone)"
        class="text-sea underline"
        >{{ availability.keeper_phone }}</a
      >
    </p>
  </section>
</template>
