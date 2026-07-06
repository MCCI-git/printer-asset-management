<?php

namespace App\Observers;

use App\Models\Supplier;
use App\Services\ActivityLogger;

class SupplierObserver
{
    public function created(Supplier $supplier): void
    {
        ActivityLogger::log(
            action:      'created',
            modelType:   'Supplier',
            modelId:     $supplier->id,
            modelLabel:  $supplier->name,
            description: "Supplier \"{$supplier->name}\" was added.",
        );
    }

    public function updated(Supplier $supplier): void
    {
        $diff = ActivityLogger::diff($supplier->getOriginal(), $supplier->getDirty());
        if (empty($diff)) return;

        $changedFields = implode(', ', array_keys($diff));
        ActivityLogger::log(
            action:      'updated',
            modelType:   'Supplier',
            modelId:     $supplier->id,
            modelLabel:  $supplier->name,
            description: "Supplier \"{$supplier->name}\" was updated ({$changedFields}).",
            properties:  $diff,
        );
    }

    public function deleted(Supplier $supplier): void
    {
        ActivityLogger::log(
            action:      'deleted',
            modelType:   'Supplier',
            modelId:     $supplier->id,
            modelLabel:  $supplier->name,
            description: "Supplier \"{$supplier->name}\" was deleted.",
        );
    }
}
