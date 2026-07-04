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
        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('brn')->nullable()->after('phone');
            $table->string('vat_number')->nullable()->after('brn');
            $table->string('salesperson_name')->nullable()->after('vat_number');
            $table->string('salesperson_email')->nullable()->after('salesperson_name');
            $table->string('salesperson_phone')->nullable()->after('salesperson_email');
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn(['brn', 'vat_number', 'salesperson_name', 'salesperson_email', 'salesperson_phone']);
        });
    }
};
