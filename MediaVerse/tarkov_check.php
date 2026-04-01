<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$clientId = 'lh4fuirf5g4ff7jki1md4ojmbxw35c';
$clientSecret = 'i23gtjid15pwe4nfegofcvj1gi0kwz';

$tokenRes = Illuminate\Support\Facades\Http::post('https://id.twitch.tv/oauth2/token', [
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'grant_type' => 'client_credentials'
]);
$token = $tokenRes->json()['access_token'];

$query = 'fields name, rating, aggregated_rating, first_release_date, total_rating_count; where name ~ "Escape from Tarkov"*;';
$res = Illuminate\Support\Facades\Http::withHeaders([
    'Client-ID' => $clientId,
    'Authorization' => 'Bearer ' . $token
])->withBody($query, 'text/plain')->post('https://api.igdb.com/v4/games');

echo json_encode($res->json(), JSON_PRETTY_PRINT);
