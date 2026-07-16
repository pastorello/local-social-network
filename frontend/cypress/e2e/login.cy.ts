describe('login page', () => {
  it('redirects unauthenticated visitors from the home page to /login', () => {
    cy.visit('/')
    cy.location('pathname').should('equal', '/login')
  })

  it('renders the login form', () => {
    cy.visit('/login')
    cy.contains('h1', 'Log in')
    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('exist')
    cy.contains('button', 'Log in')
  })
})
