import { useState } from 'react'
import { format } from 'date-fns'
import { BookOpen, DollarSign, TrendingUp, PiggyBank, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { formatCurrency } from '@/lib/utils'
import { useBudget, useUpsertBudget, useAllBudgets, useActualSpend, useBudgetBreakdown } from '@/hooks/useData'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart'

const yearChartConfig = {
  budget: { label: 'Budget',       color: 'var(--color-primary)' },
  actual: { label: 'Actual Spend', color: '#f59e0b' },
} satisfies ChartConfig

export function Budget() {
  const currentYear = new Date().getFullYear()

  const { data: dbBudget } = useBudget(currentYear)
  const upsertBudget = useUpsertBudget()
  const { data: allBudgets = [] } = useAllBudgets()
  const { data: actualData } = useActualSpend(currentYear)
  const { data: breakdownData } = useBudgetBreakdown(currentYear)
  const categoryData = breakdownData?.categories ?? []

  const totalBudgeted = dbBudget?.total ?? 0
  const totalActual = actualData?.actual ?? 0

  const [dialogOpen, setDialogOpen] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')

  const openDialog = () => {
    setBudgetInput(String(totalBudgeted || ''))
    setStartDateInput(dbBudget?.start_date ?? '')
    setEndDateInput(dbBudget?.end_date ?? '')
    setDialogOpen(true)
  }

  const saveBudget = async () => {
    const budgetVal = Number(budgetInput)
    if (isNaN(budgetVal) || budgetVal < 0) return
    if (startDateInput && endDateInput && endDateInput < startDateInput) return
    await upsertBudget.mutateAsync({
      year: currentYear,
      type: 'total',
      amount: budgetVal,
      start_date: startDateInput || undefined,
      end_date: endDateInput || undefined,
    })
    setDialogOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Budget</h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">
          FY {currentYear} budget vs actual spend tracking
          {dbBudget?.start_date && dbBudget?.end_date && (
            <> · {format(new Date(dbBudget.start_date), 'dd MMM yyyy')} – {format(new Date(dbBudget.end_date), 'dd MMM yyyy')}</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Budget" value={formatCurrency(totalBudgeted)} accentColor="bg-blue-500" icon={<DollarSign size={18} />}>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={openDialog}>
            <Plus size={11} /> Set Budget
          </Button>
        </StatCard>
        <StatCard
          title="Total Spent"
          value={formatCurrency(totalActual)}
          accentColor="bg-purple-500"
          icon={<TrendingUp size={18} />}
          subtitle={`${((totalActual / totalBudgeted) * 100).toFixed(1)}% of budget used`}
        >
          {(() => {
            const pct = Math.min(100, (totalActual / totalBudgeted) * 100)
            const indicatorClassName = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
            return <Progress value={pct} className="h-1.5" indicatorClassName={indicatorClassName} />
          })()}
        </StatCard>
        <StatCard
          title="Remaining"
          value={formatCurrency(totalBudgeted - totalActual)}
          accentColor="bg-emerald-500"
          icon={<PiggyBank size={18} />}
          subtitle={`${(((totalBudgeted - totalActual) / totalBudgeted) * 100).toFixed(1)}% of budget available`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Year-over-year budget area chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" /> Budget Over the Years
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allBudgets.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No budget history yet. Set a budget to start tracking.
              </div>
            ) : (
              <>
                <ChartContainer config={yearChartConfig} className="h-[220px] w-full">
                  <AreaChart data={allBudgets} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={6} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={6} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(v, name) => [formatCurrency(Number(v)), name === 'budget' ? 'Budget' : 'Actual Spend']}
                          labelFormatter={(label, payload) => {
                            const row = payload?.[0]?.payload as { start_date?: string; end_date?: string } | undefined
                            if (row?.start_date && row?.end_date) {
                              return `${label} (${format(new Date(row.start_date), 'dd MMM yyyy')} – ${format(new Date(row.end_date), 'dd MMM yyyy')})`
                            }
                            return label
                          }}
                        />
                      }
                    />
                    <Area dataKey="budget" type="monotone" stroke="var(--color-primary)" strokeWidth={2} fill="url(#budgetGrad)" dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
                    <Area dataKey="actual" type="monotone" stroke="#f59e0b" strokeWidth={2} fill="url(#actualGrad)" dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ChartContainer>
                <div className="mt-2 flex items-center gap-4 justify-center text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />Budget</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />Actual Spend</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Breakdown table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={15} /> Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
                No spend data yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {categoryData.map(row => {
                  const hasBudget = row.budgeted > 0
                  const pct       = hasBudget ? (row.actual / row.budgeted) * 100 : 0
                  const remaining = row.budgeted - row.actual
                  return (
                    <div key={row.category} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground dark:text-secondary-foreground">{row.category}</p>
                        </div>
                        {hasBudget ? (
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {remaining < 0 ? '-' : '+'}{formatCurrency(Math.abs(remaining))}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-muted-foreground">{formatCurrency(row.actual)}</p>
                        )}
                      </div>
                      {hasBudget && <Progress value={pct} className="mt-1.5 h-1.5" />}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) setDialogOpen(false) }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Set Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="total-budget-input">Allocated Budget (Rs) — {currentYear}</Label>
              <Input
                id="total-budget-input"
                type="number"
                min="0"
                placeholder="e.g. 270000"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveBudget()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <DatePicker value={startDateInput} onChange={setStartDateInput} placeholder="Start" />
              </div>
              <div className="space-y-1.5">
                <Label>Finish Date</Label>
                <DatePicker value={endDateInput} onChange={setEndDateInput} placeholder="Finish" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveBudget} disabled={upsertBudget.isPending}>
              {upsertBudget.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
