<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Hilo extends Model
{
    use HasFactory;

    // Especificar la tabla asociada al modelo
    protected $table = 'hilos';

    // Permitir asignación masiva en estos campos
    protected $fillable = [
        'user_id',
        'medio_id',
        'titulo',
        'contenido'
    ];

    /**
     * Usuario que creó el hilo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Elemento al que pertenece el hilo (pelicula, serie o videojuego)
     */
    public function medio(): BelongsTo
    {
        return $this->belongsTo(Medio::class);
    }

    /**
     * Respuestas asociadas a este hilo
     */
    public function respuestas(): HasMany
    {
        return $this->hasMany(RespuestaHilo::class, 'hilo_id');
    }
}