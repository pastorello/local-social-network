<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import PollCard from '@/components/polls/PollCard.vue'
import PollForm from '@/components/polls/PollForm.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import { useUserStore } from '@/stores/user'
import type Poll from '@/definitions/interfaces/Poll'

interface PaginatedPolls {
  count: number
  next: string | null
  previous: string | null
  results: Poll[]
}

const userStore = useUserStore()

const polls = ref<Poll[]>([])
const nextPage = ref<string | null>(null)
const loading = ref(true)
const creating = ref(false)

const isAdmin = computed(() => userStore.user.role === 'admin')

const getPolls = async () => {
  loading.value = true
  try {
    const response = await axios.get<PaginatedPolls>('/api/polls/')
    polls.value = response.data.results
    nextPage.value = response.data.next
  } catch (error) {
    console.log('error:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!nextPage.value) return
  try {
    const response = await axios.get<PaginatedPolls>(nextPage.value)
    polls.value = [...polls.value, ...response.data.results]
    nextPage.value = response.data.next
  } catch (error) {
    console.log('error:', error)
  }
}

const onPollUpdated = (updated: Poll) => {
  polls.value = polls.value.map((poll) => (poll.id === updated.id ? updated : poll))
}

const onPollCreated = () => {
  creating.value = false
  // re-fetch so the new poll lands in spec F3.4 order
  getPolls()
}

onMounted(() => {
  getPolls()
})
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <!-- self-start: keep the column content-sized; PanelBox is h-full and
         would otherwise stretch every panel to the grid row height -->
    <div class="main-center col-span-2 col-start-2 space-y-4 self-start">
      <PanelBox>
        <div class="flex items-center justify-between gap-4">
          <MainTitle>Sondaggi</MainTitle>
          <ActionButton v-if="isAdmin && !creating" size="small" @click="creating = true">
            Nuovo sondaggio
          </ActionButton>
        </div>
        <p class="text-sm text-gray-500">
          Le opinioni della città sui temi proposti dal Comune. I risultati sono visibili dopo il
          voto o alla chiusura del sondaggio.
        </p>
      </PanelBox>

      <PanelBox v-if="creating">
        <h2 class="mb-4 text-lg font-semibold">Nuovo sondaggio</h2>
        <PollForm @saved="onPollCreated" @cancel="creating = false" />
      </PanelBox>

      <template v-if="polls.length > 0">
        <PollCard v-for="poll in polls" :key="poll.id" :poll="poll" @updated="onPollUpdated" />
      </template>

      <PanelBox v-else-if="!loading" class="text-center text-gray-500">
        Non ci sono ancora sondaggi.
      </PanelBox>

      <div v-if="nextPage" class="flex justify-center">
        <ActionButton size="small" @click="loadMore">Carica altri</ActionButton>
      </div>
    </div>
  </ViewContainer>
</template>
