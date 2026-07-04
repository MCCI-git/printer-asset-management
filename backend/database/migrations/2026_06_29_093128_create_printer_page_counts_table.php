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
        Schema::create('printer_page_counts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('printer_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('count');
            $table->date('logged_at');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printer_page_counts');
    }
};
