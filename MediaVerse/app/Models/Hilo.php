<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Hilo extends Model
{
    use HasFactory;

    protected $table = 'hilos';

    protected $fillable = [
        'user_id',
        'medio_id',
        'titulo',
        'contenido',
        'categorias'
    ];

    protected $casts = [
        'categorias' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function medio(): BelongsTo
    {
        return $this->belongsTo(Medio::class);
    }

    /** Múltiples medios vinculados (tabla pivote hilo_medio) */
    public function medios(): BelongsToMany
    {
        return $this->belongsToMany(Medio::class, 'hilo_medio');
    }

    public function respuestas(): HasMany
    {
        return $this->hasMany(RespuestaHilo::class, 'hilo_id');
    }
}