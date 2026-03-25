<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$tokenRes = \Illuminate\Support\Facades\Http::withoutVerifying()->post('https://id.twitch.tv/oauth2/token', [
    'client_id' => config('services.igdb.client_id'),
    'client_secret' => config('services.igdb.client_secret'),
    'grant_type' => 'client_credentials'
]);
$token = $tokenRes->json()['access_token'];

$query = "resient evil";
$words = explode(' ', $query);
$whereClauses = [];
foreach ($words as $word) {
    if (strlen($word) >= 3) {
        $whereClauses[] = "name ~ *\"{$word}\"*";
    }
}
$whereStr = implode(' | ', $whereClauses);

$res = \Illuminate\Support\Facades\Http::withoutVerifying()->withHeaders([
    'Client-ID' => config('services.igdb.client_id'),
    'Authorization' => 'Bearer ' . $token,
])->withBody("fields id, name, total_rating_count; where {$whereStr}; sort total_rating_count desc; limit 100;", 'text/plain')
->post('https://api.igdb.com/v4/games');

$games = $res->json();
$bestMatch = null;

// Sort by similarity to original query
usort($games, function($a, $b) use ($query) {
    similar_text(strtolower($a['name']), strtolower($query), $percA);
    similar_text(strtolower($b['name']), strtolower($query), $percB);
    
    // Add weight to total rating count
    $scoreA = $percA + (min($a['total_rating_count'] ?? 0, 1000) / 1000 * 20);
    $scoreB = $percB + (min($b['total_rating_count'] ?? 0, 1000) / 1000 * 20);

    return $scoreB <=> $scoreA;
});

print_r(collect($games)->map(fn($item) => $item['name'])->take(10)->toArray());
