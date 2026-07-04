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
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('contact_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->decimal('spend_2023', 12, 2)->default(0);
            $table->decimal('spend_2024', 12, 2)->default(0);
            $table->decimal('spend_2025_ytd', 12, 2)->default(0);
            $table->decimal('budget_2025', 12, 2)->default(0);
            $table->decimal('rating', 3, 1)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
