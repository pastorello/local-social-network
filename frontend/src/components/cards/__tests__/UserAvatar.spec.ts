import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import UserAvatar from '../UserAvatar.vue'

describe('UserAvatar initials (TD-30)', () => {
  it.each([
    ['Luca Pastorello', 'LP'],
    ['Redazione (bozze da fonti pubbliche)', 'RB'],
    ['  ¿Ángela  ', 'Á'],
    ['— —', '?'],
    [null, '?'],
  ])('%s → %s', (name, expected) => {
    const wrapper = mount(UserAvatar, { props: { src: null, name } })
    expect(wrapper.text()).toBe(expected)
  })
})
