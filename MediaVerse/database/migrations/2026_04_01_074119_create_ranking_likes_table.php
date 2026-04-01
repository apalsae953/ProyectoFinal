<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('ranking_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('ranking_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            // Un usuario solo puede dar like a un ranking una vez
            $table->unique(['user_id', 'ranking_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('ranking_likes');
    }
};
