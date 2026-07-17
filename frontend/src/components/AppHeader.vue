<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

import ActionButton from './buttons/ActionButton.vue'
import CommunityIcon from './icons/CommunityIcon.vue'
import PollsIcon from './icons/PollsIcon.vue'
import HomeIcon from './icons/HomeIcon.vue'
import MenuButton from './buttons/MenuButton.vue'
import SiteTitle from './typography/SiteTitle.vue'

const userStore = useUserStore()
const user = userStore.user

const router = useRouter()

const logout = () => {
  userStore.removeToken()
  router.push('/login')
}
</script>

<template>
  <nav class="py-6 px-8 shadow-md border-gray-200 fixed w-full bg-white z-10">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-4 items-center gap-8 px-6">
        <SiteTitle />

        <div class="flex space-x-6 col-span-2 justify-center">
          <MenuButton to="/">
            <template #icon>
              <HomeIcon class="w-6 h-6" />
            </template>
            Mappa
          </MenuButton>

          <template v-if="user.isAuthenticated">
            <MenuButton to="/polls">
              <template #icon>
                <PollsIcon class="w-6 h-6" />
              </template>
              Sondaggi
            </MenuButton>

            <MenuButton to="/users">
              <template #icon>
                <CommunityIcon class="w-6 h-6" />
              </template>
              Utenti
            </MenuButton>
          </template>
        </div>

        <div class="flex justify-end">
          <template v-if="user.isAuthenticated && user.id">
            <RouterLink :to="{ name: 'profile', params: { id: user.id } }">
              <img :src="user.avatar ?? undefined" class="w-12 rounded-full inline-block mr-4" />
            </RouterLink>
            <ActionButton class="inline-block" size="small" button-type="danger" @click="logout">
              Log out
            </ActionButton>
          </template>

          <template v-else>
            <RouterLink to="/login" class="mr-4 py-4 px-6 bg-gray-600 text-white rounded-lg"
              >Log in</RouterLink
            >
            <RouterLink to="/signup" class="py-4 px-6 bg-purple-600 text-white rounded-lg"
              >Sign up</RouterLink
            >
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
