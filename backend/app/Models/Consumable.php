<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Consumable extends Model
{
    protected $fillable = [
        'sku', 'name', 'type', 'color', 'unit_cost', 'page_yield', 'quantity',
        'low_stock_threshold', 'assigned_to', 'assignment_date',
        'purchase_date', 'invoice_number',
        'supplier_id', 'printer_id',
    ];

    protected $casts = [
        'unit_cost'       => 'float',
        'assignment_date' => 'date',
        'purchase_date'   => 'date',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }
}
