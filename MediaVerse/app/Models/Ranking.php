<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ranking extends Model
{
    protected $fillable = [
        'user_id',
        'titulo',
        'descripcion',
        'tipo',
        'is_public'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(RankingItem::class)->orderBy('position', 'asc');
    }

    public function likes()
    {
        return $this->belongsToMany(User::class, 'ranking_likes')->withTimestamps();
    }
}
