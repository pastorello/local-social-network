<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

import ActionButton from './buttons/ActionButton.vue'
import CommunityIcon from './icons/CommunityIcon.vue'
import PollsIcon from './icons/PollsIcon.vue'
import PostsIcon from './icons/PostsIcon.vue'
import HomeIcon from './icons/HomeIcon.vue'

const userStore = useUserStore()
const user = userStore.user

const router = useRouter()
const route = useRoute()

const logout = () => {
  userStore.removeToken()
  router.push('/login')
}
</script>
<template>
  <nav class="py-10 px-8 border-b border-gray-200">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <div class="menu-left">
          <a href="/" class="text-xl">Local Social Network</a>
        </div>

        <div class="menu-center flex space-x-12" v-if="user.isAuthenticated">
          <RouterLink to="/" :class="{ 'text-purple-700': route.path === '/' }">
            <HomeIcon class="w-6 h-6" />
          </RouterLink>

          <RouterLink to="/posts" :class="{ 'text-purple-700': route.path === '/posts' }">
            <PostsIcon class="w-6 h-6" />
          </RouterLink>

          <RouterLink to="/polls" :class="{ 'text-purple-700': route.path === '/polls' }">
            <PollsIcon class="w-6 h-6" />
          </RouterLink>

          <RouterLink to="/search" :class="{ 'text-purple-700': route.path === '/search' }">
            <CommunityIcon class="w-6 h-6" />
          </RouterLink>
        </div>

        <div class="menu-right">
          <template v-if="user.isAuthenticated && user.id">
            <RouterLink :to="{ name: 'profile', params: { id: user.id } }">
              <img :src="user.avatar" class="w-12 rounded-full inline-block mr-4" />
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
