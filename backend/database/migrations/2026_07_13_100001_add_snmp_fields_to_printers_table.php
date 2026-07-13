<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            if (!Schema::hasColumn('printers', 'snmp_community')) {
                $table->string('snmp_community')->default('public')->after('ip_address');
            }
            if (!Schema::hasColumn('printers', 'snmp_status')) {
                $table->string('snmp_status')->nullable()->after('snmp_community');
            }
        });
    }

    public function down(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            $table->dropColumn(array_filter(['snmp_community', 'snmp_status'], fn($col) => Schema::hasColumn('printers', $col)));
        });
    }
};
