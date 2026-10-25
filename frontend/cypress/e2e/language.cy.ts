// The English of the first paint is a chunk only an English reader loads
// (review PR-19a, src/lib/i18n/index.ts), and index.html asks for it beside
// the entry when the address, the reader's last choice or the browser says
// English (vite.config.ts, preloadEnglish) — a build-time hint, so it is only
// in the production build this suite runs against. An Italian reader fetches
// none of it. The rest of the language switch is review PR-19c's to cover.
const englishPreload = 'link[rel="modulepreload"][href*="/assets/english-"]'

describe('the English chunk travels beside the entry, and only for English', () => {
  it('fetches nothing of English for an Italian reader', () => {
    cy.intercept('GET', '**/assets/english-*.js').as('english')
    cy.visit('/')
    cy.contains('h1', 'La mappa di Gaeta')
    cy.document().its('documentElement.lang').should('eq', 'it')
    cy.get(englishPreload).should('not.exist')
    cy.get('@english.all').should('have.length', 0)
  })

  it('preloads it for a link in English, which opens in English', () => {
    cy.visit('/?lang=en')
    cy.get(englishPreload).should('exist')
    cy.contains('h1', 'The map of Gaeta')
    cy.document().its('documentElement.lang').should('eq', 'en')
  })

  it('preloads it for a reader who chose English last time', () => {
    cy.visit('/cosa-fare', {
      onBeforeLoad: (win) => win.localStorage.setItem('lang', 'en'),
    })
    cy.get(englishPreload).should('exist')
    cy.contains('h1', 'What there is to do here')
    cy.location('search').should('eq', '?lang=en')
  })
})
