import type { DashboardStats, Printer, Consumable, Contract, Supplier, SnipeItAsset, User } from '@/types'

export const mockUsers: Array<User & { password: string }> = [
  { id: 1, name: 'Super Admin', email: 'admin@printers.com', password: 'password', role: 'super-admin', status: 'active' },
  { id: 2, name: 'John Doe', email: 'john@printers.com', password: 'password', role: 'admin', status: 'active' },
  { id: 3, name: 'Jane Smith', email: 'jane@printers.com', password: 'password', role: 'reports', status: 'active' },
  { id: 4, name: 'Bob Johnson', email: 'bob@printers.com', password: 'password', role: 'view', status: 'active' },
]

export const mockDashboardStats: DashboardStats = {
  printers: { total: 47, capex: 32, opex: 15, active: 38, maintenance: 5 },
  financials: {
    total_capex_cost: 98400, monthly_opex_cost: 1200, annual_cost: 184200,
    cost_per_page: 0.018, ytd_spend: 131550,
  },
  consumables: { low_stock: 2, out_of_stock: 1 },
  contracts: { expiring_90_days: 3, expiring_30_days: 1 },
  suppliers: { total: 12, ytd_spend: 131550 },
  critical_alerts: [
    { type: 'printer_error', title: 'PRN-006 - HP PageWide Pro', description: 'Fuser unit failure detected. Printer requires immediate service.', severity: 'critical', time: '15 min ago' },
    { type: 'contract_expiring', title: 'HP Printers Support Contract', description: 'Contract expires in 2 days (May 31, 2025). Immediate renewal required.', severity: 'critical', time: '1 hour ago' },
  ],
}

export const mockPrinters: Printer[] = [
  { id: 1, asset_tag: 'PRN-001', name: 'HP LaserJet Pro MFP', serial: 'HP-2025-001', model: 'HP LaserJet Pro MFP M428fdw', cost_type: 'CAPEX', purchase_cost: 4200, purchase_date: '2025-01-15', warranty: 'Jan 2028 (3 years)', department: 'IT', location: 'IT Department', status: 'active', assigned_to: 'John Smith', service_count: 3, last_service_date: '2025-06-10', next_service_date: '2025-09-10' },
  { id: 2, asset_tag: 'PRN-002', name: 'Xerox VersaLink C405', serial: 'XRX-2025-001', model: 'Xerox VersaLink C405', cost_type: 'OPEX', monthly_fixed_cost: 120, per_page_cost: 0.022, purchase_date: '2025-03-01', warranty: 'Mar 2027 (2 years)', department: 'Admin', location: 'Admin Office', status: 'active', assigned_to: 'Jane Admin', service_count: 1 },
  { id: 3, asset_tag: 'PRN-003', name: 'Brother HL-L2350DW', serial: 'BRTH-2024-001', model: 'Brother HL-L2350DW', cost_type: 'CAPEX', purchase_cost: 1800, purchase_date: '2024-12-10', warranty: 'Dec 2026 (2 years)', department: 'Finance', location: 'Finance Department', status: 'active', assigned_to: 'Finance Team', service_count: 0 },
  { id: 4, asset_tag: 'PRN-004', name: 'Canon imageCLASS MF743', serial: 'CAN-2025-001', model: 'Canon imageCLASS MF743', cost_type: 'OPEX', monthly_fixed_cost: 95, per_page_cost: 0.018, purchase_date: '2025-02-15', warranty: 'Feb 2027 (2 years)', department: 'HR', location: 'HR Department', status: 'maintenance', assigned_to: 'HR Team', service_count: 2 },
  { id: 5, asset_tag: 'PRN-005', name: 'HP PageWide Pro', serial: 'HP-2025-002', model: 'HP PageWide Pro 452dw', cost_type: 'OPEX', monthly_fixed_cost: 150, per_page_cost: 0.025, purchase_date: '2025-01-10', department: 'Operations', location: 'Operations Floor', status: 'active', assigned_to: 'Ops Team', service_count: 0 },
]

export const mockConsumables: Consumable[] = [
  { id: 1, sku: 'TON-2025-001', name: 'Black Toner HP 12A', type: 'Toner', unit_cost: 89, quantity: 12, low_stock_threshold: 3, assigned_to: 'HP LaserJet Pro MFP', assignment_date: '2025-03-10' },
  { id: 2, sku: 'TON-2025-002', name: 'Cyan Toner HP 12A', type: 'Toner', unit_cost: 92, quantity: 3, low_stock_threshold: 3, assigned_to: 'HP LaserJet Pro MFP', assignment_date: '2025-03-12' },
  { id: 3, sku: 'TON-2025-003', name: 'Brother TN-760', type: 'Toner', unit_cost: 78, quantity: 1, low_stock_threshold: 3, assigned_to: 'Brother HL-L2350DW', assignment_date: '2025-03-14' },
  { id: 4, sku: 'TON-2025-004', name: 'Xerox Toner 106R', type: 'Toner', unit_cost: 110, quantity: 0, low_stock_threshold: 2, assigned_to: 'Xerox VersaLink C405', assignment_date: '2025-03-16' },
  { id: 5, sku: 'PAP-2025-001', name: 'Premium A4 Paper', type: 'Paper', unit_cost: 12.50, quantity: 28, low_stock_threshold: 5, assigned_to: 'Shared' },
  { id: 6, sku: 'DRM-2025-001', name: 'Drum Unit HP 12A', type: 'Drum', unit_cost: 145, quantity: 4, low_stock_threshold: 2, assigned_to: 'HP LaserJet Pro MFP', assignment_date: '2025-03-15' },
  { id: 7, sku: 'WST-2025-001', name: 'Waste Toner Container', type: 'Waste', unit_cost: 65, quantity: 2, low_stock_threshold: 2, assigned_to: 'Xerox VersaLink C405', assignment_date: '2025-03-16' },
  { id: 8, sku: 'MKT-2025-001', name: 'Maintenance Kit HP', type: 'Maintenance Kit', unit_cost: 210, quantity: 2, low_stock_threshold: 1, assigned_to: 'HP LaserJet Pro MFP', assignment_date: '2025-03-18' },
]

export const mockContracts: Contract[] = [
  { id: 1, name: 'Printer Maintenance 2025', vendor: 'Cartridge World', type: 'Service', start_date: '2025-01-01', end_date: '2025-12-31', annual_cost: 12000, covered_printers: 15, status: 'active' },
  { id: 2, name: 'HP Printers Support', vendor: 'HP Inc.', type: 'Support', start_date: '2024-06-01', end_date: '2025-07-31', annual_cost: 8400, covered_printers: 8, status: 'active' },
  { id: 3, name: 'Xerox Lease Agreement', vendor: 'Xerox Corp.', type: 'Lease', start_date: '2025-03-01', end_date: '2027-02-28', annual_cost: 18000, covered_printers: 5, status: 'active' },
]

export const mockSuppliers: Supplier[] = [
  { id: 1, name: 'HP Inc.', contact_name: 'John Kim', email: 'john.kim@hp.com', spend_2023: 48000, spend_2024: 52400, spend_2025_ytd: 42600, budget_2025: 65000, rating: 4.9 },
  { id: 2, name: 'Cartridge World', contact_name: 'Sarah Lee', email: 'sarah@cw.com', spend_2023: 38200, spend_2024: 41500, spend_2025_ytd: 32100, budget_2025: 50000, rating: 4.8 },
  { id: 3, name: 'Xerox Corp.', contact_name: 'Lisa Park', email: 'lisa@xerox.com', spend_2023: 28000, spend_2024: 30200, spend_2025_ytd: 24300, budget_2025: 35000, rating: 4.6 },
  { id: 4, name: 'Office Depot', contact_name: 'Mike Chen', email: 'mike@officedepot.com', spend_2023: 15400, spend_2024: 16800, spend_2025_ytd: 13650, budget_2025: 22000, rating: 4.2 },
  { id: 5, name: 'Canon Solutions', contact_name: 'David Kim', email: 'david@canon.com', spend_2023: 18600, spend_2024: 20400, spend_2025_ytd: 18900, budget_2025: 25000, rating: 4.4 },
]

export const mockSnipeItAssets: SnipeItAsset[] = [
  { id: 1, asset_tag: 'PRN-001', serial: 'HP-2025-001', name: 'HP LaserJet Pro MFP', model: { name: 'HP LaserJet Pro MFP M428fdw' }, category: { name: 'Printers' }, manufacturer: { name: 'HP Inc.' }, supplier: { name: 'Cartridge World' }, purchase_date: { formatted: '2025-01-15' }, purchase_cost: 4200, cost_type: 'CAPEX', warranty_months: 36, location: { name: 'IT Department' }, status_label: { name: 'Deployed', status_type: 'deployable' }, assigned_to: { name: 'John Smith', username: 'john.smith' }, notes: 'Primary office printer for IT department.' },
  { id: 2, asset_tag: 'PRN-002', serial: 'XRX-2025-001', name: 'Xerox VersaLink C405', model: { name: 'Xerox VersaLink C405' }, category: { name: 'Printers' }, manufacturer: { name: 'Xerox Corp.' }, supplier: { name: 'Office Depot' }, purchase_date: { formatted: '2025-03-01' }, purchase_cost: 3200, cost_type: 'OPEX', warranty_months: 24, location: { name: 'Admin Office' }, status_label: { name: 'Deployed', status_type: 'deployable' }, assigned_to: { name: 'Jane Admin', username: 'jane.admin' }, notes: 'Color printer for admin staff.' },
  { id: 3, asset_tag: 'PRN-003', serial: 'BRTH-2024-001', name: 'Brother HL-L2350DW', model: { name: 'Brother HL-L2350DW' }, category: { name: 'Printers' }, manufacturer: { name: 'Brother' }, purchase_date: { formatted: '2024-12-10' }, purchase_cost: 1800, cost_type: 'CAPEX', warranty_months: 24, location: { name: 'Finance Department' }, status_label: { name: 'Deployed', status_type: 'deployable' }, assigned_to: { name: 'Finance Team', username: 'finance' }, notes: 'Monochrome printer for financial reports.' },
  { id: 4, asset_tag: 'PRN-004', serial: 'CAN-2025-001', name: 'Canon imageCLASS MF743', model: { name: 'Canon imageCLASS MF743' }, category: { name: 'Printers' }, manufacturer: { name: 'Canon Solutions' }, purchase_date: { formatted: '2025-02-15' }, purchase_cost: 2800, cost_type: 'OPEX', warranty_months: 24, location: { name: 'HR Department' }, status_label: { name: 'Maintenance', status_type: 'undeployable' }, assigned_to: { name: 'HR Team', username: 'hr' }, notes: 'Currently undergoing maintenance due to network issues.' },
]
