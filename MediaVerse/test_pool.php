<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$token = config('services.tmdb.key');
$pool = Illuminate\Support\Facades\Http::pool(fn ($pool) => [
    $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => 'star wars', 'page' => 1]),
    $pool->withOptions(['verify' => false])->get('https://api.themoviedb.org/3/search/movie', ['api_key' => $token, 'language' => 'es-ES', 'query' => 'star wars', 'page' => 2]),
]);

$all = [];
foreach ($pool as $res) {
    if ($res instanceof \Illuminate\Http\Client\Response && $res->ok()) {
        $all = array_merge($all, $res->json()['results'] ?? []);
    }
}
echo "Total items: " . count($all) . "\n";
