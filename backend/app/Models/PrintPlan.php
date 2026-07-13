<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PrintPlan extends Model
{
    protected $fillable = ['label', 'pages', 'price'];

    protected $casts = ['price' => 'float', 'pages' => 'integer'];

    public function students(): HasMany
    {
        return $this->hasMany(PrintStudent::class, 'plan_id');
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(PrintPurchase::class, 'plan_id');
    }
}
