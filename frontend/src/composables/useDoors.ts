import axios from 'axios'
import { computed, ref } from 'vue'

import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { Zone } from '@/definitions/interfaces/MapData'
import { intentsWithTours, zonesWithPlaces } from '@/lib/doors'

// What /benvenuto and the home need to know before offering their doors: the
// intents with their tour counts and the zones with their place counts, both
// public and short. `loaded` turns true once both have answered, failed or
// not — a door that could not be checked is simply not offered.
export function useDoors() {
  const intents = ref<Intent[]>([])
  const zones = ref<Zone[]>([])
  const loaded = ref(false)

  const load = async () => {
    const [intentsResult, zonesResult] = await Promise.allSettled([
      axios.get<Intent[]>('/api/itinerari/intenti/'),
      axios.get<Zone[]>('/api/map/zone/'),
    ])
    if (intentsResult.status === 'fulfilled') intents.value = intentsResult.value.data
    if (zonesResult.status === 'fulfilled') zones.value = zonesResult.value.data
    loaded.value = true
  }

  return {
    withTours: computed(() => intentsWithTours(intents.value)),
    zonesWithPlaces: computed(() => zonesWithPlaces(zones.value)),
    loaded,
    load,
  }
}
