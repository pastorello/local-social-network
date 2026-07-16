<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import UserCard from '@/components/cards/UserCard.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import type User from '@/definitions/interfaces/User'

const query = ref('')
const users = ref<User[]>([])

const getUsers = async () => {
  await axios
    .post('/api/users/list/', {
      query: query.value,
    })
    .then((response) => {
      users.value = response.data
    })
    .catch((error) => {
      console.log('error:', error)
    })
}

onMounted(() => {
  getUsers()
})
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="main-left col-span-3 space-y-2">
      <PanelBox class="flex flex-col">
        <MainTitle>Utenti del network</MainTitle>
        <form v-on:submit.prevent="getUsers" class="pb-6 flex space-x-4">
          <input
            v-model="query"
            type="search"
            class="p-4 w-full bg-gray-100 rounded-lg"
            placeholder="Ricerca utenti..."
          />

          <ActionButton class="inline-block">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              ></path>
            </svg>
          </ActionButton>
        </form>
        <div class="grid grid-cols-3 gap-6" v-if="users.length">
          <UserCard v-for="user in users" :key="user.id" :user="user" />
        </div>

        <div class="flex-1 flex items-center justify-center" v-else>
          <p class="text-gray-500">No users found</p>
        </div>
      </PanelBox>
    </div>

    <div class="main-right col-span-1 space-y-4">
      <PanelBox class="text-center">
        <h2 class="mb-4 text-lg">Right column</h2>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
