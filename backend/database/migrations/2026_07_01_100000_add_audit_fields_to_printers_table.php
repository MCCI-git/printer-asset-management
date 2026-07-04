<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            $table->string('manufacturer')->nullable()->after('model');
            $table->string('model_number')->nullable()->after('manufacturer');
            $table->enum('color_capability', ['mono', 'colour'])->nullable()->after('model_number');
            $table->string('ip_address')->nullable()->after('color_capability');
        });
    }

    public function down(): void
    {
        Schema::table('printers', function (Blueprint $table) {
            $table->dropColumn(['manufacturer', 'model_number', 'color_capability', 'ip_address']);
        });
    }
};
