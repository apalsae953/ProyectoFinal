<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medio extends Model
{
    use HasFactory;

    protected $table = 'medios';

    protected $fillable = [
        'api_id',
        'tipo',
        'titulo',
        'poster_path',
        'puntuacion_critica',
        'puntuacion_usuarios'
    ];

    /**
     * Obtener todas las interacciones de los usuarios con este medio (favoritos, vistos, ver mas tarde).
     */
    public function interacciones(): HasMany
    {
        return $this->hasMany(Interaccion::class);
    }

    /**
     * Obtener todas las valoraciones que los usuarios han dado a este medio (puntuacion y comentario).
     */
    public function valoraciones(): HasMany
    {
        return $this->hasMany(Valoracion::class);
    }

    /**
     * Obtener todos los hilos del foro asociados a este medio.
     */
    public function hilos(): HasMany
    {
        return $this->hasMany(Hilo::class);
    }
}