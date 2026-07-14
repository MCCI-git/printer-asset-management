<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            if (!Schema::hasColumn('printers', 'snmp_total_pages')) {
                $table->unsignedBigInteger('snmp_total_pages')->nullable()->after('snmp_status');
            }
            if (!Schema::hasColumn('printers', 'snmp_toner')) {
                $table->json('snmp_toner')->nullable()->after('snmp_total_pages');
            }
            if (!Schema::hasColumn('printers', 'snmp_model')) {
                $table->string('snmp_model')->nullable()->after('snmp_toner');
            }
            if (!Schema::hasColumn('printers', 'snmp_serial')) {
                $table->string('snmp_serial')->nullable()->after('snmp_model');
            }
            if (!Schema::hasColumn('printers', 'snmp_printer_status')) {
                $table->string('snmp_printer_status')->nullable()->after('snmp_serial');
            }
            if (!Schema::hasColumn('printers', 'snmp_fetched_at')) {
                $table->timestamp('snmp_fetched_at')->nullable()->after('snmp_printer_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            $cols = ['snmp_total_pages', 'snmp_toner', 'snmp_model', 'snmp_serial', 'snmp_printer_status', 'snmp_fetched_at'];
            $table->dropColumn(array_filter($cols, fn($c) => Schema::hasColumn('printers', $c)));
        });
    }
};
