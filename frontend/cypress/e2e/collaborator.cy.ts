// The collaborator's journey (TD-04): the flow by which anything ever gets
// into the archive. Runs against the real API with `seed_e2e`'s fixtures.
const EMAIL = 'collaboratore@e2e.test'
const PASSWORD = 'E2ePassw0rd!'

const login = () => {
  cy.visit('/login')
  cy.get('input[type="email"]').type(EMAIL)
  cy.get('input[type="password"]').type(PASSWORD, { log: false })
  cy.contains('button', 'Accedi').click()
  cy.contains('button', 'Esci').should('exist')
}

// Two runs must not collide on a title, and the suite must be re-runnable
// against a database it already wrote to.
const uniqueTitle = () => `Chiesa E2E creata ${Date.now()}`

describe('the collaborator', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    login()
  })

  it('writes a card, publishes it, and finds it in the list', () => {
    const title = uniqueTitle()

    cy.visit('/chiese/nuova')
    cy.get('#type-form-title').type(title)
    // Tiptap renders a contenteditable rather than a textarea.
    cy.get('.tiptap').type('Un testo scritto dal test end-to-end.')
    cy.get('#is-published').check()
    cy.contains('button', 'Crea scheda').click()

    // The create view routes to the new card's own detail page.
    cy.location('pathname').should('match', /^\/chiese\/[0-9a-f-]+$/)
    cy.contains('h1', title)
    cy.contains('Un testo scritto dal test end-to-end.')

    cy.visit('/chiese')
    cy.contains('a', title).should('exist')
  })

  it('keeps a draft to itself: visible to its author, absent for a reader', () => {
    const title = uniqueTitle()

    cy.visit('/chiese/nuova')
    cy.get('#type-form-title').type(title)
    cy.get('.tiptap').type('Bozza.')
    // `is-published` deliberately left unchecked.
    cy.contains('button', 'Crea scheda').click()
    cy.contains('h1', title)

    cy.url().then((cardUrl) => {
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
