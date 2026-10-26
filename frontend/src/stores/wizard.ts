import axios from 'axios'
import { defineStore } from 'pinia'

import type { Intent } from '@/definitions/interfaces/Itinerario'
import type { Zone } from '@/definitions/interfaces/MapData'
import { afterFirstPaint } from '@/lib/firstPaint'
import type { EventWindow, WizardArchive, WizardTour } from '@/lib/wizard'
import { useMapStore } from '@/stores/map'

interface Page<T> {
  count: number
  results: T[]
}

// What the wizard «Cosa fare adesso» needs before it offers an answer (review
// PR-21, lib/wizard.ts): the intents with their tours counted, the tours with
// their zones, the zones, how many dishes and how many events today and this week — all public and
// short — and the map's features, which the shell has already asked for.
// A store, not a page's state, because two pages ask the same question: the
// home and /benvenuto are one front door (review PR-21b, decided on
// 2026-10-22), and the home is mounted for the life of the app — asked once,
// whichever comes first.
export const useWizardStore = defineStore('wizard', {
  state: () => ({
    intents: [] as Intent[],
    tours: [] as WizardTour[],
    zones: [] as Zone[],
    dishes: 0,
    windows: { oggi: 0, settimana: 0 } as Record<EventWindow, number>,
    asked: false,
    // Every answer is in, failed or not: an answer that could not be checked
    // is simply not offered.
    loaded: false,
    // The question over the home's map (review PR-21b): open on arrival, put
    // away by «Vai alla mappa» — or by /benvenuto's «Non lo so: fammi vedere
    // la mappa», which leads there. For the life of the page: a reload asks
    // again, as a first impression does.
    questionOpen: true,
  }),

  getters: {
    // The features hold a collaborator's own drafts too; lib/wizard.ts
    // answers on the published ones only.
    archive(): WizardArchive {
      return {
        intents: this.intents,
        features: useMapStore().features,
        tours: this.tours,
        dishes: this.dishes,
      }
    },
    known(): boolean {
      return this.loaded && useMapStore().featuresLoaded
    },
  },

  actions: {
    async load() {
      const mapStore = useMapStore()
      if (!mapStore.loaded) mapStore.load()
      if (this.asked) return
      this.asked = true
      // After the first paint, like the map's data (stores/map.ts::load): the
      // answers land together under words already on screen, and none of them
      // can come back early enough to sit on the way to those words.
      await afterFirstPaint()
      const results = await Promise.allSettled([
        axios.get<Intent[]>('/api/itinerari/intenti/'),
        axios.get<Page<WizardTour>>('/api/itinerari/', { params: { page_size: 100 } }),
        axios.get<Zone[]>('/api/map/zone/'),
        axios.get<Record<string, number>>('/api/content/counts/'),
        axios.get<Page<unknown>>('/api/eventi/', { params: { finestra: 'oggi', page_size: 1 } }),
        axios.get<Page<unknown>>('/api/eventi/', {
          params: { finestra: 'settimana', page_size: 1 },
        }),
      ])
      const value = <T>(result: PromiseSettledResult<{ data: T }>): T | null =>
        result.status === 'fulfilled' ? result.value.data : null
      this.intents = value(results[0]) ?? []
      this.tours = value(results[1])?.results ?? []
      this.zones = value(results[2]) ?? []
      this.dishes = value(results[3])?.ricette ?? 0
      this.windows = {
        oggi: value(results[4])?.count ?? 0,
        settimana: value(results[5])?.count ?? 0,
      }
      this.loaded = true
    },

    closeQuestion() {
      this.questionOpen = false
    },

    openQuestion() {
      this.questionOpen = true
    },
  },
})
