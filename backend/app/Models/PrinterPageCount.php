<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrinterPageCount extends Model
{
    protected $fillable = ['printer_id', 'count', 'logged_at', 'log_type', 'notes'];

    protected $casts = [
        'count'     => 'integer',
        'logged_at' => 'date',
    ];

    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }
}
