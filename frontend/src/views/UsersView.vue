<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import SearchBar from '@/components/forms/SearchBar.vue'
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
        <SearchBar v-model="query" placeholder="Ricerca utenti..." @submit="getUsers" />
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
