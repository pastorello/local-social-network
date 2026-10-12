import { describe, it, expect } from 'vitest'

import { ADMIN_TRANSITIONS } from '../reportStatus'

// The buttons an admin is offered on a report are this map; the API refuses
// anything else (reports/tests.py has the same edges written out). Written
// out here too rather than imported, for the same reason: a test that read its
// expectations from the map it tests would agree with any typo in it (TD-47).
const LEGAL = [
  'open→acknowledged',
  'open→resolved',
  'open→rejected',
  'acknowledged→resolved',
  'acknowledged→rejected',
]

describe('ADMIN_TRANSITIONS (spec F2.3)', () => {
  it('offers exactly the transitions the API allows, rejected included', () => {
    const edges = Object.entries(ADMIN_TRANSITIONS).flatMap(([source, targets]) =>
      targets.map((target) => `${source}→${target}`),
    )
    expect(edges.sort()).toEqual([...LEGAL].sort())
  })

  it('leaves the two terminal states with nothing to offer', () => {
    expect(ADMIN_TRANSITIONS.resolved).toEqual([])
    expect(ADMIN_TRANSITIONS.rejected).toEqual([])
  })
})
