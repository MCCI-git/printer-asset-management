import { useState } from 'react'
import {
  BarChart3, FileDown, CreditCard, Package, Building2, Wrench,
  Activity, Receipt, ChevronDown, Loader2, Search, History,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { TablePagination } from '@/components/ui/table-pagination'
import { usePrinters, useConsumables, useSuppliers, useAllBudgets, useContracts, useActivityLogs } from '@/hooks/useData'
import {
  exportAssetInventory, exportOpexMonthly, exportConsumableUsage,
  exportSupplierSpend, exportMaintenanceHistory, exportOpexYtd,
} from '@/lib/exportReport'
import { activityLogsApi } from '@/services/api'
import { toast } from 'sonner'
import type { Printer, Consumable, Supplier, Contract } from '@/types'

type Format = 'csv' | 'pdf'
type ReportKey = 'asset' | 'opex-monthly' | 'consumable' | 'supplier' | 'maintenance' | 'opex-ytd'

const reportTypes: { key: ReportKey; title: string; icon: React.ElementType; desc: string; color: string; accent: string }[] = [
  { key: 'asset',        title: 'Asset Inventory Report',  icon: BarChart3,  desc: 'Full printer asset list with status, location and assignments',         color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',           accent: 'border-l-blue-500'    },
  { key: 'opex-monthly', title: 'OPEX Monthly Report',     icon: CreditCard, desc: 'Monthly managed print costs and per-page cost analysis',                color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',        accent: 'border-l-amber-500'   },
  { key: 'consumable',   title: 'Consumable Usage Report', icon: Package,    desc: 'Stock levels, reorder alerts and consumable cost tracking',             color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',  accent: 'border-l-emerald-500' },
  { key: 'supplier',     title: 'Supplier Spend Report',   icon: Building2,  desc: 'YTD spend by supplier vs budget with performance ratings',              color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',     accent: 'border-l-orange-500'  },
  { key: 'maintenance',  title: 'Maintenance History',     icon: Wrench,     desc: 'Service history, overdue assets and repair vs replace analysis',        color: 'text-muted-foreground bg-muted/50 dark:bg-secondary',    accent: 'border-l-slate-400'   },
  { key: 'opex-ytd',    title: 'OPEX Report (YTD)',        icon: Receipt,    desc: 'Full OPEX position: contracts, managed print costs and budget forecast', color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',     accent: 'border-l-violet-500'  },
]

const actionVariant: Record<string, 'default' | 'destructive' | 'warning' | 'success' | 'outline'> = {
  created:    'success',
  updated:    'default',
  deleted:    'destructive',
  assigned:   'warning',
  unassigned: 'outline',
  completed:  'success',
}

const modelTypeColors: Record<string, string> = {
  Printer:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Consumable: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  WorkOrder:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Contract:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Supplier:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Budget:     'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
}

export function Reports() {
  const [loading, setLoading] = useState<string | null>(null)

  // Activity log filters
  const [logPage, setLogPage]           = useState(0)
  const [logPageSize]                   = useState(20)
  const [logSearch, setLogSearch]       = useState('')
  const [logModelType, setLogModelType] = useState('all')
  const [logAction, setLogAction]       = useState('all')
  const [logDateFrom, setLogDateFrom]   = useState('')
  const [logDateTo, setLogDateTo]       = useState('')
  const [exportingLog, setExportingLog] = useState(false)

  const { data: printersData }    = usePrinters({ per_page: 1000 })
  const { data: consumablesData } = useConsumables({ per_page: 1000 })
  const { data: suppliersData }   = useSuppliers({ per_page: 1000 })
  const { data: budgets = [] }    = useAllBudgets()
  const { data: contractsData }   = useContracts({ per_page: 1000 })

  const printers:    Printer[]    = printersData?.data    ?? []
  const consumables: Consumable[] = consumablesData?.data ?? []
  const suppliers:   Supplier[]   = suppliersData?.data   ?? []
  const contracts:   Contract[]   = contractsData?.data   ?? []

  const logParams: Record<string, unknown> = {
    page:     logPage + 1,
    per_page: logPageSize,
    ...(logSearch    && { search:     logSearch }),
    ...(logModelType !== 'all' && { model_type: logModelType }),
    ...(logAction    !== 'all' && { action:     logAction }),
    ...(logDateFrom  && { date_from:  logDateFrom }),
    ...(logDateTo    && { date_to:    logDateTo }),
  }

  const { data: logsData, isLoading: logsLoading } = useActivityLogs(logParams)
  const logs       = logsData?.data       ?? []
  const logTotal   = logsData?.total      ?? 0
  const logPageCnt = logsData?.last_page  ?? 1

  async function handleExport(key: ReportKey, format: Format) {
    setLoading(`${key}-${format}`)
    try {
      switch (key) {
        case 'asset':        exportAssetInventory(format, printers);                                  break
        case 'opex-monthly': exportOpexMonthly(format, printers);                                     break
        case 'consumable':   exportConsumableUsage(format, consumables);                               break
        case 'supplier':     exportSupplierSpend(format, suppliers);                                   break
        case 'maintenance':  exportMaintenanceHistory(format, printers);                               break
        case 'opex-ytd':     exportOpexYtd(format, contracts, budgets, printers, consumables);         break
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleExportLog() {
    setExportingLog(true)
    try {
      const params: Record<string, unknown> = {
        ...(logModelType !== 'all' && { model_type: logModelType }),
        ...(logAction    !== 'all' && { action:     logAction }),
        ...(logDateFrom  && { date_from: logDateFrom }),
        ...(logDateTo    && { date_to:   logDateTo }),
      }
      const res = await activityLogsApi.export(params)
      const url  = URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href  = url
      link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export activity log')
    } finally {
      setExportingLog(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Generate reports and view the full activity history</p>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reportTypes.map(r => {
          const Icon = r.icon
          const isLoading = loading?.startsWith(r.key)
          return (
            <Card key={r.key} className={`border-l-4 ${r.accent} cursor-pointer transition-shadow hover:shadow-md`}>
              <div className={`inline-flex rounded-lg p-2.5 ${r.color}`}>
                <Icon size={18} />
              </div>
              <h3 className="mt-3 font-semibold text-foreground dark:text-secondary-foreground">{r.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground/70 leading-relaxed">{r.desc}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">Preview</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1" disabled={!!isLoading}>
                      {isLoading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                      Export <ChevronDown size={11} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport(r.key, 'pdf')}>Export as PDF</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport(r.key, 'csv')}>Export as CSV</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={15} className="text-blue-500" /> Activity Log
            <span className="ml-auto text-xs font-normal text-muted-foreground/70">{logTotal} records</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <input
                placeholder="Search descriptions, records, users..."
                value={logSearch}
                onChange={e => { setLogSearch(e.target.value); setLogPage(0) }}
                className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none dark:bg-secondary"
              />
            </div>

            <Select value={logModelType} onValueChange={v => { setLogModelType(v); setLogPage(0) }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Printer">Printer</SelectItem>
                <SelectItem value="Consumable">Consumable</SelectItem>
                <SelectItem value="WorkOrder">Work Order</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Supplier">Supplier</SelectItem>
                <SelectItem value="Budget">Budget</SelectItem>
              </SelectContent>
            </Select>

            <Select value={logAction} onValueChange={v => { setLogAction(v); setLogPage(0) }}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={logDateFrom}
                onChange={e => { setLogDateFrom(e.target.value); setLogPage(0) }}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-secondary"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={logDateTo}
                onChange={e => { setLogDateTo(e.target.value); setLogPage(0) }}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-secondary"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="ml-auto gap-1.5"
              onClick={handleExportLog}
              disabled={exportingLog}
            >
              {exportingLog ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              Export CSV
            </Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No activity recorded yet. Actions you take in the app will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => (
                  <TableRow key={log.id} className="h-12 hover:bg-muted/50 border-b border-border/60 bg-white dark:border-border dark:bg-card dark:hover:bg-secondary/50">
                    <TableCell className="align-middle text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="align-middle text-xs text-muted-foreground">
                      {formatTime(log.created_at)}
                    </TableCell>
                    <TableCell className="align-middle text-xs font-medium">
                      {log.user_name ?? 'System'}
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant={actionVariant[log.action] ?? 'default'} className="capitalize text-[11px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${modelTypeColors[log.model_type] ?? 'bg-muted text-muted-foreground'}`}>
                        {log.model_type}
                      </span>
                    </TableCell>
                    <TableCell className="align-middle text-xs font-medium max-w-[140px] truncate">
                      {log.model_label}
                    </TableCell>
                    <TableCell className="align-middle text-xs text-muted-foreground max-w-[300px]">
                      {log.description}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            page={logPage}
            pageCount={logPageCnt}
            onPageChange={setLogPage}
            totalRows={logTotal}
            pageSize={logPageSize}
            onPageSizeChange={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  )
}
