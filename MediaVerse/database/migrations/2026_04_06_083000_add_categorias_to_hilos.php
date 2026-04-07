<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hilos', function (Blueprint $table) {
            // Categorías del hilo: JSON array, ej: ["pelicula","serie"]
            $table->json('categorias')->nullable()->after('contenido');
        });
    }

    public function down(): void
    {
        Schema::table('hilos', function (Blueprint $table) {
            $table->dropColumn('categorias');
        });
    }
};
