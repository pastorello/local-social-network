<script setup lang="ts">
import type User from '@/definitions/interfaces/User'
import UserAvatar from './UserAvatar.vue'

defineProps<{
  user: User
}>()
</script>

<template>
  <div class="w-full max-w-sm mx-auto overflow-hidden bg-white rounded-lg shadow-md">
    <RouterLink :to="{ name: 'profile', params: { id: user.id } }">
      <UserAvatar class="object-cover w-full h-48 text-4xl" :src="user.avatarURL" :name="user.name" />
    </RouterLink>

    <div class="px-6 py-4">
      <h2 class="text-xl font-bold text-gray-800">{{ user.name }}</h2>
    </div>
  </div>
</template>
