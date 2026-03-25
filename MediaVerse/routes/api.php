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

// Obtener datos del usuario actual (Ruta por defecto de Laravel)
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// RUTAS PÚBLICAS (No requieren login)

// --- Catálogo (TMDB / RAWG) ---
Route::get('/movies/popular', [MedioController::class, 'getPopularMovies']);
Route::get('/movies/search', [MedioController::class, 'searchMovies']);
Route::get('/movies/{id}', [MedioController::class, 'getMovieDetail']);
Route::get('/tv/search', [MedioController::class, 'searchSeries']);
Route::get('/tv/popular', [MedioController::class, 'getPopularSeries']);
Route::get('/tv/{id}', [MedioController::class, 'getTvDetail']);
Route::get('/games/search', [MedioController::class, 'searchGames']);
Route::get('/games/popular', [MedioController::class, 'getPopularGames']);
Route::get('/games/{id}', [MedioController::class, 'getGameDetail']);
Route::get('/actor/{id}', [MedioController::class, 'getActorDetail']);

// --- Autenticación ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// --- Trivia (Kahoot) ---
Route::get('/trivia', [TriviaController::class, 'getCuestionarios']); // Listar modos
Route::get('/trivia/{id}/play', [TriviaController::class, 'jugarCuestionario']); // Empezar partida

// --- Valoraciones (Lectura) ---
Route::get('/reviews/{tipo}/{api_id}', [ValoracionController::class, 'getResenasPorMedio']); // Leer reseñas

// --- Foro (Lectura) ---
Route::get('/threads', [HiloController::class, 'index']); // Listar hilos (soporta filtros)
Route::get('/threads/{id}', [HiloController::class, 'show']); // Ver un hilo y sus respuestas


// RUTAS PROTEGIDAS (Requieren Token)
Route::middleware('auth:sanctum')->group(function () {
    
    // Cerrar sesión
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Trivia: Guardar puntuación
    Route::post('/trivia/{id}/score', [TriviaController::class, 'guardarPuntuacion']);
    
    // Valoraciones: Dejar una reseña o puntuación
    Route::post('/reviews', [ValoracionController::class, 'store']);

    // Alternar (Añadir/Quitar) interacción
    Route::post('/interactions/toggle', [InteraccionController::class, 'toggle']);
    
    // Ver mis listas (Favoritos, Pendientes...)
    Route::get('/interactions/me', [InteraccionController::class, 'misInteracciones']);
    
    // RUTAS DEL FORO (Crear y Comentar)
    Route::post('/threads', [HiloController::class, 'store']); // Crear un nuevo hilo
    Route::post('/threads/{hilo_id}/replies', [RespuestaHiloController::class, 'store']); // Responder a un hilo
});