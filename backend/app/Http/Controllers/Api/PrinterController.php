<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Printer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrinterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Printer::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('asset_tag', 'like', "%{$search}%")
                  ->orWhere('serial', 'like', "%{$search}%")
                  ->orWhere('model', 'like', "%{$search}%");
            });
        }

        if ($request->filled('cost_type')) {
            $query->where('cost_type', $request->cost_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('department')) {
            $query->where('department', $request->department);
        }

        $printers = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($printers);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'asset_tag'          => ['required_if:cost_type,CAPEX', 'nullable', 'string', 'max:20',
                                     'unique:printers,asset_tag', 'regex:/^IT\d{5}$/'],
            'name'               => 'required|string|max:255',
            'serial'             => 'nullable|string|max:100',
            'model'              => 'nullable|string|max:255',
            'manufacturer'       => 'nullable|string|max:255',
            'model_number'       => 'nullable|string|max:255',
            'color_capability'   => 'nullable|in:mono,colour',
            'ip_address'         => 'nullable|ip',
            'cost_type'          => 'required|in:CAPEX,OPEX',
            'purchase_cost'      => 'nullable|numeric|min:0|max:9999999.99',
            'purchase_date'      => 'nullable|date|before_or_equal:today',
            'monthly_fixed_cost' => 'nullable|numeric|min:0',
            'per_page_cost'      => 'nullable|numeric|min:0',
            'warranty'           => 'nullable|string|max:100',
            'department'         => 'nullable|string|max:255',
            'location'           => 'nullable|string|max:255',
            'assigned_to'        => 'nullable|string|max:255',
            'status'             => 'nullable|in:active,maintenance,retired,lost',
            'notes'              => 'nullable|string|max:1000',
        ]);

        // Sanitize string fields
        foreach (['name', 'serial', 'model', 'department', 'location', 'assigned_to', 'warranty', 'notes'] as $field) {
            if (isset($validated[$field])) {
                $validated[$field] = strip_tags(trim($validated[$field]));
            }
        }

        if ($validated['cost_type'] === 'OPEX') {
            $validated['asset_tag'] = DB::transaction(function () {
                $last = Printer::where('asset_tag', 'regexp', '^OP[0-9]{5}$')
                    ->lockForUpdate()
                    ->orderByRaw('CAST(SUBSTRING(asset_tag, 3) AS UNSIGNED) DESC')
                    ->first();
                $next = $last ? ((int) substr($last->asset_tag, 2)) + 1 : 1;
                return 'OP' . str_pad((string) $next, 5, '0', STR_PAD_LEFT);
            });
        }

        $printer = Printer::create($validated);

        return response()->json($printer, 201);
    }

    public function show(Printer $printer): JsonResponse
    {
        return response()->json($printer);
    }

    public function update(Request $request, Printer $printer): JsonResponse
    {
        $validated = $request->validate([
            'asset_tag'        => "nullable|string|unique:printers,asset_tag,{$printer->id}",
            'name'             => 'nullable|string|max:255',
            'serial'           => 'nullable|string',
            'model'            => 'nullable|string',
            'manufacturer'     => 'nullable|string|max:255',
            'model_number'     => 'nullable|string|max:255',
            'color_capability' => 'nullable|in:mono,colour',
            'ip_address'       => 'nullable|ip',
            'cost_type'        => 'nullable|in:CAPEX,OPEX',
            'purchase_cost' => 'nullable|numeric',
            'purchase_date' => 'nullable|date',
            'monthly_fixed_cost' => 'nullable|numeric',
            'per_page_cost' => 'nullable|numeric',
            'warranty' => 'nullable|string',
            'department' => 'nullable|string',
            'location' => 'nullable|string',
            'status'            => 'nullable|in:active,maintenance,retired,lost',
            'assigned_to'       => 'nullable|string|max:255',
            'last_service_date' => 'nullable|date',
            'next_service_date' => 'nullable|date',
            'notes'             => 'nullable|string',
        ]);

        $printer->update($validated);

        return response()->json($printer);
    }

    public function destroy(Printer $printer): JsonResponse
    {
        $printer->delete();
        return response()->json(['message' => 'Printer deleted.']);
    }
}

