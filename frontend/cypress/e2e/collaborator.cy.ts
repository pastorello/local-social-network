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
}

// Two runs must not collide on a title, and the suite must be re-runnable
// against a database it already wrote to.
const uniqueTitle = () => `Chiesa E2E creata ${Date.now()}`

describe('the collaborator', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    login()
  })

  it('writes a card, places it on the map under the panel, publishes it, and finds it', () => {
    const title = uniqueTitle()

    cy.visit('/chiese/nuova')
    cy.get('#type-form-title').type(title)
    // Tiptap renders a contenteditable rather than a textarea.
    cy.get('.tiptap').type('Un testo scritto dal test end-to-end.')

    // design.md D19: the map under the panel is the editor. Opening the map
    // tab says so over the map, and a click on the map is the card's pin.
    cy.contains('[role="tab"]', 'Mappa').click()
    cy.get('[role="status"]').should('contain', 'Clicca sulla mappa')
    cy.get('.leaflet-container').click(300, 400)
    cy.get('input[aria-label="Nome del punto 1"]').type('Ingresso')
    // A church has one pin: the map now says so instead of taking another.
    cy.get('[role="status"]').should('contain', 'toglilo per sceglierne un altro')
    cy.contains('[role="status"] button', 'Fatto').click()

    // "Fatto" leaves the map tab for the next one, and the map stops editing.
    cy.get('[role="status"]').should('not.exist')
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
