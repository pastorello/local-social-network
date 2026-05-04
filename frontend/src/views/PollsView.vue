<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import QuestionCard from '@/components/cards/QuestionCard.vue'
import SearchBar from '@/components/forms/SearchBar.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import type Poll from '@/definitions/interfaces/Poll'

const query = ref('')
let polls = ref<Poll[]>([])

const getPolls = async () => {
  await axios
    .post('/api/polls/list/', {
      query: query.value,
    })
    .then((response) => {
      polls.value = response.data
    })
    .catch((error) => {
      console.log('error:', error)
    })
}

onMounted(() => {
  getPolls()
})
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="main-left col-span-3 space-y-2">
      <PanelBox class="flex flex-col">
        <MainTitle>Sondaggi</MainTitle>
        <SearchBar v-model="query" @submit="getPolls" placeholder="Ricerca domande..." />

        <div class="flex flex-col space-y-4" v-if="polls.length">
          <QuestionCard v-for="poll in polls" :key="poll.id" :question="poll" />
        </div>

        <div class="flex-1 flex items-center justify-center" v-else>
          <p class="text-gray-500">No polls found</p>
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
