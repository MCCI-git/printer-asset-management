<?php

namespace App\Console\Commands;

use App\Models\Contract;
use App\Models\ContractRenewal;
use Illuminate\Console\Command;

class ExpireContracts extends Command
{
    protected $signature = 'contracts:expire';
    protected $description = 'Mark overdue contracts as expired and log the event';

    public function handle(): void
    {
        $overdue = Contract::where('status', '!=', 'expired')
            ->whereDate('end_date', '<', now()->toDateString())
            ->get();

        foreach ($overdue as $contract) {
            $contract->update(['status' => 'expired']);

            ContractRenewal::create([
                'event_type'           => 'expired',
                'contract_name'        => $contract->name,
                'original_contract_id' => $contract->id,
                'renewed_contract_id'  => null,
                'renewed_by'           => null,
                'renewed_at'           => now(),
            ]);
        }

        $this->info("Expired {$overdue->count()} contract(s).");
    }
}
