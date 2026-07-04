<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('consumables', function (Blueprint $table) {
            $table->unsignedInteger('low_stock_threshold')->default(1)->change();
        });

        DB::table('consumables')->update(['low_stock_threshold' => 1]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('consumables', function (Blueprint $table) {
            $table->unsignedInteger('low_stock_threshold')->default(3)->change();
        });
    }
};
