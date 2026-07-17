import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import PollCard from '../PollCard.vue'
import { useUserStore, type UserRole } from '@/stores/user'
import type Poll from '@/definitions/interfaces/Poll'

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
    ],
  })

const makePoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'poll-1',
  question: 'Dove costruire la nuova area giochi?',
  created_by: { id: 'admin-1', name: 'Amministratore', avatarURL: '' },
  closes_at: null,
  is_closed: false,
  created_at: '2026-07-17T10:00:00Z',
  options: [
    { id: 'opt-1', text: 'Villa comunale', position: 0, votes_count: null },
    { id: 'opt-2', text: 'Lungomare', position: 1, votes_count: null },
  ],
  my_vote: null,
  results_visible: false,
  total_votes: null,
  ...overrides,
})

const mountCard = (poll: Poll, user?: { role: UserRole }) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (user) {
    const userStore = useUserStore()
    userStore.user.isAuthenticated = true
    userStore.user.id = 'user-1'
    userStore.user.role = user.role
  }
  return mount(PollCard, {
    props: { poll },
    global: { plugins: [pinia, makeRouter()] },
  })
}

describe('PollCard', () => {
  it('shows options without vote controls or counts to visitors', () => {
    const wrapper = mountCard(makePoll())

    expect(wrapper.text()).toContain('Villa comunale')
    expect(wrapper.text()).toContain('Lungomare')
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Accedi per votare')
    expect(wrapper.text()).not.toContain('%')
  })

  it('shows the vote form to a citizen who has not voted yet', () => {
    const wrapper = mountCard(makePoll(), { role: 'citizen' })

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Vota')
    expect(wrapper.text()).not.toContain('Accedi per votare')
  })

  it('shows results and marks the own vote after voting', () => {
    const poll = makePoll({
      my_vote: 'opt-1',
      results_visible: true,
      total_votes: 4,
      options: [
        { id: 'opt-1', text: 'Villa comunale', position: 0, votes_count: 3 },
        { id: 'opt-2', text: 'Lungomare', position: 1, votes_count: 1 },
      ],
    })

    const wrapper = mountCard(poll, { role: 'citizen' })

    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('il tuo voto')
    expect(wrapper.text()).toContain('75%')
    expect(wrapper.text()).toContain('25%')
    expect(wrapper.text()).toContain('4 voti totali')
  })

  it('marks a closed poll and hides every vote control', () => {
    const poll = makePoll({
      is_closed: true,
      results_visible: true,
      total_votes: 0,
      options: [
        { id: 'opt-1', text: 'Villa comunale', position: 0, votes_count: 0 },
        { id: 'opt-2', text: 'Lungomare', position: 1, votes_count: 0 },
      ],
    })

    const wrapper = mountCard(poll, { role: 'citizen' })

    expect(wrapper.text()).toContain('Chiuso')
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Vota')
  })

  it('offers the close action to admins on open polls', () => {
    const wrapper = mountCard(makePoll(), { role: 'admin' })

    expect(wrapper.text()).toContain('Chiudi sondaggio')
  })
})
