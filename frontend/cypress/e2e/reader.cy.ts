// The logged-out reader's journey (TD-04). Runs against the real API with the
// fixtures `python manage.py seed_e2e` creates — stubbing the API here would
// only test the stubs, and the things worth covering (a draft staying hidden,
// an overlay staying invisible) are precisely where the two sides could
// disagree.
const PUBLISHED = 'Chiesa E2E pubblicata'
const DRAFT = 'Chiesa E2E in bozza'
const REPORT = 'Segnalazione E2E di un altro cittadino'

describe('the reader, on a wide screen', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('lands on the map and can turn a layer off', () => {
    cy.visit('/')

    cy.contains('h1', 'La mappa di Gaeta')
    cy.get('#layer-chiese').should('be.checked')
    cy.contains('label', 'Chiese').should('exist')

    cy.get('#layer-chiese').uncheck()
    cy.get('#layer-chiese').should('not.be.checked')
  })

  // ADR-0005 closed its map-widget deferral on the claim that the map's data
  // also reaches a reader as text. This is that claim, asserted: everything
  // the map draws is reachable without ever touching the map — a card through
  // "Luoghi sulla mappa", a report through "Segnalazioni sulla mappa".
  //
  // The keyboard half is asserted as *focusable real link*, not as a synthetic
  // Enter: Cypress's key events do not follow an anchor the way the browser
  // does, so pressing Enter here would prove nothing and passing it off as
  // keyboard operation would be worse than not testing it. An anchor with an
  // href that takes focus is operable by the platform's own guarantee; what is
  // worth testing is that such an anchor exists and points where it should.
  it('reaches everything the map draws without touching the map', () => {
    cy.visit('/')

    cy.get('ul[aria-label="Luoghi sulla mappa"]').contains('a', PUBLISHED).should('exist')

    cy.get('ul[aria-label="Segnalazioni sulla mappa"]').contains('a', REPORT).as('reportLink')
    cy.get('@reportLink').focus()
    cy.get('@reportLink').should('have.focus')
    cy.get('@reportLink')
      .should('have.attr', 'href')
      .and('match', /^\/reports\/[0-9a-f-]+$/)

    cy.get('@reportLink').click()
    cy.location('pathname').should('match', /^\/reports\/[0-9a-f-]+$/)
    cy.contains('h1', REPORT)
  })

  it('is offered the public overlay and never learns the confidential one exists', () => {
    cy.visit('/')

    // ADR-0006: the gate is the queryset, and this is what it looks like from
    // outside — the seggi overlay is not hidden in the DOM, it is absent.
    cy.contains('label', 'Quartieri E2E').should('exist')
    cy.contains('Seggi E2E').should('not.exist')
  })

  it('reaches a published card from the list and reads it', () => {
    cy.visit('/chiese')

    cy.contains('h1', 'Chiese')
    cy.contains('a', PUBLISHED).click()

    cy.location('pathname').should('match', /^\/chiese\/[0-9a-f-]+$/)
    cy.contains('h1', PUBLISHED)
    cy.contains('Collaboratore E2E')
  })

  it('is not shown anyone else’s draft', () => {
    cy.visit('/chiese')

    cy.contains(PUBLISHED).should('exist')
    cy.contains(DRAFT).should('not.exist')
  })

  it('sees a feste route drawn as a list of stops', () => {
    cy.visit('/feste')
    cy.contains('a', 'Festa E2E pubblicata').click()

    cy.contains('h2', 'Il percorso')
    cy.contains('Tappa 1')
  })
})

describe('the reader, on a phone', () => {
  beforeEach(() => cy.viewport(375, 812))

  it('gets the sheet, and the places in it link to their cards', () => {
    cy.visit('/')

    cy.get('section[aria-label="Luoghi sulla mappa"]').within(() => {
      cy.contains('a', PUBLISHED).click()
    })

    cy.contains('h1', PUBLISHED)
  })
})
