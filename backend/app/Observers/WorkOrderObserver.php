<?php

namespace App\Observers;

use App\Models\WorkOrder;
use App\Services\ActivityLogger;

class WorkOrderObserver
{
    public function created(WorkOrder $workOrder): void
    {
        $printer = $workOrder->printer?->name ?? "Printer #{$workOrder->printer_id}";
        ActivityLogger::log(
            action:      'created',
            modelType:   'WorkOrder',
            modelId:     $workOrder->id,
            modelLabel:  $workOrder->wo_number,
            description: "Work order {$workOrder->wo_number} was created for {$printer}: \"{$workOrder->issue}\" (priority: {$workOrder->priority}).",
            properties:  ['printer' => $printer, 'priority' => $workOrder->priority, 'status' => $workOrder->status],
        );
    }

    public function updated(WorkOrder $workOrder): void
    {
        $diff = ActivityLogger::diff($workOrder->getOriginal(), $workOrder->getDirty());
        if (empty($diff)) return;

        $printer = $workOrder->printer?->name ?? "Printer #{$workOrder->printer_id}";

        // Special description for status changes
        if (isset($diff['status'])) {
            $old = $diff['status']['old'];
            $new = $diff['status']['new'];
            $description = "Work order {$workOrder->wo_number} status changed from \"{$old}\" to \"{$new}\" ({$printer}).";
        } else {
            $changedFields = implode(', ', array_keys($diff));
            $description = "Work order {$workOrder->wo_number} was updated ({$changedFields}).";
        }

        ActivityLogger::log(
            action:      'updated',
            modelType:   'WorkOrder',
            modelId:     $workOrder->id,
            modelLabel:  $workOrder->wo_number,
            description: $description,
            properties:  $diff,
        );
    }

    public function deleted(WorkOrder $workOrder): void
    {
        ActivityLogger::log(
            action:      'deleted',
            modelType:   'WorkOrder',
            modelId:     $workOrder->id,
            modelLabel:  $workOrder->wo_number,
            description: "Work order {$workOrder->wo_number} was deleted.",
        );
    }
}
