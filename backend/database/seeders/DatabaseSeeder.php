<?php

namespace Database\Seeders;

use App\Models\Consumable;
use App\Models\Contract;
use App\Models\Printer;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Users
        User::create(['name' => 'Super Admin', 'email' => 'admin@printers.com', 'password' => Hash::make('password'), 'role' => 'super-admin', 'status' => 'active']);
        User::create(['name' => 'John Doe', 'email' => 'john@printers.com', 'password' => Hash::make('password'), 'role' => 'admin', 'status' => 'active']);
        User::create(['name' => 'Jane Smith', 'email' => 'jane@printers.com', 'password' => Hash::make('password'), 'role' => 'reports', 'status' => 'active']);
        User::create(['name' => 'Bob Johnson', 'email' => 'bob@printers.com', 'password' => Hash::make('password'), 'role' => 'view', 'status' => 'active']);

        // Suppliers
        $hp = Supplier::create(['name' => 'HP Inc.', 'contact_name' => 'John Kim', 'email' => 'john.kim@hp.com', 'spend_2023' => 48000, 'spend_2024' => 52400, 'spend_2025_ytd' => 42600, 'budget_2025' => 65000, 'rating' => 4.9]);
        $cw = Supplier::create(['name' => 'Cartridge World', 'contact_name' => 'Sarah Lee', 'email' => 'sarah@cw.com', 'spend_2023' => 38200, 'spend_2024' => 41500, 'spend_2025_ytd' => 32100, 'budget_2025' => 50000, 'rating' => 4.8]);
        $xrx = Supplier::create(['name' => 'Xerox Corp.', 'contact_name' => 'Lisa Park', 'email' => 'lisa@xerox.com', 'spend_2023' => 28000, 'spend_2024' => 30200, 'spend_2025_ytd' => 24300, 'budget_2025' => 35000, 'rating' => 4.6]);
        $od = Supplier::create(['name' => 'Office Depot', 'contact_name' => 'Mike Chen', 'email' => 'mike@officedepot.com', 'spend_2023' => 15400, 'spend_2024' => 16800, 'spend_2025_ytd' => 13650, 'budget_2025' => 22000, 'rating' => 4.2]);

        // Printers
        $p1 = Printer::create(['asset_tag' => 'PRN-001', 'name' => 'HP LaserJet Pro MFP', 'serial' => 'HP-2025-001', 'model' => 'HP LaserJet Pro MFP M428fdw', 'cost_type' => 'CAPEX', 'purchase_cost' => 4200, 'purchase_date' => '2025-01-15', 'warranty' => 'Jan 2028 (3 years)', 'department' => 'IT', 'location' => 'IT Department', 'status' => 'active', 'assigned_to' => 'John Smith']);
        $p2 = Printer::create(['asset_tag' => 'PRN-002', 'name' => 'Xerox VersaLink C405', 'serial' => 'XRX-2025-001', 'model' => 'Xerox VersaLink C405', 'cost_type' => 'OPEX', 'monthly_fixed_cost' => 120, 'per_page_cost' => 0.022, 'purchase_date' => '2025-03-01', 'warranty' => 'Mar 2027 (2 years)', 'department' => 'Admin', 'location' => 'Admin Office', 'status' => 'active', 'assigned_to' => 'Jane Admin']);
        $p3 = Printer::create(['asset_tag' => 'PRN-003', 'name' => 'Brother HL-L2350DW', 'serial' => 'BRTH-2024-001', 'model' => 'Brother HL-L2350DW', 'cost_type' => 'CAPEX', 'purchase_cost' => 1800, 'purchase_date' => '2024-12-10', 'warranty' => 'Dec 2026 (2 years)', 'department' => 'Finance', 'location' => 'Finance Department', 'status' => 'active', 'assigned_to' => 'Finance Team']);
        Printer::create(['asset_tag' => 'PRN-004', 'name' => 'Canon imageCLASS MF743', 'serial' => 'CAN-2025-001', 'model' => 'Canon imageCLASS MF743', 'cost_type' => 'OPEX', 'monthly_fixed_cost' => 95, 'per_page_cost' => 0.018, 'purchase_date' => '2025-02-15', 'warranty' => 'Feb 2027 (2 years)', 'department' => 'HR', 'location' => 'HR Department', 'status' => 'maintenance', 'assigned_to' => 'HR Team']);
        Printer::create(['asset_tag' => 'PRN-005', 'name' => 'HP PageWide Pro', 'serial' => 'HP-2025-002', 'model' => 'HP PageWide Pro 452dw', 'cost_type' => 'OPEX', 'monthly_fixed_cost' => 150, 'per_page_cost' => 0.025, 'purchase_date' => '2025-01-10', 'warranty' => 'Jan 2027 (2 years)', 'department' => 'Operations', 'location' => 'Operations Floor', 'status' => 'active', 'assigned_to' => 'Ops Team']);

        // Consumables
        Consumable::create(['sku' => 'TON-2025-001', 'name' => 'Black Toner HP 12A', 'type' => 'Toner', 'unit_cost' => 89, 'quantity' => 12, 'low_stock_threshold' => 3, 'assigned_to' => 'HP LaserJet Pro MFP', 'assignment_date' => '2025-03-10', 'supplier_id' => $cw->id, 'printer_id' => $p1->id]);
        Consumable::create(['sku' => 'TON-2025-002', 'name' => 'Cyan Toner HP 12A', 'type' => 'Toner', 'unit_cost' => 92, 'quantity' => 3, 'low_stock_threshold' => 3, 'assigned_to' => 'HP LaserJet Pro MFP', 'assignment_date' => '2025-03-12', 'supplier_id' => $cw->id, 'printer_id' => $p1->id]);
        Consumable::create(['sku' => 'TON-2025-003', 'name' => 'Brother TN-760', 'type' => 'Toner', 'unit_cost' => 78, 'quantity' => 1, 'low_stock_threshold' => 3, 'assigned_to' => 'Brother HL-L2350DW', 'assignment_date' => '2025-03-14', 'supplier_id' => $od->id, 'printer_id' => $p3->id]);
        Consumable::create(['sku' => 'TON-2025-004', 'name' => 'Xerox Toner 106R', 'type' => 'Toner', 'unit_cost' => 110, 'quantity' => 0, 'low_stock_threshold' => 2, 'assigned_to' => 'Xerox VersaLink C405', 'assignment_date' => '2025-03-16', 'supplier_id' => $xrx->id, 'printer_id' => $p2->id]);
        Consumable::create(['sku' => 'PAP-2025-001', 'name' => 'Premium A4 Paper', 'type' => 'Paper', 'unit_cost' => 12.50, 'quantity' => 28, 'low_stock_threshold' => 5, 'assigned_to' => 'Shared', 'supplier_id' => $od->id]);
        Consumable::create(['sku' => 'DRM-2025-001', 'name' => 'Drum Unit HP 12A', 'type' => 'Drum', 'unit_cost' => 145, 'quantity' => 4, 'low_stock_threshold' => 2, 'assigned_to' => 'HP LaserJet Pro MFP', 'assignment_date' => '2025-03-15', 'supplier_id' => $hp->id, 'printer_id' => $p1->id]);
        Consumable::create(['sku' => 'MKT-2025-001', 'name' => 'Maintenance Kit HP', 'type' => 'Maintenance Kit', 'unit_cost' => 210, 'quantity' => 2, 'low_stock_threshold' => 1, 'assigned_to' => 'HP LaserJet Pro MFP', 'assignment_date' => '2025-03-18', 'supplier_id' => $cw->id, 'printer_id' => $p1->id]);

        // Contracts
        Contract::create(['name' => 'Printer Maintenance 2025', 'vendor' => 'Cartridge World', 'type' => 'Service', 'start_date' => '2025-01-01', 'end_date' => '2025-12-31', 'annual_cost' => 12000, 'covered_printers' => 15, 'status' => 'active']);
        Contract::create(['name' => 'HP Printers Support', 'vendor' => 'HP Inc.', 'type' => 'Support', 'start_date' => '2024-06-01', 'end_date' => '2025-07-31', 'annual_cost' => 8400, 'covered_printers' => 8, 'status' => 'active']);
        Contract::create(['name' => 'Xerox Lease Agreement', 'vendor' => 'Xerox Corp.', 'type' => 'Lease', 'start_date' => '2025-03-01', 'end_date' => '2027-02-28', 'annual_cost' => 18000, 'covered_printers' => 5, 'status' => 'active']);
    }
}

