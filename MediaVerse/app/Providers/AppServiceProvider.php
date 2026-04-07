<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Forzamos a que el enlace de recuperación apunte a nuestro React
        \Illuminate\Auth\Notifications\ResetPassword::createUrlUsing(function ($notifiable, $token) {
            return "http://localhost:5173/reset-password?token={$token}&email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}
