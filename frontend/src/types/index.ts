export type UserRole = 'super-admin' | 'admin' | 'reports' | 'view'
export type UserStatus = 'active' | 'inactive' | 'locked'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  status: UserStatus
  avatar_url?: string
  last_login_at?: string
  created_at?: string
}

export type PrinterStatus = 'active' | 'maintenance' | 'retired' | 'lost'
export type CostType = 'CAPEX' | 'OPEX'

export interface Printer {
  id: number
  snipeit_id?: number
  asset_tag: string
  serial?: string
  name: string
  model?: string
  manufacturer?: string
  model_number?: string
  color_capability?: 'mono' | 'colour'
  ip_address?: string
  snmp_community?: string
  snmp_status?: 'fetched' | 'failed' | null
  cost_type: CostType
  purchase_cost?: number
  purchase_date?: string
  monthly_fixed_cost?: number
  per_page_cost?: number
  warranty?: string
  department?: string
  location?: string
  status: PrinterStatus
  assigned_to?: string
  checkout_date?: string
  image_url?: string
  notes?: string
  last_service_date?: string
  next_service_date?: string
  service_count: number
  created_at?: string
}

export type ConsumableType = 'Toner' | 'Paper' | 'Drum' | 'Waste' | 'Maintenance Kit'

export interface Consumable {
  id: number
  sku: string
  name: string
  type: ConsumableType
  color?: 'Black' | 'Cyan' | 'Magenta' | 'Yellow'
  unit_cost: number
  page_yield?: number
  purchase_date?: string
  invoice_number?: string
  quantity: number
  low_stock_threshold: number
  assigned_to?: string
  assignment_date?: string
  supplier_id?: number
  printer_id?: number
  supplier?: Supplier
  printer?: Printer
  created_at?: string
}

export interface ConsumableAssignment {
  id: number
  consumable_id: number
  printer_id: number
  assigned_at: string
  consumable: Consumable
  printer: Printer
}

export type ContractType = 'Service' | 'Support' | 'Lease' | 'Maintenance'
export type ContractStatus = 'active' | 'expired' | 'pending'

export interface Contract {
  id: number
  name: string
  vendor: string
  supplier_id?: number | null
  supplier?: { id: number; name: string } | null
  type: ContractType
  start_date: string
  end_date: string
  annual_cost: number
  covered_printers: number
  notice_period_days?: number
  contract_manager?: string
  pdf_path?: string
  notes?: string
  status: ContractStatus
  created_at?: string
}

export interface Supplier {
  id: number
  name: string
  contact_name?: string
  email?: string
  phone?: string
  brn?: string
  vat_number?: string
  notes?: string
  logo_url?: string
  salesperson_name?: string
  salesperson_email?: string
  salesperson_phone?: string
  spend_2023: number
  spend_2024: number
  spend_2025_ytd: number
  budget_2025: number
  rating: number
  preferred_supplier?: boolean
  contract_id?: number
  created_at?: string
}

export interface DashboardStats {
  printers: {
    total: number
    capex: number
    opex: number
    active: number
    maintenance: number
  }
  financials: {
    total_capex_cost: number
    monthly_opex_cost: number
    annual_cost: number
    cost_per_page: number
    ytd_spend: number
  }
  consumables: {
    low_stock: number
    out_of_stock: number
  }
  contracts: {
    expiring_90_days: number
    expiring_30_days: number
  }
  suppliers: {
    total: number
    ytd_spend: number
  }
  critical_alerts: CriticalAlert[]
}

export interface CriticalAlert {
  type: string
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  time: string
}

export interface SnipeItAsset {
  id: number
  asset_tag: string
  serial?: string
  name: string
  model?: { name: string }
  category?: { name: string }
  manufacturer?: { name: string }
  supplier?: { name: string }
  purchase_date?: { formatted: string }
  purchase_cost?: number
  cost_type?: string
  warranty_months?: number
  location?: { name: string }
  status_label?: { name: string; status_type: string }
  assigned_to?: { name: string; username: string }
  notes?: string
}

export type PageCountLogType = 'toner_change' | 'monthly_audit' | 'manual'

export interface PrinterPageCount {
  id: number
  printer_id: number
  count: number
  logged_at: string
  log_type: PageCountLogType
  notes?: string
  created_at?: string
}

export interface ActivityLog {
  id: number
  user_id?: number
  user_name?: string
  action: string
  model_type: string
  model_id?: number
  model_label: string
  description: string
  properties?: Record<string, { old: unknown; new: unknown }>
  created_at: string
}

export type WorkOrderPriority = 'high' | 'medium' | 'low'
export type WorkOrderStatus = 'open' | 'in-progress' | 'scheduled' | 'completed' | 'cancelled'

export interface WorkOrder {
  id: number
  wo_number: string
  printer_id: number
  printer: Printer
  issue: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  assignee?: string
  scheduled_date?: string
  completed_date?: string
  notes?: string
  cost?: number | null
  supplier_id?: number | null
  supplier?: { id: number; name: string } | null
  created_at?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  per_page: number
  current_page: number
  last_page: number
}
