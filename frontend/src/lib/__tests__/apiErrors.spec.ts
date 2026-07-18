import { describe, it, expect } from 'vitest'

import { extractApiErrors } from '../apiErrors'

const asAxiosError = (data: unknown) => ({ response: { data } })

describe('extractApiErrors', () => {
  it('flattens field errors, including nested per-option errors', () => {
    const error = asAxiosError({
      detail: 'Dati non validi.',
      fields: {
        question: ['La domanda è obbligatoria.'],
        options: { '1': ['Questo campo non può essere omesso.'] },
      },
    })

    const messages = extractApiErrors(error)

    expect(messages).toContain('La domanda è obbligatoria.')
    expect(messages).toContain('Questo campo non può essere omesso.')
  })

  it('falls back to detail when there are no field errors', () => {
    const error = asAxiosError({ detail: 'Il sondaggio è chiuso.' })

    expect(extractApiErrors(error)).toEqual(['Il sondaggio è chiuso.'])
  })

  it('returns a generic message for network errors', () => {
    expect(extractApiErrors(new Error('Network Error'))).toEqual([
      'Si è verificato un errore. Riprova.',
    ])
  })
})
