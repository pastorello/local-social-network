<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

import { locale, setLocale, type Locale } from '@/lib/i18n'
import shell from '@/lib/i18n/messages/shell'

// «IT · EN» (review PR-19a, decision 5 of 2026-10-22): the reader's language,
// in the menu — in the pill before Accedi or the avatar on a wide screen, in
// *Menu* on a phone. Text, not flags: a flag is a nation, not a language, and
// «EN» reads the same to a reader from Zurich or Dublin. Two buttons, the
// current one pressed (aria-pressed), each named in its own language and
// marked so (`lang`), so a screen reader says «IT, Italiano» in Italian and
// «EN, English» in English. The full name is in the button's text, for a
// screen reader only, not in an aria-label: the name has to hold the visible
// «IT» as a word of its own (WCAG 2.5.3, as axe reads it), and «Italiano»
// does not. The chosen one is filled, not underlined: the
// underline is the menu's mark for the page one is on, and the home marks
// none (review PR-25). Choosing writes the address (`?lang=en`, or none for
// Italian), replaced rather than pushed: a language is not a step Back undoes.
const { variant = 'pill' } = defineProps<{ variant?: 'pill' | 'menu' }>()

const OPTIONS: { value: Locale; short: string; name: string }[] = [
  { value: 'it', short: 'IT', name: 'Italiano' },
  { value: 'en', short: 'EN', name: 'English' },
]

const route = useRoute()
const router = useRouter()

// English is switched on once its words are loaded (lib/i18n/index.ts); a
// load that fails leaves the page as it was.
const choose = async (value: Locale) => {
  if (value === locale.value) return
  try {
    await setLocale(value)
  } catch {
    return
  }
  const query = { ...route.query }
  if (value === 'en') query.lang = 'en'
  else delete query.lang
  router.replace({ query, hash: route.hash })
}

const button =
  'flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
</script>

<template>
  <div
    role="group"
    :aria-label="shell().language"
    class="flex items-center"
    :class="variant === 'menu' ? 'gap-1 px-2 py-1' : 'gap-0.5'"
  >
    <template v-for="(option, index) in OPTIONS" :key="option.value">
      <span v-if="index" class="text-muted" aria-hidden="true">·</span>
      <button
        type="button"
        :lang="option.value"
        :aria-pressed="locale === option.value"
        :class="[button, locale === option.value ? 'bg-sea text-white' : 'text-ink hover:bg-page']"
        @click="choose(option.value)"
      >
        {{ option.short }}<span class="sr-only">, {{ option.name }}</span>
      </button>
    </template>
  </div>
</template>
