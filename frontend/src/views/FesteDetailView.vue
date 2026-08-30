<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import CardArticle from '@/components/content/CardArticle.vue'
import FesteRouteEditor from '@/components/content/FesteRouteEditor.vue'
import FesteForm from '@/components/content/FesteForm.vue'
import TranslateControl from '@/components/content/TranslateControl.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type Feste from '@/definitions/interfaces/Feste'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const feste = ref<Feste | null>(null)
// A freshly-started translation (see TranslateControl) is an empty draft —
// its detail page opens straight into edit mode via ?edit=1 rather than
// showing a blank read view first.
const editing = ref(route.query.edit === '1')

const canEdit = computed(
  () =>
    feste.value !== null &&
    (userStore.user.id === feste.value.author.id || userStore.user.role === 'admin'),
)

const getFeste = async () => {
  await axios
    .get(`/api/feste/${route.params.id}/`)
    .then((response) => {
      feste.value = response.data
    })
    .catch(() => {
      toastStore.showToast(5000, 'Festa non trovata', 'bg-red-300')
      router.push('/feste')
    })
}

const onEdited = (updated: Feste) => {
  feste.value = updated
  editing.value = false
}

const deleteFeste = async () => {
  if (!feste.value) return
  if (!window.confirm('Vuoi davvero eliminare questa scheda?')) return

  await axios
    .delete(`/api/feste/${feste.value.id}/`)
    .then(() => {
      toastStore.showToast(5000, 'Scheda eliminata', 'bg-emerald-500')
      router.push('/feste')
    })
    .catch(() => {
      toastStore.showToast(5000, 'Impossibile eliminare la scheda.', 'bg-red-300')
    })
}

onMounted(getFeste)

// Navigating from one card's detail page straight to another's (e.g. a
// TranslateControl link) keeps the same route record, so Vue Router reuses
// this component instance instead of remounting it — refetch when the id in
// the URL changes. `editing` drops to false first: FesteForm only reads its
// `feste` prop once at setup, so flipping it straight to true would mount
// the form with the still-stale (previous card's) feste until the fetch
// resolves.
watch(
  () => route.params.id,
  async () => {
    editing.value = false
    await getFeste()
    editing.value = route.query.edit === '1'
  },
)
</script>

<template>
  <ViewContainer class="grid-cols-1">
    <div>
      <template v-if="feste && !editing">
        <CardArticle
          :title="feste.title"
          :body-html="feste.body_html"
          :author="feste.author"
          :created-at="feste.created_at"
          :is-published="feste.is_published"
          :images="feste.images"
          :translations="feste.translations"
          type-label="festa"
          detail-route-name="festedetail"
          :back-to="{ name: 'festelist', label: 'le feste' }"
        >
          <template #fields>
            <dl
              v-if="feste.recurrence || feste.programme"
              class="mb-10 divide-y divide-hairline border-y border-hairline"
            >
              <div v-if="feste.recurrence" class="py-3 sm:flex sm:gap-6">
                <dt
                  class="text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-40 sm:flex-none sm:pt-1"
                >
                  Quando
                </dt>
                <dd class="text-ink">{{ feste.recurrence }}</dd>
              </div>
              <div v-if="feste.programme" class="py-3 sm:flex sm:gap-6">
                <dt
                  class="text-xs font-semibold tracking-[0.1em] text-muted uppercase sm:w-40 sm:flex-none sm:pt-1"
                >
                  Programma
                </dt>
                <dd class="whitespace-pre-line text-ink">{{ feste.programme }}</dd>
              </div>
            </dl>
          </template>

          <template #map>
            <section v-if="feste.route.length > 0" class="mb-10">
              <h2 class="mb-3 font-display text-title text-ink">Il percorso</h2>
              <FesteRouteEditor :model-value="feste.route" readonly />
            </section>
          </template>

          <template #actions>
            <div v-if="canEdit" class="flex flex-wrap items-center gap-2">
              <ActionButton size="small" @click="editing = true">Modifica</ActionButton>
              <ActionButton size="small" button-type="danger" @click="deleteFeste">
                Elimina
              </ActionButton>
              <TranslateControl
                v-if="!feste.translation_of"
                :translate-endpoint="`/api/feste/${feste.id}/traduci/`"
                :translations="feste.translations"
                detail-route-name="festedetail"
              />
            </div>
          </template>
        </CardArticle>
      </template>

      <PanelBox v-else-if="feste" class="mx-auto w-full max-w-3xl">
        <FesteForm :feste="feste" @saved="onEdited" @cancel="editing = false" />
      </PanelBox>
    </div>
  </ViewContainer>
</template>
