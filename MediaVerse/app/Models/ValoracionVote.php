<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ValoracionVote extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'valoracion_id',
        'type'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function valoracion()
    {
        return $this->belongsTo(Valoracion::class);
    }
}
