<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrder extends Model
{
    protected $fillable = [
        'printer_id', 'issue', 'priority', 'status',
        'assignee', 'scheduled_date', 'completed_date', 'notes', 'cost',
    ];

    protected $casts = [
        'scheduled_date'  => 'date',
        'completed_date'  => 'date',
        'cost'            => 'float',
    ];

    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }

    public function getWoNumberAttribute(): string
    {
        return 'WO-' . str_pad($this->id, 3, '0', STR_PAD_LEFT);
    }

    protected $appends = ['wo_number'];
}
