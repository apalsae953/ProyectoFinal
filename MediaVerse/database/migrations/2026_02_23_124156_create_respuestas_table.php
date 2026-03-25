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
        Schema::create('respuestas', function (Blueprint $table) {
            $table->id();
            //Cada respuesta pertenece a una pregunta
            $table->foreignId('pregunta_id')->constrained('preguntas')->onDelete('cascade');
            //Texto de la respuesta y si es correcta o no
            $table->string('texto_respuesta');
            $table->boolean('es_correcta')->default(false);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('respuestas');
    }
};
