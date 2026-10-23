import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Component } from 'vue'

import CollaboraView from '../CollaboraView.vue'
import EditPasswordView from '../EditPasswordView.vue'
import EditProfileView from '../EditProfileView.vue'
import InviteAcceptView from '../InviteAcceptView.vue'
import LoginView from '../LoginView.vue'
import PasswordResetConfirmView from '../PasswordResetConfirmView.vue'
import PasswordResetRequestView from '../PasswordResetRequestView.vue'

vi.mock('axios')

const stub = { template: '<div />' }

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
      { path: '/collabora', name: 'collabora', component: stub },
      { path: '/password-dimenticata', name: 'passwordresetrequest', component: stub },
      { path: '/profile/edit', name: 'editprofile', component: stub },
      { path: '/profile/edit/password', name: 'editpassword', component: stub },
      { path: '/profile/:id', name: 'profile', component: stub },
    ],
  })

const mountView = (view: Component) =>
  mount(view, { global: { plugins: [createPinia(), makeRouter()] } })

// The seven account forms (review PR-11, design.md "The account forms in one
// column"): the four the prompt names and the two a token opens, which are
// the same page to the person holding the link.
const FORMS: [string, Component][] = [
  ['/login', LoginView],
  ['/collabora', CollaboraView],
  ['/password-dimenticata', PasswordResetRequestView],
  ['/invito/:token', InviteAcceptView],
  ['/reimposta-password/:token', PasswordResetConfirmView],
  ['/profile/edit', EditProfileView],
  ['/profile/edit/password', EditPasswordView],
]

describe('the account forms', () => {
  // L-09: a title alone in a box on the left, the form in another on the
  // right. One box now, and the title is in it.
  it.each(FORMS)('%s is one column: the title and the form share one box', (_, view) => {
    const wrapper = mountView(view)

    const box = wrapper.get('h1').element.parentElement
    expect(box).not.toBeNull()
    expect(box!.contains(wrapper.get('form').element)).toBe(true)
    expect(wrapper.find('.grid-cols-2').exists()).toBe(false)
  })

  // WCAG 1.3.5 (Identify Input Purpose, AA — ADR-0005's bar): a field that
  // asks for something about the person says what, so a browser or a password
  // manager can fill it and an assistive tool can label it. The honeypot is
  // the one exception, and it is hidden from everyone but a bot; a file input
  // has no purpose to name.
  it.each(FORMS)('%s names the purpose of every field it asks a person to fill', (_, view) => {
    const wrapper = mountView(view)

    const fields = wrapper
      .findAll('input')
      .filter((input) => input.attributes('type') !== 'file')
      .filter((input) => !input.element.closest('[aria-hidden="true"]'))
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields) {
      expect(field.attributes('autocomplete'), `#${field.attributes('id')}`).toMatch(
        /^(username|current-password|new-password|email|name)$/,
      )
    }
  })
})

describe('the login form', () => {
  // A-03: the address is the account's name here, which is what a password
  // manager pairs with the current password.
  it('asks for the username and the current password', () => {
    const wrapper = mountView(LoginView)

    expect(wrapper.get('#login-email').attributes('autocomplete')).toBe('username')
    expect(wrapper.get('#login-password').attributes('autocomplete')).toBe('current-password')
  })

  // The prompt's order, which is also the keyboard's: the two fields, «Password
  // dimenticata?», «Accedi», and under them the way in for someone without an
  // account.
  it('reads top to bottom as the keyboard reaches it', () => {
    const wrapper = mountView(LoginView)

    const order = wrapper
      .findAll('input, a, button')
      .map((el) => el.attributes('id') ?? el.text().trim())
    expect(order).toEqual([
      'login-email',
      'login-password',
      'Password dimenticata?',
      'Accedi',
      'Scrivici',
    ])
    expect(wrapper.get('a[href="/collabora"]').text()).toBe('Scrivici')
  })
})
