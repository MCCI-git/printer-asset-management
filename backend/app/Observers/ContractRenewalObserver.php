<?php

namespace App\Observers;

use App\Models\ContractRenewal;
use App\Services\ActivityLogger;

class ContractRenewalObserver
{
    public function created(ContractRenewal $renewal): void
    {
        $verb = $renewal->event_type === 'renewed' ? 'renewed' : 'superseded';
        ActivityLogger::log(
            action:      'renewed',
            modelType:   'ContractRenewal',
            modelId:     $renewal->id,
            modelLabel:  $renewal->contract_name,
            description: "Contract \"{$renewal->contract_name}\" was {$verb} by {$renewal->renewed_by}.",
            properties:  ['event_type' => $renewal->event_type, 'original_contract_id' => $renewal->original_contract_id, 'renewed_contract_id' => $renewal->renewed_contract_id],
        );
    }
}
