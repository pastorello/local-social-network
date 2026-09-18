<script setup lang="ts">
import { useRouter } from 'vue-router'

import ItineraryForm from '@/components/content/ItineraryForm.vue'
import MainTitle from '@/components/typography/MainTitle.vue'
import { itinerarioConfig } from '@/definitions/typeConfigs'
import type Itinerario from '@/definitions/interfaces/Itinerario'

const router = useRouter()

const onCreated = (tour: Itinerario) => {
  router.push({ name: itinerarioConfig.routeNames.detail, params: { id: tour.id } })
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl pt-2">
    <MainTitle>Nuovo itinerario</MainTitle>
    <p class="mb-8 text-muted">
      Le tappe si scelgono sulla mappa, tra le schede dell’archivio. Puoi salvarlo come bozza e
      pubblicarlo quando tutte le tappe sono pubblicate.
    </p>
    <ItineraryForm
      @saved="onCreated"
      @cancel="router.push({ name: itinerarioConfig.routeNames.list })"
    />
  </div>
</template>
