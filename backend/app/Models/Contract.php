<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    protected $fillable = [
        'name', 'vendor', 'supplier_id', 'type', 'start_date', 'end_date',
        'annual_cost', 'covered_printers', 'notice_period_days', 'contract_manager',
        'pdf_path', 'notes', 'status',
    ];

    protected $casts = [
        'start_date'  => 'date',
        'end_date'    => 'date',
        'annual_cost' => 'float',
    ];

    public function supplier()
    {
        return $this->belongsTo(\App\Models\Supplier::class);
    }
}
