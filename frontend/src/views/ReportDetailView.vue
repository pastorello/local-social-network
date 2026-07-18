<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import StatusBadge from '@/components/reports/StatusBadge.vue'
import ReportForm from '@/components/reports/ReportForm.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type Category from '@/definitions/interfaces/Category'
import type Report from '@/definitions/interfaces/Report'
import type { ReportStatus } from '@/definitions/interfaces/Report'
import { ADMIN_TRANSITIONS, STATUS_META } from '@/lib/reportStatus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const report = ref<Report | null>(null)
const categories = ref<Category[]>([])
const editing = ref(false)

const isAuthor = computed(
  () => report.value !== null && userStore.user.id === report.value.author.id,
)
const canEditOwn = computed(() => isAuthor.value && report.value?.status === 'open')
const isAdmin = computed(() => userStore.user.role === 'admin')
const adminTransitions = computed(() =>
  report.value ? ADMIN_TRANSITIONS[report.value.status] : [],
)

const createdAtFormatted = computed(() => {
  if (!report.value) return ''
  return new Date(report.value.created_at).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const getReport = async () => {
  await axios
    .get(`/api/reports/${route.params.id}/`)
    .then((response) => {
      report.value = response.data
    })
    .catch((error) => {
      console.log('error', error)
      toastStore.showToast(5000, 'Segnalazione non trovata', 'bg-red-300')
      router.push('/')
    })
}

const getCategories = async () => {
  await axios
    .get('/api/categories/')
    .then((response) => {
      categories.value = response.data
    })
    .catch((error) => {
      console.log('error', error)
    })
}

const toggleUpvote = async () => {
  if (!userStore.user.isAuthenticated) {
    toastStore.showToast(5000, 'Accedi per sostenere una segnalazione', 'bg-red-300')
    router.push('/login')
    return
  }
  if (!report.value) return

  await axios
    .post(`/api/reports/${report.value.id}/upvote/`)
    .then((response) => {
      if (report.value) {
        report.value.upvoted_by_me = response.data.upvoted
        report.value.upvotes_count = response.data.upvotes_count
      }
    })
    .catch((error) => {
      console.log('error', error)
    })
}

const changeStatus = async (status: ReportStatus) => {
  if (!report.value) return

  await axios
    .patch(`/api/reports/${report.value.id}/status/`, { status })
    .then((response) => {
      report.value = response.data
      toastStore.showToast(5000, 'Stato aggiornato', 'bg-emerald-500')
    })
    .catch((error) => {
      console.log('error', error)
      toastStore.showToast(5000, 'Impossibile aggiornare lo stato', 'bg-red-300')
    })
}

const onEdited = (updated: Report) => {
  report.value = updated
  editing.value = false
}

const deleteReport = async () => {
  if (!report.value) return
  if (!window.confirm('Vuoi davvero eliminare questa segnalazione?')) return

  await axios
    .delete(`/api/reports/${report.value.id}/`)
    .then(() => {
      toastStore.showToast(5000, 'Segnalazione eliminata', 'bg-emerald-500')
      router.push('/')
    })
    .catch((error) => {
      console.log('error', error)
    })
}

onMounted(() => {
  getReport()
  getCategories()
})
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <!-- self-start: PanelBox is h-full; a stacked column must not stretch to row height -->
    <div class="main-center col-span-2 col-start-2 space-y-4 self-start">
      <PanelBox v-if="report">
        <div class="mb-2 flex items-center justify-between gap-4">
          <MainTitle>{{ report.title }}</MainTitle>
          <StatusBadge :status="report.status" />
        </div>

        <p class="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <span
            class="inline-block w-3 h-3 rounded-full"
            :style="{ backgroundColor: report.category.color }"
          ></span>
          {{ report.category.name }}
          · segnalata da <strong>{{ report.author.name }}</strong> il {{ createdAtFormatted }}
        </p>

        <template v-if="!editing">
          <img
            v-if="report.photoURL"
            :src="report.photoURL"
            class="w-full mb-4 rounded-xl"
            :alt="`Foto della segnalazione: ${report.title}`"
          />

          <p class="mb-6 whitespace-pre-line">{{ report.description }}</p>

          <div class="flex items-center justify-between">
            <button
              type="button"
              class="flex items-center gap-2 py-2 px-4 rounded-lg cursor-pointer"
              :class="report.upvoted_by_me ? 'bg-purple-600 text-white' : 'bg-gray-100'"
              @click="toggleUpvote"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                :fill="report.upvoted_by_me ? 'currentColor' : 'none'"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                />
              </svg>
              {{ report.upvotes_count }} {{ report.upvotes_count === 1 ? 'sostegno' : 'sostegni' }}
            </button>

            <div class="flex gap-2" v-if="canEditOwn">
              <ActionButton size="small" @click="editing = true">Modifica</ActionButton>
              <ActionButton size="small" button-type="danger" @click="deleteReport">
                Elimina
              </ActionButton>
            </div>
          </div>
        </template>

        <ReportForm
          v-else
          :categories="categories"
          :coords="{ lat: report.lat, lng: report.lng }"
          :report="report"
          @saved="onEdited"
          @cancel="editing = false"
        />
      </PanelBox>

      <PanelBox v-if="report && isAdmin && adminTransitions.length > 0">
        <h2 class="mb-4 text-lg font-semibold">Moderazione</h2>
        <div class="flex flex-wrap gap-2">
          <ActionButton
            v-for="status in adminTransitions"
            :key="status"
            size="small"
            :button-type="status === 'rejected' ? 'danger' : 'success'"
            @click="changeStatus(status)"
          >
            {{ STATUS_META[status].label }}
          </ActionButton>
        </div>
      </PanelBox>

      <PanelBox>
        <RouterLink to="/" class="underline">← Torna alla mappa</RouterLink>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
