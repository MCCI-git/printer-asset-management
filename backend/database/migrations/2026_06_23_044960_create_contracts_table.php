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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('vendor');
            $table->enum('type', ['Service', 'Support', 'Lease', 'Maintenance'])->default('Service');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('annual_cost', 12, 2);
            $table->unsignedInteger('covered_printers')->default(0);
            $table->string('pdf_path')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'expired', 'pending'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
