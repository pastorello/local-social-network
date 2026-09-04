import { describe, it, expect } from 'vitest'

import { parseZodObject, CollaborateForm, InviteAcceptForm } from '../user'

describe('parseZodObject', () => {
  it('attributes a mismatch to the box that has to be corrected', () => {
    const result = parseZodObject(InviteAcceptForm, {
      password1: 'password123',
      password2: 'password456',
    })

    // The message belongs to the confirmation field, which is where it is now
    // rendered — under that input, and announced with it (ADR-0005). It used
    // to be one line in a list at the foot of the form, carrying the field's
    // label as a prefix because nothing else said which box it meant.
    expect(result.fieldErrors).toEqual({
      password2: ['Le due password non corrispondono.'],
    })
    // Nothing without a field of its own: the form-level list stays empty.
    expect(result.errors).toEqual([])
    // TD-31 and spec N4, unchanged: a raw field name never reaches the reader.
    expect(JSON.stringify(result.fieldErrors)).not.toContain('password2 ')
  })

  it('keeps two failing fields apart', () => {
    const result = parseZodObject(CollaborateForm, {
      email: 'non-una-email',
      name: 'M',
      message: 'Vorrei collaborare con voi.',
    })

    expect(Object.keys(result.fieldErrors).sort()).toEqual(['email', 'name'])
    expect(result.fieldErrors.email?.length).toBeGreaterThan(0)
    expect(result.fieldErrors.name?.length).toBeGreaterThan(0)
  })

  it('returns the parsed data when everything is valid', () => {
    const result = parseZodObject(CollaborateForm, {
      email: 'a@example.com',
      name: 'Mario',
      message: 'Vorrei raccontare le feste patronali della città.',
    })

    expect(result.errors).toEqual([])
    expect(result.fieldErrors).toEqual({})
    expect(result.data?.email).toBe('a@example.com')
  })
})
