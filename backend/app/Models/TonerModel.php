<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TonerModel extends Model
{
    protected $fillable = ['name', 'model_number', 'low_stock_threshold'];
}
