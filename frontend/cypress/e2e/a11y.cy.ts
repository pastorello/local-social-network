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

// Leaflet 1.9 draws its tiles with `mix-blend-mode: plus-lighter`, so no seam
// shows between two of them, and axe-core has no formula for that mode: meeting
// a tile under a text, its colour rule throws, files itself as "incomplete" —
// which cypress-axe does not fail on — and is skipped for the whole page. With
// the map under every page, that was every page, and the gate's WCAG 1.4.3 was
// passing by not looking: found on 2026-10-23 (review PR-8), when a toast given
// a 1.9:1 pair came back green. The suite's tiles are a transparent 1×1 PNG
// (support/e2e.ts), so blending them normally changes no colour on screen; it
// only lets the rule run. The case "measures contrast" fails if it stops again.
const blendTilesNormally = () =>
  cy.document().then((doc) => {
    if (doc.getElementById('axe-tile-blend')) return
    const style = doc.createElement('style')
    style.id = 'axe-tile-blend'
    style.textContent = '.leaflet-tile { mix-blend-mode: normal !important; }'
    doc.head.append(style)
  })

const check = (label: string) => {
  settle()
  blendTilesNormally()
  cy.injectAxe()
  cy.checkA11y(EXCLUDE_MAP_WIDGET, WCAG_21_AA, (violations: Result[]) => {
    cy.task('a11yViolations', { label, violations })
  })
}

const PUBLISHED = 'Chiesa E2E pubblicata'
const PLACE = 'Luogo E2E pubblicato'
const BUSINESS = 'Attività E2E pubblicata'
const EMAIL = 'collaboratore@e2e.test'
const PASSWORD = 'E2ePassw0rd!'

describe("the reader's surfaces meet WCAG 2.1 AA", () => {
  it('the map home, wide', () => {
    cy.viewport(1280, 800)
    cy.visit('/')
    cy.contains('h1', 'La mappa di Gaeta')
    // The two doors under the presentation (review of 2026-10-22, P-02) come
    // from the API: measured once they are there, not before.
    cy.contains('a', 'Che cosa ti va di fare?')

    check('/ (desktop)')
  })

  it('the map home, on a phone — the layout the primary reader gets', () => {
    cy.viewport(375, 812)
    cy.visit('/')
    cy.get('.leaflet-container').should('exist')
    cy.contains('a', 'Che cosa ti va di fare?')

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

  // The list as the archive starts, without photographs (review PR-6): a
  // tinted band over each title on a wide screen; on a phone a row per place,
  // and the genres one row that scrolls.
  it('a list of places without covers, wide and on a phone', () => {
    cy.viewport(1280, 800)
    cy.visit('/luoghi')
    cy.contains('a', PLACE).should('contain', 'Serapo · Spiaggia')
    check('/luoghi (desktop)')

    cy.viewport(390, 844)
    cy.visit('/luoghi')
    cy.contains('a', PLACE)
    cy.get('nav[aria-label="Filtra luoghi per genere"] ul').should('have.css', 'overflow-x', 'auto')
    check('/luoghi (mobile)')
  })

  // With its «Dove» before the text (review PR-24), in both layouts: a church
  // wide, a luogo — whose line says how to get there — on a phone.
  it('a card, read as an article, wide and on a phone', () => {
    cy.viewport(1280, 800)
    cy.visit('/chiese')
    cy.contains('a', PUBLISHED).click()
    cy.contains('h1', PUBLISHED)
    cy.get('article .prose').prev('p').should('contain.text', 'Come arrivarci')

    check('/chiese/:id')

    cy.viewport(390, 844)
    cy.visit('/luoghi')
    cy.contains('a', PLACE).click()
    cy.contains('h1', PLACE)
    cy.get('article .prose').prev('p').should('contain.text', 'A piedi dal lungomare.')

    check('/luoghi/:id (mobile)')
  })

  // The businesses (ADR-0010, review PR-26): their list — with the line that
  // prints its order, and the kinds as one row of chips on a phone — and a
  // card with its hours, in both layouts.
  it('the businesses: their list and a card, wide and on a phone', () => {
    cy.viewport(1280, 800)
    cy.visit('/attivita')
    cy.contains('a', BUSINESS).should('contain', 'Serapo · Dove si beve')
    check('/attivita (desktop)')
    cy.contains('a', BUSINESS).click()
    cy.contains('h1', BUSINESS)
    cy.contains('h2', 'Orari')
    check('/attivita/:id (desktop)')

    cy.viewport(390, 844)
    cy.visit('/attivita')
    cy.contains('a', BUSINESS)
    cy.get('nav[aria-label="Filtra attività per tipo"] ul').should('have.css', 'overflow-x', 'auto')
    check('/attivita (mobile)')
    cy.contains('a', BUSINESS).click()
    cy.contains('h1', BUSINESS)
    cy.contains('h2', 'Orari')
    check('/attivita/:id (mobile)')
  })

  // The credits surface since the footer went (design.md D21) — reached from
  // the menu on every page, so a reader's surface like any other.
  it('Il progetto, the credits', () => {
    cy.viewport(1280, 800)
    cy.visit('/il-progetto')
    cy.contains('h1', 'Il progetto')

    check('/il-progetto')
  })

  // Review PR-8 (A-02, L-10): the toast was pink with grey text in the
  // bottom-right corner, its contrast judged by eye. It is put up through the
  // app's own store rather than by a flow that happens to raise one today, so
  // the case measures the toast and not whichever page still calls it — and
  // measured once its entrance is over, as the wordmark is (`settle`). Tried
  // with a failing pair (#4b5563 on the ink, 1.9:1): it goes red.
  it('a toast, under the pill and over a panel, wide and on a phone', () => {
    const message = 'Accedi per votare nei sondaggi'
    const toastUp = () => {
      cy.get('#app')
        .its('0.__vue_app__.config.globalProperties.$pinia.state.value.toast')
        .then((toast) => {
          Object.assign(toast, { message, isVisible: true })
        })
      cy.contains('[role="status"] p', message).should((el) => {
        const page = el[0].ownerDocument
        expect(getComputedStyle(el[0]).opacity).to.equal('1')
        const toast = el[0].getBoundingClientRect()
        const pill = page.querySelector('nav[aria-label="Principale"]')?.getBoundingClientRect()
        expect(toast.top).to.be.greaterThan(pill?.bottom ?? Infinity)
        expect(toast.width).to.be.at.most(480)
        const middle = page.documentElement.clientWidth / 2
        expect(Math.abs(toast.left + toast.width / 2 - middle)).to.be.lessThan(1)
      })
    }

    cy.viewport(1280, 800)
    cy.visit('/il-progetto')
    cy.contains('h1', 'Il progetto')
    toastUp()
    check('il toast, largo')

    cy.viewport(390, 844)
    cy.visit('/il-progetto')
    cy.contains('h1', 'Il progetto')
    toastUp()
    check('il toast, telefono')
  })

  // The guest's path (spec itinerari.md I6/I7): the page a B&B's card points
  // at, a tour, and a tour followed one stop at a time.
  it('the welcome page, on a phone — where a guest arrives from a QR code', () => {
    cy.viewport(390, 844)
    cy.visit('/benvenuto')
    cy.contains('h1', 'Che cosa ti va di fare?')
    // The intents come from the API (review PR-14 gave them tints and icons):
    // measured once they are there, not before — and with them the wizard's
    // «Questa settimana» (review PR-21), the week's event in seed_e2e.
    cy.contains('a', 'Scoprire la città')
    cy.contains('a', 'Questa settimana')

    check('/benvenuto')

    cy.viewport(1280, 800)
    cy.visit('/benvenuto')
    cy.contains('a', 'Scoprire la città')
    check('/benvenuto (largo)')
  })

  // The wizard «Cosa fare adesso» (review PR-21, study 10): each of its three
  // steps, in both layouts — the second asks «Dove?» with «Dove sei?», the
  // third opens on the answers with the rest of the zone behind disclosures,
  // one of them opened so its rows are measured too.
  it('the wizard’s second and third steps', () => {
    for (const [width, height, layout] of [
      [390, 844, 'telefono'],
      [1280, 800, 'largo'],
    ] as const) {
      cy.viewport(width, height)
      cy.visit('/benvenuto?intento=citta')
      cy.contains('h1', 'Dove?')
      cy.contains('a', 'Porto Salvo')
      check(`/benvenuto?intento=citta (${layout})`)

      cy.visit('/cosa-fare?intento=citta&zona=porto-salvo')
      cy.contains('p', 'Hai scelto:')
      cy.contains('a', 'Chiesa E2E pubblicata')
      cy.contains('h2 button', 'Le feste di questa zona').click()
      cy.contains('a', 'Festa E2E pubblicata')
      check(`/cosa-fare?intento=citta&zona=porto-salvo (${layout})`)
    }

    cy.visit('/cosa-fare?intento=mangiare')
    cy.contains('a', 'Ricetta E2E pubblicata')
    check('/cosa-fare?intento=mangiare')
  })

  it('a tour, its first stop and its last', () => {
    cy.viewport(1280, 800)
    cy.visit('/itinerari')
    cy.contains('a', 'Itinerario E2E').click()
    cy.contains('h1', 'Itinerario E2E')
    check('/itinerari/:id')

    cy.contains('button', 'Inizia il tour').click()
    cy.contains('Tappa 1 di 3')
    check('/itinerari/:id?tappa=1')

    // The last stop, where what comes after the tour replaces "next" (review
    // PR-7): new links, measured with the counts behind them loaded.
    cy.contains('button', 'Tappa successiva').click()
    cy.contains('button', 'Tappa successiva').click()
    cy.contains('a', 'Cosa c’è qui intorno')
    check('/itinerari/:id?tappa=3')
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

    // Review PR-4: on a phone a chosen zone puts the other chips away behind
    // «Cambia zona», a disclosure.
    cy.visit('/cosa-fare?zona=porto-salvo')
    cy.contains('a', 'Chiesa E2E pubblicata')
    cy.contains('button', 'Cambia zona')
    check('/cosa-fare?zona=porto-salvo (phone)')
  })

  // Review PR-20: «Dove sei?» measured with its list open, in both layouts —
  // a listbox the gate never saw open is one it never measured.
  it('Cosa si può fare qui, with «Dove sei?» open', () => {
    cy.viewport(1280, 800)
    cy.visit('/cosa-fare')
    cy.get('nav[aria-label="Zone"]').contains('a', 'Porto Salvo')
    cy.get('main input[role="combobox"]').type('ca')
    cy.get('main [role="listbox"]').should('be.visible')
    cy.get('main [role="option"]').should('have.length.at.least', 2)
    check('/cosa-fare, «Dove sei?» open')

    cy.viewport(390, 844)
    cy.visit('/cosa-fare')
    cy.get('nav[aria-label="Zone"]').contains('a', 'Porto Salvo')
    cy.get('main input[role="combobox"]').type('{downarrow}')
    cy.get('main [role="listbox"]').should('be.visible')
    check('/cosa-fare, «Dove sei?» open (phone)')
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

  // Cosa-fare.md Part −1 D9 (review PR-27b): the events we know, a window
  // and the whole list with its cancelled event struck through.
  it('the events we know, this week and the whole list', () => {
    cy.viewport(1280, 800)
    cy.visit('/eventi?finestra=settimana')
    cy.contains('li', 'Evento E2E in settimana')
    check('/eventi?finestra=settimana')

    cy.visit('/eventi')
    cy.contains('li', 'Evento E2E annullato')
    check('/eventi')
  })

  // An event's page on a phone, then its poster on the whole screen, where the
  // rest of the app is inert and the dialog is all there is.
  it('an event’s page, and its poster opened, on a phone', () => {
    cy.viewport(390, 844)
    cy.visit('/eventi')
    cy.contains('a', 'Evento E2E in settimana').click()
    cy.contains('h1', 'Evento E2E in settimana')
    check('/eventi/:id (telefono)')

    cy.get('button[aria-label^="Ingrandisci la locandina"]').click()
    cy.get('[role="dialog"]').should('be.visible')
    check('/eventi/:id (locandina aperta)')
    cy.contains('[role="dialog"] button', 'Dimensione reale').click()
    cy.get('[role="dialog"] [role="region"]').should('exist')
    check('/eventi/:id (locandina a dimensione reale)')
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

  // The account forms are one column since review PR-11 (design.md "The
  // account forms in one column"); on a phone that column is the panel.
  it('the login form on a phone', () => {
    cy.viewport(375, 812)
    cy.visit('/login')
    cy.get('#login-email').should('exist')

    check('/login (phone)')
  })

  // A keyboard signs in without reaching for the button: Enter in a field
  // submits the form. With a password the client refuses, so — like the case
  // above — it costs nothing against the login rate limit.
  it('the login form answers Enter in a field, as it answers «Accedi»', () => {
    cy.viewport(1280, 800)
    cy.visit('/login')

    cy.get('#login-email').type('collaboratore@e2e.test')
    cy.get('#login-password').type('corta{enter}')
    cy.get('#login-password').should('have.attr', 'aria-invalid', 'true')
  })

  it('the forgotten-password form', () => {
    cy.viewport(1280, 800)
    cy.visit('/password-dimenticata')
    cy.contains('h1', 'Password dimenticata')

    check('/password-dimenticata')
  })

  // The colour rule has to run before it can pass (see `blendTilesNormally`).
  // If it ever throws again — another blend mode, another gap in the engine —
  // axe files it as "incomplete", cypress-axe says nothing, and every case
  // above stays green without having judged a colour. This one would not.
  it('measures contrast: axe’s colour rule runs over the map, and finds text to judge', () => {
    cy.viewport(1280, 800)
    cy.visit('/il-progetto')
    cy.contains('h1', 'Il progetto')
    cy.get('.leaflet-tile-loaded').should('exist')
    settle()
    blendTilesNormally()
    cy.injectAxe()
    cy.window()
      .then((win) => win.axe.run(win.document, { runOnly: ['color-contrast'] }))
      .then((results) => {
        const errored = results.incomplete.filter((rule) => 'error' in rule)
        expect(errored, 'colour rules that threw').to.deep.equal([])
        expect(results.passes.flatMap((rule) => rule.nodes)).to.have.length.greaterThan(0)
      })
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

  // Review PR-13 (A-05): the banner runs across the map under the menu, in
  // the accent — on a phone across the strip, where the map is drawn on.
  it('the authoring form drawing on the map on a phone, with its banner', () => {
    cy.viewport(390, 844)
    cy.visit('/chiese/nuova')
    cy.contains('[role="tab"]', 'Mappa').click()
    cy.contains('[role="status"]', 'Clicca sulla mappa').should('be.visible')

    check('/chiese/nuova (mappa, telefono)')
  })

  // Review PR-13 (C-02): a collaborator's own cards, every type, behind the
  // avatar — measured with its «Nuova scheda» menu open, a new control.
  it('a collaborator’s own cards, with the menu of new ones open', () => {
    cy.viewport(1280, 800)
    cy.visit('/le-mie-schede')
    cy.contains('h1', 'Le mie schede')
    cy.contains('h2', 'Bozze')
    cy.get('button[aria-label="Nuova scheda"]').click()
    cy.contains('a', 'Itinerario').should('be.visible')

    check('/le-mie-schede')
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

  // The design pass left /polls in its v1 clothes on purpose (design.md's
  // closing note), and that changes nothing here: ADR-0005's bar is the whole
  // app, not the redesigned part of it. Style and accessibility are different
  // undertakings and this one covers everything. Measured signed in since the
  // polls went behind the login (review PR-17, reports-and-polls.md P1): in
  // the reader's block this case would measure the login form instead.
  it('the polls, a v1 surface the design pass did not redraw, a collaborator’s alone', () => {
    cy.viewport(1280, 800)
    cy.visit('/polls')
    cy.contains('h1', 'Sondaggi')

    check('/polls')
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

  // WCAG 1.4.10 (Reflow), and Luca's report on PR-11: in a quarter of the wide
  // panel the profile's 200px avatar and its display-size name ran out of
  // their column and under the reports beside them. One column now (the
  // account pages' 420px one); measured at a wide screen, at the 1024px line
  // where the wide layout starts, and on a phone: everything in the column
  // stays inside it, and nothing scrolls sideways.
  //
  // The profile's address comes from the session the block signed in with,
  // not from the avatar's menu: the case above already walks that path, and
  // a menu opened the instant a page loads is a race this case is not about.
  it('the profile keeps its avatar and its name inside its column, at every width', () => {
    cy.window()
      .then((win) => win.localStorage.getItem('user.id'))
      .then((id) => {
        expect(id, 'the signed-in user').to.match(/^[0-9a-f-]{36}$/)
        for (const [width, height] of [
          [1440, 900],
          [1024, 768],
          [390, 844],
        ] as const) {
          cy.viewport(width, height)
          cy.visit(`/profile/${id}`)
          cy.get('h1').should('not.be.empty')
          cy.get('[aria-label^="Foto profilo di"]').should('be.visible')
          cy.get('h1').then(($h1) => {
            const column = $h1
              .parents()
              .toArray()
              .find((el) => getComputedStyle(el).maxWidth === '420px')
            expect(column, `the 420px column at ${width}px`).not.to.equal(undefined)
            const edge = column!.getBoundingClientRect()
            for (const el of column!.querySelectorAll('*')) {
              const box = el.getBoundingClientRect()
              if (box.width === 0) continue
              expect(box.left, `left of ${el.tagName} at ${width}px`).to.be.at.least(edge.left - 1)
              expect(box.right, `right of ${el.tagName} at ${width}px`).to.be.at.most(
                edge.right + 1,
              )
            }
            expect(column!.scrollWidth, `the column at ${width}px`).to.be.at.most(
              column!.clientWidth,
            )
            const doc = $h1[0]!.ownerDocument.documentElement
            expect(doc.scrollWidth, `the page at ${width}px`).to.be.at.most(doc.clientWidth)
          })
        }
      })
  })

  // The profile's two forms, one column like the login (review PR-11). Only
  // visited, never sent: a new password revokes every token (TD-20), and the
  // cases after this one share the block's single sign-in.
  it('the profile form and the password form', () => {
    cy.visit('/profile/edit')
    cy.get('#editprofile-name').should('exist')
    check('/profile/edit')

    cy.visit('/profile/edit/password')
    cy.get('#editpassword-old').should('exist')
    check('/profile/edit/password')
  })

  // Cosa-fare.md Part −1 D9: the event form, on the phone it is made for,
  // with a poster attached, a point of its own being drawn on the map, and
  // the errors of a form sent too soon — every control it has, in one state.
  it('the event form on a phone, with its poster, its own point and its errors', () => {
    cy.viewport(390, 844)
    cy.visit('/eventi/nuovo')
    cy.get('#evento-poster').selectFile('cypress/fixtures/foto.jpg')
    cy.get('img[alt="La locandina scelta"]').should('be.visible')
    cy.contains('label', 'Un altro posto').click()
    cy.contains('[role="status"]', 'Clicca sulla mappa').should('exist')
    cy.contains('button', 'Salva l’evento').click()
    cy.get('[aria-invalid="true"]').should('exist')

    check('/eventi/nuovo (telefono)')
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
