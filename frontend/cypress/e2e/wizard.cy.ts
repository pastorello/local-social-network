// The wizard «Cosa fare adesso» (review of 2026-10-22, study 10; PR-21):
// /benvenuto and /cosa-fare in a row, one question a screen, the answers in
// the address. Runs on seed_e2e: «Scoprire la città» has a church and a tour
// in Porto Salvo and a castle in Gaeta Medievale, so the wizard asks where;
// every other intent sits in one zone or in none, so it does not.
const FESTA = 'Festa E2E pubblicata'
const TOUR = 'Itinerario E2E'
const RICETTA = 'Ricetta E2E pubblicata'
const STEP_3 = '/cosa-fare?intento=citta&zona=porto-salvo'

// Tab, as a keyboard does (native events), until the focus is on the link —
// or the control `tag` names — that says `text`: at most `left` presses, so
// one Tab never reaches fails here rather than timing out somewhere else.
const tabTo = (text: string, tag = 'a', left = 30): void => {
  cy.focused().then(($el) => {
    if ($el.is(tag) && $el.text().includes(text)) return
    if (!left) throw new Error(`Tab never reached «${text}»`)
    cy.press(Cypress.Keyboard.Keys.TAB)
    tabTo(text, tag, left - 1)
  })
}

const question = (text: string) => cy.focused().should('match', 'h1').and('contain.text', text)

describe('the wizard «Cosa fare adesso» (review PR-21)', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('walks its three steps from the keyboard, the focus on each question, and back', () => {
    cy.visit('/')
    question('Che cosa ti va di fare?')

    // The answers land once every count is in; Tab waits for them.
    cy.contains('a', 'Scoprire la città')
    tabTo('Scoprire la città')
    cy.press(Cypress.Keyboard.Keys.ENTER)
    cy.location('search').should('eq', '?intento=citta')
    question('Dove?')
    cy.contains('p', 'Hai scelto:').should('contain.text', 'Scoprire la città')

    cy.contains('a', 'Porto Salvo')
    tabTo('Porto Salvo')
    cy.press(Cypress.Keyboard.Keys.ENTER)
    cy.location('pathname').should('eq', '/cosa-fare')
    cy.location('search').should('eq', '?intento=citta&zona=porto-salvo')
    question('Cosa si può fare qui')
    cy.contains('p', 'Hai scelto:')
      .should('contain.text', 'Scoprire la città')
      .and('contain.text', 'Porto Salvo')
    // On top the intent's tours that pass here, then its places, both open;
    // the rest of the zone put away behind its headings.
    cy.get('h2 button').then(($buttons) => {
      const heads = [...$buttons].map((b) => [
        b.textContent?.replace(/\s+\d+\s*$/, '').trim(),
        b.getAttribute('aria-expanded'),
      ])
      expect(heads.slice(0, 2)).to.deep.equal([
        ['Itinerari che passano di qui', 'true'],
        ['Scoprire la città', 'true'],
      ])
      expect(heads.slice(2).every(([, open]) => open === 'false')).to.equal(true)
    })
    cy.contains('a', TOUR)

    // A heading put away opens from the keyboard, natively — with Space:
    // cy.press sends no keypress, which is what a button's Enter needs.
    tabTo('Le feste di questa zona', 'button')
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.contains('h2 button', 'Le feste di questa zona').should('have.attr', 'aria-expanded', 'true')

    // The third tap reaches a card: the feast just shown.
    tabTo(FESTA)
    cy.press(Cypress.Keyboard.Keys.ENTER)
    cy.contains('h1', FESTA)

    // Back is the step before, each time with the focus on its question.
    cy.go('back')
    cy.location('search').should('eq', '?intento=citta&zona=porto-salvo')
    question('Cosa si può fare qui')
    cy.go('back')
    cy.location('pathname').should('eq', '/')
    cy.location('search').should('eq', '?intento=citta')
    question('Dove?')
    cy.go('back')
    cy.location('search').should('eq', '')
    question('Che cosa ti va di fare?')
  })

  it('reopens the third step identical from its address', () => {
    cy.visit('/')
    cy.contains('a', 'Scoprire la città').click()
    cy.contains('a', 'Porto Salvo').click()
    cy.location('search').should('eq', '?intento=citta&zona=porto-salvo')
    cy.contains('a', TOUR)
    cy.get('main article')
      .invoke('text')
      .then((walked) => {
        cy.visit(STEP_3)
        cy.contains('a', TOUR)
        cy.get('main article').invoke('text').should('eq', walked)
      })
  })

  it('skips the question of where when one answer is all there is', () => {
    // Mangiare: a dish, in no zone — straight to «Ovunque a Gaeta», and a
    // dish's card in two taps.
    cy.visit('/')
    cy.contains('a', 'Mangiare').should('have.attr', 'href', '/cosa-fare?intento=mangiare').click()
    cy.contains('p', 'Hai scelto:').should('contain.text', 'Ovunque a Gaeta')
    cy.contains('a', RICETTA).click()
    cy.contains('h1', RICETTA)

    // Bere: one bar, in Serapo — straight there, and the zone is said, not
    // linked: there is no question to go back to.
    cy.visit('/')
    cy.contains('a', 'Bere').click()
    cy.location('search').should('eq', '?intento=bere&zona=serapo')
    cy.contains('p', 'Hai scelto:').find('a').should('have.length', 1)

    // «Questa settimana» leads to the events we know (cosa-fare.md D9).
    cy.visit('/')
    cy.contains('a', 'Questa settimana').click()
    cy.location('pathname').should('eq', '/eventi')
    cy.location('search').should('eq', '?finestra=settimana')
  })

  it('answers with whole-width cards on a phone, one column a thumb can take', () => {
    cy.viewport(390, 844)
    cy.visit('/')
    cy.contains('a', 'Scoprire la città')
    cy.get('main article ul')
      .first()
      .then(($list) => {
        const width = $list[0]!.getBoundingClientRect().width
        cy.wrap($list)
          .find('li > a')
          .each(($card) => {
            const box = $card[0]!.getBoundingClientRect()
            expect(box.width).to.be.closeTo(width, 1)
            expect(box.height).to.be.at.least(44)
          })
      })
  })

  // The same first question over the map (review PR-21b — the home's map
  // until 2026-10-26, /mappa since, the home being the welcome page), and
  // «Non lo so: fammi vedere la mappa» on the home lands on the map with it
  // put away.
  it('asks the same first question over the map, and leaves it put away from the home', () => {
    cy.visit('/mappa')
    cy.contains('h2', 'Che cosa ti va di fare?')
    cy.contains('a', 'Mangiare').should('have.attr', 'href', '/cosa-fare?intento=mangiare')
    cy.contains('a', 'Questa settimana').should('have.attr', 'href', '/eventi?finestra=settimana')

    cy.visit('/')
    cy.contains('a', 'Non lo so: fammi vedere la mappa').click()
    cy.location('pathname').should('eq', '/mappa')
    cy.contains('h1', 'La mappa di Gaeta')
    cy.contains('h2', 'Che cosa ti va di fare?').should('not.exist')
    cy.contains('button', 'Che cosa ti va di fare?')
  })
})
