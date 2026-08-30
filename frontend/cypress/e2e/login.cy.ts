describe('anonymous visitor', () => {
  it('can open the map without logging in, on a wide screen', () => {
    // Cypress' default viewport is 1000px wide, i.e. below the 1024px line
    // where the reader's small-first home takes over (spec/design.md D2) —
    // so the wide layout has to be asked for explicitly.
    cy.viewport(1280, 800)
    cy.visit('/')
    cy.contains('h1', 'La mappa di Gaeta')
    cy.contains('legend', 'Livelli')
    cy.contains('button', 'Segnala un problema')
  })

  it('gets the map and a sheet of places on a phone', () => {
    cy.viewport(375, 812)
    cy.visit('/')

    // The page keeps exactly one h1 in both layouts (ADR-0005) — on a phone
    // it is visually hidden, because the map is the title.
    cy.get('h1').should('have.length', 1).and('not.be.visible')
    // D3: the map fills the screen and the places sit in a sheet over it.
    cy.get('section[aria-label="Luoghi sulla mappa"]').should('exist')
    // D4: the layer controls float over the map rather than beside it, and
    // stay behind a button until asked for.
    cy.get('button[aria-controls="map-chrome-panel"]').should('have.attr', 'aria-expanded', 'false')
    cy.get('#layer-chiese').should('not.exist')
    cy.get('button[aria-controls="map-chrome-panel"]').click()
    cy.get('#layer-chiese').should('exist')
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
