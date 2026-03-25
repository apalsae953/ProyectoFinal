<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cuestionario extends Model
{
    use HasFactory;

    protected $table = 'cuestionarios';

    protected $fillable = [
        'titulo',
        'descripcion',
        'categoria',
        'dificultad',
        'medio_id'
    ];

    /**
     * Opcional: Medio al que pertenece este quiz (si es un quiz específico para una película, serie o videojuego)
     */
    public function medio(): BelongsTo
    {
        return $this->belongsTo(Medio::class);
    }

    /**
     * Obtener todas las preguntas de este cuestionario.
     */
    public function preguntas(): HasMany
    {
        return $this->hasMany(Pregunta::class);
    }

    /**
     * Obtener todas las puntuaciones que los usuarios han conseguido en este quiz.
     */
    public function puntuaciones(): HasMany
    {
        return $this->hasMany(PuntuacionCuestionario::class);
    }
}