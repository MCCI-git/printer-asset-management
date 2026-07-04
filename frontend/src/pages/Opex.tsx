import { Skeleton } from '@/components/ui/skeleton'
import { TablePagination } from '@/components/ui/table-pagination'
import { Printer as PrinterIcon, CreditCard, Calculator, TrendingDown, Activity, Download, Trash2, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { usePrinters, useDeletePrinter } from '@/hooks/useData'
import { formatCurrency } from '@/lib/utils'
import type { Printer } from '@/types'

export function Opex() {
  const { data, isLoading } = usePrinters({ cost_type: 'OPEX' })
  const printers: Printer[] = data?.data ?? []
  const deletePrinter = useDeletePrinter()
  const [pages, setPages] = useState([10000])
  const [rowSelection, setRowSelection] = useState<Record<number, boolean>>({})
  const selectedCount = Object.keys(rowSelection).length
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const pageCount = Math.ceil(printers.length / pageSize)
  const pagedPrinters = printers.slice(page * pageSize, (page + 1) * pageSize)

  const monthlyPages = pages[0]

  const totalMonthly = printers.reduce((s, p) => s + (p.monthly_fixed_cost ?? 0), 0)
  const perPagePrinters = printers.filter(p => p.per_page_cost)
  const avgPerPage =
    perPagePrinters.reduce((s, p) => s + (p.per_page_cost ?? 0), 0) /
    (perPagePrinters.length || 1)

  const totalProjected =
    totalMonthly + avgPerPage * monthlyPages * perPagePrinters.length

  const projectionData = useMemo(() => {
    const points = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    return points.map(pct => {
      const p = Math.round((pct / 100) * 100000)
      return {
        pages: `${pct}k`,
        cost: totalMonthly + avgPerPage * p * perPagePrinters.length,
        current: p === monthlyPages ? totalProjected : undefined,
      }
    })
  }, [totalMonthly, avgPerPage, perPagePrinters.length, monthlyPages, totalProjected])

  const projConfig = {
    cost: { label: 'Monthly Cost', color: '#f59e0b' },
  } satisfies ChartConfig

  if (isLoading) return (
    <div className="space-y-4">
      <div className="border-b border-border/40 pb-4 space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
          <div className="p-4 border-b border-border/40"><Skeleton className="h-4 w-32" /></div>
          <div className="p-4 space-y-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 h-14 border-b border-border/40">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-4 w-24 ml-auto" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-xl font-bold text-foreground">OPEX Assets</h1>
        <p className="text-sm text-muted-foreground">
          Operating expenditure printers — leased/managed print with recurring costs
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total OPEX Printers" value={printers.length} accentColor="bg-amber-500" icon={<PrinterIcon size={18} />} />
        <StatCard title="Monthly Fixed Cost" value={`${formatCurrency(totalMonthly)}/mo`} accentColor="bg-orange-500" icon={<CreditCard size={18} />} />
        <StatCard title="Avg. Cost per Page" value={`Rs ${avgPerPage.toFixed(3)}`} accentColor="bg-yellow-500" icon={<Activity size={18} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard size={15} className="text-amber-500" />
              OPEX Printers
              <span className="ml-auto text-xs font-normal text-muted-foreground/70">{printers.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">{selectedCount} selected</span>
                <div className="ml-auto flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5">
                        <Trash2 size={12} /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedCount} printer{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={async () => {
                          const selectedIds = Object.keys(rowSelection).map(i => pagedPrinters[Number(i)]?.id).filter(Boolean)
                          await Promise.all(selectedIds.map(id => deletePrinter.mutateAsync(id!)))
                          setRowSelection({})
                        }}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRowSelection({})}>
                  <X size={12} />
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={printers.length > 0 && selectedCount === printers.length}
                      onCheckedChange={v => {
                        if (v) setRowSelection(Object.fromEntries(printers.map((_, i) => [i, true])))
                        else setRowSelection({})
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Monthly Cost</TableHead>
                  <TableHead>Avg. Cost per Page</TableHead>
                  <TableHead>Annual Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedPrinters.map((p, i) => (
                  <TableRow key={p.id} className="h-14 hover:bg-muted/50 transition-colors border-b border-border/60 bg-white dark:border-border dark:bg-card dark:hover:bg-secondary/50" data-state={rowSelection[i] ? 'selected' : undefined}>
                    <TableCell className="align-middle">
                      <Checkbox checked={!!rowSelection[i]} onCheckedChange={v => setRowSelection(s => { const n = { ...s }; if (v) n[i] = true; else delete n[i]; return n })} aria-label="Select row" />
                    </TableCell>
                    <TableCell className="align-middle">
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{p.asset_tag}</span>
                    </TableCell>
                    <TableCell className="align-middle"><p className="font-medium">{p.name}</p></TableCell>
                    <TableCell className="align-middle">{p.monthly_fixed_cost ? formatCurrency(p.monthly_fixed_cost) : '–'}</TableCell>
                    <TableCell className="align-middle">{p.per_page_cost ? `Rs ${p.per_page_cost}` : '–'}</TableCell>
                    <TableCell className="align-middle">{p.monthly_fixed_cost ? formatCurrency(p.monthly_fixed_cost * 12) : '–'}</TableCell>
                    <TableCell className="align-middle"><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

          <TablePagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalRows={printers.length}
            pageSize={pageSize}
            onPageSizeChange={size => { setPageSize(size); setPage(0) }}
          />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
