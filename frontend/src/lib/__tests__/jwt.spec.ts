import { describe, it, expect } from 'vitest'

import { expiresSoon } from '../jwt'

// base64url, unpadded — how simplejwt writes the payload.
function tokenWith(payload: object): string {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${encoded}.signature`
}

const NOW_MS = 1_800_000_000_000
const NOW = NOW_MS / 1000

describe('expiresSoon', () => {
  it('is false for a token with time left', () => {
    expect(expiresSoon(tokenWith({ exp: NOW + 3600 }), NOW_MS)).toBe(false)
  })

  it('is true for a token already expired', () => {
    expect(expiresSoon(tokenWith({ exp: NOW - 1 }), NOW_MS)).toBe(true)
  })

  it('is true inside the last minute, so a page load refreshes up front', () => {
    expect(expiresSoon(tokenWith({ exp: NOW + 30 }), NOW_MS)).toBe(true)
  })

  it('reads a payload whose base64url uses - and _', () => {
    // "?>?" encodes to "Pz4_" and "~~~" to "fn5-": characters plain atob rejects.
    const token = tokenWith({ exp: NOW + 3600, name: '?>?~~~' })
    expect(token).toMatch(/[-_]/)
    expect(expiresSoon(token, NOW_MS)).toBe(false)
  })

  it.each([
    ['not a JWT at all', 'stored-access'],
    ['a payload that is not base64', 'a.%%%.c'],
    ['a payload without exp', tokenWith({ user_id: 'x' })],
    ['an exp that is not a number', tokenWith({ exp: 'soon' })],
  ])('treats %s as expiring', (_label, token) => {
    expect(expiresSoon(token, NOW_MS)).toBe(true)
  })
})
