<script setup lang="ts">
import type { ReportPin } from '@/definitions/interfaces/Report'
import { STATUS_META, statusColor } from '@/lib/reportStatus'

// Every report currently drawn on the map, as links — the reports counterpart
// of PlacesList, and the half of the keyboard path that was missing.
//
// ADR-0005 deferred full map-widget operability on the argument that both maps
// "also expose their data as text lists". That was true of the four card
// layers and not of this one: a report could be reached only by clicking its
// pin, so for a keyboard or screen-reader user the reports layer was a set of
// coloured dots with nothing behind them. An equivalent path has to be
// equivalent before it can be declared one.
defineProps<{ pins: ReportPin[] }>()
</script>

<template>
  <ul aria-label="Segnalazioni sulla mappa" class="divide-y divide-hairline">
    <li v-for="pin in pins" :key="pin.id">
      <RouterLink
        :to="`/reports/${pin.id}`"
        class="flex items-center gap-3 py-3 hover:bg-page focus-visible:bg-page"
      >
        <span
          class="h-2.5 w-2.5 flex-none rounded-full"
          :style="{ backgroundColor: statusColor(pin.status) }"
          aria-hidden="true"
        ></span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-ink">{{ pin.title }}</span>
        </span>
        <!-- The status is what the pin's colour says on the map, in words:
        colour alone is never the only carrier of meaning (WCAG 1.4.1). -->
        <span class="flex-none text-xs text-muted">{{ STATUS_META[pin.status].label }}</span>
      </RouterLink>
    </li>
  </ul>
</template>
