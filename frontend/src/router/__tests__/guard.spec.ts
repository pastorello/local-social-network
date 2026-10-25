import { afterEach, describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import router from '@/router'
import { locale, setLocale } from '@/lib/i18n'
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

// The reader's language lives in the address (review PR-19a): every page
// carries `?lang=en` while English is on — so a copied link carries it — and
// none while Italian is, whose address stays the canonical one.
describe('the reader’s language in the address', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    setLocale('it')
    await router.push('/il-progetto')
  })
  afterEach(() => {
    setLocale('it')
    localStorage.clear()
  })

  it('keeps ?lang=en on every page while English is on, a query built from nothing too', async () => {
    await setLocale('en')

    await router.push({ path: '/cosa-fare', query: { zona: 'serapo' } })

    expect(router.currentRoute.value.query).toEqual({ zona: 'serapo', lang: 'en' })
    await router.push('/itinerari')
    expect(router.currentRoute.value.fullPath).toBe('/itinerari?lang=en')
  })

  it('switches to the language a link names', async () => {
    await router.push('/cosa-fare?lang=en')

    expect(locale.value).toBe('en')
    expect(router.currentRoute.value.query.lang).toBe('en')
  })

  it('leaves Italian addresses as they were', async () => {
    await router.push('/cosa-fare?zona=serapo&lang=it')

    expect(locale.value).toBe('it')
    expect(router.currentRoute.value.fullPath).toBe('/cosa-fare?zona=serapo')
  })

  it('titles the window in the reader’s language, and again when it changes', async () => {
    await router.push('/itinerari')
    expect(document.title).toBe('Itinerari · Vivere Gaeta')

    await setLocale('en')
    await nextTick()

    expect(document.title).toBe('Tours · Vivere Gaeta')
    await router.push('/')
    expect(document.title).toBe('Vivere Gaeta — the map of Gaeta')
  })

  it('keeps a collaborator’s page Italian, title and all', async () => {
    await setLocale('en')
    useUserStore().user.isAuthenticated = true

    await router.push('/le-mie-schede')

    expect(router.currentRoute.value.meta.italian).toBe(true)
    expect(document.title).toBe('Le mie schede · Vivere Gaeta')
  })
})
