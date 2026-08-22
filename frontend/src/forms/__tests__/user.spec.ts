import { describe, it, expect } from 'vitest'

import { parseZodObject, CollaborateForm, InviteAcceptForm } from '../user'

describe('parseZodObject', () => {
  it('labels the field in Italian instead of printing its raw name', () => {
    const result = parseZodObject(InviteAcceptForm, {
      password1: 'password123',
      password2: 'password456',
    })

    // This used to render literally "password2 Le due password non corrispondono"
    // — a raw field name in the middle of Italian UI copy (TD-31, spec N4).
    expect(result.errors).toEqual(['Conferma password: Le due password non corrispondono'])
    expect(result.errors.join()).not.toContain('password2')
  })

  it('keeps enough context to tell two failing fields apart', () => {
    const result = parseZodObject(CollaborateForm, {
      email: 'non-una-email',
      name: 'M',
      message: 'Vorrei collaborare con voi.',
    })

    expect(result.errors.some((e) => e.startsWith('E-mail:'))).toBe(true)
    expect(result.errors.some((e) => e.startsWith('Nome:'))).toBe(true)
  })

  it('returns the parsed data when everything is valid', () => {
    const result = parseZodObject(CollaborateForm, {
      email: 'a@example.com',
      name: 'Mario',
      message: 'Vorrei raccontare le feste patronali della città.',
    })

    expect(result.errors).toEqual([])
    expect(result.data?.email).toBe('a@example.com')
  })
})
