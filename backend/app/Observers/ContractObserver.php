<?php

namespace App\Observers;

use App\Models\Contract;
use App\Services\ActivityLogger;

class ContractObserver
{
    public function created(Contract $contract): void
    {
        ActivityLogger::log(
            action:      'created',
            modelType:   'Contract',
            modelId:     $contract->id,
            modelLabel:  $contract->name,
            description: "Contract \"{$contract->name}\" with {$contract->vendor} was added (expires: {$contract->end_date}).",
            properties:  ['vendor' => $contract->vendor, 'type' => $contract->type, 'end_date' => $contract->end_date, 'annual_cost' => $contract->annual_cost],
        );
    }

    public function updated(Contract $contract): void
    {
        $diff = ActivityLogger::diff($contract->getOriginal(), $contract->getDirty());
        if (empty($diff)) return;

        $changedFields = implode(', ', array_keys($diff));
        ActivityLogger::log(
            action:      'updated',
            modelType:   'Contract',
            modelId:     $contract->id,
            modelLabel:  $contract->name,
            description: "Contract \"{$contract->name}\" was updated ({$changedFields}).",
            properties:  $diff,
        );
    }

    public function deleted(Contract $contract): void
    {
        ActivityLogger::log(
            action:      'deleted',
            modelType:   'Contract',
            modelId:     $contract->id,
            modelLabel:  $contract->name,
            description: "Contract \"{$contract->name}\" with {$contract->vendor} was deleted.",
        );
    }
}
