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
                'year' => isset($game['first_release_date']) ? date('Y', $game['first_release_date']) : 'N/A',
                'added' => $game['total_rating_count'] ?? 0, 
                'category_name' => $this->getCategoryName($game['category'] ?? 0),
                'platforms' => isset($game['platforms']) ? implode(', ', array_slice(array_column($game['platforms'], 'name'), 0, 3)) : 'Varios',
            ];
        }, $games);
    }

    /**
     * Mapeo de categorías de IGDB a nombres legibles
     */
    private function getCategoryName($category)
    {
        $categories = [
            0 => 'Juego Principal',
            1 => 'DLC / Addon',
            2 => 'Expansión',
            3 => 'Bundle',
            4 => 'Expansión Independiente',
            5 => 'Mod',
            6 => 'Episodio',
            7 => 'Temporada',
            8 => 'Remake',
            9 => 'Remaster',
            10 => 'Edición Extendida',
            11 => 'Port',
            12 => 'Fork',
            13 => 'Pack',
            14 => 'Actualización',
        ];

        return $categories[$category] ?? 'Videojuego';
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

            foreach ($resultsWithRatings as &$item) {
                $item['year'] = isset($item['release_date']) ? substr($item['release_date'], 0, 4) : 'N/A';
            }

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
                $item['year'] = isset($item['first_air_date']) ? substr($item['first_air_date'], 0, 4) : 'N/A';
            }

            // Ordenamos por popularidad avanzada (pesando mucho el número de votos)
            usort($resultsWithRatings, function($a, $b) {
                // 1. Priorizar los que tienen póster
                $posterA = !empty($a['poster_path']) ? 1 : 0;
                $posterB = !empty($b['poster_path']) ? 1 : 0;
                if ($posterA !== $posterB) return $posterB <=> $posterA;

                // 2. Priorizar por popularidad real de TMDB
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
            $page = (int) $request->query('page', 1);
            $limit = 20;

            // Hacemos 5 peticiones concurrentes a TMDB para consolidar y ordenar globalmente
            $pool = \Illuminate\Support\Facades\Http::pool(fn ($pool) => [
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/tv', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 1]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/tv', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 2]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/tv', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 3]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/tv', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 4]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/tv', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 5]),
            ]);

            $allResults = [];
            $realTotalPages = 1;

            foreach ($pool as $res) {
                if ($res instanceof \Illuminate\Http\Client\Response && $res->ok()) {
                    $json = $res->json();
                    $allResults = array_merge($allResults, $json['results'] ?? []);
                    $realTotalPages = max($realTotalPages, $json['total_pages'] ?? 1);
                }
            }

            if (empty($allResults) && strlen($query) > 3) {
                // FALLBACK: Búsqueda flexible (Fuzzy Search)
                $words = explode(' ', str_replace(['-', '_', '.'], ' ', $query));
                $validWords = array_filter($words, fn($w) => strlen($w) >= 3);

                if (!empty($validWords)) {
                    $fallbackPool = \Illuminate\Support\Facades\Http::pool(function ($pool) use ($token, $validWords) {
                        $reqs = [];
                        foreach ($validWords as $w) {
                            $reqs[] = $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/tv', ['api_key' => $token, 'language' => 'es-ES', 'query' => $w, 'page' => 1]);
                        }
                        return $reqs;
                    });

                    foreach ($fallbackPool as $res) {
                        if ($res instanceof \Illuminate\Http\Client\Response && $res->ok()) {
                            $allResults = array_merge($allResults, $res->json()['results'] ?? []);
                        }
                    }

                    if (!empty($allResults)) {
                        $allResults = collect($allResults)->unique('id')->values()->all();
                        usort($allResults, function($a, $b) use ($query) {
                            $titleA = $a['name'] ?? '';
                            $titleB = $b['name'] ?? '';
                            similar_text(strtolower($titleA), strtolower($query), $percA);
                            similar_text(strtolower($titleB), strtolower($query), $percB);
                            $scoreA = $percA + (($a['vote_count'] ?? 0) > 500 ? 10 : 0);
                            $scoreB = $percB + (($b['vote_count'] ?? 0) > 500 ? 10 : 0);
                            return $scoreB <=> $scoreA;
                        });
                        $allResults = array_slice($allResults, 0, 40); // Limitar resultados 'adivinados'
                        $realTotalPages = 1; 
                    }
                }
            }

            if (empty($allResults)) {
                return response()->json(['success' => true, 'data' => [], 'current_page' => $page, 'total_pages' => 0], 200);
            }

            // Eliminamos posibles duplicados entre páginas devueltas por TMDB
            $uniqueResults = collect($allResults)->unique('id')->values()->all();

            // 1. Fusionamos con las notas locales indicando el tipo 'serie'
            $resultsWithRatings = $this->mergeWithLocalRatings($uniqueResults, 'serie');

            foreach ($resultsWithRatings as &$item) {
                $item['title'] = $item['name'] ?? 'Sin título';
                $item['year'] = isset($item['first_air_date']) ? substr($item['first_air_date'], 0, 4) : 'N/A';
            }

            usort($resultsWithRatings, function($a, $b) use ($query) {
                // 1. Prioridad máxima: Póster
                $posterA = !empty($a['poster_path']) ? 1 : 0;
                $posterB = !empty($b['poster_path']) ? 1 : 0;
                if ($posterA !== $posterB) return $posterB <=> $posterA;

                // 2. Bonus por coincidencia de título
                $titleA = strtolower($a['name'] ?? '');
                $titleB = strtolower($b['name'] ?? '');
                $q = strtolower($query);

                $scoreA = 0;
                $scoreB = 0;

                if ($titleA === $q) $scoreA += 1000;
                if (str_starts_with($titleA, $q)) $scoreA += 500;
                
                if ($titleB === $q) $scoreB += 1000;
                if (str_starts_with($titleB, $q)) $scoreB += 500;

                // 3. Relevancia histórica (votos)
                $scoreA += ($a['vote_count'] ?? 0) / 10;
                $scoreB += ($b['vote_count'] ?? 0) / 10;

                if (abs($scoreA - $scoreB) > 1) return $scoreB <=> $scoreA;

                // 4. Popularidad actual
                return $b['popularity'] <=> $a['popularity'];
            });

            // Paginar manualmente lista maestra
            $offset = ($page - 1) * $limit;
            $pagedData = array_slice($resultsWithRatings, $offset, $limit);
            $simulatedTotalPages = min(5, $realTotalPages);

            return response()->json([
                'success' => true,
                'data' => $pagedData,
                'current_page' => $page,
                'total_pages' => $simulatedTotalPages,
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
            $page = (int) $request->query('page', 1);
            $limit = 20;

            // Escaneamos 10 páginas de golpe de TMDB para asegurar que capturamos clásicos sepultados (ej: Star Wars Ep V)
            $pool = \Illuminate\Support\Facades\Http::pool(fn ($pool) => [
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 1]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 2]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 3]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 4]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 5]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 6]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 7]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 8]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 9]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 10]),
            ]);

            $allResults = [];
            $realTotalPages = 1;

            foreach ($pool as $res) {
                if ($res instanceof \Illuminate\Http\Client\Response && $res->ok()) {
                    $json = $res->json();
                    $allResults = array_merge($allResults, $json['results'] ?? []);
                    $realTotalPages = max($realTotalPages, $json['total_pages'] ?? 1);
                }
            }

            if (empty($allResults) && strlen($query) > 3) {
                // FALLBACK: Búsqueda flexible (Fuzzy Search)
                $words = explode(' ', str_replace(['-', '_', '.'], ' ', $query));
                $validWords = array_filter($words, fn($w) => strlen($w) >= 3);

                if (!empty($validWords)) {
                    $fallbackPool = \Illuminate\Support\Facades\Http::pool(function ($pool) use ($token, $validWords) {
                        $reqs = [];
                        foreach ($validWords as $w) {
                            $reqs[] = $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => $w, 'page' => 1]);
                        }
                        return $reqs;
                    });

                    foreach ($fallbackPool as $res) {
                        if ($res instanceof \Illuminate\Http\Client\Response && $res->ok()) {
                            $allResults = array_merge($allResults, $res->json()['results'] ?? []);
                        }
                    }

                    if (!empty($allResults)) {
                        $allResults = collect($allResults)->unique('id')->values()->all();
                        usort($allResults, function($a, $b) use ($query) {
                            $titleA = $a['title'] ?? '';
                            $titleB = $b['title'] ?? '';
                            similar_text(strtolower($titleA), strtolower($query), $percA);
                            similar_text(strtolower($titleB), strtolower($query), $percB);
                            $scoreA = $percA + (($a['vote_count'] ?? 0) > 500 ? 10 : 0);
                            $scoreB = $percB + (($b['vote_count'] ?? 0) > 500 ? 10 : 0);
                            return $scoreB <=> $scoreA;
                        });
                        $allResults = array_slice($allResults, 0, 40); // Limitar resultados 'adivinados'
                        $realTotalPages = 1;
                    }
                }
            }

            if (empty($allResults)) {
                return response()->json(['success' => true, 'data' => [], 'current_page' => $page, 'total_pages' => 0], 200);
            }

            $uniqueResults = collect($allResults)->unique('id')->values()->all();

            // 1. Fusionamos con notas locales
            $resultsWithRatings = $this->mergeWithLocalRatings($uniqueResults);

            // 2. Extraemos el año
            foreach ($resultsWithRatings as &$item) {
                $item['year'] = isset($item['release_date']) ? substr($item['release_date'], 0, 4) : 'N/A';
            }

            usort($resultsWithRatings, function($a, $b) use ($query) {
                // 1. Prioridad máxima: Presencia de póster
                $posterA = !empty($a['poster_path']) ? 1 : 0;
                $posterB = !empty($b['poster_path']) ? 1 : 0;
                if ($posterA !== $posterB) return $posterB <=> $posterA;

                // 2. Bonus de Relevancia por título (Coincidencia exacta o empieza por...)
                $titleA = strtolower($a['title'] ?? '');
                $titleB = strtolower($b['title'] ?? '');
                $q = strtolower($query);

                $scoreA = 0;
                $scoreB = 0;

                if ($titleA === $q) $scoreA += 1000;
                if (str_starts_with($titleA, $q)) $scoreA += 500;
                
                if ($titleB === $q) $scoreB += 1000;
                if (str_starts_with($titleB, $q)) $scoreB += 500;

                // 3. Añadimos el peso de los votos (Relevancia histórica)
                // Usamos logaritmo o división para que no eclipse totalmente la relevancia por nombre
                $scoreA += ($a['vote_count'] ?? 0) / 10;
                $scoreB += ($b['vote_count'] ?? 0) / 10;

                if (abs($scoreA - $scoreB) > 1) return $scoreB <=> $scoreA;

                // 4. Último criterio: Popularidad actual de la API
                return $b['popularity'] <=> $a['popularity'];
            });

            return response()->json([
                'success' => true,
                'data' => array_slice($resultsWithRatings, ($page - 1) * $limit, $limit),
                'current_page' => $page,
                'total_pages' => min(10, $realTotalPages),
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

            // Query para IGDB: Juegos populares lanzados recientemente
            $query = "fields id, name, cover.image_id, aggregated_rating, rating, first_release_date, total_rating_count, category, platforms.name; 
                      where first_release_date >= {$ultimoMes} & first_release_date <= {$ahora}; 
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

            // 🔥 FILTRO ANTIDUPLICADOS MEJORADO
            $uniqueGames = collect($formattedGames)
                ->groupBy(function ($item) {
                    return strtolower(trim($item['name'])) . '|' . ($item['year'] ?? 'N/A');
                })
                ->map(function ($group) {
                    // Si hay varios con el mismo nombre, priorizamos:
                    // 1. Juego Principal, Remake o Remaster
                    // 2. El que tenga más puntuaciones (popularidad)
                    return $group->sort(function ($a, $b) {
                        $prioA = in_array($a['category_name'], ['Juego Principal', 'Remake', 'Remaster']) ? 0 : 1;
                        $prioB = in_array($b['category_name'], ['Juego Principal', 'Remake', 'Remaster']) ? 0 : 1;
                        
                        if ($prioA !== $prioB) return $prioA <=> $prioB;
                        return $b['added'] <=> $a['added'];
                    })->first();
                })
                ->values()
                ->all();

            // Fusionamos con notas locales
            $resultsWithRatings = $this->mergeWithLocalRatings($uniqueGames, 'videojuego');

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
            // Aumentamos el fetch a 100 para que al limpiar duplicados nos queden suficientes
            $fetchLimit = 100; 

            // Escapamos posibles comillas en la consulta para evitar que rompa IGDB
            $safeQuery = str_replace('"', '\"', $queryText);

            $buildQuery = function($q) use ($fetchLimit) {
                return "fields id, name, cover.image_id, aggregated_rating, rating, first_release_date, total_rating_count, category, platforms.name; 
                        search \"{$q}\"; 
                        limit {$fetchLimit};";
            };

            $response = Http::withoutVerifying()
                ->withHeaders([
                    'Client-ID' => config('services.igdb.client_id'),
                    'Authorization' => 'Bearer ' . $accessToken,
                ])
                ->withBody($buildQuery($safeQuery), 'text/plain')
                ->post('https://api.igdb.com/v4/games');

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Error al buscar juegos'], $response->status());
            }

            $games = $response->json();

            // 🔥 FALLBACK ALGORITMO MÁXIMA FLEXIBILIDAD (Fuzzy Search Typos)
            // Cubre remakes, remasters y errores tipográficos (ej: "resient evil" en vez de "resident")
            if (empty($games) && strlen($safeQuery) > 3) {
                // 1. Quitar 'remake', 'remastered' como intentamos antes
                $cleanedQuery = trim(preg_replace('/(remake|remaster|remastered)/i', '', $safeQuery));
                
                // 2. Extraer palabras para buscar coincidencias parciales por si hay typos
                $words = explode(' ', str_replace(['-', '_', '.'], ' ', $cleanedQuery));
                $validWords = array_filter($words, fn($w) => strlen($w) >= 3);
                
                $whereClauses = [];
                if (!empty($cleanedQuery)) {
                    $whereClauses[] = "search \"{$cleanedQuery}\""; 
                }
                foreach ($validWords as $w) {
                    $whereClauses[] = "name ~ *\"{$w}\"*";
                }

                if (!empty($whereClauses)) {
                    $fallbackWhere = implode(' | ', $whereClauses);
                    $fallbackResponse = Http::withoutVerifying()
                        ->withHeaders([
                            'Client-ID' => config('services.igdb.client_id'),
                            'Authorization' => 'Bearer ' . $accessToken,
                        ])
                        ->withBody("fields id, name, cover.image_id, aggregated_rating, rating, first_release_date, total_rating_count, category, platforms.name; where {$fallbackWhere}; limit {$fetchLimit};", 'text/plain')
                        ->post('https://api.igdb.com/v4/games');
                    
                    if ($fallbackResponse->ok()) {
                        $games = $fallbackResponse->json();
                        
                        // Si hemos usado el modo flexible, re-ordenamos en el servidor simulando semejanza de texto
                        usort($games, function($a, $b) use ($queryText) {
                            $titleA = $a['name'] ?? '';
                            $titleB = $b['name'] ?? '';
                            similar_text(strtolower($titleA), strtolower($queryText), $percA);
                            similar_text(strtolower($titleB), strtolower($queryText), $percB);
                            $scoreA = $percA + (min($a['total_rating_count'] ?? 0, 1000) / 1000 * 30);
                            $scoreB = $percB + (min($b['total_rating_count'] ?? 0, 1000) / 1000 * 30);
                            return $scoreB <=> $scoreA;
                        });
                        $games = array_slice($games, 0, 40);
                    }
                }
            }

            $formattedGames = $this->formatIgdbGames($games);

            // 🔥 FILTRO ANTIDUPLICADOS + ORDEN GLOBAL POR POPULARIDAD
            $uniqueGames = collect($formattedGames)
                ->groupBy(function ($item) {
                    return strtolower(trim($item['name'])) . '|' . ($item['year'] ?? 'N/A');
                })
                ->map(function ($group) {
                    return $group->sort(function ($a, $b) {
                        // Priorizar categorías principales
                        $prioA = in_array($a['category_name'], ['Juego Principal', 'Remake', 'Remaster']) ? 0 : 1;
                        $prioB = in_array($b['category_name'], ['Juego Principal', 'Remake', 'Remaster']) ? 0 : 1;
                        if ($prioA !== $prioB) return $prioA <=> $prioB;
                        return $b['added'] <=> $a['added'];
                    })->first();
                })
                ->sortByDesc('added') // Ordenamos por votos/popularidad
                ->slice(($page - 1) * $limit, $limit) // Paginar manualmente tras limpiar
                ->values()
                ->all();

            // Reutilizamos el normalizador de notas locales
            $resultsWithRatings = $this->mergeWithLocalRatings($uniqueGames, 'videojuego');

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

    /**
     * Obtener el detalle de una película de TMDB
     */
    public function getMovieDetail($id)
    {
        try {
            $token = config('services.tmdb.key');
            $response = Http::withoutVerifying()
                ->get("https://api.themoviedb.org/3/movie/{$id}", [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'append_to_response' => 'credits,videos',
                ]);

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Pelicula no encontrada'], 404);
            }

            $movie = $response->json();
            
            // Año de lanzamiento
            $movie['year'] = isset($movie['release_date']) ? substr($movie['release_date'], 0, 4) : 'N/A';
            
            // Casting (limitado a los 10 más importantes para un diseño limpio)
            $movie['cast'] = array_slice($movie['credits']['cast'] ?? [], 0, 10);
            
            // Director
            $movie['director'] = collect($movie['credits']['crew'] ?? [])->firstWhere('job', 'Director')['name'] ?? 'Desconocido';

            // --- LÓGICA DE TRAILERS MEJORADA ---
            // Buscamos vídeos en español
            $spanVideos = collect($movie['videos']['results'] ?? []);
            
            // Buscamos vídeos en inglés (siempre, para tener backups)
            $engVideosResponse = Http::withoutVerifying()->get("https://api.themoviedb.org/3/movie/{$id}/videos", [
                'api_key' => $token,
            ]);
            $engVideos = collect($engVideosResponse->json()['results'] ?? []);

            // Combinamos dándole una ligera prioridad a los resultados en español si son del mismo tipo
            $allVideos = $spanVideos->map(function($v) { $v['lang_priority'] = 1; return $v; })
                ->concat($engVideos->map(function($v) { $v['lang_priority'] = 0; return $v; }));

            // Ordenamos por: Tipo (Trailer > Teaser), Oficialidad, y luego Idioma
            $bestTrailer = $allVideos->sort(function($a, $b) {
                $typeWeights = ['Trailer' => 10, 'Teaser' => 5, 'Clip' => 1];
                $weightA = $typeWeights[$a['type'] ?? ''] ?? 0;
                $weightB = $typeWeights[$b['type'] ?? ''] ?? 0;
                
                if ($weightA !== $weightB) return $weightB <=> $weightA;
                if ($a['official'] !== $b['official']) return $b['official'] <=> $a['official'];
                return $b['lang_priority'] <=> $a['lang_priority'];
            })->first();

            $movie['trailer_url'] = $bestTrailer && ($bestTrailer['site'] ?? '') === 'YouTube' 
                ? "https://www.youtube.com/embed/{$bestTrailer['key']}" 
                : null;
            
            // Guardamos la ID de YouTube por si el usuario quiere abrirlo fuera
            $movie['youtube_id'] = $bestTrailer['key'] ?? null;

            // --- NOTA MEDIA LOCAL (MediaVerse) ---
            $medioLocal = Medio::with('valoraciones')
                ->where('api_id', $id)
                ->where('tipo', 'pelicula')
                ->first();
            
            $movie['puntuacion_usuarios'] = ($medioLocal && $medioLocal->valoraciones->count() > 0)
                ? number_format($medioLocal->valoraciones->avg('puntuacion'), 1)
                : null;

            return response()->json(['success' => true, 'data' => $movie], 200);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    /**
     * Obtener el detalle de una serie de TMDB
     */
    public function getTvDetail($id)
    {
        try {
            $token = config('services.tmdb.key');
            $response = Http::withoutVerifying()
                ->get("https://api.themoviedb.org/3/tv/{$id}", [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'append_to_response' => 'aggregate_credits,videos',
                ]);

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Serie no encontrada'], 404);
            }

            $tv = $response->json();
            
            // Año de lanzamiento
            $tv['year'] = isset($tv['first_air_date']) ? substr($tv['first_air_date'], 0, 4) : 'N/A';
            
            // Casting (Usamos aggregate_credits para ver a todos los que han pasado por la serie)
            $tv['cast'] = collect($tv['aggregate_credits']['cast'] ?? [])
                ->map(function($actor) {
                    // Mapeamos los campos para que el frontend no rompa
                    return [
                        'id' => $actor['id'],
                        'name' => $actor['name'],
                        'profile_path' => $actor['profile_path'],
                        'character' => $actor['roles'][0]['character'] ?? 'Desconocido',
                    ];
                })
                ->take(10)
                ->values()
                ->toArray();
            
            // Creador
            $tv['director'] = isset($tv['created_by'][0]) ? $tv['created_by'][0]['name'] : 'Varios';

            // --- LÓGICA DE TRAILERS MEJORADA ---
            $spanVideos = collect($tv['videos']['results'] ?? []);
            
            $engVideosResponse = Http::withoutVerifying()->get("https://api.themoviedb.org/3/tv/{$id}/videos", [
                'api_key' => $token,
            ]);
            $engVideos = collect($engVideosResponse->json()['results'] ?? []);

            $allVideos = $spanVideos->map(function($v) { $v['lang_priority'] = 1; return $v; })
                ->concat($engVideos->map(function($v) { $v['lang_priority'] = 0; return $v; }));

            $bestTrailer = $allVideos->sort(function($a, $b) {
                $typeWeights = ['Trailer' => 10, 'Teaser' => 5, 'Clip' => 1];
                $weightA = $typeWeights[$a['type'] ?? ''] ?? 0;
                $weightB = $typeWeights[$b['type'] ?? ''] ?? 0;
                
                if ($weightA !== $weightB) return $weightB <=> $weightA;
                if ($a['official'] !== $b['official']) return $b['official'] <=> $a['official'];
                return $b['lang_priority'] <=> $a['lang_priority'];
            })->first();

            $tv['trailer_url'] = $bestTrailer && ($bestTrailer['site'] ?? '') === 'YouTube' 
                ? "https://www.youtube.com/embed/{$bestTrailer['key']}" 
                : null;
            
            $tv['youtube_id'] = $bestTrailer['key'] ?? null;

            // --- NOTA MEDIA LOCAL (MediaVerse) ---
            $medioLocal = Medio::with('valoraciones')
                ->where('api_id', $id)
                ->where('tipo', 'serie')
                ->first();
            
            $tv['puntuacion_usuarios'] = ($medioLocal && $medioLocal->valoraciones->count() > 0)
                ? number_format($medioLocal->valoraciones->avg('puntuacion'), 1)
                : null;

            return response()->json(['success' => true, 'data' => $tv], 200);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    /**
     * Obtener el detalle de un videojuego de IGDB
     */
    public function getGameDetail($id)
    {
        try {
            $accessToken = $this->getIgdbToken();
            if (!$accessToken) {
                return response()->json(['success' => false, 'message' => 'Error de autenticación con IGDB'], 500);
            }

            $query = "fields id, name, summary, storyline, cover.image_id, screenshots.image_id, 
                      first_release_date, rating, aggregated_rating, total_rating_count, 
                      genres.name, platforms.name, videos.video_id, 
                      involved_companies.company.name, involved_companies.developer,
                      websites.url, websites.category; 
                      where id = {$id};";

            $response = Http::withoutVerifying()
                ->withHeaders([
                    'Client-ID' => config('services.igdb.client_id'),
                    'Authorization' => 'Bearer ' . $accessToken,
                ])
                ->withBody($query, 'text/plain')
                ->post('https://api.igdb.com/v4/games');

            if ($response->failed() || count($response->json()) == 0) {
                return response()->json(['success' => false, 'message' => 'Juego no encontrado'], 404);
            }

            $game = $response->json()[0];
            
            // Formatear datos para el frontend
            $gameDetail = [
                'id' => $game['id'],
                'title' => $game['name'],
                'overview' => $game['summary'] ?? $game['storyline'] ?? 'Sin descripción.',
                'poster_path' => isset($game['cover']) ? "https://images.igdb.com/igdb/image/upload/t_720p/{$game['cover']['image_id']}.jpg" : null,
                'backdrop_path' => isset($game['screenshots'][0]) ? "https://images.igdb.com/igdb/image/upload/t_1080p/{$game['screenshots'][0]['image_id']}.jpg" : null,
                'year' => isset($game['first_release_date']) ? date('Y', $game['first_release_date']) : 'N/A',
                'release_date' => isset($game['first_release_date']) ? date('d/m/Y', $game['first_release_date']) : 'Desconocida',
                'vote_average' => isset($game['rating']) ? round($game['rating'] / 10, 1) : null,
                'genres' => $game['genres'] ?? [],
                'platforms' => $game['platforms'] ?? [],
                'developer' => collect($game['involved_companies'] ?? [])->firstWhere('developer', true)['company']['name'] ?? 'Varios',
                'trailer_url' => isset($game['videos'][0]) ? "https://www.youtube.com/embed/{$game['videos'][0]['video_id']}" : null,
                'metacritic' => isset($game['aggregated_rating']) ? round($game['aggregated_rating']) : null,
            ];

            // --- NOTA MEDIA LOCAL (MediaVerse) ---
            $medioLocal = Medio::with('valoraciones')
                ->where('api_id', $id)
                ->where('tipo', 'videojuego')
                ->first();
            
            $gameDetail['puntuacion_usuarios'] = ($medioLocal && $medioLocal->valoraciones->count() > 0)
                ? number_format($medioLocal->valoraciones->avg('puntuacion'), 1)
                : null;

            return response()->json(['success' => true, 'data' => $gameDetail], 200);

        } catch (\Exception $e) {
            Log::error('Error getGameDetail: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    /**
     * OBTENER DETALLES DE UN ACTOR Y SU FILMOGRAFÍA
     */
    public function getActorDetail($id)
    {
        try {
            $token = config('services.tmdb.key');
            
            // 1. Info básica del actor
            $personResponse = \Illuminate\Support\Facades\Http::withOptions(['verify' => false])
                ->get("https://api.themoviedb.org/3/person/{$id}", [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'append_to_response' => 'combined_credits'
                ]);

            if ($personResponse->failed()) {
                return response()->json(['success' => false, 'message' => 'Actor no encontrado'], 404);
            }

            $person = $personResponse->json();

            // 2. Formatear filmografía (ordenar por número de votos para ver las más importantes)
            $credits = collect($person['combined_credits']['cast'] ?? [])
                ->unique('id')
                ->sortByDesc('vote_count')
                ->values()
                ->take(50); // Top 50 producciones

            $person['filmography'] = $credits->map(function($item) {
                return [
                    'id' => $item['id'],
                    'tipo' => $item['media_type'], // 'movie' or 'tv'
                    'title' => $item['title'] ?? $item['name'] ?? 'Sin título',
                    'poster_path' => $item['poster_path'] ?? null,
                    'year' => isset($item['release_date']) ? substr($item['release_date'], 0, 4) : (isset($item['first_air_date']) ? substr($item['first_air_date'], 0, 4) : 'N/A'),
                    'role' => $item['character'] ?? 'Varios',
                    'popularity' => $item['popularity'] ?? 0
                ];
            });

            unset($person['combined_credits']);

            return response()->json(['success' => true, 'data' => $person], 200);

        } catch (\Exception $e) {
            Log::error('Error getActorDetail: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }
}