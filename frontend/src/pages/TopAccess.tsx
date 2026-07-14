import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Printer, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Settings, Wifi, WifiOff, Activity,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { topAccessApi } from '@/services/api'

interface TonerInfo { name: string; current: number; max: number; percent: number }
interface PrinterData {
  ip: string; name: string; reachable: boolean; status: string
  serial: string | null; model: string | null; total_pages: number | null
  toner: TonerInfo[]; error: string | null
}

function StatusPill({ status, reachable }: { status: string; reachable: boolean }) {
  if (!reachable) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 h-5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <WifiOff size={9} /> Offline
    </span>
  )
  const cls = status === 'idle' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : status === 'printing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    : status === 'warmup' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 h-5 text-[10px] font-medium ${cls}`}>
      <Activity size={9} /> {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function TonerBar({ toner }: { toner: TonerInfo }) {
  const color = toner.name === 'black' ? 'bg-gray-800 dark:bg-gray-300'
    : toner.name === 'cyan' ? 'bg-cyan-500'
    : toner.name === 'magenta' ? 'bg-pink-500'
    : toner.name === 'yellow' ? 'bg-yellow-400'
    : 'bg-primary'
  const levelCls = toner.percent <= 15 ? 'text-red-600 dark:text-red-400'
    : toner.percent <= 30 ? 'text-amber-600 dark:text-amber-400'
    : 'text-muted-foreground'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize font-medium">{toner.name}</span>
        <span className={`font-semibold ${levelCls}`}>{toner.percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${toner.percent}%` }} />
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-2 text-sm last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  )
}

function PrinterCard({ data }: { data: PrinterData }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{data.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{data.ip}</p>
          </div>
          <StatusPill status={data.status} reachable={data.reachable} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.error && !data.reachable && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {data.error}
          </div>
        )}
        {data.reachable && (
          <>
            <div className="rounded-lg border border-border bg-card/60 p-3 space-y-0.5">
              <DetailRow label="Model"       value={data.model} />
              <DetailRow label="Serial"      value={data.serial} />
              <DetailRow label="Total Pages" value={data.total_pages?.toLocaleString()} />
            </div>
            {data.toner.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Toner Levels</p>
                {data.toner.map(t => <TonerBar key={t.name} toner={t} />)}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function TopAccess() {
  const [printers, setPrinters]           = useState<PrinterData[]>([])
  const [loading, setLoading]             = useState(false)
  const [showSettings, setShowSettings]   = useState(false)
  const [testIp, setTestIp]               = useState('')
  const [testCommunity, setTestCommunity] = useState('public')
  const [testResult, setTestResult]       = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting]             = useState(false)

  const fetchPrinters = useCallback(async () => {
    setLoading(true)
    try {
      const res = await topAccessApi.printers()
      if (Array.isArray(res.data)) {
        setPrinters(res.data)
      } else {
        setPrinters([])
        toast.error('Unexpected response from server.')
      }
    } catch {
      toast.error('Failed to fetch printer data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const testConnection = async () => {
    if (!testIp) { toast.error('Enter an IP address.'); return }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await topAccessApi.test({ ip: testIp, community: testCommunity })
      setTestResult(res.data)
    } catch {
      setTestResult({ success: false, message: 'Connection test failed.' })
    } finally {
      setTesting(false)
    }
  }

  const onlineCount  = printers.filter(p => p.reachable).length
  const offlineCount = printers.filter(p => !p.reachable).length

  return (
    <div className="space-y-6 -mt-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground flex items-center gap-2">
            <Printer size={22} className="text-primary" /> TopAccess — Live Printer Data
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live data fetched via SNMP from printers on your network. Add printers with an IP from the Printers page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowSettings(true); setTestResult(null) }}>
            <Settings size={14} className="mr-1.5" /> Test Connection
          </Button>
          <Button size="sm" onClick={fetchPrinters} disabled={loading}>
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Fetching…' : 'Fetch Data'}
          </Button>
        </div>
      </div>

      {printers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{printers.length} printer{printers.length !== 1 ? 's' : ''}</Badge>
          {onlineCount > 0  && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">{onlineCount} online</Badge>}
          {offlineCount > 0 && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">{offlineCount} offline</Badge>}
        </div>
      )}

      {!loading && printers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Printer size={40} className="text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No printers found.</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Add printers with an IP address from the Printers page, then click Fetch Data.
            </p>
            <Button size="sm" onClick={fetchPrinters} disabled={loading}>
              <RefreshCw size={13} className="mr-1.5" /> Fetch Data
            </Button>
          </CardContent>
        </Card>
      )}

      {printers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {printers.map(p => <PrinterCard key={p.ip} data={p} />)}
        </div>
      )}

      {/* Test Connection panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings size={18} /> Test SNMP Connection
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">IP Address</Label>
                  <Input placeholder="192.168.1.100" value={testIp} onChange={e => setTestIp(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Community String</Label>
                  <Input placeholder="public" value={testCommunity} onChange={e => setTestCommunity(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
                {testing ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : <Wifi size={13} className="mr-1.5" />}
                {testing ? 'Testing…' : 'Test'}
              </Button>
              {testResult && (
                <div className={`flex items-start gap-2 rounded-md p-2.5 text-xs ${testResult.success ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {testResult.success ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <XCircle size={13} className="shrink-0 mt-0.5" />}
                  {testResult.message}
                </div>
              )}
              <div className="flex gap-2 rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-700 dark:text-blue-400">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <p>To enable SNMP: open the printer's web interface → <strong>Network</strong> → <strong>SNMP</strong> → enable SNMPv1/v2c and set the community name to <code>public</code>.</p>
              </div>
              <div className="flex justify-end pt-2 border-t border-border/40">
                <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
