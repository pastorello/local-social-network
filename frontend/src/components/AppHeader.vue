<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useUserStore } from '@/stores/user'
import { useIsDesktop } from '@/composables/useBreakpoint'
import NavDisclosure from './buttons/NavDisclosure.vue'
import SchedeMenu from './buttons/SchedeMenu.vue'
import SiteTitle from './typography/SiteTitle.vue'
import UserAvatar from './cards/UserAvatar.vue'
import { initials } from '@/lib/initials'

// The menu (spec/design.md D14): one pill at the top centre of every page,
// floating over the map rather than a bar above it — the map is the ground of
// every page (D13). The wordmark, Mappa, Schede, Itinerari, Il progetto, then
// Accedi or the collaborator's avatar. The polls are reached from Il progetto;
// there is no search in this phase. Itinerari (spec itinerari.md) is its own
// item rather than a Schede entry: a tour is how a guest starts, not a card type.
const userStore = useUserStore()
const user = userStore.user
const router = useRouter()
const { isDesktop } = useIsDesktop()

// WCAG 2.5.3, label in name: without a photograph the button shows the
// initials, and someone using speech input says what they see — so the
// initials are part of its name. A photograph shows no text, and the name
// stays the plain sentence.
const accountLabel = () => {
  const base = `Il tuo account: ${user.name}`
  const shown = user.avatarURL ? '' : initials(user.name)
  return shown ? `${base} (${shown})` : base
}

// Everything below the menu needs to know where it ends — pages open as panels
// under it, the home's chrome starts under it — and that is not one number:
// the pill is shorter on a phone, and taller with an avatar. So it is measured
// and published as a custom property, the same way colours are. The map does
// not read it: it runs under the pill, edge to edge.
const nav = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null

const publishHeight = () => {
  if (!nav.value) return
  const bottom = nav.value.offsetTop + nav.value.offsetHeight
  document.documentElement.style.setProperty('--header-h', `${bottom + 8}px`)
}

onMounted(() => {
  publishHeight()
  if (typeof ResizeObserver === 'function' && nav.value) {
    observer = new ResizeObserver(publishHeight)
    observer.observe(nav.value)
  }
})

onBeforeUnmount(() => observer?.disconnect())

const logout = async () => {
  await userStore.logout()
  router.push('/login')
}

const item =
  'flex h-9 items-center rounded-full px-2 lg:px-3 text-sm font-semibold whitespace-nowrap text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
const active = 'bg-sea/10 text-sea'
const menuLink =
  'block px-4 py-2 text-sm text-ink hover:bg-page focus-visible:bg-page focus-visible:outline-none'
</script>

<template>
  <nav
    ref="nav"
    aria-label="Principale"
    class="fixed top-3 left-1/2 z-1100 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-0.5 rounded-full border border-hairline bg-surface py-1.5 pr-1.5 pl-3 shadow-md lg:gap-2 lg:pl-5"
  >
    <!-- Never wrapped, never shrunk: in a pill 390px wide the wordmark was the
    item the browser squeezed, and it broke into four lines (2026-09-18). -->
    <SiteTitle class="mr-1 shrink-0 whitespace-nowrap lg:mr-2" />
    <span class="hidden h-6 w-px bg-hairline lg:block" aria-hidden="true"></span>

    <template v-if="isDesktop">
      <RouterLink to="/" :class="item" :exact-active-class="active">Mappa</RouterLink>
      <SchedeMenu />
      <RouterLink to="/itinerari" :class="item" :active-class="active">Itinerari</RouterLink>
      <RouterLink to="/il-progetto" :class="item" :active-class="active">Il progetto</RouterLink>
      <span class="h-6 w-px bg-hairline" aria-hidden="true"></span>

      <NavDisclosure
        v-if="user.isAuthenticated && user.id"
        :label="accountLabel()"
        trigger-class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      >
        <template #trigger>
          <!-- Decorative here: the button's own name says whose account it
          is, initials included when they are what it shows. -->
          <UserAvatar
            :src="user.avatarURL"
            :name="user.name"
            class="h-9 w-9 rounded-full object-cover"
            aria-hidden="true"
          />
        </template>
        <RouterLink :to="{ name: 'profile', params: { id: user.id } }" :class="menuLink">
          Il tuo profilo
        </RouterLink>
        <RouterLink to="/users" :class="menuLink">Utenti</RouterLink>
        <button
          type="button"
          :class="[menuLink, 'w-full cursor-pointer text-left']"
          @click="logout"
        >
          Esci
        </button>
      </NavDisclosure>
      <RouterLink v-else to="/login" :class="item" :active-class="active">Accedi</RouterLink>
    </template>

    <!-- On a phone the pill holds what a reader reaches for first — the
    wordmark home, the cards and the tours, since a guest arriving from a B&B's
    QR code is on a phone (decided 2026-09-19) — and the rest sits behind one
    button. -->
    <template v-else>
      <SchedeMenu />
      <!-- Below 360px — the narrowest common phone, and above WCAG's 320px
      reflow width — the pill has no room for it, and it moves into Menu. -->
      <RouterLink
        to="/itinerari"
        :class="[item, 'max-[359px]:hidden']"
        :active-class="active"
        data-pill-itinerari
        >Itinerari</RouterLink
      >
      <NavDisclosure
        label="Menu"
        trigger-class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      >
        <template #trigger>
          <svg
            viewBox="0 0 20 20"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
          </svg>
        </template>
        <RouterLink to="/" :class="menuLink">Mappa</RouterLink>
        <RouterLink to="/itinerari" :class="[menuLink, 'min-[360px]:hidden']">Itinerari</RouterLink>
        <RouterLink to="/il-progetto" :class="menuLink">Il progetto</RouterLink>
        <template v-if="user.isAuthenticated && user.id">
          <RouterLink :to="{ name: 'profile', params: { id: user.id } }" :class="menuLink">
            Il tuo profilo
          </RouterLink>
          <RouterLink to="/users" :class="menuLink">Utenti</RouterLink>
          <button
            type="button"
            :class="[menuLink, 'w-full cursor-pointer text-left']"
            @click="logout"
          >
            Esci
          </button>
        </template>
        <RouterLink v-else to="/login" :class="menuLink">Accedi</RouterLink>
      </NavDisclosure>
    </template>
  </nav>
</template>
