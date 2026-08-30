// The public half of the C1 flow (TD-04): "Collabora con noi" is the only way
// an account is ever asked for, so it is the front door of the whole product.
//
// Not covered here, and deliberately: what happens *after* the admin approves.
// That leg needs the invite token out of an e-mail, which means either reading
// the outbox or a test-only endpoint — a hook worth adding on purpose, not as
// a side effect of writing this spec.
describe('collabora con noi', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('tells a bot nothing: an instant submission looks exactly like a good one', () => {
    cy.visit('/collabora')

    cy.get('#collabora-name').type('Bot Veloce')
    cy.get('#collabora-email').type(`bot-${Date.now()}@e2e.test`)
    cy.get('#collabora-message').type('Sono un bot.')
    // No wait: filling the form instantly is the machine tell the timing
    // check (accounts.md A1) looks for.
    cy.contains('button', 'Invia richiesta').click()

    // The API drops it and answers as if it had stored it, on purpose — a bot
    // that can see the difference can tune itself past the check. This spec
    // pins the *visible* half of that contract; that nothing was actually
    // stored is `test_collaborate_silently_drops_a_too_fast_submission` in
    // account/tests.py, where the database is in reach.
    cy.contains('Richiesta inviata').should('exist')
    cy.location('pathname').should('equal', '/')
  })

  it('accepts one filled at human speed and says so', () => {
    cy.visit('/collabora')

    cy.get('#collabora-name').type('Persona E2E')
    cy.get('#collabora-email').type(`persona-${Date.now()}@e2e.test`)
    cy.get('#collabora-message').type('Vorrei scrivere le schede sulle chiese di Gaeta.')

    // A fixed wait, and the one place it is the right tool: the thing under
    // test *is* a time gate (MIN_FORM_FILL_SECONDS = 3 in account/api.py), so
    // there is no event to wait for instead. Faking the clock would not help
    // either — the comparison happens on the server, against its own time.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3200)
    cy.contains('button', 'Invia richiesta').click()

    cy.contains('Richiesta inviata').should('exist')
    cy.location('pathname').should('equal', '/')
  })

  it('offers collaboration rather than signup, anywhere a visitor looks', () => {
    // v2's standing decision: an account is an invitation, not a right. The
    // header is where a visitor would look for "Registrati".
    cy.visit('/')
    cy.contains('a', 'Collabora con noi').should('exist')
    cy.contains('Registrati').should('not.exist')
    cy.get('a[href="/signup"]').should('not.exist')
  })
})
