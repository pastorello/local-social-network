// The guest's journey (spec itinerari.md I6/I7): the one address on a B&B's
// card, an intent, a tour, then the tour followed one stop at a time to its
// end. Runs on `seed_e2e`'s "Itinerario E2E", a percorso through the published
// church, the published feast and the published beach in Serapo, under
// "Scoprire la città".
const TOUR = 'Itinerario E2E'
const CHIESA = 'Chiesa E2E pubblicata'
const FESTA = 'Festa E2E pubblicata'
const LUOGO = 'Luogo E2E pubblicato'
// The panel's eyebrow (review PR-23): which tour, and which stop of it.
const WHERE = 'nav[aria-label="Dove sei"]'

describe('a guest following a curated tour', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('goes from the welcome page to a tour, and walks it stop by stop to the end', () => {
    cy.visit('/benvenuto')
    cy.contains('h1', 'Che cosa ti va di fare?')
    cy.contains('a', 'Scoprire la città').click()

    cy.location('search').should('contain', 'intento=citta')
    cy.contains('a', TOUR).click()

    cy.contains('h1', TOUR)
    cy.title().should('eq', `${TOUR} · Itinerari · Vivere Gaeta`)
    cy.get('ol').within(() => {
      cy.get('li').eq(0).should('contain', CHIESA)
      cy.get('li').eq(1).should('contain', FESTA)
      cy.get('li').eq(2).should('contain', LUOGO)
    })
    // Offered before the stops and again under them (review PR-7).
    cy.contains('button', 'Inizia il tour').click()

    // Stop 1: the stop tells itself — the opening of its card, and what is
    // known about getting in, with the day it was reported (ADR-0008).
    cy.location('search').should('eq', '?tappa=1')
    cy.get(WHERE).should('contain.text', TOUR).and('contain.text', 'Tappa 1 di 3')
    cy.contains('h1', CHIESA)
    cy.title().should('eq', `${CHIESA} · ${TOUR} · Vivere Gaeta`)
    cy.contains(`Testo di ${CHIESA}.`)
    cy.contains('h2', 'Visitare')
    cy.contains('Domenica alle 11, per la messa.')
    cy.contains('Orari segnalati il')
    cy.get('nav[aria-label="Tappe del tour"]').should('not.contain', 'Precedente')
    cy.contains('button', 'Tappa successiva').click()

    // Stop 2: the leg starts from the first stop, on foot, in Google Maps —
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
    cy.contains('button', 'Tappa successiva').click()

    // Stop 3, the last: how to reach it, and no "next" — what comes after the
    // tour instead, each way only if something is behind it. There is one
    // tour, so no "another"; the beach is in Serapo; a ricetta is published.
    cy.get(WHERE).should('contain.text', 'Tappa 3 di 3')
    cy.contains('h1', LUOGO)
    cy.contains('A piedi dal lungomare.')
    cy.contains('button', 'Tappa successiva').should('not.exist')
    cy.contains('h2', 'Hai finito il giro')
      .parent()
      .within(() => {
        cy.get('a').should('have.length', 2)
        cy.contains('a', 'Un altro itinerario').should('not.exist')
        cy.contains('a', 'Da mangiare').should('have.attr', 'href', '/ricette')
        cy.contains('a', 'Cosa c’è qui intorno')
          .should('have.attr', 'href', '/cosa-fare?zona=serapo')
          .click()
      })

    cy.contains('h1', 'Cosa si può fare qui')
    cy.location('search').should('eq', '?zona=serapo')
    cy.contains('a', LUOGO)
  })

  it('goes back a stop, and back to the tour', () => {
    cy.visit('/itinerari')
    cy.contains('a', TOUR).click()
    cy.contains('button', 'Inizia il tour').click()
    cy.contains('button', 'Tappa successiva').click()

    cy.contains('button', 'Precedente').click()
    cy.location('search').should('eq', '?tappa=1')
    cy.contains('h1', CHIESA)
    cy.contains('button', 'Torna all’itinerario').click()
    cy.contains('h1', TOUR)
  })

  // Review PR-7 (M-08): on a phone the stop reads without a line broken in two
  // — the tour and the position in one row over the title (review PR-23), the
  // two ways out side by side, and "Tappa successiva" one line across the
  // whole panel.
  it('reads a stop on a phone without broken lines', () => {
    cy.viewport(390, 844)
    cy.visit('/itinerari')
    cy.contains('a', TOUR).click()
    cy.contains('button', 'Inizia il tour').click()

    // One row of the eyebrow is a thumb's 44px.
    cy.get(WHERE)
      .should('contain.text', 'Tappa 1 di 3')
      .invoke('outerHeight')
      .should('be.lessThan', 48)
    cy.contains('a', 'Come arrivarci').then(($directions) => {
      cy.contains('a', 'Leggi la scheda').should(($card) => {
        expect($card.offset()!.top).to.equal($directions.offset()!.top)
      })
    })
    cy.contains(`Testo di ${CHIESA}.`)
    cy.contains('button', 'Tappa successiva').invoke('outerHeight').should('be.lessThan', 56)
  })

  it('reaches the tours from the menu', () => {
    cy.visit('/')
    cy.get('nav[aria-label="Principale"]').contains('a', 'Itinerari').click()
    cy.contains('h1', 'Itinerari')
    cy.contains('a', TOUR).should('exist')
  })
})
