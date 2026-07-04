<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('consumables', function (Blueprint $table) {
            $table->unsignedInteger('page_yield')->nullable()->after('unit_cost');
        });
    }

    public function down(): void
    {
        Schema::table('consumables', function (Blueprint $table) {
            $table->dropColumn('page_yield');
        });
    }
};
