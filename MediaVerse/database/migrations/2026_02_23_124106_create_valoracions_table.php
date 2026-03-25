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
        Schema::create('valoracions', function (Blueprint $table) {
            $table->id();
            //Usuario que valora y medio que valora
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('medio_id')->constrained('medios')->onDelete('cascade');
            //Puntuacion del 1 al 10 y comentario opcional
            $table->decimal('puntuacion', 3, 1);
            $table->text('comentario')->nullable(); 
            $table->timestamps();
            //Prevenir duplicados: un usuario no puede valorar el mismo medio mas de una vez
            $table->unique(['user_id', 'medio_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('valoracions');
    }
};
