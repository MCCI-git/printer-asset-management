export const PRINTER_STATUSES = [
  { value: 'active',      label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired',     label: 'Retired' },
  { value: 'lost',        label: 'Lost' },
] as const

export const COST_TYPES = [
  { value: 'CAPEX', label: 'CAPEX' },
  { value: 'OPEX',  label: 'OPEX' },
] as const

export const COLOR_CAPABILITIES = [
  { value: 'mono',   label: 'Mono' },
  { value: 'colour', label: 'Colour' },
] as const

export const WORK_ORDER_STATUSES = [
  { value: 'open',        label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
] as const

export const WORK_ORDER_PRIORITIES = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
] as const

export const CONSUMABLE_STATUSES = [
  { value: 'in stock',     label: 'In Stock' },
  { value: 'out of stock', label: 'Out of Stock' },
] as const

export const TONER_COLORS = [
  { value: 'Black',   label: 'Black' },
  { value: 'Cyan',    label: 'Cyan' },
  { value: 'Magenta', label: 'Magenta' },
  { value: 'Yellow',  label: 'Yellow' },
] as const

export const ACTIVITY_LOG_TYPES = [
  { value: 'Printer',    label: 'Printer' },
  { value: 'Consumable', label: 'Consumable' },
  { value: 'WorkOrder',  label: 'Work Order' },
  { value: 'Contract',   label: 'Contract' },
  { value: 'Supplier',   label: 'Supplier' },
  { value: 'Budget',     label: 'Budget' },
] as const

export const ACTIVITY_LOG_ACTIONS = [
  { value: 'created',    label: 'Created' },
  { value: 'updated',    label: 'Updated' },
  { value: 'deleted',    label: 'Deleted' },
  { value: 'assigned',   label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
] as const
