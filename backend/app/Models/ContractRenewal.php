<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContractRenewal extends Model
{
    protected $fillable = ['event_type', 'original_contract_id', 'renewed_contract_id', 'renewed_by', 'renewed_at'];

    protected $casts = ['renewed_at' => 'datetime'];

    public function originalContract()
    {
        return $this->belongsTo(Contract::class, 'original_contract_id');
    }

    public function renewedContract()
    {
        return $this->belongsTo(Contract::class, 'renewed_contract_id');
    }

    public function renewedBy()
    {
        return $this->belongsTo(User::class, 'renewed_by');
    }
}
