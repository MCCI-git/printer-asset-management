<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consumable;
use App\Models\Contract;
use App\Models\Printer;
use App\Models\PrinterPageCount;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $stats = (function () {
            $totalPrinters = Printer::count();
            $capexPrinters = Printer::where('cost_type', 'CAPEX')->count();
            $opexPrinters = Printer::where('cost_type', 'OPEX')->count();
            $activePrinters = Printer::where('status', 'active')->count();
            $maintenancePrinters = Printer::where('status', 'maintenance')->count();

            $totalCapexCost = Printer::where('cost_type', 'CAPEX')->sum('purchase_cost');
            $totalOpexMonthly = Printer::where('cost_type', 'OPEX')->sum('monthly_fixed_cost');
            $totalAnnualCost = $totalCapexCost * 0.2 + ($totalOpexMonthly * 12);

            $consumablesLowStock = Consumable::whereRaw('quantity <= low_stock_threshold')->count();
            $consumablesOutOfStock = Consumable::where('quantity', 0)->count();

            $contractsExpiringSoon = Contract::where('end_date', '<=', now()->addDays(90))
                ->where('end_date', '>=', now())
                ->count();
            $contractsExpiring30 = Contract::where('end_date', '<=', now()->addDays(30))
                ->where('end_date', '>=', now())
                ->count();

            $suppliersCount = Supplier::count();
            $totalYtdSpend = Supplier::sum('spend_2025_ytd');

            $criticalAlerts = [];

            $offlinePrinters = Printer::where('status', 'maintenance')->get(['id', 'name', 'asset_tag'])->map(function ($p) {
                return [
                    'type' => 'printer_offline',
                    'title' => "{$p->asset_tag} - {$p->name}",
                    'description' => 'Printer is under maintenance or offline.',
                    'severity' => 'critical',
                    'time' => now()->subMinutes(rand(2, 60))->diffForHumans(),
                ];
            })->toArray();

            $criticalAlerts = array_merge($criticalAlerts, $offlinePrinters);

            $outOfStockConsumables = Consumable::where('quantity', 0)
                ->get(['name', 'sku'])
                ->map(function ($c) {
                    return [
                        'type' => 'consumable',
                        'title' => $c->name,
                        'description' => "{$c->sku} is out of stock. Reorder immediately.",
                        'severity' => 'critical',
                        'time' => 'just now',
                    ];
                })->toArray();

            $criticalAlerts = array_merge($criticalAlerts, $outOfStockConsumables);

            if ($contractsExpiring30 > 0) {
                $expiringContracts = Contract::where('end_date', '<=', now()->addDays(30))
                    ->where('end_date', '>=', now())
                    ->get(['name', 'vendor', 'end_date']);
                foreach ($expiringContracts as $c) {
                    $criticalAlerts[] = [
                        'type' => 'contract_expiring',
                        'title' => "{$c->name}",
                        'description' => "Contract with {$c->vendor} expires on {$c->end_date->format('M d, Y')}. Immediate renewal required.",
                        'severity' => 'critical',
                        'time' => '1 hour ago',
                    ];
                }
            }

            return [
                'printers' => [
                    'total' => $totalPrinters,
                    'capex' => $capexPrinters,
                    'opex' => $opexPrinters,
                    'active' => $activePrinters,
                    'maintenance' => $maintenancePrinters,
                ],
                'financials' => [
                    'total_capex_cost' => $totalCapexCost,
                    'monthly_opex_cost' => $totalOpexMonthly,
                    'annual_cost' => $totalAnnualCost,
                    'cost_per_page' => 0.018,
                    'ytd_spend' => $totalYtdSpend,
                ],
                'consumables' => [
                    'low_stock' => $consumablesLowStock,
                    'out_of_stock' => $consumablesOutOfStock,
                ],
                'contracts' => [
                    'expiring_90_days' => $contractsExpiringSoon,
                    'expiring_30_days' => $contractsExpiring30,
                ],
                'suppliers' => [
                    'total' => $suppliersCount,
                    'ytd_spend' => $totalYtdSpend,
                ],
                'critical_alerts' => $criticalAlerts,
                'monthly_print_volume' => $this->monthlyPrintVolume(),
            ];
        })();

        return response()->json($stats);
    }

    private function monthlyPrintVolume(): array
    {
        $months = [
            1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
            5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Aug',
            9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec',
        ];

        $year = Carbon::now()->year;

        $rows = PrinterPageCount::selectRaw('MONTH(logged_at) as month, SUM(count) as total')
            ->whereYear('logged_at', $year)
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('total', 'month');

        return collect($months)->map(fn($label, $num) => [
            'month' => $label,
            'pages' => (int) ($rows[$num] ?? 0),
        ])->values()->all();
    }
}

