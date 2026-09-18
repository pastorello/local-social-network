// The guest's journey (spec itinerari.md I6/I7): the one address on a B&B's
// card, an intent, a tour, then the tour followed one stop at a time. Runs on
// `seed_e2e`'s "Itinerario E2E", a percorso through the published church and
// the published feast, under "Scoprire la città".
const TOUR = 'Itinerario E2E'
const CHIESA = 'Chiesa E2E pubblicata'
const FESTA = 'Festa E2E pubblicata'

describe('a guest following a curated tour', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('goes from the welcome page to a tour, and walks it stop by stop', () => {
    cy.visit('/benvenuto')
    cy.contains('h1', 'Che cosa ti va di fare?')
    cy.contains('a', 'Scoprire la città').click()

    cy.location('search').should('contain', 'intento=citta')
    cy.contains('a', TOUR).click()

    cy.contains('h1', TOUR)
    cy.get('ol').within(() => {
      cy.get('li').eq(0).should('contain', CHIESA)
      cy.get('li').eq(1).should('contain', FESTA)
    })
    cy.contains('button', 'Inizia il tour').click()

    cy.location('search').should('eq', '?tappa=1')
    cy.contains('Tappa 1 di 2')
    cy.contains('h1', CHIESA)
    cy.contains('button', 'Tappa successiva').click()

    // The second leg starts from the first stop, on foot, in Google Maps —
    // a link, nothing of Google's loaded on the page.
    cy.contains('h1', FESTA)
    cy.contains('Si segue la processione.')
    cy.contains('a', 'Come arrivarci')
      .should('have.attr', 'target', '_blank')
      .and('have.attr', 'href')
      .and('match', /^https:\/\/www\.google\.com\/maps\/dir\/\?.*origin=.*travelmode=walking/)

    // The position is in the URL, so a reload lands on the same stop.
    cy.reload()
    cy.contains('h1', FESTA)
    cy.contains('button', 'Torna all’itinerario').click()
    cy.contains('h1', TOUR)
  })

  it('reaches the tours from the menu', () => {
    cy.visit('/')
    cy.get('nav[aria-label="Principale"]').contains('a', 'Itinerari').click()
    cy.contains('h1', 'Itinerari')
    cy.contains('a', TOUR).should('exist')
  })
})
