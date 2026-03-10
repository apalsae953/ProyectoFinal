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
        Schema::create('interaccions', function (Blueprint $table) {
            $table->id();
            //Usuario que interactua y medio con el que interactua
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('medio_id')->constrained('medios')->onDelete('cascade');
            //Tipo de interaccion: favorito, visto o ver mas tarde
            $table->enum('tipo', ['favorito', 'visto', 'ver_mas_tarde']);
            $table->timestamps();
            //Prevenir duplicados: un usuario no puede tener la misma interaccion con el mismo medio mas de una vez
            $table->unique(['user_id', 'medio_id', 'tipo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('interaccions');
    }
};
