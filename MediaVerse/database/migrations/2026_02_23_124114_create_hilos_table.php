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
        Schema::create('hilos', function (Blueprint $table) {
            $table->id();
            //Relaciones: Quien lo creo y a que medio pertenece
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('medio_id')->constrained('medios')->onDelete('cascade');
            //Contenido del hilo
            $table->string('titulo');
            $table->text('contenido');

            $table->timestamps();

            //Indexacion para acelerar la cargag de hilos por medio
            $table->index('medio_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hilos');
    }
};
