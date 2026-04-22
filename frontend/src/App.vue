<script setup>
import axios from 'axios'
import { onBeforeMount } from 'vue'

import { useUserStore } from './stores/user'

import Toast from '@/components/modals/Toast.vue'
import AppHeader from './components/AppHeader.vue'

const userStore = useUserStore()
const user = userStore.user

const initToken = () => {
  userStore.initStore()

  const token = user.access

  if (token) {
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
  } else {
    axios.defaults.headers.common['Authorization'] = ''
  }
}

onBeforeMount(() => {
  initToken()
})
</script>

<template>
  <AppHeader />

  <main class="px-8 py-6 bg-gray-100 h-screen overflow-auto pt-40">
    <RouterView />
  </main>

  <Toast />
</template>
