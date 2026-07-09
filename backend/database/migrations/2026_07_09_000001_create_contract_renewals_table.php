<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_renewals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('original_contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->foreignId('renewed_contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->foreignId('renewed_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('renewed_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_renewals');
    }
};
