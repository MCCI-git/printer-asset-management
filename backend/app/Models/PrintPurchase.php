<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrintPurchase extends Model
{
    protected $fillable = ['student_id', 'plan_id', 'price', 'type', 'purchased_at'];

    protected $casts = ['purchased_at' => 'datetime', 'price' => 'float'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(PrintStudent::class, 'student_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(PrintPlan::class, 'plan_id');
    }
}
