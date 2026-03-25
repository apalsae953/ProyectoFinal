<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Interaccion extends Model
{
    use HasFactory;

    protected $table = 'interaccions';

    protected $fillable = [
        'user_id',
        'medio_id',
        'tipo'
    ];

    /**
     * Obtener el usuario que realizó esta interacción (favorito, visto o ver mas tarde).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Obtener el medio con el que se realizó esta interacción (pelicula, serie o videojuego).
     */
    public function medio(): BelongsTo
    {
        return $this->belongsTo(Medio::class);
    }
}