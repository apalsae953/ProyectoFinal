<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabla pivote para vincular múltiples medios a un hilo (máx 1 peli, 1 serie, 1 juego).
     */
    public function up(): void
    {
        Schema::create('hilo_medio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hilo_id')->constrained('hilos')->onDelete('cascade');
            $table->foreignId('medio_id')->constrained('medios')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['hilo_id', 'medio_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hilo_medio');
    }
};
