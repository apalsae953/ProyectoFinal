<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Hacer que medio_id sea opcional para permitir hilos generales sin vincular a un medio.
     */
    public function up(): void
    {
        Schema::table('hilos', function (Blueprint $table) {
            $table->foreignId('medio_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('hilos', function (Blueprint $table) {
            $table->foreignId('medio_id')->nullable(false)->change();
        });
    }
};
