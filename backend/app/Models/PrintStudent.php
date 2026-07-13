<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PrintStudent extends Model
{
    protected $fillable = ['printer_id', 'name', 'email', 'plan_id'];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(PrintPlan::class, 'plan_id');
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(PrintPurchase::class, 'student_id');
    }

    public function getPurchaseCountAttribute(): int
    {
        return $this->purchases()->where('type', 'purchase')->count();
    }
}
