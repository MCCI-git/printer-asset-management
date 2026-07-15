import { Skeleton } from '@/components/ui/skeleton'
import { useState, useMemo } from 'react'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type PaginationState,
} from '@tanstack/react-table'
import { TablePagination } from '@/components/ui/table-pagination'
import { AnimatePresence, motion } from 'framer-motion'
import { Package, AlertTriangle, Search, ArrowUpDown, ShoppingCart, Download, Trash2, Plus, Pencil, Printer, Unlink } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { StatCard } from '@/components/ui/stat-card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { X } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useConsumables, useCreateConsumable, useUpdateConsumable, useDeleteConsumable, useSuppliers, usePrinters, useConsumableAssignments, useAssignConsumable, useUnassignConsumable, useUpdateAssignment } from '@/hooks/useData'
import { formatCurrency, getConsumableStockStatus } from '@/lib/utils'
import type { Consumable, ConsumableType, Supplier, ConsumableAssignment } from '@/types'
import { CONSUMABLE_STATUSES, TONER_COLORS } from '@/lib/constants'

export function Consumables() {
  const { data: rawData, isLoading } = useConsumables({ per_page: 500 })
  const createConsumable = useCreateConsumable()
  const updateConsumable = useUpdateConsumable()
  const deleteConsumable = useDeleteConsumable()
  const assignConsumable = useAssignConsumable()
  const unassignConsumable = useUnassignConsumable()
  const updateAssignment = useUpdateAssignment()
  const { data: suppliersRaw } = useSuppliers({ per_page: 500 })
  const suppliers: Supplier[] = (suppliersRaw as { data: Supplier[] } | undefined)?.data ?? []
  const { data: printersRaw } = usePrinters({ per_page: 500 })
  const printers = (printersRaw as { data: any[] } | undefined)?.data ?? []
  const { data: assignments = [] as ConsumableAssignment[] } = useConsumableAssignments()
  const fetchedConsumables: Consumable[] = (rawData as { data: Consumable[] } | undefined)?.data ?? []
  const consumables = fetchedConsumables

  const handleUnassign = async (a: ConsumableAssignment) => {
    try {
      await unassignConsumable.mutateAsync(a.id)
      toast.success('Assignment removed.')
    } catch {
      toast.error('Failed to unassign.')
    }
  }

  const [alertDismissed, setAlertDismissed] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [statusFilter, setStatusFilter] = useState('')
  const [qtyMin, setQtyMin] = useState('')
  const [qtyMax, setQtyMax] = useState('')
  const [costMin, setCostMin] = useState('')
  const [costMax, setCostMax] = useState('')

  // Edit Consumable dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Consumable | null>(null)
  const [editForm, setEditForm] = useState({
    type: 'Toner' as ConsumableType, name: '', color: '' as '' | 'Black' | 'Cyan' | 'Magenta' | 'Yellow',
    unit_cost: '', page_yield: '', quantity: '1', purchase_date: '', invoice_number: '',
    supplier_id: '__none__', printer_id: '__none__',
  })

  const openEdit = (c: Consumable) => {
    setEditTarget(c)
    setEditForm({
      type:        c.type as ConsumableType,
      name:        c.name,
      color:       (c.color ?? '') as '' | 'Black' | 'Cyan' | 'Magenta' | 'Yellow',
      unit_cost:   String(c.unit_cost),
      page_yield:  c.page_yield ? String(c.page_yield) : '',
      quantity:       String(c.quantity),
      purchase_date:  c.purchase_date ? c.purchase_date.slice(0, 10) : '',
      invoice_number: c.invoice_number ?? '',
      supplier_id:    c.supplier_id ? String(c.supplier_id) : '__none__',
      printer_id:     '__none__',
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!editTarget || !editForm.name || !editForm.unit_cost) {
      toast.error('Please fill in all required fields.')
      return
    }

    const isAssigning = editForm.printer_id !== '__none__'

    if (isAssigning && editTarget.quantity <= 0) {
      toast.error('Cannot assign — this consumable is out of stock.')
      return
    }

    try {
      // Update consumable details. When assigning, never override quantity — the assign endpoint owns that.
      await updateConsumable.mutateAsync({
        id: editTarget.id,
        data: {
          name:           editForm.name.trim(),
          type:           editForm.type,
          color:          (editForm.type === 'Toner' && editForm.color) ? editForm.color : null,
          unit_cost:      Number(editForm.unit_cost),
          page_yield:     editForm.page_yield ? Number(editForm.page_yield) : null,
          quantity:       isAssigning ? undefined : (editForm.quantity !== '' ? Number(editForm.quantity) : undefined),
          purchase_date:  editForm.purchase_date || null,
          invoice_number: editForm.invoice_number.trim() || null,
          supplier_id:    editForm.supplier_id !== '__none__' ? Number(editForm.supplier_id) : null,
        },
      })

      if (isAssigning) {
        // Assign exactly 1 unit — backend decrements quantity by 1
        await assignConsumable.mutateAsync({ consumableId: editTarget.id, printerId: Number(editForm.printer_id) })
        toast.success(`1 × ${editForm.name.trim()} assigned. Quantity: ${editTarget.quantity} → ${editTarget.quantity - 1}.`)
      }

      setEditOpen(false)
      setEditTarget(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save.')
    }
  }

  // Add Consumable popover
  const [addOpen, setAddOpen] = useState(false)
  const [typeSelectOpen, setTypeSelectOpen] = useState(false)
  const [openSelectCount, setOpenSelectCount] = useState(0)
  const onSelectOpen  = () => setOpenSelectCount(n => n + 1)
  const onSelectClose = () => setOpenSelectCount(n => Math.max(0, n - 1))
  const blockDismiss  = (e: Event) => { if (openSelectCount > 0) e.preventDefault() }
  const [addForm, setAddForm] = useState({
    type: 'Toner' as ConsumableType, name: '', color: '' as '' | 'Black' | 'Cyan' | 'Magenta' | 'Yellow',
    unit_cost: '', quantity: '1', purchase_date: new Date().toISOString().slice(0, 10), invoice_number: '',
    supplier_id: '__none__', printer_id: '__none__',
  })
  const EMPTY_ADD_FORM = {
    type: 'Toner' as ConsumableType, name: '', color: '' as '' | 'Black' | 'Cyan' | 'Magenta' | 'Yellow',
    unit_cost: '', quantity: '1', purchase_date: new Date().toISOString().slice(0, 10), invoice_number: '',
    supplier_id: '__none__', printer_id: '__none__',
  }

  const handleAddSubmit = async () => {
    if (!addForm.name || !addForm.unit_cost) {
      toast.error('Please fill in all required fields.')
      return
    }
    try {
      await createConsumable.mutateAsync({
        name:        addForm.name.trim(),
        type:        addForm.type,
        color:          (addForm.type === 'Toner' && addForm.color) ? addForm.color : undefined,
        unit_cost:      Number(addForm.unit_cost),
        quantity:       addForm.quantity !== '' ? Number(addForm.quantity) : 1,
        purchase_date:  addForm.purchase_date || undefined,
        invoice_number: addForm.invoice_number.trim() || undefined,
        low_stock_threshold: 1,
        supplier_id: addForm.supplier_id !== '__none__' ? Number(addForm.supplier_id) : null,
        printer_id:  addForm.printer_id !== '__none__' ? Number(addForm.printer_id) : null,
      })
      setAddForm(EMPTY_ADD_FORM)
      setAddOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add consumable.')
    }
  }

  const outOfStock = consumables.filter(c => c.quantity === 0)

  const filteredConsumables = useMemo(() => {
    return consumables.filter(c => {
      if (c.quantity === 0) return false
      const status = getConsumableStockStatus(c.quantity, c.low_stock_threshold)
      if (statusFilter && status !== statusFilter) return false
      if (qtyMin !== '' && c.quantity < Number(qtyMin)) return false
      if (qtyMax !== '' && c.quantity > Number(qtyMax)) return false
      if (costMin !== '' && c.unit_cost < Number(costMin)) return false
      if (costMax !== '' && c.unit_cost > Number(costMax)) return false
      return true
    })
  }, [consumables, statusFilter, qtyMin, qtyMax, costMin, costMax])

  const activeFilterCount = [statusFilter, qtyMin, qtyMax, costMin, costMax].filter(Boolean).length

  const columns = useMemo<ColumnDef<Consumable>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={v => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        accessorKey: 'sku',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            SKU <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ row }) => {
          const sku = row.original.sku
          const prefix = sku.split('-')[0]
          return <Badge variant={`consumable-${prefix}` as any} className="font-mono">{sku}</Badge>
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            Name <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <p className="font-medium text-foreground dark:text-secondary-foreground">{getValue<string>()}</p>
        ),
      },
      {
        accessorKey: 'color',
        header: 'Colour',
        cell: ({ row }) => {
          const { type, color } = row.original
          if (type !== 'Toner' || !color) return <span className="text-xs text-muted-foreground">—</span>
          const styles: Record<string, { dot: string; text: string }> = {
            Black:   { dot: 'bg-gray-800',   text: 'text-gray-800 dark:text-gray-300' },
            Cyan:    { dot: 'bg-cyan-500',    text: 'text-cyan-600 dark:text-cyan-400' },
            Magenta: { dot: 'bg-pink-500',    text: 'text-pink-600 dark:text-pink-400' },
            Yellow:  { dot: 'bg-yellow-400',  text: 'text-yellow-600 dark:text-yellow-400' },
          }
          const s = styles[color] ?? { dot: 'bg-muted', text: 'text-muted-foreground' }
          return (
            <span className={`flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.dot}`} />
              {color}
            </span>
          )
        },
      },
      {
        accessorKey: 'quantity',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            Qty <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ getValue }) => <span className="font-semibold">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'unit_cost',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            Unit Cost <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ getValue }) => <span className="text-xs">{formatCurrency(getValue<number>())}</span>,
      },
      {
        id: 'stock_status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge status={getConsumableStockStatus(row.original.quantity, row.original.low_stock_threshold)} />
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.supplier?.name ?? '–'}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            onClick={() => openEdit(row.original)}
            className="rounded p-1.5 text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Edit consumable"
          >
            <Pencil size={13} />
          </button>
        ),
      },
    ],
    [suppliers]
  )

  const table = useReactTable({
    data: filteredConsumables,
    columns,
    state: { sorting, globalFilter, rowSelection, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const selectedCount = Object.keys(rowSelection).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Consumables</h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Track toners, paper, drums and maintenance kits</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Consumable
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {!alertDismissed && outOfStock.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 dark:bg-red-900/10"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                {outOfStock.length} item{outOfStock.length > 1 ? 's' : ''} out of stock
              </p>
              <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
                {outOfStock.map(c => c.name).join(', ')} — reorder immediately
              </p>
            </div>
            <button onClick={() => setAlertDismissed(true)} className="shrink-0 text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary: 1 stat card + stock breakdown chart */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Total SKUs" value={consumables.length} accentColor="bg-blue-500" icon={<Package size={18} />} />

        {/* Stock breakdown bar chart */}
        {(() => {
          const healthy = consumables.length - outOfStock.length
          const barData = [
            { name: 'Healthy',      value: healthy,           fill: '#22c55e' },
            { name: 'Out of Stock', value: outOfStock.length, fill: '#ef4444' },
          ]
          const barConfig = {
            value: { label: 'SKUs', color: 'var(--color-primary)' },
          } satisfies ChartConfig
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" /> Stock Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barConfig} className="h-[110px] w-full">
                  <BarChart data={barData} layout="vertical" margin={{ top: 2, right: 20, left: 4, bottom: 2 }} barCategoryGap="25%">
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" tickLine={false} axisLine={false} tickMargin={4} allowDecimals={false} className="text-xs" />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={4} width={90} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [v, 'SKUs']} />} />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )
        })()}

      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package size={15} />
            Consumables Inventory
            <span className="ml-auto text-xs font-normal text-muted-foreground/70">
              {table.getFilteredRowModel().rows.length !== consumables.length
                ? `${table.getFilteredRowModel().rows.length} of ${consumables.length} records`
                : `${consumables.length} records`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative min-w-48 flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <input
                placeholder="Search consumables..."
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground/80 placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter || '__all__'} onValueChange={v => setStatusFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                {CONSUMABLE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Qty range */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Qty</span>
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={qtyMin}
                onChange={e => setQtyMin(e.target.value)}
                className="w-16 rounded-lg border border-border bg-white px-2 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={qtyMax}
                onChange={e => setQtyMax(e.target.value)}
                className="w-16 rounded-lg border border-border bg-white px-2 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
              />
            </div>

            {/* Unit Cost range */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Cost</span>
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={costMin}
                onChange={e => setCostMin(e.target.value)}
                className="w-20 rounded-lg border border-border bg-white px-2 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={costMax}
                onChange={e => setCostMax(e.target.value)}
                className="w-20 rounded-lg border border-border bg-white px-2 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
              />
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStatusFilter(''); setQtyMin(''); setQtyMax(''); setCostMin(''); setCostMax('') }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} /> Clear filters ({activeFilterCount})
              </button>
            )}
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">{selectedCount} selected</span>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <ShoppingCart size={12} /> Reorder
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5">
                      <Trash2 size={12} /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedCount} item{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={async () => {
                        const ids = table.getSelectedRowModel().rows.map(r => r.original.id)
                        await Promise.all(ids.map(id => deleteConsumable.mutateAsync(id)))
                        table.resetRowSelection()
                      }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => table.resetRowSelection()}>
                <X size={12} />
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-3 h-14 border-b border-border/40">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id}>
                    {hg.headers.map(header => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      className="h-14 hover:bg-muted/50 transition-colors border-b border-border/60 bg-white dark:border-border dark:bg-card dark:hover:bg-secondary/50"
                      data-state={row.getIsSelected() ? 'selected' : undefined}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className="align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          <TablePagination
            page={pagination.pageIndex}
            pageCount={table.getPageCount()}
            onPageChange={p => setPagination(prev => ({ ...prev, pageIndex: p }))}
            totalRows={table.getFilteredRowModel().rows.length}
            pageSize={pagination.pageSize}
            onPageSizeChange={size => setPagination({ pageIndex: 0, pageSize: size })}
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 border-t border-border/60">
            <span className="text-xs text-muted-foreground font-medium">Key:</span>
            {[
              { type: 'TON', label: 'Toner' },
              { type: 'PAP', label: 'Paper' },
              { type: 'DRM', label: 'Drum' },
              { type: 'WST', label: 'Waste' },
              { type: 'MKT', label: 'Maintenance Kit' },
            ].map(({ type, label }) => (
              <span key={type} className="flex items-center gap-1.5 text-xs">
                <Badge variant={`consumable-${type}` as any} className="font-mono">{type}</Badge>
                <span className="text-muted-foreground">— {label}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Assigned Consumables Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer size={15} />
            Assigned to Printers
            <span className="ml-auto text-xs font-normal text-muted-foreground/70">{assignments.length} records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No consumables assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60">
                  <TableHead className="text-xs font-semibold">SKU</TableHead>
                  <TableHead className="text-xs font-semibold">Name</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold">Supplier</TableHead>
                  <TableHead className="text-xs font-semibold">Printer</TableHead>
                  <TableHead className="text-xs font-semibold">Assigned Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(assignments as ConsumableAssignment[]).map(a => (
                  <TableRow key={a.id} className="h-14 border-b border-border/60 hover:bg-muted/50 transition-colors bg-white dark:bg-card dark:border-border dark:hover:bg-secondary/50">
                    <TableCell>
                      <Badge variant={`consumable-${a.consumable?.sku?.split('-')[0]}` as any} className="font-mono">{a.consumable?.sku}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground dark:text-secondary-foreground">{a.consumable?.name}</TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{a.consumable?.type}</span></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{a.consumable?.supplier?.name ?? '—'}</span></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{a.printer?.name} <span className="opacity-50">({a.printer?.asset_tag})</span></span></TableCell>
                    <TableCell>
                      <DatePicker
                        value={a.assigned_at ? new Date(a.assigned_at).toISOString().slice(0, 10) : ''}
                        onChange={async (val) => {
                          if (!val) return
                          try {
                            await updateAssignment.mutateAsync({ id: a.id, assigned_at: val })
                            toast.success('Assigned date updated.')
                          } catch {
                            toast.error('Failed to update date.')
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleUnassign(a)}
                        className="rounded p-1.5 text-muted-foreground/50 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Unassign"
                      >
                        <Unlink size={13} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Consumable Dialog */}
      <Dialog open={editOpen} onOpenChange={o => { if (!o) setEditOpen(false) }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Consumable</DialogTitle>
            <DialogDescription>Update the details for this consumable.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v as ConsumableType }))} onOpenChange={o => o ? onSelectOpen() : onSelectClose()}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Toner', 'Paper', 'Drum', 'Waste', 'Maintenance Kit'] as ConsumableType[]).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name <span className="text-destructive">*</span></Label>
              <Input id="edit-name" placeholder="e.g. Black Toner HP 12A" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cost">Unit Cost (Rs) <span className="text-destructive">*</span></Label>
              <Input id="edit-cost" type="number" min="0" step="0.01" placeholder="0.00" value={editForm.unit_cost} onChange={e => setEditForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-qty">Quantity</Label>
              <Input id="edit-qty" type="number" min="0" step="1" placeholder="1" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <DatePicker value={editForm.purchase_date} onChange={v => setEditForm(f => ({ ...f, purchase_date: v }))} toYear={new Date().getFullYear() + 1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-invoice">Invoice Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="edit-invoice" placeholder="e.g. INV-2026-0042" value={editForm.invoice_number} onChange={e => setEditForm(f => ({ ...f, invoice_number: e.target.value }))} />
            </div>
            {editForm.type === 'Toner' && (
              <>
                <div className="space-y-1.5">
                  <Label>Colour</Label>
                  <Select value={editForm.color} onValueChange={v => setEditForm(f => ({ ...f, color: v as '' | 'Black' | 'Cyan' | 'Magenta' | 'Yellow' }))} onOpenChange={o => o ? onSelectOpen() : onSelectClose()}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select colour…" /></SelectTrigger>
                    <SelectContent>
                      {TONER_COLORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-yield">Page Yield <span className="text-xs text-muted-foreground">(pages per cartridge)</span></Label>
                  <Input id="edit-yield" type="number" min="1" step="1" placeholder="e.g. 2000" value={editForm.page_yield} onChange={e => setEditForm(f => ({ ...f, page_yield: e.target.value }))} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={editForm.supplier_id} onValueChange={v => setEditForm(f => ({ ...f, supplier_id: v }))} onOpenChange={o => o ? onSelectOpen() : onSelectClose()}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a supplier…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Printer</Label>
              <Select value={editForm.printer_id} onValueChange={v => setEditForm(f => ({ ...f, printer_id: v }))} onOpenChange={o => o ? onSelectOpen() : onSelectClose()}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a printer…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {printers.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.asset_tag ? `${p.asset_tag} — ` : ''}{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={updateConsumable.isPending}>
              {updateConsumable.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Consumable Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Consumable</DialogTitle>
            <DialogDescription>Enter details for the new consumable item.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={addForm.type} onValueChange={v => setAddForm(f => ({ ...f, type: v as ConsumableType }))} onOpenChange={o => { setTypeSelectOpen(o); o ? onSelectOpen() : onSelectClose() }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['Toner', 'Paper', 'Drum', 'Waste', 'Maintenance Kit'] as ConsumableType[]).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Name <span className="text-destructive">*</span></Label>
              <Input id="add-name" placeholder="e.g. Black Toner HP 12A" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-cost">Unit Cost (Rs) <span className="text-destructive">*</span></Label>
              <Input id="add-cost" type="number" min="0" step="0.01" placeholder="0.00" value={addForm.unit_cost} onChange={e => setAddForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-qty">Quantity</Label>
              <Input id="add-qty" type="number" min="0" step="1" placeholder="1" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <DatePicker value={addForm.purchase_date} onChange={v => setAddForm(f => ({ ...f, purchase_date: v }))} toYear={new Date().getFullYear() + 1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-invoice">Invoice Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="add-invoice" placeholder="e.g. INV-2026-0042" value={addForm.invoice_number} onChange={e => setAddForm(f => ({ ...f, invoice_number: e.target.value }))} />
            </div>
            {addForm.type === 'Toner' && (
              <div className="col-span-2 space-y-1.5">
                <Label>Colour</Label>
                <Select value={addForm.color} onValueChange={v => setAddForm(f => ({ ...f, color: v as '' | 'Black' | 'Cyan' | 'Magenta' | 'Yellow' }))} onOpenChange={o => o ? onSelectOpen() : onSelectClose()}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select colour…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Black">Black</SelectItem>
                    <SelectItem value="Cyan">Cyan</SelectItem>
                    <SelectItem value="Magenta">Magenta</SelectItem>
                    <SelectItem value="Yellow">Yellow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={addForm.supplier_id} onValueChange={v => setAddForm(f => ({ ...f, supplier_id: v }))} onOpenChange={o => o ? onSelectOpen() : onSelectClose()}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a supplier…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Printer</Label>
              <Select value={addForm.printer_id} onValueChange={v => setAddForm(f => ({ ...f, printer_id: v }))} onOpenChange={o => o ? onSelectOpen() : onSelectClose()}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a printer…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {printers.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.asset_tag ? `${p.asset_tag} — ` : ''}{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => handleAddSubmit()}>Add Consumable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
