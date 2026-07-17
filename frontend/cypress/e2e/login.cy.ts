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
    cy.contains('h1', 'Log in')
    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('exist')
    cy.contains('button', 'Log in')
  })
})
