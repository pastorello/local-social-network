<script setup lang="ts">
import { watch, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

import { useUserStore } from '@/stores/user'
import AccountColumn from '@/components/boxes/AccountColumn.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import StatusBadge from '@/components/reports/StatusBadge.vue'
import type Report from '@/definitions/interfaces/Report'
import type User from '@/definitions/interfaces/User'
import UserAvatar from '@/components/cards/UserAvatar.vue'

const userStore = useUserStore()
const route = useRoute()
const isMyProfile = computed(() => route.params.id === userStore.user.id)
const profileUser = ref<User | null>(null)
const reports = ref<Report[]>([])
const reportCount = ref(0)

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
    .then((response: { data: { count: number; results: Report[] } }) => {
      reports.value = response.data.results
      reportCount.value = response.data.count
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
  <AccountColumn>
    <!-- One column since review PR-11. In a quarter of the wide panel (~170px)
    the fixed 200px avatar and a display-size name spilled out under the
    reports beside them: now the avatar is never wider than its box and the
    name wraps, however long it is. -->
    <div class="text-center">
      <UserAvatar
        v-if="profileUser"
        :src="profileUser.avatarURL"
        :name="profileUser.name"
        class="mx-auto mb-6 aspect-square w-50 max-w-full rounded-full object-cover text-5xl"
      />

      <!-- The page's only h1 (ADR-0005) — SiteTitle in the header is chrome, not content -->
      <MainTitle class="text-pretty wrap-break-word">{{ profileUser?.name }}</MainTitle>

      <p class="text-sm text-gray-500" v-if="profileUser">
        {{ reportCount }} {{ reportCount === 1 ? 'segnalazione' : 'segnalazioni' }}
      </p>

      <div class="mt-6" v-if="isMyProfile">
        <RouterLink
          class="inline-block py-4 px-3 bg-sea text-xs text-white rounded-lg"
          to="/profile/edit"
        >
          Modifica profilo
        </RouterLink>
      </div>
    </div>

    <div class="mt-8 border-t border-hairline pt-6">
      <h2 class="mb-4 text-lg font-semibold">Segnalazioni</h2>

      <div class="space-y-4" v-if="reports.length">
        <RouterLink
          v-for="report in reports"
          :key="report.id"
          :to="`/reports/${report.id}`"
          class="block p-4 bg-white border border-gray-200 rounded-lg hover:border-sea"
        >
          <div class="flex items-start justify-between gap-4">
            <strong class="min-w-0 wrap-break-word">{{ report.title }}</strong>
            <StatusBadge :status="report.status" class="flex-none" />
          </div>
          <p class="mt-1 text-sm text-gray-500">
            {{ report.category.name }} ·
            {{ report.upvotes_count }}
            {{ report.upvotes_count === 1 ? 'sostegno' : 'sostegni' }}
          </p>
        </RouterLink>
      </div>

      <p class="text-gray-500" v-else>Nessuna segnalazione.</p>
    </div>
  </AccountColumn>
</template>
