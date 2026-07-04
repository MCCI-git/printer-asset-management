import { Badge } from '@/components/ui/badge'
import type { BadgeProps } from '@/components/ui/badge'

// Colors match wireframe badge-status definitions exactly
const statusMap: Record<string, BadgeProps['variant']> = {
  active:           'success',   // #dcfce7 / #166534
  deployed:         'success',
  healthy:          'success',
  approved:         'success',
  completed:        'success',
  paper:            'success',
  'in stock':       'success',
  'in-stock':       'success',

  'in-progress':    'warning',   // #fef3c7 / #92400e
  pending:          'warning',
  maintenance:      'warning',
  drum:             'warning',

  lost:             'destructive', // #fee2e2 / #991b1b
  inactive:         'destructive',
  rejected:         'destructive',
  cancelled:        'destructive',
  expired:          'destructive',
  'out of stock':   'destructive',
  'out-of-stock':   'destructive',
  critical:         'destructive',
  urgent:           'destructive',

  locked:           'purple',    // #f3e8ff / #6b21a8
  disposed:         'purple',

  retired:          'secondary', // #e2e8f0 / #475569
  draft:            'secondary',
  cancelled2:       'secondary',

  scheduled:        'info',      // #dbeafe / #1e40af
  info:             'info',
  toner:            'info',
  capex:            'info',
  routine:          'info',

  opex:             'orange',
}

export function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase()
  const variant = statusMap[key] ?? 'outline'
  const label = status?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return <Badge variant={variant}>{label}</Badge>
}
