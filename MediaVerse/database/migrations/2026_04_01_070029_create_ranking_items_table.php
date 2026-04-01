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
        Schema::create('ranking_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ranking_id')->constrained()->onDelete('cascade');
            $table->integer('media_id');
            $table->string('media_type');
            $table->string('media_name')->nullable();
            $table->string('media_image')->nullable();
            $table->integer('position');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ranking_items');
    }
};
