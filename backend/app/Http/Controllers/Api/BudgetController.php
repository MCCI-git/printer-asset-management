<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Consumable;
use App\Models\Contract;
use App\Models\Printer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    // GET /api/budgets?year=2026  — returns all types for that year
    public function index(Request $request): JsonResponse
    {
        $year = $request->get('year', now()->year);
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
        $year = (int) $request->get('year', now()->year);

        $consumableSpend = Consumable::whereYear('created_at', $year)
            ->selectRaw('SUM(unit_cost * quantity) as total')
            ->value('total') ?? 0;

        $contractSpend = Contract::where('status', 'Active')
            ->whereYear('start_date', '<=', $year)
            ->whereYear('end_date', '>=', $year)
            ->sum('annual_cost');

        return response()->json([
            'year'   => $year,
            'actual' => round((float) $consumableSpend + (float) $contractSpend, 2),
        ]);
    }

    // GET /api/budgets/all — every year's budget + calculated actual for the chart
    public function all(): JsonResponse
    {
        $years = Budget::select('year')->distinct()->orderBy('year')->pluck('year');

        return response()->json($years->map(function ($year) {
            $rows = Budget::where('year', $year)->get()->keyBy('type');

            $consumableSpend = Consumable::whereYear('created_at', $year)
                ->selectRaw('SUM(unit_cost * quantity) as total')
                ->value('total') ?? 0;

            $contractSpend = Contract::where('status', 'Active')
                ->whereYear('start_date', '<=', $year)
                ->whereYear('end_date', '>=', $year)
                ->sum('annual_cost');

            return [
                'year'       => $year,
                'budget'     => (float) ($rows['total']->amount ?? 0),
                'actual'     => round((float) $consumableSpend + (float) $contractSpend, 2),
                'start_date' => $rows['total']->start_date?->toDateString(),
                'end_date'   => $rows['total']->end_date?->toDateString(),
            ];
        }));
    }

    // GET /api/budgets/breakdown?year=YYYY — real spend per category vs tracked budget
    public function breakdown(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);
        $rows = Budget::where('year', $year)->get()->keyBy('type');

        $capexActual = (float) Printer::where('cost_type', 'CAPEX')->sum('purchase_cost');
        $opexActual = (float) Printer::where('cost_type', 'OPEX')->sum('monthly_fixed_cost') * 12;

        $consumablesActual = (float) (Consumable::whereYear('created_at', $year)
            ->selectRaw('SUM(unit_cost * quantity) as total')
            ->value('total') ?? 0);

        $maintenanceActual = (float) Contract::where('status', 'Active')
            ->where('type', 'Maintenance')
            ->whereYear('start_date', '<=', $year)
            ->whereYear('end_date', '>=', $year)
            ->sum('annual_cost');

        $supportActual = (float) Contract::where('status', 'Active')
            ->where('type', 'Support')
            ->whereYear('start_date', '<=', $year)
            ->whereYear('end_date', '>=', $year)
            ->sum('annual_cost');

        return response()->json([
            'year' => $year,
            'categories' => [
                ['category' => 'CAPEX Printers',     'short' => 'CAPEX',   'budgeted' => (float) ($rows['capex']->amount ?? 0), 'actual' => $capexActual],
                ['category' => 'OPEX Managed Print',  'short' => 'OPEX',    'budgeted' => (float) ($rows['opex']->amount ?? 0),  'actual' => $opexActual],
                ['category' => 'Consumables',         'short' => 'Consum.', 'budgeted' => 0, 'actual' => $consumablesActual],
                ['category' => 'Maint. Contracts',    'short' => 'Maint.',  'budgeted' => 0, 'actual' => $maintenanceActual],
                ['category' => 'Support Contracts',   'short' => 'Support', 'budgeted' => 0, 'actual' => $supportActual],
            ],
        ]);
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

        return response()->json($budget);
    }
}
