<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Printer extends Model
{
    protected $fillable = [
        'snipeit_id', 'asset_tag', 'serial', 'name', 'model',
        'manufacturer', 'model_number', 'color_capability', 'ip_address',
        'cost_type', 'purchase_cost', 'purchase_date',
        'monthly_fixed_cost', 'per_page_cost', 'warranty',
        'department', 'location', 'status', 'assigned_to',
        'checkout_date', 'image_url', 'notes',
        'last_service_date', 'next_service_date', 'service_count',
        'category_id', 'location_id',
    ];

    protected $casts = [
        'purchase_cost'      => 'float',
        'monthly_fixed_cost' => 'float',
        'per_page_cost'      => 'float',
        'purchase_date'      => 'date',
        'checkout_date'      => 'date',
        'last_service_date'  => 'date',
        'next_service_date'  => 'date',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function locationModel(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function consumables(): HasMany
    {
        return $this->hasMany(Consumable::class);
    }
}
