<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Printer;
use App\Models\PrinterPageCount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrinterPageCountController extends Controller
{
    // GET /api/printers/{printer}/page-counts
    public function index(int $printerId): JsonResponse
    {
        $logs = PrinterPageCount::where('printer_id', $printerId)
            ->orderByDesc('logged_at')
            ->get();

        return response()->json($logs);
    }

    // POST /api/printers/{printer}/page-counts
    public function store(Request $request, int $printerId): JsonResponse
    {
        $validated = $request->validate([
            'count'     => 'required|integer|min:0',
            'logged_at' => 'required|date|before_or_equal:today',
            'log_type'  => 'nullable|in:toner_change,monthly_audit,manual',
            'notes'     => 'nullable|string|max:500',
        ]);

        $log = PrinterPageCount::create([
            'printer_id' => $printerId,
            'count'      => $validated['count'],
            'logged_at'  => $validated['logged_at'],
            'log_type'   => $validated['log_type'] ?? 'manual',
            'notes'      => $validated['notes'] ?? null,
        ]);

        return response()->json($log, 201);
    }

    // GET /api/printers/opex-ytd?year=YYYY
    public function opexYtd(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);
        $monthsElapsed = $year === now()->year ? now()->month : 12;

        $opexPrinters = Printer::where('cost_type', 'OPEX')->get();

        $fixedCostTotal = $opexPrinters->sum('monthly_fixed_cost') * $monthsElapsed;

        $pagesCostTotal = 0;
        foreach ($opexPrinters as $printer) {
            if (!$printer->per_page_cost) continue;
            $pages = PrinterPageCount::where('printer_id', $printer->id)
                ->whereYear('logged_at', $year)
                ->sum('count');
            $pagesCostTotal += $pages * $printer->per_page_cost;
        }

        return response()->json([
            'year'             => $year,
            'months_elapsed'   => $monthsElapsed,
            'fixed_cost_total' => round($fixedCostTotal, 2),
            'pages_cost_total' => round($pagesCostTotal, 2),
            'total'            => round($fixedCostTotal + $pagesCostTotal, 2),
        ]);
    }

    // DELETE /api/printers/{printer}/page-counts/{log}
    public function destroy(int $printerId, int $logId): JsonResponse
    {
        $log = PrinterPageCount::where('printer_id', $printerId)->findOrFail($logId);
        $log->delete();
        return response()->json(null, 204);
    }
}
