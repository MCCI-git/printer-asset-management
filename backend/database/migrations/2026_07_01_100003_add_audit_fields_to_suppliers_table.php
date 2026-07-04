<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->boolean('preferred_supplier')->default(false)->after('rating');
            $table->foreignId('contract_id')->nullable()->after('preferred_supplier')->constrained('contracts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropForeign(['contract_id']);
            $table->dropColumn(['preferred_supplier', 'contract_id']);
        });
    }
};
