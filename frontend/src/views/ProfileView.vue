<script setup>
import { useUserStore } from '@/stores/user'
import { useRoute, useRouter } from 'vue-router'
import { watch } from 'vue'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const user = userStore.user

watch(
  () => route.query.id,
  () => {
    console.log('route query id changed')
  },
  { immediate: true },
)
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-4 gap-4">
    <div class="main-left col-span-1">
      <div class="p-4 bg-white border border-gray-200 text-center rounded-lg">
        <img :src="user.get_avatar" class="mb-6 rounded-full" />

        <p>
          <strong>{{ user.name }}</strong>
        </p>

        <div class="mt-6 flex space-x-8 justify-around" v-if="user.id">User stats</div>

        <div class="mt-6">User Actions</div>
      </div>
    </div>

    <div class="main-center col-span-2 space-y-4">
      <div class="bg-white border border-gray-200 rounded-lg" v-if="userStore.user.id === user.id">
        Feed content
      </div>
    </div>

    <div class="main-right col-span-1 space-y-4">MAIN RIGHT COLUMN</div>
  </div>
</template>

<style>
input[type='file'] {
  display: none;
}

.custom-file-upload {
  border: 1px solid #ccc;
  display: inline-block;
  padding: 6px 12px;
  cursor: pointer;
}
</style>
