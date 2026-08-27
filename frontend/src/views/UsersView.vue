<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import UserCard from '@/components/cards/UserCard.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import type User from '@/definitions/interfaces/User'

interface PaginatedUsers {
  count: number
  next: string | null
  previous: string | null
  results: User[]
}

const query = ref('')
const users = ref<User[]>([])
const total = ref(0)
const nextPage = ref<string | null>(null)

const getUsers = async () => {
  await axios
    .get('/api/users/list/', {
      params: { q: query.value },
    })
    .then((response: { data: PaginatedUsers }) => {
      users.value = response.data.results
      total.value = response.data.count
      nextPage.value = response.data.next
    })
    .catch((error) => {
      console.log('error:', error)
    })
}

const loadMore = async () => {
  if (!nextPage.value) return
  try {
    const response = await axios.get<PaginatedUsers>(nextPage.value)
    users.value = [...users.value, ...response.data.results]
    nextPage.value = response.data.next
  } catch (error) {
    console.log('error:', error)
  }
}

onMounted(() => {
  getUsers()
})
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="col-span-4 space-y-2">
      <PanelBox class="flex flex-col">
        <MainTitle>Utenti del network</MainTitle>
        <form v-on:submit.prevent="getUsers" class="pb-6 flex space-x-4">
          <label class="sr-only" for="users-search-query">Ricerca utenti</label>
          <input
            id="users-search-query"
            v-model="query"
            type="search"
            class="p-4 w-full bg-gray-100 rounded-lg"
            placeholder="Ricerca utenti..."
          />

          <ActionButton class="inline-block" aria-label="Cerca">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              ></path>
            </svg>
          </ActionButton>
        </form>
        <div v-if="users.length" class="space-y-6">
          <p class="text-sm text-gray-500">{{ total }} {{ total === 1 ? 'utente' : 'utenti' }}</p>

          <div class="grid grid-cols-4 gap-6">
            <UserCard v-for="user in users" :key="user.id" :user="user" />
          </div>

          <div v-if="nextPage" class="flex justify-center">
            <ActionButton size="small" @click="loadMore">Carica altri</ActionButton>
          </div>
        </div>

        <div class="flex-1 flex items-center justify-center" v-else>
          <p class="text-gray-500">Nessun utente trovato.</p>
        </div>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
