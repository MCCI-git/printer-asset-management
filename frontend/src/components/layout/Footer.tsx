import { Printer } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="shrink-0 border-t border-border bg-card px-6 py-3">
      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <Printer size={12} className="text-primary" />
          <span className="font-medium text-foreground">PrinterAssets</span>
          <Separator orientation="vertical" className="h-3" />
          <span>ITIL 4 Aligned Asset Management</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span>CAPEX / OPEX Tracking</span>
          <Separator orientation="vertical" className="h-3" />
          <span>Snipe-IT Integration</span>
          <Separator orientation="vertical" className="h-3" />
          <span>© {year} PrinterAssets</span>
        </div>
      </div>
    </footer>
  )
}
