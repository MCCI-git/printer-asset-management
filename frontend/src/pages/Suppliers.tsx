// @ts-nocheck
import { Skeleton } from '@/components/ui/skeleton'
import { TablePagination } from '@/components/ui/table-pagination'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Building2, Download, Trash2, X, Plus, Camera, Package, ChevronDown, Pencil, Star } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useSuppliers, useSupplier, useCreateSupplier, useDeleteSupplier, useUpdateSupplier, useContracts } from '@/hooks/useData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

function FormSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between py-3 text-sm font-semibold hover:underline"
      >
        {title}
        <ChevronDown size={15} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

const EMPTY_FORM = {
  name: '', email: '', phone: '',
  brn: '', vat_number: '',
  salesperson_name: '', salesperson_email: '', salesperson_phone: '',
  notes: '',
  preferred_supplier: false,
  contract_id: '' as string,
}

export function Suppliers() {
  const { data: rawSuppliers, isLoading } = useSuppliers()
  const suppliers: any[] = (rawSuppliers as { data: any[] } | undefined)?.data ?? (Array.isArray(rawSuppliers) ? rawSuppliers : [])
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()

  const [addOpen, setAddOpen] = useState(false)
  const [viewSupplierId, setViewSupplierId] = useState<number | null>(null)
  const [viewSupplier, setViewSupplier] = useState<any | null>(null)
  const [editMode, setEditMode] = useState(false)
  const { data: fullSupplier } = useSupplier(viewSupplierId)
  const { data: contractsRaw } = useContracts({ per_page: 1000 })
  const contracts: any[] = (contractsRaw as any)?.data ?? []
  const [form, setForm] = useState(EMPTY_FORM)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [addError, setAddError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const openAdd = () => {
    setViewSupplier(null)
    setForm(EMPTY_FORM)
    setLogoFile(null)
    setLogoPreview(null)
    setAddError('')
    setAddOpen(true)
  }

  const openView = (s: any) => {
    setViewSupplier(s)
    setViewSupplierId(s.id)
    setEditMode(false)
    setAddOpen(true)
  }

  const startEdit = () => {
    const s = fullSupplier ?? viewSupplier
    populateEditForm(s)
  }

  const populateEditForm = (s: any) => {
    setForm({
      name:               s.name ?? '',
      email:              s.email ?? '',
      phone:              s.phone ?? '',
      brn:                s.brn ?? '',
      vat_number:         s.vat_number ?? '',
      salesperson_name:   s.salesperson_name ?? '',
      salesperson_email:  s.salesperson_email ?? '',
      salesperson_phone:  s.salesperson_phone ?? '',
      notes:              s.notes ?? '',
      preferred_supplier: s.preferred_supplier ?? false,
      contract_id:        s.contract_id ? String(s.contract_id) : '',
    })
    setLogoFile(null)
    setLogoPreview(null)
    setAddError('')
    setEditMode(true)
  }

  const handleUpdate = async () => {
    if (!form.name.trim()) { setAddError('Supplier name is required.'); return }
    setAddError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      if (form.email.trim())             fd.append('email', form.email.trim())
      if (form.phone.trim())             fd.append('phone', form.phone.trim())
      fd.append('brn', form.brn.trim())
      fd.append('vat_number', form.vat_number.trim())
      fd.append('salesperson_name', form.salesperson_name.trim())
      fd.append('salesperson_email', form.salesperson_email.trim())
      fd.append('salesperson_phone', form.salesperson_phone.trim())
      fd.append('notes', form.notes.trim())
      fd.append('preferred_supplier', form.preferred_supplier ? '1' : '0')
      if (form.contract_id) fd.append('contract_id', form.contract_id)
      if (logoFile) fd.append('logo', logoFile)
      fd.append('_method', 'PUT')
      await updateSupplier.mutateAsync({ id: viewSupplier.id, data: fd })
      setEditMode(false)
    } catch (err: any) {
      setAddError(err?.response?.data?.message ?? 'Failed to update supplier.')
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { setAddError('Supplier name is required.'); return }
    setAddError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      if (form.email.trim())             fd.append('email', form.email.trim())
      if (form.phone.trim())             fd.append('phone', form.phone.trim())
      if (form.brn.trim())               fd.append('brn', form.brn.trim())
      if (form.vat_number.trim())        fd.append('vat_number', form.vat_number.trim())
      if (form.salesperson_name.trim())  fd.append('salesperson_name', form.salesperson_name.trim())
      if (form.salesperson_email.trim()) fd.append('salesperson_email', form.salesperson_email.trim())
      if (form.salesperson_phone.trim()) fd.append('salesperson_phone', form.salesperson_phone.trim())
      if (form.notes.trim())             fd.append('notes', form.notes.trim())
      fd.append('preferred_supplier', form.preferred_supplier ? '1' : '0')
      if (form.contract_id)              fd.append('contract_id', form.contract_id)
      if (logoFile)                      fd.append('logo', logoFile)
      await createSupplier.mutateAsync(fd)
      setForm(EMPTY_FORM)
      setLogoFile(null)
      setLogoPreview(null)
      setAddOpen(false)
    } catch (err: any) {
      setAddError(err?.response?.data?.message ?? 'Failed to create supplier.')
    }
  }

  const [filterPreferred, setFilterPreferred] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const selectedCount = Object.keys(rowSelection).length
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const visibleSuppliers = filterPreferred ? suppliers.filter((s: any) => s.preferred_supplier) : suppliers
  const pageCount = Math.ceil(visibleSuppliers.length / pageSize)
  const pagedSuppliers = visibleSuppliers.slice(page * pageSize, (page + 1) * pageSize)

  const togglePreferred = async (s: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const fd = new FormData()
    fd.append('name', s.name)
    fd.append('preferred_supplier', s.preferred_supplier ? '0' : '1')
    fd.append('_method', 'PUT')
    await updateSupplier.mutateAsync({ id: s.id, data: fd })
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-border/40 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Vendor performance and spend tracking</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus size={13} /> Add Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 size={15} /> Supplier Overview
            <span className="ml-auto text-xs font-normal text-muted-foreground/70">{suppliers.length} records</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFilterPreferred(f => !f); setPage(0) }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${filterPreferred ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' : 'border-border text-muted-foreground hover:border-amber-400 hover:text-amber-500'}`}
            >
              <Star size={12} className={filterPreferred ? 'fill-amber-400 text-amber-400' : ''} />
              Preferred Suppliers
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-3 h-14 border-b border-border/40">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-2 w-24 rounded-full" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <>{selectedCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 mb-3">
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
                        <AlertDialogTitle>Delete {selectedCount} supplier{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={async () => {
                          const ids = Object.keys(rowSelection).map(i => pagedSuppliers[Number(i)]?.id).filter(Boolean)
                          await Promise.all(ids.map(id => deleteSupplier.mutateAsync(id)))
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
                      checked={pagedSuppliers.length > 0 && pagedSuppliers.every((_: any, i: number) => !!rowSelection[i])}
                      onCheckedChange={v => {
                        if (v) setRowSelection(Object.fromEntries(pagedSuppliers.map((_: any, i: number) => [i, true])))
                        else setRowSelection({})
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedSuppliers.map((s, i) => (
                  <TableRow
                    key={s.id}
                    className="h-14 hover:bg-muted/50 transition-colors border-b border-border/60 bg-white dark:border-border dark:bg-card dark:hover:bg-secondary/50 cursor-pointer"
                    style={{ opacity: 0, animation: `fadeIn 0.3s ease ${i * 0.07}s forwards` }}
                    data-state={rowSelection[i] ? 'selected' : undefined}
                    onClick={e => { if ((e.target as HTMLElement).closest('[role="checkbox"]')) return; openView(s) }}
                  >
                    <TableCell className="align-middle">
                      <Checkbox checked={!!rowSelection[i]} onCheckedChange={v => setRowSelection((sel: any) => { const n = { ...sel }; if (v) n[i] = true; else delete n[i]; return n })} aria-label="Select row" />
                    </TableCell>
                    <TableCell className="align-middle w-8">
                      <button onClick={e => togglePreferred(s, e)} className="flex items-center justify-center rounded p-0.5 hover:scale-110 transition-transform" title={s.preferred_supplier ? 'Remove preferred' : 'Mark as preferred'}>
                        <Star size={15} className={s.preferred_supplier ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40 hover:text-amber-400'} />
                      </button>
                    </TableCell>
                    <TableCell className="align-middle">
                      <p className="font-semibold text-foreground dark:text-secondary-foreground">{s.name}</p>
                    </TableCell>
                    <TableCell className="align-middle">
                      <p className="text-sm">{s.contact_name}</p>
                      <p className="text-xs text-muted-foreground/70">{s.email}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              totalRows={suppliers.length}
              pageSize={pageSize}
              onPageSizeChange={size => { setPageSize(size); setPage(0) }}
            />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={o => { if (!o) { setAddOpen(false); setTimeout(() => { setViewSupplier(null); setViewSupplierId(null); setEditMode(false); setAddError('') }, 150) } }}>
        <DialogContent className={viewSupplier ? "!w-[600px] !max-w-[95vw] sm:!max-w-[600px] !max-h-[700px] flex flex-col" : "max-w-md"}>
          <DialogHeader className="flex-row items-center justify-between pr-8">
            <DialogTitle>{viewSupplier ? (fullSupplier?.name ?? viewSupplier.name) : 'Add Supplier'}</DialogTitle>
            {viewSupplier && !editMode && (
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={startEdit}>
                <Pencil size={12} /> Edit
              </Button>
            )}
            {viewSupplier && editMode && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditMode(false); setAddError('') }}>
                Cancel
              </Button>
            )}
          </DialogHeader>

          <div className={`grid grid-cols-1 gap-6 py-2 ${viewSupplier ? 'sm:grid-cols-2 flex-1 overflow-y-auto min-h-0' : ''}`}>
            {/* LEFT — form */}
            <div className={`space-y-3 overflow-y-auto pr-1 ${viewSupplier ? 'max-h-[560px]' : 'max-h-[70vh] mx-auto w-full max-w-md'}`}>
              {/* Avatar */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="relative group rounded-full"
                  style={{ cursor: (!viewSupplier || editMode) ? 'pointer' : 'default' }}
                  onClick={() => (!viewSupplier || editMode) && fileRef.current?.click()}
                >
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={logoPreview ?? (viewSupplier ? (fullSupplier?.logo_url ?? viewSupplier.logo_url) : undefined)} alt="Logo" />
                    <AvatarFallback className="text-lg font-semibold bg-muted">
                      {(viewSupplier?.name || form.name) ? (viewSupplier?.name || form.name).charAt(0).toUpperCase() : <Building2 size={20} />}
                    </AvatarFallback>
                  </Avatar>
                  {(!viewSupplier || editMode) && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={18} className="text-white" />
                    </div>
                  )}
                </div>
                {(!viewSupplier || editMode) && (
                  <>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    {logoFile
                      ? <button onClick={() => { setLogoFile(null); setLogoPreview(null) }} className="text-xs text-destructive hover:underline">Remove photo</button>
                      : <p className="text-xs text-muted-foreground">Click to upload · max 2 MB</p>
                    }
                  </>
                )}
              </div>

              {viewSupplier && !editMode ? (
                <div className="space-y-2 text-sm">
                  {fullSupplier?.email && <div><span className="text-muted-foreground text-xs uppercase tracking-wide">Email</span><p>{fullSupplier.email}</p></div>}
                  {fullSupplier?.phone && <div><span className="text-muted-foreground text-xs uppercase tracking-wide">Phone</span><p>{fullSupplier.phone}</p></div>}
                  {(fullSupplier?.brn || fullSupplier?.vat_number) && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Business Details</p>
                      {fullSupplier?.brn && <p className="text-xs">BRN: <span className="font-medium">{fullSupplier.brn}</span></p>}
                      {fullSupplier?.vat_number && <p className="text-xs">VAT: <span className="font-medium">{fullSupplier.vat_number}</span></p>}
                    </div>
                  )}
                  {fullSupplier?.salesperson_name && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Salesperson</p>
                      <p className="font-medium">{fullSupplier.salesperson_name}</p>
                      {fullSupplier.salesperson_email && <p className="text-xs text-muted-foreground">{fullSupplier.salesperson_email}</p>}
                      {fullSupplier.salesperson_phone && <p className="text-xs text-muted-foreground">{fullSupplier.salesperson_phone}</p>}
                    </div>
                  )}
                  {fullSupplier?.notes && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{fullSupplier.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <FormSection title="Company Info" defaultOpen>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="sup-name">Company *</Label>
                        <Input id="sup-name" placeholder="e.g. Konica Minolta" value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sup-email">Email</Label>
                        <Input id="sup-email" type="email" placeholder="e.g. info@vendor.com" value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sup-phone">Phone</Label>
                        <Input id="sup-phone" placeholder="e.g. +230 5xx xxxx" value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="sup-brn">BRN</Label>
                          <Input id="sup-brn" placeholder="e.g. C07123456" value={form.brn}
                            onChange={e => setForm(f => ({ ...f, brn: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sup-vat">VAT Number</Label>
                          <Input id="sup-vat" placeholder="e.g. VAT123456" value={form.vat_number}
                            onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Salesperson">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="sup-sp-name">Name</Label>
                        <Input id="sup-sp-name" placeholder="e.g. Jane Doe" value={form.salesperson_name}
                          onChange={e => setForm(f => ({ ...f, salesperson_name: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sup-sp-email">Email</Label>
                        <Input id="sup-sp-email" type="email" placeholder="e.g. jane@vendor.com" value={form.salesperson_email}
                          onChange={e => setForm(f => ({ ...f, salesperson_email: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sup-sp-phone">Phone</Label>
                        <Input id="sup-sp-phone" placeholder="e.g. +230 5xx xxxx" value={form.salesperson_phone}
                          onChange={e => setForm(f => ({ ...f, salesperson_phone: e.target.value }))} />
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Notes">
                    <Textarea id="sup-notes" placeholder="e.g. Preferred supplier for toner cartridges…" rows={6} value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </FormSection>
                  <FormSection title="Classification">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="sup-preferred"
                          checked={form.preferred_supplier}
                          onChange={e => setForm(f => ({ ...f, preferred_supplier: e.target.checked }))}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="sup-preferred" className="cursor-pointer">Mark as Preferred Supplier</Label>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Linked Contract</Label>
                        <Select value={form.contract_id} onValueChange={v => setForm(f => ({ ...f, contract_id: v }))}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="— None —" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— None —</SelectItem>
                            {contracts.map((c: any) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.vendor})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </FormSection>
                  {addError && <p className="text-xs text-destructive">{addError}</p>}
                </>
              )}
            </div>

            {/* MIDDLE — consumables list */}
            {viewSupplier && (
              <div className="flex flex-col gap-2 min-h-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Package size={12} /> Items
                </p>
                <div className="flex-1 overflow-y-auto max-h-[420px] rounded-lg border border-border divide-y divide-border">
                  {(fullSupplier?.consumables ?? []).length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No purchases recorded yet.</div>
                  ) : (fullSupplier?.consumables ?? []).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.sku} · {c.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(c.unit_cost)}</p>
                        <p className="text-xs text-muted-foreground">Qty {c.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {(fullSupplier?.consumables ?? []).length > 0 && (
                  <div className="flex justify-between text-sm pt-1 border-t border-border">
                    <span className="text-muted-foreground">Total spend</span>
                    <span className="font-semibold">
                      {formatCurrency((fullSupplier?.consumables ?? []).reduce((s: number, c: any) => s + c.unit_cost * c.quantity, 0))}
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>

          {(!viewSupplier || editMode) && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { if (editMode) { setEditMode(false); setAddError('') } else setAddOpen(false) }}>Cancel</Button>
              <Button onClick={editMode ? handleUpdate : handleAdd} disabled={createSupplier.isPending || updateSupplier.isPending}>
                {(createSupplier.isPending || updateSupplier.isPending) ? 'Saving…' : editMode ? 'Save Changes' : 'Add Supplier'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
