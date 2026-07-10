import { useState, useMemo } from 'react'
import {
  Wrench, Plus, Search, AlertTriangle, BarChart2,
  CheckCircle2, Trash2, X, Pencil, Clock, ClipboardList,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import type { BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder,
  usePrinters,
} from '@/hooks/useData'
import type { WorkOrder, WorkOrderStatus, WorkOrderPriority } from '@/types'

const priorityVariant: Record<WorkOrderPriority, BadgeProps['variant']> = {
  high:   'destructive',
  medium: 'warning',
  low:    'success',
}

const statusColors: Record<WorkOrderStatus, string> = {
  'open':        '#ef4444',
  'in-progress': '#f59e0b',
  'scheduled':   '#3b82f6',
  'completed':   '#22c55e',
  'cancelled':   '#94a3b8',
}

interface WOForm {
  printer_id: string
  issue: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  assignee: string
  scheduled_date: string
  completed_date: string
  notes: string
}

const emptyForm = (): WOForm => ({
  printer_id: '',
  issue: '',
  priority: 'medium',
  status: 'open',
  assignee: '',
  scheduled_date: '',
  completed_date: '',
  notes: '',
})

export function Maintenance() {
  const { data: workOrders = [], isLoading } = useWorkOrders()
  const { data: printersData } = usePrinters({ per_page: 500 })
  const printers = printersData?.data ?? []

  const createWO = useCreateWorkOrder()
  const updateWO = useUpdateWorkOrder()
  const deleteWO = useDeleteWorkOrder()

  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCompletedFrom, setFilterCompletedFrom] = useState('')
  const [filterCompletedTo, setFilterCompletedTo] = useState('')
  const [rowSelection, setRowSelection] = useState<Record<number, boolean>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null)
  const [form, setForm] = useState<WOForm>(emptyForm())

  const activeFilterCount = [
    filterPriority !== 'all',
    filterStatus !== 'all',
    !!filterCompletedFrom || !!filterCompletedTo,
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilterPriority('all')
    setFilterStatus('all')
    setFilterCompletedFrom('')
    setFilterCompletedTo('')
  }

  const today = new Date(new Date().toDateString())
  today.setHours(0, 0, 0, 0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return workOrders.filter(wo => {
      if (q && !(
        wo.wo_number.toLowerCase().includes(q) ||
        wo.printer?.name?.toLowerCase().includes(q) ||
        wo.issue.toLowerCase().includes(q) ||
        (wo.assignee ?? '').toLowerCase().includes(q)
      )) return false
      if (filterPriority !== 'all' && wo.priority !== filterPriority) return false
      if (filterStatus !== 'all' && wo.status !== filterStatus) return false
      if (filterCompletedFrom && (!wo.completed_date || wo.completed_date < filterCompletedFrom)) return false
      if (filterCompletedTo && (!wo.completed_date || wo.completed_date > filterCompletedTo)) return false
      return true
    })
  }, [workOrders, search, filterPriority, filterStatus, filterCompletedFrom, filterCompletedTo])

  const selectedCount = Object.keys(rowSelection).length
  const selectedIds = Object.keys(rowSelection).map(i => filtered[Number(i)]?.id).filter(Boolean)

  const openNew = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (wo: WorkOrder) => {
    setEditTarget(wo)
    setForm({
      printer_id: String(wo.printer_id),
      issue: wo.issue,
      priority: wo.priority,
      status: wo.status,
      assignee: wo.assignee ?? '',
      scheduled_date: wo.scheduled_date ? wo.scheduled_date.slice(0, 10) : '',
      completed_date: wo.completed_date ? wo.completed_date.slice(0, 10) : '',
      notes: wo.notes ?? '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.printer_id || !form.issue.trim()) {
      toast.error('Printer and issue are required')
      return
    }
    const payload = {
      printer_id: Number(form.printer_id),
      issue: form.issue.trim(),
      priority: form.priority,
      status: form.status,
      assignee: form.assignee || null,
      scheduled_date: form.scheduled_date || null,
      completed_date: form.completed_date || null,
      notes: form.notes || null,
    }
    try {
      if (editTarget) {
        await updateWO.mutateAsync({ id: editTarget.id, data: payload })
        toast.success('Work order updated')
      } else {
        await createWO.mutateAsync(payload)
        toast.success('Work order created')
      }
      setDialogOpen(false)
    } catch {
      toast.error('Failed to save work order')
    }
  }

  const handleBulkDelete = async () => {
    await Promise.all(selectedIds.map(id => deleteWO.mutateAsync(id!)))
    setRowSelection({})
    toast.success(`${selectedIds.length} work order${selectedIds.length > 1 ? 's' : ''} deleted`)
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    workOrders.forEach(wo => { counts[wo.status] = (counts[wo.status] ?? 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({
      status: status.replace('-', '‑'), // non-breaking hyphen for display
      rawStatus: status as WorkOrderStatus,
      count,
      fill: statusColors[status as WorkOrderStatus] ?? '#94a3b8',
    }))
  }, [workOrders])

  const serviceCountData = useMemo(() => {
    return printers
      .filter(p => p.service_count > 0)
      .sort((a, b) => b.service_count - a.service_count)
      .slice(0, 6)
      .map(p => ({ name: p.name.length > 16 ? p.name.slice(0, 14) + '…' : p.name, count: p.service_count }))
  }, [printers])

  const openCount = workOrders.filter(wo => wo.status === 'open').length
  const inProgressCount = workOrders.filter(wo => wo.status === 'in-progress').length
  const completedCount = workOrders.filter(wo => wo.status === 'completed').length

  const formatDate = (d?: string) => {
    if (!d) return '–'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const isOverdue = (wo: WorkOrder) => {
    if (!wo.scheduled_date || wo.status === 'completed' || wo.status === 'cancelled') return false
    return new Date(wo.scheduled_date.slice(0, 10)) < today
  }

  if (isLoading) return (
    <div className="space-y-4">
      <div className="border-b border-border/40 pb-4 space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <Skeleton className="h-3.5 w-28" /><Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Work orders, service history and maintenance schedule</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus size={15} /> New Work Order</Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total Work Orders" value={workOrders.length} accentColor="bg-blue-500" icon={<ClipboardList size={18} />} />
        <StatCard title="Open" value={openCount} accentColor="bg-red-500" icon={<AlertTriangle size={18} />} />
        <StatCard title="In Progress" value={inProgressCount} accentColor="bg-amber-500" icon={<Clock size={18} />} />
        <StatCard title="Completed" value={completedCount} accentColor="bg-green-500" icon={<CheckCircle2 size={18} />} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 size={15} className="text-primary" /> Work Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusCounts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No work orders yet</p>
            ) : (
              <ChartContainer config={{ count: { label: 'Work Orders', color: 'var(--color-primary)' } }} className="h-[160px] w-full">
                <BarChart data={statusCounts} margin={{ top: 16, right: 8, left: 0, bottom: 4 }} barCategoryGap="35%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={6} className="text-xs capitalize" />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} tickMargin={6} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v, _, item) => [v, item.payload?.rawStatus]} />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="count" position="top" className="text-[11px] fill-muted-foreground" />
                    {statusCounts.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench size={15} className="text-amber-500" /> Service Count by Printer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceCountData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No service history recorded</p>
            ) : (
              <ChartContainer config={{ count: { label: 'Services', color: '#f59e0b' } } satisfies ChartConfig} className="h-[160px] w-full">
                <BarChart data={serviceCountData} margin={{ top: 16, right: 8, left: 0, bottom: 4 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} tickMargin={6} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="count" position="top" className="text-[11px] fill-muted-foreground" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div>
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench size={15} /> Work Orders
                <span className="ml-auto text-xs font-normal text-muted-foreground/70">{workOrders.length} records</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <input
                    placeholder="Search work orders..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-52 rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground/80 placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
                  />
                </div>
                <select
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:bg-secondary dark:text-muted-foreground"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:bg-secondary dark:text-muted-foreground"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Completed Date Range</span>
                  <input
                    type="date"
                    value={filterCompletedFrom}
                    onChange={e => setFilterCompletedFrom(e.target.value)}
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:bg-secondary dark:text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">—</span>
                  <input
                    type="date"
                    value={filterCompletedTo}
                    onChange={e => setFilterCompletedTo(e.target.value)}
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:bg-secondary dark:text-muted-foreground"
                  />
                </div>
                {(search || activeFilterCount > 0) && (
                  <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs text-muted-foreground" onClick={() => { setSearch(''); clearFilters() }}>
                    <X size={12} /> Clear
                  </Button>
                )}
              </div>

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
                          <AlertDialogTitle>Delete {selectedCount} work order{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={handleBulkDelete}>Delete</AlertDialogAction>
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
                        checked={filtered.length > 0 && selectedCount === filtered.length}
                        onCheckedChange={v => {
                          if (v) setRowSelection(Object.fromEntries(filtered.map((_, i) => [i, true])))
                          else setRowSelection({})
                        }}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>WO #</TableHead>
                    <TableHead>Printer</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {workOrders.length === 0 ? 'No work orders yet. Create one to get started.' : 'No results found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((wo, i) => (
                      <TableRow
                        key={wo.id}
                        className="h-14 hover:bg-muted/50 transition-colors border-b border-border/60 bg-white dark:border-border dark:bg-card dark:hover:bg-secondary/50"
                        data-state={rowSelection[i] ? 'selected' : undefined}
                      >
                        <TableCell className="align-middle">
                          <Checkbox checked={!!rowSelection[i]} onCheckedChange={v => setRowSelection(s => { const n = { ...s }; if (v) n[i] = true; else delete n[i]; return n })} />
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">{wo.wo_number}</span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <p className="text-sm font-medium leading-tight">{wo.printer?.name ?? '–'}</p>
                          {wo.printer?.asset_tag && (
                            <span className="text-[11px] text-muted-foreground">{wo.printer.asset_tag}</span>
                          )}
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className="text-xs text-muted-foreground max-w-[160px] block truncate">{wo.issue}</span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <Badge variant={priorityVariant[wo.priority]} className="capitalize">{wo.priority}</Badge>
                        </TableCell>
                        <TableCell className="align-middle">
                          <StatusBadge status={wo.status} />
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className={`text-xs ${isOverdue(wo) ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            {wo.scheduled_date ? formatDate(wo.scheduled_date) : '–'}
                            {isOverdue(wo) && ' (overdue)'}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          {wo.status === 'completed' ? (
                            <span className="text-xs text-green-600 font-medium dark:text-green-400">
                              {wo.completed_date ? formatDate(wo.completed_date) : '–'}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">–</span>
                          )}
                        </TableCell>
                        <TableCell className="align-middle">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(wo)}>
                            <Pencil size={13} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Edit ${editTarget.wo_number}` : 'New Work Order'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Printer <span className="text-red-500">*</span></Label>
              <Select value={form.printer_id} onValueChange={v => setForm(f => ({ ...f, printer_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select printer" /></SelectTrigger>
                <SelectContent>
                  {printers.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.asset_tag})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Issue / Description <span className="text-red-500">*</span></Label>
              <input
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-secondary"
                value={form.issue}
                onChange={e => setForm(f => ({ ...f, issue: e.target.value }))}
                placeholder="Describe the issue or task..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as WorkOrderPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as WorkOrderStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <input
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-secondary"
                value={form.assignee}
                onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                placeholder="Name or team"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Scheduled Date</Label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-secondary"
                  value={form.scheduled_date}
                  onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Completed Date</Label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-secondary"
                  value={form.completed_date}
                  onChange={e => setForm(f => ({ ...f, completed_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-secondary resize-none"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createWO.isPending || updateWO.isPending}>
              {editTarget ? 'Save Changes' : 'Create Work Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
