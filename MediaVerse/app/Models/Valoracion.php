<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Valoracion extends Model
{
    use HasFactory;

    protected $table = 'valoracions';

    protected $fillable = [
        'user_id',
        'medio_id',
        'puntuacion',
        'comentario'
    ];

    /**
     * Obtener el usuario que escribió la valoración.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Obtener el medio que fue valorado.
     */
    public function medio(): BelongsTo
    {
        return $this->belongsTo(Medio::class);
    }

    /**
     * Obtener los votos (likes/dislikes) de esta valoración.
     */
    public function votes()
    {
        return $this->hasMany(ValoracionVote::class);
    }

    /**
     * Contar likes
     */
    public function getLikesCountAttribute()
    {
        return $this->votes()->where('type', 'like')->count();
    }

    /**
     * Contar dislikes
     */
    public function getDislikesCountAttribute()
    {
        return $this->votes()->where('type', 'dislike')->count();
    }
}