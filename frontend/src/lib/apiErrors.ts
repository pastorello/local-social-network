// Turns a spec §8 error body ({detail, fields?}) into a flat list of messages
// to show in a form. fields values can be nested (e.g. per-option errors).
const flatten = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flatten)
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(flatten)
  return []
}

const errorBody = (error: unknown) =>
  (error as { response?: { data?: { detail?: unknown; fields?: unknown } } }).response?.data

/**
 * The same body, kept *per field* instead of flattened.
 *
 * `extractApiErrors` throws the field names away, which is why every form has
 * shown one undifferentiated list at the bottom — and why a screen-reader user
 * had no way to know which input a message belonged to (one of the three items
 * ADR-0005 deferred). Forms that wire errors to inputs use this; the flat list
 * below still carries whatever has no field of its own.
 */
export function extractFieldErrors(error: unknown): Record<string, string[]> {
  const fields = errorBody(error)?.fields
  if (fields === null || typeof fields !== 'object') return {}

  return Object.fromEntries(
    Object.entries(fields as Record<string, unknown>)
      .map(([field, value]) => [field, flatten(value)] as const)
      .filter(([, messages]) => messages.length > 0),
  )
}

/** Messages with no field of their own: `detail`, plus DRF's non_field_errors. */
export function extractFormErrors(error: unknown): string[] {
  const data = errorBody(error)
  const nonField = extractFieldErrors(error).non_field_errors ?? []

  if (nonField.length > 0) return nonField
  if (typeof data?.detail === 'string') return [data.detail]
  if (Object.keys(extractFieldErrors(error)).length > 0) return []
  return ['Si è verificato un errore. Riprova.']
}

export function extractApiErrors(error: unknown): string[] {
  const data = (error as { response?: { data?: { detail?: unknown; fields?: unknown } } }).response
    ?.data

  if (data?.fields) {
    const messages = flatten(data.fields)
    if (messages.length > 0) return messages
  }
  if (typeof data?.detail === 'string') return [data.detail]
  return ['Si è verificato un errore. Riprova.']
}
