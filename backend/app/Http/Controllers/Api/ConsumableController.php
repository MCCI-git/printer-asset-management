<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consumable;
use App\Models\ConsumableAssignment;
use App\Services\AlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ConsumableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Consumable::with(['supplier', 'printer']);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q->where('name', 'like', "%{$s}%")->orWhere('sku', 'like', "%{$s}%"));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('printer_id')) {
            $query->where('printer_id', $request->printer_id);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15)));
    }

    private const SKU_PREFIXES = [
        'Toner'           => 'TON',
        'Paper'           => 'PAP',
        'Drum'            => 'DRM',
        'Waste'           => 'WST',
        'Maintenance Kit' => 'MNT',
    ];

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'type'                => 'required|in:Toner,Paper,Drum,Waste,Maintenance Kit',
            'color'               => 'nullable|in:Black,Cyan,Magenta,Yellow',
            'unit_cost'           => 'required|numeric|min:0',
            'page_yield'          => 'nullable|integer|min:1',
            'quantity'            => 'nullable|integer|min:0',
            'assigned_to'         => 'nullable|string',
            'assignment_date'     => 'nullable|date',
            'purchase_date'       => 'nullable|date|before_or_equal:today',
            'invoice_number'      => 'nullable|string|max:100',
            'supplier_id'         => 'nullable|exists:suppliers,id',
            'printer_id'          => 'nullable|exists:printers,id',
        ]);

        if (!empty($validated['printer_id'])) {
            $conflict = Consumable::where('name', $validated['name'])
                ->where('type', $validated['type'])
                ->whereNotNull('printer_id')
                ->where('printer_id', '!=', $validated['printer_id'])
                ->exists();
            if ($conflict) {
                return response()->json(['message' => 'This consumable is already assigned to a different printer.'], 422);
            }
        }

        $validated['quantity'] = $validated['quantity'] ?? 1;
        $validated['low_stock_threshold'] = 1;

        $prefix = self::SKU_PREFIXES[$validated['type']];
        $year = now()->format('Y');
        $validated['sku'] = DB::transaction(function () use ($prefix, $year) {
            $last = Consumable::where('sku', 'like', "{$prefix}-{$year}-%")
                ->lockForUpdate()
                ->orderByRaw('CAST(SUBSTRING_INDEX(sku, "-", -1) AS UNSIGNED) DESC')
                ->first();
            $next = $last ? ((int) substr($last->sku, strrpos($last->sku, '-') + 1)) + 1 : 1;
            return sprintf('%s-%s-%03d', $prefix, $year, $next);
        });

        return response()->json(Consumable::create($validated), 201);
    }

    public function show(Consumable $consumable): JsonResponse
    {
        return response()->json($consumable->load(['supplier', 'printer']));
    }

    public function update(Request $request, Consumable $consumable): JsonResponse
    {
        $validated = $request->validate([
            'sku'                 => "nullable|string|unique:consumables,sku,{$consumable->id}",
            'name'                => 'nullable|string|max:255',
            'type'                => 'nullable|in:Toner,Paper,Drum,Waste,Maintenance Kit',
            'color'               => 'nullable|in:Black,Cyan,Magenta,Yellow',
            'unit_cost'           => 'nullable|numeric|min:0',
            'page_yield'          => 'nullable|integer|min:1',
            'quantity'            => 'nullable|integer|min:0',
            'assigned_to'         => 'nullable|string',
            'assignment_date'     => 'nullable|date',
            'purchase_date'       => 'nullable|date|before_or_equal:today',
            'invoice_number'      => 'nullable|string|max:100',
            'supplier_id'         => 'nullable|exists:suppliers,id',
            'printer_id'          => 'nullable|exists:printers,id',
        ]);

        $name      = $validated['name']      ?? $consumable->name;
        $type      = $validated['type']      ?? $consumable->type;
        $printerId = array_key_exists('printer_id', $validated) ? $validated['printer_id'] : $consumable->printer_id;

        if (!empty($printerId)) {
            $conflict = Consumable::where('name', $name)
                ->where('type', $type)
                ->whereNotNull('printer_id')
                ->where('printer_id', '!=', $printerId)
                ->where('id', '!=', $consumable->id)
                ->exists();
            if ($conflict) {
                return response()->json(['message' => 'This consumable is already assigned to a different printer.'], 422);
            }
        }

        $consumable->update($validated);
        return response()->json($consumable->load(['supplier', 'printer']));
    }

    public function destroy(Consumable $consumable): JsonResponse
    {
        $consumable->delete();
        return response()->json(['message' => 'Consumable deleted.']);
    }

    public function assignments(): JsonResponse
    {
        $assignments = ConsumableAssignment::with(['consumable.supplier', 'printer'])
            ->orderBy('assigned_at', 'desc')
            ->get();
        return response()->json($assignments);
    }

    public function assign(Request $request, Consumable $consumable, AlertService $alerts): JsonResponse
    {
        $validated = $request->validate([
            'printer_id' => 'required|exists:printers,id',
        ]);

        if ($consumable->quantity <= 0) {
            return response()->json(['message' => 'Cannot assign — this consumable is out of stock.'], 422);
        }

        $assignment = DB::transaction(function () use ($consumable, $validated) {
            $consumable->decrement('quantity');
            return ConsumableAssignment::create([
                'consumable_id' => $consumable->id,
                'printer_id'    => $validated['printer_id'],
                'assigned_at'   => Carbon::now(),
            ]);
        });

        $consumable->refresh();

        // Send immediate stock alert if out of stock or low stock after assignment
        $alerts->sendStockAlert($consumable);

        return response()->json($assignment->load(['consumable.supplier', 'printer']), 201);
    }

    public function unassign(ConsumableAssignment $assignment): JsonResponse
    {
        DB::transaction(function () use ($assignment) {
            $assignment->consumable->increment('quantity');
            $assignment->delete();
        });
        return response()->json(['message' => 'Unassigned successfully.']);
    }
}
