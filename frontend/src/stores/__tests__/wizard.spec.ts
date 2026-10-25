import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'

import { useMapStore } from '../map'
import { useWizardStore } from '../wizard'

vi.mock('axios')
// Asked for once the page has painted (stores/map.ts, stores/wizard.ts,
// useArchiveLine): at once, here.
vi.mock('@/lib/firstPaint', () => ({ afterFirstPaint: () => Promise.resolve() }))

// The wizard's counts (review PR-21): the home and /benvenuto ask the same
// question (PR-21b, one front door), and the home is mounted for the life of
// the app — so they are asked for once, whichever page asks first.
describe('the wizard store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.mocked(axios.get).mockImplementation(async (url: string, config?: unknown) => {
      const finestra = (config as { params?: { finestra?: string } } | undefined)?.params?.finestra
      if (url === '/api/eventi/') return { data: { count: finestra === 'oggi' ? 1 : 3 } }
      if (url === '/api/content/counts/') return { data: { ricette: 2 } }
      return { data: [] }
    })
  })

  const wizardCalls = () =>
    vi.mocked(axios.get).mock.calls.filter(([url]) => !String(url).startsWith('/api/map/f'))

  it('asks once for the two pages that share it, and knows once the map’s features are in', async () => {
    const wizard = useWizardStore()
    useMapStore().loaded = true

    wizard.load()
    wizard.load()
    await flushPromises()

    expect(wizardCalls()).toHaveLength(7)
    expect(wizard.dishes).toBe(2)
    expect(wizard.windows).toEqual({ oggi: 1, settimana: 3 })
    expect(wizard.known).toBe(false)
    useMapStore().featuresLoaded = true
    expect(wizard.known).toBe(true)
  })

  it('offers what it could check when an answer fails, and nothing of what it could not', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('offline'))
    const wizard = useWizardStore()
    useMapStore().loaded = true

    await wizard.load()

    expect(wizard.loaded).toBe(true)
    expect(wizard.intents).toEqual([])
    expect(wizard.windows).toEqual({ oggi: 0, settimana: 0 })
  })

  it('asks the home’s question until the reader puts it away, and again on request', () => {
    const wizard = useWizardStore()
    expect(wizard.questionOpen).toBe(true)
    wizard.closeQuestion()
    expect(wizard.questionOpen).toBe(false)
    wizard.openQuestion()
    expect(wizard.questionOpen).toBe(true)
  })
})
