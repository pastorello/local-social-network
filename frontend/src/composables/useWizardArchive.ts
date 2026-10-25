import axios from 'axios'
import { computed, ref } from 'vue'

import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { Zone, ZoneAlias } from '@/definitions/interfaces/MapData'
import type { EventWindow, WizardArchive, WizardTour } from '@/lib/wizard'
import { useMapStore } from '@/stores/map'

interface Page<T> {
  count: number
  results: T[]
}

// What the wizard «Cosa fare adesso» needs before it offers an answer (review
// PR-21, lib/wizard.ts): the intents with their tours counted, the tours with
// their zones, the zones and the names a guest gives them («Dove sei?»), how
// many dishes and how many events today and this week — all public and
// short — and the map's features, which the shell has already asked for.
// `known` turns true once every answer is in, failed or not: an answer that
// could not be checked is simply not offered, and the answers land together,
// so none arrives above another already on screen.
export function useWizardArchive() {
  const mapStore = useMapStore()
  const intents = ref<Intent[]>([])
  const tours = ref<WizardTour[]>([])
  const zones = ref<Zone[]>([])
  const aliases = ref<ZoneAlias[]>([])
  const dishes = ref(0)
  const windows = ref<Record<EventWindow, number>>({ oggi: 0, settimana: 0 })
  const loaded = ref(false)

  const load = async () => {
    if (!mapStore.loaded) mapStore.load()
    const results = await Promise.allSettled([
      axios.get<Intent[]>('/api/itinerari/intenti/'),
      axios.get<Page<WizardTour>>('/api/itinerari/', { params: { page_size: 100 } }),
      axios.get<Zone[]>('/api/map/zone/'),
      axios.get<ZoneAlias[]>('/api/map/zone/alias/'),
      axios.get<Record<string, number>>('/api/content/counts/'),
      axios.get<Page<unknown>>('/api/eventi/', { params: { finestra: 'oggi', page_size: 1 } }),
      axios.get<Page<unknown>>('/api/eventi/', { params: { finestra: 'settimana', page_size: 1 } }),
    ])
    const value = <T>(result: PromiseSettledResult<{ data: T }>): T | null =>
      result.status === 'fulfilled' ? result.value.data : null
    intents.value = value(results[0]) ?? []
    tours.value = value(results[1])?.results ?? []
    zones.value = value(results[2]) ?? []
    aliases.value = value(results[3]) ?? []
    dishes.value = value(results[4])?.ricette ?? 0
    windows.value = {
      oggi: value(results[5])?.count ?? 0,
      settimana: value(results[6])?.count ?? 0,
    }
    loaded.value = true
  }

  const archive = computed<WizardArchive>(() => ({
    intents: intents.value,
    features: mapStore.features,
    tours: tours.value,
    dishes: dishes.value,
  }))

  return {
    archive,
    zones,
    aliases,
    windows,
    known: computed(() => loaded.value && mapStore.featuresLoaded),
    load,
  }
}
