import * as React from 'react'
import { cn } from '@/lib/utils'

const variantStyles: Record<string, string> = {
  success:     'bg-[#dcfce7] text-[#166534] dark:bg-[#14532d]/40 dark:text-[#86efac]',
  warning:     'bg-[#fef3c7] text-[#92400e] dark:bg-[#78350f]/40 dark:text-[#fcd34d]',
  destructive: 'bg-[#fee2e2] text-[#991b1b] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5]',
  purple:      'bg-[#f3e8ff] text-[#6b21a8] dark:bg-[#581c87]/40 dark:text-[#d8b4fe]',
  secondary:   'bg-[#e2e8f0] text-[#475569] dark:bg-[#1e293b]   dark:text-[#94a3b8]',
  draft:       'bg-[#f1f5f9] text-[#475569] dark:bg-[#1e293b]   dark:text-[#94a3b8]',
  info:        'bg-[#dbeafe] text-[#1e40af] dark:bg-[#1e3a8a]/40 dark:text-[#93c5fd]',
  default:     'bg-[#e0e7ff] text-[#3730a3] dark:bg-[#312e81]/40 dark:text-[#a5b4fc]',
  pink:        'bg-[#fce7f3] text-[#9d174d] dark:bg-[#831843]/40 dark:text-[#f9a8d4]',
  orange:      'bg-[#fef3c7] text-[#92400e] dark:bg-[#78350f]/40 dark:text-[#fcd34d]',
  teal:        'bg-[#dcfce7] text-[#166534] dark:bg-[#14532d]/40 dark:text-[#86efac]',
  outline:     'bg-transparent text-foreground border border-border',
  'role-superadmin': 'bg-[#f3e8ff] text-[#6b21a8] dark:bg-[#581c87]/40 dark:text-[#d8b4fe]',
  'role-admin':      'bg-[#dbeafe] text-[#1e40af] dark:bg-[#1e3a8a]/40 dark:text-[#93c5fd]',
  'role-reports':    'bg-[#fef3c7] text-[#92400e] dark:bg-[#78350f]/40 dark:text-[#fcd34d]',
  'role-view':       'bg-[#dcfce7] text-[#166534] dark:bg-[#14532d]/40 dark:text-[#86efac]',
  'consumable-TON':  'bg-[#dbeafe] text-[#1e40af] dark:bg-[#1e3a8a]/40 dark:text-[#93c5fd]',
  'consumable-PAP':  'bg-[#dcfce7] text-[#166534] dark:bg-[#14532d]/40 dark:text-[#86efac]',
  'consumable-DRM':  'bg-[#f3e8ff] text-[#6b21a8] dark:bg-[#581c87]/40 dark:text-[#d8b4fe]',
  'consumable-WST':  'bg-[#fee2e2] text-[#991b1b] dark:bg-[#7f1d1d]/40 dark:text-[#fca5a5]',
  'consumable-MKT':  'bg-[#fef3c7] text-[#92400e] dark:bg-[#78350f]/40 dark:text-[#fcd34d]',
}

export type BadgeVariant = keyof typeof variantStyles

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variantStyles[variant] ?? variantStyles.default,
        className
      )}
      {...props}
    />
  )
}

export const badgeVariants = (v?: BadgeVariant) =>
  cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', variantStyles[v ?? 'default'] ?? variantStyles.default)

export { Badge }
