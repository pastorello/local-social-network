import type { ReportStatus } from '@/definitions/interfaces/Report'

// Pin/badge colors reflect the report status (spec F2.4). Labels in Italian (N4).
export const STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  open: { label: 'Aperta', color: '#ef4444' },
  acknowledged: { label: 'Presa in carico', color: '#3b82f6' },
  resolved: { label: 'Risolta', color: '#22c55e' },
  rejected: { label: 'Rifiutata', color: '#6b7280' },
}

// Spec F2.3: forward-only transitions, admin-side options per current status.
export const ADMIN_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  open: ['acknowledged', 'resolved', 'rejected'],
  acknowledged: ['resolved', 'rejected'],
  resolved: [],
  rejected: [],
}
