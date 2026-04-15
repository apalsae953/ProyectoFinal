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
                'titulo' => 'Modo Mixto: Todo Vale',
                'descripcion' => 'Cine, series y videojuegos mezclados. Solo los más expertos sobreviven.',
                'categoria' => 'mixto',
                'dificultad' => 'dificil'
            ]);

            // 2. Datos Cine
            $datosCine = [
                ['pregunta' => "¿Quién dirigió la película 'Origen'?", 'respuestas' => ["Christopher Nolan", "Spielberg", "Tarantino", "Scorsese"], 'correcta' => 0],
                ['pregunta' => "¿Cuál es el actor que interpreta a Iron Man?", 'respuestas' => ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], 'correcta' => 1],
                ['pregunta' => "¿Quién dirigió 'El Padrino'?", 'respuestas' => ["Francis Ford Coppola", "Martin Scorsese", "Stanley Kubrick", "Alfred Hitchcock"], 'correcta' => 0],
                ['pregunta' => "¿En 'Matrix', qué pastilla elige Neo?", 'respuestas' => ["Azul", "Verde", "Roja", "Amarilla"], 'correcta' => 2],
                ['pregunta' => "¿Quién es el padre de Luke Skywalker?", 'respuestas' => ["Darth Vader", "Obi-Wan Kenobi", "Yoda", "Han Solo"], 'correcta' => 0],
                ['pregunta' => "¿Qué película protagoniza un vaquero llamado Woody?", 'respuestas' => ["Toy Story", "Pinocho", "Cars", "Frozen"], 'correcta' => 0],
                ['pregunta' => "¿Quién dirigió 'Psicosis'?", 'respuestas' => ["Alfred Hitchcock", "Orson Welles", "Fritz Lang", "Billy Wilder"], 'correcta' => 0],
                ['pregunta' => "¿Cómo se llama el león protagonista de 'El Rey León'?", 'respuestas' => ["Mufasa", "Scar", "Simba", "Nala"], 'correcta' => 2],
                ['pregunta' => "¿Quién interpretó al Joker en 'El caballero oscuro'?", 'respuestas' => ["Heath Ledger", "Joaquin Phoenix", "Jack Nicholson", "Jared Leto"], 'correcta' => 0],
                ['pregunta' => "¿Quién dirigió 'Pulp Fiction'?", 'respuestas' => ["Quentin Tarantino", "Guy Ritchie", "Robert Rodriguez", "George Lucas"], 'correcta' => 0],
            ];

            // 3. Datos Juegos
            $datosJuegos = [
                ['pregunta' => "¿Cuál es el nombre del protagonista de 'The Legend of Zelda'?", 'respuestas' => ["Zelda", "Link", "Ganon", "Epona"], 'correcta' => 1],
                ['pregunta' => "¿Qué compañía desarrolló 'Fortnite'?", 'respuestas' => ["Activision", "EA", "Epic Games", "Ubisoft"], 'correcta' => 2],
                ['pregunta' => "¿Quién es el fontanero hermano de Mario?", 'respuestas' => ["Wario", "Luigi", "Waluigi", "Toad"], 'correcta' => 1],
                ['pregunta' => "¿Qué estudio desarrolló 'The Last of Us'?", 'respuestas' => ["Santa Monica", "Naughty Dog", "Insomniac", "Guerrilla"], 'correcta' => 1],
                ['pregunta' => "¿Cuál es el videojuego más vendido de la historia?", 'respuestas' => ["GTA V", "Minecraft", "Tetris", "Wii Sports"], 'correcta' => 1],
                ['pregunta' => "¿En qué juego de terror aparece 'Pyramid Head'?", 'respuestas' => ["Silent Hill", "Resident Evil", "Amnesia", "Outlast"], 'correcta' => 0],
                ['pregunta' => "¿Quién es el protagonista de la saga 'God of War'?", 'respuestas' => ["Kratos", "Zeus", "Atreus", "Ares"], 'correcta' => 0],
                ['pregunta' => "¿Cómo se llama la ciudad ficticia de 'GTA V'?", 'respuestas' => ["Vice City", "Liberty City", "Los Santos", "San Fierro"], 'correcta' => 2],
                ['pregunta' => "¿Cuál es la mascota de Sega?", 'respuestas' => ["Mario", "Sonic", "Crash", "Spyro"], 'correcta' => 1],
                ['pregunta' => "¿Cómo se llama el Jefe Maestro en la saga Halo?", 'respuestas' => ["John-117", "Cortana", "Noble 6", "Arbiter"], 'correcta' => 0],
            ];

            // Función de inserción
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
            
            // Mixto: Combinamos ambos
            $mixed = array_merge($datosCine, $datosJuegos);
            $fastInsert($cMixto->id, $mixed);
        });
    }
}