<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import CoverPlaceholder from './CoverPlaceholder.vue'

// The reading list (spec/design.md D6): a grid of covers, not a column of
// titles. Both list views hand it the same normalised shape, so the grid
// knows nothing about card types — the same bargain CardArticle strikes on
// the detail side.
export interface CardGridEntry {
  id: string
  title: string
  // The line under the title: «Zona · Genere» where the card has them, the
  // type's own summary otherwise (review PR-6).
  summary?: string
  cover: string | null
  isPublished: boolean
  to: RouteLocationRaw
}

// Each list is one type, so one type key for the whole grid is enough: it
// picks the placeholder's tint and icon for a card with no cover (D5).
defineProps<{ entries: CardGridEntry[]; type: string }>()
</script>

<template>
  <!-- Columns never narrower than 260px (review A-06): below that a title
  breaks one word per line. The panel is what is narrow, not the window, so
  the count comes from the space rather than from a breakpoint. -->
  <ul class="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(16.25rem,1fr))] sm:gap-6">
    <li v-for="entry in entries" :key="entry.id">
      <!-- Without a cover a card is a row on a phone — a 48px tint beside its
      title, so a list of nine places is nine lines rather than nine empty
      rectangles to scroll past — and a 96px band above the title on a wider
      screen, which grows only to match a photographed card in its row, so the
      titles still line up. With one it stays the cover card, its image capped
      at 160px on a phone (review PR-6, L-03/M-05). -->
      <RouterLink
        :to="entry.to"
        class="group flex h-full overflow-hidden rounded-lg border border-hairline bg-surface transition-colors hover:border-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
        :class="
          entry.cover
            ? 'flex-col'
            : 'items-center gap-3 p-3 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0'
        "
      >
        <img
          v-if="entry.cover"
          :src="entry.cover"
          alt=""
          class="aspect-[4/3] w-full object-cover max-sm:aspect-auto max-sm:h-40"
        />
        <CoverPlaceholder
          v-else
          :type="type"
          class="size-12 flex-none rounded sm:h-auto sm:min-h-24 sm:w-full sm:flex-1 sm:rounded-none sm:*:size-8"
        />

        <span
          class="flex min-w-0 flex-1 flex-col gap-1"
          :class="entry.cover ? 'p-4' : 'sm:flex-none sm:p-4'"
        >
          <!-- Two lines at most, and two lines always held in a grid, so every
          card in it is the same height whatever its title; one step below
          the title token, because a column is not a page. -->
          <span
            class="line-clamp-2 font-display text-lg leading-snug font-bold text-pretty text-ink sm:min-h-[2lh]"
          >
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
