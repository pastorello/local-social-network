import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import router from '@/router'
import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'

// The router's guard (meta.requiresAuth): a page behind the login sends a
// reader to sign in and back. The polls are such a page since review PR-17
// (decided 2026-10-22, spec reports-and-polls.md P1), and they say why.
describe('the polls are for someone with an account', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.push('/il-progetto')
  })

  it('sends a reader to sign in, says why, and keeps where they were going', async () => {
    await router.push('/polls')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/polls')
    const toast = useToastStore()
    expect(toast.isVisible).toBe(true)
    expect(toast.message).toBe("I sondaggi sono per chi collabora all'archivio")
  })

  it('opens them for someone signed in, with nothing to say', async () => {
    useUserStore().user.isAuthenticated = true

    await router.push('/polls')

    expect(router.currentRoute.value.path).toBe('/polls')
    expect(useToastStore().isVisible).toBe(false)
  })

  // The toast is the polls' own: another page behind the login redirects as
  // it always has, without a message.
  it('says nothing for a page that did not ask to', async () => {
    await router.push('/users')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(useToastStore().isVisible).toBe(false)
  })
})
