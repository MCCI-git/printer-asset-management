<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Store contract name so logs survive contract deletion
        Schema::table('contract_renewals', function (Blueprint $table) {
            $table->string('contract_name')->after('event_type')->default('');
        });

        // Backfill contract_name from existing rows
        DB::statement('
            UPDATE contract_renewals cr
            LEFT JOIN contracts c ON c.id = cr.original_contract_id
            SET cr.contract_name = COALESCE(c.name, "")
        ');

        // Expand event_type enum to include created, updated, deleted
        DB::statement("ALTER TABLE contract_renewals MODIFY COLUMN event_type ENUM('renewed','expired','created','updated','deleted') NOT NULL DEFAULT 'renewed'");

        // Make original_contract_id nullable with nullOnDelete (drop old FK first)
        Schema::table('contract_renewals', function (Blueprint $table) {
            $table->dropForeign(['original_contract_id']);
            $table->unsignedBigInteger('original_contract_id')->nullable()->change();
        });

        Schema::table('contract_renewals', function (Blueprint $table) {
            $table->foreign('original_contract_id')->references('id')->on('contracts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('contract_renewals', function (Blueprint $table) {
            $table->dropForeign(['original_contract_id']);
            $table->unsignedBigInteger('original_contract_id')->nullable(false)->change();
            $table->foreign('original_contract_id')->references('id')->on('contracts')->cascadeOnDelete();
        });

        DB::statement("ALTER TABLE contract_renewals MODIFY COLUMN event_type ENUM('renewed','expired') NOT NULL DEFAULT 'renewed'");

        Schema::table('contract_renewals', function (Blueprint $table) {
            $table->dropColumn('contract_name');
        });
    }
};
