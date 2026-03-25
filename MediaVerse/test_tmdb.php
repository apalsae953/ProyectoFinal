<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$req = Illuminate\Http\Request::create('/api/search/movies', 'GET', ['query' => 'avrngers']);
$res = app(App\Http\Controllers\MedioController::class)->searchMovies($req);
$data = $res->getData(true);

print_r(collect($data['data'] ?? [])->map(fn($i) => $i['title'] . ' (' . $i['year'] . ')')->take(5)->toArray());
