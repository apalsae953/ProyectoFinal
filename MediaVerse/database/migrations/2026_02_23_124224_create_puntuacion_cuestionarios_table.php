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
        Schema::create('puntuacion_cuestionarios', function (Blueprint $table) {
            $table->id();
            // Quien juega y que cuestionario juega
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('cuestionario_id')->constrained('cuestionarios')->onDelete('cascade');
            // Puntuacion obtenida
            $table->integer('puntuacion');
            // Tiempo que el usuario tardó en terminar (para desempatar)
            $table->integer('tiempo_tardado_segundos')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('puntuacion_cuestionarios');
    }
};
