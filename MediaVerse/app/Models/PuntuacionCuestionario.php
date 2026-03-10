<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PuntuacionCuestionario extends Model
{
    use HasFactory;

    protected $table = 'puntuacion_cuestionarios';

    protected $fillable = [
        'user_id',
        'cuestionario_id',
        'puntuacion',
        'tiempo_tardado_segundos'
    ];

    /**
     * El usuario que jugó la partida.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * El cuestionario que se jugó.
     */
    public function cuestionario(): BelongsTo
    {
        return $this->belongsTo(Cuestionario::class);
    }
}