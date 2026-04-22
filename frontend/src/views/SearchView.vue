<script setup>
import axios from 'axios'
import { ref } from 'vue'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'

const query = ref('')
let users = ref([])

const submitForm = () => {
  axios
    .post('/api/search/', {
      query: this.query,
    })
    .then((response) => {
      console.log('response:', response.data)

      users = response.data.users
    })
    .catch((error) => {
      console.log('error:', error)
    })
}
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-4 gap-4">
    <div class="main-left col-span-3 space-y-4">
      <PanelBox>
        <form v-on:submit.prevent="submitForm" class="p-4 flex space-x-4">
          <input
            v-model="query"
            type="search"
            class="p-4 w-full bg-gray-100 rounded-lg"
            placeholder="What are you looking for?"
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
      </PanelBox>

      <PanelBox class="grid grid-cols-4 gap-4" v-if="users.length">
        <div
          class="p-4 text-center bg-gray-100 rounded-lg"
          v-for="user in users"
          v-bind:key="user.id"
        >
          <img :src="user.get_avatar" class="mb-6 rounded-full" />

          <p>
            <strong>
              <RouterLink :to="{ name: 'profile', params: { id: user.id } }">{{
                user.name
              }}</RouterLink>
            </strong>
          </p>

          <div class="mt-6 flex space-x-8 justify-around">
            <p class="text-xs text-gray-500">user stat 1</p>
            <p class="text-xs text-gray-500">user stat 2</p>
          </div>
        </div>
      </PanelBox>
    </div>

    <div class="main-right col-span-1 space-y-4">
      <PanelBox class="text-center">
        <h2 class="mb-4 text-lg">Right column</h2>
      </PanelBox>
    </div>
  </div>
</template>
