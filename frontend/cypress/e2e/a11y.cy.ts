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
    cy.contains('button', 'Esci').should('exist')
  })

  it('the authoring form, with its sections and its editor', () => {
    cy.visit('/chiese/nuova')
    cy.get('#type-form-title').should('exist')

    check('/chiese/nuova')
  })

  it('the user directory and a profile, both login-only', () => {
    cy.visit('/users')
    cy.contains('h1', 'Utenti del network')
    check('/users')

    // The chrome is a <nav>, not a <header>: the avatar in it is the only
    // link to one's own profile.
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
