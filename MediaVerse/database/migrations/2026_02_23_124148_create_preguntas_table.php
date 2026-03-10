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
        Schema::create('preguntas', function (Blueprint $table) {
            $table->id();

            // Cada pregunta pertenece a un cuestionario específico
            $table->foreignId('cuestionario_id')->constrained('cuestionarios')->onDelete('cascade');

            // Texto de la pregunta actual
            $table->string('texto_pregunta');

            // Imagen opcianal para la pregunta (por ejemplo, un fotograma de una película o serie)
            $table->string('imagen_url')->nullable();

            // El límite de tiempo de la cuenta atrás para esta pregunta
            $table->unsignedTinyInteger('tiempo_limite_segundos')->default(20);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('preguntas');
    }
};
