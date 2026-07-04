<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consumables', function (Blueprint $table) {
            $table->date('purchase_date')->nullable()->after('assignment_date');
            $table->string('invoice_number')->nullable()->after('purchase_date');
        });
    }

    public function down(): void
    {
        Schema::table('consumables', function (Blueprint $table) {
            $table->dropColumn(['purchase_date', 'invoice_number']);
        });
    }
};
