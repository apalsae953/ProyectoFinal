<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RespuestaHilo extends Model
{
    use HasFactory;

    // Especificar la tabla asociada al modelo
    protected $table = 'respuesta_hilos';

    // Permitir asignación masiva en estos campos
    protected $fillable = [
        'hilo_id',
        'user_id',
        'padre_id',
        'contenido'
    ];

    /**
     * Obtener el hilo al que pertenece esta respuesta.
     */
    public function hilo(): BelongsTo
    {
        return $this->belongsTo(Hilo::class);
    }

    /**
     * Obtener el usuario que hizo esta respuesta.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Obtener la respuesta padre (si existe) para esta respuesta, permitiendo respuestas anidadas.
     */
    public function padre(): BelongsTo
    {
        return $this->belongsTo(RespuestaHilo::class, 'padre_id');
    }

    /**
     * Obtener las respuestas hijas (respuestas anidadas) para esta respuesta.
     */
    public function respuestasHijas(): HasMany
    {
        return $this->hasMany(RespuestaHilo::class, 'padre_id');
    }
}