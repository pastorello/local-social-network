<script setup lang="ts">
import type { MapCardFeature } from '@/definitions/interfaces/MapData'
import { CARD_LAYERS, layerColor, layerRoute } from '@/lib/mapLayers'

// Every place currently drawn on the map, as links. On mobile this is the
// content of the sheet (spec/design.md D3); on desktop it is the panel under
// the map. Either way it is the keyboard path a clickable pin does not have
// — ADR-0005 defers full map-widget operability, it does not excuse it.
defineProps<{ features: MapCardFeature[] }>()

const typeLabel = (key: string) => CARD_LAYERS.find((layer) => layer.key === key)?.label ?? 'Scheda'
</script>

<template>
  <ul aria-label="Luoghi sulla mappa" class="divide-y divide-hairline">
    <li v-for="feature in features" :key="feature.id">
      <RouterLink
        :to="layerRoute(feature.type, feature.id)"
        class="flex items-center gap-3 py-3 hover:bg-page focus-visible:bg-page"
      >
        <!-- D5: the card's first image is its cover. A card with none gets a
        block in its layer's colour rather than an empty square — a list of
        bare titles is dreary, which is the whole reason covers exist. -->
        <img
          v-if="feature.cover"
          :src="feature.cover"
          alt=""
          class="h-12 w-12 flex-none rounded object-cover"
        />
        <span
          v-else
          class="h-12 w-12 flex-none rounded"
          :style="{ backgroundColor: layerColor(feature.type) }"
          aria-hidden="true"
        ></span>

        <span class="min-w-0">
          <span class="block truncate font-semibold text-ink"
            >{{ feature.title
            }}<span v-if="!feature.is_published" class="text-xs font-normal text-muted">
              · bozza</span
            ></span
          >
          <span class="flex items-center gap-2 text-xs text-muted">
            <span
              class="inline-block h-2 w-2 rounded-full"
              :style="{ backgroundColor: layerColor(feature.type) }"
              aria-hidden="true"
            ></span>
            {{ typeLabel(feature.type) }}
          </span>
        </span>
      </RouterLink>
    </li>
  </ul>
</template>
