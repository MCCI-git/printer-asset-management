<?php

namespace App\Observers;

use App\Models\Printer;
use App\Services\ActivityLogger;

class PrinterObserver
{
    public function created(Printer $printer): void
    {
        ActivityLogger::log(
            action:      'created',
            modelType:   'Printer',
            modelId:     $printer->id,
            modelLabel:  $printer->name,
            description: "Printer \"{$printer->name}\" ({$printer->asset_tag}) was added.",
            properties:  ['asset_tag' => $printer->asset_tag, 'cost_type' => $printer->cost_type, 'status' => $printer->status],
        );
    }

    public function updated(Printer $printer): void
    {
        $diff = ActivityLogger::diff($printer->getOriginal(), $printer->getDirty());
        if (empty($diff)) return;

        $changedFields = implode(', ', array_keys($diff));
        ActivityLogger::log(
            action:      'updated',
            modelType:   'Printer',
            modelId:     $printer->id,
            modelLabel:  $printer->name,
            description: "Printer \"{$printer->name}\" was updated ({$changedFields}).",
            properties:  $diff,
        );
    }

    public function deleted(Printer $printer): void
    {
        ActivityLogger::log(
            action:      'deleted',
            modelType:   'Printer',
            modelId:     $printer->id,
            modelLabel:  $printer->name,
            description: "Printer \"{$printer->name}\" ({$printer->asset_tag}) was deleted.",
        );
    }
}
