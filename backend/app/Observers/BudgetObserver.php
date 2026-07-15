<?php

namespace App\Observers;

use App\Models\Budget;
use App\Services\ActivityLogger;

class BudgetObserver
{
    public function created(Budget $budget): void
    {
        $label = ucfirst($budget->type) . ' budget ' . $budget->year;
        ActivityLogger::log(
            action:      'created',
            modelType:   'Budget',
            modelId:     $budget->id,
            modelLabel:  $label,
            description: "{$label} was created at Rs " . number_format($budget->amount, 2) . ".",
            properties:  ['year' => $budget->year, 'type' => $budget->type, 'amount' => $budget->amount],
        );
    }

    public function updated(Budget $budget): void
    {
        $diff = ActivityLogger::diff($budget->getOriginal(), $budget->getDirty());
        if (empty($diff)) return;

        $label = ucfirst($budget->type) . ' budget ' . $budget->year;
        ActivityLogger::log(
            action:      'updated',
            modelType:   'Budget',
            modelId:     $budget->id,
            modelLabel:  $label,
            description: "{$label} was updated (" . implode(', ', array_keys($diff)) . ").",
            properties:  $diff,
        );
    }

    public function deleted(Budget $budget): void
    {
        $label = ucfirst($budget->type) . ' budget ' . $budget->year;
        ActivityLogger::log(
            action:      'deleted',
            modelType:   'Budget',
            modelId:     $budget->id,
            modelLabel:  $label,
            description: "{$label} was deleted.",
        );
    }
}
