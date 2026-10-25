<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EventForm from '@/components/eventi/EventForm.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import type { Evento } from '@/definitions/interfaces/Evento'
import { useUserStore } from '@/stores/user'

// Filing an event, or changing one (spec cosa-fare.md Part −1 D9). A page of
// its own rather than a form opened in place, as a card's is: an event is not
// a card (CF25). Saved, it opens the event's page; cancelled, the page it was
// changing, or the list it would have joined.
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const id = computed(() => (route.params.id as string | undefined) ?? null)
const evento = ref<Evento | null>(null)
const loading = ref(!!id.value)
const failed = ref(false)

const isOwner = computed(
  () =>
    !evento.value ||
    evento.value.author.id === userStore.user.id ||
    userStore.user.role === 'admin',
)

onMounted(async () => {
  if (!id.value) return
  try {
    evento.value = (await axios.get<Evento>(`/api/eventi/${id.value}/`)).data
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

const saved = (result: Evento) => router.push({ name: 'eventodetail', params: { id: result.id } })
const cancel = () =>
  router.push(
    id.value ? { name: 'eventodetail', params: { id: id.value } } : { name: 'eventilist' },
  )
</script>

<template>
  <div class="mx-auto w-full max-w-2xl pt-2">
    <MainTitle>{{ id ? 'Modifica l’evento' : 'Nuovo evento' }}</MainTitle>
    <p v-if="!id" class="-mt-4 mb-8 text-muted">
      Hai una locandina davanti? Fotografala: il resto sono quattro campi.
    </p>

    <p v-if="loading" class="text-muted">Carico l’evento…</p>
    <p v-else-if="failed" class="text-muted">
      Non è stato possibile caricare l’evento. Riprova tra poco.
    </p>
    <p v-else-if="!isOwner" class="text-muted">Puoi modificare solo i tuoi eventi.</p>
    <EventForm v-else :evento="evento" @saved="saved" @cancel="cancel" />
  </div>
</template>
