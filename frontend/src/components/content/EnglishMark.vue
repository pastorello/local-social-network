<script setup lang="ts">
import { locale } from '@/lib/i18n'

// «EN» beside a card that has a published English version (review of
// 2026-10-22, decision 5; PR-19b; spec translations.md T10) — for a reader in
// English only: in Italian every card is in its own language already, and the
// mark would say nothing. Two letters for the eye; what they mean is said in
// words to a screen reader and, on hover, to a pointer. English, and marked
// so, wherever it sits — beside a title marked Italian, too. A label in the
// links' colour on a hairline of it, never a button: it leads nowhere the
// title does not. Where it sits is the caller's, its spacing too.
//
// Its words are English and only ever shown in English, so they are written
// here, as the switch writes each language's name in itself, rather than in a
// dictionary: one there, read from the lists' chunks as well as the first
// paint's, split the entry into one more file and cost every Italian page of
// the gate 150 ms of LCP (measured 2026-10-25).
const MEANING = 'Available in English'
</script>

<template>
  <span
    v-if="locale === 'en'"
    lang="en"
    :title="MEANING"
    class="inline-block rounded-sm border border-sea px-1 align-[0.125em] font-sans text-[0.6875rem] leading-4 font-semibold tracking-wide text-sea"
    ><span aria-hidden="true">EN</span><span class="sr-only">, {{ MEANING }}</span></span
  >
</template>
