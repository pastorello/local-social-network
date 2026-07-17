<script setup lang="ts">
import axios from 'axios'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import ActionButton from '@/components/buttons/ActionButton.vue'
import PanelBox from '@/components/boxes/PanelBox.vue'
import { extractApiErrors } from '@/lib/apiErrors'
import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'
import type Poll from '@/definitions/interfaces/Poll'
import type { PollOption } from '@/definitions/interfaces/Poll'

const props = defineProps<{
  poll: Poll
}>()

const emit = defineEmits<{
  (e: 'updated', poll: Poll): void
}>()

const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const selectedOption = ref('')
const submitting = ref(false)
const formErrors = ref<string[]>([])

const isAuthenticated = computed(() => userStore.user.isAuthenticated)
const isAdmin = computed(() => userStore.user.role === 'admin')
// Spec F3.2: one vote, final — the form only shows while the poll is open
// and the user has not voted yet.
const canVote = computed(
  () => isAuthenticated.value && !props.poll.is_closed && props.poll.my_vote === null,
)

const totalVotes = computed(() => props.poll.total_votes ?? 0)

const percentage = (option: PollOption) => {
  if (totalVotes.value === 0) return 0
  return Math.round(((option.votes_count ?? 0) / totalVotes.value) * 100)
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const goToLogin = () => {
  toastStore.showToast(5000, 'Accedi per votare nei sondaggi', 'bg-red-300')
  router.push('/login')
}

const vote = async () => {
  if (!selectedOption.value || submitting.value) return

  formErrors.value = []
  submitting.value = true
  try {
    const response = await axios.post(`/api/polls/${props.poll.id}/vote/`, {
      option: selectedOption.value,
    })
    toastStore.showToast(5000, 'Voto registrato. Grazie!', 'bg-emerald-500')
    emit('updated', response.data)
  } catch (error) {
    formErrors.value = extractApiErrors(error)
  } finally {
    submitting.value = false
  }
}

const closePoll = async () => {
  if (!window.confirm('Vuoi davvero chiudere questo sondaggio? I risultati diventeranno pubblici.'))
    return

  try {
    const response = await axios.patch(`/api/polls/${props.poll.id}/close/`)
    toastStore.showToast(5000, 'Sondaggio chiuso', 'bg-emerald-500')
    emit('updated', response.data)
  } catch (error) {
    formErrors.value = extractApiErrors(error)
  }
}
</script>

<template>
  <PanelBox>
    <div class="mb-1 flex items-start justify-between gap-4">
      <h2 class="text-xl font-bold text-gray-800">{{ poll.question }}</h2>
      <span
        class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
        :class="poll.is_closed ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'"
      >
        {{ poll.is_closed ? 'Chiuso' : 'Aperto' }}
      </span>
    </div>

    <p class="mb-4 text-sm text-gray-500">
      Creato da <strong>{{ poll.created_by.name }}</strong> il {{ formatDate(poll.created_at) }}
      <template v-if="!poll.is_closed && poll.closes_at">
        · si chiude il {{ formatDate(poll.closes_at) }}
      </template>
    </p>

    <ul class="space-y-3">
      <li v-for="option in poll.options" :key="option.id">
        <label
          class="flex items-center gap-3 rounded-lg bg-gray-100 p-3"
          :class="{ 'cursor-pointer': canVote }"
        >
          <input
            v-if="canVote"
            type="radio"
            :name="`poll-${poll.id}`"
            :value="option.id"
            v-model="selectedOption"
          />
          <span class="flex-1">
            {{ option.text }}
            <span v-if="option.id === poll.my_vote" class="ml-1 font-semibold text-purple-700">
              · il tuo voto
            </span>
          </span>
          <span
            v-if="poll.results_visible && option.votes_count !== null"
            class="whitespace-nowrap text-sm text-gray-600"
          >
            {{ option.votes_count }} {{ option.votes_count === 1 ? 'voto' : 'voti' }} ({{
              percentage(option)
            }}%)
          </span>
        </label>
        <div v-if="poll.results_visible" class="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            class="h-full rounded-full bg-purple-600"
            :style="{ width: `${percentage(option)}%` }"
          ></div>
        </div>
      </li>
    </ul>

    <p v-if="poll.results_visible && poll.total_votes !== null" class="mt-3 text-sm text-gray-500">
      {{ poll.total_votes }} {{ poll.total_votes === 1 ? 'voto totale' : 'voti totali' }}
    </p>

    <div v-if="formErrors.length > 0" class="mt-4 rounded-lg bg-red-300 p-4 text-white">
      <p v-for="error in formErrors" :key="error">{{ error }}</p>
    </div>

    <div v-if="!poll.is_closed" class="mt-4 flex items-center gap-3">
      <ActionButton v-if="canVote" size="small" :disabled="!selectedOption || submitting" @click="vote">
        Vota
      </ActionButton>
      <ActionButton v-else-if="!isAuthenticated" size="small" @click="goToLogin">
        Accedi per votare
      </ActionButton>
      <ActionButton v-if="isAdmin" size="small" button-type="danger" @click="closePoll">
        Chiudi sondaggio
      </ActionButton>
    </div>
  </PanelBox>
</template>
