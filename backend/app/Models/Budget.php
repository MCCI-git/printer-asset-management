<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    protected $fillable = ['year', 'type', 'amount', 'notes', 'start_date', 'end_date'];

    protected $casts = [
        'year'       => 'integer',
        'amount'     => 'float',
        'start_date' => 'date',
        'end_date'   => 'date',
    ];
}
