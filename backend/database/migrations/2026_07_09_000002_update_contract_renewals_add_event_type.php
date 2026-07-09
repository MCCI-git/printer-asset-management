<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contract_renewals', function (Blueprint $table) {
            $table->enum('event_type', ['renewed', 'expired'])->default('renewed')->after('id');
            $table->unsignedBigInteger('renewed_contract_id')->nullable()->change();
            $table->unsignedBigInteger('renewed_by')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('contract_renewals', function (Blueprint $table) {
            $table->dropColumn('event_type');
            $table->unsignedBigInteger('renewed_contract_id')->nullable(false)->change();
            $table->unsignedBigInteger('renewed_by')->nullable(false)->change();
        });
    }
};
