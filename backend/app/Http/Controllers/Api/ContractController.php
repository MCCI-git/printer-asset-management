<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\ContractRenewal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ContractController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Contract::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q->where('name', 'like', "%{$s}%")->orWhere('vendor', 'like', "%{$s}%"));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        return response()->json($query->orderBy('end_date')->paginate($request->get('per_page', 15)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'required|string|max:255',
            'vendor'             => 'required|string|max:255',
            'type'               => 'required|in:Service,Support,Lease,Maintenance',
            'start_date'         => 'required|date',
            'end_date'           => 'required|date|after:start_date',
            'annual_cost'        => 'required|numeric|min:0',
            'covered_printers'   => 'nullable|integer|min:0',
            'notice_period_days' => 'nullable|integer|min:0',
            'contract_manager'   => 'nullable|string|max:255',
            'notes'              => 'nullable|string',
            'status'             => 'nullable|in:active,expired,pending',
        ]);

        $contract = Contract::create($validated);

        ContractRenewal::create([
            'event_type'           => 'created',
            'contract_name'        => $contract->name,
            'original_contract_id' => $contract->id,
            'renewed_contract_id'  => null,
            'renewed_by'           => $request->user()->id,
            'renewed_at'           => now(),
        ]);

        return response()->json($contract, 201);
    }

    public function show(Contract $contract): JsonResponse
    {
        return response()->json($contract);
    }

    public function update(Request $request, Contract $contract): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'nullable|string|max:255',
            'vendor'             => 'nullable|string|max:255',
            'type'               => 'nullable|in:Service,Support,Lease,Maintenance',
            'start_date'         => 'nullable|date',
            'end_date'           => 'nullable|date',
            'annual_cost'        => 'nullable|numeric|min:0',
            'covered_printers'   => 'nullable|integer|min:0',
            'notice_period_days' => 'nullable|integer|min:0',
            'contract_manager'   => 'nullable|string|max:255',
            'notes'              => 'nullable|string',
            'status'             => 'nullable|in:active,expired,pending',
        ]);

        $wasExpired = $contract->status === 'expired';

        // Auto-force status to expired if end_date is in the past
        $newEndDate = $validated['end_date'] ?? $contract->end_date;
        $newStatus  = $validated['status'] ?? $contract->status;
        if ($newEndDate && now()->startOfDay()->gt(Carbon::parse($newEndDate)->startOfDay())) {
            $validated['status'] = 'expired';
            $newStatus = 'expired';
        }

        $contract->update($validated);

        // Log expired transition or general update
        $eventType = (!$wasExpired && $newStatus === 'expired') ? 'expired' : 'updated';
        ContractRenewal::create([
            'event_type'           => $eventType,
            'contract_name'        => $contract->name,
            'original_contract_id' => $contract->id,
            'renewed_contract_id'  => null,
            'renewed_by'           => $request->user()->id,
            'renewed_at'           => now(),
        ]);

        return response()->json($contract->fresh());
    }

    public function destroy(Contract $contract): JsonResponse
    {
        // Log before deleting so the FK is still valid and name is captured
        ContractRenewal::create([
            'event_type'           => 'deleted',
            'contract_name'        => $contract->name,
            'original_contract_id' => $contract->id,
            'renewed_contract_id'  => null,
            'renewed_by'           => request()->user()->id,
            'renewed_at'           => now(),
        ]);

        if ($contract->pdf_path) {
            Storage::delete($contract->pdf_path);
        }
        $contract->delete();
        return response()->json(['message' => 'Contract deleted.']);
    }

    public function renew(Request $request, Contract $contract): JsonResponse
    {
        $shiftYear = fn(string $date) => date('Y-m-d', strtotime($date . ' +1 year'));

        $renewed = DB::transaction(function () use ($contract, $request, $shiftYear) {
            $renewed = Contract::create([
                'name'               => $contract->name,
                'vendor'             => $contract->vendor,
                'type'               => $contract->type,
                'start_date'         => $shiftYear($contract->start_date),
                'end_date'           => $shiftYear($contract->end_date),
                'annual_cost'        => $contract->annual_cost,
                'covered_printers'   => $contract->covered_printers,
                'notice_period_days' => $contract->notice_period_days,
                'contract_manager'   => $contract->contract_manager,
                'notes'              => $contract->notes,
                'status'             => 'active',
            ]);

            $contract->update(['status' => 'expired']);

            ContractRenewal::create([
                'event_type'           => 'renewed',
                'contract_name'        => $contract->name,
                'original_contract_id' => $contract->id,
                'renewed_contract_id'  => $renewed->id,
                'renewed_by'           => $request->user()->id,
                'renewed_at'           => now(),
            ]);

            return $renewed;
        });

        return response()->json($renewed, 201);
    }

    public function renewals(): JsonResponse
    {
        $logs = ContractRenewal::with(['originalContract:id,name', 'renewedContract:id,name,start_date,end_date', 'renewedBy:id,name'])
            ->orderByDesc('renewed_at')
            ->get();

        return response()->json($logs);
    }

    public function storeRenewal(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_type'           => 'required|in:renewed,expired,created,updated,deleted',
            'original_contract_id' => 'nullable|exists:contracts,id',
            'renewed_contract_id'  => 'nullable|exists:contracts,id',
            'renewed_at'           => 'required|date',
            'notes'                => 'nullable|string',
        ]);

        $contractName = '';
        if (!empty($validated['original_contract_id'])) {
            $contractName = Contract::find($validated['original_contract_id'])?->name ?? '';
        }

        $log = ContractRenewal::create([
            'event_type'           => $validated['event_type'],
            'contract_name'        => $contractName,
            'original_contract_id' => $validated['original_contract_id'] ?? null,
            'renewed_contract_id'  => $validated['renewed_contract_id'] ?? null,
            'renewed_by'           => $request->user()->id,
            'renewed_at'           => $validated['renewed_at'],
        ]);

        $log->load(['originalContract:id,name', 'renewedContract:id,name,start_date,end_date', 'renewedBy:id,name']);
        return response()->json($log, 201);
    }

    public function destroyRenewal(ContractRenewal $renewal): JsonResponse
    {
        $renewal->delete();
        return response()->json(['message' => 'Log deleted.']);
    }

    public function uploadPdf(Request $request, Contract $contract): JsonResponse
    {
        $request->validate(['pdf' => 'required|file|mimes:pdf|max:10240']);
        if ($contract->pdf_path) {
            Storage::delete($contract->pdf_path);
        }
        $path = $request->file('pdf')->store('contracts', 'public');
        $contract->update(['pdf_path' => $path]);
        return response()->json(['pdf_path' => $path, 'pdf_url' => Storage::url($path)]);
    }
}
