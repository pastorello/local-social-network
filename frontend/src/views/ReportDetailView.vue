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
import { ADMIN_TRANSITIONS, STATUS_META, statusColor } from '@/lib/reportStatus'
import { useMapFocus } from '@/composables/useMapFocus'
import { usePageTitle } from '@/composables/usePageTitle'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const report = ref<Report | null>(null)

// The map behind the panel shows where the problem is (D16).
useMapFocus(() =>
  report.value
    ? {
        id: report.value.id,
        type: 'segnalazioni',
        points: [{ lat: report.value.lat, lng: report.value.lng, label: '' }],
        route: [],
        color: statusColor(report.value.status),
      }
    : null,
)
// «Buca su Lungomare Caboto · Segnalazioni · Vivere Gaeta» (review PR-23).
usePageTitle(() => (report.value ? [report.value.title, 'Segnalazioni'] : null))

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
    .catch(() => {
      // Every other action in the app raises a toast; this one used to fail
      // silently, so the button simply did not move (TD-31).
      toastStore.showToast(5000, 'Non è stato possibile registrare il voto.', 'bg-red-300')
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
  <ViewContainer class="grid-cols-1">
    <div>
      <!-- A report is not a card: no rich text, no translations, no cover
      gallery. But it is the one v1 surface a reader reaches from the
      redesigned home (a pin pushes here), so it wears the article's skeleton —
      same measure, same meta line, same footer — with the status and the
      support count in place of a type label. -->
      <article v-if="report && !editing" class="mx-auto w-full max-w-3xl">
        <!-- Not cropped to an aspect ratio the way a card cover is (D5): this
        photo is the evidence, and a pothole cut to 21/9 can lose the point. -->
        <div v-if="report.photoURL" class="-mx-4 mb-6 sm:mx-0">
          <img
            :src="report.photoURL"
            class="w-full sm:rounded-lg"
            :alt="`Foto della segnalazione: ${report.title}`"
          />
        </div>

        <header class="mb-8">
          <!-- What it is — a report — is the panel's eyebrow above it
          (review PR-23); its status is its own. -->
          <div class="mb-3">
            <StatusBadge :status="report.status" />
          </div>

          <MainTitle>{{ report.title }}</MainTitle>

          <p class="flex items-start gap-2 text-sm text-muted">
            <!-- The category colour comes from the database, not the palette:
            it is data an admin sets, in the same saturated register D7 keeps
            for the map, where colour distinguishes rather than decorates. -->
            <span
              class="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full"
              :style="{ backgroundColor: report.category.color }"
            ></span>
            <span
              >{{ report.category.name }} · segnalata da
              <strong class="font-semibold text-ink">{{ report.author.name }}</strong> il
              {{ createdAtFormatted }}</span
            >
          </p>
        </header>

        <p class="mb-10 max-w-[65ch] text-reading whitespace-pre-line text-ink">
          {{ report.description }}
        </p>

        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6"
        >
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors"
            :class="
              report.upvoted_by_me
                ? 'border-sea bg-sea text-white hover:bg-sea-deep'
                : 'border-field bg-surface text-ink hover:border-sea hover:text-sea'
            "
            :aria-pressed="report.upvoted_by_me"
            @click="toggleUpvote"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              :fill="report.upvoted_by_me ? 'currentColor' : 'none'"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
              aria-hidden="true"
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

        <section
          v-if="isAdmin && adminTransitions.length > 0"
          class="mt-10 border-t border-hairline pt-6"
        >
          <h2 class="mb-4 font-display text-title text-ink">Moderazione</h2>
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
        </section>

        <footer class="mt-10 border-t border-hairline pt-6">
          <RouterLink to="/" class="inline-block text-sm text-sea underline"
            >← Torna alla mappa</RouterLink
          >
        </footer>
      </article>

      <!-- The edit form keeps its panel, exactly as TypeDetailView's does:
      authoring is a surface with edges, reading is not. -->
      <PanelBox v-else-if="report" class="mx-auto w-full max-w-3xl">
        <ReportForm
          :categories="categories"
          :coords="{ lat: report.lat, lng: report.lng }"
          :report="report"
          @saved="onEdited"
          @cancel="editing = false"
        />
      </PanelBox>
    </div>
  </ViewContainer>
</template>
