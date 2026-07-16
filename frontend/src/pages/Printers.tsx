import React, { useState, useMemo, useCallback } from 'react'
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
import { Search, Plus, Printer, MoreVertical, ArrowUpDown, Download, Archive, Trash2, X, GaugeCircle, Trash } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePrinters, useDeletePrinter, useUpdatePrinter, usePageCounts, useCreatePageCount, useDeletePageCount, usePrinterConsumables, useConsumableAssignments } from '@/hooks/useData'
import { useQueryClient } from '@tanstack/react-query'
import { printersApi, topAccessApi } from '@/services/api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { PRINTER_STATUSES, COST_TYPES, COLOR_CAPABILITIES } from '@/lib/constants'
import { CURRENT_YEAR } from '@/lib/timeline'
import type { Printer as PrinterType, PrinterPageCount } from '@/types'
import { DatePicker } from '@/components/ui/date-picker'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="break-words text-xs text-foreground">{value}</div>
    </div>
  )
}

const LOG_TYPE_LABELS: Record<string, string> = {
  toner_change: 'Toner Change',
  monthly_audit: 'Monthly Audit',
  manual: 'Manual',
}
const LOG_TYPE_COLORS: Record<string, string> = {
  toner_change: 'text-amber-600 dark:text-amber-400',
  monthly_audit: 'text-indigo-600 dark:text-indigo-400',
  manual: 'text-muted-foreground',
}

function PageCountRow({ log, onDelete }: { log: PrinterPageCount; onDelete: () => void }) {
  const countCell = <span className="w-20 shrink-0 break-words font-medium">{log.count.toLocaleString()}</span>
  const dateCell = (
    <span className="w-24 shrink-0 break-words text-xs text-muted-foreground">
      {new Date(log.logged_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
    </span>
  )
  const typeCell = (
    <span className={`w-24 shrink-0 text-xs font-medium ${LOG_TYPE_COLORS[log.log_type] ?? 'text-muted-foreground'}`}>
      {LOG_TYPE_LABELS[log.log_type] ?? log.log_type}
    </span>
  )
  const deleteButton = (extraClassName: string) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className={`ml-auto shrink-0 pl-2 text-muted-foreground/50 hover:text-destructive transition-colors ${extraClassName}`}>
          <Trash size={13} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this log entry?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently remove the page count record. This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (!log.notes) {
    return (
      <div className="flex min-w-0 items-start rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
        <span className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
          {countCell}
          {dateCell}
          {typeCell}
        </span>
        <span className="w-3.5 shrink-0" />
        {deleteButton('')}
      </div>
    )
  }

  return (
    <AccordionItem value={String(log.id)} className="min-w-0 rounded-md border-b-0 px-2 hover:bg-muted/50">
      <div className="flex min-w-0 items-start">
        <AccordionTrigger className="min-w-0 flex-1 border-0 py-1.5 hover:no-underline [&_svg]:size-3.5">
          <span className="flex min-w-0 flex-wrap items-start gap-2 text-sm">
            {countCell}
            {dateCell}
            {typeCell}
          </span>
        </AccordionTrigger>
        {deleteButton('pt-1.5')}
      </div>
      <AccordionContent className="min-w-0 pb-2 pl-0 text-xs text-muted-foreground break-words whitespace-normal">
        {log.notes}
      </AccordionContent>
    </AccordionItem>
  )
}

export function Printers() {
  const [search, setSearch] = useState('')
  const [costType, setCostType] = useState('')
  const [status, setStatus] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const queryClient   = useQueryClient()
  const deletePrinter = useDeletePrinter()
  const updatePrinter = useUpdatePrinter()

  // Show Details dialog state
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState<PrinterType | null>(null)
  const [detailsYear, setDetailsYear] = useState(CURRENT_YEAR)

  const openDetails = useCallback((printer: PrinterType) => {
    setDetailsTarget(printer)
    setDetailsYear(CURRENT_YEAR)
    setDetailsOpen(true)
  }, [])

  const { data: detailsPageCounts = [] } = usePageCounts(detailsTarget?.id ?? null)
  const { data: detailsConsumables = [] } = usePrinterConsumables(detailsTarget?.id ?? null)
  const { data: allAssignments = [] } = useConsumableAssignments()
  const detailsAssignments = allAssignments.filter(a => a.printer_id === detailsTarget?.id)

  const tonerCostPerPage = useMemo(() => {
    const toner = detailsConsumables.find(c => c.type === 'Toner' && c.unit_cost > 0 && (c as any).page_yield > 0)
    if (!toner || !(toner as any).page_yield) return null
    return toner.unit_cost / (toner as any).page_yield
  }, [detailsConsumables])

  // Lifetime total — all logs ever recorded for this printer
  const lifetimePageCount = useMemo(() =>
    detailsPageCounts.reduce((s, l) => s + l.count, 0),
  [detailsPageCounts])

  // Annual total — only logs for the selected year
  const annualPageCount = useMemo(() =>
    detailsPageCounts
      .filter(l => new Date(l.logged_at).getFullYear() === detailsYear)
      .reduce((s, l) => s + l.count, 0),
  [detailsPageCounts, detailsYear])

  // Years that have page count data for this printer
  const detailsPageCountYears = useMemo(() => {
    const years = new Set<number>()
    years.add(CURRENT_YEAR)
    for (const log of detailsPageCounts) {
      years.add(new Date(log.logged_at).getFullYear())
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [detailsPageCounts])

  const monthlyPageCountData = useMemo(() => {
    const months: { key: string; label: string; value: number; cost: number | null }[] = []
    for (let month = 0; month <= 11; month++) {
      months.push({
        key: `${detailsYear}-${month}`,
        label: new Date(detailsYear, month, 1).toLocaleDateString('en-US', { month: 'short' }),
        value: 0,
        cost: null,
      })
    }
    const byKey = new Map(months.map(m => [m.key, m]))

    for (const log of detailsPageCounts) {
      const d = new Date(log.logged_at)
      if (d.getFullYear() !== detailsYear) continue
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const bucket = byKey.get(key)
      if (bucket) bucket.value += log.count
    }

    if (tonerCostPerPage !== null) {
      for (const m of months) {
        m.cost = m.value > 0 ? parseFloat((m.value * tonerCostPerPage).toFixed(2)) : null
      }
    }

    return months
  }, [detailsPageCounts, tonerCostPerPage, detailsYear])

  // Edit Printer dialog state
  const [editOpen, setEditOpen]   = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editTarget, setEditTarget] = useState<PrinterType | null>(null)
  const [editForm, setEditForm] = useState({
    name: '', model: '', manufacturer: '', model_number: '',
    color_capability: '' as '' | 'mono' | 'colour', ip_address: '',
    department: '', cost_type: 'CAPEX' as 'CAPEX' | 'OPEX',
    status: 'active' as string, assigned_to: '',
    last_service_date: '', next_service_date: '',
    purchase_cost: '', purchase_date: '', monthly_fixed_cost: '', per_page_cost: '', contract_start_date: '',
  })

  const openEdit = useCallback((printer: PrinterType) => {
    setEditTarget(printer)
    setEditForm({
      name:             printer.name             ?? '',
      model:            printer.model            ?? '',
      manufacturer:     printer.manufacturer     ?? '',
      model_number:     printer.model_number     ?? '',
      color_capability: printer.color_capability ?? '',
      ip_address:       printer.ip_address       ?? '',
      department:       printer.department       ?? '',
      cost_type:        (printer.cost_type as 'CAPEX' | 'OPEX') ?? 'CAPEX',
      status:           printer.status           ?? 'active',
      assigned_to:      printer.assigned_to      ?? '',
      last_service_date: printer.last_service_date ?? '',
      next_service_date: printer.next_service_date ?? '',
      purchase_cost:        printer.purchase_cost      ? String(printer.purchase_cost)      : '',
      purchase_date:        printer.cost_type === 'CAPEX' && printer.purchase_date ? printer.purchase_date.slice(0, 10) : '',
      monthly_fixed_cost:   printer.monthly_fixed_cost ? String(printer.monthly_fixed_cost) : '',
      per_page_cost:        printer.per_page_cost      ? String(printer.per_page_cost)      : '',
      contract_start_date:  printer.cost_type === 'OPEX' && printer.purchase_date ? printer.purchase_date.slice(0, 10) : '',
    })
    setEditError('')
    setEditOpen(true)
  }, [])

  const sanitize = (val: string) => val.replace(/<[^>]*>/g, '').trim()

  const handleEditSave = async () => {
    if (!editTarget) return
    const name = sanitize(editForm.name)
    if (!name) { setEditError('Name is required.'); return }
    if (name.length > 255) { setEditError('Name must be 255 characters or fewer.'); return }
    setEditSaving(true)
    setEditError('')
    try {
      await updatePrinter.mutateAsync({
        id: editTarget.id,
        data: {
          name,
          model:             sanitize(editForm.model),
          manufacturer:      sanitize(editForm.manufacturer),
          model_number:      sanitize(editForm.model_number),
          color_capability:  editForm.color_capability || undefined,
          ip_address:        sanitize(editForm.ip_address) || undefined,
          department:        sanitize(editForm.department),
          cost_type:          editForm.cost_type,
          status:             editForm.status,
          assigned_to:        sanitize(editForm.assigned_to),
          last_service_date:  editForm.last_service_date || null,
          next_service_date:  editForm.next_service_date || null,
          purchase_cost:      editForm.cost_type === 'CAPEX' && editForm.purchase_cost ? Number(editForm.purchase_cost) : null,
          purchase_date:      editForm.cost_type === 'CAPEX' && editForm.purchase_date ? editForm.purchase_date : (editForm.cost_type === 'OPEX' && editForm.contract_start_date ? editForm.contract_start_date : null),
          monthly_fixed_cost: editForm.cost_type === 'OPEX' && editForm.monthly_fixed_cost ? Number(editForm.monthly_fixed_cost) : null,
          per_page_cost:      editForm.cost_type === 'OPEX' && editForm.per_page_cost ? Number(editForm.per_page_cost) : null,
        },
      })
      setEditOpen(false)
    } catch (err: any) {
      const errors = err?.response?.data?.errors
      setEditError(errors ? Object.values(errors).flat().join(' ') : (err?.response?.data?.message ?? 'Failed to save changes.'))
    } finally {
      setEditSaving(false)
    }
  }

  // Page Count dialog state
  const [pcOpen, setPcOpen] = useState(false)
  const [pcTarget, setPcTarget] = useState<PrinterType | null>(null)
  const [pcCount, setPcCount] = useState('')
  const [pcDate, setPcDate] = useState(new Date().toISOString().slice(0, 10))
  const [pcLogType, setPcLogType] = useState<'toner_change' | 'monthly_audit' | 'manual'>('manual')
  const [pcNotes, setPcNotes] = useState('')

  const { data: pageCounts = [] } = usePageCounts(pcTarget?.id ?? null)
  const createPageCount = useCreatePageCount(pcTarget?.id ?? null)
  const deletePageCount = useDeletePageCount(pcTarget?.id ?? null)
  const cumulativePageCount = useMemo(
    () => pageCounts.reduce((sum, log) => sum + log.count, 0),
    [pageCounts]
  )

  const openPageCount = useCallback((printer: PrinterType) => {
    setPcTarget(printer)
    setPcCount('')
    setPcDate(new Date().toISOString().slice(0, 10))
    setPcLogType('manual')
    setPcNotes('')
    setPcOpen(true)
  }, [])

  const handlePcSave = async () => {
    const val = Number(pcCount)
    if (!pcCount || isNaN(val) || val < 0) return
    await createPageCount.mutateAsync({ count: val, logged_at: pcDate, log_type: pcLogType, notes: pcNotes || undefined })
    setPcCount('')
    setPcLogType('manual')
    setPcNotes('')
  }

  // Add Printer dialog state
  const [addOpen, setAddOpen]           = useState(false)
  const [addSaving, setAddSaving]       = useState(false)
  const [addError, setAddError]         = useState('')
  const [form, setForm] = useState({
    name:               '',
    model:              '',
    manufacturer:       '',
    model_number:       '',
    color_capability:   '' as '' | 'mono' | 'colour',
    ip_address:         '',
    department:         '',
    cost_type:          'CAPEX' as 'CAPEX' | 'OPEX',
    status:             'active' as string,
    assigned_to:        '',
    last_service_date:  '',
    next_service_date:  '',
    purchase_cost:        '',
    purchase_date:        '',
    monthly_fixed_cost:   '',
    per_page_cost:        '',
    contract_start_date:  '',
  })

  const setField = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const ASSET_TAG_RULES = {
    CAPEX: { prefix: 'IT', regex: /^IT\d{5}$/, hint: 'ITxxxxx (e.g. IT00001)', prefixLen: 2 },
    OPEX:  { prefix: 'OP',  regex: /^OP\d{5}$/,  hint: 'OPxxxxx (e.g. OP00001)',   prefixLen: 2 },
  }

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errs: Record<string, string> = {}
    const name = sanitize(form.name)
    const model = sanitize(form.model)
    const dept = sanitize(form.department)
    const assignedTo = sanitize(form.assigned_to)

    if (!name) {
      errs.name = 'Name is required.'
    } else if (name.length > 255) {
      errs.name = 'Name must be 255 characters or fewer.'
    }

    if (model && model.length > 255) errs.model = 'Model must be 255 characters or fewer.'
    if (dept && dept.length > 255) errs.department = 'Department must be 255 characters or fewer.'
    if (assignedTo && assignedTo.length > 255) errs.assigned_to = 'Assigned To must be 255 characters or fewer.'

    return errs
  }

  const handleAddPrinter = async () => {
    const errs = validateForm()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setAddSaving(true)
    setAddError('')
    try {
      const created = await printersApi.create({
        name:               sanitize(form.name),
        model:              sanitize(form.model),
        manufacturer:       sanitize(form.manufacturer),
        model_number:       sanitize(form.model_number),
        color_capability:   form.color_capability || undefined,
        ip_address:         sanitize(form.ip_address) || undefined,
        department:         sanitize(form.department),
        cost_type:          form.cost_type,
        status:             form.status,
        assigned_to:        sanitize(form.assigned_to),
        last_service_date:  form.last_service_date || null,
        next_service_date:  form.next_service_date || null,
        purchase_cost:      form.cost_type === 'CAPEX' && form.purchase_cost ? Number(form.purchase_cost) : null,
        purchase_date:      form.cost_type === 'CAPEX' && form.purchase_date ? form.purchase_date : (form.cost_type === 'OPEX' && form.contract_start_date ? form.contract_start_date : null),
        monthly_fixed_cost: form.cost_type === 'OPEX' && form.monthly_fixed_cost ? Number(form.monthly_fixed_cost) : null,
        per_page_cost:      form.cost_type === 'OPEX' && form.per_page_cost ? Number(form.per_page_cost) : null,
      })
      queryClient.invalidateQueries({ queryKey: ['printers'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setAddOpen(false)

      // Capture ip before resetting form
      const addedIp = sanitize(form.ip_address)
      const newPrinterId = created.data?.id
      setForm({ name: '', model: '', manufacturer: '', model_number: '', color_capability: '', ip_address: '', department: '', cost_type: 'CAPEX', status: 'active', assigned_to: '', last_service_date: '', next_service_date: '', purchase_cost: '', purchase_date: '', monthly_fixed_cost: '', per_page_cost: '', contract_start_date: '' })

      // Fire SNMP fetch for the new printer if it has an IP
      if (addedIp && newPrinterId) {
        topAccessApi.refreshOne(newPrinterId).then(res => {
          if (!res.data?.success) {
            toast.warning('Fetching unavailable on this printer', { description: 'SNMP is not reachable on the provided IP address.' })
          }
          queryClient.invalidateQueries({ queryKey: ['printers'], exact: false })
          queryClient.refetchQueries({ queryKey: ['printers'], exact: false })
        }).catch(() => {
          toast.warning('Fetching unavailable on this printer', { description: 'SNMP is not reachable on the provided IP address.' })
          queryClient.refetchQueries({ queryKey: ['printers'], exact: false })
        })
      }
    } catch (err: any) {
      const errors = err?.response?.data?.errors
      if (errors) {
        setAddError(Object.values(errors).flat().join(' '))
      } else {
        setAddError(err?.response?.data?.message ?? 'Failed to add printer.')
      }
    } finally {
      setAddSaving(false)
    }
  }

  const handleDelete = useCallback(async (id: number) => {
    await deletePrinter.mutateAsync(id)
    if (pcTarget?.id === id) setPcTarget(null)
  }, [deletePrinter, pcTarget])

  const handleBulkDelete = useCallback(async (selectedPrinters: PrinterType[]) => {
    await Promise.all(selectedPrinters.map(p => deletePrinter.mutateAsync(p.id)))
    setRowSelection({})
    if (pcTarget && selectedPrinters.some(p => p.id === pcTarget.id)) setPcTarget(null)
  }, [deletePrinter, pcTarget])

  const { data, isLoading } = usePrinters({
    ...(search    && { search }),
    ...(costType  && { cost_type: costType }),
    ...(status    && { status }),
  })
  const printers: PrinterType[] = data?.data ?? []

  const columns = useMemo<ColumnDef<PrinterType>[]>(() => [
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
        accessorKey: 'asset_tag',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            Asset Tag <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ getValue, row }) => (
          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold ${
            row.original.cost_type === 'OPEX'
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: 'name_model',
        accessorKey: 'name',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            Name / Model <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground dark:text-secondary-foreground">{row.original.name}</p>
            {row.original.model && (
              <p className="text-xs text-muted-foreground/70">{row.original.model}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'department',
        header: 'Department',
        cell: ({ getValue }) => (
          <span className="text-xs">{getValue<string | undefined>() ?? '–'}</span>
        ),
      },
      {
        accessorKey: 'cost_type',
        header: 'Cost Type',
        cell: ({ getValue }) => {
          const val = getValue<string>()
          return <Badge variant={val === 'CAPEX' ? 'info' : 'orange'}>{val}</Badge>
        },
      },
      {
        id: 'cost',
        header: 'Cost',
        accessorFn: row =>
          row.cost_type === 'CAPEX' ? (row.purchase_cost ?? 0) : (row.monthly_fixed_cost ?? 0),
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.cost_type === 'CAPEX' && row.original.purchase_cost
              ? formatCurrency(row.original.purchase_cost)
              : row.original.monthly_fixed_cost
              ? `${formatCurrency(row.original.monthly_fixed_cost)}/mo`
              : '–'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'assigned_to',
        header: 'Assigned To',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{getValue<string | undefined>() ?? '–'}</span>
        ),
      },
      {
        id: 'snmp_status',
        header: 'SNMP',
        cell: ({ row }) => {
          const s = row.original.snmp_status
          if (!row.original.ip_address) return <span className="text-xs text-muted-foreground">–</span>
          if (s === 'fetched') return <Badge variant="success">Fetched</Badge>
          if (s === 'failed') return <Badge variant="destructive">Unavailable</Badge>
          return <span className="text-xs text-muted-foreground">–</span>
        },
        enableSorting: false,
      },
      {
        id: 'page_count',
        header: 'Page Count',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => openPageCount(row.original)}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <GaugeCircle size={14} />
                <span>Log</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Log page count reading</TooltipContent>
          </Tooltip>
        ),
        enableSorting: false,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <AlertDialog>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded p-1 text-muted-foreground/70 hover:text-foreground/80">
                      <MoreVertical size={14} />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Actions</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openDetails(row.original)}>Show Details</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openEdit(row.original)}>Edit</DropdownMenuItem>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Printer</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{row.original.name}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => handleDelete(row.original.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ),
        enableSorting: false,
      },
    ],
    [handleDelete]
  )

  const table = useReactTable({
    data: printers,
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
          <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Printers</h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Manage all printer assets</p>
        </div>
        <Button size="sm" onClick={() => { setAddError(''); setFieldErrors({}); setForm(f => ({ ...f, asset_tag: ASSET_TAG_RULES.CAPEX.prefix })); setAddOpen(true) }}>
          <Plus size={15} /> Add Printer
        </Button>
      </div>



      {/* Add Printer Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="w-[calc(28rem-30px)] max-w-none sm:max-w-none max-h-[75vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={15} /> Add Printer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {addError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{addError}</p>
            )}

            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. HP LaserJet Pro MFP"
                value={form.name}
                onChange={e => { setField('name', e.target.value); setFieldErrors(fe => ({ ...fe, name: '' })) }}
                className={fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input
                placeholder="e.g. HP LaserJet M428fdw"
                value={form.model}
                onChange={e => setField('model', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Manufacturer</Label>
                <Input placeholder="e.g. HP, Canon, Ricoh" value={form.manufacturer} onChange={e => setField('manufacturer', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Serial Number</Label>
                <Input placeholder="e.g. VNB3K12345" value={form.model_number} onChange={e => setField('model_number', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Colour Capability</Label>
                <Select value={form.color_capability} onValueChange={v => setForm(f => ({ ...f, color_capability: v as '' | 'mono' | 'colour' }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {COLOR_CAPABILITIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>IP Address</Label>
                <Input placeholder="e.g. 192.168.1.50" value={form.ip_address} onChange={e => setField('ip_address', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                placeholder="e.g. IT Department"
                value={form.department}
                onChange={e => { setField('department', e.target.value); setFieldErrors(fe => ({ ...fe, department: '' })) }}
                className={fieldErrors.department ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {fieldErrors.department && <p className="text-xs text-destructive">{fieldErrors.department}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Cost Type</Label>
              <div className="flex gap-2">
                {COST_TYPES.map(({ value: ct }) => (
                  <button key={ct} type="button" onClick={() => setForm(f => ({ ...f, cost_type: ct }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      form.cost_type === ct
                        ? ct === 'CAPEX'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}>
                    {ct}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Asset Tag is auto-generated.</p>
            </div>

            {form.cost_type === 'CAPEX' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Purchase Cost (Rs)</Label>
                  <Input type="number" min="0" placeholder="e.g. 85000" value={form.purchase_cost} onChange={e => setField('purchase_cost', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Date</Label>
                  <Input type="date" value={form.purchase_date} onChange={e => setField('purchase_date', e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Monthly Fixed Cost (Rs)</Label>
                    <Input type="number" min="0" placeholder="e.g. 3500" value={form.monthly_fixed_cost} onChange={e => setField('monthly_fixed_cost', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Per Page Cost (Rs)</Label>
                    <Input type="number" min="0" step="0.001" placeholder="e.g. 0.018" value={form.per_page_cost} onChange={e => setField('per_page_cost', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Contract Start Date</Label>
                  <Input type="date" value={form.contract_start_date} onChange={e => setField('contract_start_date', e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRINTER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input
                placeholder="e.g. John Smith"
                value={form.assigned_to}
                onChange={e => { setField('assigned_to', e.target.value); setFieldErrors(fe => ({ ...fe, assigned_to: '' })) }}
                className={fieldErrors.assigned_to ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {fieldErrors.assigned_to && <p className="text-xs text-destructive">{fieldErrors.assigned_to}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Last Service Date</Label>
                <Input type="date" value={form.last_service_date} onChange={e => setField('last_service_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Service Date</Label>
                <Input type="date" value={form.next_service_date} onChange={e => setField('next_service_date', e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>
              Cancel
            </Button>
            <Button onClick={handleAddPrinter} disabled={addSaving}>
              {addSaving
                ? <><div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Saving…</>
                : <><Plus size={13} />Add Printer</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[80vw] max-w-[80vw] sm:max-w-[80vw] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-0">
          {detailsTarget && (
            <>
              {/* Header */}
              <div className="flex items-center gap-4 border-b border-border px-6 py-4">
                {detailsTarget.image_url ? (
                  <img
                    src={detailsTarget.image_url}
                    alt={detailsTarget.name}
                    className="h-14 w-14 shrink-0 rounded-lg object-contain border border-border bg-muted/30"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
                    <Printer size={22} className="text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-base">{detailsTarget.name}</DialogTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {detailsTarget.asset_tag && (
                      <span className="text-xs font-mono text-muted-foreground">{detailsTarget.asset_tag}</span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2 h-5 text-[10px] font-medium ${
                      detailsTarget.cost_type === 'CAPEX'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>{detailsTarget.cost_type}</span>
                    <StatusBadge status={detailsTarget.status} />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden px-5 py-4">
                <div className="grid h-full grid-cols-[240px_240px_minmax(0,1.2fr)] gap-4">

                  {/* Column 1: Identification + Maintenance */}
                  <div className="flex min-h-0 flex-col gap-3">
                    <section className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Identification</p>
                      <div className="grid grid-cols-1 gap-y-2 rounded-lg border border-border bg-muted/20 p-3">
                        <Detail label="Asset Tag"    value={detailsTarget.asset_tag} />
                        <Detail label="Snipe-IT ID"  value={detailsTarget.snipeit_id} />
                        <Detail label="Serial"       value={detailsTarget.serial} />
                        <Detail label="Model"        value={detailsTarget.model} />
                        <Detail label="Manufacturer" value={detailsTarget.manufacturer} />
                        <Detail label="Serial No."    value={detailsTarget.model_number} />
                        <Detail label="Colour"       value={detailsTarget.color_capability ? (detailsTarget.color_capability === 'mono' ? 'Mono' : 'Colour') : undefined} />
                        <Detail label="IP Address"   value={detailsTarget.ip_address} />
                      </div>
                    </section>

                    <section className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Maintenance</p>
                      <div className="grid grid-cols-1 gap-y-2 rounded-lg border border-border bg-muted/20 p-3">
                        <Detail label="Last Service"  value={detailsTarget.last_service_date} />
                        <Detail label="Next Service"  value={detailsTarget.next_service_date} />
                        <Detail label="Service Count" value={detailsTarget.service_count} />
                        <Detail label="Added"         value={detailsTarget.created_at ? new Date(detailsTarget.created_at).toLocaleDateString() : undefined} />
                      </div>
                    </section>

                    {detailsTarget.notes && (
                      <section className="space-y-1.5 flex-1 flex flex-col">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Notes</p>
                        <p className="flex-1 rounded-lg border border-border bg-muted/20 p-3 text-xs text-foreground whitespace-pre-wrap overflow-hidden">{detailsTarget.notes}</p>
                      </section>
                    )}
                  </div>

                  {/* Column 2: Assignment + Financials + Consumables */}
                  <div className="flex min-h-0 flex-col gap-3">
                    <section className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Assignment & Location</p>
                      <div className="grid grid-cols-1 gap-y-2 rounded-lg border border-border bg-muted/20 p-3">
                        <Detail label="Department"    value={detailsTarget.department} />
                        <Detail label="Location"      value={detailsTarget.location} />
                        <Detail label="Assigned To"   value={detailsTarget.assigned_to} />
                        <Detail label="Checkout Date" value={detailsTarget.checkout_date} />
                      </div>
                    </section>

                    {/* Print Volume summary card */}
                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Print Volume</p>
                      <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="pr-3">
                          <p className="text-[10px] text-muted-foreground">{detailsYear} Annual</p>
                          <p className="text-base font-bold text-foreground">{annualPageCount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">pages</p>
                        </div>
                        <div className="pl-3">
                          <p className="text-[10px] text-muted-foreground">Lifetime Total</p>
                          <p className="text-base font-bold text-foreground">{lifetimePageCount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">pages cumulative</p>
                        </div>
                      </div>
                    </div>

                    <section className="flex min-h-0 flex-1 flex-col space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Assigned Consumables</p>
                      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
                        {detailsAssignments.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No consumables assigned.</p>
                        ) : (
                          <div className="space-y-2">
                            {detailsAssignments.map(a => (
                              <div key={a.id} className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="break-words text-xs font-medium text-foreground">{a.consumable.name}</p>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{a.consumable.sku} · {a.consumable.type}</p>
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {new Date(a.assigned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  {/* Column 3: Page Count + Monthly Cost charts */}
                  <div className="flex min-h-0 flex-col gap-3">

                    <section className="flex min-h-0 flex-1 flex-col space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Page Count (Jan–Dec)</p>
                        <select
                          value={detailsYear}
                          onChange={e => setDetailsYear(Number(e.target.value))}
                          className="h-6 rounded border border-border bg-background px-1.5 text-[10px] text-foreground focus:outline-none"
                        >
                          {detailsPageCountYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div className="min-h-0 flex-1 rounded-lg border border-border bg-muted/20 p-3">
                        {detailsPageCounts.length < 1 ? (
                          <p className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                            No readings logged yet.
                          </p>
                        ) : (
                          <ChartContainer
                            config={{ value: { label: 'Pages', color: 'var(--chart-1)' } } satisfies ChartConfig}
                            className="h-full w-full"
                          >
                            <BarChart accessibilityLayer data={monthlyPageCountData} margin={{ left: 4, right: 4, top: 4 }}>
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="label" tickLine={false} tickMargin={8} axisLine={false} interval={0} tickFormatter={(v) => v.slice(0, 3)} tick={{ fontSize: 10 }} />
                              <YAxis tickLine={false} axisLine={false} tickMargin={6} allowDecimals={false} tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                              <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v) => [Number(v).toLocaleString(), 'Pages']} />} />
                              <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ChartContainer>
                        )}
                      </div>
                    </section>

                    <section className="flex min-h-0 flex-1 flex-col space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Monthly Toner Cost — {detailsYear}</p>
                      <div className="min-h-0 flex-1 rounded-lg border border-border bg-muted/20 p-3">
                        {tonerCostPerPage === null ? (
                          <p className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                            Assign a toner with page yield to see cost breakdown.
                          </p>
                        ) : detailsPageCounts.length < 1 ? (
                          <p className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                            No readings logged yet.
                          </p>
                        ) : (
                          <ChartContainer
                            config={{ cost: { label: 'Toner Cost', color: 'var(--chart-2)' } } satisfies ChartConfig}
                            className="h-full w-full"
                          >
                            <AreaChart accessibilityLayer data={monthlyPageCountData} margin={{ left: 4, right: 4, top: 4 }}>
                              <defs>
                                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%"  stopColor="var(--color-cost)" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="label" tickLine={false} tickMargin={8} axisLine={false} interval={0} tickFormatter={(v) => v.slice(0, 3)} tick={{ fontSize: 10 }} />
                              <YAxis tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                              <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Toner Cost']} />} />
                              <Area dataKey="cost" type="monotone" fill="url(#costGradient)" stroke="var(--color-cost)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-cost)' }} connectNulls={false} />
                            </AreaChart>
                          </ChartContainer>
                        )}
                      </div>
                    </section>

                  </div>

                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end border-t border-border px-6 py-3">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Printer Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md flex flex-col max-h-[80vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Printer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            {editError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{editError}</p>
            )}

            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. HP LaserJet Pro MFP"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input
                placeholder="e.g. HP LaserJet M428fdw"
                value={editForm.model}
                onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Manufacturer</Label>
                <Input
                  placeholder="e.g. HP, Canon, Ricoh"
                  value={editForm.manufacturer}
                  onChange={e => setEditForm(f => ({ ...f, manufacturer: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Serial Number</Label>
                <Input
                  placeholder="e.g. VNB3K12345"
                  value={editForm.model_number}
                  onChange={e => setEditForm(f => ({ ...f, model_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Colour Capability</Label>
                <Select value={editForm.color_capability} onValueChange={v => setEditForm(f => ({ ...f, color_capability: v as '' | 'mono' | 'colour' }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {COLOR_CAPABILITIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>IP Address</Label>
                <Input
                  placeholder="e.g. 192.168.1.50"
                  value={editForm.ip_address}
                  onChange={e => setEditForm(f => ({ ...f, ip_address: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                placeholder="e.g. IT Department"
                value={editForm.department}
                onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cost Type</Label>
              <div className="flex gap-2">
                {COST_TYPES.map(({ value: ct }) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, cost_type: ct }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      editForm.cost_type === ct
                        ? ct === 'CAPEX'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {ct}
                  </button>
                ))}
              </div>
            </div>

            {editForm.cost_type === 'CAPEX' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Purchase Cost (Rs)</Label>
                  <Input type="number" min="0" placeholder="e.g. 85000" value={editForm.purchase_cost} onChange={e => setEditForm(f => ({ ...f, purchase_cost: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Date</Label>
                  <Input type="date" value={editForm.purchase_date} onChange={e => setEditForm(f => ({ ...f, purchase_date: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Monthly Fixed Cost (Rs)</Label>
                    <Input type="number" min="0" placeholder="e.g. 3500" value={editForm.monthly_fixed_cost} onChange={e => setEditForm(f => ({ ...f, monthly_fixed_cost: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Per Page Cost (Rs)</Label>
                    <Input type="number" min="0" step="0.001" placeholder="e.g. 0.018" value={editForm.per_page_cost} onChange={e => setEditForm(f => ({ ...f, per_page_cost: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Contract Start Date</Label>
                  <Input type="date" value={editForm.contract_start_date} onChange={e => setEditForm(f => ({ ...f, contract_start_date: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRINTER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input
                placeholder="e.g. John Smith"
                value={editForm.assigned_to}
                onChange={e => setEditForm(f => ({ ...f, assigned_to: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Last Service Date</Label>
                <Input
                  type="date"
                  value={editForm.last_service_date}
                  onChange={e => setEditForm(f => ({ ...f, last_service_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Next Service Date</Label>
                <Input
                  type="date"
                  value={editForm.next_service_date}
                  onChange={e => setEditForm(f => ({ ...f, next_service_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-2 border-t border-border/40">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving
                ? <><div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Saving…</>
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer size={15} />
            All Printers
            <span className="ml-auto text-xs font-normal text-muted-foreground/70">
              {table.getFilteredRowModel().rows.length !== printers.length
                ? `${table.getFilteredRowModel().rows.length} of ${printers.length} records`
                : `${printers.length} records`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  placeholder="Search printers..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value)
                    setGlobalFilter(e.target.value)
                  }}
                  className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground/80 placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
                />
              </div>
            </div>
            <select
              value={costType}
              onChange={e => {
                setCostType(e.target.value)
                table.getColumn('cost_type')?.setFilterValue(e.target.value || undefined)
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
            >
              <option value="">All Cost Types</option>
              {COST_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value)
                table.getColumn('status')?.setFilterValue(e.target.value || undefined)
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground/80 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
            >
              <option value="">All Statuses</option>
              {PRINTER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Selection action bar */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">{selectedCount} selected</span>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Archive size={12} /> Retire
                </Button>
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
                      <AlertDialogAction variant="destructive" onClick={() => handleBulkDelete(table.getSelectedRowModel().rows.map(r => r.original))}>Delete</AlertDialogAction>
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
              {/* Header row */}
              <div className="flex items-center gap-3 px-3 py-2 border-b border-border/60">
                <Skeleton className="h-4 w-4 rounded" />
                {[40, 80, 60, 48, 48, 56, 48].map((w, i) => <Skeleton key={i} className={`h-3.5 w-${w === 40 ? '[40px]' : w === 80 ? '[80px]' : w === 60 ? '[60px]' : '[48px]'}`} />)}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 h-14 border-b border-border/40">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-12" />
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
        </CardContent>
      </Card>

      {/* Page Count Dialog */}
      <Dialog open={pcOpen} onOpenChange={o => { if (!o) setPcOpen(false) }}>
        <DialogContent className="flex max-h-[85vh] w-[calc(28rem-30px)] max-w-none sm:max-w-none flex-col overflow-hidden p-6">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-2">
              <GaugeCircle size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">Page Count — {pcTarget?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pt-1 -mx-1 -mt-1">
            {/* Log new reading */}
            <div className="space-y-3 border-b border-border pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Reading</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pc-count">Total Page Count (Odometer)</Label>
                  <Input
                    id="pc-count"
                    type="number"
                    min="0"
                    placeholder="e.g. 54200"
                    value={pcCount}
                    onChange={e => setPcCount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePcSave()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <DatePicker value={pcDate} onChange={setPcDate} toYear={CURRENT_YEAR + 1} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason for Reading</Label>
                <div className="flex gap-2">
                  {([
                    { value: 'monthly_audit', label: 'Monthly Audit' },
                    { value: 'toner_change', label: 'Toner Change' },
                    { value: 'manual', label: 'Manual' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPcLogType(opt.value)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        pcLogType === opt.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pc-notes">Notes (optional)</Label>
                <Textarea
                  id="pc-notes"
                  placeholder="e.g. Monthly meter read"
                  value={pcNotes}
                  onChange={e => setPcNotes(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
              <Button
                onClick={handlePcSave}
                disabled={!pcCount || createPageCount.isPending}
                size="sm"
                className="w-full"
              >
                {createPageCount.isPending ? 'Saving…' : 'Log Reading'}
              </Button>
            </div>

            {/* History */}
            <div className="space-y-1">
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">History</p>
              {pageCounts.length > 0 && (
                <div className="flex items-center gap-2 px-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  <span className="w-20 shrink-0">Page Count</span>
                  <span className="w-24 shrink-0">Date</span>
                  <span className="w-24 shrink-0">Reason</span>
                </div>
              )}
              {pageCounts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No readings logged yet.</p>
              ) : (
                <Accordion type="multiple" className="max-h-52 space-y-1 overflow-y-auto">
                  {pageCounts.map((log: PrinterPageCount) => (
                    <PageCountRow key={log.id} log={log} onDelete={() => deletePageCount.mutate(log.id)} />
                  ))}
                </Accordion>
              )}
            </div>

            {pageCounts.length > 0 && (
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Cumulative Page Count
                </span>
                <span className="text-sm font-semibold">{cumulativePageCount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <DialogFooter className="-mx-6 -mb-6 rounded-b-xl">
            <Button variant="outline" onClick={() => setPcOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
