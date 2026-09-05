// The three flows that were v1's whole product — filing a report on the map,
// supporting one, voting in a poll — and the last named gap in TD-04's
// register. They are covered now rather than earlier for the reason the
// roadmap gives: coverage follows the redesign by one step, and
// `ReportDetailView` was redrawn on 2026-08-31.
//
// One login for the file, not one per test: the endpoint allows 10/min per IP
// (TD-18) and the suite already spends six. `cy.session` is not the way to do
// that here — refresh rotation with a blacklist means a restored snapshot
// replays a spent token — so the browser session is simply kept alive with
// `testIsolation: false`, exactly as the a11y spec does.
const EMAIL = 'collaboratore@e2e.test'
const PASSWORD = 'E2ePassw0rd!'

// `seed_e2e`'s fixtures. The report is authored by the *admin* account, so
// supporting it is the ordinary act it is meant to be rather than a citizen
// upvoting himself (which the API does allow, deliberately).
const OTHER_REPORT = 'Segnalazione E2E di un altro cittadino'
const OPEN_POLL = 'Sondaggio E2E aperto'
const POLL_OPTION = 'Lungomare Caboto'

// Gaeta, near enough for a pin. The manual-coordinate path is not a
// convenience for the test: it is the keyboard alternative to clicking the map
// (WCAG 2.1.1) that HomeView offers, so covering it covers something a reader
// actually depends on. The click path is exercised by the pin assertions.
const LAT = '41.2172'
const LNG = '13.5625'

const uniqueTitle = () => `Segnalazione E2E ${Date.now()}`

describe('the v1 flows', { testIsolation: false }, () => {
  before(() => {
    cy.viewport(1280, 800)
    cy.visit('/login')
    cy.get('#login-email').type(EMAIL)
    cy.get('#login-password').type(PASSWORD, { log: false })
    cy.contains('button', 'Accedi').click()
    cy.contains('button', 'Esci').should('exist')
  })

  it('files a report from the map and finds it on the map afterwards', () => {
    const title = uniqueTitle()

    // The map's own fetch, waited on twice: once for the page's, once for the
    // reload `onReportSaved` triggers. Asserting on what the SPA asked the API
    // for beats hard-coding the API's origin in a spec.
    cy.intercept('GET', '**/api/reports/map/**').as('pins')

    cy.visit('/')
    cy.wait('@pins')
    cy.contains('button', 'Segnala un problema').click()

    // Placing mode is on: the panel asks for a point before it offers a form.
    cy.contains('Clicca sulla mappa nel punto del problema.').should('exist')
    cy.get('#report-title').should('not.exist')

    cy.get('#report-manual-lat').type(LAT)
    cy.get('#report-manual-lng').type(LNG)
    cy.contains('button', 'Usa queste coordinate').click()

    cy.get('#report-title').type(title)
    cy.get('#report-description').type('Descrizione scritta dal test end-to-end.')
    cy.get('#report-category').select(1)
    cy.contains('button', 'Invia segnalazione').click()

    // The panel returns to its resting state, which is how the SPA says the
    // report was accepted.
    cy.contains('button', 'Segnala un problema').should('exist')

    // And it really is on the map: the pins the map redraws itself from now
    // carry it, which a form that merely cleared itself would not prove.
    cy.wait('@pins')
      .its('response.body')
      .then((pins: { title: string }[]) => {
        expect(pins.map((pin) => pin.title)).to.include(title)
      })
  })

  it("supports somebody else's report, and takes the support back", () => {
    // Reached the way a reader reaches it: through the map's own pins, which
    // is also how the redesigned home links to this screen.
    cy.intercept('GET', '**/api/reports/map/**').as('pins')
    cy.visit('/')

    cy.wait('@pins')
      .its('response.body')
      .then((pins: { id: string; title: string }[]) => {
        const pin = pins.find((candidate) => candidate.title === OTHER_REPORT)
        expect(pin, `the "${OTHER_REPORT}" fixture`).to.not.equal(undefined)

        cy.visit(`/reports/${pin!.id}`)
        cy.contains('h1', OTHER_REPORT)

        // Spec F2.7: it is a toggle, and the count is the thing a reader sees.
        cy.contains('button', '0 sostegni').should('have.attr', 'aria-pressed', 'false')
        cy.contains('button', '0 sostegni').click()
        cy.contains('button', '1 sostegno').should('have.attr', 'aria-pressed', 'true')

        // A reload proves the server kept it, not just the component.
        cy.reload()
        cy.contains('button', '1 sostegno').should('have.attr', 'aria-pressed', 'true')

        cy.contains('button', '1 sostegno').click()
        cy.contains('button', '0 sostegni').should('have.attr', 'aria-pressed', 'false')
      })
  })

  it('votes in a poll and only then sees the results', () => {
    cy.visit('/polls')
    // Scoped to this poll's own card: `PanelBox` is the only `div.bg-surface`
    // between the question and the page, and the page may hold other polls.
    cy.contains('h2', OPEN_POLL).closest('div.bg-surface').as('poll')

    // F3.3: results stay hidden until this reader has voted.
    //
    // This is also the assertion that fails first if the suite is re-run
    // against a database nobody re-seeded: the vote from the previous run is
    // still there, so the results are already visible. `seed_e2e` clears it —
    // running the suite twice without running the seed twice is the mistake,
    // not the app.
    cy.get('@poll').should('not.contain', 'voti totali')
    cy.get('@poll').should('not.contain', 'voto totale')

    cy.get('@poll').contains('label', POLL_OPTION).find('input[type="radio"]').check()
    cy.get('@poll').contains('button', 'Vota').click()

    cy.get('@poll').should('contain', 'il tuo voto')
    cy.get('@poll').should('contain', '1 voto totale')

    // F3.2: the vote is final — there is no second one to cast.
    cy.get('@poll').contains('button', 'Vota').should('not.exist')
    cy.get('@poll').find('input[type="radio"]').should('not.exist')
  })
})
