<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsumableAssignment extends Model
{
    protected $fillable = ['consumable_id', 'printer_id', 'assigned_at'];

    protected $casts = ['assigned_at' => 'datetime'];

    public function consumable(): BelongsTo
    {
        return $this->belongsTo(Consumable::class);
    }

    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }
}
