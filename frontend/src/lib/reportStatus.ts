import type { ReportStatus } from '@/definitions/interfaces/Report'
import { readToken } from './tokens'

// Labels in Italian (N4). The colour is no longer stored here: it lives in
// assets/main.css with the rest of the palette (spec/design.md D8), and this
// module reads it back for the pin fills and badges that need a real colour
// string. The shades themselves are unchanged — ADR-0005 picked them for
// >=4.5:1 against the white badge text, and the lighter -500 shades this
// replaced measured ~2.3-3.8:1.
export const STATUS_META: Record<ReportStatus, { label: string; token: string; fallback: string }> =
  {
    open: { label: 'Aperta', token: '--color-status-open', fallback: '#b91c1c' },
    acknowledged: {
      label: 'Presa in carico',
      token: '--color-status-acknowledged',
      fallback: '#1d4ed8',
    },
    resolved: { label: 'Risolta', token: '--color-status-resolved', fallback: '#15803d' },
    rejected: { label: 'Rifiutata', token: '--color-status-rejected', fallback: '#6b7280' },
  }

export const statusColor = (status: ReportStatus): string => {
  const meta = STATUS_META[status]
  return readToken(meta.token, meta.fallback)
}

// Spec F2.3: forward-only transitions, admin-side options per current status.
export const ADMIN_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  open: ['acknowledged', 'resolved', 'rejected'],
  acknowledged: ['resolved', 'rejected'],
  resolved: [],
  rejected: [],
}
