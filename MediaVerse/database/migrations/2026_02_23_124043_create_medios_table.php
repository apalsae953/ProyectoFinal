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
        Schema::create('medios', function (Blueprint $table) {
            $table->id();
            //Api externa
            $table->string('api_id');
            //Tipos de medio: película, serie y videojuego
            $table->enum('tipo',['pelicula','serie','videojuego']);
            //Datos de la API externa
            $table->string('titulo')->nullable();
            $table->text('poster_path')->nullable();
            //Datos para las valoraciones
            $table->decimal('puntuacion_critica', 3, 1)->nullable();
            $table->decimal('puntuacion_usuarios', 3, 1)->nullable();

            $table->timestamps();
            //Prevenir duplicados
            $table->unique(['api_id', 'tipo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medios');
    }
};
