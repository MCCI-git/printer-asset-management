import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useRef, useMemo, useCallback, useEffect, memo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { FileText, Plus, Search, ArrowUpDown, RefreshCw, Trash2, X, Pencil, Upload, Eye } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  useContracts, useCreateContract, useDeleteContract, useUpdateContract,
  useRenewContract, useContractRenewals, useCreateRenewalLog, useDeleteRenewalLog,
  useSuppliers, usePrinters,
} from '@/hooks/useData'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import type { Contract } from '@/types'
import { contractsApi } from '@/services/api'

// ── Shared constants ───────────────────────────────────────────────────────────
const EMPTY_CONTRACTS: Contract[] = []

const EMPTY_FORM = {
  name: '',
  vendor: '',
  supplier_id: '' as string,
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
type FormShape = typeof EMPTY_FORM
type FieldErrors = Partial<Record<keyof FormShape, string>>

function contractToForm(c: Contract): FormShape {
  const effectiveStatus = c.end_date && new Date(c.end_date.slice(0, 10)) < new Date(new Date().toDateString()) ? 'expired' : c.status
  return {
    name: c.name,
    vendor: c.vendor,
    supplier_id: c.supplier_id ? String(c.supplier_id) : '',
    type: c.type,
    start_date: c.start_date,
    end_date: c.end_date,
    annual_cost: String(c.annual_cost),
    covered_printers: String(c.covered_printers),
    notice_period_days: c.notice_period_days ? String(c.notice_period_days) : '',
    contract_manager: c.contract_manager ?? '',
    notes: c.notes ?? '',
    status: effectiveStatus,
  }
}

function formToPayload(f: FormShape) {
  return {
    name: f.name.trim(),
    vendor: f.vendor.trim(),
    supplier_id: f.supplier_id ? Number(f.supplier_id) : null,
    type: f.type,
    start_date: f.start_date,
    end_date: f.end_date,
    annual_cost: Number(f.annual_cost),
    covered_printers: f.covered_printers ? Number(f.covered_printers) : 0,
    notice_period_days: f.notice_period_days ? Number(f.notice_period_days) : null,
    contract_manager: f.contract_manager.trim() || null,
    notes: f.notes.trim() || null,
    status: f.status,
  }
}

// ── Edit dialog ────────────────────────────────────────────────────────────────
// ── PDF drop zone ──────────────────────────────────────────────────────────────
function PdfDropZone({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handle = (f: File | null) => {
    if (f && f.type !== 'application/pdf') { toast.error('Only PDF files are allowed.'); return }
    onChange(f)
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0] ?? null) }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={e => { handle(e.target.files?.[0] ?? null); e.target.value = '' }} />
      {file ? (
        <>
          <FileText size={22} className="text-primary" />
          <p className="text-xs font-medium text-foreground truncate max-w-[220px]">{file.name}</p>
          <button className="text-[11px] text-destructive hover:underline" onClick={e => { e.stopPropagation(); onChange(null) }}>Remove</button>
        </>
      ) : (
        <>
          <Upload size={20} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Drag & drop a PDF or <span className="text-primary font-medium">click to browse</span></p>
        </>
      )}
    </div>
  )
}

function EditContractDialog({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const qc = useQueryClient()
  const updateContract = useUpdateContract()
  const { data: suppliersData } = useSuppliers({ per_page: 200 })
  const suppliers: { id: number; name: string }[] = suppliersData?.data ?? []
  const { data: printersData } = usePrinters({ per_page: 500 })
  const printersList: { id: number; name: string }[] = printersData?.data ?? []
  const [form, setForm] = useState<FormShape>(() => contractToForm(contract))
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(contractToForm(contract))
    setError('')
  }, [contract.id])

  const set = (key: keyof FormShape, val: string) => setForm(f => {
    const next = { ...f, [key]: val }
    if (key === 'end_date' && val) {
      next.status = new Date(val) < new Date(new Date().toDateString()) ? 'expired' : f.status === 'expired' ? 'active' : f.status
    }
    return next
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateContract.mutateAsync({ id: contract.id, data: formToPayload(form) })
      if (pdfFile) {
        await contractsApi.uploadPdf(contract.id, pdfFile)
        await qc.invalidateQueries({ queryKey: ['contracts'] })
      }
      toast.success('Contract updated.')
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update contract.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Contract</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Contract Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Printer <span className="text-destructive">*</span></Label>
              <Select value={form.vendor} onValueChange={v => set('vendor', v)}>
                <SelectTrigger><SelectValue placeholder="Select printer" /></SelectTrigger>
                <SelectContent>
                  {printersList.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                  <SelectItem value="Lease">Lease</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Select value={form.supplier_id || 'none'} onValueChange={v => set('supplier_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="No supplier linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No supplier linked</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date <span className="text-destructive">*</span></Label>
              <DatePicker value={form.start_date} onChange={v => set('start_date', v)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date <span className="text-destructive">*</span></Label>
              <DatePicker value={form.end_date} onChange={v => set('end_date', v)} toYear={new Date().getFullYear() + 5} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Annual Cost <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" value={form.annual_cost} onChange={e => set('annual_cost', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notice Period (days)</Label>
            <Input type="number" min="0" value={form.notice_period_days} onChange={e => set('notice_period_days', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Contract Manager</Label>
            <Input value={form.contract_manager} onChange={e => set('contract_manager', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contract PDF {contract.pdf_path && <span className="text-xs text-muted-foreground font-normal ml-1">(already uploaded — drop a new one to replace)</span>}</Label>
            <PdfDropZone file={pdfFile} onChange={setPdfFile} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Add dialog (isolated so form state changes don't re-render the table) ──────
function AddContractDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const createContract = useCreateContract()
  const { data: suppliersData } = useSuppliers({ per_page: 200 })
  const suppliers: { id: number; name: string }[] = suppliersData?.data ?? []
  const { data: printersData } = usePrinters({ per_page: 500 })
  const printersList: { id: number; name: string }[] = printersData?.data ?? []
  const [form, setForm] = useState<FormShape>(EMPTY_FORM)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')

  const set = (key: keyof FormShape, val: string) => {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'end_date' && val) {
        next.status = new Date(val) < new Date(new Date().toDateString()) ? 'expired' : f.status === 'expired' ? 'active' : f.status
      }
      return next
    })
    setFieldErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const errors: FieldErrors = {}
    if (!form.name.trim()) errors.name = 'Name is required.'
    if (!form.vendor.trim()) errors.vendor = 'Vendor is required.'
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
      const res = await createContract.mutateAsync(formToPayload(form))
      if (pdfFile && res?.data?.id) {
        await contractsApi.uploadPdf(res.data.id, pdfFile)
        await qc.invalidateQueries({ queryKey: ['contracts'] })
      }
      onClose()
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Failed to add contract.')
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Contract</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Contract Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. HP Annual Service Agreement" value={form.name} onChange={e => set('name', e.target.value)} />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Printer <span className="text-destructive">*</span></Label>
            <Select value={form.vendor} onValueChange={v => { set('vendor', v) }}>
              <SelectTrigger><SelectValue placeholder="Select printer" /></SelectTrigger>
              <SelectContent>
                {printersList.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {fieldErrors.vendor && <p className="text-xs text-destructive">{fieldErrors.vendor}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => set('type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Service">Service</SelectItem>
                <SelectItem value="Support">Support</SelectItem>
                <SelectItem value="Lease">Lease</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Supplier</Label>
            <Select value={form.supplier_id || 'none'} onValueChange={v => set('supplier_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="No supplier linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No supplier linked</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Start Date <span className="text-destructive">*</span></Label>
            <DatePicker value={form.start_date} onChange={v => set('start_date', v)} />
            {fieldErrors.start_date && <p className="text-xs text-destructive">{fieldErrors.start_date}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>End Date <span className="text-destructive">*</span></Label>
            <DatePicker value={form.end_date} onChange={v => set('end_date', v)} toYear={new Date().getFullYear() + 5} />
            {fieldErrors.end_date && <p className="text-xs text-destructive">{fieldErrors.end_date}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Annual Cost (Rs) <span className="text-destructive">*</span></Label>
            <Input type="number" min="0" placeholder="0" value={form.annual_cost} onChange={e => set('annual_cost', e.target.value)} />
            {fieldErrors.annual_cost && <p className="text-xs text-destructive">{fieldErrors.annual_cost}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contract Manager</Label>
            <Input placeholder="e.g. Jane Smith" value={form.contract_manager} onChange={e => set('contract_manager', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notice Period (days)</Label>
            <Input type="number" min="0" placeholder="e.g. 30" value={form.notice_period_days} onChange={e => set('notice_period_days', e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <textarea
              rows={3}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Contract PDF <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <PdfDropZone file={pdfFile} onChange={setPdfFile} />
          </div>
          {submitError && <p className="col-span-2 text-xs text-destructive">{submitError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={createContract.isPending}>
            {createContract.isPending ? 'Adding…' : 'Add Contract'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Contracts table (memoized — does NOT re-render when parent's editTarget changes) ──
const ContractsTable = memo(function ContractsTable({
  contracts,
  isLoading,
  onEdit,
  onDeleteSelected,
  renewContract,
}: {
  contracts: Contract[]
  isLoading: boolean
  onEdit: (c: Contract) => void
  onDeleteSelected: (ids: number[]) => Promise<void>
  renewContract: { mutateAsync: (id: number) => Promise<unknown> }
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [renewing, setRenewing] = useState(false)
  const [pdfViewer, setPdfViewer] = useState<{ name: string; url: string } | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterVendor, setFilterVendor] = useState<string>('all')
  const [filterCostMin, setFilterCostMin] = useState('')
  const [filterCostMax, setFilterCostMax] = useState('')

  const vendors = useMemo(() => [...new Set(contracts.map(c => c.vendor))].sort(), [contracts])

  const activeFilterCount = [
    filterStatus !== 'all',
    filterType !== 'all',
    filterVendor !== 'all',
    !!filterCostMin || !!filterCostMax,
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilterStatus('all')
    setFilterType('all')
    setFilterVendor('all')
    setFilterCostMin('')
    setFilterCostMax('')
  }

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const effectiveStatus = c.end_date && new Date(c.end_date) < new Date(new Date().toDateString()) ? 'expired' : c.status
      if (filterStatus !== 'all' && effectiveStatus !== filterStatus) return false
      if (filterType !== 'all' && c.type !== filterType) return false
      if (filterVendor !== 'all' && c.vendor !== filterVendor) return false
      if (filterCostMin && c.annual_cost < Number(filterCostMin)) return false
      if (filterCostMax && c.annual_cost > Number(filterCostMax)) return false
      return true
    })
  }, [contracts, filterStatus, filterType, filterVendor, filterCostMin, filterCostMax])

  const columns = useMemo<ColumnDef<Contract>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)} aria-label="Select all" />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={v => row.toggleSelected(!!v)} aria-label="Select row" />
      ),
      enableSorting: false, enableGlobalFilter: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
          Name <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
        </Button>
      ),
      cell: ({ getValue }) => <p className="font-medium text-foreground dark:text-secondary-foreground">{getValue<string>()}</p>,
    },
    {
      accessorKey: 'vendor',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
          Printer <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
        </Button>
      ),
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => {
        const s = row.original.supplier
        return s ? <span className="text-sm">{s.name}</span> : <span className="text-xs text-muted-foreground">—</span>
      },
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
      cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue, row }) => {
        const endDate = row.original.end_date
        const isExpired = endDate && new Date(endDate) < new Date(new Date().toDateString())
        return <StatusBadge status={isExpired ? 'expired' : getValue<string>()} />
      },
    },
    {
      id: 'pdf',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const c = row.original
        if (!c.pdf_url) return null
        return (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" title="View PDF"
            onClick={() => setPdfViewer({ name: c.name, url: c.pdf_url! })}>
            <FileText size={15} />
          </Button>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(row.original)}>
          <Pencil size={13} />
        </Button>
      ),
    },
  ], [onEdit, setPdfViewer])

  const table = useReactTable({
    data: filteredContracts,
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
  const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id)

  const handleRenew = async () => {
    if (!selectedIds.length) return
    const selectedRows = table.getSelectedRowModel().rows.map(r => r.original)
    const nonActive = selectedRows.filter(c => {
      const effectiveStatus = c.end_date && new Date(c.end_date.slice(0, 10)) < new Date(new Date().toDateString()) ? 'expired' : c.status
      return effectiveStatus !== 'active'
    })
    if (nonActive.length > 0) {
      toast.error(`Only active contracts can be renewed. Deselect: ${nonActive.map(c => c.name).join(', ')}`)
      return
    }
    setRenewing(true)
    try {
      await Promise.all(selectedIds.map(id => renewContract.mutateAsync(id)))
      table.resetRowSelection()
      toast.success(`${selectedIds.length} contract${selectedIds.length > 1 ? 's' : ''} renewed.`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to renew.')
    } finally {
      setRenewing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText size={15} /> All Contracts
          <span className="ml-auto text-xs font-normal text-muted-foreground/70">
            {table.getFilteredRowModel().rows.length !== contracts.length
              ? `${table.getFilteredRowModel().rows.length} of ${contracts.length} records`
              : filteredContracts.length !== contracts.length
                ? `${filteredContracts.length} of ${contracts.length} records`
                : `${contracts.length} records`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search + filters in one row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              placeholder="Search contracts..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground/80 placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
              <SelectItem value="Support">Support</SelectItem>
              <SelectItem value="Lease">Lease</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterVendor} onValueChange={setFilterVendor}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Printer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All printers</SelectItem>
              {vendors.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="Min cost"
              value={filterCostMin}
              onChange={e => setFilterCostMin(e.target.value)}
              className="h-9 w-[90px] text-xs"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <Input
              type="number"
              placeholder="Max cost"
              value={filterCostMax}
              onChange={e => setFilterCostMax(e.target.value)}
              className="h-9 w-[90px] text-xs"
            />
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground gap-1" onClick={clearFilters}>
              <X size={13} /> Clear
            </Button>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">{selectedCount} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={renewing} onClick={handleRenew}>
                <RefreshCw size={12} className={renewing ? 'animate-spin' : ''} />
                {renewing ? 'Renewing…' : 'Renew'}
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
                    <AlertDialogAction variant="destructive" onClick={() => onDeleteSelected(selectedIds).then(() => table.resetRowSelection())}>
                      Delete
                    </AlertDialogAction>
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
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : (
          <>
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
                      No contracts found.
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
            <TablePagination
              page={pagination.pageIndex}
              pageCount={table.getPageCount()}
              onPageChange={p => setPagination(prev => ({ ...prev, pageIndex: p }))}
              totalRows={table.getFilteredRowModel().rows.length}
              pageSize={pagination.pageSize}
              onPageSizeChange={size => setPagination({ pageIndex: 0, pageSize: size })}
            />
          </>
        )}
      </CardContent>
    </Card>

    {/* PDF Viewer Dialog */}
    {pdfViewer && (
      <Dialog open onOpenChange={() => setPdfViewer(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/40 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText size={16} className="text-red-500" /> {pdfViewer.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe src={pdfViewer.url} className="w-full h-full border-0" title={pdfViewer.name} />
          </div>
        </DialogContent>
      </Dialog>
    )}
  )
})

// ── Main page ──────────────────────────────────────────────────────────────────
export function Contracts() {
  const { data: rawData, isLoading } = useContracts()
  const allContracts: Contract[] = useMemo(
    () => (rawData as { data: Contract[] } | undefined)?.data ?? EMPTY_CONTRACTS,
    [rawData]
  )
  const contracts = allContracts

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Contract | null>(null)
  const [addLogOpen, setAddLogOpen] = useState(false)

  const [logForm, setLogForm] = useState({ event_type: 'renewed', original_contract_id: '', renewed_contract_id: '', renewed_at: '' })
  const [logSaving, setLogSaving] = useState(false)

  const deleteContract = useDeleteContract()
  const renewContract = useRenewContract()
  const createRenewalLog = useCreateRenewalLog()
  const deleteRenewalLog = useDeleteRenewalLog()
  const { data: renewalLogsData } = useContractRenewals()
  const renewalLogs = renewalLogsData ?? []

  const handleOpenEdit = useCallback((c: Contract) => setEditTarget(c), [])
  const handleDeleteSelected = useCallback(async (ids: number[]) => {
    await Promise.all(ids.map(id => deleteContract.mutateAsync(id)))
  }, [deleteContract])

  // ── Add log ───────────────────────────────────────────────────────────────────
  const handleAddLog = async () => {
    if (!logForm.original_contract_id || !logForm.renewed_at) return
    setLogSaving(true)
    try {
      await createRenewalLog.mutateAsync({
        event_type: logForm.event_type,
        original_contract_id: Number(logForm.original_contract_id),
        renewed_contract_id: logForm.renewed_contract_id ? Number(logForm.renewed_contract_id) : null,
        renewed_at: logForm.renewed_at,
      })
      setAddLogOpen(false)
      setLogForm({ event_type: 'renewed', original_contract_id: '', renewed_contract_id: '', renewed_at: '' })
      toast.success('Log entry added.')
    } catch {
      toast.error('Failed to add log entry.')
    } finally {
      setLogSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Contracts</h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Service agreements, leases and support contracts</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={15} /> Add Contract
        </Button>
      </div>

      {/* Contracts table — memoized, won't re-render when editTarget changes */}
      <ContractsTable
        contracts={contracts}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDeleteSelected={handleDeleteSelected}
        renewContract={renewContract}
      />

      {/* Edit dialog — only mounts when a contract is selected */}
      {editTarget && (
        <EditContractDialog contract={editTarget} onClose={() => setEditTarget(null)} />
      )}

      {/* Add Contract Dialog — isolated component so date changes don't re-render the table */}
      {addOpen && <AddContractDialog onClose={() => setAddOpen(false)} />}

      {/* Logs History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw size={15} className="text-blue-500" />
            Logs History
            <span className="ml-auto text-xs font-normal text-muted-foreground/70">
              {renewalLogs.length} record{renewalLogs.length !== 1 ? 's' : ''}
            </span>
            <Button size="sm" className="h-7 text-xs gap-1.5 ml-2" onClick={() => setAddLogOpen(true)}>
              <Plus size={12} /> Add Log
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {renewalLogs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No logs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Renewed To</TableHead>
                  <TableHead>New Period</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewalLogs.map(log => {
                  const eventStyles: Record<string, string> = {
                    created:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    updated:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    renewed:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                    expired:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    deleted:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  }
                  const eventLabels: Record<string, string> = {
                    created: 'Created', updated: 'Updated', renewed: 'Renewed', expired: 'Expired', deleted: 'Deleted',
                  }
                  return (
                  <TableRow key={log.id} className="h-12 border-b border-border/60 bg-white dark:border-border dark:bg-card">
                    <TableCell className="align-middle">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${eventStyles[log.event_type] ?? 'bg-muted text-muted-foreground'}`}>
                        {eventLabels[log.event_type] ?? log.event_type}
                      </span>
                    </TableCell>
                    <TableCell className="align-middle text-sm font-medium">
                      {log.original_contract?.name ?? log.contract_name ?? '—'}
                    </TableCell>
                    <TableCell className="align-middle text-sm">{log.renewed_contract?.name ?? '—'}</TableCell>
                    <TableCell className="align-middle text-sm text-muted-foreground">
                      {log.renewed_contract
                        ? `${new Date(log.renewed_contract.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(log.renewed_contract.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : '—'}
                    </TableCell>
                    <TableCell className="align-middle text-sm">{log.renewed_by?.name ?? 'System'}</TableCell>
                    <TableCell className="align-middle text-sm text-muted-foreground">
                      {new Date(log.renewed_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell className="align-middle">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                            <Trash2 size={13} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this log entry?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => deleteRenewalLog.mutate(log.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Log Dialog */}
      {addLogOpen && (
        <Dialog open onOpenChange={open => { if (!open) setAddLogOpen(false) }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Log Entry</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Event Type</Label>
                <Select value={logForm.event_type} onValueChange={v => setLogForm(f => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="renewed">Renewed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contract <span className="text-destructive">*</span></Label>
                <Select value={logForm.original_contract_id} onValueChange={v => setLogForm(f => ({ ...f, original_contract_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select contract…" /></SelectTrigger>
                  <SelectContent>
                    {allContracts.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {logForm.event_type === 'renewed' && (
                <div className="space-y-1.5">
                  <Label>Renewed To</Label>
                  <Select value={logForm.renewed_contract_id} onValueChange={v => setLogForm(f => ({ ...f, renewed_contract_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select renewed contract…" /></SelectTrigger>
                    <SelectContent>
                      {allContracts.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Date <span className="text-destructive">*</span></Label>
                <DatePicker value={logForm.renewed_at} onChange={v => setLogForm(f => ({ ...f, renewed_at: v }))} toYear={new Date().getFullYear() + 1} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddLogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddLog} disabled={logSaving}>{logSaving ? 'Saving…' : 'Add Log'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
