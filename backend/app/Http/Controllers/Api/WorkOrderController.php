<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function index(): JsonResponse
    {
        $orders = WorkOrder::with('printer')
            ->orderByRaw("FIELD(status, 'open', 'in-progress', 'scheduled', 'completed', 'cancelled')")
            ->orderByRaw("FIELD(priority, 'high', 'medium', 'low')")
            ->orderBy('scheduled_date')
            ->get();

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'printer_id'     => 'required|exists:printers,id',
            'issue'          => 'required|string|max:500',
            'priority'       => 'required|in:high,medium,low',
            'status'         => 'required|in:open,in-progress,scheduled,completed,cancelled',
            'assignee'       => 'nullable|string|max:200',
            'scheduled_date' => 'nullable|date',
            'completed_date' => 'nullable|date',
            'notes'          => 'nullable|string',
        ]);

        $order = WorkOrder::create($data);
        $order->load('printer');

        return response()->json($order, 201);
    }

    public function update(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $data = $request->validate([
            'printer_id'     => 'sometimes|exists:printers,id',
            'issue'          => 'sometimes|string|max:500',
            'priority'       => 'sometimes|in:high,medium,low',
            'status'         => 'sometimes|in:open,in-progress,scheduled,completed,cancelled',
            'assignee'       => 'nullable|string|max:200',
            'scheduled_date' => 'nullable|date',
            'completed_date' => 'nullable|date',
            'notes'          => 'nullable|string',
        ]);

        $workOrder->update($data);
        $workOrder->load('printer');

        return response()->json($workOrder);
    }

    public function destroy(WorkOrder $workOrder): JsonResponse
    {
        $workOrder->delete();
        return response()->json(null, 204);
    }
}
