<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_students', function (Blueprint $table) {
            $table->id();
            $table->string('printer_id')->nullable();
            $table->string('name');
            $table->string('email');
            $table->foreignId('plan_id')->constrained('print_plans');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('print_students');
    }
};
