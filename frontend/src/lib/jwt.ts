// Reads a JWT's `exp` to decide *when* to refresh — a scheduling decision, not
// a trust one: the signature is never checked here, because the server checks
// it on every request and a wrong guess only costs a round trip. A token whose
// payload cannot be read counts as expiring, which is the old behaviour.

// A page load whose token has less than this left refreshes up front rather
// than letting its first request meet a 401.
const MARGIN_SECONDS = 60

export function expiresSoon(token: string, nowMs: number = Date.now()): boolean {
  try {
    const payload = token.split('.')[1]
    if (!payload) return true
    const { exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof exp !== 'number') return true
    return exp - MARGIN_SECONDS <= nowMs / 1000
  } catch {
    return true
  }
}
