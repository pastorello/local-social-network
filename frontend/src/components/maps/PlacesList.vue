<script setup lang="ts">
import CoverPlaceholder from '@/components/content/CoverPlaceholder.vue'
import type { MapCardFeature } from '@/definitions/interfaces/MapData'
import home from '@/lib/i18n/messages/home'
import types, { wordsOf } from '@/lib/i18n/messages/types'
import { layerColor, layerRoute } from '@/lib/mapLayers'

// Every place currently drawn on the map, as links. On mobile this is the
// content of the sheet (spec/design.md D3); on desktop it is the panel under
// the map. Either way it is the keyboard path a clickable pin does not have
// — ADR-0005 defers full map-widget operability, it does not excuse it. In the
// reader's language around the cards' own Italian titles (review PR-19a).
defineProps<{ features: MapCardFeature[] }>()

const typeLabel = (key: string) => wordsOf(key)?.layer ?? types().entry
</script>

<template>
  <ul :aria-label="home().placesHeading" class="divide-y divide-hairline">
    <li v-for="feature in features" :key="feature.id">
      <RouterLink
        :to="layerRoute(feature.type, feature.id)"
        class="flex items-center gap-3 py-3 hover:bg-page focus-visible:bg-page"
      >
        <!-- D5: the card's first image is its cover. A card with none gets the
        lists' one placeholder, a tint with its type's icon — a list of bare
        titles is dreary, and a column of saturated squares is a paint chart
        (review PR-6, L-01). -->
        <img
          v-if="feature.cover"
          :src="feature.cover"
          alt=""
          class="h-12 w-12 flex-none rounded object-cover"
        />
        <CoverPlaceholder v-else :type="feature.type" class="h-12 w-12 flex-none rounded" />

        <span class="min-w-0">
          <span class="block truncate font-semibold text-ink"
            ><span lang="it">{{ feature.title }}</span
            ><span v-if="!feature.is_published" class="text-xs font-normal text-muted">
              · {{ home().draft }}</span
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
