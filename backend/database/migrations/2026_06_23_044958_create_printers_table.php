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
        Schema::create('printers', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('snipeit_id')->nullable()->unique();
            $table->string('asset_tag')->unique();
            $table->string('serial')->nullable();
            $table->string('name');
            $table->string('model')->nullable();
            $table->enum('cost_type', ['CAPEX', 'OPEX'])->default('CAPEX');
            $table->decimal('purchase_cost', 10, 2)->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('monthly_fixed_cost', 10, 2)->nullable();
            $table->decimal('per_page_cost', 10, 4)->nullable();
            $table->string('warranty')->nullable();
            $table->string('department')->nullable();
            $table->string('location')->nullable();
            $table->enum('status', ['active', 'maintenance', 'retired', 'lost'])->default('active');
            $table->string('assigned_to')->nullable();
            $table->date('checkout_date')->nullable();
            $table->string('image_url')->nullable();
            $table->text('notes')->nullable();
            $table->date('last_service_date')->nullable();
            $table->date('next_service_date')->nullable();
            $table->unsignedInteger('service_count')->default(0);
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printers');
    }
};
