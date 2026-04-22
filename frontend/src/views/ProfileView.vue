<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'

import { useUserStore } from '@/stores/user'
import PanelBox from '@/components/boxes/PanelBox.vue'

const userStore = useUserStore()
const route = useRoute()
const user = userStore.user
const isMyProfile = route.params.id === user.id

watch(
  () => route.params.id,
  () => {
    console.log('route query id changed (load here the profile data with the new id)')
  },
  { immediate: true },
)
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-4 gap-4">
    <div class="main-left col-span-1">
      <PanelBox class="text-center">
        <img :src="user.avatar" class="mt-6 mb-6 rounded-full m-auto w-50 h-50" />

        <p>
          <strong>{{ user.name }}</strong>
        </p>

        <div class="mt-6 flex space-x-8 justify-around" v-if="user.id">User stats</div>

        <div class="mt-6">
          <RouterLink
            class="inline-block mr-2 py-4 px-3 bg-purple-600 text-xs text-white rounded-lg"
            to="/profile/edit"
            v-if="isMyProfile"
          >
            Edit profile
          </RouterLink>
        </div>
      </PanelBox>
    </div>

    <div class="main-center col-span-2 space-y-4">
      <PanelBox>
        <div>Public Feed content</div>
      </PanelBox>
    </div>

    <div class="main-right col-span-1 space-y-4">
      <PanelBox class="text-center">MAIN RIGHT COLUMN</PanelBox>
    </div>
  </div>
</template>
