// Turns a spec §8 error body ({detail, fields?}) into a flat list of messages
// to show in a form. fields values can be nested (e.g. per-option errors).
const flatten = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flatten)
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(flatten)
  return []
}

export function extractApiErrors(error: unknown): string[] {
  const data = (error as { response?: { data?: { detail?: unknown; fields?: unknown } } })
    .response?.data

  if (data?.fields) {
    const messages = flatten(data.fields)
    if (messages.length > 0) return messages
  }
  if (typeof data?.detail === 'string') return [data.detail]
  return ['Si è verificato un errore. Riprova.']
}
