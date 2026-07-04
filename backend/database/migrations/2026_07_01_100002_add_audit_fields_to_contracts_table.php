<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->unsignedInteger('notice_period_days')->nullable()->after('covered_printers');
            $table->string('contract_manager')->nullable()->after('notice_period_days');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn(['notice_period_days', 'contract_manager']);
        });
    }
};
