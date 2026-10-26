// The C1 flow (TD-04), end to end: "Collabora con noi" is the only way an
// account is ever asked for, so it is the front door of the whole product —
// and since 2026-09-10 this file follows it through the door: request, the
// author's approval in Django admin, the invite read out of the mail, a
// password chosen, a collaborator signed in.
//
// The invite is read the way its recipient would read it. The API writes each
// message into E2E_MAIL_DIR (settings.py, DEBUG only) and the `inviteLink` task
// in cypress.config.ts finds it. That was chosen over a test-only endpoint
// handing the token back, so production code carries no door built for tests.
// Running this file locally therefore needs E2E_MAIL_DIR set, to the same
// directory, for both the API and Cypress.
// Re-running this file locally more than five times in an hour will fail with
// "Troppi tentativi": `collaborate` is throttled at 10/hour per IP (TD-18), and
// it posts twice. That is the endpoint working, not a flake. The throttle
// history lives in the API process's own LocMemCache, so restarting the API
// clears it; CI starts a fresh process each run and never sees it.
const API = 'http://127.0.0.1:8000' // the SPA's default API base (main.ts)
const PASSWORD = 'E2ePassw0rd!'
const ADMIN_EMAIL = 'amministratore@e2e.test'

// A session already on the browser when the invite is opened: a JWT-shaped
// token that expires in 2100 and that the API never signed — the same forgery
// session.cy.ts uses, and it only has to look alive to the SPA.
const PREVIOUS_SESSION =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjo0MTAyNDQ0ODAwLCJqdGkiOiJkZWFkIiwidXNlcl9pZCI6IjAifQ' +
  '.not-a-valid-signature'

// Django admin's forms carry their CSRF token in a hidden input.
const csrfFrom = (html: string) =>
  html.match(/name="csrfmiddlewaretoken" value="([^"]+)"/)?.[1] ?? ''

// The author's half, through the real admin action rather than a shortcut into
// the database: sign in to Django admin, find the request, run "Approva".
const approveAsTheAuthor = (email: string) => {
  cy.request(`${API}/admin/login/`).then(({ body }) =>
    cy.request({
      method: 'POST',
      url: `${API}/admin/login/`,
      form: true,
      body: {
        username: ADMIN_EMAIL,
        password: PASSWORD,
        csrfmiddlewaretoken: csrfFrom(body),
        next: '/admin/',
      },
    }),
  )
  const changelist = `${API}/admin/account/collaborationrequest/`
  cy.request(`${changelist}?q=${encodeURIComponent(email)}`)
    .then(({ body }) => {
      const id = body.match(/name="_selected_action" value="([^"]+)"/)?.[1]
      expect(id, 'the request is waiting in the admin').to.be.a('string')
      return cy.request({
        method: 'POST',
        url: changelist,
        form: true,
        body: {
          csrfmiddlewaretoken: csrfFrom(body),
          action: 'approve_requests',
          _selected_action: id,
          index: 0,
        },
      })
    })
    .its('body')
    .should('contain', 'richieste approvate e invito inviato')
}

describe('collabora con noi', () => {
  beforeEach(() => cy.viewport(1280, 800))

  it('tells a bot nothing: an instant submission looks exactly like a good one', () => {
    cy.visit('/collabora')

    cy.get('#collabora-name').type('Bot Veloce')
    cy.get('#collabora-email').type(`bot-${Date.now()}@e2e.test`)
    cy.get('#collabora-message').type('Sono un bot.')
    // No wait: filling the form instantly is the machine tell the timing
    // check (accounts.md A1) looks for.
    cy.contains('button', 'Invia richiesta').click()

    // The API drops it and answers as if it had stored it, on purpose — a bot
    // that can see the difference can tune itself past the check. This spec
    // pins the *visible* half of that contract; that nothing was actually
    // stored is `test_collaborate_silently_drops_a_too_fast_submission` in
    // account/tests.py, where the database is in reach.
    cy.contains('Richiesta inviata').should('exist')
    cy.location('pathname').should('equal', '/')
  })

  it('takes a request filed at human speed all the way to a collaborator who can sign in', () => {
    const email = `invito-${Date.now()}@e2e.test`
    const chosen = 'Invito-E2e-2026!'

    cy.visit('/collabora')

    cy.get('#collabora-name').type('Persona E2E')
    cy.get('#collabora-email').type(email)
    cy.get('#collabora-message').type('Vorrei scrivere le schede sulle chiese di Gaeta.')

    // A fixed wait, and the one place it is the right tool: the thing under
    // test *is* a time gate (MIN_FORM_FILL_SECONDS = 3 in account/api.py), so
    // there is no event to wait for instead. Faking the clock would not help
    // either — the comparison happens on the server, against its own time.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3200)
    cy.contains('button', 'Invia richiesta').click()

    cy.contains('Richiesta inviata').should('exist')
    cy.location('pathname').should('equal', '/')

    approveAsTheAuthor(email)

    // The link as the recipient gets it — out of the mail, not from the API —
    // opened in a browser where somebody is still signed in: the author,
    // trying the link on their own machine (spec accounts.md). Planted rather
    // than logged in, because a login costs one of the ten a minute the whole
    // run shares (TD-18); its `exp` is in 2100 so the page load keeps it
    // (TD-42), and the invite page makes no call that would test it.
    cy.task<string | null>('inviteLink', { to: email }).then((path) => {
      expect(path, 'an invite reached the mailbox').to.match(/^\/invito\/[A-Za-z0-9_-]+$/)
      cy.visit(path as string, {
        onBeforeLoad(win) {
          win.localStorage.setItem('user.access', PREVIOUS_SESSION)
          win.localStorage.setItem('user.refresh', PREVIOUS_SESSION)
          // The menu shows the account only for a session with an id.
          win.localStorage.setItem('user.id', '00000000-0000-4000-8000-000000000000')
          win.localStorage.setItem('user.name', "L'autrice")
        },
      })
    })
    // Without this the test could pass by accident: a session that died on
    // its own before the activation would prove nothing about it.
    cy.get('button[aria-label^="Il tuo account"]').should('exist')

    cy.get('#invite-password1').type(chosen)
    cy.get('#invite-password2').type(chosen)
    cy.contains('button', 'Attiva account').click()
    cy.contains('Account attivato').should('exist')
    cy.location('pathname').should('equal', '/login')

    // The previous session did not survive the handover, so what follows is
    // the new collaborator signing in as themselves, not writing as the author.
    cy.get('button[aria-label^="Il tuo account"]').should('not.exist')
    cy.window().then((win) => {
      expect(win.localStorage.getItem('user.access')).to.be.oneOf([null, ''])
      expect(win.localStorage.getItem('user.refresh')).to.be.oneOf([null, ''])
    })

    // The payoff: the account the author approved is one its owner can use.
    cy.get('#login-email').type(email)
    cy.get('#login-password').type(chosen)
    cy.contains('button', 'Accedi').click()
    // A collaborator with no draft lands on the map (lib/landing.ts), /mappa
    // since the home became the welcome page (2026-10-26).
    cy.location('pathname').should('equal', '/mappa')
    cy.get('button[aria-label^="Il tuo account"]').should('exist')
  })

  it('offers collaboration rather than signup, anywhere a visitor looks', () => {
    // v2's standing decision: an account is an invitation, not a right. The
    // menu is where a visitor would look for "Registrati": it offers Accedi,
    // and the way in for someone without an account is "Collabora con noi" —
    // on the login page and in Il progetto (design.md D14/D21).
    cy.visit('/')
    cy.contains('Registrati').should('not.exist')
    cy.get('a[href="/signup"]').should('not.exist')
    cy.get('nav[aria-label="Principale"]').contains('a', 'Accedi').click()
    cy.get('a[href="/collabora"]').should('exist')
    cy.visit('/il-progetto')
    cy.contains('a', 'Collabora con noi').should('exist')
  })
})
