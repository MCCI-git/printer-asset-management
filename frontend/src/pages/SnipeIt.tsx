import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Printer, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  QrCode, Wrench, LogIn, Settings, FileText, Eye, EyeOff, Plug, Unplug,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { snipeItApi } from '@/services/api'

/* ── helpers ──────────────────────────────────────────────────────── */

function DetailRow({ label, value }: { label: string; value?: string | React.ReactNode | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-2 text-sm last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 border-b border-border/40 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}{title}
      </h4>
      {children}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const s = status?.toLowerCase()
  const cls =
    s === 'deployable' || s === 'deployed'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : s === 'maintenance' || s === 'undeployable'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : s === 'archived' || s === 'retired'
      ? 'bg-muted text-muted-foreground'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  return (
    <span className={`inline-flex items-center rounded-full px-2 h-5 text-[10px] font-medium shrink-0 ${cls}`}>
      {status}
    </span>
  )
}

/* ── types ─────────────────────────────────────────────────────────── */

interface SnipeAsset {
  id: number
  name: string
  asset_tag: string
  serial?: string
  model?: { name: string }
  category?: { name: string }
  manufacturer?: { name: string }
  supplier?: { name: string }
  location?: { name: string }
  status_label?: { name: string; status_type: string }
  assigned_to?: { name: string; username?: string; type?: string }
  purchase_date?: { formatted: string }
  purchase_cost?: number | string
  warranty_months?: number
  notes?: string
  image?: string
  last_checkout?: { formatted: string }
  expected_checkin?: { formatted: string }
  custom_fields?: Record<string, { field: string; value: string }>
}

interface Config {
  url: string
  api_key: string
  category_id: number
}

/* ── main component ─────────────────────────────────────────────────── */

export function SnipeIt() {
  const queryClient = useQueryClient()
  /* connection config */
  const [config, setConfig] = useState<Config>({ url: '', api_key: '', category_id: 0 })
  const [configLoaded, setConfigLoaded] = useState(false)
  const [showKey, setShowKey] = useState(false)

  /* ui state */
  const [showSetup, setShowSetup] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  /* data */
  const [assets, setAssets] = useState<SnipeAsset[]>([])
  const [total, setTotal] = useState(0)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const isConfigured = !!(config.url && config.api_key)
  const asset = assets.find(a => a.id === selectedId) ?? null

  /* load saved config on mount */
  useEffect(() => {
    snipeItApi.getConfig()
      .then(res => {
        const d = res.data
        setConfig({ url: d.url ?? '', api_key: d.api_key ?? '', category_id: d.category_id ?? 0 })
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true))
  }, [])

  /* fetch assets — pulls from Snipe-IT, syncs to DB, updates Printers tab */
  const fetchAssets = useCallback(async (cfg?: Config) => {
    setFetching(true)
    setFetchError(null)
    try {
      // 1. Pull live data from Snipe-IT for display
      const res = await snipeItApi.assets()
      if (res.status >= 400 || res.data?.error) {
        throw new Error(res.data?.error ?? `Server returned ${res.status}`)
      }
      const rows: SnipeAsset[] = res.data?.rows ?? []
      const tot: number        = res.data?.total ?? rows.length
      setAssets(rows)
      setTotal(tot)
      setLastSync(new Date().toLocaleString())
      if (rows.length > 0 && !selectedId) setSelectedId(rows[0].id)

      // 2. Merge & upsert into DB, then refresh Printers tab
      await snipeItApi.sync()
      queryClient.invalidateQueries({ queryKey: ['printers'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        err?.message ??
        'Failed to fetch assets.'
      setFetchError(msg)
      setAssets([])
      toast.error('Could not fetch assets', { description: msg })
    } finally {
      setFetching(false)
    }
  }, [selectedId, queryClient])

  /* save config then optionally fetch */
  const saveConfig = async (andFetch = false) => {
    setSaving(true)
    try {
      await snipeItApi.saveConfig(config)
      if (andFetch) {
        setShowSetup(false)
        await fetchAssets(config)
      } else {
        toast.success('Configuration saved.')
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (err?.code === 'ERR_NETWORK' ? 'Cannot reach the backend. Is `php artisan serve` running on port 8000?' : err?.message) ??
        'Failed to save.'
      toast.error('Failed to save configuration', { description: msg })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    try {
      // Pass credentials inline — no save required
      const res = await snipeItApi.test({ url: config.url, api_key: config.api_key })
      const d = res.data
      const msg = d.message ?? (d.success ? 'Connected.' : 'Failed.')
      const detailParts = [
        d.working_url && d.working_url !== config.url ? `URL updated to: ${d.working_url}` : null,
        d.tested_url ? `Tested: ${d.tested_url}` : null,
      ].filter(Boolean)
      if (d.success) {
        toast.success(msg, { description: detailParts.join(' · ') || undefined })
      } else {
        toast.error(msg, { description: detailParts.join(' · ') || undefined })
      }
      // Auto-fill the correct URL if the probe found a working subdirectory
      if (d.success && d.working_url && d.working_url !== config.url) {
        setConfig(c => ({ ...c, url: d.working_url }))
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (err?.code === 'ERR_NETWORK' ? 'Cannot reach the backend server. Is `php artisan serve` running?' : err?.message) ??
        'Connection test failed.'
      toast.error('Connection test failed', { description: msg })
    } finally {
      setTesting(false)
    }
  }

  if (!configLoaded) {
    return (
      <div className="flex h-60 items-center justify-center text-muted-foreground text-sm gap-2">
        <RefreshCw size={15} className="animate-spin" /> Loading…
      </div>
    )
  }

  /* ── setup / edit-config panel ────────────────────────────────────── */
  const setupPanel = (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug size={16} />
          {isConfigured && showSetup ? 'Edit Snipe-IT Connection' : 'Connect to Snipe-IT'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Snipe-IT Server URL <span className="text-destructive">*</span></Label>
          <Input
            value={config.url}
            onChange={e => setConfig(c => ({ ...c, url: e.target.value }))}
            placeholder="https://snipeit.yourcompany.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label>API Key <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={config.api_key}
              onChange={e => setConfig(c => ({ ...c, api_key: e.target.value }))}
              placeholder="snipeit-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Generate in Snipe-IT → Account Settings → API Tokens</p>
        </div>

        <div className="space-y-1.5">
          <Label>Category ID <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
          <Input
            type="number"
            min="0"
            value={config.category_id || ''}
            onChange={e => setConfig(c => ({ ...c, category_id: Number(e.target.value) || 0 }))}
            placeholder="Leave empty to fetch all assets"
          />
          <p className="text-xs text-muted-foreground">Snipe-IT → Admin → Categories. Filters to printers only.</p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={testing || !config.url || !config.api_key}
            onClick={testConnection}
          >
            {testing
              ? <><div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />Testing…</>
              : <><Plug size={13} />Test Connection</>}
          </Button>
          <div className="ml-auto flex gap-2">
            {isConfigured && showSetup && (
              <Button variant="ghost" size="sm" onClick={() => setShowSetup(false)}>
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              disabled={saving || !config.url || !config.api_key}
              onClick={() => saveConfig(true)}
            >
              {saving
                ? <><div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Saving…</>
                : 'Save & Fetch Printers'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  /* ── first-time setup (no config yet) ───────────────────────────── */
  if (!isConfigured) {
    return (
      <div className="space-y-5">
        <div className="border-b border-border/40 pb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            Snipe-IT Integration
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              Printer Assets
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Enter your Snipe-IT credentials to get started.</p>
        </div>
        {setupPanel}
      </div>
    )
  }

  /* ── connected view ─────────────────────────────────────────────── */
  return (
    <div className="space-y-5 page-enter">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Snipe-IT Integration
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              Printer Assets
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new URL(config.url).hostname}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchAssets()} disabled={fetching}>
            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
            {fetching ? 'Fetching…' : 'Fetch Printers'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSetup(s => !s)}>
            <Settings size={14} /> Settings
          </Button>
        </div>
      </div>

      {/* Inline settings editor */}
      {showSetup && (
        <div className="pb-2">
          {setupPanel}
        </div>
      )}

      {/* Status bar */}
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            {fetching ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <RefreshCw size={9} className="animate-spin" /> Fetching
              </span>
            ) : fetchError ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <XCircle size={9} /> Error
              </span>
            ) : assets.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 size={9} /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground">
                <Unplug size={9} /> Not synced
              </span>
            )}
          </div>
          <span className="text-muted-foreground">
            Server: <span className="text-foreground font-mono">{new URL(config.url).hostname}</span>
          </span>
          <span className="text-muted-foreground">
            Assets: <span className="font-semibold text-foreground">{total > 0 ? `${assets.length} / ${total}` : assets.length}</span>
          </span>
          {config.category_id > 0 && (
            <span className="text-muted-foreground">
              Category ID: <span className="text-foreground">{config.category_id}</span>
            </span>
          )}
          <span className="text-muted-foreground">
            Last sync: <span className="text-foreground">{lastSync ?? 'Never'}</span>
          </span>
        </div>
      </div>

      {/* Empty / prompt state */}
      {!fetching && !fetchError && assets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 gap-3 text-muted-foreground">
          <Printer size={40} strokeWidth={1} />
          <p className="text-sm">Click <strong>Fetch Printers</strong> to pull assets from Snipe-IT</p>
          <p className="text-xs">{config.url}</p>
        </div>
      )}

      {/* Main grid: list + detail */}
      {assets.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Asset list */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Printer size={14} /> Printers
                <span className="ml-auto text-xs font-normal text-muted-foreground">{assets.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[560px] overflow-y-auto divide-y divide-border/40">
                {assets.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full text-left px-4 py-3 flex items-start justify-between gap-3 transition-colors border-l-2 ${
                      a.id === selectedId
                        ? 'bg-primary/5 border-primary'
                        : 'border-transparent hover:bg-muted/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                        {a.asset_tag}{a.model?.name ? ` · ${a.model.name}` : ''}
                      </p>
                    </div>
                    {a.status_label?.name && (
                      <StatusPill status={a.status_label.name} />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Asset detail */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Asset Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!asset ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40 gap-3">
                  <Printer size={44} strokeWidth={1} />
                  <p className="text-sm">Select a printer to view details</p>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {asset.image ? (
                        <img src={asset.image} alt={asset.name} className="h-16 w-16 rounded-lg border object-contain bg-muted" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                          <Printer size={28} strokeWidth={1.25} />
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold">{asset.name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {asset.status_label?.name && <StatusPill status={asset.status_label.name} />}
                          <span className="text-xs text-muted-foreground font-mono">{asset.asset_tag}</span>
                          {asset.serial && <span className="text-xs text-muted-foreground font-mono">S/N: {asset.serial}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">

                    <Section title="Asset Info" icon={<AlertCircle size={12} />}>
                      <DetailRow label="Model"         value={asset.model?.name} />
                      <DetailRow label="Category"      value={asset.category?.name} />
                      <DetailRow label="Manufacturer"  value={asset.manufacturer?.name} />
                      <DetailRow label="Supplier"      value={asset.supplier?.name} />
                      <DetailRow label="Location"      value={asset.location?.name} />
                      <DetailRow label="Purchase Date" value={asset.purchase_date?.formatted} />
                      <DetailRow label="Purchase Cost" value={asset.purchase_cost != null ? `Rs ${Number(asset.purchase_cost).toLocaleString()}` : null} />
                      <DetailRow label="Warranty"      value={asset.warranty_months ? `${asset.warranty_months} months` : null} />
                    </Section>

                    <Section title="Assignment" icon={<LogIn size={12} />}>
                      <DetailRow label="Assigned To"      value={asset.assigned_to?.name} />
                      <DetailRow label="Type"             value={asset.assigned_to?.type} />
                      <DetailRow label="Last Checkout"    value={asset.last_checkout?.formatted} />
                      <DetailRow label="Expected Return"  value={asset.expected_checkin?.formatted} />
                      {!asset.assigned_to && (
                        <p className="text-xs text-muted-foreground py-2">Not currently assigned.</p>
                      )}
                    </Section>

                  </div>

                  {/* Custom fields from Snipe-IT */}
                  {asset.custom_fields && Object.keys(asset.custom_fields).length > 0 && (
                    <Section title="Custom Fields" icon={<FileText size={12} />}>
                      {Object.values(asset.custom_fields).map(f => (
                        <DetailRow key={f.field} label={f.field} value={f.value} />
                      ))}
                    </Section>
                  )}

                  <Section title="Notes" icon={<FileText size={12} />}>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {asset.notes || <span className="text-muted-foreground italic">No notes.</span>}
                    </p>
                  </Section>

                  <Section title="QR / Barcode" icon={<QrCode size={12} />}>
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 py-6 gap-2 text-muted-foreground">
                      <QrCode size={36} strokeWidth={1} />
                      <span className="text-xs tracking-widest font-semibold">{asset.asset_tag}</span>
                    </div>
                  </Section>

                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

    </div>
  )
}
