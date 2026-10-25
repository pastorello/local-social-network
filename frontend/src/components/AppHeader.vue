<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useUserStore } from '@/stores/user'
import { useMapStore } from '@/stores/map'
import { useIsDesktop } from '@/composables/useBreakpoint'
import LanguageToggle from './buttons/LanguageToggle.vue'
import NavDisclosure from './buttons/NavDisclosure.vue'
import SchedeMenu from './buttons/SchedeMenu.vue'
import SiteTitle from './typography/SiteTitle.vue'
import UserAvatar from './cards/UserAvatar.vue'
import { initials } from '@/lib/initials'
import shell from '@/lib/i18n/messages/shell'
import { sectionOf, type Section } from '@/lib/navigation'

// The menu (spec/design.md D14): one pill at the top centre of every page,
// floating over the map rather than a bar above it — the map is the ground of
// every page (D13). The wordmark, Mappa, Esplora, Itinerari, Cosa fare, Il
// progetto, then Accedi or the collaborator's avatar, behind which are their
// own cards first (review PR-13), then the polls — for someone with an account
// since 2026-10-24 (review PR-17, reports-and-polls.md P1), so a reader is
// never offered them. There is no search in this phase. Itinerari (spec
// itinerari.md) is its own item rather than an Esplora entry: a tour is how a
// guest starts, not a card type. *Esplora* was *Schede* until 2026-10-23
// (review PR-23, N-05). The reader's items speak the reader's language, and
// «IT · EN» sits before Accedi (review PR-19a); the account's menu is a
// collaborator's surface and stays Italian, marked so for a screen reader.
const userStore = useUserStore()
const user = userStore.user
const router = useRouter()
const route = useRoute()
const { isDesktop } = useIsDesktop()

// The item above the page the reader is on is current (review PR-23, N-02):
// a tour's page lights Itinerari, any card Esplora — one rule
// (lib/navigation.ts::sectionOf) for the pill and for the phone's Menu, read
// by a screen reader as the current page and seen as an underline as well as
// a tint, so colour is never the only sign of it (WCAG 1.4.1).
const section = computed(() => sectionOf(route))
const isCurrent = (name: Section) => section.value === name
const currentAttr = (name: Section) => (isCurrent(name) ? 'page' : undefined)

// WCAG 2.5.3, label in name: without a photograph the button shows the
// initials, and someone using speech input says what they see — so the
// initials are part of its name. Not in parentheses: axe drops a
// parenthetical before comparing, and so may a speech engine. A photograph
// shows no text, and the name stays the plain sentence.
const accountLabel = () => {
  const base = `Il tuo account: ${user.name}`
  const shown = user.avatarURL ? '' : initials(user.name)
  return shown ? `${base} — ${shown}` : base
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

// Reports are for people with an account (decided 2026-10-22, spec
// reports-and-polls.md R1), so the way to file one is in the account's own
// menu as well as on the home: it opens the map and starts the placing there.
// Closed by hand, because from the home itself there is no route change to
// close it.
const mapStore = useMapStore()
const fileReport = async (close: () => void) => {
  close()
  await router.push('/')
  mapStore.startPlacing()
}

const item =
  'flex h-9 items-center rounded-full px-2 lg:px-3 text-sm font-semibold whitespace-nowrap text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea'
const active = 'bg-sea/10 text-sea underline decoration-2 underline-offset-4'
const menuLink =
  'block px-4 py-2 text-sm text-ink hover:bg-page focus-visible:bg-page focus-visible:outline-none'
const menuActive = 'font-semibold text-sea underline decoration-2 underline-offset-4'
</script>

<template>
  <nav
    ref="nav"
    :aria-label="shell().nav.label"
    class="fixed top-3 left-1/2 z-1100 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-0.5 rounded-full border border-hairline bg-surface py-1.5 pr-1.5 pl-3 shadow-md lg:gap-2 lg:pl-5"
  >
    <!-- Never wrapped, never shrunk: in a pill 390px wide the wordmark was the
    item the browser squeezed, and it broke into four lines (2026-09-18). -->
    <SiteTitle class="mr-1 shrink-0 whitespace-nowrap lg:mr-2" />
    <span class="hidden h-6 w-px bg-hairline lg:block" aria-hidden="true"></span>

    <template v-if="isDesktop">
      <RouterLink
        to="/"
        :class="[item, isCurrent('mappa') && active]"
        :aria-current="currentAttr('mappa')"
        >{{ shell().nav.map }}</RouterLink
      >
      <SchedeMenu />
      <RouterLink
        to="/itinerari"
        :class="[item, isCurrent('itinerari') && active]"
        :aria-current="currentAttr('itinerari')"
        >{{ shell().nav.tours }}</RouterLink
      >
      <RouterLink
        to="/cosa-fare"
        :class="[item, isCurrent('cosa-fare') && active]"
        :aria-current="currentAttr('cosa-fare')"
        >{{ shell().nav.whatToDo }}</RouterLink
      >
      <RouterLink
        to="/il-progetto"
        :class="[item, isCurrent('progetto') && active]"
        :aria-current="currentAttr('progetto')"
        >{{ shell().nav.project }}</RouterLink
      >
      <span class="h-6 w-px bg-hairline" aria-hidden="true"></span>
      <LanguageToggle />

      <NavDisclosure
        v-if="user.isAuthenticated && user.id"
        lang="it"
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
        <template #default="{ close }">
          <!-- First, before the profile: what a collaborator signs in for
          (review PR-13, C-02), then the polls, which are theirs alone (review
          PR-17). -->
          <RouterLink to="/le-mie-schede" :class="menuLink">Le mie schede</RouterLink>
          <RouterLink to="/polls" :class="menuLink">Sondaggi</RouterLink>
          <RouterLink :to="{ name: 'profile', params: { id: user.id } }" :class="menuLink">
            Il tuo profilo
          </RouterLink>
          <RouterLink to="/users" :class="menuLink">Utenti</RouterLink>
          <button
            type="button"
            :class="[menuLink, 'w-full cursor-pointer text-left']"
            @click="fileReport(close)"
          >
            Segnala un problema
          </button>
          <button
            type="button"
            :class="[menuLink, 'w-full cursor-pointer text-left']"
            @click="logout"
          >
            Esci
          </button>
        </template>
      </NavDisclosure>
      <RouterLink v-else to="/login" :class="item" :active-class="active">{{
        shell().nav.signIn
      }}</RouterLink>
    </template>

    <!-- On a phone the pill holds what a reader reaches for first — the
    wordmark home, Esplora and the tours, since a guest arriving from a B&B's
    QR code is on a phone (decided 2026-09-19) — and the rest sits behind one
    button. -->
    <template v-else>
      <SchedeMenu />
      <!-- Below 360px — the narrowest common phone, and above WCAG's 320px
      reflow width — the pill has no room for it, and it moves into Menu. -->
      <RouterLink
        to="/itinerari"
        :class="[item, 'max-[359px]:hidden', isCurrent('itinerari') && active]"
        :aria-current="currentAttr('itinerari')"
        data-pill-itinerari
        >{{ shell().nav.tours }}</RouterLink
      >
      <NavDisclosure
        :label="shell().nav.menu"
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
        <template #default="{ close }">
          <RouterLink
            to="/"
            :class="[menuLink, isCurrent('mappa') && menuActive]"
            :aria-current="currentAttr('mappa')"
            >{{ shell().nav.map }}</RouterLink
          >
          <RouterLink
            to="/itinerari"
            :class="[menuLink, 'min-[360px]:hidden', isCurrent('itinerari') && menuActive]"
            :aria-current="currentAttr('itinerari')"
            >{{ shell().nav.tours }}</RouterLink
          >
          <RouterLink
            to="/cosa-fare"
            :class="[menuLink, isCurrent('cosa-fare') && menuActive]"
            :aria-current="currentAttr('cosa-fare')"
            >{{ shell().nav.whatToDo }}</RouterLink
          >
          <RouterLink
            to="/il-progetto"
            :class="[menuLink, isCurrent('progetto') && menuActive]"
            :aria-current="currentAttr('progetto')"
            >{{ shell().nav.project }}</RouterLink
          >
          <!-- The language, on a phone: in Menu, where there is room for it
          (review PR-19a). -->
          <LanguageToggle variant="menu" class="border-y border-hairline" />
          <div v-if="user.isAuthenticated && user.id" lang="it">
            <RouterLink to="/le-mie-schede" :class="menuLink">Le mie schede</RouterLink>
            <RouterLink to="/polls" :class="menuLink">Sondaggi</RouterLink>
            <RouterLink :to="{ name: 'profile', params: { id: user.id } }" :class="menuLink">
              Il tuo profilo
            </RouterLink>
            <RouterLink to="/users" :class="menuLink">Utenti</RouterLink>
            <button
              type="button"
              :class="[menuLink, 'w-full cursor-pointer text-left']"
              @click="fileReport(close)"
            >
              Segnala un problema
            </button>
            <button
              type="button"
              :class="[menuLink, 'w-full cursor-pointer text-left']"
              @click="logout"
            >
              Esci
            </button>
          </div>
          <RouterLink v-else to="/login" :class="menuLink">{{ shell().nav.signIn }}</RouterLink>
        </template>
      </NavDisclosure>
    </template>
  </nav>
</template>
