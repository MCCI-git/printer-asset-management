<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete()->after('cost');
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Supplier::class);
            $table->dropColumn('supplier_id');
        });
    }
};
