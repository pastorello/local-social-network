<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PanelBox from '@/components/boxes/PanelBox.vue'
import ViewContainer from '@/components/boxes/ViewContainer.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import ActionButton from '@/components/buttons/ActionButton.vue'
import UserAvatar from '@/components/cards/UserAvatar.vue'
import RichText from '@/components/content/RichText.vue'
import FesteRouteEditor from '@/components/content/FesteRouteEditor.vue'
import FesteForm from '@/components/content/FesteForm.vue'
import LanguageSwitch from '@/components/content/LanguageSwitch.vue'
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

const createdAtFormatted = computed(() => {
  if (!feste.value) return ''
  return new Date(feste.value.created_at).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

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
  <ViewContainer class="grid-cols-4">
    <div class="col-span-2 col-start-2 space-y-4 self-start">
      <PanelBox v-if="feste">
        <template v-if="!editing">
          <LanguageSwitch :translations="feste.translations" detail-route-name="festedetail" />

          <div class="mb-2 flex items-center justify-between gap-4">
            <MainTitle>{{ feste.title }}</MainTitle>
            <span v-if="!feste.is_published" class="text-xs text-gray-500">Bozza</span>
          </div>

          <p class="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <UserAvatar
              :src="feste.author.avatarURL"
              :name="feste.author.name"
              class="w-6 h-6 rounded-full inline-block object-cover"
            />
            <strong>{{ feste.author.name }}</strong> · {{ createdAtFormatted }}
          </p>

          <p v-if="feste.recurrence" class="mb-4 font-semibold">{{ feste.recurrence }}</p>

          <div v-if="feste.images.length > 0" class="flex flex-wrap gap-2 mb-4">
            <img
              v-for="image in feste.images"
              :key="image.id"
              :src="image.imageURL"
              class="w-32 h-32 object-cover rounded-xl"
              :alt="image.caption || feste.title"
            />
          </div>

          <RichText :html="feste.body_html" class="mb-6" />

          <p v-if="feste.programme" class="mb-6 whitespace-pre-line">
            <strong>Programma:</strong><br />{{ feste.programme }}
          </p>

          <FesteRouteEditor
            v-if="feste.route.length > 0"
            :model-value="feste.route"
            readonly
            class="mb-6"
          />

          <div class="flex flex-wrap items-center gap-2" v-if="canEdit">
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

        <FesteForm v-else :feste="feste" @saved="onEdited" @cancel="editing = false" />
      </PanelBox>

      <PanelBox>
        <RouterLink to="/feste" class="underline">← Torna alle feste</RouterLink>
      </PanelBox>
    </div>
  </ViewContainer>
</template>
