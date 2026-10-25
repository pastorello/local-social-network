<script setup lang="ts">
import type { Overlay } from '@/definitions/interfaces/MapData'
import home from '@/lib/i18n/messages/home'
import { wordsOf } from '@/lib/i18n/messages/types'
import { CARD_LAYERS, REPORTS_LAYER_KEY, layerColor } from '@/lib/mapLayers'
import { statusColor } from '@/lib/reportStatus'

// The layer controls, shared by both homes (spec/design.md D2): the desktop
// side panel and the mobile floating chrome render this same component, so
// there is one set of ids and one set of labels rather than two that drift.
const props = defineProps<{
  overlays: Overlay[]
  featureCount: (key: string) => number
  // Only someone with an account is handed a count, and only they get the
  // reports layer at all (decided 2026-10-22, reports-and-polls.md R1): for a
  // reader there is no toggle, not an empty one.
  reportCount?: number
}>()

const activeLayers = defineModel<Record<string, boolean>>('activeLayers', { required: true })
const activeOverlays = defineModel<Record<string, boolean>>('activeOverlays', { required: true })
const overlayOpacity = defineModel<Record<string, number>>('overlayOpacity', { required: true })
</script>

<template>
  <div class="space-y-6">
    <fieldset class="space-y-2">
      <legend class="mb-2 text-lg font-semibold">{{ home().layers }}</legend>
      <div v-for="layer in CARD_LAYERS" :key="layer.key" class="flex items-center gap-2">
        <input
          :id="`layer-${layer.key}`"
          v-model="activeLayers[layer.key]"
          type="checkbox"
          class="h-4 w-4"
        />
        <span
          class="inline-block h-3 w-3 rounded-full"
          :style="{ backgroundColor: layerColor(layer.key) }"
          aria-hidden="true"
        ></span>
        <label :for="`layer-${layer.key}`" class="text-sm text-ink">
          {{ wordsOf(layer.key)?.layer ?? layer.label }}
          <span class="text-muted">({{ props.featureCount(layer.key) }})</span>
        </label>
      </div>
      <!-- A collaborator's layer, named in Italian (review PR-19a). -->
      <div v-if="props.reportCount !== undefined" class="flex items-center gap-2" lang="it">
        <input
          id="layer-segnalazioni"
          v-model="activeLayers[REPORTS_LAYER_KEY]"
          type="checkbox"
          class="h-4 w-4"
        />
        <span
          class="inline-block h-3 w-3 rounded-full"
          :style="{ backgroundColor: statusColor('open') }"
          aria-hidden="true"
        ></span>
        <label for="layer-segnalazioni" class="text-sm text-ink">
          Segnalazioni
          <span class="text-muted">({{ props.reportCount }})</span>
        </label>
      </div>
    </fieldset>

    <!-- No empty section when the reader has none: a heading with nothing
    under it would tell someone outside the steering tier that something is
    being kept from them (ADR-0006). -->
    <fieldset v-if="overlays.length" class="space-y-3">
      <legend class="mb-2 text-lg font-semibold">{{ home().overlays }}</legend>
      <div v-for="overlay in overlays" :key="overlay.id" class="space-y-1">
        <div class="flex items-center gap-2">
          <input
            :id="`overlay-${overlay.id}`"
            v-model="activeOverlays[overlay.id]"
            type="checkbox"
            class="h-4 w-4"
          />
          <label :for="`overlay-${overlay.id}`" class="text-sm text-ink">{{ overlay.name }}</label>
        </div>
        <div v-if="activeOverlays[overlay.id]" class="flex items-center gap-2 pl-6">
          <label :for="`overlay-opacity-${overlay.id}`" class="text-xs text-muted">{{
            home().opacity
          }}</label>
          <input
            :id="`overlay-opacity-${overlay.id}`"
            v-model.number="overlayOpacity[overlay.id]"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="flex-1"
          />
        </div>
      </div>
    </fieldset>
  </div>
</template>
