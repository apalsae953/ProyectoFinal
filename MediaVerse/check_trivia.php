<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Cuestionario;

$cuestionarios = Cuestionario::withCount('preguntas')->get();

foreach ($cuestionarios as $c) {
    echo "ID: {$c->id} | Titulo: {$c->titulo} | Preguntas: {$c->preguntas_count}\n";
}
