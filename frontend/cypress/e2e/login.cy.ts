describe('anonymous visitor', () => {
  it('can open the report map without logging in', () => {
    cy.visit('/')
    cy.contains('h1', 'Segnalazioni')
    cy.contains('button', 'Segnala un problema')
  })

  it('is redirected to /login for auth-only pages', () => {
    cy.visit('/users')
    cy.location('pathname').should('equal', '/login')
  })
})

describe('login page', () => {
  it('renders the login form', () => {
    cy.visit('/login')
    cy.contains('h1', 'Accedi')
    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('exist')
    cy.contains('button', 'Accedi')
  })
})

describe('session restore', () => {
  it('keeps an authenticated visitor on an auth-only page after a hard reload', () => {
    // Installing the router starts the first navigation, which runs the
    // meta.requiresAuth guard. If the session is restored after that — as it was
    // when initStore lived in App.vue's onBeforeMount — this lands on /login.
    //
    // Honest note: this passed before the fix too, because Vue Router's guard
    // queue starts from a resolved promise and so ran a microtask after the
    // synchronous mount. It is here to stop that accident being relied on
    // again: any await added before app.mount() now fails this test (TD-32).
    cy.visit('/users', {
      onBeforeLoad(win) {
        win.localStorage.setItem('user.access', 'stale-but-present')
        win.localStorage.setItem('user.refresh', 'stale-but-present')
        win.localStorage.setItem('user.id', '00000000-0000-4000-8000-000000000000')
        win.localStorage.setItem('user.name', 'Cittadino Uno')
      },
    })

    cy.location('pathname').should('equal', '/users')
  })
})
