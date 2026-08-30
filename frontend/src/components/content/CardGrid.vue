<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// The reading list (spec/design.md D6): a grid of covers, not a column of
// titles. Both list views hand it the same normalised shape, so the grid
// knows nothing about card types — the same bargain CardArticle strikes on
// the detail side.
export interface CardGridEntry {
  id: string
  title: string
  summary?: string
  cover: string | null
  isPublished: boolean
  to: RouteLocationRaw
}

withDefaults(defineProps<{ entries: CardGridEntry[]; placeholder?: string }>(), {
  // Each list is one type, so one placeholder colour for the whole grid is
  // enough — a card with no image gets a block in its layer's colour rather
  // than an empty rectangle (D5).
  placeholder: 'var(--color-sea)',
})
</script>

<template>
  <ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <li v-for="entry in entries" :key="entry.id">
      <RouterLink
        :to="entry.to"
        class="group flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-surface transition-colors hover:border-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      >
        <img
          v-if="entry.cover"
          :src="entry.cover"
          alt=""
          class="aspect-[4/3] w-full object-cover"
        />
        <!-- A tint of the layer's colour, not the colour itself: at thumbnail
        size a saturated block signals; at half a phone screen it shouts, and
        D7 keeps the saturated register for the map, where colour has a job. -->
        <span
          v-else
          class="aspect-[4/3] w-full"
          :style="{
            backgroundColor: `color-mix(in oklab, ${placeholder} 22%, var(--color-surface))`,
          }"
          aria-hidden="true"
        ></span>

        <span class="flex flex-1 flex-col gap-1 p-4">
          <span class="font-display text-title text-balance text-ink">
            {{ entry.title }}
            <span v-if="!entry.isPublished" class="text-xs font-normal text-muted">· bozza</span>
          </span>
          <span v-if="entry.summary" class="line-clamp-2 text-sm text-muted">
            {{ entry.summary }}
          </span>
        </span>
      </RouterLink>
    </li>
  </ul>
</template>
