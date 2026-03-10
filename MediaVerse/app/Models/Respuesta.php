<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Respuesta extends Model
{
    use HasFactory;

    protected $table = 'respuestas';

    protected $fillable = [
        'pregunta_id',
        'texto_respuesta',
        'es_correcta'
    ];

    // Convertimos el 0/1 de MySQL a un true/false en Laravel y React automáticamente
    protected $casts = [
        'es_correcta' => 'boolean',
    ];

    /**
     * La pregunta a la que pertenece esta opción.
     */
    public function pregunta(): BelongsTo
    {
        return $this->belongsTo(Pregunta::class);
    }
}