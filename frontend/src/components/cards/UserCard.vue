<template>
  <div class="w-full max-w-sm mx-auto overflow-hidden bg-white rounded-lg shadow-md">
    <RouterLink :to="{ name: 'profile', params: { id: user.id } }">
      <img class="object-cover w-full h-48" :src="user.avatarURL" :alt="`Avatar di ${user.name}`" />
    </RouterLink>

    <div class="px-6 py-4">
      <h2 class="text-xl font-bold text-gray-800">{{ user.name }}</h2>
      <p class="text-gray-600">{{ user.email }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type User from '@/definitions/interfaces/User'

const props = defineProps<{
  user: User
}>()
</script>
