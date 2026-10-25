<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'

import ActionButton from '@/components/buttons/ActionButton.vue'
import NavDisclosure from '@/components/buttons/NavDisclosure.vue'
import MyEvents from '@/components/eventi/MyEvents.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import type { MyCard } from '@/definitions/interfaces/Content'
import {
  attivitaConfig,
  chiesaConfig,
  dialettoConfig,
  itinerarioConfig,
  libroConfig,
  luogoConfig,
  personaggioConfig,
  ricettaConfig,
} from '@/definitions/typeConfigs'
import { LANGUAGE_LABELS } from '@/lib/languages'

// *Le mie schede* (review PR-13, C-02; design.md "Left to the build"): a
// collaborator's own cards, every type on one page, behind the avatar — and
// where they land after signing in while one is a draft (lib/landing.ts).
// Until it, a draft was found type by type, through each list's *Le mie*
// filter, and the collaborator had to remember which type it was.

interface PaginatedCards {
  count: number
  next: string | null
  results: MyCard[]
}

const capitalised = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

// Every type a collaborator writes, in the order the menu offers them to a
// reader (review PR-9) — the churches and the businesses beside the places,
// the tours last. The key is the type's route segment and its `type` in
// /api/content/mine/. Feste keeps views of its own, so it has no config to
// read.
const TYPES = [
  luogoConfig,
  chiesaConfig,
  attivitaConfig,
  { key: 'feste', label: 'Feste', singularLabel: 'festa', routeNames: { create: 'festecreate' } },
  ricettaConfig,
  personaggioConfig,
  dialettoConfig,
  libroConfig,
  itinerarioConfig,
].map((config) => ({
  key: config.key,
  label: config.label,
  newLabel: capitalised(config.singularLabel),
  create: { name: config.routeNames.create },
}))

const cards = ref<MyCard[]>([])
const total = ref(0)
const nextPage = ref<string | null>(null)
const loading = ref(true)
const failed = ref(false)

// The drafts first, then what is published, each by type: what is unfinished
// is what this page is for, and why a collaborator lands on it after signing
// in. The API sends them in that order too, so the drafts are whole on the
// first page.
const byType = (list: MyCard[]) =>
  TYPES.map((type) => ({
    ...type,
    cards: list.filter((card) => card.type === type.key),
  })).filter((group) => group.cards.length > 0)

const drafts = computed(() => cards.value.filter((card) => !card.is_published))
const parts = computed(() =>
  [
    { key: 'bozze', label: 'Bozze', groups: byType(drafts.value) },
    {
      key: 'pubblicate',
      label: 'Pubblicate',
      groups: byType(cards.value.filter((card) => card.is_published)),
    },
  ].filter((part) => part.groups.length > 0),
)

// A card's page, and the same page with its form open (`?edit=1`, the way a
// new translation opens too).
const cardPath = (card: MyCard) => `/${card.type}/${card.id}`

// The Italian name heads a translation as it heads its page (T7): the
// translation's own title may still be empty.
const nameOf = (card: MyCard) => card.original_title || card.title || 'Senza titolo'

const load = async (url: string, append: boolean) => {
  try {
    const { data } = await axios.get<PaginatedCards>(url)
    cards.value = append ? [...cards.value, ...data.results] : data.results
    total.value = data.count
    nextPage.value = data.next
  } catch (error) {
    console.log('error:', error)
    failed.value = true
  } finally {
    loading.value = false
  }
}

// A collaborator's cards are rarely more than a page; a hundred at a time —
// the cap every list shares (common/pagination.py) — keeps the groups whole.
onMounted(() => load('/api/content/mine/?page_size=100', false))

const loadMore = () => {
  if (nextPage.value) load(nextPage.value, true)
}

const tag = 'text-xs font-semibold tracking-[0.12em] uppercase'
const menuLink =
  'block px-4 py-2 text-sm text-ink hover:bg-page focus-visible:bg-page focus-visible:outline-none'
</script>

<template>
  <div class="mx-auto w-full max-w-3xl pt-2">
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <MainTitle>Le mie schede</MainTitle>
        <p v-if="!loading && !failed" class="-mt-4 text-muted">
          {{ total }} {{ total === 1 ? 'scheda' : 'schede'
          }}<template v-if="drafts.length">, {{ drafts.length }} in bozza</template>
        </p>
      </div>

      <!-- A new card starts from its type: the form is the type's. A
      disclosure of links, like the account menu it is reached from. -->
      <NavDisclosure
        label="Nuova scheda"
        trigger-class="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-sea px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      >
        <template #trigger>
          Nuova scheda
          <svg
            viewBox="0 0 20 20"
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5.5 8l4.5 4.5L14.5 8" />
          </svg>
        </template>
        <RouterLink v-for="type in TYPES" :key="type.key" :to="type.create" :class="menuLink">
          {{ type.newLabel }}
        </RouterLink>
      </NavDisclosure>
    </header>

    <p v-if="failed" class="text-muted">
      Non è stato possibile caricare le tue schede. Riprova tra poco.
    </p>
    <p v-else-if="!loading && cards.length === 0" class="text-muted">
      Non hai ancora scritto nessuna scheda. Cominciane una da «Nuova scheda».
    </p>

    <section
      v-for="part in parts"
      :key="part.key"
      :aria-labelledby="`mie-${part.key}`"
      class="mb-10"
    >
      <h2 :id="`mie-${part.key}`" class="mb-4 font-display text-title text-ink">
        {{ part.label }}
      </h2>
      <div v-for="group in part.groups" :key="group.key" class="mb-6">
        <h3 :class="[tag, 'mb-1 text-muted']">{{ group.label }}</h3>
        <ul class="divide-y divide-hairline border-y border-hairline">
          <li
            v-for="card in group.cards"
            :key="card.id"
            class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3"
          >
            <RouterLink
              :to="cardPath(card)"
              lang="it"
              class="min-w-0 flex-1 font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            >
              {{ nameOf(card) }}
            </RouterLink>
            <span v-if="card.translation_of" :class="[tag, 'text-muted']">
              {{ LANGUAGE_LABELS[card.language] ?? card.language }}
            </span>
            <RouterLink
              :to="{ path: cardPath(card), query: { edit: '1' } }"
              :aria-label="`Modifica ${nameOf(card)}`"
              class="text-sm font-semibold text-sea underline underline-offset-4 hover:text-sea-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
            >
              Modifica
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <ActionButton v-if="nextPage" size="small" @click="loadMore">Carica altre</ActionButton>

    <!-- Events are not cards (cosa-fare.md D9, CF25), so they are not in the
    lists above nor in «Nuova scheda»: a part of their own, filed from here. -->
    <MyEvents class="mt-10" />
  </div>
</template>
