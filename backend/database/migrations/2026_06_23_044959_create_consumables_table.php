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
        Schema::create('consumables', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->enum('type', ['Toner', 'Paper', 'Drum', 'Waste', 'Maintenance Kit'])->default('Toner');
            $table->decimal('unit_cost', 10, 2);
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(3);
            $table->string('assigned_to')->nullable();
            $table->date('assignment_date')->nullable();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('printer_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('consumables');
    }
};
