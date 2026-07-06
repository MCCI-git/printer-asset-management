<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_name')->nullable();
            $table->string('action');           // created, updated, deleted, assigned, unassigned, completed
            $table->string('model_type');       // Printer, Consumable, WorkOrder, Contract, Budget, Supplier
            $table->unsignedBigInteger('model_id')->nullable();
            $table->string('model_label');      // human-readable name of the record, e.g. "HP LaserJet Pro"
            $table->text('description');        // full human-readable sentence
            $table->json('properties')->nullable(); // changed fields (key => [old, new])
            $table->timestamps();

            $table->index(['model_type', 'model_id']);
            $table->index('created_at');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
