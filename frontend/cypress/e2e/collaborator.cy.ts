// The collaborator's journey (TD-04): the flow by which anything ever gets
// into the archive. Runs against the real API with `seed_e2e`'s fixtures.
const EMAIL = 'collaboratore@e2e.test'
const PASSWORD = 'E2ePassw0rd!'

const login = () => {
  cy.visit('/login')
  cy.get('input[type="email"]').type(EMAIL)
  cy.get('input[type="password"]').type(PASSWORD, { log: false })
  cy.contains('button', 'Accedi').click()
  // Signed in: the menu shows the account behind the avatar (design.md D14).
  cy.get('button[aria-label^="Il tuo account"]').should('exist')
  // With nowhere asked for, a collaborator with a draft lands on their own
  // cards (review PR-13, C-02) — and `seed_e2e` gives this one a draft church.
  cy.location('pathname').should('equal', '/le-mie-schede')
  cy.contains('h2', 'Bozze')
}

// Everything on one horizontal line: the tops of the elements are one value.
const onOneRow = (selector: string) =>
  cy.get(selector).should(($elements) => {
    const tops = new Set([...$elements].map((element) => element.getBoundingClientRect().top))
    expect(tops.size, `${selector} on one row`).to.equal(1)
  })

// Two runs must not collide on a title, and the suite must be re-runnable
// against a database it already wrote to.
const uniqueTitle = () => `Chiesa E2E creata ${Date.now()}`

describe('the collaborator', () => {
  beforeEach(() => {
    // A desk (design.md D2): the editor's panel is reading-wide from 1280px.
    cy.viewport(1440, 900)
    login()
  })

  it('writes a card, places it on the map under the panel, publishes it, and finds it', () => {
    const title = uniqueTitle()

    cy.visit('/chiese/nuova')
    // The editor's shape (review PR-13, C-01): as wide as the reading panel,
    // on the right beside the map — the five tabs and the toolbar on one row.
    cy.get('main section').should(($panel) => {
      const panel = $panel[0]!.getBoundingClientRect()
      expect(panel.width).to.equal(808)
      expect(panel.right).to.equal(1440 - 16)
    })
    onOneRow('[role="tab"]')
    onOneRow('[role="toolbar"] button')
    cy.get('#type-form-title').type(title)
    // Tiptap renders a contenteditable rather than a textarea.
    cy.get('.tiptap').type('Un testo scritto dal test end-to-end.')

    // design.md D19: the map under the panel is the editor. Opening the map
    // tab says so over the map — in a banner across it, under the menu
    // (review PR-13, A-05) — and a click on the map is the card's pin.
    cy.contains('[role="tab"]', 'Mappa').click()
    cy.contains('[role="status"]', 'Clicca sulla mappa')
      .should('be.visible')
      .and(($banner) => {
        const banner = $banner[0]!.getBoundingClientRect()
        expect(banner.left).to.equal(16)
        expect(banner.right).to.be.at.most(1440 - 16 - 808 - 16)
      })
    // Cypress judges a fixed element by its centre, and the map's centre is
    // under the editor's 808px panel now. The point clicked is the map's, and
    // this says so — a stricter check than the centre's, not a looser one.
    cy.document().then((doc) => {
      const map = doc.elementFromPoint(300, 400)?.closest('.leaflet-container') ?? null
      expect(map, 'the map at (300, 400)').not.to.equal(null)
    })
    cy.get('.leaflet-container').click(300, 400, { force: true })
    cy.get('input[aria-label="Nome del punto 1"]').type('Ingresso')
    // A church has one pin: the map now says so instead of taking another.
    cy.get('[role="status"]').should('contain', 'toglilo per sceglierne un altro')

    // On a phone the banner runs across the strip of map, under the menu.
    cy.viewport(390, 844)
    cy.contains('[role="status"]', 'toglilo per sceglierne un altro')
      .should('be.visible')
      .and(($banner) => {
        const banner = $banner[0]!.getBoundingClientRect()
        expect(banner.width).to.be.at.least(390 - 24)
      })
    cy.viewport(1440, 900)
    cy.contains('[role="status"] button', 'Fatto').click()

    // "Fatto" leaves the map tab for the next one, and the map stops editing:
    // its banner, Fatto and all, is gone. (Named by its button, not by its
    // role alone: the toast's live region is a status too, and is always in
    // the document — review PR-8.)
    cy.contains('[role="status"] button', 'Fatto').should('not.exist')
    cy.get('#is-published').check()
    cy.contains('button', 'Crea scheda').click()

    // The create view routes to the new card's own detail page.
    cy.location('pathname').should('match', /^\/chiese\/[0-9a-f-]+$/)
    cy.contains('h1', title)
    cy.contains('Un testo scritto dal test end-to-end.')
    cy.contains('È evidenziato sulla mappa')
    cy.contains('li', 'Ingresso')

    cy.visit('/chiese')
    cy.contains('a', title).should('exist')
  })

  it('keeps a draft to itself: visible to its author, absent for a reader', () => {
    const title = uniqueTitle()

    cy.visit('/chiese/nuova')
    cy.get('#type-form-title').type(title)
    cy.get('.tiptap').type('Bozza.')
    // The keyboard path to a place (design.md D19, WCAG 2.1.1): the map
    // excluded from the a11y gate is exactly why this is tested on its own.
    cy.contains('[role="tab"]', 'Mappa').click()
    cy.get('#map-pins-manual-lat').type('41.2087')
    cy.get('#map-pins-manual-lng').type('13.5868')
    cy.get('#map-pins-manual-label').type('Portale')
    cy.contains('button', 'Aggiungi punto').click()
    cy.get('input[aria-label="Nome del punto 1"]').should('have.value', 'Portale')
    // `is-published` deliberately left unchecked.
    cy.contains('button', 'Crea scheda').click()
    cy.contains('h1', title)
    cy.contains('li', 'Portale')

    cy.url().then((cardUrl) => {
      // Two clicks from the avatar to the draft (review PR-13, C-02): *Le mie
      // schede*, then the draft itself, among the drafts at the top.
      cy.get('button[aria-label^="Il tuo account"]').click()
      cy.contains('a', 'Le mie schede').click()
      cy.get('section[aria-labelledby="mie-bozze"]').contains('a', title).click()
      cy.location('href').should('equal', cardUrl)
      cy.contains('h1', title)

      cy.get('button[aria-label^="Il tuo account"]').click()
      cy.contains('button', 'Esci').click()

      // The endpoint answers 404 rather than 403, so an outsider cannot tell
      // "hidden" from "never existed" — the SPA turns that into the list.
      cy.visit(cardUrl, { failOnStatusCode: false })
      cy.location('pathname').should('equal', '/chiese')
      cy.contains(title).should('not.exist')
    })
  })

  it('opens an empty English version of its own card', () => {
    const title = uniqueTitle()

    cy.visit('/chiese/nuova')
    cy.get('#type-form-title').type(title)
    cy.get('.tiptap').type('Testo in italiano.')
    cy.contains('[role="tab"]', 'Pubblicazione').click()
    cy.get('#is-published').check()
    cy.contains('button', 'Crea scheda').click()
    cy.contains('h1', title)

    cy.contains('button', 'Traduci in Inglese').click()

    // C4: translating opens the empty target-language card straight in edit
    // mode, at its own id — not a form on top of the original.
    cy.location('search').should('equal', '?edit=1')
    cy.get('#type-form-title').should('have.value', '')
  })
})
