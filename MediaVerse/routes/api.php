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
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RankingController;

// Obtener datos del usuario actual (Ruta por defecto de Laravel)
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// RUTAS PÚBLICAS (No requieren login)

// --- Catálogo (TMDB / RAWG) ---
Route::get('/movies/popular', [MedioController::class, 'getPopularMovies']);
Route::get('/movies/latest', [MedioController::class, 'getLatestMovies']);
Route::get('/movies/search', [MedioController::class, 'searchMovies']);
Route::get('/movies/{id}', [MedioController::class, 'getMovieDetail']);
Route::get('/tv/search', [MedioController::class, 'searchSeries']);
Route::get('/tv/popular', [MedioController::class, 'getPopularSeries']);
Route::get('/tv/latest', [MedioController::class, 'getLatestSeries']);
Route::get('/tv/{id}', [MedioController::class, 'getTvDetail']);
Route::get('/games/search', [MedioController::class, 'searchGames']);
Route::get('/games/popular', [MedioController::class, 'getPopularGames']);
Route::get('/games/latest', [MedioController::class, 'getLatestGames']);
Route::get('/games/{id}', [MedioController::class, 'getGameDetail']);
Route::get('/actor/{id}', [MedioController::class, 'getActorDetail']);
Route::get('/actors/popular', [MedioController::class, 'getPopularActors']);
Route::get('/actors/search', [MedioController::class, 'searchActors']);
Route::get('/anime/popular', [MedioController::class, 'getAnimeMixed']);
Route::get('/anime/search', [MedioController::class, 'searchAnimeMixed']);

// --- Autenticación ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/password/forgot', [AuthController::class, 'forgotPassword']);
Route::post('/password/reset', [AuthController::class, 'resetPassword']);

// --- Autenticación Social (OAuth) ---
Route::get('/auth/{provider}/redirect', [AuthController::class, 'redirectToProvider']);
Route::get('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback']);

// --- Trivia (Kahoot) ---
Route::get('/trivia', [TriviaController::class, 'getCuestionarios']); // Listar modos
Route::get('/trivia/{id}/play', [TriviaController::class, 'jugarCuestionario']); // Empezar partida

// --- Valoraciones (Lectura) ---
Route::get('/reviews/{tipo}/{api_id}', [ValoracionController::class, 'getResenasPorMedio']); // Leer reseñas

// --- Foro (Lectura) ---
Route::get('/threads', [HiloController::class, 'index']); // Listar hilos (soporta filtros)
Route::get('/threads/{id}', [HiloController::class, 'show']); // Ver un hilo y sus respuestas

// RUTAS DE RANKINGS (Lectura Pública)
Route::get('/rankings', [RankingController::class, 'index']); // Todos los rankings públicos
Route::get('/rankings/{id}', [RankingController::class, 'show']); // Detalle de un ranking


// RUTAS PROTEGIDAS (Requieren Token)
Route::middleware('auth:sanctum')->group(function () {
    // Valoraciones context (para saber si el usuario votó)
    Route::get('/reviews/{tipo}/{api_id}/auth', [ValoracionController::class, 'getResenasPorMedio']); 

    
    // Cerrar sesión
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Trivia: Guardar puntuación y ver récords
    Route::post('/trivia/{id}/score', [TriviaController::class, 'guardarPuntuacion']);
    Route::get('/trivia/my-scores', [TriviaController::class, 'getBestScores']);
    
    // Valoraciones: Dejar una reseña o puntuación
    Route::post('/reviews', [ValoracionController::class, 'store']);
    Route::post('/reviews/{id}/vote', [ValoracionController::class, 'toggleVote']);
    Route::delete('/reviews/{id}', [ValoracionController::class, 'destroy']);
    Route::get('/user/reviews', [ValoracionController::class, 'misResenas']);

    // Alternar (Añadir/Quitar) interacción
    Route::post('/interactions/toggle', [InteraccionController::class, 'toggle']);
    
    // Ver mis listas (Favoritos, Pendientes...)
    Route::get('/interactions/me', [InteraccionController::class, 'misInteracciones']);
    Route::put('/interactions/{id}/date', [InteraccionController::class, 'updateDate']);
    
    // RUTAS DEL FORO (Crear y Comentar)
    Route::post('/threads', [HiloController::class, 'store']); // Crear un nuevo hilo
    Route::post('/threads/{hilo_id}/replies', [RespuestaHiloController::class, 'store']); // Responder a un hilo
    Route::delete('/replies/{id}', [RespuestaHiloController::class, 'destroy']); // Eliminar un comentario propio
    Route::delete('/threads/{id}', [HiloController::class, 'destroy']); // Eliminar un hilo propio
    
    // Perfil de Usuario
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile', [ProfileController::class, 'update']);

    // RUTAS DE RANKINGS (Protegidas)
    Route::get('/user/rankings', [RankingController::class, 'myRankings']);
    Route::post('/rankings', [RankingController::class, 'store']);
    Route::put('/rankings/{id}', [RankingController::class, 'update']);
    Route::delete('/rankings/{id}', [RankingController::class, 'destroy']);
    Route::post('/rankings/{id}/items', [RankingController::class, 'addItem']);
    Route::delete('/rankings/{id}/items/{item_id}', [RankingController::class, 'removeItem']);
    Route::put('/rankings/{id}/reorder', [RankingController::class, 'reorderItems']);
    Route::post('/rankings/{id}/like', [RankingController::class, 'toggleLike']);
});