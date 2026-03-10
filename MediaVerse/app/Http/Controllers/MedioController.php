<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Medio;

class MedioController extends Controller
{
    /**
     * Helper privado para fusionar los resultados de TMDB con nuestras valoraciones locales.
     */
    private function mergeWithLocalRatings($tmdbResults, $tipo = 'pelicula')
    {
        // 1. Extraemos los IDs de la API externa (TMDB)
        $apiIds = collect($tmdbResults)->pluck('id')->toArray();

        // 2. Buscamos en nuestra DB local los medios que coincidan y traemos sus valoraciones
        $mediosLocales = Medio::with('valoraciones')
            ->whereIn('api_id', $apiIds)
            ->where('tipo', $tipo)
            ->get()
            ->keyBy('api_id'); // Usamos api_id como clave para buscar rápido

        // 3. Recorremos los resultados y les "pegamos" la nota media local
        foreach ($tmdbResults as &$result) {
            $medio = $mediosLocales->get($result['id']);
            
            if ($medio && $medio->valoraciones->count() > 0) {
                // Calculamos la media y la formateamos a 1 decimal
                $promedio = $medio->valoraciones->avg('puntuacion');
                $result['puntuacion_usuarios'] = number_format($promedio, 1);
            } else {
                $result['puntuacion_usuarios'] = null; // O un guion '-'
            }
        }

        return $tmdbResults;
    }

    /**
     * Obtener token de acceso para IGDB (Twitch OAuth2)
     */
    private function getIgdbToken()
    {
        return cache()->remember('igdb_access_token', 5000000, function () {
            $clientId = config('services.igdb.client_id');
            $clientSecret = config('services.igdb.client_secret');

            $response = Http::withoutVerifying()->post('https://id.twitch.tv/oauth2/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'grant_type' => 'client_credentials',
            ]);

            if ($response->failed()) {
                Log::error('Error al obtener token de IGDB: ' . $response->body());
                return null;
            }

            return $response->json()['access_token'];
        });
    }

    /**
     * Normalizar datos de IGDB para que el frontend no rompa
     */
    private function formatIgdbGames($games)
    {
        return array_map(function ($game) {
            return [
                'id' => $game['id'],
                'name' => $game['name'],
                'background_image' => isset($game['cover']['image_id']) 
                    ? "https://images.igdb.com/igdb/image/upload/t_720p/{$game['cover']['image_id']}.jpg" 
                    : 'https://via.placeholder.com/500x750?text=No+Image',
                'rating' => isset($game['rating']) ? round($game['rating'] / 20, 2) : 0,
                'metacritic' => isset($game['aggregated_rating']) ? round($game['aggregated_rating']) : null,
                'released' => isset($game['first_release_date']) ? date('Y-m-d', $game['first_release_date']) : null,
                'added' => $game['total_rating_count'] ?? 0, // Usamos esto para el orden de popularidad
            ];
        }, $games);
    }

    /**
     * Obtener películas populares y mezclar con notas locales.
     */
    public function getPopularMovies(Request $request)
    {
        try {
            $token = config('services.tmdb.key');
            $response = Http::withoutVerifying()
                ->get('https://api.themoviedb.org/3/discover/movie', [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'page' => $request->query('page', 1),
                    'primary_release_date.gte' => now()->subMonth()->format('Y-m-d'),
                    'primary_release_date.lte' => now()->format('Y-m-d'),
                    'sort_by' => 'popularity.desc',
                ]);

            if ($response->failed()) {
                // ... manejo de error ...
                return response()->json(['success' => false, 'message' => 'Error API Cine'], $response->status());
            }

            $data = $response->json();
            
            // REUTILIZAMOS EL HELPER PARA LAS NOTAS LOCALES
            $resultsWithRatings = $this->mergeWithLocalRatings($data['results']);

            return response()->json([
                'success' => true,
                'data' => $resultsWithRatings,
                'current_page' => $data['page'],
                'total_pages' => $data['total_pages'],
            ], 200);

        } catch (\Exception $e) {
            // ... manejo de excepción ...
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    /**
     * Obtener SERIES populares
     */
    public function getPopularSeries(Request $request)
    {
        try {
            $token = config('services.tmdb.key');
            // Fíjate que el endpoint ahora es /discover/tv
            $response = Http::withoutVerifying()
                ->get('https://api.themoviedb.org/3/discover/tv', [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'page' => $request->query('page', 1),
                    'first_air_date.gte' => now()->subMonth()->format('Y-m-d'),
                    'first_air_date.lte' => now()->format('Y-m-d'),
                    'sort_by' => 'popularity.desc',
                ]);

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Error API Series'], $response->status());
            }

            $data = $response->json();
            
            // Fusión con notas locales (usamos 'serie' como tipo)
            $resultsWithRatings = $this->mergeWithLocalRatings($data['results'], 'serie');

            foreach ($resultsWithRatings as &$item) {
                $item['title'] = $item['name'] ?? 'Sin título';
            }

            // Ordenamos por popularidad
            usort($resultsWithRatings, function($a, $b) {
                return $b['popularity'] <=> $a['popularity'];
            });

            return response()->json([
                'success' => true,
                'data' => $resultsWithRatings,
                'current_page' => $data['page'],
                'total_pages' => $data['total_pages'],
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    /**
     * 🔍 BUSCAR SERIES POR TÍTULO
     */
    public function searchSeries(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);
        $query = $request->input('query');

        try {
            $token = config('services.tmdb.key');
            // Usamos el endpoint de búsqueda de SERIES (/search/tv)
            $response = Http::withoutVerifying()
                ->get('https://api.themoviedb.org/3/search/tv', [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'query' => $query,
                    'page' => $request->query('page', 1),
                ]);

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Error al buscar series'], $response->status());
            }

            $data = $response->json();

            // 1. Fusionamos con las notas locales indicando el tipo 'serie'
            $resultsWithRatings = $this->mergeWithLocalRatings($data['results'], 'serie');

            foreach ($resultsWithRatings as &$item) {
                $item['title'] = $item['name'] ?? 'Sin título';
            }

            // 3. Ordenamos por popularidad
            usort($resultsWithRatings, function($a, $b) {
                return $b['popularity'] <=> $a['popularity'];
            });

            return response()->json([
                'success' => true,
                'data' => $resultsWithRatings,
                'current_page' => $data['page'],
                'total_pages' => $data['total_pages'],
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error en searchSeries: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    /**
     * BUSCAR PELÍCULAS POR TÍTULO
     */
    public function searchMovies(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);
        $query = $request->input('query');

        try {
            $token = config('services.tmdb.key');
            // Usamos el endpoint de BÚSQUEDA de TMDB
            $response = Http::withoutVerifying()
                ->get('https://api.themoviedb.org/3/search/movie', [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'query' => $query, // El texto que escribe el usuario
                    'page' => $request->query('page', 1),
                ]);

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Error al buscar'], $response->status());
            }

            $data = $response->json();

            // REUTILIZAMOS EL HELPER PARA LAS NOTAS LOCALES
            $resultsWithRatings = $this->mergeWithLocalRatings($data['results']);

            // Para ordenar los resultados por relevancia
            usort($resultsWithRatings, function($a, $b) {
                return $b['popularity'] <=> $a['popularity'];
            });

            return response()->json([
                'success' => true,
                'data' => $resultsWithRatings,
                'current_page' => $data['page'],
                'total_pages' => $data['total_pages'],
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error en searchMovies: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    /**
     * Obtener videojuegos populares de IGDB
     */
    public function getPopularGames(Request $request)
    {
        try {
            $accessToken = $this->getIgdbToken();
            if (!$accessToken) {
                return response()->json(['success' => false, 'message' => 'Error de autenticación con IGDB'], 500);
            }

            $page = (int) $request->query('page', 1);
            $limit = 20;
            $offset = ($page - 1) * $limit;

            $ultimoMes = now()->subDays(30)->timestamp;
            $ahora = now()->timestamp;

            // Query para IGDB: Juegos populares lanzados en los últimos 30 días
            $query = "fields id, name, cover.image_id, aggregated_rating, rating, first_release_date, total_rating_count; 
                      where first_release_date >= {$ultimoMes} & first_release_date <= {$ahora} & version_parent = null; 
                      sort total_rating_count desc; 
                      limit {$limit}; 
                      offset {$offset};";

            $response = Http::withoutVerifying()
                ->withHeaders([
                    'Client-ID' => config('services.igdb.client_id'),
                    'Authorization' => 'Bearer ' . $accessToken,
                ])
                ->withBody($query, 'text/plain')
                ->post('https://api.igdb.com/v4/games');

            if ($response->failed()) {
                Log::error('IGDB API Error: ' . $response->body());
                return response()->json(['success' => false, 'message' => 'Error API Juegos'], $response->status());
            }

            $games = $response->json();
            $formattedGames = $this->formatIgdbGames($games);

            // Fusionamos con notas locales
            $resultsWithRatings = $this->mergeWithLocalRatings($formattedGames, 'videojuego');

            return response()->json([
                'success' => true,
                'data' => $resultsWithRatings,
                'total_results' => 1000, // IGDB no devuelve total en la misma query fácilmente, simulamos para paginación
            ], 200);

        } catch (\Exception $e) {
            Log::error('Exception in getPopularGames: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    /**
     * 🔍 BUSCAR VIDEOJUEGOS POR NOMBRE (IGDB)
     */
    public function searchGames(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);
        $queryText = $request->input('query');

        try {
            $accessToken = $this->getIgdbToken();
            if (!$accessToken) {
                return response()->json(['success' => false, 'message' => 'Error de autenticación con IGDB'], 500);
            }

            $page = (int) $request->query('page', 1);
            $limit = 20;
            $offset = ($page - 1) * $limit;

            // Query para IGDB: Búsqueda por nombre
            // Filtramos por version_parent = null para evitar DLCs/Ediciones sueltas si es posible
            $query = "fields id, name, cover.image_id, aggregated_rating, rating, first_release_date, total_rating_count; 
                      search \"{$queryText}\"; 
                      where version_parent = null;
                      limit {$limit}; 
                      offset {$offset};";

            $response = Http::withoutVerifying()
                ->withHeaders([
                    'Client-ID' => config('services.igdb.client_id'),
                    'Authorization' => 'Bearer ' . $accessToken,
                ])
                ->withBody($query, 'text/plain')
                ->post('https://api.igdb.com/v4/games');

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Error al buscar juegos'], $response->status());
            }

            $games = $response->json();
            $formattedGames = $this->formatIgdbGames($games);

            // Reutilizamos el normalizador de notas locales
            $resultsWithRatings = $this->mergeWithLocalRatings($formattedGames, 'videojuego');

            return response()->json([
                'success' => true,
                'data' => $resultsWithRatings,
                'total_results' => 100, // Simulado para búsqueda
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error en searchGames: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }
}