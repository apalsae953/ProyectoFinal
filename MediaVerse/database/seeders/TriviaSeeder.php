<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Cuestionario;
use App\Models\Pregunta;
use App\Models\Respuesta;
use Illuminate\Support\Facades\DB;

class TriviaSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function() {
            // 0. Limpieza total rápida
            DB::statement('TRUNCATE TABLE respuestas, preguntas, cuestionarios RESTART IDENTITY CASCADE');

            // 1. Cuestionarios
            $cCine = Cuestionario::create([
                'titulo' => 'Películas y Series',
                'descripcion' => 'Demuestra tus conocimientos sobre cine y series.',
                'categoria' => 'peliculas_y_series',
                'dificultad' => 'medio'
            ]);

            $cJuegos = Cuestionario::create([
                'titulo' => 'Cultura de Videojuegos',
                'descripcion' => '¿Eres un verdadero gamer?',
                'categoria' => 'videojuegos',
                'dificultad' => 'medio'
            ]);

            $cMixto = Cuestionario::create([
                'titulo' => 'Modo Mixto',
                'descripcion' => 'Todo mezclado.',
                'categoria' => 'mixto',
                'dificultad' => 'dificil'
            ]);

            // 2. Datos Cine (Simplificados para evitar fallos de memoria/timeout)
            $datosCine = [
                ['pregunta' => "¿Quién dirigió 'Origen'?", 'respuestas' => ["Christopher Nolan", "Spielberg", "Tarantino", "Scorsese"], 'correcta' => 0],
                ['pregunta' => "¿Quién interpretó a Iron Man?", 'respuestas' => ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], 'correcta' => 1],
                ['pregunta' => "¿Quién dirigió 'El Padrino'?", 'respuestas' => ["Francis Ford Coppola", "Martin Scorsese", "Stanley Kubrick", "Alfred Hitchcock"], 'correcta' => 0],
                ['pregunta' => "¿En 'Matrix', qué pastilla elige Neo?", 'respuestas' => ["Azul", "Verde", "Roja", "Amarilla"], 'correcta' => 2],
                ['pregunta' => "¿Quién es el padre de Luke Skywalker?", 'respuestas' => ["Darth Vader", "Obi-Wan Kenobi", "Yoda", "Han Solo"], 'correcta' => 0],
                ['pregunta' => "¿Qué película de 1994 cuenta la historia de un juguete vaquero?", 'respuestas' => ["Toy Story", "Small Soldiers", "Lego Movie", "Cars"], 'correcta' => 0],
                ['pregunta' => "¿Quién dirigió 'Psicosis'?", 'respuestas' => ["Alfred Hitchcock", "Orson Welles", "Fritz Lang", "Billy Wilder"], 'correcta' => 0],
                ['pregunta' => "¿Cómo se llama el león protagonista de 'El Rey León'?", 'respuestas' => ["Mufasa", "Scar", "Simba", "Nala"], 'correcta' => 2],
                ['pregunta' => "¿Qué actor dio vida al Joker en 'El caballero oscuro'?", 'respuestas' => ["Heath Ledger", "Joaquin Phoenix", "Jack Nicholson", "Jared Leto"], 'correcta' => 0],
                ['pregunta' => "¿Quién dirigió 'Pulp Fiction'?", 'respuestas' => ["Quentin Tarantino", "Guy Ritchie", "Robert Rodriguez", "Coen Brothers"], 'correcta' => 0],
            ];

            // 3. Datos Juegos
            $datosJuegos = [
                ['pregunta' => "¿Cuál es el nombre del protagonista de 'The Legend of Zelda'?", 'respuestas' => ["Zelda", "Link", "Ganon", "Epona"], 'correcta' => 1],
                ['pregunta' => "¿Qué compañía desarrolló 'Fortnite'?", 'respuestas' => ["Activision", "EA", "Epic Games", "Ubisoft"], 'correcta' => 2],
                ['pregunta' => "¿Quién es el fontanero hermano de Mario?", 'respuestas' => ["Wario", "Luigi", "Waluigi", "Toad"], 'correcta' => 1],
                ['pregunta' => "¿Qué estudio desarrolló 'The Last of Us'?", 'respuestas' => ["Santa Monica", "Naughty Dog", "Insomniac", "Guerrilla"], 'correcta' => 1],
                ['pregunta' => "¿Cuál es el videojuego más vendido de la historia?", 'respuestas' => ["GTA V", "Minecraft", "Tetris", "Wii Sports"], 'correcta' => 1],
                ['pregunta' => "¿En qué juego aparece la ciudad de 'Rapture'?", 'respuestas' => ["BioShock", "Fallout", "Dishonored", "Borderlands"], 'correcta' => 0],
                ['pregunta' => "¿Quién es el protagonista de 'God of War'?", 'respuestas' => ["Kratos", "Zeus", "Ares", "Hades"], 'correcta' => 0],
                ['pregunta' => "¿Qué juego popularizó el género Battle Royale?", 'respuestas' => ["Fortnite", "PUBG", "Apex", "Warzone"], 'correcta' => 1],
                ['pregunta' => "¿Cuál es la mascota de Sega?", 'respuestas' => ["Mario", "Sonic", "Crash", "Spyro"], 'correcta' => 1],
                ['pregunta' => "¿Cómo se llama el Jefe Maestro en Halo?", 'respuestas' => ["John-117", "Cortana", "Noble 6", "Johnson"], 'correcta' => 0],
            ];

            // Función de inserción rápida
            $fastInsert = function($cId, $datos) {
                foreach ($datos as $d) {
                    $pId = DB::table('preguntas')->insertGetId([
                        'cuestionario_id' => $cId,
                        'texto_pregunta' => $d['pregunta'],
                        'created_at' => now(), 'updated_at' => now()
                    ]);
                    $resps = [];
                    foreach ($d['respuestas'] as $i => $t) {
                        $resps[] = [
                            'pregunta_id' => $pId, 'texto_respuesta' => $t,
                            'es_correcta' => ($i === $d['correcta']),
                            'created_at' => now(), 'updated_at' => now()
                        ];
                    }
                    DB::table('respuestas')->insert($resps);
                }
            };

            $fastInsert($cCine->id, $datosCine);
            $fastInsert($cJuegos->id, $datosJuegos);
            $fastInsert($cMixto->id, array_merge($datosCine, $datosJuegos));
        });
    }
}