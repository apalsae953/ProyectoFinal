<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pregunta extends Model
{
    use HasFactory;

    protected $table = 'preguntas';

    protected $fillable = [
        'cuestionario_id',
        'texto_pregunta',
        'imagen_url',
        'tiempo_limite_segundos'
    ];

    /**
     * El cuestionario al que pertenece esta pregunta.
     */
    public function cuestionario(): BelongsTo
    {
        return $this->belongsTo(Cuestionario::class);
    }

    /**
     * Las opciones de respuesta (A, B, C, D) para esta pregunta.
     */
    public function respuestas(): HasMany
    {
        return $this->hasMany(Respuesta::class);
    }
}