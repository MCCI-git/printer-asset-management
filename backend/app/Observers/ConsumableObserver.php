<?php

namespace App\Observers;

use App\Models\Consumable;
use App\Services\ActivityLogger;

class ConsumableObserver
{
    public function created(Consumable $consumable): void
    {
        ActivityLogger::log(
            action:      'created',
            modelType:   'Consumable',
            modelId:     $consumable->id,
            modelLabel:  $consumable->name,
            description: "Consumable \"{$consumable->name}\" (SKU: {$consumable->sku}) was added with quantity {$consumable->quantity}.",
            properties:  ['sku' => $consumable->sku, 'type' => $consumable->type, 'quantity' => $consumable->quantity, 'unit_cost' => $consumable->unit_cost],
        );
    }

    public function updated(Consumable $consumable): void
    {
        $diff = ActivityLogger::diff($consumable->getOriginal(), $consumable->getDirty());
        if (empty($diff)) return;

        $changedFields = implode(', ', array_keys($diff));
        ActivityLogger::log(
            action:      'updated',
            modelType:   'Consumable',
            modelId:     $consumable->id,
            modelLabel:  $consumable->name,
            description: "Consumable \"{$consumable->name}\" was updated ({$changedFields}).",
            properties:  $diff,
        );
    }

    public function deleted(Consumable $consumable): void
    {
        ActivityLogger::log(
            action:      'deleted',
            modelType:   'Consumable',
            modelId:     $consumable->id,
            modelLabel:  $consumable->name,
            description: "Consumable \"{$consumable->name}\" (SKU: {$consumable->sku}) was deleted.",
        );
    }
}
