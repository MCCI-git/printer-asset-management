import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  accentColor?: string
  trend?: { value: string; positive: boolean }
  className?: string
  children?: ReactNode
}

export function StatCard({ title, value, subtitle, icon, accentColor = 'bg-blue-500', trend, className, children }: StatCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="h-full">
      <Card className={cn('relative h-full overflow-hidden', className)}>
        <div className={cn('absolute left-0 top-0 h-full w-1', accentColor)} />
        <div className="pl-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{subtitle}</p>}
              {trend && (
                <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-emerald-600' : 'text-red-500')}>
                  {trend.positive ? '↑' : '↓'} {trend.value}
                </p>
              )}
            </div>
            {icon && <div className="shrink-0 rounded-lg bg-muted p-2.5 text-muted-foreground">{icon}</div>}
          </div>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </Card>
    </motion.div>
  )
}
