<script setup lang="ts">
import { watch, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

import { useUserStore } from '@/stores/user'
import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import StatusBadge from '@/components/reports/StatusBadge.vue'
import type Report from '@/definitions/interfaces/Report'
import type User from '@/definitions/interfaces/User'

const userStore = useUserStore()
const route = useRoute()
const isMyProfile = computed(() => route.params.id === userStore.user.id)
const profileUser = ref<User | null>(null)
const reports = ref<Report[]>([])

const getProfile = () => {
  axios
    .get(`/api/users/${route.params.id}/`)
    .then((response: { data: User }) => {
      profileUser.value = response.data
    })
    .catch((error) => {
      console.log('error', error)
    })

  axios
    .get('/api/reports/', { params: { author: route.params.id } })
    .then((response: { data: { results: Report[] } }) => {
      reports.value = response.data.results
    })
    .catch((error) => {
      console.log('error', error)
    })
}

watch(
  () => route.params.id,
  () => {
    getProfile()
  },
  { immediate: true },
)
</script>

<template>
  <ViewContainer class="grid-cols-4">
    <div class="main-left col-span-1">
      <PanelBox class="text-center">
        <img
          v-if="profileUser"
          :src="profileUser.avatarURL"
          class="mt-6 mb-6 rounded-full m-auto w-50 h-50"
        />

        <p>
          <strong>{{ profileUser?.name }}</strong>
        </p>

        <p class="mt-2 text-sm text-gray-500" v-if="profileUser">
          {{ reports.length }} {{ reports.length === 1 ? 'segnalazione' : 'segnalazioni' }}
        </p>

        <div class="mt-6">
          <RouterLink
            class="inline-block mr-2 py-4 px-3 bg-purple-600 text-xs text-white rounded-lg"
            to="/profile/edit"
            v-if="isMyProfile"
          >
            Modifica profilo
          </RouterLink>
        </div>
      </PanelBox>
    </div>

    <div class="main-center col-span-3 space-y-4">
      <PanelBox>
        <h2 class="mb-4 text-lg font-semibold">Segnalazioni</h2>

        <div class="space-y-4" v-if="reports.length">
          <RouterLink
            v-for="report in reports"
            :key="report.id"
            :to="`/reports/${report.id}`"
            class="block p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-400"
          >
            <div class="flex items-center justify-between gap-4">
              <strong>{{ report.title }}</strong>
              <StatusBadge :status="report.status" />
            </div>
            <p class="mt-1 text-sm text-gray-500">
              {{ report.category.name }} ·
              {{ report.upvotes_count }}
              {{ report.upvotes_count === 1 ? 'sostegno' : 'sostegni' }}
            </p>
          </RouterLink>
        </div>

        <p class="text-gray-500" v-else>Nessuna segnalazione.</p>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
