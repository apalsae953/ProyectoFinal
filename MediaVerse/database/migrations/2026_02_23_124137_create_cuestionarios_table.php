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
        Schema::create('cuestionarios', function (Blueprint $table) {
            $table->id();
            //Titulo de la quiz y descripcion opcional
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            //Categorias
            $table->enum('categoria', [
                'peliculas',
                'series',
                'peliculas_y_series',
                'videojuegos',
                'mixto'
            ]);
            //Posible dificultad
            $table->enum('dificultad', ['facil', 'medio', 'dificil'])->nullable();
            //Opcional: Link para un medio en especifico
            $table->foreignId('medio_id')->nullable()->constrained('medios')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cuestionarios');
    }
};
