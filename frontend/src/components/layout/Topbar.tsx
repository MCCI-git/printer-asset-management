import { Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'

interface TopbarProps {
  darkMode: boolean
  onToggleDark: () => void
  scrolled?: boolean
}

const pathToLabel: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/printers':    'Printers',
  '/capex':       'CAPEX',
  '/opex':        'OPEX',
  '/consumables': 'Consumables',
  '/contracts':   'Contracts',
  '/suppliers':   'Suppliers',
  '/budget':      'Budget',
  '/reports':     'Reports',
  '/maintenance': 'Maintenance',
  '/snipeit':     'Snipe-IT',
  '/admin':       'Admin',
  '/settings':    'Settings',
}

export function Topbar({ darkMode, onToggleDark, scrolled = false }: TopbarProps) {
  const location = useLocation()
  const pageLabel = pathToLabel[location.pathname] ?? 'Page'

  return (
    <header
      className="z-30 flex h-16 shrink-0 items-center justify-between bg-background px-4 border-b border-border/40"
      style={{
        boxShadow: scrolled
          ? '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)'
          : 'none',
        transition: 'box-shadow 0.25s ease',
      }}
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">PrinterAssets</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onToggleDark} className="h-8 w-8">
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  )
}
