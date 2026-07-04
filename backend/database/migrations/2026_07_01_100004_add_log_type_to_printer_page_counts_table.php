<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('printer_page_counts', function (Blueprint $table) {
            $table->enum('log_type', ['toner_change', 'monthly_audit', 'manual'])->default('manual')->after('logged_at');
        });
    }

    public function down(): void
    {
        Schema::table('printer_page_counts', function (Blueprint $table) {
            $table->dropColumn('log_type');
        });
    }
};
