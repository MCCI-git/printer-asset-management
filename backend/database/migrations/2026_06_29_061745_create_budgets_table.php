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
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->enum('type', ['total', 'capex', 'opex']);
            $table->decimal('amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['year', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
