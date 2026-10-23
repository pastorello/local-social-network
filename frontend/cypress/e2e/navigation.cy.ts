// Close, up, back (review PR-22, spec/design.md "Close, up, back"): the close
// button, Escape and the veil go to the map from anywhere — a page four steps
// deep, a link opened cold, a tour's third stop — and the map stays where it
// was; the browser's Back is left to walk the history. Runs on seed_e2e: the
// published church, and "Itinerario E2E", a percorso of three stops.
const CHIESA = 'Chiesa E2E pubblicata'
const TOUR = 'Itinerario E2E'
const FESTA = 'Festa E2E pubblicata'
const LUOGO = 'Luogo E2E pubblicato'

const CLOSE = 'button[aria-label="Chiudi e torna alla mappa"]'
const PANEL = 'main section[tabindex="-1"]'
// The panel's eyebrow (review PR-23), whose first link is up. Its words are
// set in capitals by the stylesheet, so they are matched without case.
const WHERE = 'nav[aria-label="Dove sei"]'
const up = (label: string) => cy.get(WHERE).contains('a', label, { matchCase: false })
const CARD_PATH = /^\/chiese\/[0-9a-f-]+$/

interface View {
  lat: number
  lng: number
  zoom: number
}

// Where the map is, as the store keeps it (stores/map.ts `view`) — read
// through the app's own Pinia, since the map is Leaflet's and not in the DOM.
const storedView = () =>
  cy.get('#app').its('0.__vue_app__.config.globalProperties.$pinia.state.value.map.view')

// Where the map is once it has stopped: the same view, read again and again
// for a whole second. Leaflet's animated fit takes a quarter of one, so a
// frame is done by then — and a close that moved the map would have moved it.
const heldView = () => {
  let last: View | null = null
  let since = 0
  return storedView()
    .should((view: View) => {
      if (JSON.stringify(view) !== JSON.stringify(last)) {
        last = { ...view }
        since = Date.now()
      }
      expect(Date.now() - since, 'the map has stood still for a second').to.be.at.least(1000)
    })
    .then(() => last!)
}

// The map, and no page over it.
const onTheMap = () => {
  cy.location('pathname').should('eq', '/')
  cy.get(PANEL).should('not.exist')
  // The home's chrome is shown again — displayed, not necessarily in view: its
  // column keeps the scroll that brought the opening link into view (D15).
  cy.contains('h1', 'La mappa di Gaeta').should(($h1) => {
    expect($h1[0]!.getClientRects().length).to.be.greaterThan(0)
  })
  cy.get('.leaflet-container').closest('[inert]').should('not.exist')
}

const menu = (label: string) => cy.get('nav[aria-label="Principale"]').contains('a', label).click()

const openChurchFromTheMap = () => {
  cy.visit('/')
  cy.get('ul[aria-label="Luoghi sulla mappa"]').contains('a', CHIESA).click()
  cy.location('pathname').should('match', CARD_PATH)
  cy.contains('h1', CHIESA)
}

describe('close, up, back (review PR-22)', () => {
  beforeEach(() => cy.viewport(1280, 800))

  // (a) N-01: four pages deep, one press shows the map — and Back still walks
  // every step, the map the close pushed included.
  it('closes onto the map in one press from four pages deep, and leaves Back the history', () => {
    openChurchFromTheMap()
    cy.location('pathname').then((card) => {
      menu('Itinerari')
      cy.location('pathname').should('eq', '/itinerari')
      menu('Cosa fare')
      cy.location('pathname').should('eq', '/cosa-fare')
      menu('Il progetto')
      cy.location('pathname').should('eq', '/il-progetto')

      cy.get(CLOSE).click()
      onTheMap()

      cy.go('back')
      cy.location('pathname').should('eq', '/il-progetto')
      cy.go('back')
      cy.location('pathname').should('eq', '/cosa-fare')
      cy.go('back')
      cy.location('pathname').should('eq', '/itinerari')
      cy.go('back')
      cy.location('pathname').should('eq', card)
      cy.contains('h1', CHIESA)
    })
  })

  // (b) A card opened from outside — the QR, a search, a new tab: the close
  // button has nothing behind it in the app, and still lands on the map.
  it('closes a card opened cold onto the map, not out of the site', () => {
    cy.visit('/chiese')
    cy.contains('a', CHIESA)
      .invoke('attr', 'href')
      .then((href) => cy.visit(href!))
    cy.contains('h1', CHIESA)

    cy.get(CLOSE).click()
    onTheMap()
    cy.location('origin').should('eq', Cypress.config('baseUrl'))
  })

  // (c) N-06: `?tappa=N` is a step Back undoes; the close button closes the
  // whole tour, and the map stays on its last stop with every card back on it.
  it('closes the tour from its third stop, while Back walks the stops', () => {
    cy.visit('/itinerari')
    cy.contains('a', TOUR).click()
    // An open tour is drawn alone (design.md, 2026-09-19): no other card.
    cy.contains('h1', TOUR)
    cy.get('path.leaflet-interactive[stroke-width="2"]').should('not.exist')
    cy.contains('button', 'Inizia il tour').click()
    cy.contains('button', 'Tappa successiva').click()
    cy.contains('button', 'Tappa successiva').click()
    cy.location('search').should('eq', '?tappa=3')
    cy.contains('h1', LUOGO)

    cy.go('back')
    cy.location('search').should('eq', '?tappa=2')
    cy.contains('h1', FESTA)
    cy.go('forward')
    cy.location('search').should('eq', '?tappa=3')
    cy.contains('h1', LUOGO)
    // A stop is one place: the rest of the city stepped back behind it (D16).
    cy.get('path.leaflet-interactive[stroke-width="2"][stroke-opacity="0.4"]').should('exist')

    heldView().then((atTheLastStop) => {
      cy.get(CLOSE).click()
      onTheMap()
      cy.location('search').should('eq', '')
      // The tour is closed: every card is drawn again, at full strength.
      cy.get('path.leaflet-interactive[stroke-width="2"][stroke-opacity="1"]').should('exist')
      cy.get('path.leaflet-interactive[stroke-opacity="0.4"]').should('not.exist')
      heldView().should('deep.equal', atTheLastStop)
    })
  })

  // (d) Escape is the close button: onto the map, not one page back.
  it('closes on Escape as on the button — a card, and Il progetto opened from it', () => {
    cy.visit('/chiese')
    cy.contains('a', CHIESA).click()
    cy.location('pathname').should('match', CARD_PATH)
    cy.get(PANEL).trigger('keydown', { key: 'Escape' })
    onTheMap()

    cy.go('back')
    cy.location('pathname').should('match', CARD_PATH)
    menu('Il progetto')
    cy.location('pathname').should('eq', '/il-progetto')
    cy.get(PANEL).trigger('keydown', { key: 'Escape' })
    onTheMap()
  })

  // (e) D16 as amended: closing leaves the map where it is — the place the
  // card framed, at its zoom — and the reader's layers as they were. Nothing
  // flies back to Gaeta.
  it('leaves the map where the card put it, and the layers as they were', () => {
    cy.visit('/')
    cy.get('#layer-feste').uncheck()
    cy.get('ul[aria-label="Luoghi sulla mappa"]').contains('a', CHIESA).click()
    cy.contains('h1', CHIESA)
    // One place, at zoom 16 (review PR-5).
    storedView().should('have.property', 'zoom', 16)

    heldView().then((onTheCard) => {
      cy.get(CLOSE).click()
      onTheMap()
      heldView().should('deep.equal', onTheCard)
    })
    cy.get('#layer-feste').should('not.be.checked')
  })

  // Up (N-03): one level above, named after where it goes — and pushed, so
  // Back comes down again.
  it('goes up from a card to its list, from a stop to its tour, from a zone to Cosa fare', () => {
    cy.visit('/chiese')
    cy.contains('a', CHIESA).click()
    up('Chiese').click()
    cy.location('pathname').should('eq', '/chiese')
    cy.contains('h1', 'Chiese')
    cy.go('back')
    cy.location('pathname').should('match', CARD_PATH)

    cy.visit('/itinerari')
    cy.contains('a', TOUR).click()
    cy.contains('button', 'Inizia il tour').click()
    cy.contains('button', 'Tappa successiva').click()
    // A stop's way up is named after its own tour (review PR-23).
    up(TOUR).click()
    cy.location('search').should('eq', '')
    cy.contains('h1', TOUR)
    cy.focused().should('match', PANEL)
    up('Itinerari').click()
    cy.location('pathname').should('eq', '/itinerari')

    cy.visit('/cosa-fare?zona=porto-salvo')
    up('Cosa fare').click()
    cy.location('pathname').should('eq', '/cosa-fare')
    cy.location('search').should('eq', '')
    cy.focused().should('match', PANEL)
  })
})

// Where the reader is (review PR-23, N-02/N-04): the eyebrow over the page —
// up, and what the page is within it — the menu's item above the page marked
// current, and the window named after the page. Runs on seed_e2e: the church
// and the tour's first stop are in Porto Salvo, the tour is for «Scoprire la
// città».
describe('where the reader is (review PR-23)', () => {
  beforeEach(() => cy.viewport(1280, 800))

  const current = () => cy.get('nav[aria-label="Principale"] [aria-current="page"]')
  const eyebrowLinks = () =>
    cy
      .get(WHERE)
      .find('a')
      .then(($links) =>
        [...$links].map((link) => [link.textContent?.trim(), link.getAttribute('href')]),
      )

  it('on a card: its type and its zone, Esplora current, the card in the tab', () => {
    cy.visit('/chiese')
    cy.contains('a', CHIESA).click()
    cy.contains('h1', CHIESA)

    eyebrowLinks().should('deep.equal', [
      ['Chiese', '/chiese'],
      ['Porto Salvo', '/cosa-fare?zona=porto-salvo'],
    ])
    current().should('have.length', 1).and('contain.text', 'Esplora')
    cy.title().should('eq', `${CHIESA} · Chiese · Vivere Gaeta`)

    // The zone is a way to what else is there.
    cy.get(WHERE).contains('a', 'Porto Salvo', { matchCase: false }).click()
    cy.location('search').should('eq', '?zona=porto-salvo')
    cy.contains('h1', 'Cosa si può fare qui')
  })

  it('on a tour: «Itinerari» and its intent, Itinerari current', () => {
    cy.visit('/itinerari')
    cy.contains('a', TOUR).click()
    cy.contains('h1', TOUR)

    eyebrowLinks().should('deep.equal', [
      ['Itinerari', '/itinerari'],
      ['Scoprire la città', '/itinerari?intento=citta'],
    ])
    current().should('have.length', 1).and('contain.text', 'Itinerari')
  })

  it('on a chosen zone: «Cosa fare» and the zone, Cosa fare current', () => {
    cy.visit('/cosa-fare?zona=porto-salvo')
    cy.contains('h1', 'Cosa si può fare qui')

    eyebrowLinks().should('deep.equal', [['Cosa fare', '/cosa-fare']])
    cy.get(WHERE).should('contain.text', 'Porto Salvo')
    current().should('have.length', 1).and('contain.text', 'Cosa fare')
    cy.title().should('eq', 'Porto Salvo · Cosa fare · Vivere Gaeta')
  })

  it('on Il progetto: no eyebrow, nothing above it but the map, Il progetto current', () => {
    cy.visit('/il-progetto')
    cy.contains('h1', 'Il progetto')

    cy.get(WHERE).should('not.exist')
    current().should('have.length', 1).and('contain.text', 'Il progetto')
    cy.title().should('eq', 'Il progetto · Vivere Gaeta')
  })
})
