<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Jetstream\HasProfilePhoto;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany; // 🌟 AÑADIDO

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use HasProfilePhoto;
    use Notifiable;
    use TwoFactorAuthenticatable;

    /**
     * Atributos que se pueden asignar de forma masiva.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'provider',
        'provider_id',
        'avatar',
        'bio',
        'pelicula_favorita',
        'serie_favorita',
        'juego_favorito',
    ];

    /**
     * Atributos que deben ocultarse para la serialización (API/Json).
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_recovery_codes',
        'two_factor_secret',
    ];

    /**
     * Atributos adicionales que se añaden al formato array/JSON del modelo.
     */
    protected $appends = [
        'profile_photo_url',
    ];

    /**
     * Define los tipos de datos a los que se convertirán los atributos.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean', // Laravel lo tratará siempre como true/false
            'pelicula_favorita' => 'json',
            'serie_favorita' => 'json',
            'juego_favorito' => 'json',
        ];
    }

    // Relaciones con la base de datos
    public function interacciones(): HasMany
    {
        return $this->hasMany(Interaccion::class);
    }

    public function valoraciones(): HasMany
    {
        return $this->hasMany(Valoracion::class);
    }

    public function hilos(): HasMany
    {
        return $this->hasMany(Hilo::class);
    }

    public function respuestas(): HasMany
    {
        return $this->hasMany(RespuestaHilo::class);
    }

    public function puntuacionesCuestionarios(): HasMany
    {
        return $this->hasMany(PuntuacionCuestionario::class);
    }
}