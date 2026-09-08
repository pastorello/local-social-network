<script setup lang="ts">
// Session restore and the Authorization header both moved to main.ts and
// lib/auth.ts (TD-32) — this component only composes the shell now.
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppToast from '@/components/modals/AppToast.vue'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'

const route = useRoute()

// Undefined until the first navigation resolves: withholding the footer for
// that tick is better than flashing one under the map home.
const showFooter = computed(() => route.name !== undefined && !route.meta.fullBleed)
</script>

<template>
  <!-- WCAG 2.4.1. The header is seven tab stops — wordmark, four nav items,
  avatar, logout — and they come before the page on every route; on the map
  home the map's own container follows them. This is the way past all of it,
  and it is the first focusable thing in the document because that is the only
  position from which it helps. Visible only when focused: it is for the
  reader who is tabbing, and it would otherwise sit over the header. -->
  <a
    href="#contenuto"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-2000 focus:rounded-lg focus:bg-sea focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
  >
    Salta al contenuto
  </a>

  <AppHeader />

  <main
    id="contenuto"
    tabindex="-1"
    class="h-screen overflow-auto bg-page px-4 py-4 pt-[calc(var(--header-h,10rem)+1rem)] focus:outline-none lg:px-8 lg:py-6 lg:pt-[calc(var(--header-h,10rem)+1.5rem)]"
  >
    <RouterView />

    <!-- Inside <main>, which is the scroll container: a footer outside it
    would sit below a 100vh box and never be reachable. -->
    <AppFooter v-if="showFooter" class="-mx-4 -mb-4 lg:-mx-8 lg:-mb-6" />
  </main>

  <AppToast />
</template>
