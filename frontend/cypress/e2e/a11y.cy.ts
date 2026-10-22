// The WCAG 2.1 AA gate (ADR-0005, roadmap item 2). The ADR committed the whole
// app to the bar and said plainly that nothing automated was checking it:
// "does this meet the bar" was answered by manual review, which under-catches.
// This spec is the answer, and it runs in CI beside the other e2e specs —
// against the production build, on the real API, with `seed_e2e`'s fixtures.
//
// What it is not: proof of conformance. Automated rules catch a minority of
// WCAG failures. A green run means no *machine-detectable* violation of the
// tags below, which is a floor, not a certificate.
import type { Result } from 'axe-core'

// Exactly ADR-0005's bar, and nothing else: `best-practice` rules are opinions
// this project has not adopted, and failing on them would make the gate an
// argument rather than a check.
const WCAG_21_AA = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
}

// The Leaflet widget itself is the one thing ADR-0005 explicitly defers: a
// tile map's markers have no keyboard-focus equivalent, which is an inherent
// limitation of the library, mitigated by both maps also exposing their data
// as text lists ("Luoghi sulla mappa"). Excluding it keeps the gate honest —
// it fails on what this project has undertaken to fix, and stays quiet about
// what it has undertaken to live with. The exclusion is one selector, so the
// day the widget is addressed, deleting this line is the whole change.
const EXCLUDE_MAP_WIDGET = { exclude: [['.leaflet-container'] as string[]] }

// The wordmark fades in over 800ms (`--animate-fade-in-up`), and axe samples
// whatever colour the compositor happens to be showing: mid-fade that is a
// genuine reading of a meaningless value — 1.94:1 for text that settles at
// 14.76:1. Waiting for the animation to finish is not a workaround, it is the
// difference between measuring the page a reader looks at and measuring one
// frame of its entrance.
const settle = () =>
  cy.get('.animate-fade-in-up').should((el) => {
    expect(Number(getComputedStyle(el[0]).opacity)).to.equal(1)
  })

const check = (label: string) => {
  settle()
  cy.injectAxe()
  cy.checkA11y(EXCLUDE_MAP_WIDGET, WCAG_21_AA, (violations: Result[]) => {
    cy.task('a11yViolations', { label, violations })
  })
}

const PUBLISHED = 'Chiesa E2E pubblicata'
const EMAIL = 'collaboratore@e2e.test'
const PASSWORD = 'E2ePassw0rd!'

describe("the reader's surfaces meet WCAG 2.1 AA", () => {
  it('the map home, wide', () => {
    cy.viewport(1280, 800)
    cy.visit('/')
    cy.contains('h1', 'La mappa di Gaeta')

    check('/ (desktop)')
  })

  it('the map home, on a phone — the layout the primary reader gets', () => {
    cy.viewport(375, 812)
    cy.visit('/')
    cy.get('.leaflet-container').should('exist')

    check('/ (mobile)')
  })

  // WCAG 2.4.1. Seven chrome stops precede the page on every route, and on the
  // home the map's own container follows them; this is the way past all of it.
  // A skip link nobody can reach or see is the usual way this is got wrong, so
  // the test is about reaching it, seeing it, and where it lands.
  it('the skip link is first, visible when focused, and lands on the content', () => {
    cy.viewport(1280, 800)
    cy.visit('/')

    // Cypress cannot press Tab without a plugin, so this asserts the two
    // things a Tab would have shown instead of pretending to press it: the
    // tab order *is* DOM order here — nothing in this app raises tabindex
    // above zero — and the skip link is the first focusable thing in it.
    cy.get('[tabindex]').each(($el) => {
      expect(Number($el.attr('tabindex'))).to.be.at.most(0)
    })
    cy.get('a[href], button, input, select, textarea, [tabindex="0"]')
      .first()
      .should('have.attr', 'href', '#contenuto')

    // Invisible until focused, and useless if it stays invisible after.
    cy.contains('a', 'Salta al contenuto').focus()
    cy.focused().should('be.visible')
    cy.focused().click()

    cy.focused().should('have.id', 'contenuto').and('match', 'main')
  })

  // The decision of 2026-09-05 — the text lists are the conforming path and
  // the map's pins are not in the tab order — measured rather than asserted in
  // prose. It was not true when it was written: cluster icons are markers, and
  // Leaflet makes every marker focusable by default.
  it('the map puts its pins out of the tab order, and names itself', () => {
    cy.viewport(1280, 800)
    cy.visit('/')

    cy.get('.leaflet-container').should('have.attr', 'aria-label').and('contain', 'Mappa di Gaeta')
    cy.get('.leaflet-marker-icon[tabindex="0"]').should('not.exist')
  })

  it('a card list', () => {
    cy.viewport(1280, 800)
    cy.visit('/chiese')
    cy.contains('h1', 'Chiese')

    check('/chiese')
  })

  it('a card, read as an article', () => {
    cy.viewport(1280, 800)
    cy.visit('/chiese')
    cy.contains('a', PUBLISHED).click()
    cy.contains('h1', PUBLISHED)

    check('/chiese/:id')
  })

  // The credits surface since the footer went (design.md D21) — reached from
  // the menu on every page, so a reader's surface like any other.
  it('Il progetto, the credits', () => {
    cy.viewport(1280, 800)
    cy.visit('/il-progetto')
    cy.contains('h1', 'Il progetto')

    check('/il-progetto')
  })

  // The guest's path (spec itinerari.md I6/I7): the page a B&B's card points
  // at, a tour, and a tour followed one stop at a time.
  it('the welcome page, on a phone — where a guest arrives from a QR code', () => {
    cy.viewport(390, 844)
    cy.visit('/benvenuto')
    cy.contains('h1', 'Che cosa ti va di fare?')

    check('/benvenuto')
  })

  it('a tour, and one of its stops', () => {
    cy.viewport(1280, 800)
    cy.visit('/itinerari')
    cy.contains('a', 'Itinerario E2E').click()
    cy.contains('h1', 'Itinerario E2E')
    check('/itinerari/:id')

    cy.contains('button', 'Inizia il tour').click()
    cy.contains('Tappa 1 di 2')
    check('/itinerari/:id?tappa=1')
  })

  // «Cosa si può fare qui» (spec cosa-fare.md Part −1): the guest's second
  // way in from /benvenuto. The seeded church is at the map's centre, which is
  // in the seeded zone of Porto Salvo.
  it('Cosa si può fare qui, a zone on a wide screen and the chooser on a phone', () => {
    cy.viewport(1280, 800)
    cy.visit('/cosa-fare?zona=porto-salvo')
    cy.contains('h1', 'Cosa si può fare qui')
    cy.contains('a', 'Chiesa E2E pubblicata')
    check('/cosa-fare?zona=porto-salvo')

    cy.viewport(390, 844)
    cy.visit('/cosa-fare')
    cy.contains('Scegli una zona')
    check('/cosa-fare')
  })

  it('Cosa si può fare qui: the zones are links a keyboard reaches and follows', () => {
    cy.viewport(1280, 800)
    cy.visit('/cosa-fare')
    // Real links, so Tab reaches them and Enter follows them natively — which
    // Cypress cannot simulate, so what is asserted is what makes it true: a
    // focusable <a> per zone whose address is the choice.
    cy.get('nav[aria-label="Zone"] a').first().focus()
    cy.focused().should('have.prop', 'tagName', 'A').and('contain', 'Gaeta Medievale')
    cy.get('nav[aria-label="Zone"]')
      .contains('a', 'Porto Salvo')
      .should('have.attr', 'href', '/cosa-fare?zona=porto-salvo')
    cy.visit('/cosa-fare?zona=porto-salvo')
    cy.get('nav[aria-label="Zone"] a[aria-current="page"]').should('contain', 'Porto Salvo')
  })

  it('the public request form, where a would-be collaborator arrives', () => {
    cy.viewport(1280, 800)
    cy.visit('/collabora')
    cy.get('form').should('exist')

    check('/collabora')
  })

  it('the login form', () => {
    cy.viewport(1280, 800)
    cy.visit('/login')
    cy.get('input[type="email"]').should('exist')

    check('/login')
  })

  // The reader-facing counterpart of the authoring-form error case below.
  // Deliberately a *client-side* rejection: it never reaches the API, so this
  // case costs the suite nothing against the login rate limit while
  // exercising exactly the wiring it is here to check.
  //
  // It has to be the password, not the address: the browser's own constraint
  // validation refuses to submit a malformed `type="email"` at all, so our
  // validation — and everything wired to it — never runs on that field in a
  // real browser. A password is a field the browser does not police.
  it('the login form showing a rejected field', () => {
    cy.viewport(1280, 800)
    cy.visit('/login')

    cy.get('#login-email').type('collaboratore@e2e.test')
    cy.get('#login-password').type('corta')
    cy.contains('button', 'Accedi').click()
    cy.get('#login-password').should('have.attr', 'aria-invalid', 'true')

    check('/login (in errore)')
  })

  // The design pass left /polls in its v1 clothes on purpose (design.md's
  // closing note), and that changes nothing here: ADR-0005's bar is the whole
  // app, not the redesigned part of it. Style and accessibility are different
  // undertakings and this one covers everything.
  it('the polls, a v1 surface the design pass did not redraw', () => {
    cy.viewport(1280, 800)
    cy.visit('/polls')
    cy.contains('h1', 'Sondaggi')

    check('/polls')
  })
})

// `testIsolation: false`, so these three checks share one login rather than
// signing in three times. That is not tidiness: the login endpoint is rate
// limited to 10/min per IP (TD-18) and the suite as a whole was already close
// to it, so three more sign-ins turn a green gate into an intermittent 429
// that reads like a wrong password.
//
// `cy.session` is the usual answer and it is the wrong one *here*: refresh
// rotation with a blacklist means a cached snapshot replays a refresh token
// the previous test already spent, and the app — correctly — treats that as a
// dead session and logs itself out. Keeping the real browser session is what
// matches how this app actually holds a login.
describe("the collaborator's surfaces meet WCAG 2.1 AA", { testIsolation: false }, () => {
  before(() => {
    cy.viewport(1280, 800)
    cy.visit('/login')
    cy.get('input[type="email"]').type(EMAIL)
    cy.get('input[type="password"]').type(PASSWORD, { log: false })
    cy.contains('button', 'Accedi').click()
    cy.get('button[aria-label^="Il tuo account"]').should('exist')
  })

  it('the authoring form, with its sections and its editor', () => {
    cy.visit('/chiese/nuova')
    cy.get('#type-form-title').should('exist')

    check('/chiese/nuova')
  })

  // The reports section — its list, filters and legend — left the reader's
  // home on 2026-10-22 (reports-and-polls.md R1). It is measured where it
  // lives now, so the gate does not quietly stop seeing it.
  it('the map home with its reports, a collaborator’s alone', () => {
    cy.visit('/')
    cy.contains('h2', 'Segnalazioni')
    cy.contains('button', 'Segnala un problema').should('exist')

    check('/ (desktop, collaboratore)')
  })

  // design.md D19: the map tab lends the map to the form — the banner over the
  // map and the points field are new controls, so the gate measures them.
  it('the authoring form drawing on the map, with its banner', () => {
    cy.visit('/chiese/nuova')
    cy.contains('[role="tab"]', 'Mappa').click()
    cy.get('[role="status"]').should('contain', 'Clicca sulla mappa')

    check('/chiese/nuova (mappa)')
  })

  // The tour form's stops tab lends the map a stops editor (itinerari.md I8);
  // the stops list and its keyboard picker are measured with a stop in it.
  it('the tour form, with a stop picked', () => {
    cy.visit('/itinerari/nuovo')
    cy.get('#tour-title').should('exist')
    cy.contains('[role="tab"]', 'Tappe').click()
    cy.get('#stop-pick').select(PUBLISHED)
    cy.contains('button', 'Aggiungi tappa').click()
    cy.get('#stop-note-0').should('exist')

    check('/itinerari/nuovo (tappe)')
  })

  // The images strip only exists once there are images, so the gate never saw
  // it until this case attached one: new controls that no run measures are
  // exactly what a gate is supposed to stop happening (2026-09-07).
  it('the authoring form with images attached, where the cover is chosen', () => {
    cy.visit('/chiese/nuova')
    cy.contains('[role="tab"]', 'Immagini').click()
    cy.get('#type-form-images').selectFile([
      'cypress/fixtures/foto.jpg',
      'cypress/fixtures/foto.jpg',
    ])
    cy.contains('li', 'Copertina').should('exist')

    check('/chiese/nuova (con immagini)')
  })

  it('the user directory and a profile, both login-only', () => {
    // Wide on purpose: the avatar with its account menu is the wide menu; on
    // a phone the same links sit behind "Menu" (design.md D14).
    cy.viewport(1280, 800)
    cy.visit('/users')
    cy.contains('h1', 'Utenti del network')
    check('/users')

    // The chrome is a <nav>, not a <header>, and the link to one's own profile
    // sits behind the avatar in it (design.md D14).
    cy.get('button[aria-label^="Il tuo account"]').click()
    cy.get('nav a[href^="/profile/"]').first().click()
    cy.location('pathname').should('match', /^\/profile\/[0-9a-f-]+$/)
    check('/profile/:id')
  })

  it('an authoring form showing a real validation error', () => {
    cy.visit('/chiese/nuova')
    // A title over the API's limit: the point is the error state, which is
    // where label/message/control wiring either holds or does not.
    cy.get('#type-form-title').type('x'.repeat(260))
    cy.get('.tiptap').type('Corpo del test.')
    cy.contains('button', 'Crea scheda').click()
    cy.get('[aria-invalid="true"]').should('exist')

    check('/chiese/nuova (in errore)')
  })
})
