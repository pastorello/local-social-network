<script setup lang="ts">
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

import { locale } from '@/lib/i18n'
import card from '@/lib/i18n/messages/card'
import { shareLink } from '@/lib/share'
import { useToastStore } from '@/stores/toast'

// «Condividi» (review PR-16, P-11): a reader who wants to send a card to
// someone — the Gaetana in Turin gets it on WhatsApp — had only the address
// bar. On a phone it opens the system's sheet; elsewhere it copies the link
// and says so. `query` is the part of the address that is what is shared: a
// stop of a tour (`?tappa=N`), never how this reader happens to be looking.
const { query = {} } = defineProps<{ query?: LocationQueryRaw }>()

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()

// The page's own address: without the enlarged map (`?mappa=1`), a form left
// open (`?edit=1`) or a stop the reader is on, so the person it is sent to
// opens the card, not the sender's view of it — in the sender's language,
// which the address carries (`?lang=en`, review PR-19a).
const address = () =>
  new URL(
    router.resolve({
      path: route.path,
      query: locale.value === 'en' ? { ...query, lang: 'en' } : query,
    }).href,
    window.location.origin,
  ).href

const share = async () => {
  // Named as the window is (lib/pageTitle.ts), «Santissima Annunziata ·
  // Chiese · Vivere Gaeta»: the subject of a mail, the line over a link.
  const outcome = await shareLink({ title: document.title, url: address() })
  if (outcome === 'copied') toastStore.showToast(5000, card().copied)
  else if (outcome === 'failed') toastStore.showToast(5000, card().copyFailed)
}
</script>

<template>
  <button
    type="button"
    class="inline-flex h-11 flex-none cursor-pointer items-center gap-2 rounded-full border border-field bg-surface px-4 text-sm font-semibold text-sea focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
    @click="share"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="size-5"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
      />
    </svg>
    <span
      ><slot>{{ card().share }}</slot></span
    >
  </button>
</template>
