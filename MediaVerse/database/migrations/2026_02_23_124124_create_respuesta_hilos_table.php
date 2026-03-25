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
        Schema::create('respuesta_hilos', function (Blueprint $table) {
            $table->id();
            //A que hilo pertenece esta repuesta
            $table->foreignId('hilo_id')->constrained('hilos')->onDelete('cascade');
            //Quien responde
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            //Clave esterna para respuestas anidadas
            $table->foreignId('padre_id')->nullable()->constrained('respuesta_hilos')->onDelete('cascade');            
            //Contenido de la respuesta
            $table->text('contenido');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('respuesta_hilos');
    }
};
