// @ts-nocheck
import { Skeleton } from '@/components/ui/skeleton'
import { TablePagination } from '@/components/ui/table-pagination'
import { useState } from 'react'
import { TrendingUp, Printer, CreditCard, Trash2, X, Wifi, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { usePrinters } from '@/hooks/useData'
import { networkApi } from '@/services/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export function Capex() {
  const qc = useQueryClient()
  const { data, isLoading } = usePrinters({ cost_type: 'CAPEX' })
  const printers = data?.data ?? []
  const [rowSelection, setRowSelection] = useState({})
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const pageCount = Math.ceil(printers.length / pageSize)
  const pagedPrinters = printers.slice(page * pageSize, (page + 1) * pageSize)

  const totalCost = printers.reduce((s: number, p: import('@/types').Printer) => s + (p.purchase_cost ?? 0), 0)
  const selectedCount = Object.keys(rowSelection).length

  // ── Network scan state ───────────────────────────────────────────────────
  const [scanOpen, setScanOpen] = useState(false)
  const [startIp, setStartIp] = useState('')
  const [endIp, setEndIp] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<{ ip: string; printer: { id: number; name: string; asset_tag: string } | null }[]>([])
  const [scannedCount, setScannedCount] = useState(0)
  const [assignments, setAssignments] = useState<Record<string, number | ''>>({})
  const [assigning, setAssigning] = useState<Record<string, boolean>>({})

  const handleScan = async () => {
    if (!startIp || !endIp) return toast.error('Enter a start and end IP.')
    setScanning(true)
    setScanResults([])
    setScannedCount(0)
    setAssignments({})
    try {
      const res = await networkApi.scan(startIp, endIp)
      setScanResults(res.data.results)
      setScannedCount(res.data.scanned)
      if (res.data.results.length === 0) toast.info('No printer devices found in range.')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Scan failed.')
    } finally {
      setScanning(false)
    }
  }

  const handleAssign = async (ip: string) => {
    const printerId = assignments[ip]
    if (!printerId) return toast.error('Select a printer first.')
    setAssigning(a => ({ ...a, [ip]: true }))
    try {
      await networkApi.assignIp(Number(printerId), ip)
      toast.success(`${ip} assigned.`)
      qc.invalidateQueries({ queryKey: ['printers'] })
      // Mark as assigned in results
      const printer = printers.find((p: any) => p.id === Number(printerId))
      setScanResults(r => r.map(row => row.ip === ip ? { ...row, printer: { id: Number(printerId), name: printer?.name ?? '', asset_tag: printer?.asset_tag ?? '' } } : row))
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Assignment failed.')
    } finally {
      setAssigning(a => ({ ...a, [ip]: false }))
    }
  }

  if (isLoading) return (
    <div className="space-y-5">
      <div className="border-b border-border/40 pb-4 space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 border-b border-border/40"><Skeleton className="h-4 w-32" /></div>
        <div className="p-4 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
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
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="border-b border-border/40 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">CAPEX Assets</h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Capital expenditure printers — owned assets with depreciation tracking</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setScanOpen(true); setScanResults([]); setScannedCount(0) }}>
          <Wifi size={14} /> Scan Network
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Total CAPEX Printers" value={printers.length} accentColor="bg-blue-500" icon={<Printer size={18} />} />
        <StatCard title="Total Purchase Cost" value={formatCurrency(totalCost)} accentColor="bg-pink-500" icon={<CreditCard size={18} />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={15} className="text-blue-500" />
            CAPEX Depreciation Schedule
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
                      <AlertDialogTitle>Delete {selectedCount} asset{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => setRowSelection({})}>Delete</AlertDialogAction>
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
                      if (v) setRowSelection(Object.fromEntries(printers.map((_: any, i: number) => [i, true])))
                      else setRowSelection({})
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedPrinters.map((p: any, i: number) => (
                <TableRow key={p.id} className="h-14 hover:bg-muted/50 transition-colors border-b border-border/60 bg-white dark:border-border dark:bg-card dark:hover:bg-secondary/50" data-state={rowSelection[i] ? 'selected' : undefined}>
                  <TableCell className="align-middle">
                    <Checkbox checked={!!rowSelection[i]} onCheckedChange={v => setRowSelection((s: any) => { const n = { ...s }; if (v) n[i] = true; else delete n[i]; return n })} aria-label="Select row" />
                  </TableCell>
                  <TableCell className="align-middle"><span className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{p.asset_tag}</span></TableCell>
                  <TableCell className="align-middle"><p className="font-medium">{p.name}</p></TableCell>
                  <TableCell className="align-middle text-xs text-muted-foreground">{p.department ?? '–'}</TableCell>
                  <TableCell className="align-middle"><span className="font-mono text-xs text-muted-foreground">{p.ip_address ?? '–'}</span></TableCell>
                  <TableCell className="align-middle text-xs">{p.purchase_date ? formatDate(p.purchase_date) : '–'}</TableCell>
                  <TableCell className="align-middle text-xs text-muted-foreground">{p.warranty ?? '–'}</TableCell>
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

      {/* Network Scan Dialog */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scan Network for Printers</DialogTitle>
            <DialogDescription>Enter an IP range to scan. Devices responding on printer ports (9100, 515, 631) will be listed.</DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Start IP</Label>
              <Input placeholder="e.g. 192.168.1.1" value={startIp} onChange={e => setStartIp(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">End IP</Label>
              <Input placeholder="e.g. 192.168.1.254" value={endIp} onChange={e => setEndIp(e.target.value)} />
            </div>
            <Button onClick={handleScan} disabled={scanning} className="gap-1.5">
              {scanning ? <><Loader2 size={14} className="animate-spin" /> Scanning…</> : <><Wifi size={14} /> Scan</>}
            </Button>
          </div>

          {scanning && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              <Loader2 size={14} className="animate-spin shrink-0" />
              Scanning network, this may take a few seconds…
            </div>
          )}

          {!scanning && scannedCount > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Scanned <span className="font-medium">{scannedCount}</span> addresses — found <span className="font-medium">{scanResults.length}</span> printer{scanResults.length !== 1 ? 's' : ''}.
              </p>

              {scanResults.length > 0 && (
                <div className="rounded-lg border max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Assign to Printer</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scanResults.map(row => (
                        <TableRow key={row.ip}>
                          <TableCell className="font-mono text-sm">{row.ip}</TableCell>
                          <TableCell className="text-sm">
                            {row.printer ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 size={13} /> {row.printer.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!row.printer && (
                              <Select value={String(assignments[row.ip] ?? '')} onValueChange={v => setAssignments(a => ({ ...a, [row.ip]: v === '' ? '' : Number(v) }))}>
                                <SelectTrigger className="h-7 text-xs w-44">
                                  <SelectValue placeholder="Select printer…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {printers.map((p: any) => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {!row.printer && (
                              <Button size="sm" className="h-7 text-xs" disabled={!assignments[row.ip] || assigning[row.ip]} onClick={() => handleAssign(row.ip)}>
                                {assigning[row.ip] ? <Loader2 size={12} className="animate-spin" /> : 'Assign'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
