import type { ReportStatus } from '@/definitions/interfaces/Report'

// Pin/badge colors reflect the report status (spec F2.4). Labels in Italian (N4).
// Shades chosen for >=4.5:1 contrast with the white badge text (ADR-0005) —
// the lighter -500 shades this used to be read at ~2.3-3.8:1.
export const STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  open: { label: 'Aperta', color: '#b91c1c' },
  acknowledged: { label: 'Presa in carico', color: '#1d4ed8' },
  resolved: { label: 'Risolta', color: '#15803d' },
  rejected: { label: 'Rifiutata', color: '#6b7280' },
}

// Spec F2.3: forward-only transitions, admin-side options per current status.
export const ADMIN_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  open: ['acknowledged', 'resolved', 'rejected'],
  acknowledged: ['resolved', 'rejected'],
  resolved: [],
  rejected: [],
}
