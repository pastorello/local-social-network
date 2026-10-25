// The logged-out reader's journey (TD-04). Runs against the real API with the
// fixtures `python manage.py seed_e2e` creates — stubbing the API here would
// only test the stubs, and the things worth covering (a draft staying hidden,
// an overlay staying invisible) are precisely where the two sides could
// disagree.
const PUBLISHED = 'Chiesa E2E pubblicata'
const DRAFT = 'Chiesa E2E in bozza'
// Sold nowhere: a ricetta with no place on the map (review PR-10).
const RICETTA = 'Ricetta E2E pubblicata'
// On Serapo's beach, with a sentence of how to get there (review PR-24).
const PLACE = 'Luogo E2E pubblicato'
// A bar on the same beach, with its hours (ADR-0010).
const BUSINESS = 'Attività E2E pubblicata'

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
// «Condividi» (review PR-16): the browser's two ways, as a test wants them. A
// stub, not the real clipboard: what is checked is what the page hands over,
// and a real clipboard asks the machine running the suite for permission.
const withoutShareSheet = (win: Cypress.AUTWindow) => {
  Object.defineProperty(win.navigator, 'share', { value: undefined, configurable: true })
  Object.defineProperty(win.navigator, 'clipboard', {
    value: { writeText: cy.stub().resolves().as('copy') },
    configurable: true,
  })
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
    // Review PR-23 (N-04): the tab says which card, and of what.
    cy.title().should('eq', `${PUBLISHED} · Chiese · Vivere Gaeta`)

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

  // Review PR-24 (proposal 2, approved 2026-10-23): the way there opens the
  // card, before its text, as a line rather than a button — and «Dove si
  // trova» still gives it at the end.
  it('opens a place on how to get there, before its text', () => {
    cy.visit('/chiese')
    cy.contains('a', PUBLISHED).click()
    cy.contains('h1', PUBLISHED)

    cy.get('article .prose').prev('p').as('where')
    cy.get('@where').should('contain.text', 'Come arrivarci (apre Google Maps)')
    cy.get('@where')
      .find('a')
      .should('have.attr', 'target', '_blank')
      .and('have.attr', 'rel', 'noopener')
      .and(
        'have.attr',
        'href',
        'https://www.google.com/maps/dir/?api=1&destination=41.2172608%2C13.5625165&travelmode=walking',
      )

    // A luogo's line says how one gets there, in its author's first sentence.
    cy.visit('/luoghi')
    cy.contains('a', PLACE).click()
    cy.contains('h1', PLACE)
    cy.get('article .prose').prev('p').as('where')
    cy.get('@where').should('contain.text', 'A piedi dal lungomare.')
    cy.contains('h2', 'Dove si trova')
      .parent()
      .contains('a', 'Come arrivarci')
      .invoke('attr', 'href')
      .then((href) => cy.get('@where').find('a').should('have.attr', 'href', href))
  })

  // ADR-0010 (built 2026-10-25, review PR-26): a business is a type of its
  // own — in the menu, on the map in a layer of its own with its row in the
  // text list, on a page that prints its order and why it is there, and on
  // «Cosa si può fare qui» under «Bere». Its hours carry their date, and
  // nothing says it is open.
  it('finds a business from the menu, the map and its zone, never told it is open', () => {
    cy.visit('/')
    cy.get('#layer-attivita').should('be.checked')
    cy.get('label[for="layer-attivita"]').should('contain', 'Attività')
    cy.get('ul[aria-label="Luoghi sulla mappa"]').contains('a', BUSINESS)

    cy.contains('button', 'Esplora').click()
    cy.contains('[role="menuitem"]', 'Attività').click()
    cy.location('pathname').should('eq', '/attivita')
    cy.contains('h1', 'Attività')
    cy.contains('In ordine alfabetico.')
    cy.contains('nessuna paga per esserci')
    cy.get('nav[aria-label="Filtra attività per tipo"]').contains('a', 'Dove si beve')

    cy.contains('a', BUSINESS).click()
    cy.contains('h1', BUSINESS)
    cy.title().should('eq', `${BUSINESS} · Attività · Vivere Gaeta`)
    cy.get('article .prose').prev('p').should('contain.text', 'Sul lungomare')
    cy.contains('h2', 'Orari')
    cy.contains('Tutti i giorni dalle 7 a mezzanotte.')
    cy.contains(/Orari segnalati il \d{1,2} \w+ \d{4}/)
    cy.contains('h2', 'Visitare').should('not.exist')
    cy.get('article')
      .invoke('text')
      .should('not.match', /\baperto\b|\baperta\b/i)

    cy.visit('/cosa-fare?zona=serapo')
    cy.contains('h2', 'Bere').parents('section').first().contains('a', BUSINESS)
  })

  // Review PR-16 (P-11): a desktop browser has no share sheet, so «Condividi»
  // copies the card's own address — and the reader is told it did.
  it('copies a card’s own address to send it on, and is told so', () => {
    cy.visit('/chiese')
    cy.contains('a', PUBLISHED).click()
    cy.contains('h1', PUBLISHED)
    cy.window().then(withoutShareSheet)

    cy.contains('button', 'Condividi').click()
    cy.contains('[role="status"]', 'Link copiato')
    cy.location().then(({ origin, pathname }) => {
      cy.get('@copy').should('have.been.calledOnceWith', `${origin}${pathname}`)
    })
  })

  it('is not shown anyone else’s draft', () => {
    cy.visit('/chiese')

    cy.contains(PUBLISHED).should('exist')
    cy.contains(DRAFT).should('not.exist')
  })

  // The map under every page (design.md D13/D15/D16/D17): a card opens over
  // the map, the map shows the card's place, and closing the card gives the
  // reader back the map — still on that place (review PR-22) — and the link
  // that opened it.
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

  // Review PR-15 (L-02, M-03): on the home the top-left corner is the floating
  // column's, so the zoom buttons go to the bottom-right, by the credit —
  // OpenStreetMap's, and nothing before it. Beside a card they are top-left.
  it('finds the zoom by the credit on the home, out of the column’s way, and top-left beside a card', () => {
    cy.viewport(1440, 800)
    cy.visit('/')

    cy.get('.leaflet-control-attribution')
      .should('have.text', '© OpenStreetMap')
      .find('a')
      .should('have.attr', 'href', 'https://www.openstreetmap.org/copyright')
    cy.contains('h1', 'La mappa di Gaeta')
      .closest('.overflow-y-auto')
      .then(($column) => {
        const column = $column[0]!.getBoundingClientRect()
        cy.get('.leaflet-control-zoom').should(($zoom) => {
          const zoom = $zoom[0]!.getBoundingClientRect()
          const doc = $zoom[0]!.ownerDocument
          const credit = doc.querySelector('.leaflet-control-attribution')!.getBoundingClientRect()
          expect(zoom.left - column.right).to.be.greaterThan(600)
          expect(doc.defaultView!.innerWidth - zoom.right).to.be.closeTo(10, 1)
          expect(zoom.bottom).to.be.at.most(credit.top)
        })
      })

    cy.get('ul[aria-label="Luoghi sulla mappa"]').contains('a', PUBLISHED).click()
    cy.contains('h1', PUBLISHED)
    cy.get('.leaflet-control-zoom').should(($zoom) => {
      const zoom = $zoom[0]!.getBoundingClientRect()
      expect(zoom.left).to.be.closeTo(10, 1)
      expect(zoom.top).to.be.at.least(headerBottom($zoom))
    })
  })

  // Review PR-10 (P-09): the card decides its panel, not its type. The church
  // above opens narrow beside its pin; a ricetta sold nowhere opens like a
  // book, wide over a veiled map it has nothing to show on — and is born that
  // way, never drawn narrow first and widened in front of the reader.
  it('reads a card without a place in a wide panel, over a veiled map', () => {
    cy.visit('/ricette')
    cy.contains('h1', 'Ricette')
    // Every width the panel is drawn at from the list onwards.
    const widths: number[] = []
    cy.get('main section[tabindex="-1"]').then(($panel) => {
      const win = $panel[0]!.ownerDocument.defaultView!
      new win.ResizeObserver((entries) => {
        for (const entry of entries) widths.push(Math.round(entry.contentRect.width))
      }).observe($panel[0]!)
    })

    cy.contains('a', RICETTA).click()

    cy.contains('h1', RICETTA)
    cy.get('.leaflet-container').closest('[inert]').should('exist')
    cy.contains('a', 'Elenco ·').should('not.exist')
    cy.get('main section[tabindex="-1"]').should(($panel) => {
      const panel = $panel[0]!.getBoundingClientRect()
      const middle = $panel[0]!.ownerDocument.defaultView!.innerWidth / 2
      expect(panel.left + panel.width / 2).to.be.closeTo(middle, 1)
    })
    cy.wrap(widths).should((seen) => {
      expect(new Set(seen).size, `the panel's widths: ${seen.join(', ')}`).to.equal(1)
    })
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

  // Review PR-20: «Dove sei?» — the guest who does not know the zones' names
  // names where they stand instead, from the keyboard alone: type, the arrows,
  // Enter, Escape, focus never leaving the field. The names are the archive's
  // own (maps/migrations/0008), matched in the browser.
  it('finds its zone by the name of where it stands, from the keyboard', () => {
    cy.viewport(1280, 800)
    cy.visit('/cosa-fare')
    cy.get('nav[aria-label="Zone"]').contains('a', 'Porto Salvo')
    cy.get('main input[role="combobox"]').as('field').focus()

    cy.get('@field').type('borgo')
    cy.get('@field').should('have.attr', 'aria-expanded', 'true')
    cy.get('main [role="option"][aria-selected="true"]').should('contain', 'Il Borgo')
    cy.get('@field').type('{enter}')
    cy.location('search').should('eq', '?zona=porto-salvo')
    cy.contains('Sei al Borgo: ti mostriamo Porto Salvo.')
    cy.get('main section[tabindex="-1"]').contains('a', PUBLISHED)
    cy.focused().should('have.attr', 'role', 'combobox')

    // «ca» is the castle, the cathedral, Corso Cavour: the arrows walk them.
    cy.get('@field').clear()
    cy.get('@field').type('ca{downarrow}')
    cy.get('main [role="option"][aria-selected="true"]').should('contain', 'La Cattedrale')
    cy.get('@field').type('{enter}')
    cy.location('search').should('eq', '?zona=gaeta-medievale')
    cy.contains('Sei alla Cattedrale: ti mostriamo Gaeta Medievale.')

    // A name nobody listed changes nothing, and says where to go instead.
    cy.get('@field').clear()
    cy.get('@field').type('xyz{enter}')
    cy.location('search').should('eq', '?zona=gaeta-medievale')
    cy.contains('Non conosciamo questo posto: scegli una zona qui sotto.')

    // Gaeta has two harbours, in two zones; the author decided on 2026-10-24
    // (maps/migrations/0009) that «il porto» is the marina, in Porto Salvo,
    // and «il molo» the pier of Santa Maria, in Gaeta Medievale.
    cy.get('@field').clear()
    cy.get('@field').type('porto{enter}')
    cy.location('search').should('eq', '?zona=porto-salvo')
    cy.contains('Sei al porto: ti mostriamo Porto Salvo.')
    cy.get('@field').clear()
    cy.get('@field').type('al molo{enter}')
    cy.location('search').should('eq', '?zona=gaeta-medievale')
    cy.contains('Sei al molo: ti mostriamo Gaeta Medievale.')

    // Escape closes the list and leaves the page where it is.
    cy.get('@field').clear()
    cy.get('@field').type('s')
    cy.get('@field').should('have.attr', 'aria-expanded', 'true')
    cy.get('@field').type('{esc}')
    cy.get('@field').should('have.attr', 'aria-expanded', 'false')
    cy.get('main [role="listbox"]').should('not.be.visible')
    cy.location('pathname').should('eq', '/cosa-fare')
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

  // Review PR-15 (M-03): no text of the map rides the sheet's edge — the
  // credit, short, sits under «Livelli», lined up with it.
  it('reads the map’s credit under «Livelli», clear of the sheet', () => {
    cy.viewport(390, 720)
    cy.visit('/')

    cy.contains('button', 'Livelli').then(($layers) => {
      const layers = $layers[0]!.getBoundingClientRect()
      cy.get('.leaflet-control-attribution')
        .should('have.text', '© OpenStreetMap')
        .and(($credit) => {
          const credit = $credit[0]!.getBoundingClientRect()
          const sheet = $credit[0]!.ownerDocument.querySelector(
            'section[aria-label="La mappa di Gaeta"]',
          )!
          expect(credit.top).to.be.at.least(layers.bottom)
          expect(credit.top - layers.bottom).to.be.at.most(12)
          expect(credit.right).to.be.closeTo(layers.right, 1)
          expect(credit.bottom).to.be.lessThan(sheet.getBoundingClientRect().top)
        })
    })
  })

  // Review PR-15 (M-11): a 36 × 4px bar did not say that it drags. It is a
  // 44px target the keyboard reaches, named for the drag, and the first time
  // in a session a line under it says so — until the reader drags.
  it('is told the sheet’s handle drags, once a session, until it does', () => {
    const HINT = 'Trascina per vedere più mappa'
    const pointer = (clientY: number) => ({
      eventConstructor: 'PointerEvent',
      pointerId: 1,
      clientY,
    })
    cy.viewport(390, 720)
    cy.visit('/')

    cy.get('section[aria-label="La mappa di Gaeta"]').as('sheet')
    cy.get('@sheet').find(`button[aria-label="${HINT}"]`).as('handle')
    cy.get('@handle').should(($handle) => {
      expect($handle[0]!.getBoundingClientRect().height).to.be.at.least(44)
    })
    cy.get('@handle').focus()
    cy.get('@handle').should('have.focus')
    cy.get('@sheet').contains('p', HINT).should('be.visible')

    // Pulled down to the lowest stop.
    cy.get('@handle').then(($handle) => {
      const y = $handle[0]!.getBoundingClientRect().top + 20
      cy.wrap($handle).trigger('pointerdown', pointer(y))
      cy.wrap($handle).trigger('pointermove', pointer(y + 250))
      cy.wrap($handle).trigger('pointerup', pointer(y + 250))
    })
    cy.get('@sheet').contains('p', HINT).should('not.exist')
    // There the sheet shows the first line of the home, and nothing over it.
    cy.get('@sheet').contains('p', PRESENTATION).should('be.visible').and(onScreen)

    // Not again in this session.
    cy.reload()
    cy.contains('a', TOURS_DOOR)
    cy.get('section[aria-label="La mappa di Gaeta"]').contains('p', HINT).should('not.exist')
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

  // Review PR-24: on a phone the line is on the card's first screen, under
  // the strip, and wraps before its link rather than inside it.
  it('reads how to get to a place on the card’s first screen, its link whole', () => {
    cy.visit('/luoghi')
    cy.contains('a', PLACE).click()
    cy.contains('h1', PLACE)

    cy.get('article .prose').prev('p').should('contain.text', 'A piedi dal lungomare.')
    cy.get('article .prose')
      .prev('p')
      .find('a')
      .should('be.visible')
      .and(onScreen)
      .and(($link) => {
        // One box per run of text — «Come arrivarci» and its «(apre Google
        // Maps)» are two — but every one of them on the same line.
        const tops = [...$link[0]!.getClientRects()].map((rect) => Math.round(rect.top))
        expect(new Set(tops)).to.have.property('size', 1)
      })
  })

  // Review PR-10 (P-09): no strip of map over a card that has no place to
  // show in it — the whole screen, like any page without one.
  it('reads a card without a place full screen, with no strip of map above it', () => {
    cy.visit('/ricette')
    cy.contains('a', RICETTA).click()

    cy.contains('h1', RICETTA)
    cy.contains('button', 'Allarga la mappa').should('not.exist')
    cy.get('.leaflet-container').closest('[inert]').should('exist')
    // The whole screen, to the top edge (review PR-14, M-06), with the page's
    // own words starting under the menu.
    cy.get('main section[tabindex="-1"]').should(($panel) => {
      expect($panel[0]!.getBoundingClientRect().top).to.equal(0)
      const close = $panel[0]!.querySelector('button[aria-label="Chiudi e torna alla mappa"]')!
      expect(close.getBoundingClientRect().top).to.be.closeTo(headerBottom($panel) + 12, 1)
    })
  })

  // Review PR-14 (M-06): a page without a place is the whole screen, up to
  // the top edge — the menu floats over the page's own ground, and no band of
  // the veiled map shows around it, which read as a rendering fault.
  it('sees no map around the menu over a page without a place', () => {
    for (const [path, title] of [
      ['/benvenuto', 'Che cosa ti va di fare?'],
      ['/luoghi', 'Luoghi'],
      ['/il-progetto', 'Il progetto'],
    ]) {
      cy.visit(path!)
      cy.contains('main section[tabindex="-1"] h1', title!)
      cy.get('main section[tabindex="-1"]').should(($panel) => {
        const header = headerBottom($panel)
        // At the left edge, beside the pill: the top, the pill's middle, and
        // just above where the page's words begin.
        for (const y of [1, header / 2, header - 2]) {
          const hit = $panel[0]!.ownerDocument.elementFromPoint(2, y)
          expect($panel[0]!.contains(hit), `${path} at y=${y}`).to.equal(true)
        }
      })
    }
  })

  // Review PR-14 (M-09): the guest from the QR code chooses among cards that
  // each wear their intent's tint and icon, and leaves by a link to the map.
  it('meets the welcome page’s choices as cards with a tint and an icon', () => {
    cy.visit('/benvenuto')

    cy.contains('a', 'Scoprire la città')
      .find('span[aria-hidden="true"]')
      .should(($tile) => {
        expect(getComputedStyle($tile[0]!).backgroundColor).not.to.equal('rgba(0, 0, 0, 0)')
        expect($tile.find('svg')).to.have.length(1)
      })
    cy.contains('main section[tabindex="-1"] p', PRESENTATION)
    cy.contains('a', 'Oppure vai alla mappa').should('have.attr', 'href', '/').click()
    cy.location('pathname').should('eq', '/')
    cy.get('main section[tabindex="-1"]').should('not.exist')
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

  // Review PR-25 (decided by the author on 2026-10-23): the strip keeps
  // OpenStreetMap's credit on the map, short, in the corner across from
  // «Allarga la mappa» — 12px in from the side and from the article, as the
  // button is from the other — at the narrowest width the pill promises.
  it('reads the map’s credit in the strip’s bottom-left corner, clear of «Allarga la mappa»', () => {
    cy.viewport(360, 720)
    cy.visit('/chiese')
    cy.contains('a', PUBLISHED).click()
    cy.contains('h1', PUBLISHED)

    cy.get('main section[tabindex="-1"]').then(($panel) => {
      const panelTop = $panel[0]!.getBoundingClientRect().top
      cy.contains('button', 'Allarga la mappa').then(($button) => {
        const button = $button[0]!.getBoundingClientRect()
        cy.get('.leaflet-control-attribution')
          .should('have.text', '© OpenStreetMap')
          .and(($credit) => {
            const credit = $credit[0]!.getBoundingClientRect()
            expect(credit.left).to.be.closeTo(12, 0.5)
            expect(panelTop - credit.bottom).to.be.closeTo(12, 0.5)
            expect(credit.top).to.be.at.least(headerBottom($credit))
            expect(credit.right).to.be.lessThan(button.left)
          })
      })
    })
  })

  // Review PR-16 (P-11): a phone has the system's share sheet, which is
  // handed the card's name and its own address — not the enlarged map the
  // reader just left — and needs no toast of ours on top.
  it('sends a card on through the system’s share sheet', () => {
    cy.visit('/chiese')
    cy.contains('a', PUBLISHED).click()
    cy.contains('button', 'Allarga la mappa').click()
    cy.location('search').should('eq', '?mappa=1')
    cy.contains('button', 'Torna alla scheda').click()
    cy.contains('h1', PUBLISHED).should('be.visible')
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'share', {
        value: cy.stub().resolves().as('share'),
        configurable: true,
      })
    })

    cy.contains('button', 'Condividi').click()
    cy.location().then(({ origin, pathname }) => {
      cy.get('@share').should('have.been.calledOnceWith', {
        title: `${PUBLISHED} · Chiese · Vivere Gaeta`,
        url: `${origin}${pathname}`,
      })
    })
    cy.contains('[role="status"]', 'Link copiato').should('not.exist')
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

  // Review PR-20: on a phone «Dove sei?» is above the row of zones, and once
  // it has chosen one it steps aside with them — the line saying what it
  // chose stays, focus goes to «Cambia zona», and the zone's places still
  // start within the first screen.
  it('names where it stands, then sees the question put away with the zones', () => {
    cy.visit('/cosa-fare')
    cy.get('nav[aria-label="Zone"]').contains('a', 'Porto Salvo')
    cy.get('main input[role="combobox"]').then(($field) => {
      cy.get('#zone-chips').should(($chips) => {
        expect($field[0]!.getBoundingClientRect().bottom).to.be.at.most(
          $chips[0]!.getBoundingClientRect().top,
        )
      })
    })

    cy.get('main input[role="combobox"]').type('borgo{enter}')
    cy.location('search').should('eq', '?zona=porto-salvo')
    cy.contains('Sei al Borgo: ti mostriamo Porto Salvo.').should('be.visible')
    cy.get('main input[role="combobox"]').should('not.be.visible')
    cy.focused().should('contain', 'Cambia zona').and('have.attr', 'aria-expanded', 'false')
    cy.get('main section[tabindex="-1"]').then(($panel) => {
      cy.wrap($panel)
        .contains('a', PUBLISHED)
        .should(($link) => {
          const top = $link[0]!.getBoundingClientRect().top - $panel[0]!.getBoundingClientRect().top
          expect(top).to.be.at.most(420)
        })
    })

    cy.focused().click()
    cy.get('main input[role="combobox"]').should('be.visible')
  })
})
