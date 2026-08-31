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
      })
    },
  },
})
