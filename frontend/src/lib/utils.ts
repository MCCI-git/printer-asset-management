import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'Rs') {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function daysUntil(dateStr: string) {
  const target = new Date(dateStr)
  const today = new Date()
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    retired: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    lost: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    deployed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'in stock': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'out of stock': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return map[status.toLowerCase()] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
}

export function getConsumableStockStatus(qty: number, _threshold: number) {
  if (qty === 0) return 'out of stock'
  return 'in stock'
}

export function getRoleColor(role: string) {
  const map: Record<string, string> = {
    'super-admin': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    reports: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    view: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }
  return map[role] ?? 'bg-slate-100 text-slate-600'
}
