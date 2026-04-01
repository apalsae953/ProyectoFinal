<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RankingItem extends Model
{
    protected $fillable = [
        'ranking_id',
        'media_id',
        'media_type',
        'media_name',
        'media_image',
        'position'
    ];

    public function ranking()
    {
        return $this->belongsTo(Ranking::class);
    }
}
