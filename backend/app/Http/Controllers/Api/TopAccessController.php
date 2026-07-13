<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Printer;
use App\Services\TopAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TopAccessController extends Controller
{
    public function __construct(private TopAccessService $service) {}

    public function printers(): JsonResponse
    {
        set_time_limit(0);
        try {
            return response()->json($this->service->getPrinters());
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    public function printer(Request $request): JsonResponse
    {
        $printerId = $request->query('id');
        if (!$printerId) {
            return response()->json(['error' => 'Printer ID is required.'], 422);
        }

        $printer = Printer::find($printerId);
        if (!$printer) {
            return response()->json(['error' => 'Printer not found.'], 404);
        }

        try {
            return response()->json($this->service->queryPrinter($printer));
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    public function refreshOne(Printer $printer): JsonResponse
    {
        set_time_limit(0);
        if (!$printer->ip_address) {
            return response()->json(['success' => false, 'message' => 'No IP address set for this printer.'], 422);
        }

        try {
            $result = $this->service->queryPrinter($printer);
            return response()->json([
                'success'     => $result['reachable'],
                'snmp_status' => $printer->fresh()->snmp_status,
                'data'        => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }
    }

    public function test(Request $request): JsonResponse
    {
        $ip        = $request->input('ip', '');
        $community = $request->input('community', 'public');

        return response()->json($this->service->testConnection($ip, $community));
    }
}
