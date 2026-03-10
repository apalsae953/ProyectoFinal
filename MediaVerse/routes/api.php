<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MedioController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TriviaController;
use App\Http\Controllers\ValoracionController;
use App\Http\Controllers\InteraccionController;
use App\Http\Controllers\HiloController;
use App\Http\Controllers\RespuestaHiloController;

// Obtener datos del usuario actual
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/movies/popular', [MedioController::class, 'getPopularMovies']);
Route::get('/movies/search', [MedioController::class, 'searchMovies']);
Route::get('/tv/search', [MedioController::class, 'searchSeries']);
Route::get('/games/search', [MedioController::class, 'searchGames']);
Route::get('/games/popular', [MedioController::class, 'getPopularGames']);
Route::get('/tv/popular', [MedioController::class, 'getPopularSeries']);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/trivia', [TriviaController::class, 'getCuestionarios']);
Route::get('/trivia/{id}/play', [TriviaController::class, 'jugarCuestionario']);

Route::get('/reviews/{tipo}/{api_id}', [ValoracionController::class, 'getResenasPorMedio']);

Route::get('/threads', [HiloController::class, 'index']);
Route::get('/threads/{id}', [HiloController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/trivia/{id}/score', [TriviaController::class, 'guardarPuntuacion']);
    Route::post('/reviews', [ValoracionController::class, 'store']);
    Route::post('/interactions/toggle', [InteraccionController::class, 'toggle']);
    Route::get('/interactions/me', [InteraccionController::class, 'misInteracciones']);
    Route::post('/threads', [HiloController::class, 'store']);
    Route::post('/threads/{hilo_id}/replies', [RespuestaHiloController::class, 'store']);
});