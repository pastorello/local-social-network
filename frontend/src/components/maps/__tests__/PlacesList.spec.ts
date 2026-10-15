import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import PlacesList from '../PlacesList.vue'
import type { MapCardFeature } from '@/definitions/interfaces/MapData'

const feature = (over: Partial<MapCardFeature>): MapCardFeature => ({
  id: 'x',
  type: 'luoghi',
  title: 'X',
  is_published: true,
  cover: null,
  points: [],
  route: [],
  zones: [],
  ...over,
})

describe('PlacesList — the keyboard path to what the map draws', () => {
  it('says *bozza* on a draft’s row and only there (spec map.md M5)', () => {
    const wrapper = mount(PlacesList, {
      props: {
        features: [
          feature({ id: 'a', title: 'Spiaggia di Serapo', is_published: false }),
          feature({ id: 'b', title: 'Duomo', type: 'chiese' }),
        ],
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const rows = wrapper.findAll('li').map((li) => li.text())
    expect(rows[0]).toContain('Spiaggia di Serapo · bozza')
    expect(rows[1]).not.toContain('bozza')
  })
})
