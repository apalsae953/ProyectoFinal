<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Medio;

class MedioController extends Controller
{
    // Mezclar resultados de API con datos locales
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

    // Token IGDB
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

    // Formatear datos de IGDB
    private function formatIgdbGames($games)
    {
        return array_map(function ($game) {
            return [
                'id' => $game['id'],
                'name' => $game['name'],
                'background_image' => isset($game['cover']['image_id'])
                    ? "https://images.igdb.com/igdb/image/upload/t_720p/{$game['cover']['image_id']}.jpg"
                    : 'https://via.placeholder.com/500x750?text=No+Image',
                'rating' => isset($game['rating']) ? round($game['rating'] / 10, 1) : null,
                'metacritic' => isset($game['aggregated_rating']) ? round($game['aggregated_rating'] / 10, 1) : null,
                'released' => isset($game['first_release_date']) ? date('Y-m-d', $game['first_release_date']) : null,
                'year' => isset($game['first_release_date']) ? date('Y', $game['first_release_date']) : 'N/A',
                'added' => $game['total_rating_count'] ?? 0,
                'category_name' => $this->getCategoryName($game['category'] ?? 0),
                'platforms' => isset($game['platforms']) ? implode(', ', array_slice(array_column($game['platforms'], 'name'), 0, 3)) : 'Varios',
            ];
        }, $games);
    }

    // Categorías IGDB
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

    public function getPopularMovies(Request $request)
    {
        try {
            $token = config('services.tmdb.key');
            $page = (int) $request->query('page', 1);
            $genre = $request->query('genre');
            $year = $request->query('year');
            $sortBy = $request->query('sort', 'popularity.desc');

            // SI EL USUARIO PIDE "MEJOR VALORADAS" -> PRIORIDAD MEDIAVERSE
            // Ranking local
            if ($sortBy === 'vote_average.desc') {
                $query = \App\Models\Medio::where('tipo', 'pelicula')
                    ->withAvg('valoraciones', 'puntuacion')
                    ->withCount('valoraciones')
                    ->having('valoraciones_count', '>', 0);

                if ($year)
                    $query->whereYear('created_at', $year); // Opcional: filtrar por año local

                $localResults = $query->orderBy('valoraciones_avg_puntuacion', 'desc')
                    ->paginate(20, ['*'], 'page', $page);

                if ($localResults->total() > 0) {
                    $formatted = collect($localResults->items())->map(function ($m) {
                        return [
                            'id' => (int) $m->api_id,
                            'title' => $m->titulo,
                            'poster_path' => $m->poster_path,
                            'vote_average' => (float) $m->valoraciones_avg_puntuacion,
                            'puntuacion_usuarios' => (float) $m->valoraciones_avg_puntuacion,
                            'year' => 'N/A' // Podríamos sacarlo si guardamos release_date
                        ];
                    });

                    return response()->json([
                        'success' => true,
                        'data' => $formatted,
                        'current_page' => $localResults->currentPage(),
                        'total_pages' => $localResults->lastPage(),
                        'mediaverse_rank' => true
                    ], 200);
                }
            }

            // FALLBACK / POPULARES: Usamos TMDB pero inyectamos nuestras notas
            $cacheKey = "popular_movies_{$page}_{$genre}_{$year}_{$sortBy}_vTrendingV1";
            $data = \Illuminate\Support\Facades\Cache::remember($cacheKey, 1800, function () use ($token, $page, $genre, $year, $sortBy) {
                // Trending para estrenos
                if (!$genre && !$year && $sortBy === 'popularity.desc') {
                    $resTrending = Http::withoutVerifying()->get('https://api.themoviedb.org/3/trending/movie/week', [
                        'api_key' => $token,
                        'language' => 'es-ES',
                        'page' => $page
                    ]);
                    if ($resTrending->ok())
                        return $resTrending->json();
                }

                $params = ['api_key' => $token, 'language' => 'es-ES', 'page' => $page, 'sort_by' => $sortBy];
                if ($genre)
                    $params['with_genres'] = $genre;
                if ($year)
                    $params['primary_release_year'] = $year;
                if (!$year && !$genre)
                    $params['primary_release_date.gte'] = now()->subMonths(3)->format('Y-m-d'); // 3 meses para mas frescura

                $response = Http::withoutVerifying()->get('https://api.themoviedb.org/3/discover/movie', $params);
                return $response->failed() ? null : $response->json();
            });

            if (!$data)
                return response()->json(['success' => false, 'message' => 'Error API Cine'], 500);
            $resultsWithRatings = $this->mergeWithLocalRatings($data['results']);
            foreach ($resultsWithRatings as &$item) {
                $item['year'] = isset($item['release_date']) ? substr($item['release_date'], 0, 4) : 'N/A';
            }
            return response()->json(['success' => true, 'data' => $resultsWithRatings, 'current_page' => $data['page'], 'total_pages' => min($data['total_pages'], 500)], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()], 500);
        }
    }

    public function getLatestMovies(Request $request)
    {
        try {
            $token = config('services.tmdb.key');
            $data = \Illuminate\Support\Facades\Cache::remember('latest_movies_spain_v1', 1800, function () use ($token) {
                $params = [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'region' => 'ES'
                ];
                // Usamos now_playing para ver qué hay en los cines de España AHORA
                $response = Http::withoutVerifying()->get('https://api.themoviedb.org/3/movie/now_playing', $params);
                return $response->failed() ? ['results' => []] : $response->json();
            });
            if (!$data || !isset($data['results']))
                return response()->json(['success' => true, 'data' => []], 200);
            $results = $this->mergeWithLocalRatings($data['results']);
            foreach ($results as &$item)
                $item['year'] = isset($item['release_date']) ? substr($item['release_date'], 0, 4) : 'N/A';
            return response()->json(['success' => true, 'data' => $results], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getPopularSeries(Request $request)
    {
        try {
            $token = config('services.tmdb.key');
            $page = (int) $request->query('page', 1);
            $genre = $request->query('genre');
            $year = $request->query('year');
            $sortBy = $request->query('sort', 'popularity.desc');

            // SI EL USUARIO PIDE "MEJOR VALORADAS" -> PRIORIDAD MEDIAVERSE
            if ($sortBy === 'vote_average.desc') {
                $query = \App\Models\Medio::where('tipo', 'serie')
                    ->withAvg('valoraciones', 'puntuacion')
                    ->withCount('valoraciones')
                    ->having('valoraciones_count', '>', 0);

                $localResults = $query->orderBy('valoraciones_avg_puntuacion', 'desc')
                    ->paginate(20, ['*'], 'page', $page);

                if ($localResults->total() > 0) {
                    $formatted = collect($localResults->items())->map(function ($m) {
                        return [
                            'id' => (int) $m->api_id,
                            'name' => $m->titulo, // TMDB usa 'name' para series
                            'title' => $m->titulo,
                            'poster_path' => $m->poster_path,
                            'vote_average' => (float) $m->valoraciones_avg_puntuacion,
                            'puntuacion_usuarios' => (float) $m->valoraciones_avg_puntuacion,
                            'year' => 'N/A'
                        ];
                    });

                    return response()->json([
                        'success' => true,
                        'data' => $formatted,
                        'current_page' => $localResults->currentPage(),
                        'total_pages' => $localResults->lastPage(),
                        'mediaverse_rank' => true
                    ], 200);
                }
            }

            // FALLBACK / POPULARES
            $cacheKey = "popular_series_{$page}_{$genre}_{$year}_{$sortBy}_vDoubleFetch20";
            $data = \Illuminate\Support\Facades\Cache::remember($cacheKey, 1800, function () use ($token, $page, $genre, $year, $sortBy) {
                $finalResults = [];
                $tmdbPage = ($page * 2) - 1; 

                $fetchResults = function ($targetPage) use ($token, $genre, $year, $sortBy) {
                    if (!$genre && !$year && $sortBy === 'popularity.desc') {
                        $url = "https://api.themoviedb.org/3/trending/tv/week";
                        $p = ['api_key' => $token, 'language' => 'es-ES', 'page' => $targetPage];
                    } else {
                        $url = "https://api.themoviedb.org/3/discover/tv";
                        $p = ['api_key' => $token, 'language' => 'es-ES', 'page' => $targetPage, 'sort_by' => $sortBy];
                        if ($genre)
                            $p['with_genres'] = $genre;
                        if ($year)
                            $p['first_air_date_year'] = $year;
                        else
                            $p['first_air_date.gte'] = now()->subMonths(6)->format('Y-m-d');
                    }
                    $res = Http::withoutVerifying()->get($url, $p);
                    return $res->ok() ? $res->json() : null;
                };

                // Combinamos dos páginas de TMDB para tener de donde elegir (40 elementos)
                $p1 = $fetchResults($tmdbPage);
                $p2 = $fetchResults($tmdbPage + 1);

                $pool = collect([]);
                if ($p1)
                    $pool = $pool->concat($p1['results']);
                if ($p2)
                    $pool = $pool->concat($p2['results']);

                if ($pool->isEmpty())
                    return null;

                // Aplicamos el filtro de NO ANIME JAPONÉS (G16 + Lang ja)
                $filtered = $pool->filter(function ($item) {
                    $isAnime = in_array(16, $item['genre_ids'] ?? []);
                    $isJapanese = ($item['original_language'] ?? '') === 'ja';
                    return !($isJapanese && $isAnime);
                })->values()->take(20)->all();

                return [
                    'results' => $filtered,
                    'page' => $page,
                    'total_pages' => $p1 ? min($p1['total_pages'] / 2, 500) : 1
                ];
            });

            if (!$data)
                return response()->json(['success' => false, 'message' => 'Error API Series'], 500);
            $results = $this->mergeWithLocalRatings($data['results'], 'serie');
            foreach ($results as &$item) {
                $item['title'] = $item['name'] ?? 'Sin título';
                $item['year'] = isset($item['first_air_date']) ? substr($item['first_air_date'], 0, 4) : 'N/A';
            }
            return response()->json(['success' => true, 'data' => $results, 'current_page' => $data['page'], 'total_pages' => min($data['total_pages'], 500)], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()], 500);
        }
    }

    public function getLatestSeries(Request $request)
    {
        try {
            $token = config('services.tmdb.key');
            $data = \Illuminate\Support\Facades\Cache::remember('latest_series_trending_day_v1', 1800, function () use ($token) {
                // Para noticias "novedosas" usamos el TRENDING del DÍA, no de la semana
                $response = Http::withoutVerifying()->get('https://api.themoviedb.org/3/trending/tv/day', [
                    'api_key' => $token,
                    'language' => 'es-ES'
                ]);
                return $response->failed() ? ['results' => []] : $response->json();
            });
            if (!$data || !isset($data['results']))
                return response()->json(['success' => true, 'data' => []], 200);
            $results = $this->mergeWithLocalRatings($data['results'], 'serie');
            foreach ($results as &$item) {
                $item['title'] = $item['name'] ?? 'Sin título';
                $item['year'] = isset($item['first_air_date']) ? substr($item['first_air_date'], 0, 4) : 'N/A';
            }
            return response()->json(['success' => true, 'data' => $results], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // Buscar series
    public function searchSeries(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);
        $query = $request->input('query');

        try {
            $token = config('services.tmdb.key');
            $page = (int) $request->query('page', 1);
            $limit = 20;

            // Peticiones concurrentes TMDB
            $pool = \Illuminate\Support\Facades\Http::pool(fn($pool) => [
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
                        usort($allResults, function ($a, $b) use ($query) {
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

            usort($resultsWithRatings, function ($a, $b) use ($query) {
                // 1. Prioridad máxima: Póster
                $posterA = !empty($a['poster_path']) ? 1 : 0;
                $posterB = !empty($b['poster_path']) ? 1 : 0;
                if ($posterA !== $posterB)
                    return $posterB <=> $posterA;

                // 2. Bonus por coincidencia de título
                $titleA = strtolower($a['name'] ?? '');
                $titleB = strtolower($b['name'] ?? '');
                $q = strtolower($query);

                $scoreA = 0;
                $scoreB = 0;

                if ($titleA === $q)
                    $scoreA += 1000;
                if (str_starts_with($titleA, $q))
                    $scoreA += 500;
                if (str_contains($titleA, $q))
                    $scoreA += 250;

                if ($titleB === $q)
                    $scoreB += 1000;
                if (str_starts_with($titleB, $q))
                    $scoreB += 500;
                if (str_contains($titleB, $q))
                    $scoreB += 250;

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

    // Buscar películas
    public function searchMovies(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);
        $query = $request->input('query');

        try {
            $token = config('services.tmdb.key');
            $page = (int) $request->query('page', 1);
            $limit = 20;

            // Escaneo de múltiples páginas para clásicos
            $pool = \Illuminate\Support\Facades\Http::pool(fn($pool) => [
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
                        usort($allResults, function ($a, $b) use ($query) {
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

            usort($resultsWithRatings, function ($a, $b) use ($query) {
                // 1. Prioridad máxima: Presencia de póster
                $posterA = !empty($a['poster_path']) ? 1 : 0;
                $posterB = !empty($b['poster_path']) ? 1 : 0;
                if ($posterA !== $posterB)
                    return $posterB <=> $posterA;

                // 2. Bonus de Relevancia por título (Coincidencia exacta o empieza por...)
                $titleA = strtolower($a['title'] ?? '');
                $titleB = strtolower($b['title'] ?? '');
                $q = strtolower($query);

                $scoreA = 0;
                $scoreB = 0;

                if ($titleA === $q)
                    $scoreA += 1000;
                if (str_starts_with($titleA, $q))
                    $scoreA += 500;
                if (str_contains($titleA, $q))
                    $scoreA += 250;

                if ($titleB === $q)
                    $scoreB += 1000;
                if (str_starts_with($titleB, $q))
                    $scoreB += 500;
                if (str_contains($titleB, $q))
                    $scoreB += 250;

                // Factor relevancia por votos
                $scoreA += ($a['vote_count'] ?? 0) / 2;
                $scoreB += ($b['vote_count'] ?? 0) / 2;

                if (abs($scoreA - $scoreB) > 1)
                    return $scoreB <=> $scoreA;

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

    public function getPopularGames(Request $request)
    {
        try {
            $accessToken = $this->getIgdbToken();
            if (!$accessToken)
                return response()->json(['success' => false, 'message' => 'Error IGDB Token'], 500);

            $page = (int) $request->query('page', 1);
            $genre = $request->query('genre');
            $year = $request->query('year');
            $platform = $request->query('platform');
            $sortBy = $request->query('sort', 'rating_count'); // Por defecto ordenamos por conteo de votos de la API
            $offset = ($page - 1) * 20;

            // Mejores valorados localmente
            if ($sortBy === 'rating') {
                $query = \App\Models\Medio::where('tipo', 'videojuego')
                    ->withAvg('valoraciones', 'puntuacion')
                    ->withCount('valoraciones')
                    ->having('valoraciones_count', '>', 0)
                    ->orderBy('valoraciones_avg_puntuacion', 'desc');

                $localResults = $query->paginate(20, ['*'], 'page', $page);

                if ($localResults->total() > 0) {
                    $formatted = collect($localResults->items())->map(function ($g) {
                        return [
                            'id' => (int) $g->api_id,
                            'name' => $g->titulo,
                            'background_image' => $g->poster_path,
                            'metacritic' => (float) $g->puntuacion_critica,
                            'puntuacion_usuarios' => (float) $g->valoraciones_avg_puntuacion,
                            'mediaverse_rank' => true
                        ];
                    });

                    return response()->json([
                        'success' => true,
                        'data' => $formatted,
                        'total_results' => $localResults->total()
                    ], 200);
                }
            }

            // FALLBACK A IGDB (ÓRDENES POR DEFECTO / POPULARIDAD 3 MESES)
            $cacheKey = "popular_games_v_last90d_v7_{$page}_{$genre}_{$year}_{$platform}_{$sortBy}";
            $cachedData = \Illuminate\Support\Facades\Cache::remember($cacheKey, 1800, function () use ($accessToken, $offset, $genre, $year, $platform, $sortBy) {
                $where = ["cover != null"];
                if ($genre)
                    $where[] = "genres = ({$genre})";
                if ($platform)
                    $where[] = "platforms = ({$platform})";
                if ($year) {
                    $start = strtotime("{$year}-01-01");
                    $end = strtotime("{$year}-12-31");
                    $where[] = "first_release_date >= {$start} & first_release_date <= {$end}";
                } else {
                    // Mas populares de los últimos 90 días (ajustado para ver solo lo más reciente)
                    $hace90Dias = now()->subDays(90)->timestamp;
                    $dondeEstamos = now()->timestamp;
                    $where[] = "first_release_date >= {$hace90Dias} & first_release_date <= {$dondeEstamos}";
                }

                // Popularidad por total_rating_count
                $orderClause = ($sortBy === 'rating') ? "rating desc" : "total_rating_count desc";
                $whereStr = implode(' & ', $where);
                $queryStr = "fields id, name, cover.image_id, aggregated_rating, rating, first_release_date, total_rating_count, category, platforms.name; 
                          where {$whereStr}; sort {$orderClause}; limit 20; offset {$offset};";

                $response = Http::withoutVerifying()->withHeaders(['Client-ID' => config('services.igdb.client_id'), 'Authorization' => 'Bearer ' . $accessToken])
                    ->withBody($queryStr, 'text/plain')->post('https://api.igdb.com/v4/games');
                return $response->failed() ? null : ['results' => $response->json(), 'total_results' => 500];
            });

            if (!$cachedData)
                return response()->json(['success' => false, 'message' => 'Error API Juegos'], 500);
            $formatted = $this->formatIgdbGames($cachedData['results']);
            $uniqueGames = collect($formatted)->unique('id')->values()->all();
            $resultsWithRatings = $this->mergeWithLocalRatings($uniqueGames, 'videojuego');

            return response()->json(['success' => true, 'data' => $resultsWithRatings, 'total_results' => $cachedData['total_results']], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()], 500);
        }
    }

    // Películas y Series de Anime
    public function getAnimeMixed(Request $request)
    {
        try {
            $token = config('services.tmdb.key');
            $page = (int) $request->query('page', 1);
            $year = $request->query('year');
            $sortBy = $request->query('sort', 'popularity.desc');

            // MEJOR VALORADOS -> PRIORIDAD MEDIAVERSE (Anime democrático)
            if ($sortBy === 'vote_average.desc') {
                $query = \App\Models\Medio::whereIn('tipo', ['pelicula', 'serie'])
                    ->withAvg('valoraciones', 'puntuacion')
                    ->withCount('valoraciones')
                    ->having('valoraciones_count', '>', 0);

                $localResults = $query->orderBy('valoraciones_avg_puntuacion', 'desc')->paginate(20, ['*'], 'page', $page);

                if ($localResults->total() > 0) {
                    $formatted = collect($localResults->items())->map(function ($m) {
                        return [
                            'id' => (int) $m->api_id,
                            'title' => $m->titulo,
                            'name' => $m->titulo,
                            'poster_path' => $m->poster_path,
                            'vote_average' => (float) $m->valoraciones_avg_puntuacion,
                            'puntuacion_usuarios' => (float) $m->valoraciones_avg_puntuacion,
                            'year' => 'N/A',
                            '_type_mixed' => $m->tipo === 'pelicula' ? 'movie' : 'tv'
                        ];
                    });
                    return response()->json(['success' => true, 'data' => $formatted, 'current_page' => $localResults->currentPage(), 'total_pages' => $localResults->lastPage()], 200);
                }
            }

            $cacheKey = "popular_anime_vMorning_{$page}_{$year}_{$sortBy}";
            $data = \Illuminate\Support\Facades\Cache::remember($cacheKey, 600, function () use ($token, $page, $year, $sortBy) {
                // Filtro común: Animación (16) + Idioma Japonés (ja) + Popularidad básica
                $commonParamsList = [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'page' => $page,
                    'sort_by' => $sortBy,
                    'with_genres' => '16', // Animación
                    'with_original_language' => 'ja', // Anime
                    'vote_count.gte' => 3, // Calidad mínima
                ];

                $movieParams = $commonParamsList;
                $tvParams = $commonParamsList;

                if ($year) {
                    $movieParams['primary_release_year'] = $year;
                    $tvParams['first_air_date_year'] = $year;
                }

                // Pedimos Pelis y Series por separado
                $moviePool = Http::withoutVerifying()->get('https://api.themoviedb.org/3/discover/movie', $movieParams);
                $tvPool = Http::withoutVerifying()->get('https://api.themoviedb.org/3/discover/tv', $tvParams);

                $results = [];
                if ($moviePool->ok()) {
                    foreach ($moviePool->json()['results'] as $m) {
                        $m['_type_mixed'] = 'movie'; // Flag para el frontend
                        $results[] = $m;
                    }
                }
                if ($tvPool->ok()) {
                    foreach ($tvPool->json()['results'] as $t) {
                        $t['_type_mixed'] = 'tv';
                        $t['title'] = $t['name'] ?? 'Sin título';
                        $results[] = $t;
                    }
                }

                // Ordenamos la mezcla por popularidad real
                usort($results, fn($a, $b) => ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));

                return [
                    'results' => array_slice($results, 0, 20), // Devolvemos 20 elementos mezclados
                    'total_pages' => 500 // TMDB limita discover a 500
                ];
            });

            if (!$data)
                return response()->json(['success' => false, 'message' => 'Error API Anime'], 500);

            // Fusionamos con notas locales (aquí llamamos a merge por cada tipo)
            $movieResults = collect($data['results'])->where('_type_mixed', 'movie')->toArray();
            $tvResults = collect($data['results'])->where('_type_mixed', 'tv')->toArray();

            $ratedMovies = $this->mergeWithLocalRatings($movieResults, 'pelicula');
            $ratedTv = $this->mergeWithLocalRatings($tvResults, 'serie');

            // Re-mezclamos tras el merge de ratings
            $final = array_merge($ratedMovies, $ratedTv);
            usort($final, fn($a, $b) => ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));

            foreach ($final as &$item) {
                $release = $item['release_date'] ?? $item['first_air_date'] ?? null;
                $item['year'] = $release ? substr($release, 0, 4) : 'N/A';
            }

            return response()->json([
                'success' => true,
                'data' => $final,
                'current_page' => $page,
                'total_pages' => $data['total_pages']
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * 🔍 BUSQUEDA DE ANIME: Mezcla películas y series animadas.
     */
    public function searchAnimeMixed(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);
        $query = $request->input('query');
        $page = (int) $request->query('page', 1);

        try {
            $token = config('services.tmdb.key');
            $commonParams = [
                'api_key' => $token,
                'language' => 'es-ES',
                'query' => $query,
                'page' => $page,
                'with_genres' => '16',
                // En búsqueda a veces el original_language restringe demasiado si los metadatos de TMDB son pobres, 
                // pero lo mantenemos para ser fieles al espíritu "Anime".
            ];

            $movieRes = Http::withoutVerifying()->get('https://api.themoviedb.org/3/search/movie', $commonParams);
            $tvRes = Http::withoutVerifying()->get('https://api.themoviedb.org/3/search/tv', $commonParams);

            $results = [];
            if ($movieRes->ok()) {
                foreach ($movieRes->json()['results'] as $m) {
                    // Filtro extra: asegurar que es Animación
                    if (in_array(16, $m['genre_ids'] ?? [])) {
                        $m['_type_mixed'] = 'movie';
                        $results[] = $m;
                    }
                }
            }
            if ($tvRes->ok()) {
                foreach ($tvRes->json()['results'] as $t) {
                    if (in_array(16, $t['genre_ids'] ?? [])) {
                        $t['_type_mixed'] = 'tv';
                        $t['title'] = $t['name'] ?? 'Sin título';
                        $results[] = $t;
                    }
                }
            }

            // Ordenamos por relevancia TMDB (popularidad aproximada)
            usort($results, fn($a, $b) => ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));

            $pagedResults = array_slice($results, 0, 20);

            // Fusión con notas locales
            $movies = collect($pagedResults)->where('_type_mixed', 'movie')->toArray();
            $tvs = collect($pagedResults)->where('_type_mixed', 'tv')->toArray();

            $ratedMovies = $this->mergeWithLocalRatings($movies, 'pelicula');
            $ratedTvs = $this->mergeWithLocalRatings($tvs, 'serie');

            $final = array_merge($ratedMovies, $ratedTvs);
            usort($final, fn($a, $b) => ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));

            foreach ($final as &$item) {
                $release = $item['release_date'] ?? $item['first_air_date'] ?? null;
                $item['year'] = $release ? substr($release, 0, 4) : 'N/A';
            }

            $totalPagesMovies = $movieRes->ok() ? $movieRes->json()['total_pages'] : 1;
            $totalPagesTv = $tvRes->ok() ? $tvRes->json()['total_pages'] : 1;
            $maxPages = max($totalPagesMovies, $totalPagesTv);

            return response()->json([
                'success' => true,
                'data' => $final,
                'current_page' => $page,
                'total_pages' => min($maxPages, 500)
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getLatestGames(Request $request)
    {
        try {
            $accessToken = $this->getIgdbToken();
            if (!$accessToken)
                return response()->json(['success' => false, 'message' => 'Error IGDB Token'], 500);
            $data = \Illuminate\Support\Facades\Cache::remember('latest_games_dashboard_v7', 1800, function () use ($accessToken) {
                $hace90Dias = now()->subDays(90)->timestamp;
                $manana = now()->addDay()->timestamp;
                // Equilibrio: Juegos de los últimos 3 meses pero ORDENADOS por popularidad real
                // Añadimos filtro de votos > 5 para asegurar que son 'Imprescindibles' de calidad
                $query = "fields id, name, cover.image_id, aggregated_rating, rating, first_release_date, total_rating_count, category, platforms.name; 
                          where first_release_date >= {$hace90Dias} & first_release_date <= {$manana} & cover != null & total_rating_count > 5; 
                          sort total_rating_count desc; limit 12;";
                $response = Http::withoutVerifying()->withHeaders(['Client-ID' => config('services.igdb.client_id'), 'Authorization' => 'Bearer ' . $accessToken])
                    ->withBody($query, 'text/plain')->post('https://api.igdb.com/v4/games');
                return $response->failed() ? [] : $response->json();
            });
            if (!$data)
                return response()->json(['success' => true, 'data' => []], 200);
            $formatted = $this->formatIgdbGames($data);
            return response()->json(['success' => true, 'data' => $formatted], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * BUSCAR VIDEOJUEGOS POR NOMBRE (IGDB)
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
            // Aumentamos el fetch masivamente para que al limpiar duplicados nos queden suficientes para varias páginas
            $fetchLimit = 500;

            // Escapamos posibles comillas en la consulta para evitar que rompa IGDB
            $safeQuery = str_replace('"', '\"', $queryText);

            $buildQuery = function ($q) use ($fetchLimit) {
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
                $words = explode(' ', str_replace(['-', '_', '.', ':'], ' ', $cleanedQuery));
                $validWords = array_filter($words, fn($w) => strlen($w) >= 2); // Bajamos a 2 para "ev" de "resident ev"

                $whereClauses = [];
                foreach ($validWords as $w) {
                    $whereClauses[] = "name ~ *\"{$w}\"*"; // Wildcard ~ *word* (IGDB flavor)
                }

                if (!empty($whereClauses)) {
                    $fallbackWhere = implode(' & ', $whereClauses);
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
                        usort($games, function ($a, $b) use ($queryText) {
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
            // Agrupamos por nombre y año para que el usuario no vea el mismo juego repetido en cada plataforma
            $uniqueGames = collect($formattedGames)
                ->groupBy(function ($item) {
                    return strtolower(trim($item['name'])) . '|' . ($item['year'] ?? 'N/A');
                })
                ->map(function ($group) {
                    return $group->sort(function ($a, $b) {
                        // Priorizar categorías principales
                        $prioA = in_array($a['category_name'], ['Juego Principal', 'Remake', 'Remaster']) ? 0 : 1;
                        $prioB = in_array($b['category_name'], ['Juego Principal', 'Remake', 'Remaster']) ? 0 : 1;
                        if ($prioA !== $prioB)
                            return $prioA <=> $prioB;
                        return $b['added'] <=> $a['added'];
                    })->first();
                })
                ->sortByDesc('added')
                ->values(); // Resetear llaves antes del slice

            // Calculamos el total de páginas reales basadas en lo que hemos encontrado
            $totalResults = $uniqueGames->count();

            // Paginamos el resultado ya limpio
            $finalPageResults = $uniqueGames
                ->slice(($page - 1) * $limit, $limit)
                ->values()
                ->all();

            // Reutilizamos el normalizador de notas locales
            $resultsWithRatings = $this->mergeWithLocalRatings($finalPageResults, 'videojuego');

            return response()->json([
                'success' => true,
                'data' => $resultsWithRatings,
                'total_results' => $totalResults,
                'current_page' => $page
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
                    'append_to_response' => 'credits,videos,watch/providers,external_ids',
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
            $allVideos = $spanVideos->map(function ($v) {
                $v['lang_priority'] = 1;
                return $v;
            })
                ->concat($engVideos->map(function ($v) {
                    $v['lang_priority'] = 0;
                    return $v;
                }));

            // Ordenamos por: Tipo (Trailer > Teaser), Oficialidad, y luego Idioma
            $bestTrailer = $allVideos->sort(function ($a, $b) {
                $typeWeights = ['Trailer' => 10, 'Teaser' => 5, 'Clip' => 1];
                $weightA = $typeWeights[$a['type'] ?? ''] ?? 0;
                $weightB = $typeWeights[$b['type'] ?? ''] ?? 0;

                if ($weightA !== $weightB)
                    return $weightB <=> $weightA;
                if ($a['official'] !== $b['official'])
                    return $b['official'] <=> $a['official'];
                return $b['lang_priority'] <=> $a['lang_priority'];
            })->first();

            $movie['trailer_url'] = $bestTrailer && ($bestTrailer['site'] ?? '') === 'YouTube'
                ? "https://www.youtube.com/embed/{$bestTrailer['key']}"
                : null;

            // Guardamos la ID de YouTube por si el usuario quiere abrirlo fuera
            $movie['youtube_id'] = $bestTrailer['key'] ?? null;

            // Link primario (Prioridad: Web oficial > IMDB > JustWatch)
            $imdbId = $movie['external_ids']['imdb_id'] ?? null;
            $movie['link_primario'] = $movie['homepage'] ?: ($imdbId ? "https://www.imdb.com/title/{$imdbId}" : null);

            // --- DÓNDE VER (JustWatch via TMDB) ---
            $providers = $movie['watch/providers']['results']['ES'] ?? null;
            $movie['donde_ver'] = [
                'streaming' => $providers['flatrate'] ?? [],
                'alquiler' => $providers['rent'] ?? [],
                'compra' => $providers['buy'] ?? [],
                'link' => $providers['link'] ?? null
            ];

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
                    'append_to_response' => 'aggregate_credits,videos,watch/providers,external_ids',
                ]);

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Serie no encontrada'], 404);
            }

            $tv = $response->json();

            // Año de lanzamiento
            $tv['year'] = isset($tv['first_air_date']) ? substr($tv['first_air_date'], 0, 4) : 'N/A';

            // Casting (Usamos aggregate_credits para ver a todos los que han pasado por la serie)
            $tv['cast'] = collect($tv['aggregate_credits']['cast'] ?? [])
                ->map(function ($actor) {
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

            $allVideos = $spanVideos->map(function ($v) {
                $v['lang_priority'] = 1;
                return $v;
            })
                ->concat($engVideos->map(function ($v) {
                    $v['lang_priority'] = 0;
                    return $v;
                }));

            $bestTrailer = $allVideos->sort(function ($a, $b) {
                $typeWeights = ['Trailer' => 10, 'Teaser' => 5, 'Clip' => 1];
                $weightA = $typeWeights[$a['type'] ?? ''] ?? 0;
                $weightB = $typeWeights[$b['type'] ?? ''] ?? 0;

                if ($weightA !== $weightB)
                    return $weightB <=> $weightA;
                if ($a['official'] !== $b['official'])
                    return $b['official'] <=> $a['official'];
                return $b['lang_priority'] <=> $a['lang_priority'];
            })->first();

            $tv['trailer_url'] = $bestTrailer && ($bestTrailer['site'] ?? '') === 'YouTube'
                ? "https://www.youtube.com/embed/{$bestTrailer['key']}"
                : null;

            $tv['youtube_id'] = $bestTrailer['key'] ?? null;

            // Link primario (Prioridad: Web oficial > IMDB > JustWatch)
            $imdbId = $tv['external_ids']['imdb_id'] ?? null;
            $tv['link_primario'] = $tv['homepage'] ?: ($imdbId ? "https://www.imdb.com/title/{$imdbId}" : null);

            // --- DÓNDE VER (JustWatch via TMDB) ---
            $providers = $tv['watch/providers']['results']['ES'] ?? null;
            $tv['donde_ver'] = [
                'streaming' => $providers['flatrate'] ?? [],
                'alquiler' => $providers['rent'] ?? [],
                'compra' => $providers['buy'] ?? [],
                'link' => $providers['link'] ?? null
            ];

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
                      websites.url, websites.category,
                      external_games.url, external_games.category; 
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

            // Formatear datos para el frontend con data_get para evitar errores si faltan campos
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
                'developer' => data_get(collect($game['involved_companies'] ?? [])->firstWhere('developer', true), 'company.name', 'Varios'),
                'trailer_url' => isset($game['videos'][0]) ? "https://www.youtube.com/embed/{$game['videos'][0]['video_id']}" : null,
                'metacritic' => isset($game['aggregated_rating']) ? round($game['aggregated_rating'] / 10, 1) : null,
                'tiendas' => collect($game['external_games'] ?? [])->map(function ($ext) {
                    $stores = [
                        1 => 'Steam',
                        5 => 'GOG',
                        10 => 'Epic Games Store',
                        11 => 'Itch.io',
                        14 => 'Discord',
                        20 => 'Amazon',
                        26 => 'PlayStation Store',
                        28 => 'Xbox Store',
                        29 => 'Nintendo Store',
                        54 => 'Google Play',
                        55 => 'App Store'
                    ];
                    $cat = data_get($ext, 'category', 0);
                    return [
                        'nombre' => $stores[$cat] ?? null,
                        'url' => data_get($ext, 'url', '#')
                    ];
                })->concat(collect($game['websites'] ?? [])->map(function ($web) {
                    $stores = [
                        13 => 'Steam',
                        10 => 'App Store',
                        11 => 'App Store',
                        12 => 'Google Play',
                        15 => 'Discord'
                    ];
                    $cat = data_get($web, 'category', 0);
                    $url = data_get($web, 'url', '');
                    $nombre = $stores[$cat] ?? null;

                    // Si no tiene nombre por categoría, buscamos por URL (Greedy)
                    if (!$nombre && $url) {
                        if (str_contains($url, 'steampowered.com'))
                            $nombre = 'Steam';
                        elseif (str_contains($url, 'epicgames.com'))
                            $nombre = 'Epic Games Store';
                        elseif (str_contains($url, 'gog.com'))
                            $nombre = 'GOG';
                        elseif (str_contains($url, 'microsoft.com/store'))
                            $nombre = 'Xbox Store';
                        elseif (str_contains($url, 'playstation.com'))
                            $nombre = 'PlayStation Store';
                        elseif (str_contains($url, 'nintendo.com'))
                            $nombre = 'Nintendo Store';
                    }

                    return [
                        'nombre' => $nombre,
                        'url' => $url ?: '#'
                    ];
                }))
                    ->filter(fn($s) => !empty($s['nombre']) && $s['url'] !== '#')
                    ->unique('nombre')
                    ->values()
                    ->toArray()
            ];

            Log::info("Tiendas encontradas para juego {$id}: " . count($gameDetail['tiendas']));

            // Link primario para juegos (El primero de las tiendas o sitio oficial)
            $gameDetail['link_primario'] = collect($gameDetail['tiendas'])->first()['url'] ?? collect($game['websites'] ?? [])->firstWhere('category', 1)['url'] ?? null;

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

            $person['filmography'] = $credits->map(function ($item) {
                return [
                    'id' => $item['id'],
                    'tipo' => $item['media_type'], // 'movie' o 'tv'
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

    /**
     * OBTENER ACTORES POPULARES
     */
    public function getPopularActors(Request $request)
    {
        try {
            $token = config('services.tmdb.key');
            $response = \Illuminate\Support\Facades\Http::withOptions(['verify' => false])
                ->get('https://api.themoviedb.org/3/person/popular', [
                    'api_key' => $token,
                    'language' => 'es-ES',
                    'page' => $request->query('page', 1)
                ]);

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Error API Actores'], $response->status());
            }

            $results = collect($response->json()['results'] ?? [])
                ->filter(function ($person) {
                    // Quitamos filtros de departamento ("todos los posibles")
                    return !empty($person['profile_path']);
                })
                ->sortByDesc('popularity')
                ->values()
                ->all();

            $limit = 20;
            $page = (int) $request->query('page', 1);

            $collection = collect($results);
            $totalResults = $collection->count();
            $paginated = $collection->slice(($page - 1) * $limit, $limit)->values();

            return response()->json([
                'success' => true,
                'data' => $paginated,
                'total_results' => $totalResults,
                'total_pages' => ceil($totalResults / $limit),
                'current_page' => $page
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    /**
     * BUSCAR ACTORES POR NOMBRE
     */
    public function searchActors(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);
        $query = $request->input('query');

        try {
            $token = config('services.tmdb.key');
            $page = (int) $request->query('page', 1);
            $limit = 20;

            // AMPLIACIÓN MASIVA: Escaneamos 5 páginas de búsqueda y 10 páginas de populares (unos 300 perfiles)
            $pool = \Illuminate\Support\Facades\Http::pool(fn($pool) => [
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/person', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 1]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/person', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 2]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/person', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 3]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/person', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 4]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/person', ['api_key' => $token, 'language' => 'es-ES', 'query' => $query, 'page' => 5]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 1]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 2]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 3]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 4]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 5]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 6]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 7]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 8]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 9]),
                $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/person/popular', ['api_key' => $token, 'language' => 'es-ES', 'page' => 10]),
            ]);

            $searchLiteral = [];
            $popularPool = [];

            foreach ($pool as $index => $res) {
                if ($res instanceof \Illuminate\Http\Client\Response && $res->ok()) {
                    $json = $res->json()['results'] ?? [];
                    if ($index < 5)
                        $searchLiteral = array_merge($searchLiteral, $json);
                    else
                        $popularPool = array_merge($popularPool, $json);
                }
            }

            // Filtrar los populares por el query (ej: gente en trending que se llame Chris)
            $queryLower = strtolower($query);
            $popularMatches = collect($popularPool)->filter(function ($p) use ($queryLower) {
                $nameLower = strtolower($p['name'] ?? '');
                return str_contains($nameLower, $queryLower);
            })->all();

            // Combinar ambos mundos
            $combined = collect(array_merge($searchLiteral, $popularMatches))->unique('id');

            // Fallback typo (si aún no hay resultados tras el barrido masivo)
            if ($combined->isEmpty() && strlen($query) >= 3) {
                $results = collect($popularPool)->filter(function ($p) use ($queryLower) {
                    return str_contains(strtolower($p['name']), substr($queryLower, 0, 3));
                });
            } else {
                $results = $combined;
            }

            $final = $results->filter(function ($p) {
                // Solo gente con foto para evitar perfiles basura
                return !empty($p['profile_path']);
            })->sortByDesc('popularity')->values()->all();

            $totalResults = count($final);

            return response()->json([
                'success' => true,
                'data' => array_slice($final, ($page - 1) * $limit, $limit),
                'total_results' => $totalResults,
                'total_pages' => ceil($totalResults / $limit),
                'current_page' => $page
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error de servidor'], 500);
        }
    }

    public function getDashboardSummary(Request $request)
    {
        // Cache por 1 hora (3600 seg) para máxima velocidad
        // Usamos una versión de caché distinta para forzar la actualización con los campos nuevos
        return \Illuminate\Support\Facades\Cache::remember('dashboard_full_data_v11', 3600, function () use ($request) {
            $data = [
                'movies' => [],
                'series' => [],
                'games'  => [],
                'threads' => []
            ];

            // 1. Películas
            try {
                $moviesRes = $this->getLatestMovies($request);
                $data['movies'] = $moviesRes->getData()->data ?? [];
            } catch (\Exception $e) { \Log::error("Dashboard Movies Error"); }

            // 2. Series
            try {
                $seriesRes = $this->getLatestSeries($request);
                $data['series'] = $seriesRes->getData()->data ?? [];
            } catch (\Exception $e) { \Log::error("Dashboard Series Error"); }

            // 3. Juegos
            try {
                $gamesRes = $this->getLatestGames($request);
                $data['games'] = $gamesRes->getData()->data ?? [];
            } catch (\Exception $e) { \Log::error("Dashboard Games Error"); }

            // 4. Hilos del foro (Con todos sus datos originales)
            try {
                $data['threads'] = \App\Models\Hilo::with(['user', 'medio'])
                    ->withCount('respuestas')
                    ->orderBy('created_at', 'desc')
                    ->take(5)
                    ->get();
            } catch (\Exception $e) { \Log::error("Dashboard Threads Error"); }

            return [
                'success' => true,
                'data' => $data
            ];
        });
    }
    }
}