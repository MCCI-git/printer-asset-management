<?php

namespace App\Observers;

use App\Models\ConsumableAssignment;
use App\Services\ActivityLogger;

class ConsumableAssignmentObserver
{
    public function created(ConsumableAssignment $assignment): void
    {
        $consumable = $assignment->consumable?->name ?? "Consumable #{$assignment->consumable_id}";
        $printer    = $assignment->printer?->name    ?? "Printer #{$assignment->printer_id}";
        ActivityLogger::log(
            action:      'assigned',
            modelType:   'ConsumableAssignment',
            modelId:     $assignment->id,
            modelLabel:  $consumable,
            description: "\"{$consumable}\" was assigned to {$printer}.",
            properties:  ['consumable_id' => $assignment->consumable_id, 'printer_id' => $assignment->printer_id, 'assigned_at' => $assignment->assigned_at],
        );
    }

    public function updated(ConsumableAssignment $assignment): void
    {
        $diff = ActivityLogger::diff($assignment->getOriginal(), $assignment->getDirty());
        if (empty($diff)) return;

        $consumable = $assignment->consumable?->name ?? "Consumable #{$assignment->consumable_id}";
        $printer    = $assignment->printer?->name    ?? "Printer #{$assignment->printer_id}";
        ActivityLogger::log(
            action:      'updated',
            modelType:   'ConsumableAssignment',
            modelId:     $assignment->id,
            modelLabel:  $consumable,
            description: "Assignment of \"{$consumable}\" to {$printer} was updated (" . implode(', ', array_keys($diff)) . ").",
            properties:  $diff,
        );
    }

    public function deleted(ConsumableAssignment $assignment): void
    {
        $consumable = $assignment->consumable?->name ?? "Consumable #{$assignment->consumable_id}";
        $printer    = $assignment->printer?->name    ?? "Printer #{$assignment->printer_id}";
        ActivityLogger::log(
            action:      'unassigned',
            modelType:   'ConsumableAssignment',
            modelId:     $assignment->id,
            modelLabel:  $consumable,
            description: "\"{$consumable}\" was unassigned from {$printer}.",
        );
    }
}
