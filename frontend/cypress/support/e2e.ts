// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// The WCAG 2.1 AA gate (ADR-0005). `cy.injectAxe()`/`cy.checkA11y()` come from
// here, so a11y.cy.ts declares what to check rather than how.
import 'cypress-axe'

import { OSM_TILE_URL } from '../../src/lib/osm'

// OpenStreetMap's tile usage policy forbids headless bots, and every route
// draws the map under it (design.md D13), so without this every spec would
// fetch real tiles from headless Electron — the Lighthouse job blocks them for
// the same reason (lighthouserc.yml). Each tile is answered here, before it
// leaves the runner, with a transparent 1×1 PNG: a successful load as far as
// Leaflet can tell, so the map behaves as it does for a reader, minus the
// picture. No spec asserts on a tile. The pattern is the map's own URL with
// {z}/{x}/{y} as wildcards, so a new tile host moves this with it.
//
// Intercepts are cleared before every test, and a spec's own `before()` runs
// ahead of every `beforeEach`, so a sign-in there is not covered by this — the
// guarantee that nothing leaves is `blockHosts` in cypress.config.ts.
beforeEach(() => {
  cy.intercept(OSM_TILE_URL.replace(/\{\w+\}/g, '*'), { fixture: 'tile.png' })
})
