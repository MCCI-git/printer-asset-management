<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Services\ActivityLogger;
use App\Services\Calendar;
use App\Models\Consumable;
use App\Models\Contract;
use App\Models\Printer;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    // GET /api/budgets?year=2026  — returns all types for that year
    public function index(Request $request): JsonResponse
    {
        $year = $request->get('year', Calendar::currentYear());
        $rows = Budget::where('year', $year)->get()->keyBy('type');
        return response()->json([
            'year'       => (int) $year,
            'total'      => (float) ($rows['total']->amount ?? 0),
            'capex'      => (float) ($rows['capex']->amount ?? 0),
            'opex'       => (float) ($rows['opex']->amount ?? 0),
            'start_date' => $rows['total']->start_date?->toDateString(),
            'end_date'   => $rows['total']->end_date?->toDateString(),
        ]);
    }

    // GET /api/budgets/history — list of years that have a budget set
    public function history(): JsonResponse
    {
        $years = Budget::select('year')->distinct()->orderByDesc('year')->pluck('year');
        return response()->json($years);
    }

    // GET /api/budgets/actual?year=YYYY — computed actual spend for a year
    public function actual(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', Calendar::currentYear());

        // CAPEX: one-time printer purchase costs in this year
        $capexActual = (float) Printer::where('cost_type', 'CAPEX')
            ->whereYear('purchase_date', $year)
            ->sum('purchase_cost');

        // OPEX: lease fees + consumables + all contracts
        $leaseActual = (float) Printer::where('cost_type', 'OPEX')
            ->where('status', 'active')
            ->whereYear('purchase_date', '<=', $year)
            ->sum('monthly_fixed_cost') * 12;

        $consumableSpend = (float) (Consumable::whereYear('purchase_date', $year)
            ->selectRaw('SUM(unit_cost * quantity) as total')
            ->value('total') ?? 0);

        $contractSpend = $this->proratedContractSpend($year);

        $opexActual = $leaseActual + $consumableSpend + $contractSpend;

        return response()->json([
            'year'   => $year,
            'capex'  => round($capexActual, 2),
            'opex'   => round($opexActual, 2),
            'actual' => round($capexActual + $opexActual, 2),
        ]);
    }

    // GET /api/budgets/all — every year's budget + calculated actual for the chart
    public function all(): JsonResponse
    {
        $years = Budget::select('year')->distinct()->orderBy('year')->pluck('year');

        return response()->json($years->map(function ($year) {
            $rows = Budget::where('year', $year)->get()->keyBy('type');

            $capexActual = (float) Printer::where('cost_type', 'CAPEX')
                ->whereYear('purchase_date', $year)
                ->sum('purchase_cost');

            $leaseActual = (float) Printer::where('cost_type', 'OPEX')
                ->where('status', 'active')
                ->whereYear('purchase_date', '<=', $year)
                ->sum('monthly_fixed_cost') * 12;

            $consumableSpend = (float) (Consumable::whereYear('purchase_date', $year)
                ->selectRaw('SUM(unit_cost * quantity) as total')
                ->value('total') ?? 0);

            $contractSpend = $this->proratedContractSpend($year);

            $opexActual = $leaseActual + $consumableSpend + $contractSpend;

            return [
                'year'       => $year,
                'budget'     => (float) ($rows['total']->amount ?? 0),
                'actual'     => round($capexActual + $opexActual, 2),
                'start_date' => $rows['total']->start_date?->toDateString(),
                'end_date'   => $rows['total']->end_date?->toDateString(),
            ];
        }));
    }

    // GET /api/budgets/breakdown?year=YYYY — real spend per category vs tracked budget
    public function breakdown(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', Calendar::currentYear());
        $rows = Budget::where('year', $year)->get()->keyBy('type');

        // CAPEX — printer purchases
        $capexActual = (float) Printer::where('cost_type', 'CAPEX')
            ->whereYear('purchase_date', $year)
            ->sum('purchase_cost');

        // OPEX line items
        $leaseActual = (float) Printer::where('cost_type', 'OPEX')
            ->where('status', 'active')
            ->whereYear('purchase_date', '<=', $year)
            ->sum('monthly_fixed_cost') * 12;

        $consumablesActual = (float) (Consumable::whereYear('purchase_date', $year)
            ->selectRaw('SUM(unit_cost * quantity) as total')
            ->value('total') ?? 0);

        $maintenanceActual = $this->proratedContractSpend($year, 'Maintenance');
        $supportActual     = $this->proratedContractSpend($year, 'Support');
        $serviceActual     = $this->proratedContractSpend($year, 'Service');
        $leaseContractActual = $this->proratedContractSpend($year, 'Lease');

        $capexBudgeted = (float) ($rows['capex']->amount ?? 0);
        $opexBudgeted  = (float) ($rows['opex']->amount ?? 0);

        return response()->json([
            'year' => $year,
            'capex_actual' => round($capexActual, 2),
            'opex_actual'  => round($leaseActual + $consumablesActual + $maintenanceActual + $supportActual + $serviceActual + $leaseContractActual, 2),
            'categories' => [
                // CAPEX
                ['category' => 'Printer Purchases', 'group' => 'CAPEX', 'short' => 'Purchases', 'budgeted' => $capexBudgeted, 'actual' => $capexActual],
                // OPEX
                ['category' => 'Lease Fees',        'group' => 'OPEX',  'short' => 'Leases',    'budgeted' => 0, 'actual' => $leaseActual],
                ['category' => 'Consumables',        'group' => 'OPEX',  'short' => 'Consum.',   'budgeted' => 0, 'actual' => $consumablesActual],
                ['category' => 'Maintenance Contracts', 'group' => 'OPEX', 'short' => 'Maint.', 'budgeted' => 0, 'actual' => $maintenanceActual],
                ['category' => 'Support Contracts',  'group' => 'OPEX',  'short' => 'Support',   'budgeted' => 0, 'actual' => $supportActual],
                ['category' => 'Service Contracts',  'group' => 'OPEX',  'short' => 'Service',   'budgeted' => 0, 'actual' => $serviceActual],
                ['category' => 'Lease Contracts',    'group' => 'OPEX',  'short' => 'Lease',     'budgeted' => $opexBudgeted, 'actual' => $leaseContractActual],
            ],
        ]);
    }

    // Calculates prorated annual contract spend for a given year
    private function proratedContractSpend(int $year, ?string $type = null): float
    {
        $yearStart = Carbon::create($year, 1, 1)->startOfDay();
        $yearEnd   = Carbon::create($year, 12, 31)->endOfDay();

        $query = Contract::where('status', 'active')
            ->whereDate('start_date', '<=', $yearEnd)
            ->whereDate('end_date', '>=', $yearStart);

        if ($type) {
            $query->where('type', $type);
        }

        return $query->get()->sum(function (Contract $c) use ($yearStart, $yearEnd) {
            $start    = Carbon::parse($c->start_date)->max($yearStart);
            $end      = Carbon::parse($c->end_date)->min($yearEnd);
            $daysInYear   = $yearStart->isLeapYear() ? 366 : 365;
            $daysActive   = $start->diffInDays($end) + 1;
            $dailyRate    = $c->annual_cost / 365;
            return round($dailyRate * min($daysActive, $daysInYear), 2);
        });
    }

    // PUT /api/budgets  — upsert one type for a given year
    public function upsert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year'       => 'required|integer|min:2000|max:2100',
            'type'       => 'required|in:total,capex,opex,actual',
            'amount'     => 'required|numeric|min:0',
            'notes'      => 'nullable|string|max:500',
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date|after_or_equal:start_date',
        ]);

        $budget = Budget::updateOrCreate(
            ['year' => $validated['year'], 'type' => $validated['type']],
            [
                'amount'     => $validated['amount'],
                'notes'      => $validated['notes'] ?? null,
                'start_date' => $validated['start_date'] ?? null,
                'end_date'   => $validated['end_date'] ?? null,
            ]
        );

        $verb  = $budget->wasRecentlyCreated ? 'set' : 'updated';
        $label = ucfirst($validated['type']) . ' budget ' . $validated['year'];
        ActivityLogger::log(
            action:      'updated',
            modelType:   'Budget',
            modelId:     $budget->id,
            modelLabel:  $label,
            description: "{$label} was {$verb} to Rs " . number_format($validated['amount'], 2) . ".",
            properties:  ['year' => $validated['year'], 'type' => $validated['type'], 'amount' => $validated['amount']],
        );

        return response()->json($budget);
    }
}
