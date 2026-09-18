<script setup lang="ts">
// Session restore and the Authorization header both moved to main.ts and
// lib/auth.ts (TD-32) — this component only composes the shell now.
import { nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppToast from '@/components/modals/AppToast.vue'
import RoutePanel from '@/components/layout/RoutePanel.vue'
import MapStage from '@/components/maps/MapStage.vue'
import HomeView from '@/views/HomeView.vue'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'

const route = useRoute()
const router = useRouter()

// The map under every page (spec/design.md D13–D15): the map is mounted once
// and every route but the home opens as a panel over it. The home's own chrome
// stays mounted too, hidden while a panel is open, so that closing a panel can
// give focus back to the link that opened it — an element the reader was on
// a moment ago, not a freshly rebuilt copy of it.
let opener: HTMLElement | null = null

router.beforeEach((to, from) => {
  if (from.meta.fullBleed && !to.meta.fullBleed) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }
})

router.afterEach(async (to, from) => {
  if (!to.meta.fullBleed || from.meta.fullBleed || !opener) return
  const element = opener
  opener = null
  await nextTick()
  if (element.isConnected) element.focus({ preventScroll: true })
})
</script>

<template>
  <!-- WCAG 2.4.1. The header is seven tab stops — wordmark, four nav items,
  avatar, logout — and they come before the page on every route. This is the
  way past all of it, and it is the first focusable thing in the document
  because that is the only position from which it helps. Visible only when
  focused: it is for the reader who is tabbing, and it would otherwise sit over
  the header. -->
  <a
    href="#contenuto"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-2000 focus:rounded-lg focus:bg-sea focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
  >
    Salta al contenuto
  </a>

  <AppHeader />

  <!-- Above the map and transparent to the pointer: only what is drawn in it
  — the home's chrome, a panel — takes clicks; the rest of the area is the
  map's. -->
  <main
    id="contenuto"
    tabindex="-1"
    class="pointer-events-none fixed inset-x-0 top-[var(--header-h,10rem)] bottom-0 z-10 focus:outline-none"
  >
    <RouterView v-slot="{ Component, route: current }">
      <!-- Compared, not read through: RouterView's slot types its route
      loosely enough that router/meta.d.ts does not reach it. -->
      <RoutePanel
        v-if="Component && !current.meta.fullBleed"
        :shape="current.meta.panel === 'narrow' ? 'narrow' : 'wide'"
      >
        <component :is="Component" />
        <!-- The credits surface (D11) rides on every reading panel until
        D21 moves it to Il progetto; a narrow panel is beside the map and
        has no room for it. -->
        <AppFooter v-if="current.meta.panel !== 'narrow'" class="-mx-4 mt-8 lg:-mx-8" />
      </RoutePanel>
    </RouterView>

    <!-- After the panel in the DOM: while a panel is open, the page the reader
    is on comes first in document order, and the hidden home — kept mounted
    only so focus can return to it — never answers a query for the page's own
    links. -->
    <HomeView v-if="route.name !== undefined" v-show="route.meta.fullBleed" />
  </main>

  <!-- After the page in the DOM: the tab order reaches the content before the
  map, and the map's container is one stop, not a trap. -->
  <MapStage />

  <AppToast />
</template>
