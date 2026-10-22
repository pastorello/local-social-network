// The logged-out reader's journey (TD-04). Runs against the real API with the
// fixtures `python manage.py seed_e2e` creates — stubbing the API here would
// only test the stubs, and the things worth covering (a draft staying hidden,
// an overlay staying invisible) are precisely where the two sides could
// disagree.
const PUBLISHED = 'Chiesa E2E pubblicata'
const DRAFT = 'Chiesa E2E in bozza'

// The home's first words and its two other ways in (review of 2026-10-22,
// P-02/M-02). seed_e2e publishes a tour under «Scoprire la città» and a church
// in Porto Salvo, so both doors are open here.
const PRESENTATION = 'Gaeta raccontata da chi ci vive'
const TOURS_DOOR = 'Che cosa ti va di fare?'
const ZONES_DOOR = 'Cosa c’è in una zona'

// Read without scrolling: inside the window, and `be.visible` already says
// that no scrolling box (the column, the sheet) has clipped it.
const onScreen = ($el: JQuery<HTMLElement>) => {
  const rect = $el[0]!.getBoundingClientRect()
  expect(rect.top).to.be.at.least(0)
  expect(rect.bottom).to.be.at.most($el[0]!.ownerDocument.defaultView!.innerHeight)
}

// Where the map draws the cards a page hands it: every path of the card layers
// (pins, a procession's line and stops), as one box on screen.
const drawnBox = ($paths: JQuery<HTMLElement>) => {
  const boxes = [...$paths].map((path) => path.getBoundingClientRect())
  return {
    left: Math.min(...boxes.map((box) => box.left)),
    right: Math.max(...boxes.map((box) => box.right)),
    top: Math.min(...boxes.map((box) => box.top)),
    bottom: Math.max(...boxes.map((box) => box.bottom)),
  }
}
const headerBottom = ($el: JQuery<HTMLElement>) =>
  Number.parseFloat(
    getComputedStyle($el[0]!.ownerDocument.documentElement).getPropertyValue('--header-h'),
  )

// How the map is framed, read off its tiles (review PR-5): a tile's address
// names its zoom, column and row, and its box says where it is drawn, so Web
// Mercator gives the point on screen of any place. The tiles are the blank
// fixture (support/e2e.ts); only where they sit is read.
const TILE_ADDRESS = /\/(\d+)\/(\d+)\/(\d+)\.png$/
const tileView = ($tiles: JQuery<HTMLElement>) => {
  const tiles = [...$tiles]
    .map((tile) => ({ tile, address: TILE_ADDRESS.exec((tile as HTMLImageElement).src) }))
    .filter(({ address }) => address)
  expect(new Set(tiles.map(({ address }) => address![1])).size, 'one zoom on screen').to.equal(1)
  const [z, x, y] = tiles[0]!.address!.slice(1).map(Number) as [number, number, number]
  const box = tiles[0]!.tile.getBoundingClientRect()
  const world = 256 * 2 ** z
  return {
    zoom: z,
    at: ({ lat, lng }: { lat: number; lng: number }) => {
      const sin = Math.sin((lat * Math.PI) / 180)
      return {
        x: box.left + ((lng + 180) / 360) * world - x * 256,
        y: box.top + (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world - y * 256,
      }
    },
  }
}
// Gaeta's ends, as seed_demo places them: the Flacca's last beach, the
// mountain, the medieval quarter's point.
const SANT_AGOSTINO = { lat: 41.2337, lng: 13.4946 }
const MONTE_ORLANDO = { lat: 41.2071, lng: 13.5767 }
const GAETA_MEDIEVALE = { lat: 41.2086, lng: 13.5866 }

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

  it('is told what the site is and offered its two other ways in', () => {
    cy.visit('/')

    cy.contains('p', PRESENTATION).should('be.visible').and(onScreen)
    cy.contains('a', TOURS_DOOR)
      .should('be.visible')
      .and(onScreen)
      .and('have.attr', 'href', '/benvenuto')
      .and('contain', 'Scoprire la città')
    cy.contains('a', ZONES_DOOR)
      .should('be.visible')
      .and(onScreen)
      .and('have.attr', 'href', '/cosa-fare')
      .and('contain', 'Porto Salvo')

    cy.contains('a', TOURS_DOOR).click()
    cy.contains('h1', TOURS_DOOR)
  })

  // ADR-0005 closed its map-widget deferral on the claim that the map's data
  // also reaches a reader as text. This is that claim, asserted: everything
  // the map draws is reachable without ever touching the map, through
  // "Luoghi sulla mappa". (A collaborator's reports have their own list,
  // "Segnalazioni sulla mappa", which v1-flows.cy.ts follows.)
  //
  // The keyboard half is asserted as *focusable real link*, not as a synthetic
  // Enter: Cypress's key events do not follow an anchor the way the browser
  // does, so pressing Enter here would prove nothing and passing it off as
  // keyboard operation would be worse than not testing it. An anchor with an
  // href that takes focus is operable by the platform's own guarantee; what is
  // worth testing is that such an anchor exists and points where it should.
  it('reaches everything the map draws without touching the map', () => {
    cy.visit('/')

    cy.get('ul[aria-label="Luoghi sulla mappa"]').contains('a', PUBLISHED).as('placeLink')
    cy.get('@placeLink').focus()
    cy.get('@placeLink').should('have.focus')
    cy.get('@placeLink')
      .should('have.attr', 'href')
      .and('match', /^\/chiese\/[0-9a-f-]+$/)
  })

  // Reports are a tool for the people working on the archive (decided
  // 2026-10-22, spec reports-and-polls.md R1). For a reader they are absent,
  // not hidden: no section, no layer, no request the API would refuse with a
  // 401 — and a report's own address asks for a login.
  it('is shown no reports, and a report’s address asks for a login', () => {
    cy.intercept('GET', '**/api/map/features/**').as('features')
    cy.intercept('GET', '**/api/reports/**').as('reports')
    cy.visit('/')
    cy.wait('@features')

    cy.get('ul[aria-label="Luoghi sulla mappa"]').contains('a', PUBLISHED).should('exist')
    cy.get('#layer-segnalazioni').should('not.exist')
    cy.contains(/Segnalazion|Segnala un problema|cittadini/).should('not.exist')
    cy.get('@reports.all').should('have.length', 0)

    cy.visit('/reports/00000000-0000-4000-8000-000000000000')
    cy.location('pathname').should('eq', '/login')
    cy.location('search').should('contain', 'redirect=')
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

    // ADR-0008: what is known about getting in, the hours with the day they
    // were reported — and never a claim that the church is open.
    cy.contains('h2', 'Visitare')
    cy.contains('Domenica alle 11, per la messa.')
    cy.contains(/Orari segnalati il \d{1,2} \w+ \d{4} — telefona per sicurezza\./)
    cy.get('a[href="tel:0771000000"]').should('contain', '0771 000000')
    // cosa-fare.md D7, for the reader who found the door shut.
    cy.contains('h2', 'Se la trovi chiusa')
  })

  // Review PR-3: the reader already in town is given the way there — a plain
  // link out to Google Maps built from the card's own pin, on foot, with
  // nothing of Google's loaded on the page.
  it('is given the way to a church, as a link out to Google Maps', () => {
    cy.visit('/chiese')
    cy.contains('a', PUBLISHED).click()

    cy.contains('h2', 'Dove si trova').parent().contains('a', 'Come arrivarci').as('directions')
    cy.get('@directions').should('contain', '(apre Google Maps)')
    cy.get('@directions').should('have.attr', 'target', '_blank')
    cy.get('@directions').should('have.attr', 'rel', 'noopener')
    cy.get('@directions')
      .should('have.attr', 'href')
      .and(
        'eq',
        'https://www.google.com/maps/dir/?api=1&destination=41.2172608%2C13.5625165&travelmode=walking',
      )
  })

  it('is not shown anyone else’s draft', () => {
    cy.visit('/chiese')

    cy.contains(PUBLISHED).should('exist')
    cy.contains(DRAFT).should('not.exist')
  })

  // The map under every page (design.md D13/D15/D16/D17): a card opens over
  // the map, the map shows the card's place, and closing the card gives the
  // reader back the map and their place in it.
  it('opens a card over the map, sees the map show it, and closes back onto the link', () => {
    cy.visit('/')

    cy.get('ul[aria-label="Luoghi sulla mappa"]').contains('a', PUBLISHED).as('placeLink')
    cy.get('@placeLink').focus()
    cy.get('@placeLink').click()

    cy.location('pathname').should('match', /^\/chiese\/[0-9a-f-]+$/)
    // The narrow panel, beside a map that stays usable — and focus inside it.
    cy.get('main section[tabindex="-1"]').should('have.focus').and('contain', PUBLISHED)
    cy.get('.leaflet-container').closest('[inert]').should('not.exist')
    // D16: the card's pin is drawn over everything else.
    cy.get('path.leaflet-interactive[stroke-width="3"]').should('have.length', 1)
    // Review PR-5 (L-05): one place, at zoom 16 — its streets, not a field.
    cy.get('img.leaflet-tile-loaded').should(($tiles) => {
      expect(tileView($tiles).zoom).to.equal(16)
    })

    cy.get('main section[tabindex="-1"]').trigger('keydown', { key: 'Escape' })

    cy.location('pathname').should('eq', '/')
    cy.focused().should('contain', PUBLISHED)
    cy.get('path.leaflet-interactive[stroke-width="3"]').should('not.exist')
  })

  it('reads a list in a wide panel, over a map it cannot reach', () => {
    cy.visit('/chiese')

    cy.contains('h1', 'Chiese')
    // D17: the veil, and a map that is out of the tab order while veiled.
    cy.get('.leaflet-container').closest('[inert]').should('exist')
    cy.get('button[aria-label="Chiudi e torna alla mappa"]').click()
    cy.location('pathname').should('eq', '/')
  })

  // Review PR-4 (P-04): a chosen zone is framed in the part of the map the
  // panel leaves free — not left wherever the map was, half under the panel.
  // seed_e2e's Porto Salvo holds the published church and the feast's route.
  it('sees the zone it chose framed beside the panel', () => {
    cy.visit('/cosa-fare?zona=porto-salvo')
    cy.get('main section[tabindex="-1"]').contains('a', PUBLISHED)

    cy.get('main section[tabindex="-1"]').then(($panel) => {
      const panelLeft = $panel[0]!.getBoundingClientRect().left
      cy.get('.leaflet-overlay-pane path.leaflet-interactive').should(($paths) => {
        const box = drawnBox($paths)
        const viewport = $paths[0]!.ownerDocument.defaultView!
        expect(box.left).to.be.at.least(0)
        expect(box.right).to.be.at.most(panelLeft)
        expect(box.top).to.be.at.least(headerBottom($paths))
        expect(box.bottom).to.be.at.most(viewport.innerHeight)
        // Centred in that free part: the city's centre, where the church is,
        // would put it 290px further right.
        expect(Math.abs((box.left + box.right) / 2 - panelLeft / 2)).to.be.below(16)
      })
    })
  })

  it('sees a feste route drawn as a list of stops', () => {
    cy.visit('/feste')
    cy.contains('a', 'Festa E2E pubblicata').click()

    cy.contains('h2', 'Il percorso')
    cy.contains('Tappa 1')
    // Review PR-3: a feast is joined where it sets off — its route's first stop.
    cy.contains('a', 'Portami alla partenza')
      .should('have.attr', 'href')
      .and('contain', 'destination=41.2172608%2C13.5625165')
  })
})

describe('the reader, on a phone', () => {
  beforeEach(() => cy.viewport(375, 812))

  // M-02: the sheet opens on what the site is and its two doors — at its
  // first stop, before anyone drags it — with the places after them.
  it('opens the sheet on what the site is and its two other ways in', () => {
    cy.visit('/')

    cy.get('section[aria-label="La mappa di Gaeta"]').within(() => {
      cy.contains('p', PRESENTATION).should('be.visible').and(onScreen)
      cy.contains('a', TOURS_DOOR).should('be.visible').and(onScreen)
      cy.contains('a', ZONES_DOOR)
        .should('be.visible')
        .and(onScreen)
        .and('have.attr', 'href', '/cosa-fare')
      cy.contains('h2', 'Luoghi sulla mappa')
    })
  })

  // Review PR-5 (M-01): the sheet covers the bottom of the screen, so the map
  // frames Gaeta — the Flacca's beaches to Monte Orlando — in the band between
  // the menu and the sheet, rather than centring it on the whole screen.
  it('sees all of Gaeta between the menu and the sheet', () => {
    cy.visit('/')

    cy.get('section[aria-label="La mappa di Gaeta"]').then(($sheet) => {
      const sheetTop = $sheet[0]!.getBoundingClientRect().top
      cy.get('img.leaflet-tile-loaded').should(($tiles) => {
        const view = tileView($tiles)
        const width = $tiles[0]!.ownerDocument.defaultView!.innerWidth
        for (const place of [SANT_AGOSTINO, MONTE_ORLANDO, GAETA_MEDIEVALE]) {
          const { x, y } = view.at(place)
          expect(x).to.be.within(0, width)
          expect(y).to.be.within(headerBottom($tiles), sheetTop)
        }
      })
    })
  })

  it('gets the sheet, and the places in it link to their cards', () => {
    cy.visit('/')

    cy.get('section[aria-label="La mappa di Gaeta"]').within(() => {
      // No reports in the reader's sheet (R1, 2026-10-22).
      cy.contains(/Segnalazion|Segnala un problema/).should('not.exist')
      cy.contains('a', PUBLISHED).click()
    })

    cy.contains('h1', PUBLISHED)
  })

  // design.md D18: a card with a place opens under a strip of the map, the
  // same map, already on the place; enlarging it is a step Back undoes.
  it('reads a card under a strip of the map, and enlarges the map and comes back', () => {
    cy.visit('/')
    cy.get('section[aria-label="La mappa di Gaeta"]').within(() => {
      cy.contains('a', PUBLISHED).click()
    })

    cy.contains('h1', PUBLISHED)
    // The map is in view above the card, so it is not inert, and the card
    // keeps no map of its own.
    cy.get('.leaflet-container').should('have.length', 1)
    cy.get('.leaflet-container').closest('[inert]').should('not.exist')

    // Review PR-5 (L-05, M-04): the place is in the strip at zoom 16, with its
    // streets round it, and the strip's button sits inside the strip's
    // bottom-right corner, 12px in, rather than on the article's edge.
    cy.get('main section[tabindex="-1"]').then(($panel) => {
      const panelTop = $panel[0]!.getBoundingClientRect().top
      cy.get('img.leaflet-tile-loaded').should(($tiles) => {
        expect(tileView($tiles).zoom).to.equal(16)
      })
      cy.get('path.leaflet-interactive[stroke-width="3"]').should(($pin) => {
        const pin = $pin[0]!.getBoundingClientRect()
        expect(pin.top).to.be.at.least(headerBottom($pin))
        expect(pin.bottom).to.be.at.most(panelTop)
      })
      cy.contains('button', 'Allarga la mappa').should(($button) => {
        const button = $button[0]!.getBoundingClientRect()
        expect(panelTop - button.bottom).to.be.closeTo(12, 0.5)
        expect($button[0]!.ownerDocument.defaultView!.innerWidth - button.right).to.be.closeTo(
          12,
          0.5,
        )
      })
    })

    // The card's «Dove si trova» offers the same step as the strip's button.
    cy.contains('a', 'Allarga la mappa').should('have.attr', 'href').and('contain', 'mappa=1')
    cy.contains('button', 'Allarga la mappa').click()
    cy.location('search').should('eq', '?mappa=1')
    cy.contains('h1', PUBLISHED).should('not.be.visible')
    cy.focused().should('contain', 'Torna alla scheda')

    cy.go('back')
    cy.location('search').should('eq', '')
    cy.contains('h1', PUBLISHED).should('be.visible')
  })

  // Review PR-4 (M-07): on a phone a chosen zone is framed in the strip
  // above the page, the other zones step aside for it, and the results start
  // on the first screen of the panel.
  it('sees the zone it chose in the strip, and its places without scrolling past the zones', () => {
    cy.visit('/cosa-fare?zona=porto-salvo')
    cy.get('main section[tabindex="-1"]').contains('a', PUBLISHED)

    cy.get('main section[tabindex="-1"]').then(($panel) => {
      const panelTop = $panel[0]!.getBoundingClientRect().top
      cy.get('.leaflet-overlay-pane path.leaflet-interactive').should(($paths) => {
        const box = drawnBox($paths)
        expect(box.top).to.be.at.least(headerBottom($paths))
        expect(box.bottom).to.be.at.most(panelTop)
      })
      cy.wrap($panel)
        .contains('a', PUBLISHED)
        .should(($link) => {
          expect($link[0]!.getBoundingClientRect().top - panelTop).to.be.at.most(420)
        })
    })

    cy.get('nav[aria-label="Zone"] a').should('have.length', 1).and('contain', 'Porto Salvo')
    cy.contains('button', 'Cambia zona').should('have.attr', 'aria-expanded', 'false').click()
    cy.contains('button', 'Cambia zona').should('have.attr', 'aria-expanded', 'true')
    cy.get('nav[aria-label="Zone"] a').should('have.length.greaterThan', 1)
    cy.get('nav[aria-label="Zone"]').contains('a', 'Gaeta Medievale').click()
    cy.location('search').should('eq', '?zona=gaeta-medievale')
    cy.get('nav[aria-label="Zone"] a').should('have.length', 1).and('contain', 'Gaeta Medievale')
  })
})
