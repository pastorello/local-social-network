import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import PlacesList from '../PlacesList.vue'
import CoverPlaceholder from '@/components/content/CoverPlaceholder.vue'
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

  it('gives a row with no cover the lists’ one placeholder, not a block of saturated colour (review PR-6)', () => {
    const wrapper = mount(PlacesList, {
      props: {
        features: [
          feature({ id: 'a', title: 'Duomo', type: 'chiese' }),
          feature({ id: 'b', title: 'Serapo', cover: 'https://example.test/serapo.jpg' }),
        ],
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const [bare, covered] = wrapper.findAll('li')
    expect(bare!.getComponent(CoverPlaceholder).props('type')).toBe('chiese')
    expect(bare!.html()).toContain('color-mix')
    expect(covered!.findComponent(CoverPlaceholder).exists()).toBe(false)
    expect(covered!.get('img').attributes('src')).toBe('https://example.test/serapo.jpg')
  })
})
