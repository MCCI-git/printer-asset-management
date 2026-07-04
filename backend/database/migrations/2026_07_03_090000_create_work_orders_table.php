<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('printer_id')->constrained()->cascadeOnDelete();
            $table->string('issue');
            $table->enum('priority', ['high', 'medium', 'low'])->default('medium');
            $table->enum('status', ['open', 'in-progress', 'scheduled', 'completed', 'cancelled'])->default('open');
            $table->string('assignee')->nullable();
            $table->date('scheduled_date')->nullable();
            $table->date('completed_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
