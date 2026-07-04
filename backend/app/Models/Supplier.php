<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = [
        'name', 'contact_name', 'email', 'phone', 'logo_url', 'notes',
        'brn', 'vat_number',
        'salesperson_name', 'salesperson_email', 'salesperson_phone',
        'spend_2023', 'spend_2024', 'spend_2025_ytd',
        'budget_2025', 'preferred_supplier', 'contract_id',
    ];

    protected $casts = [
        'spend_2023'         => 'float',
        'spend_2024'         => 'float',
        'spend_2025_ytd'     => 'float',
        'budget_2025'        => 'float',
        'rating'             => 'float',
        'preferred_supplier' => 'boolean',
    ];

    public function consumables(): HasMany
    {
        return $this->hasMany(Consumable::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }
}
