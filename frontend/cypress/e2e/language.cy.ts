// The English of the first paint is a chunk only an English reader loads
// (review PR-19a, src/lib/i18n/index.ts), and index.html asks for it beside
// the entry when the address, the reader's last choice or the browser says
// English (vite.config.ts, preloadEnglish) — a build-time hint, so it is only
// in the production build this suite runs against. An Italian reader fetches
// none of it.
const englishPreload = 'link[rel="modulepreload"][href*="/assets/english-"]'

describe('the English chunk travels beside the entry, and only for English', () => {
  it('fetches nothing of English for an Italian reader', () => {
    cy.intercept('GET', '**/assets/english-*.js').as('english')
    cy.visit('/mappa')
    cy.contains('h1', 'La mappa di Gaeta')
    cy.document().its('documentElement.lang').should('eq', 'it')
    cy.get(englishPreload).should('not.exist')
    cy.get('@english.all').should('have.length', 0)
  })

  it('preloads it for a link in English, which opens in English', () => {
    cy.visit('/mappa?lang=en')
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

// The switch as a reader meets it (review PR-19c, translations.md T9/T10):
// «IT · EN» in the pill, then the cards following the interface. seed_e2e's
// castle has a published English version and its beach has none, so the same
// list holds one card read in English and one read in Italian under a line
// that says so. Every page keeps `?lang=en` and `<html lang>` says English;
// what is Italian on it is marked Italian.
describe('the reader switches to English, and the cards follow', () => {
  const CASTLE = 'Castello E2E pubblicato'
  const CASTLE_EN = 'E2E castle, published'
  const BEACH = 'Luogo E2E pubblicato'
  const UNTRANSLATED = 'Not yet translated into English — the Italian text follows'

  const toggle = (lang: 'it' | 'en') => cy.get(`button[lang="${lang}"][aria-pressed]`)
  const htmlLang = () => cy.document().its('documentElement.lang')

  it('switches from the pill, then reads a translated card and an untranslated one', () => {
    cy.viewport(1280, 800)
    cy.visit('/mappa')
    cy.contains('h1', 'La mappa di Gaeta')
    htmlLang().should('eq', 'it')
    toggle('it').should('have.attr', 'aria-pressed', 'true')

    toggle('en').click()
    cy.contains('h1', 'The map of Gaeta')
    htmlLang().should('eq', 'en')
    cy.location('search').should('eq', '?lang=en')
    toggle('en').should('have.attr', 'aria-pressed', 'true')
    toggle('it').should('have.attr', 'aria-pressed', 'false')

    // The places, through the menu: the language travels with a link.
    cy.contains('button', 'Explore').click()
    cy.get('[role="menu"]').contains('a', 'Places').click()
    cy.location('pathname').should('eq', '/luoghi')
    cy.location('search').should('eq', '?lang=en')
    cy.contains('a', CASTLE).find('[title="Available in English"]').should('contain.text', 'EN')
    cy.contains('a', BEACH).find('[title="Available in English"]').should('not.exist')

    // Translated: the Italian name is the heading (T7), the English one the
    // subtitle under it, and the text is the translation's.
    cy.contains('a', CASTLE).click()
    cy.contains('h1', CASTLE).should('have.attr', 'lang', 'it')
    cy.get('article h1 + p').should('have.text', CASTLE_EN).and('have.attr', 'lang', 'en')
    cy.get('article .prose')
      .should('have.attr', 'lang', 'en')
      .and('contain.text', `Text of the ${CASTLE_EN}.`)
    cy.contains(UNTRANSLATED).should('not.exist')
    cy.location('search').should('eq', '?lang=en')
    htmlLang().should('eq', 'en')

    // Untranslated: the Italian, said first, and marked Italian.
    cy.get('nav[aria-label="Path"]').contains('a', 'Places').click()
    cy.contains('a', BEACH).click()
    cy.contains('h1', BEACH)
    cy.contains('p', UNTRANSLATED)
    cy.get('article .prose')
      .should('have.attr', 'lang', 'it')
      .and('contain.text', `Testo di ${BEACH}.`)
    cy.get('article h1 + p').should('not.exist')
    cy.location('search').should('eq', '?lang=en')
    htmlLang().should('eq', 'en')

    // And back: the address loses its `?lang`, the line goes.
    toggle('it').click()
    htmlLang().should('eq', 'it')
    cy.location('search').should('eq', '')
    cy.contains('h1', BEACH)
    cy.contains(UNTRANSLATED).should('not.exist')
  })
})
