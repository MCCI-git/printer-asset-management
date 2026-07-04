import { BarChart3, FileDown, CreditCard, Package, Building2, Wrench, Activity, Receipt, ChevronDown, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePrinters, useConsumables, useSuppliers, useAllBudgets, useContracts } from '@/hooks/useData'
import {
  exportAssetInventory, exportOpexMonthly, exportConsumableUsage,
  exportSupplierSpend, exportMaintenanceHistory, exportOpexYtd,
} from '@/lib/exportReport'
import { useState } from 'react'
import type { Printer, Consumable, Supplier, Contract } from '@/types'

type Format = 'csv' | 'pdf'
type ReportKey = 'asset' | 'opex-monthly' | 'consumable' | 'supplier' | 'maintenance' | 'opex-ytd'

const reportTypes: { key: ReportKey; title: string; icon: React.ElementType; desc: string; color: string; accent: string }[] = [
  { key: 'asset',        title: 'Asset Inventory Report',  icon: BarChart3,  desc: 'Full printer asset list with status, location and assignments',         color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',           accent: 'border-l-blue-500'    },
  { key: 'opex-monthly', title: 'OPEX Monthly Report',     icon: CreditCard, desc: 'Monthly managed print costs and per-page cost analysis',                color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',        accent: 'border-l-amber-500'   },
  { key: 'consumable',   title: 'Consumable Usage Report', icon: Package,    desc: 'Stock levels, reorder alerts and consumable cost tracking',             color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',  accent: 'border-l-emerald-500' },
  { key: 'supplier',     title: 'Supplier Spend Report',   icon: Building2,  desc: 'YTD spend by supplier vs budget with performance ratings',              color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',     accent: 'border-l-orange-500'  },
  { key: 'maintenance',  title: 'Maintenance History',     icon: Wrench,     desc: 'Service history, overdue assets and repair vs replace analysis',        color: 'text-muted-foreground bg-muted/50 dark:bg-secondary',    accent: 'border-l-slate-400'   },
  { key: 'opex-ytd',    title: 'OPEX Report (YTD)',        icon: Receipt,    desc: 'Full OPEX position: contracts, managed print costs and budget forecast', color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',     accent: 'border-l-violet-500'  },
]

export function Reports() {
  const [loading, setLoading] = useState<string | null>(null)

  const { data: printersData }    = usePrinters({ per_page: 1000 })
  const { data: consumablesData } = useConsumables({ per_page: 1000 })
  const { data: suppliersData }   = useSuppliers({ per_page: 1000 })
  const { data: budgets = [] }    = useAllBudgets()
  const { data: contractsData }   = useContracts({ per_page: 1000 })

  const printers:    Printer[]    = printersData?.data    ?? []
  const consumables: Consumable[] = consumablesData?.data ?? []
  const suppliers:   Supplier[]   = suppliersData?.data   ?? []
  const contracts:   Contract[]   = contractsData?.data   ?? []

  async function handleExport(key: ReportKey, format: Format) {
    setLoading(`${key}-${format}`)
    try {
      switch (key) {
        case 'asset':        exportAssetInventory(format, printers);                                      break
        case 'opex-monthly': exportOpexMonthly(format, printers);                                         break
        case 'consumable':   exportConsumableUsage(format, consumables);                                   break
        case 'supplier':     exportSupplierSpend(format, suppliers);                                       break
        case 'maintenance':  exportMaintenanceHistory(format, printers);                                   break
        case 'opex-ytd':     exportOpexYtd(format, contracts, budgets, printers, consumables);             break
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Generate and export management reports</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reportTypes.map(r => {
          const Icon = r.icon
          const isLoading = loading?.startsWith(r.key)
          return (
            <Card key={r.key} className={`border-l-4 ${r.accent} cursor-pointer transition-shadow hover:shadow-md`}>
              <div className={`inline-flex rounded-lg p-2.5 ${r.color}`}>
                <Icon size={18} />
              </div>
              <h3 className="mt-3 font-semibold text-foreground dark:text-secondary-foreground">{r.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground/70 leading-relaxed">{r.desc}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Preview
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1" disabled={!!isLoading}>
                      {isLoading
                        ? <Loader2 size={12} className="animate-spin" />
                        : <FileDown size={12} />}
                      Export <ChevronDown size={11} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport(r.key, 'pdf')}>
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport(r.key, 'csv')}>
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          )
        })}
      </div>

      <Card>
        <div className="flex items-center gap-3 pb-1">
          <Activity size={16} className="text-blue-500" />
          <h2 className="font-semibold text-foreground dark:text-secondary-foreground">Recent Exports</h2>
        </div>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground dark:text-muted-foreground/70">
          {[
            { name: 'Asset Inventory Report', date: 'Jun 20, 2025', format: 'Excel' },
            { name: 'Supplier Spend Report',  date: 'Jun 15, 2025', format: 'PDF'   },
            { name: 'Contract Expiry Report', date: 'Jun 10, 2025', format: 'CSV'   },
          ].map(e => (
            <div key={e.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/50 px-3 py-2 dark:border-border dark:bg-secondary">
              <span>{e.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground/70">{e.date}</span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{e.format}</span>
                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  <FileDown size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
