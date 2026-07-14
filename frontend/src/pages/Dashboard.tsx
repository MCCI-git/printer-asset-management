import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Printer, TrendingUp, CreditCard, DollarSign, AlertTriangle,
  Package, FileText, Users, Activity, WifiOff, AlertCircle, Plus,
} from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useDashboardStats, useBudget, useUpsertBudget, useActualSpend } from '@/hooks/useData'
import { formatCurrency } from '@/lib/utils'
import { CURRENT_YEAR, yearLabel } from '@/lib/timeline'
import {
  RadialBarChart, RadialBar, PolarRadiusAxis, Label as RechartsLabel,
  BarChart, Bar, XAxis, CartesianGrid, LabelList,
} from 'recharts'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } },
}

export function Dashboard() {
  const { data: stats, isLoading, isError, refetch } = useDashboardStats()
  const [alertsOpen, setAlertsOpen] = useState<string | undefined>(undefined)

  const { data: dbBudget } = useBudget(CURRENT_YEAR)
  const { data: actualData } = useActualSpend(CURRENT_YEAR)
  const totalActual = actualData?.actual ?? 0
  const upsertBudget = useUpsertBudget()
  const opexBudget = dbBudget?.total ?? 0
  const [budgetDialog, setBudgetDialog] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const openBudgetDialog = () => {
    setBudgetInput(String(opexBudget || ''))
    setBudgetDialog(true)
  }

  const saveBudget = async () => {
    const val = Number(budgetInput)
    if (isNaN(val) || val < 0) return
    await upsertBudget.mutateAsync({ year: CURRENT_YEAR, type: 'total', amount: val })
    setBudgetDialog(false)
  }

  React.useEffect(() => {
    if (stats) setAlertsOpen(stats.critical_alerts.length > 0 ? 'alerts' : undefined)
  }, [!!stats])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Page header */}
        <div className="border-b border-border/40 pb-4 space-y-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        {/* Chart row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mx-auto h-44 w-44 rounded-full" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm lg:col-span-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-44 w-full rounded-lg" />
          </div>
        </div>
        {/* Budget + quick stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError || !stats?.printers) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <AlertCircle size={40} className="text-destructive/60" />
      <div>
        <p className="font-semibold text-foreground">Dashboard failed to load</p>
        <p className="text-sm text-muted-foreground mt-1">The server returned an error. Check that the backend is running and the database is reachable.</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
    </div>
  )

  const pieConfig = {
    capex: { label: 'CAPEX', color: 'var(--color-primary)' },
    opex:  { label: 'OPEX',  color: '#f59e0b' },
  } satisfies ChartConfig


  const capexOpexData = [
    { name: 'CAPEX', value: stats.printers.capex,  fill: 'var(--color-primary)' },
    { name: 'OPEX',  value: stats.printers.opex,   fill: '#f59e0b' },
  ]

  const alertIcons: Record<string, React.ReactNode> = {
    printer_offline:   <WifiOff size={15} className="text-red-500" />,
    printer_error:     <AlertCircle size={15} className="text-amber-500" />,
    contract_expiring: <FileText size={15} className="text-blue-500" />,
    consumable:        <Package size={15} className="text-purple-500" />,
  }


  return (
    <div className="space-y-6">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Printer Asset Management · ITIL 4 Aligned</p>
      </div>

      {/* Alerts Section */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <Accordion
          type="single"
          collapsible
          value={alertsOpen}
          onValueChange={v => setAlertsOpen(v)}
        >
          <AccordionItem
            value="alerts"
            className={`border-none rounded-lg transition-all ${alertsOpen === 'alerts' ? 'bg-card shadow-sm border border-border' : ''}`}
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:text-muted-foreground">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className={stats.critical_alerts.length > 0 ? 'text-red-500' : 'text-muted-foreground'} />
                <span className="text-sm font-semibold">Alerts</span>
                {stats.critical_alerts.length > 0 ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {stats.critical_alerts.length}
                  </span>
                ) : (
                  <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">All systems normal</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {stats.critical_alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6">
                  <AlertTriangle size={28} strokeWidth={1.5} className="text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">No active alerts</p>
                  <p className="text-xs text-muted-foreground">Everything is running smoothly.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.critical_alerts.map((alert: import('@/types').CriticalAlert, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-3 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 dark:bg-red-900/10"
                    >
                      <div className="mt-0.5 shrink-0">{alertIcons[alert.type] ?? <AlertCircle size={15} className="text-amber-500" />}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">{alert.title}</p>
                        <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">{alert.description}</p>
                      </div>
                      <span className="shrink-0 text-xs text-red-500 dark:text-red-400">{alert.time}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>

      {/* Charts + Stats row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column: Fleet Breakdown + Yearly Budget stacked */}
        <div className="flex flex-col gap-4">
        {/* Radial stacked chart */}
        <Card className="flex flex-col max-h-[220px]">
          <CardHeader className="items-center py-1">
            <CardTitle>Fleet Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 items-center py-0 -mb-14">
            <ChartContainer config={pieConfig} className="mx-auto aspect-square w-full max-w-[220px]">
              <RadialBarChart data={[{ capex: stats.printers.capex, opex: stats.printers.opex }]} endAngle={180} innerRadius={75} outerRadius={105}>
                <RadialBar dataKey="opex" stackId="a" cornerRadius={5} fill="#f59e0b" className="stroke-transparent stroke-2" />
                <RadialBar dataKey="capex" stackId="a" cornerRadius={5} fill="var(--color-primary)" className="stroke-transparent stroke-2" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <RechartsLabel
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 14} className="fill-foreground text-2xl font-bold">
                              {stats.printers.total}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 4} className="fill-muted-foreground text-xs">
                              Printers
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </PolarRadiusAxis>
              </RadialBarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Yearly Budget (OPEX) — inside left column */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
            <div className="pl-3 py-3 pr-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Yearly Budget (OPEX)</p>
                  <p className="mt-1 text-2xl font-bold">{opexBudget ? formatCurrency(opexBudget) : '—'}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {opexBudget ? `${((totalActual / opexBudget) * 100).toFixed(1)}% spent · ${(Math.max(0, (opexBudget - totalActual) / opexBudget) * 100).toFixed(1)}% remaining` : 'No budget set'}
                  </p>
                </div>
                <div className="shrink-0 rounded-lg bg-muted p-2.5 text-muted-foreground"><DollarSign size={18} /></div>
              </div>
              <div className="mt-3">
                {opexBudget ? (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted dark:bg-secondary">
                    <div className={`h-full rounded-full transition-all ${(totalActual / opexBudget) >= 0.9 ? 'bg-red-500' : (totalActual / opexBudget) >= 0.75 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (totalActual / opexBudget) * 100).toFixed(1)}%` }} />
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        </motion.div>
        </div>{/* end left column */}

        {/* Monthly Print Volume — bar chart with labels */}
        {(() => {
          const volumeData: { month: string; pages: number }[] = stats.monthly_print_volume ?? []
          const totalPages = volumeData.reduce((s, d) => s + d.pages, 0)
          const peakMonth  = volumeData.reduce((best, d) => d.pages > best.pages ? d : best, { month: '—', pages: 0 })
          const volConfig = { pages: { label: 'Pages', color: 'var(--color-primary)' } } satisfies ChartConfig
          return (
            <Card className="lg:col-span-2">
              <CardHeader className="py-3">
                <CardTitle>Monthly Print Volume</CardTitle>
                <CardDescription className="text-xs">
                  Total pages printed per month · {CURRENT_YEAR} · {totalPages.toLocaleString()} pages YTD
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <ChartContainer config={volConfig} className="h-[240px] w-full">
                  <BarChart data={volumeData} margin={{ top: 20, left: 4, right: 4 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} className="text-xs" />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(v) => [Number(v).toLocaleString(), 'Pages']} />} />
                    <Bar dataKey="pages" fill="var(--color-primary)" radius={8}>
                      <LabelList position="top" offset={8} className="fill-foreground text-[10px]" formatter={(v: number) => v > 0 ? v.toLocaleString() : ''} />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Quick stats footer */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Contracts Tracked" value={stats.contracts.total} subtitle={`${stats.contracts.expiring_30_days} expiring soon`} accentColor="bg-blue-500" icon={<FileText size={18} />} />
        <StatCard title="Suppliers" value={stats.suppliers.total} subtitle={`YTD: ${formatCurrency(stats.suppliers.ytd_spend)}`} accentColor="bg-purple-500" icon={<Users size={18} />} />
        <StatCard title="Consumables" value={`${stats.consumables.total} SKUs`} subtitle={`${stats.consumables.out_of_stock} out of stock`} accentColor="bg-amber-500" icon={<Package size={18} />} />
        <StatCard title="Maintenance" value={stats.printers.maintenance} subtitle="units under service" accentColor="bg-red-500" icon={<Activity size={18} />} />
      </div>

      {/* Set Budget Dialog */}
      <Dialog open={budgetDialog} onOpenChange={o => { if (!o) setBudgetDialog(false) }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Set Yearly Budget (OPEX)</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="budget-input">Allocated Budget (Rs)</Label>
            <Input
              id="budget-input"
              type="number"
              min="0"
              placeholder="e.g. 150000"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveBudget()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialog(false)}>Cancel</Button>
            <Button onClick={saveBudget} disabled={upsertBudget.isPending}>
              {upsertBudget.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
