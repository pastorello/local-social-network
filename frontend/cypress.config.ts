import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'cypress'
import type { Result } from 'axe-core'

export default defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:4173',
    setupNodeEvents(on) {
      on('task', {
        // axe's findings are objects, and a failing assertion alone says only
        // "3 violations". In CI the browser console belongs to nobody, so the
        // detail has to reach the terminal or the gate is unactionable.
        a11yViolations({ label, violations }: { label: string; violations: Result[] }) {
          const rows = violations.map((violation) => ({
            rule: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.length,
            help: violation.help,
          }))
          console.log(`\n  WCAG violations on ${label}:`)
          console.table(rows)
          for (const violation of violations) {
            for (const node of violation.nodes) {
              console.log(`  [${violation.id}] ${node.target.join(' ')}`)
              console.log(`      ${node.failureSummary?.replace(/\n/g, '\n      ')}`)
            }
          }
          return null
        },
        // The invite journey (collabora.cy.ts) reads its link out of the mail,
        // the way its recipient would. The API writes each message into
        // E2E_MAIL_DIR (settings.py, DEBUG only); this finds the newest one
        // addressed to `to` and returns the SPA path it links to. Only the
        // path: the link's host is FRONTEND_URL (:5173), and the suite runs
        // against the preview on :4173.
        inviteLink({ to }: { to: string }) {
          const dir = process.env.E2E_MAIL_DIR
          if (!dir) {
            throw new Error('E2E_MAIL_DIR is not set: the API and Cypress must share one directory')
          }
          const newest = readdirSync(dir)
            .map((name) => join(dir, name))
            .map((path) => ({ mtime: statSync(path).mtimeMs, text: readFileSync(path, 'utf8') }))
            .filter((message) => message.text.includes(`To: ${to}`))
            .sort((a, b) => b.mtime - a.mtime)[0]
          if (!newest) return null
          // Quoted-printable wraps long lines with a trailing "=". Undo that
          // first, or a longer FRONTEND_URL would split the link in two.
          const body = newest.text.replace(/=\r?\n/g, '')
          return body.match(/\/invito\/[A-Za-z0-9_-]+/)?.[0] ?? null
        },
      })
    },
  },
})
