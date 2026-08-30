// The logged-out reader's journey (TD-04). Runs against the real API with the
// fixtures `python manage.py seed_e2e` creates — stubbing the API here would
// only test the stubs, and the things worth covering (a draft staying hidden,
// an overlay staying invisible) are precisely where the two sides could
// disagree.
const PUBLISHED = 'Chiesa E2E pubblicata'
const DRAFT = 'Chiesa E2E in bozza'

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
