<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('print_students')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('print_plans');
            $table->decimal('price', 8, 2);
            $table->string('type')->default('purchase'); // purchase | email
            $table->timestamp('purchased_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('print_purchases');
    }
};
