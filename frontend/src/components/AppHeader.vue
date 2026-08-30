<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

import ActionButton from './buttons/ActionButton.vue'
import CommunityIcon from './icons/CommunityIcon.vue'
import PollsIcon from './icons/PollsIcon.vue'
import HomeIcon from './icons/HomeIcon.vue'
import MenuButton from './buttons/MenuButton.vue'
import SchedeMenu from './buttons/SchedeMenu.vue'
import SiteTitle from './typography/SiteTitle.vue'
import UserAvatar from './cards/UserAvatar.vue'

const userStore = useUserStore()
const user = userStore.user

const router = useRouter()

// The header is fixed, so everything below it needs to know how tall it is —
// and it is not one number: it wraps to two rows on a phone, and it grows
// when a collaborator logs in and gains an avatar and an Esci button. The
// mobile home in particular is sized as "the viewport minus this", and a
// hard-coded guess put the map's own controls underneath the header. So it is
// measured once and published as a custom property, the same way colours are.
const nav = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null

const publishHeight = () => {
  if (!nav.value) return
  document.documentElement.style.setProperty('--header-h', `${nav.value.offsetHeight}px`)
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
</script>

<template>
  <nav
    ref="nav"
    class="fixed z-1100 w-full border-hairline bg-surface px-4 py-3 shadow-md lg:px-8 lg:py-6"
  >
    <div class="max-w-7xl mx-auto">
      <div
        class="flex flex-wrap items-center justify-between gap-3 lg:grid lg:grid-cols-4 lg:gap-8 lg:px-6"
      >
        <SiteTitle />

        <div
          class="order-last flex w-full justify-center gap-2 lg:order-none lg:col-span-2 lg:w-auto lg:gap-6"
        >
          <MenuButton to="/">
            <template #icon>
              <HomeIcon class="h-5 w-5 lg:h-6 lg:w-6" />
            </template>
            Mappa
          </MenuButton>

          <MenuButton to="/polls">
            <template #icon>
              <PollsIcon class="h-5 w-5 lg:h-6 lg:w-6" />
            </template>
            Sondaggi
          </MenuButton>

          <SchedeMenu />

          <template v-if="user.isAuthenticated">
            <MenuButton to="/users">
              <template #icon>
                <CommunityIcon class="h-5 w-5 lg:h-6 lg:w-6" />
              </template>
              Utenti
            </MenuButton>
          </template>
        </div>

        <div class="flex items-center justify-end">
          <template v-if="user.isAuthenticated && user.id">
            <RouterLink :to="{ name: 'profile', params: { id: user.id } }">
              <UserAvatar
                :src="user.avatarURL"
                :name="user.name"
                class="mr-2 inline-block h-9 w-9 rounded-full object-cover lg:mr-4 lg:h-12 lg:w-12"
              />
            </RouterLink>
            <ActionButton class="inline-block" size="small" button-type="danger" @click="logout">
              Esci
            </ActionButton>
          </template>

          <template v-else>
            <RouterLink
              to="/login"
              class="mr-2 rounded-lg bg-gray-600 px-4 py-3 text-sm text-white lg:mr-4 lg:px-6 lg:py-4 lg:text-base"
              >Accedi</RouterLink
            >
            <RouterLink
              to="/collabora"
              class="rounded-lg bg-sea px-4 py-3 text-sm text-white lg:px-6 lg:py-4 lg:text-base"
              >Collabora con noi</RouterLink
            >
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
