<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Http;

$clientId = config('services.igdb.client_id');
$clientSecret = config('services.igdb.client_secret');

$tokenResponse = Http::withoutVerifying()->post("https://id.twitch.tv/oauth2/token", [
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'grant_type' => 'client_credentials',
]);

if ($tokenResponse->failed()) {
    echo "TOKEN FAIL: " . $tokenResponse->body() . "\n";
    exit;
}

$accessToken = $tokenResponse->json()['access_token'];

$hace120Dias = now()->subDays(120)->timestamp;
$manana = now()->addDay()->timestamp;

// PRUEBA 1: Sin categorías, con cover y fecha
$query = "fields id, name, cover.image_id, total_rating_count, first_release_date; 
          where first_release_date >= {$hace120Dias} & first_release_date <= {$manana} & cover != null; 
          sort total_rating_count desc; limit 10;";

$response = Http::withoutVerifying()->withHeaders([
    'Client-ID' => $clientId,
    'Authorization' => 'Bearer ' . $accessToken,
])->withBody($query, 'text/plain')->post('https://api.igdb.com/v4/games');

echo "TEST 1 (No Category): " . $response->status() . "\n";
print_r($response->json());

// PRUEBA 2: Con categorías 0, 8, 9
$query2 = "fields id, name, cover.image_id, total_rating_count, first_release_date, category; 
          where first_release_date >= {$hace120Dias} & first_release_date <= {$manana} & cover != null & category = (0, 8, 9); 
          sort total_rating_count desc; limit 10;";
$response2 = Http::withoutVerifying()->withHeaders([
    'Client-ID' => $clientId,
    'Authorization' => 'Bearer ' . $accessToken,
])->withBody($query2, 'text/plain')->post('https://api.igdb.com/v4/games');

echo "TEST 2 (With Category 0,8,9): " . $response2->status() . "\n";
print_r($response2->json());


echo "STATUS: " . $response->status() . "\n";
print_r($response->json());
