<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_plans', function (Blueprint $table) {
            $table->id();
            $table->string('label');       // Essential, Plus, Ultimate
            $table->integer('pages');      // 50, 100, 150
            $table->decimal('price', 8, 2);
            $table->timestamps();
        });

        DB::table('print_plans')->insert([
            ['label' => 'Essential', 'pages' => 50,  'price' =>   0, 'created_at' => now(), 'updated_at' => now()],
            ['label' => 'Plus',      'pages' => 50,  'price' => 250, 'created_at' => now(), 'updated_at' => now()],
            ['label' => 'Ultimate',  'pages' => 100, 'price' => 500, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('print_plans');
    }
};
