import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useMemo } from 'react'
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
import { FileText, Plus, Search, ArrowUpDown, Download, RefreshCw, Trash2, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useContracts, useCreateContract, useDeleteContract, useRenewContract, useContractRenewals } from '@/hooks/useData'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import type { Contract } from '@/types'

const EMPTY_FORM = {
  name: '',
  vendor: '',
  type: 'Service' as string,
  start_date: '',
  end_date: '',
  annual_cost: '',
  covered_printers: '',
  notice_period_days: '',
  contract_manager: '',
  notes: '',
  status: 'active' as string,
}

type FieldErrors = Partial<Record<keyof typeof EMPTY_FORM, string>>

export function Contracts() {
  const { data: rawData, isLoading } = useContracts()
  const contracts: Contract[] = (rawData as { data: Contract[] } | undefined)?.data ?? []
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const createContract = useCreateContract()
  const deleteContract = useDeleteContract()
  const renewContract = useRenewContract()
  const { data: renewalLogs = [] } = useContractRenewals()
  const [renewing, setRenewing] = useState(false)

  const handleRenew = async () => {
    const selected = Object.keys(rowSelection).map(i => contracts[Number(i)]).filter(Boolean)
    if (!selected.length) return
    setRenewing(true)
    try {
      await Promise.all(selected.map(c => renewContract.mutateAsync(c.id)))
      setRowSelection({})
      toast.success(`${selected.length} contract${selected.length > 1 ? 's' : ''} renewed.`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to renew one or more contracts.'
      toast.error(msg)
    } finally {
      setRenewing(false)
    }
  }
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')

  const setField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    setFieldErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const errors: FieldErrors = {}
    if (!form.name.trim()) errors.name = 'Name is required.'
    if (!form.vendor.trim()) errors.vendor = 'Vendor is required.'
    if (!form.type) errors.type = 'Type is required.'
    if (!form.start_date) errors.start_date = 'Start date is required.'
    if (!form.end_date) errors.end_date = 'End date is required.'
    if (form.start_date && form.end_date && form.end_date <= form.start_date)
      errors.end_date = 'End date must be after start date.'
    if (!form.annual_cost || isNaN(Number(form.annual_cost)) || Number(form.annual_cost) < 0)
      errors.annual_cost = 'Valid annual cost is required.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAdd = async () => {
    if (!validate()) return
    setSubmitError('')
    try {
      await createContract.mutateAsync({
        name: form.name.trim(),
        vendor: form.vendor.trim(),
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        annual_cost: Number(form.annual_cost),
        covered_printers:   form.covered_printers ? Number(form.covered_printers) : 0,
        notice_period_days: form.notice_period_days ? Number(form.notice_period_days) : null,
        contract_manager:   form.contract_manager.trim() || null,
        notes:              form.notes.trim() || null,
        status:             form.status,
      })
      setAddOpen(false)
      setForm(EMPTY_FORM)
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Failed to add contract.')
    }
  }

  const columns = useMemo<ColumnDef<Contract>[]>(
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
        accessorKey: 'vendor',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            Vendor <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => <Badge variant="teal">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'annual_cost',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            Annual Cost <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ getValue }) => <span className="font-semibold">{formatCurrency(getValue<number>())}</span>,
      },
      {
        accessorKey: 'covered_printers',
        header: 'Printers',
        cell: ({ getValue }) => <span className="text-center block">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'end_date',
        id: 'expires',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            Expires <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const dateVal = getValue<string>()
          const days = daysUntil(dateVal)
          const warning = days !== null && days <= 90
            ? { text: days <= 0 ? 'Expired' : `${days}d remaining`, color: days <= 30 ? 'text-red-500' : 'text-amber-500' }
            : null
          return (
            <div className="flex flex-col justify-center gap-0.5">
              <p className="text-sm">{formatDate(dateVal)}</p>
              <p className={`text-xs font-medium ${warning ? warning.color : 'text-transparent select-none'}`}>
                {warning ? warning.text : '–'}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue, row }) => {
          const days = daysUntil(row.original.end_date)
          const status = days !== null && days <= 0 ? 'expired' : getValue<string>()
          return <StatusBadge status={status} />
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: contracts,
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
          <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Contracts</h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Service agreements, leases and support contracts</p>
        </div>
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setFieldErrors({}); setSubmitError(''); setAddOpen(true) }}>
          <Plus size={15} /> Add Contract
        </Button>
      </div>

      {/* Add Contract Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Contract</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {/* Name */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="c-name">Contract Name <span className="text-destructive">*</span></Label>
              <Input id="c-name" placeholder="e.g. HP Annual Service Agreement" value={form.name} onChange={e => setField('name', e.target.value)} />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>
            {/* Vendor */}
            <div className="space-y-1.5">
              <Label htmlFor="c-vendor">Vendor <span className="text-destructive">*</span></Label>
              <Input id="c-vendor" placeholder="e.g. HP Inc." value={form.vendor} onChange={e => setField('vendor', e.target.value)} />
              {fieldErrors.vendor && <p className="text-xs text-destructive">{fieldErrors.vendor}</p>}
            </div>
            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={v => setField('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                  <SelectItem value="Lease">Lease</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Start Date */}
            <div className="space-y-1.5">
              <Label>Start Date <span className="text-destructive">*</span></Label>
              <DatePicker value={form.start_date} onChange={v => setField('start_date', v)} placeholder="Pick start date" />
              {fieldErrors.start_date && <p className="text-xs text-destructive">{fieldErrors.start_date}</p>}
            </div>
            {/* End Date */}
            <div className="space-y-1.5">
              <Label>End Date <span className="text-destructive">*</span></Label>
              <DatePicker value={form.end_date} onChange={v => setField('end_date', v)} placeholder="Pick end date" />
              {fieldErrors.end_date && <p className="text-xs text-destructive">{fieldErrors.end_date}</p>}
            </div>
            {/* Annual Cost */}
            <div className="space-y-1.5">
              <Label htmlFor="c-cost">Annual Cost (Rs) <span className="text-destructive">*</span></Label>
              <Input id="c-cost" type="number" min="0" placeholder="0" value={form.annual_cost} onChange={e => setField('annual_cost', e.target.value)} />
              {fieldErrors.annual_cost && <p className="text-xs text-destructive">{fieldErrors.annual_cost}</p>}
            </div>
            {/* Covered Printers */}
            <div className="space-y-1.5">
              <Label htmlFor="c-printers">Covered Printers</Label>
              <Input id="c-printers" type="number" min="0" placeholder="0" value={form.covered_printers} onChange={e => setField('covered_printers', e.target.value)} />
            </div>
            {/* Contract Manager */}
            <div className="space-y-1.5">
              <Label htmlFor="c-manager">Contract Manager</Label>
              <Input id="c-manager" placeholder="e.g. Jane Smith" value={form.contract_manager} onChange={e => setField('contract_manager', e.target.value)} />
            </div>
            {/* Notice Period */}
            <div className="space-y-1.5">
              <Label htmlFor="c-notice">Notice Period (days)</Label>
              <Input id="c-notice" type="number" min="0" placeholder="e.g. 30" value={form.notice_period_days} onChange={e => setField('notice_period_days', e.target.value)} />
            </div>
            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Notes */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="c-notes">Notes</Label>
              <textarea
                id="c-notes"
                rows={3}
                placeholder="Optional notes..."
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>
            {submitError && (
              <p className="col-span-2 text-xs text-destructive">{submitError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createContract.isPending}>
              {createContract.isPending ? 'Adding…' : 'Add Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={15} /> All Contracts
            <span className="ml-auto text-xs font-normal text-muted-foreground/70">
              {table.getFilteredRowModel().rows.length !== contracts.length
                ? `${table.getFilteredRowModel().rows.length} of ${contracts.length} records`
                : `${contracts.length} records`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              placeholder="Search contracts..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground/80 placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
            />
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">{selectedCount} selected</span>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={renewing} onClick={handleRenew}>
                  <RefreshCw size={12} className={renewing ? 'animate-spin' : ''} /> {renewing ? 'Renewing…' : 'Renew'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5">
                      <Trash2 size={12} /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedCount} contract{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={async () => {
                        const ids = Object.keys(rowSelection).map(i => contracts[Number(i)]?.id).filter(Boolean) as number[]
                        await Promise.all(ids.map(id => deleteContract.mutateAsync(id)))
                        setRowSelection({})
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
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-3 h-14 border-b border-border/40">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-8" />
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
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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

      {/* Renewal Log */}
      {renewalLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw size={15} className="text-blue-500" />
              Renewal History
              <span className="ml-auto text-xs font-normal text-muted-foreground/70">{renewalLogs.length} record{renewalLogs.length !== 1 ? 's' : ''}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original Contract</TableHead>
                  <TableHead>Renewed Contract</TableHead>
                  <TableHead>New Period</TableHead>
                  <TableHead>Renewed By</TableHead>
                  <TableHead>Date Renewed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewalLogs.map(log => (
                  <TableRow key={log.id} className="h-12 border-b border-border/60 bg-white dark:border-border dark:bg-card">
                    <TableCell className="align-middle text-sm font-medium">{log.original_contract?.name ?? '—'}</TableCell>
                    <TableCell className="align-middle text-sm">{log.renewed_contract?.name ?? '—'}</TableCell>
                    <TableCell className="align-middle text-sm text-muted-foreground">
                      {log.renewed_contract
                        ? `${new Date(log.renewed_contract.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(log.renewed_contract.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : '—'}
                    </TableCell>
                    <TableCell className="align-middle text-sm">{log.renewed_by?.name ?? '—'}</TableCell>
                    <TableCell className="align-middle text-sm text-muted-foreground">
                      {new Date(log.renewed_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
