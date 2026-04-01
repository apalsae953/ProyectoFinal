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
        Schema::create('valoracion_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('valoracion_id')->constrained('valoracions')->onDelete('cascade');
            $table->enum('type', ['like', 'dislike']);
            $table->timestamps();

            // Un usuario solo puede votar una vez (like o dislike) por cada valoración
            $table->unique(['user_id', 'valoracion_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('valoracion_votes');
    }
};
