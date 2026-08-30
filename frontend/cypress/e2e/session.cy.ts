// The 401 → refresh → replay cycle, end to end (TD-06's blind spot).
//
// Why this file exists: `lib/__tests__/auth.spec.ts` mocks axios *entirely*,
// so it proves the interceptor's own logic and nothing about the library
// underneath it. When axios was upgraded on 2026-08-20 the suite stayed green
// and the cycle had to be checked by hand, watching the network log. That is
// the kind of green suite this project cannot afford: the next upgrade would
// have to be checked by hand again, and one day nobody would.
//
// No waiting for a token to age out — the access token is replaced with one
// the API will reject, which is the same thing from the interceptor's side and
// is deterministic.
const EMAIL = 'collaboratore@e2e.test'
const PASSWORD = 'E2ePassw0rd!'

// A structurally valid JWT the API cannot have signed.
// Every test here logs in, and `login` is throttled at 10/min per IP (TD-18).
// A full local re-run of the suite twice inside a minute will therefore fail
// on a 429 rather than on anything real — the same footnote collabora.cy.ts
// carries for its own limit.
const FORGED_ACCESS =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxLCJqdGkiOiJkZWFkIiwidXNlcl9pZCI6IjAifQ' +
  '.not-a-valid-signature'

describe('an expired access token', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.visit('/login')
    cy.get('input[type="email"]').type(EMAIL)
    cy.get('input[type="password"]').type(PASSWORD, { log: false })
    cy.contains('button', 'Accedi').click()
    cy.contains('button', 'Esci').should('exist')
  })

  it('is refreshed and the request replayed, without the reader noticing', () => {
    cy.window().then((win) => {
      const refreshBefore = win.localStorage.getItem('user.refresh')
      expect(refreshBefore, 'a refresh token was stored at login').to.be.a('string')
      win.localStorage.setItem('user.access', FORGED_ACCESS)
    })

    cy.intercept('POST', '**/api/users/refresh/').as('refresh')

    // An auth-only page: the guard lets it through (the store still believes
    // it is logged in), the API rejects the forged token, and the interceptor
    // has to do the rest.
    cy.visit('/users')

    cy.wait('@refresh').its('response.statusCode').should('equal', 200)
    cy.location('pathname').should('equal', '/users')
    cy.contains('button', 'Esci').should('exist')

    cy.window().then((win) => {
      // M4 rotates refresh tokens and blacklists the old one, so a successful
      // cycle must have *replaced* what was stored — keeping the old one would
      // mean the next refresh fails against the blacklist.
      expect(win.localStorage.getItem('user.access')).to.not.equal(FORGED_ACCESS)
    })
  })

  it('clears the session once, and only once, when the refresh token is dead too', () => {
    cy.intercept('POST', '**/api/users/refresh/').as('refresh')

    cy.window().then((win) => {
      win.localStorage.setItem('user.access', FORGED_ACCESS)
      win.localStorage.setItem('user.refresh', FORGED_ACCESS)
    })

    cy.visit('/users')

    cy.wait('@refresh').its('response.statusCode').should('equal', 401)
    cy.contains('a', 'Accedi').should('exist')
    cy.window().then((win) => {
      // The security half: nothing stale is kept, so no later request can be
      // made with a token the server has rejected.
      expect(win.localStorage.getItem('user.access')).to.be.oneOf([null, ''])
      expect(win.localStorage.getItem('user.refresh')).to.be.oneOf([null, ''])
    })

    // And exactly one attempt — `_retried` is what stops a failed refresh
    // becoming a loop of them.
    cy.get('@refresh.all').should('have.length', 1)

    // Note what is *not* asserted: a redirect to /login. There isn't one — the
    // visitor stays on the auth-only page they were reading, logged out, with
    // an empty list. That is a gap worth its own decision (yanking someone to
    // /login because a background request failed is its own kind of rude), so
    // it is pinned here rather than fixed in passing.
    cy.location('pathname').should('equal', '/users')
  })
})
